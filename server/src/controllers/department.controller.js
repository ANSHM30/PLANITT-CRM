import prisma from "../config/db.js";
import { emitCRMEvent } from "../socket.js";
import { sendSafeError } from "../middleware/error.middleware.js";

export async function getDepartments(_req, res) {
  try {
    const paginate = String(_req.query.paginate || "").toLowerCase() === "true";
    const limitRaw = Number(_req.query.limit);
    const offsetRaw = Number(_req.query.offset);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 25;
    const offset = Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0;

    const query = {
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
    };

    if (!paginate) {
      const departments = await prisma.department.findMany(query);
      return res.json(departments);
    }

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        ...query,
        skip: offset,
        take: limit,
      }),
      prisma.department.count(),
    ]);

    return res.json({
      items,
      total,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length,
    });
  } catch (err) {
    return sendSafeError(res, err, "Unable to fetch departments");
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

    emitCRMEvent("org:updated", {
      type: "department_created",
      departmentId: department.id,
    });

    return res.status(201).json(department);
  } catch (err) {
    return sendSafeError(res, err, "Unable to create department");
  }
}
