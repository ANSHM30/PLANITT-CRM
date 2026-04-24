import prisma from "../config/db.js";

export async function getDepartments(_req, res) {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        head: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return res.json(departments);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createDepartment(req, res) {
  try {
    const { name, code, description, headId } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Department name and code are required" });
    }

    if (headId) {
      const head = await prisma.user.findUnique({
        where: { id: headId },
      });

      if (!head || !["SUPERADMIN", "ADMIN", "MANAGER"].includes(head.role)) {
        return res.status(400).json({ error: "Department head must be an admin or manager" });
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: code.toUpperCase(),
        description,
        ...(headId ? { headId } : {}),
      },
      include: {
        head: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return res.status(201).json(department);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
