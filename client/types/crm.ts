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
};

export type DashboardSummary = AdminDashboardSummary | EmployeeDashboardSummary;
