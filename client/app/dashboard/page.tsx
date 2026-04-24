"use client";

import { useEffect, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { AttendanceCard } from "@/components/modules/attendance-card";
import { TaskList } from "@/components/modules/task-list";
import { StatePanel } from "@/components/shared/state-panel";
import { useSession } from "@/hooks/use-session";
import { apiGet } from "@/lib/api";
import type { DashboardSummary } from "@/types/crm";

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h3 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value}</h3>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function GraphCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{
    label: string;
    value: number;
    helper: string;
  }>;
}) {
  return (
    <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.helper}</p>
              </div>
              <span className="text-sm font-semibold text-slate-900">{item.value}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-950 via-blue-600 to-emerald-500"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user, loading } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await apiGet<DashboardSummary>("/dashboard/summary");
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    }

    if (user) {
      void loadSummary();
    }
  }, [user]);

  if (loading || !user) {
    return <StatePanel title="Loading workspace" description="Preparing your CRM dashboard." />;
  }

  if (error || !summary) {
    return (
      <CRMShell user={user}>
        <StatePanel title="Dashboard unavailable" description={error || "No summary data returned yet."} />
      </CRMShell>
    );
  }

  const leadershipView = summary.scope === "admin" || summary.scope === "superadmin";

  return (
    <CRMShell user={user}>
      <div className="space-y-6">
        <section className="rounded-[34px] border border-white/70 bg-white/85 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                {summary.scope === "superadmin"
                  ? "CEO dashboard"
                  : summary.scope === "admin"
                    ? "Admin dashboard"
                    : "Employee dashboard"}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
                Welcome back, {user.name.split(" ")[0]}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
                {leadershipView
                  ? "Monitor team performance, onboard employees and interns, and keep work distribution clear across the organization."
                  : "See your assigned work, update progress quickly, and keep your daily execution simple."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Access</p>
                <p className="mt-2 text-lg font-semibold">
                  {summary.scope === "superadmin"
                    ? "Full organization visibility"
                    : summary.scope === "admin"
                      ? "Team management enabled"
                      : "Personal workspace"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Focus</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {leadershipView ? "People + delivery" : "Tasks + attendance"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {summary.scope === "admin" ? (
            <>
              <StatCard
                label="Employees"
                value={summary.metrics.totalEmployees}
                helper="Current employee and manager count"
              />
              <StatCard
                label="Interns"
                value={summary.metrics.totalInterns}
                helper="Track internship intake separately"
              />
              <StatCard
                label="Total Tasks"
                value={summary.metrics.totalTasks}
                helper="All tasks across the CRM workspace"
              />
              <StatCard
                label="Checked In"
                value={summary.metrics.activeAttendance}
                helper="Live attendance activity right now"
              />
            </>
          ) : summary.scope === "superadmin" ? (
            <>
              <StatCard
                label="Departments"
                value={summary.metrics.totalDepartments}
                helper="Total active departments in the company"
              />
              <StatCard
                label="Managers"
                value={summary.metrics.totalManagers}
                helper="Leadership capacity across teams"
              />
              <StatCard
                label="Employees"
                value={summary.metrics.totalEmployees}
                helper="All permanent team members including admins"
              />
              <StatCard
                label="Interns"
                value={summary.metrics.totalInterns}
                helper="Track internship capacity separately"
              />
            </>
          ) : summary.scope === "employee" ? (
            <>
              <StatCard
                label="Assigned Tasks"
                value={summary.metrics.myTasks}
                helper="Everything currently assigned to you"
              />
              <StatCard
                label="Pending"
                value={summary.metrics.pendingTasks}
                helper="Open items that still need attention"
              />
              <StatCard
                label="Completed"
                value={summary.metrics.completedTasks}
                helper="Finished tasks in your personal queue"
              />
              <StatCard
                label="Attendance"
                value={summary.metrics.checkedIn ? "Active" : "Offline"}
                helper="Your current attendance status"
              />
            </>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Recent work
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {leadershipView ? "Latest team tasks" : "Your recent tasks"}
                </h2>
              </div>
            </div>

            {summary.recentTasks.length ? (
              <TaskList tasks={summary.recentTasks} user={user} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                No tasks yet. Start by adding work from the tasks page.
              </div>
            )}
          </section>

          <div className="space-y-6">
            {summary.scope !== "employee" ? (
              <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Department health
                </p>
                <div className="mt-4 space-y-3">
                  {summary.departmentBreakdown.map((department) => (
                    <div
                      key={department.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{department.name}</p>
                          <p className="text-xs text-slate-500">
                            Head: {department.head?.name || "Not assigned"}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {department._count?.users ?? 0} members
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {summary.scope !== "employee" ? (
              <GraphCard
                title="Department performance"
                subtitle="Average task completion progress by department."
                items={summary.departmentPerformance.map((department) => ({
                  label: department.departmentName,
                  value: department.averageProgress,
                  helper: `${department.completed}/${department.totalAssigned} tasks completed`,
                }))}
              />
            ) : null}

            {summary.scope !== "employee" ? (
              <GraphCard
                title="Role performance"
                subtitle="Average task progress by leadership and staff roles."
                items={summary.rolePerformance.map((role) => ({
                  label: role.role,
                  value: role.averageProgress,
                  helper: `${role.completed}/${role.totalAssigned} tasks completed`,
                }))}
              />
            ) : null}

            <AttendanceCard
              initialCheckedIn={summary.scope === "employee" ? summary.metrics.checkedIn : false}
            />

            <section className="rounded-[30px] border border-slate-200/70 bg-slate-950 p-6 text-white shadow-[0_20px_80px_rgba(15,23,42,0.16)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                Quick guide
              </p>
              <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                {leadershipView ? (
                  <>
                    <li>Create employees and interns from the Team page.</li>
                    <li>Assign employees or interns to managers and departments.</li>
                    <li>Assign new work from the Tasks page and monitor completion here.</li>
                    <li>Use attendance to understand who is active during the day.</li>
                  </>
                ) : (
                  <>
                    <li>Use Tasks to update progress whenever work moves forward.</li>
                    <li>Check in when you start and check out when the day ends.</li>
                    <li>Keep your assigned work list clean and current.</li>
                  </>
                )}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </CRMShell>
  );
}
