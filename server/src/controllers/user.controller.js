import bcrypt from "bcrypt";
import prisma from "../config/db.js";

export async function getUsers(_req, res) {
  try {
    const isSuperView = _req.user.role === "SUPERADMIN" || _req.user.role === "ADMIN";
    const where =
      _req.user.role === "MANAGER"
        ? {
            OR: [
              { managerId: _req.user.userId },
              { id: _req.user.userId },
            ],
          }
        : {};

    const users = await prisma.user.findMany({
      where: isSuperView ? {} : where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        managerId: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createUser(req, res) {
  try {
    const {
      name,
      email,
      password,
      role = "EMPLOYEE",
      departmentId,
      managerId,
      designation,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const allowedRoles = ["SUPERADMIN", "EMPLOYEE", "INTERN", "ADMIN", "MANAGER"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (req.user.role !== "SUPERADMIN" && role === "SUPERADMIN") {
      return res.status(403).json({ error: "Only the CEO can create another superadmin" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
    }

    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });

      if (!manager || !["SUPERADMIN", "ADMIN", "MANAGER"].includes(manager.role)) {
        return res.status(400).json({ error: "Selected manager is invalid" });
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        designation,
        ...(departmentId ? { departmentId } : {}),
        ...(managerId ? { managerId } : {}),
        createdById: req.user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    return res.status(201).json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateUserAssignment(req, res) {
  try {
    const { role, departmentId, managerId, designation } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        role: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (existingUser.role === "SUPERADMIN" && req.user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Only the CEO can modify the superadmin profile" });
    }

    if (role === "SUPERADMIN" && req.user.role !== "SUPERADMIN") {
      return res.status(403).json({ error: "Only the CEO can assign superadmin access" });
    }

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
    }

    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });

      if (!manager || !["SUPERADMIN", "ADMIN", "MANAGER"].includes(manager.role)) {
        return res.status(400).json({ error: "Selected manager is invalid" });
      }

      if (manager.id === req.params.id) {
        return res.status(400).json({ error: "A user cannot report to themselves" });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(role ? { role } : {}),
        ...(typeof designation === "string" ? { designation } : {}),
        ...(typeof departmentId === "string"
          ? { departmentId: departmentId || null }
          : {}),
        ...(typeof managerId === "string" ? { managerId: managerId || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
