"use client";

import { useEffect, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { useSession } from "@/hooks/use-session";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import type { CRMUser, Department, UserRole } from "@/types/crm";

const roles: UserRole[] = ["EMPLOYEE", "INTERN", "MANAGER", "ADMIN"];

export default function EmployeesPage() {
  const { user, loading: sessionLoading } = useSession({
    allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER"],
  });
  const [users, setUsers] = useState<CRMUser[]>([]);
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
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const [members, departmentData] = await Promise.all([
          apiGet<CRMUser[]>("/users"),
          apiGet<Department[]>("/departments"),
        ]);
        setUsers(members);
        setDepartments(departmentData);
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

  const createEmployee = async () => {
    if (!user) {
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");

      const payload = { ...form };
      await apiPost("/users", payload);
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
      const data = await apiGet<CRMUser[]>("/users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team member");
    } finally {
      setCreating(false);
    }
  };

  const assignEmployee = async (member: CRMUser, field: "managerId" | "departmentId" | "role", value: string) => {
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
      const data = await apiGet<CRMUser[]>("/users");
      setUsers(data);
      setNotice("Assignment updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setUpdatingId("");
    }
  };

  const managers = users.filter((member) =>
    ["SUPERADMIN", "ADMIN", "MANAGER"].includes(member.role)
  );

  if (sessionLoading || !user) {
    return <StatePanel title="Loading team workspace" description="Fetching access and employee data." />;
  }

  return (
    <CRMShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[34px] border border-white/70 bg-white/85 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.10)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Team control</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Employees & interns</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
            Admins can onboard team members, place them in departments, and assign employees or interns to reporting managers.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Create team member
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Add employee or intern
                </h2>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                Admin only
              </span>
            </div>

            {user.role === "MANAGER" ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Managers can view their team, but only admins and the CEO can create new employees and interns.
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                  placeholder="Work email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                  placeholder="Temporary password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, role: event.target.value as UserRole }))
                  }
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                  placeholder="Designation"
                  value={form.designation}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, designation: event.target.value }))
                  }
                />
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
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
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
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
                  className="h-12 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {creating ? "Creating..." : "Create team member"}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Directory</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Current team</h2>
              </div>
              <span className="text-sm text-slate-500">{users.length} members</span>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Department</th>
                    <th className="px-5 py-4 font-semibold">Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((member) => (
                    <tr key={member.id} className="text-sm text-slate-700">
                      <td className="px-5 py-4 font-medium text-slate-950">
                        <div>{member.name}</div>
                        <div className="mt-1 text-xs font-medium text-slate-400">
                          {member.designation || "No designation"}
                        </div>
                      </td>
                      <td className="px-5 py-4">{member.email}</td>
                      <td className="px-5 py-4">
                        {user.role === "MANAGER" || member.role === "SUPERADMIN" ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {member.role}
                          </span>
                        ) : (
                          <select
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                            value={member.role}
                            disabled={updatingId === member.id}
                            onChange={(event) =>
                              void assignEmployee(member, "role", event.target.value)
                            }
                          >
                            {roles.map((role) => (
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
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
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
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dataLoading ? <p className="mt-4 text-sm text-slate-500">Loading employees...</p> : null}
          </section>
        </div>
      </div>
    </CRMShell>
  );
}
