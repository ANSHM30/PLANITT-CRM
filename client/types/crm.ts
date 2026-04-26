export type UserRole = "SUPERADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "INTERN";

export type Department = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  head?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  _count?: {
    users: number;
  };
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  departmentId: string;
  department: Department;
  owner?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  progress: number;
  taskCounts: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  };
};

export type CRMUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
  department?: Department | null;
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt?: string;
};

export type AssignedUser = {
  id: string;
  name: string;
  role: UserRole;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  progress: number;
  createdAt?: string;
  assignments: Array<{
    id: string;
    userId: string;
      user: AssignedUser;
  }>;
  checklistItems: Array<{
    id: string;
    title: string;
    completed: boolean;
    completedAt?: string | null;
  }>;
  issues: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    managerResponse?: string | null;
    reporter: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    };
    resolvedBy?: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    } | null;
    createdAt?: string;
  }>;
};

export type AdminDashboardSummary = {
  scope: "superadmin" | "admin";
  metrics: {
    totalEmployees: number;
    totalInterns: number;
    totalTasks: number;
    completedTasks: number;
    activeAttendance: number;
    totalDepartments: number;
    totalManagers: number;
  };
  departmentBreakdown: Department[];
  departmentPerformance: Array<{
    departmentId: string;
    departmentName: string;
    totalAssigned: number;
    completed: number;
    averageProgress: number;
  }>;
  rolePerformance: Array<{
    role: UserRole;
    totalAssigned: number;
    completed: number;
    averageProgress: number;
  }>;
  recentTasks: Task[];
  analytics: {
    attendanceHeatmap: Array<{
      date: string;
      label: string;
      value: number;
      intensity: number;
    }>;
    workingHoursTrend: Array<{
      date: string;
      label: string;
      hours: number;
    }>;
    taskProgressTrend: Array<{
      date: string;
      label: string;
      created: number;
      completed: number;
      avgProgress: number;
    }>;
    updatesFeed: Array<{
      id: string;
      title: string;
      message: string;
      authorName: string;
      authorRole: UserRole;
      taskTitle?: string | null;
      reporterName?: string | null;
      createdAt: string;
    }>;
    superAdmin: null | {
      departmentWise: Array<{
        departmentId: string;
        departmentName: string;
        members: number;
        managers: number;
        interns: number;
        totalProjects: number;
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        completionRate: number;
        avgProgress: number;
        activeAttendance: number;
        avgWorkingHours: number;
        openIssues: number;
      }>;
      organizationHealth: {
        totalProjects: number;
        projectToTaskRatio: number;
        taskCompletionRate: number;
        liveAttendanceRate: number;
        openIssues: number;
        avgDepartmentProgress: number;
      };
    };
  };
};

export type EmployeeDashboardSummary = {
  scope: "employee";
  metrics: {
    myTasks: number;
    completedTasks: number;
    pendingTasks: number;
    checkedIn: boolean;
  };
  recentTasks: Task[];
  analytics: {
    attendanceHeatmap: Array<{
      date: string;
      label: string;
      value: number;
      intensity: number;
    }>;
    workingHoursTrend: Array<{
      date: string;
      label: string;
      hours: number;
    }>;
    taskProgressTrend: Array<{
      date: string;
      label: string;
      created: number;
      completed: number;
      avgProgress: number;
    }>;
    updatesFeed: Array<{
      id: string;
      title: string;
      message: string;
      authorName: string;
      authorRole: UserRole;
      taskTitle?: string | null;
      reporterName?: string | null;
      createdAt: string;
    }>;
  };
};

export type DashboardSummary = AdminDashboardSummary | EmployeeDashboardSummary;

export type GoogleWorkspaceStatus = {
  connected: boolean;
  workspaceEmail: string | null;
  services: {
    meet: boolean;
    sheets: boolean;
    drive: boolean;
  };
  grantedScopes: string[];
  lastSyncedAt: string | null;
  crmSignals: {
    totalTasks: number;
    openTasks: number;
    totalProjects: number;
    totalDepartments: number;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    source: string;
    crmUseCase: string;
  }>;
};

export type UserAnalyticsSummary = {
  user: CRMUser;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    checkedIn: boolean;
    avgProgress: number;
    avgDailyHours: number;
    attendanceDays: number;
  };
  taskStatusBreakdown: Array<{
    label: string;
    value: number;
  }>;
  recentTasks: Task[];
  analytics: {
    attendanceHeatmap: Array<{
      date: string;
      label: string;
      value: number;
      intensity: number;
    }>;
    workingHoursTrend: Array<{
      date: string;
      label: string;
      hours: number;
    }>;
    taskProgressTrend: Array<{
      date: string;
      label: string;
      created: number;
      completed: number;
      avgProgress: number;
    }>;
  };
};
