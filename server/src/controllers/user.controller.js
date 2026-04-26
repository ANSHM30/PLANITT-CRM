import bcrypt from "bcrypt";
import prisma from "../config/db.js";
import { emitCRMEvent } from "../socket.js";

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getLastNDays(dayCount) {
  const days = [];
  const now = new Date();
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - offset);
    days.push(date);
  }
  return days;
}

function toShortLabel(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDurationHours(checkIn, checkOut) {
  const end = checkOut ? new Date(checkOut) : new Date();
  const start = new Date(checkIn);
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
}

function buildWorkingHoursTrend(records, days) {
  const map = new Map();
  for (const day of days) {
    map.set(toDateKey(day), { totalHours: 0, count: 0 });
  }

  for (const record of records) {
    const key = toDateKey(new Date(record.date));
    if (!map.has(key)) {
      continue;
    }
    const bucket = map.get(key);
    bucket.totalHours += getDurationHours(record.checkIn, record.checkOut);
    bucket.count += 1;
  }

  return days.map((day) => {
    const key = toDateKey(day);
    const bucket = map.get(key);
    const hours = bucket.count ? Number((bucket.totalHours / bucket.count).toFixed(2)) : 0;
    return {
      date: key,
      label: toShortLabel(day),
      hours,
    };
  });
}

function buildTaskProgressTrend(tasks, days) {
  const map = new Map();
  for (const day of days) {
    map.set(toDateKey(day), { created: 0, completed: 0, progressSum: 0, progressCount: 0 });
  }

  for (const task of tasks) {
    const createdKey = toDateKey(new Date(task.createdAt));
    if (map.has(createdKey)) {
      map.get(createdKey).created += 1;
    }

    const updatedKey = toDateKey(new Date(task.updatedAt));
    if (map.has(updatedKey)) {
      const updatedBucket = map.get(updatedKey);
      updatedBucket.progressSum += task.progress;
      updatedBucket.progressCount += 1;
      if (task.status === "DONE") {
        updatedBucket.completed += 1;
      }
    }
  }

  return days.map((day) => {
    const key = toDateKey(day);
    const bucket = map.get(key);
    return {
      date: key,
      label: toShortLabel(day),
      created: bucket.created,
      completed: bucket.completed,
      avgProgress: bucket.progressCount
        ? Math.round(bucket.progressSum / bucket.progressCount)
        : 0,
    };
  });
}

function buildAttendanceHeatmap(records, days) {
  const map = new Map();
  for (const day of days) {
    map.set(toDateKey(day), { count: 0, hours: 0 });
  }

  for (const record of records) {
    const key = toDateKey(new Date(record.date));
    if (!map.has(key)) {
      continue;
    }
    const bucket = map.get(key);
    bucket.count += 1;
    bucket.hours += getDurationHours(record.checkIn, record.checkOut);
  }

  return days.map((day) => {
    const key = toDateKey(day);
    const bucket = map.get(key);
    return {
      date: key,
      label: toShortLabel(day),
      value: Number(bucket.hours.toFixed(1)),
      intensity: Math.min(100, Math.round((bucket.hours / 10) * 100)),
    };
  });
}

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

    emitCRMEvent("org:updated", {
      type: "user_created",
      userId: user.id,
      role: user.role,
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

    emitCRMEvent("org:updated", {
      type: "user_assignment_updated",
      userId: user.id,
      role: user.role,
      managerId: user.manager?.id ?? null,
      departmentId: user.department?.id ?? null,
    });

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getUserAnalytics(req, res) {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        departmentId: true,
        managerId: true,
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

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isSuperView = req.user.role === "SUPERADMIN" || req.user.role === "ADMIN";
    const canManagerView =
      req.user.role === "MANAGER" &&
      (targetUser.id === req.user.userId || targetUser.managerId === req.user.userId);

    if (!isSuperView && !canManagerView) {
      return res.status(403).json({ error: "You do not have access to this team member analytics" });
    }

    const heatmapDays = getLastNDays(35);
    const trendDays = getLastNDays(14);
    const heatmapStart = heatmapDays[0];
    const trendStart = trendDays[0];

    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      activeAttendance,
      attendanceRecords,
      trendTasks,
      progressTasks,
      recentTasks,
    ] = await Promise.all([
      prisma.task.count({
        where: {
          assignments: {
            some: {
              userId: targetUser.id,
            },
          },
        },
      }),
      prisma.task.count({
        where: {
          status: "DONE",
          assignments: {
            some: {
              userId: targetUser.id,
            },
          },
        },
      }),
      prisma.task.count({
        where: {
          status: { in: ["TODO", "IN_PROGRESS"] },
          assignments: {
            some: {
              userId: targetUser.id,
            },
          },
        },
      }),
      prisma.attendance.findFirst({
        where: {
          userId: targetUser.id,
          checkOut: null,
        },
        orderBy: { checkIn: "desc" },
      }),
      prisma.attendance.findMany({
        where: {
          userId: targetUser.id,
          date: { gte: heatmapStart },
        },
        select: {
          date: true,
          checkIn: true,
          checkOut: true,
        },
      }),
      prisma.task.findMany({
        where: {
          assignments: {
            some: {
              userId: targetUser.id,
            },
          },
          OR: [{ createdAt: { gte: trendStart } }, { updatedAt: { gte: trendStart } }],
        },
        select: { createdAt: true, updatedAt: true, progress: true, status: true },
      }),
      prisma.task.findMany({
        where: {
          assignments: {
            some: {
              userId: targetUser.id,
            },
          },
        },
        select: {
          progress: true,
          status: true,
        },
      }),
      prisma.task.findMany({
        where: {
          assignments: {
            some: {
              userId: targetUser.id,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
          checklistItems: {
            orderBy: { createdAt: "asc" },
          },
          issues: {
            orderBy: { createdAt: "desc" },
            include: {
              reporter: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
              resolvedBy: {
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
      }),
    ]);

    const attendanceHeatmap = buildAttendanceHeatmap(attendanceRecords, heatmapDays);
    const workingHoursTrend = buildWorkingHoursTrend(attendanceRecords, trendDays);
    const taskProgressTrend = buildTaskProgressTrend(trendTasks, trendDays);

    const attendanceDays = attendanceRecords.filter((record) => getDurationHours(record.checkIn, record.checkOut) > 0).length;
    const totalHours = attendanceRecords.reduce(
      (sum, record) => sum + getDurationHours(record.checkIn, record.checkOut),
      0
    );
    const avgDailyHours = attendanceDays ? Number((totalHours / attendanceDays).toFixed(2)) : 0;
    const avgProgress = progressTasks.length
      ? Math.round(progressTasks.reduce((sum, task) => sum + task.progress, 0) / progressTasks.length)
      : 0;

    const taskStatusBreakdown = [
      {
        label: "To do",
        value: progressTasks.filter((task) => task.status === "TODO").length,
      },
      {
        label: "In progress",
        value: progressTasks.filter((task) => task.status === "IN_PROGRESS").length,
      },
      {
        label: "Done",
        value: progressTasks.filter((task) => task.status === "DONE").length,
      },
    ];

    return res.json({
      user: targetUser,
      metrics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        checkedIn: Boolean(activeAttendance),
        avgProgress,
        avgDailyHours,
        attendanceDays,
      },
      taskStatusBreakdown,
      recentTasks,
      analytics: {
        attendanceHeatmap,
        workingHoursTrend,
        taskProgressTrend,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
