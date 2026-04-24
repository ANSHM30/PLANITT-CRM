import type { CRMUser, UserRole } from "@/types/crm";

export function isAdminRole(role: UserRole) {
  return role === "SUPERADMIN" || role === "ADMIN" || role === "MANAGER";
}

export function getRoleLabel(user: CRMUser) {
  return user.role.toLowerCase();
}
