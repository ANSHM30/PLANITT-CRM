import prisma from "../config/db.js";
import { emitCRMEvent } from "../socket.js";

function getProjectProgress(tasks) {
  if (!tasks.length) {
    return 0;
  }

  const total = tasks.reduce((sum, task) => sum + task.progress, 0);
  return Math.round(total / tasks.length);
}

export async function getProjects(req, res) {
  try {
    const where =
      req.user.role === "SUPERADMIN" || req.user.role === "ADMIN"
        ? {}
        : req.user.role === "MANAGER"
          ? {
              OR: [
                { ownerId: req.user.userId },
                {
                  tasks: {
                    some: {
                      assignments: {
                        some: {
                          userId: req.user.userId,
                        },
                      },
                    },
                  },
                },
              ],
            }
          : {
              tasks: {
                some: {
                  assignments: {
                    some: {
                      userId: req.user.userId,
                    },
                  },
                },
              },
            };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
          },
        },
      },
    });

    return res.json(
      projects.map((project) => ({
        ...project,
        progress: getProjectProgress(project.tasks),
        taskCounts: {
          total: project.tasks.length,
          todo: project.tasks.filter((task) => task.status === "TODO").length,
          inProgress: project.tasks.filter((task) => task.status === "IN_PROGRESS").length,
          done: project.tasks.filter((task) => task.status === "DONE").length,
        },
      }))
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createProject(req, res) {
  try {
    const { name, description, departmentId, ownerId } = req.body;

    if (!name || !departmentId) {
      return res.status(400).json({ error: "Project name and department are required" });
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    if (ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
      });

      if (!owner || !["SUPERADMIN", "ADMIN", "MANAGER"].includes(owner.role)) {
        return res.status(400).json({ error: "Project owner must be leadership" });
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        departmentId,
        ...(ownerId ? { ownerId } : {}),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            progress: true,
          },
        },
      },
    });

    emitCRMEvent("project:updated", {
      type: "project_created",
      projectId: project.id,
      departmentId: project.departmentId,
    });

    return res.status(201).json({
      ...project,
      progress: 0,
      taskCounts: {
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
