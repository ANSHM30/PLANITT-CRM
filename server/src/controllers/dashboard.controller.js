import prisma from "../config/db.js";

export async function getDashboardSummary(req, res) {
  try {
    const isSuperAdmin = req.user.role === "SUPERADMIN";
    const isAdminView = isSuperAdmin || req.user.role === "ADMIN" || req.user.role === "MANAGER";

    if (isAdminView) {
      const [
        totalEmployees,
        totalInterns,
        totalTasks,
        completedTasks,
        activeAttendance,
        totalDepartments,
        totalManagers,
      ] =
        await Promise.all([
          prisma.user.count({
            where: { role: { in: ["EMPLOYEE", "MANAGER", "ADMIN", "SUPERADMIN"] } },
          }),
          prisma.user.count({
            where: { role: "INTERN" },
          }),
          prisma.task.count(),
          prisma.task.count({
            where: { status: "DONE" },
          }),
          prisma.attendance.count({
            where: { checkOut: null },
          }),
          prisma.department.count(),
          prisma.user.count({
            where: { role: { in: ["MANAGER", "ADMIN", "SUPERADMIN"] } },
          }),
        ]);

      const departmentBreakdown = await prisma.department.findMany({
        orderBy: { name: "asc" },
        include: {
          head: {
            select: {
              id: true,
              name: true,
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

      const tasksWithAssignments = await prisma.task.findMany({
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  role: true,
                  departmentId: true,
                },
              },
            },
          },
        },
      });

      const rolePerformanceMap = new Map();
      const departmentPerformanceMap = new Map();

      for (const task of tasksWithAssignments) {
        for (const assignment of task.assignments) {
          const roleKey = assignment.user.role;
          const existingRole = rolePerformanceMap.get(roleKey) ?? {
            role: roleKey,
            totalAssigned: 0,
            completed: 0,
            averageProgress: 0,
            progressSum: 0,
          };

          existingRole.totalAssigned += 1;
          existingRole.progressSum += task.progress;
          if (task.progress >= 100 || task.status === "DONE") {
            existingRole.completed += 1;
          }
          rolePerformanceMap.set(roleKey, existingRole);

          if (assignment.user.departmentId) {
            const existingDepartment = departmentPerformanceMap.get(assignment.user.departmentId) ?? {
              departmentId: assignment.user.departmentId,
              totalAssigned: 0,
              completed: 0,
              averageProgress: 0,
              progressSum: 0,
            };

            existingDepartment.totalAssigned += 1;
            existingDepartment.progressSum += task.progress;
            if (task.progress >= 100 || task.status === "DONE") {
              existingDepartment.completed += 1;
            }
            departmentPerformanceMap.set(assignment.user.departmentId, existingDepartment);
          }
        }
      }

      const departmentPerformance = departmentBreakdown.map((department) => {
        const stats = departmentPerformanceMap.get(department.id) ?? {
          totalAssigned: 0,
          completed: 0,
          progressSum: 0,
        };

        return {
          departmentId: department.id,
          departmentName: department.name,
          totalAssigned: stats.totalAssigned,
          completed: stats.completed,
          averageProgress: stats.totalAssigned
            ? Math.round(stats.progressSum / stats.totalAssigned)
            : 0,
        };
      });

      const rolePerformance = Array.from(rolePerformanceMap.values()).map((stats) => ({
        role: stats.role,
        totalAssigned: stats.totalAssigned,
        completed: stats.completed,
        averageProgress: stats.totalAssigned
          ? Math.round(stats.progressSum / stats.totalAssigned)
          : 0,
      }));

      const recentTasks = await prisma.task.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
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
        },
      });

      return res.json({
        scope: isSuperAdmin ? "superadmin" : "admin",
        metrics: {
          totalEmployees,
          totalInterns,
          totalTasks,
          completedTasks,
          activeAttendance,
          totalDepartments,
          totalManagers,
        },
        departmentBreakdown,
        departmentPerformance,
        rolePerformance,
        recentTasks,
      });
    }

    const [myTasks, completedTasks, pendingTasks, activeAttendance] = await Promise.all([
      prisma.task.count({
        where: {
          assignments: {
            some: {
              userId: req.user.userId,
            },
          },
        },
      }),
      prisma.task.count({
        where: {
          status: "DONE",
          assignments: {
            some: {
              userId: req.user.userId,
            },
          },
        },
      }),
      prisma.task.count({
        where: {
          status: { in: ["TODO", "IN_PROGRESS"] },
          assignments: {
            some: {
              userId: req.user.userId,
            },
          },
        },
      }),
      prisma.attendance.findFirst({
        where: {
          userId: req.user.userId,
          checkOut: null,
        },
        orderBy: { checkIn: "desc" },
      }),
    ]);

    const myRecentTasks = await prisma.task.findMany({
      where: {
        assignments: {
          some: {
            userId: req.user.userId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
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
      },
    });

    return res.json({
      scope: "employee",
      metrics: {
        myTasks,
        completedTasks,
        pendingTasks,
        checkedIn: Boolean(activeAttendance),
      },
      recentTasks: myRecentTasks,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
