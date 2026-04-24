"use client";

import { useEffect, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { useSession } from "@/hooks/use-session";
import { apiGet, apiPost } from "@/lib/api";
import type { CRMUser, Department } from "@/types/crm";

export default function DepartmentsPage() {
  const { user, loading: sessionLoading } = useSession({
    allowedRoles: ["SUPERADMIN", "ADMIN"],
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaders, setLeaders] = useState<CRMUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    headId: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [departmentData, userData] = await Promise.all([
          apiGet<Department[]>("/departments"),
          apiGet<CRMUser[]>("/users"),
        ]);
        setDepartments(departmentData);
        setLeaders(
          userData.filter((member) => ["SUPERADMIN", "ADMIN", "MANAGER"].includes(member.role))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load departments");
      } finally {
        setDataLoading(false);
      }
    }

    if (user) {
      void loadData();
    }
  }, [user]);

  const createDepartment = async () => {
    try {
      setCreating(true);
      setError("");
      setNotice("");
      await apiPost("/departments", form);
      setForm({
        name: "",
        code: "",
        description: "",
        headId: "",
      });
      const data = await apiGet<Department[]>("/departments");
      setDepartments(data);
      setNotice("Department created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create department");
    } finally {
      setCreating(false);
    }
  };

  if (sessionLoading || !user) {
    return <StatePanel title="Loading departments" description="Preparing organization structure." />;
  }

  return (
    <CRMShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[34px] border border-white/70 bg-white/85 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.10)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Organization design
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Departments
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
            Structure the company into technical, marketing, research, and operations teams, then assign ownership clearly.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Create department
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Add a new business unit</h2>

            <div className="mt-6 grid gap-4">
              <input
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                placeholder="Department name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 uppercase outline-none focus:border-slate-950"
                placeholder="Code (e.g. TECH)"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              />
              <textarea
                className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-950"
                placeholder="Description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
              <select
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                value={form.headId}
                onChange={(event) => setForm((current) => ({ ...current, headId: event.target.value }))}
              >
                <option value="">Select department head</option>
                {leaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} - {leader.role}
                  </option>
                ))}
              </select>

              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
              {notice ? <p className="text-sm font-medium text-emerald-600">{notice}</p> : null}

              <button
                type="button"
                disabled={creating}
                onClick={() => void createDepartment()}
                className="h-12 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
              >
                {creating ? "Creating..." : "Create department"}
              </button>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Current structure
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Department list</h2>
              </div>
              <span className="text-sm text-slate-500">{departments.length} departments</span>
            </div>

            {dataLoading ? <p className="mt-6 text-sm text-slate-500">Loading departments...</p> : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {departments.map((department) => (
                <article
                  key={department.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {department.code}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        {department.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {department._count?.users ?? 0} members
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {department.description || "No description added yet."}
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                    Head
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {department.head?.name || "Not assigned"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </CRMShell>
  );
}
