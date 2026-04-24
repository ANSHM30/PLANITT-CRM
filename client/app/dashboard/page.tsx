"use client";

import { useEffect, useMemo, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { AttendanceCard } from "@/components/modules/attendance-card";
import { TaskList } from "@/components/modules/task-list";
import { StatePanel } from "@/components/shared/state-panel";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useSession } from "@/hooks/use-session";
import { apiGet } from "@/lib/api";
import type { DashboardSummary, EmployeeDashboardSummary } from "@/types/crm";

type DashboardTab = "overview" | "analytics" | "activity";

function CompactStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div
      className="rounded-[18px] border px-4 py-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <h3 className="text-3xl font-semibold text-[var(--text-main)]">{value}</h3>
        <p className="max-w-[10rem] text-right text-xs text-[var(--text-soft)]">{helper}</p>
      </div>
    </div>
  );
}

function Surface({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-[20px] border px-5 py-5"
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

function PerformanceBars({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; helper: string }>;
}) {
  return (
    <Surface>
      <div className="mb-5">
        <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">{item.label}</p>
                <p className="text-xs text-[var(--text-soft)]">{item.helper}</p>
              </div>
              <span className="text-sm font-semibold text-[var(--text-main)]">{item.value}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-soft)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.value}%`,
                  background:
                    "linear-gradient(90deg, var(--accent-strong) 0%, var(--accent) 55%, var(--success) 100%)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function HeatmapGrid({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ date: string; label: string; value: number; intensity: number }>;
}) {
  return (
    <Surface>
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {items.map((item) => (
          <div key={item.date} className="space-y-1 text-center">
            <div
              className="h-8 rounded-md border"
              title={`${item.label}: ${item.value}`}
              style={{
                borderColor: "var(--border)",
                background: `linear-gradient(180deg, color-mix(in srgb, var(--accent) ${Math.max(
                  10,
                  item.intensity
                )}%, var(--surface-soft)), var(--surface-soft))`,
              }}
            />
            <p className="text-[10px] text-[var(--text-faint)]">{item.label.split(" ")[1] ?? item.label}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function TrendBars({
  title,
  subtitle,
  items,
  keyName,
  color,
}: {
  title: string;
  subtitle: string;
  items: Array<Record<string, number | string>>;
  keyName: string;
  color: string;
}) {
  const maxValue = Math.max(
    1,
    ...items.map((item) => Number(item[keyName] ?? 0))
  );

  return (
    <Surface>
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {items.map((item) => {
          const value = Number(item[keyName] ?? 0);
          const height = Math.max(6, Math.round((value / maxValue) * 56));
          return (
            <div key={`${item.date}-${keyName}`} className="flex flex-col items-center gap-1">
              <div className="flex h-16 items-end">
                <div
                  className="w-5 rounded-md"
                  style={{
                    height,
                    background: color,
                  }}
                  title={`${item.label}: ${value}`}
                />
              </div>
              <p className="text-[10px] text-[var(--text-faint)]">
                {String(item.label).split(" ")[1] ?? item.label}
              </p>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function UpdateFeed({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    message: string;
    authorName: string;
    authorRole: string;
    taskTitle?: string | null;
    createdAt: string;
  }>;
}) {
  return (
    <Surface>
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--text-main)]">{item.title}</p>
                <span className="text-xs text-[var(--text-faint)]">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">{item.message}</p>
              <p className="mt-2 text-xs text-[var(--text-faint)]">
                {item.authorName} ({item.authorRole}) {item.taskTitle ? `- ${item.taskTitle}` : ""}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-[var(--text-soft)]">No recent leadership updates.</p>
        )}
      </div>
    </Surface>
  );
}

export default function DashboardPage() {
  const { user, loading } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

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

  useRealtimeRefresh(
    user,
    ["task:updated", "attendance:updated", "org:updated", "issue:updated", "project:updated"],
    () => {
      if (!user) {
        return;
      }

      return apiGet<DashboardSummary>("/dashboard/summary")
        .then(setSummary)
        .catch(() => undefined);
    }
  );

  const leadershipView = summary?.scope === "admin" || summary?.scope === "superadmin";

  const overviewStats = useMemo(() => {
    if (!summary) {
      return [];
    }

    if (summary.scope === "superadmin") {
      return [
        { label: "Departments", value: summary.metrics.totalDepartments, helper: "Active business units" },
        { label: "Managers", value: summary.metrics.totalManagers, helper: "Leadership capacity" },
        { label: "Employees", value: summary.metrics.totalEmployees, helper: "Core team members" },
        { label: "Interns", value: summary.metrics.totalInterns, helper: "Current intern strength" },
      ];
    }

    if (summary.scope === "admin") {
      return [
        { label: "Employees", value: summary.metrics.totalEmployees, helper: "Employees and managers" },
        { label: "Interns", value: summary.metrics.totalInterns, helper: "Intern tracking" },
        { label: "Tasks", value: summary.metrics.totalTasks, helper: "All organization tasks" },
        { label: "Attendance", value: summary.metrics.activeAttendance, helper: "Checked in right now" },
      ];
    }

    const employeeMetrics = (summary as EmployeeDashboardSummary).metrics;

    return [
      { label: "Assigned", value: employeeMetrics.myTasks, helper: "Tasks in your queue" },
      { label: "Pending", value: employeeMetrics.pendingTasks, helper: "Open work items" },
      { label: "Done", value: employeeMetrics.completedTasks, helper: "Completed items" },
      { label: "Status", value: employeeMetrics.checkedIn ? "Active" : "Offline", helper: "Attendance state" },
    ];
  }, [summary]);

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

  const tabs: Array<{ id: DashboardTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <CRMShell user={user}>
      <div className="space-y-4">
        <Surface>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                {summary.scope === "superadmin"
                  ? "CEO Dashboard"
                  : summary.scope === "admin"
                    ? "Admin Dashboard"
                    : "Personal Workspace"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text-main)]">
                Welcome back, {user.name.split(" ")[0]}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                {leadershipView
                  ? "Real-time team analytics with attendance, working-hours, progress trends, and leadership updates."
                  : "Track your attendance, working hours, and progress trends in one focused dashboard."}
              </p>
            </div>

            <div
              className="inline-flex items-center gap-1 rounded-2xl border p-1"
              style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="rounded-xl px-4 py-2 text-sm font-medium transition"
                  style={
                    activeTab === tab.id
                      ? {
                          background: "var(--accent)",
                          color: "#ffffff",
                        }
                      : {
                          color: "var(--text-soft)",
                        }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </Surface>

        {activeTab === "overview" ? (
          <div className="space-y-4">
            <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {overviewStats.map((stat) => (
                <CompactStat key={stat.label} label={stat.label} value={stat.value} helper={stat.helper} />
              ))}
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Surface>
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[var(--text-main)]">
                    {leadershipView ? "Recent execution" : "Your latest tasks"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {leadershipView
                      ? "A focused snapshot of active work."
                      : "A focused snapshot of your latest assignments."}
                  </p>
                </div>
                {summary.recentTasks.length ? (
                  <TaskList tasks={summary.recentTasks} user={user} />
                ) : (
                  <StatePanel title="No tasks yet" description="Work items will appear here once tasks are assigned." />
                )}
              </Surface>

              <div className="space-y-4">
                <AttendanceCard
                  initialCheckedIn={summary.scope === "employee" ? summary.metrics.checkedIn : false}
                />
                <UpdateFeed
                  title="Brief updates from manager/admin"
                  items={summary.analytics.updatesFeed.slice(0, 4)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "analytics" ? (
          <div className="space-y-4">
            {summary.scope !== "employee" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <PerformanceBars
                  title="Department performance"
                  subtitle="Average progress across departments."
                  items={summary.departmentPerformance.map((department) => ({
                    label: department.departmentName,
                    value: department.averageProgress,
                    helper: `${department.completed}/${department.totalAssigned} tasks completed`,
                  }))}
                />
                <PerformanceBars
                  title="Role performance"
                  subtitle="Average progress by organizational role."
                  items={summary.rolePerformance.map((role) => ({
                    label: role.role,
                    value: role.averageProgress,
                    helper: `${role.completed}/${role.totalAssigned} tasks completed`,
                  }))}
                />
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <HeatmapGrid
                title={summary.scope === "employee" ? "Attendance heatmap" : "Team attendance heatmap"}
                subtitle={summary.scope === "employee" ? "Your attendance intensity over recent days." : "Daily participation trend across your organization."}
                items={summary.analytics.attendanceHeatmap}
              />
              <TrendBars
                title={summary.scope === "employee" ? "Working hours trend" : "Average working hours trend"}
                subtitle="Daily hours trend for quick workload analysis."
                items={summary.analytics.workingHoursTrend}
                keyName="hours"
                color="linear-gradient(180deg, var(--accent), var(--accent-strong))"
              />
            </div>

            <TrendBars
              title="Task progress trend"
              subtitle="Daily task completion movement based on recent updates."
              items={summary.analytics.taskProgressTrend}
              keyName="avgProgress"
              color="linear-gradient(180deg, var(--success), var(--accent))"
            />
          </div>
        ) : null}

        {activeTab === "activity" ? (
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            {summary.scope !== "employee" ? (
              <Surface>
                <p className="text-sm font-semibold text-[var(--text-main)]">Department roster</p>
                <div className="mt-4 space-y-2.5">
                  {summary.departmentBreakdown.map((department) => (
                    <div
                      key={department.id}
                      className="rounded-2xl border px-4 py-3"
                      style={{
                        background: "var(--surface-soft)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-main)]">{department.name}</p>
                          <p className="text-xs text-[var(--text-soft)]">
                            Head: {department.head?.name || "Not assigned"}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-soft)]">
                          {department._count?.users ?? 0} members
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            ) : null}

            <UpdateFeed title="Leadership update feed" items={summary.analytics.updatesFeed} />
          </div>
        ) : null}
      </div>
    </CRMShell>
  );
}
