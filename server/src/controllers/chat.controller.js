import prisma from "../config/db.js";
import { emitCRMEvent } from "../socket.js";

const LEADERSHIP_ROLES = ["SUPERADMIN", "ADMIN"];

function isLeadership(user) {
  return LEADERSHIP_ROLES.includes(user.role);
}

function getVisibleProjectWhere(user) {
  if (isLeadership(user)) {
    return {};
  }

  if (user.role === "MANAGER") {
    return {
      OR: [
        { ownerId: user.userId },
        {
          tasks: {
            some: {
              assignments: {
                some: {
                  userId: user.userId,
                },
              },
            },
          },
        },
      ],
    };
  }

  return {
    tasks: {
      some: {
        assignments: {
          some: {
            userId: user.userId,
          },
        },
      },
    },
  };
}

function toMessagePayload(message) {
  return {
    id: message.id,
    channelType: message.channelType,
    departmentId: message.departmentId,
    projectId: message.projectId,
    content: message.content,
    createdAt: message.createdAt,
    author: message.author,
  };
}

async function getCurrentUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      departmentId: true,
    },
  });
}

async function canAccessDepartmentRoom(authUser, departmentId) {
  if (!departmentId) {
    return false;
  }

  if (isLeadership(authUser)) {
    return Boolean(await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } }));
  }

  const user = await getCurrentUser(authUser.userId);
  return user?.departmentId === departmentId;
}

async function canAccessProjectRoom(authUser, projectId) {
  if (!projectId) {
    return false;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...getVisibleProjectWhere(authUser),
    },
    select: { id: true },
  });

  return Boolean(project);
}

async function canAccessRoom(authUser, channelType, channelId) {
  if (channelType === "DEPARTMENT") {
    return canAccessDepartmentRoom(authUser, channelId);
  }

  if (channelType === "PROJECT") {
    return canAccessProjectRoom(authUser, channelId);
  }

  return false;
}

export async function getChatRooms(req, res) {
  try {
    const currentUser = await getCurrentUser(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const [departments, projects] = await Promise.all([
      prisma.department.findMany({
        where: isLeadership(req.user)
          ? {}
          : currentUser.departmentId
            ? { id: currentUser.departmentId }
            : { id: "__none__" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { users: true },
          },
        },
      }),
      prisma.project.findMany({
        where: getVisibleProjectWhere(req.user),
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      departments: departments.map((department) => ({
        id: department.id,
        type: "DEPARTMENT",
        name: department.name,
        subtitle: `${department.code} | ${department._count.users} members`,
      })),
      projects: projects.map((project) => ({
        id: project.id,
        type: "PROJECT",
        name: project.name,
        subtitle: project.department?.name ?? "No department",
        department: project.department,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getChatMessages(req, res) {
  try {
    const channelType = String(req.query.type || "").toUpperCase();
    const channelId = String(req.query.id || "");

    if (!(await canAccessRoom(req.user, channelType, channelId))) {
      return res.status(403).json({ error: "You do not have access to this chat room" });
    }

    const messages = await prisma.chatMessage.findMany({
      where:
        channelType === "DEPARTMENT"
          ? { channelType, departmentId: channelId }
          : { channelType, projectId: channelId },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json(messages.reverse().map(toMessagePayload));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createChatMessage(req, res) {
  try {
    const channelType = String(req.body.channelType || "").toUpperCase();
    const channelId = String(req.body.channelId || "");
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

    if (!content) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: "Message is too long" });
    }

    if (!(await canAccessRoom(req.user, channelType, channelId))) {
      return res.status(403).json({ error: "You do not have access to this chat room" });
    }

    const message = await prisma.chatMessage.create({
      data: {
        channelType,
        content,
        authorId: req.user.userId,
        ...(channelType === "DEPARTMENT" ? { departmentId: channelId } : { projectId: channelId }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const payload = toMessagePayload(message);
    emitCRMEvent("chat:message", payload);

    return res.status(201).json(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
