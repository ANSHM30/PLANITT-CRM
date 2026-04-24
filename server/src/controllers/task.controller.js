import prisma from "../config/db.js";

export async function createTask(req, res) {
  try {
    const { title, description, userIds = [] } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: "TODO",
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
    const tasks = await prisma.task.findMany({
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
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.json(task);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
