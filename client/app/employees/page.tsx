"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useSession } from "@/hooks/use-session";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import type { CRMUser, Department, UserRole } from "@/types/crm";
type PaginatedResponse<T> = { items: T[]; total: number; hasMore: boolean; nextOffset: number };

const baseRoles: UserRole[] = ["EMPLOYEE", "INTERN", "MANAGER", "ADMIN"];

function Surface({ children }: { children: ReactNode }) {
  return (
    <section
      className="rounded-[20px] border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {children}
    </section>
  );
}

export default function EmployeesPage() {
  const { user, loading: sessionLoading } = useSession({
    allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER"],
  });
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [allUsers, setAllUsers] = useState<CRMUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as UserRole,
    designation: "",
    departmentId: "",
    managerId: "",
  });
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [nextUserOffset, setNextUserOffset] = useState(0);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [emailUpdatingId, setEmailUpdatingId] = useState("");
  const availableRoles: UserRole[] =
    user?.role === "SUPERADMIN" ? ["SUPERADMIN", ...baseRoles] : baseRoles;

  const fieldStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-soft)",
    color: "var(--text-main)",
  } as const;

  const loadTeam = async (append = false) => {
    const offset = append ? nextUserOffset : 0;
    const [membersPage, allMembers, departmentData] = await Promise.all([
      apiGet<PaginatedResponse<CRMUser>>(`/users?paginate=true&limit=25&offset=${offset}`),
      apiGet<CRMUser[]>("/users"),
      apiGet<Department[]>("/departments"),
    ]);
    setUsers((current) => (append ? [...current, ...membersPage.items] : membersPage.items));
    setAllUsers(allMembers);
    setHasMoreUsers(membersPage.hasMore);
    setNextUserOffset(membersPage.nextOffset);
    setDepartments(departmentData);
    setEmailDrafts(
      allMembers.reduce<Record<string, string>>((acc, member) => {
        acc[member.id] = member.email;
        return acc;
      }, {})
    );
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        await loadTeam();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load employees");
      } finally {
        setDataLoading(false);
      }
    }

    if (user) {
      void fetchUsers();
    }
  }, [user]);

  useRealtimeRefresh(user, ["org:updated"], async () => {
    await loadTeam();
  });

  const createEmployee = async () => {
    if (!user) {
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");
      await apiPost("/users", { ...form });
      setForm({
        name: "",
        email: "",
        password: "",
        role: "EMPLOYEE",
        designation: "",
        departmentId: "",
        managerId: "",
      });
      setNotice("Team member created successfully.");
      await loadTeam(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team member");
    } finally {
      setCreating(false);
    }
  };

  const assignEmployee = async (
    member: CRMUser,
    field: "managerId" | "departmentId" | "role",
    value: string
  ) => {
    try {
      setUpdatingId(member.id);
      setError("");
      setNotice("");
      await apiPut(`/users/${member.id}/assignment`, {
        managerId: field === "managerId" ? value : member.manager?.id ?? "",
        departmentId: field === "departmentId" ? value : member.department?.id ?? "",
        role: field === "role" ? value : member.role,
        designation: member.designation ?? "",
      });
      await loadTeam(false);
      setNotice("Assignment updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setUpdatingId("");
    }
  };

  const updateMemberEmail = async (member: CRMUser) => {
    const nextEmail = emailDrafts[member.id]?.trim();
    if (!nextEmail || nextEmail === member.email) {
      return;
    }

    try {
      setEmailUpdatingId(member.id);
      setError("");
      setNotice("");
      await apiPut(`/users/${member.id}/profile`, {
        email: nextEmail,
      });
      await loadTeam(false);
      setNotice("Email updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setEmailUpdatingId("");
    }
  };

  const managers = allUsers.filter((member) =>
    ["SUPERADMIN", "ADMIN", "MANAGER"].includes(member.role)
  );

  const hasAssignedLeadershipLinks = (member: CRMUser) => {
    if (!["EMPLOYEE", "INTERN"].includes(member.role)) {
      return false;
    }
    return member.manager?.role === "ADMIN" || member.manager?.role === "MANAGER";
  };

  if (sessionLoading || !user) {
    return <StatePanel title="Loading team workspace" description="Fetching access and employee data." />;
  }

  return (
    <CRMShell user={user}>
      <div className="space-y-4">
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
            Team control
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            Employees & interns
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
            Create members, assign departments, and connect employees or interns to their reporting managers.
          </p>
        </Surface>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Surface>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                  Create team member
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">
                  Add employee or intern
                </h2>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: "var(--accent-strong)" }}
              >
                Admin only
              </span>
            </div>

            {user.role === "MANAGER" ? (
              <div
                className="mt-6 rounded-3xl border border-dashed p-6 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-soft)",
                  color: "var(--text-soft)",
                }}
              >
                Managers can view their team, but only admins and the CEO can create new employees and interns.
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <input
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  placeholder="Full name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
                <input
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  placeholder="Work email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  placeholder="Temporary password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
                <select
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, role: event.target.value as UserRole }))
                  }
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  placeholder="Designation"
                  value={form.designation}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, designation: event.target.value }))
                  }
                />
                <select
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  value={form.departmentId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, departmentId: event.target.value }))
                  }
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  value={form.managerId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, managerId: event.target.value }))
                  }
                >
                  <option value="">Select manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} - {manager.role}
                    </option>
                  ))}
                </select>

                {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                {notice ? <p className="text-sm font-medium text-emerald-600">{notice}</p> : null}

                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void createEmployee()}
                  className="h-12 rounded-2xl text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70"
                  style={{ background: "var(--accent-strong)" }}
                >
                  {creating ? "Creating..." : "Create team member"}
                </button>
              </div>
            )}
          </Surface>

          <Surface>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                  Directory
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">Current team</h2>
              </div>
              <span className="text-sm text-[var(--text-soft)]">{users.length} members</span>
            </div>

            <div className="mt-6 overflow-x-auto rounded-[20px] border" style={{ borderColor: "var(--border)" }}>
              <table className="min-w-full text-left">
                <thead style={{ background: "var(--surface-soft)" }}>
                  <tr className="text-xs uppercase tracking-[0.22em] text-[var(--text-faint)]">
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Department</th>
                    <th className="px-5 py-4 font-semibold">Manager</th>
                    <th className="px-5 py-4 font-semibold">Meet</th>
                    <th className="px-5 py-4 font-semibold">Drive</th>
                  </tr>
                </thead>
                <tbody style={{ background: "var(--surface-strong)" }}>
                  {users.map((member) => (
                    <tr key={member.id} className="border-t" style={{ borderColor: "var(--border)", color: "var(--text-soft)" }}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-[var(--text-main)]">{member.name}</div>
                        <div className="mt-1 text-xs font-medium text-[var(--text-faint)]">
                          {member.designation || "No designation"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {user.role === "SUPERADMIN" || user.role === "ADMIN" ? (
                          <div className="flex min-w-[260px] items-center gap-2">
                            <input
                              className="h-9 flex-1 rounded-xl border px-3 text-xs outline-none"
                              style={fieldStyle}
                              value={emailDrafts[member.id] ?? member.email}
                              disabled={
                                emailUpdatingId === member.id ||
                                (member.role === "SUPERADMIN" && user.role !== "SUPERADMIN")
                              }
                              onChange={(event) =>
                                setEmailDrafts((current) => ({
                                  ...current,
                                  [member.id]: event.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                              style={{ background: "var(--accent-strong)" }}
                              disabled={
                                emailUpdatingId === member.id ||
                                (member.role === "SUPERADMIN" && user.role !== "SUPERADMIN") ||
                                (emailDrafts[member.id] ?? member.email).trim() === member.email
                              }
                              onClick={() => void updateMemberEmail(member)}
                            >
                              {emailUpdatingId === member.id ? "Saving..." : "Update"}
                            </button>
                          </div>
                        ) : (
                          member.email
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {user.role === "MANAGER" || member.role === "SUPERADMIN" ? (
                          <span
                            className="rounded-full px-3 py-1 text-xs font-semibold"
                            style={{ background: "var(--surface-soft)", color: "var(--text-soft)" }}
                          >
                            {member.role}
                          </span>
                        ) : (
                          <select
                            className="rounded-2xl border px-3 py-2 text-xs font-semibold"
                            style={fieldStyle}
                            value={member.role}
                            disabled={updatingId === member.id}
                            onChange={(event) =>
                              void assignEmployee(member, "role", event.target.value)
                            }
                          >
                            {availableRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {user.role === "MANAGER" ? (
                          member.department?.name || "-"
                        ) : (
                          <select
                            className="rounded-2xl border px-3 py-2 text-xs"
                            style={fieldStyle}
                            value={member.department?.id ?? ""}
                            disabled={updatingId === member.id || member.role === "SUPERADMIN"}
                            onChange={(event) =>
                              void assignEmployee(member, "departmentId", event.target.value)
                            }
                          >
                            <option value="">Unassigned</option>
                            {departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {user.role === "MANAGER" ? (
                          member.manager?.name || "-"
                        ) : (
                          <select
                            className="rounded-2xl border px-3 py-2 text-xs"
                            style={fieldStyle}
                            value={member.manager?.id ?? ""}
                            disabled={updatingId === member.id || member.role === "SUPERADMIN"}
                            onChange={(event) =>
                              void assignEmployee(member, "managerId", event.target.value)
                            }
                          >
                            <option value="">Unassigned</option>
                            {managers
                              .filter((manager) => manager.id !== member.id)
                              .map((manager) => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.name}
                                </option>
                              ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {hasAssignedLeadershipLinks(member) ? (
                          <a
                            href="https://meet.google.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold underline underline-offset-2"
                            style={{ color: "var(--accent-strong)" }}
                          >
                            Open Meet
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {hasAssignedLeadershipLinks(member) ? (
                          <a
                            href="https://drive.google.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold underline underline-offset-2"
                            style={{ color: "var(--accent-strong)" }}
                          >
                            Open Drive
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dataLoading ? <p className="mt-4 text-sm text-[var(--text-soft)]">Loading employees...</p> : null}
            {hasMoreUsers ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMoreUsers}
                  onClick={() => {
                    setLoadingMoreUsers(true);
                    void loadTeam(true).finally(() => setLoadingMoreUsers(false));
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60"
                  style={{ borderColor: "var(--border)", color: "var(--text-main)" }}
                >
                  {loadingMoreUsers ? "Loading..." : "Load more members"}
                </button>
              </div>
            ) : null}
          </Surface>
        </div>
      </div>
    </CRMShell>
  );
}
