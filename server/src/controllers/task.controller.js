import prisma from "../config/db.js";

export async function createTask(req, res) {
  try {
    const { title, description, userIds = [], progress = 0 } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const initialStatus =
      normalizedProgress >= 100
        ? "DONE"
        : normalizedProgress > 0
          ? "IN_PROGRESS"
          : "TODO";

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: initialStatus,
        progress: normalizedProgress,
        assignments: {
          create: userIds.map((id) => ({
            userId: id,
          })),
        },
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json(task);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getTasks(_req, res) {
  try {
    const where =
      _req.user.role === "SUPERADMIN" || _req.user.role === "ADMIN" || _req.user.role === "MANAGER"
        ? {}
        : {
            assignments: {
              some: {
                userId: _req.user.userId,
              },
            },
          };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateTaskStatus(req, res) {
  try {
    const { status, progress } = req.body;

    if (!status && typeof progress !== "number") {
      return res.status(400).json({ error: "Status or progress is required" });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: true,
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const canUpdate =
      req.user.role === "SUPERADMIN" ||
      req.user.role === "ADMIN" ||
      req.user.role === "MANAGER" ||
      existingTask.assignments.some((assignment) => assignment.userId === req.user.userId);

    if (!canUpdate) {
      return res.status(403).json({ error: "You are not allowed to update this task" });
    }

    const normalizedProgress =
      typeof progress === "number"
        ? Math.min(100, Math.max(0, progress))
        : status === "DONE"
          ? 100
          : status === "TODO"
            ? 0
            : existingTask.progress;

    const nextStatus =
      status ??
      (normalizedProgress >= 100
        ? "DONE"
        : normalizedProgress > 0
          ? "IN_PROGRESS"
          : "TODO");

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: nextStatus,
        progress: normalizedProgress,
      },
    });

    return res.json(task);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
