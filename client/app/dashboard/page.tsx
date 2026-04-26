"use client";

import { useEffect, useMemo, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { AttendanceCard } from "@/components/modules/attendance-card";
import { TaskList } from "@/components/modules/task-list";
import { StatePanel } from "@/components/shared/state-panel";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useSession } from "@/hooks/use-session";
import { apiDelete, apiGet } from "@/lib/api";
import type {
  CRMUser,
  DashboardSummary,
  EmployeeDashboardSummary,
  GoogleWorkspaceStatus,
  UserAnalyticsSummary,
} from "@/types/crm";

type DashboardTab = "overview" | "analytics" | "departments" | "workspace" | "activity";

function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border ${className}`}
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

function formatRole(role: CRMUser["role"]) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildLinePath(points: number[], width: number, height: number) {
  if (!points.length) {
    return "";
  }

  const max = Math.max(...points, 1);
  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - (point / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function SummaryStatCard({
  label,
  value,
  helper,
  points,
}: {
  label: string;
  value: string | number;
  helper: string;
  points: number[];
}) {
  const path = buildLinePath(points, 140, 44);

  return (
    <Surface className="overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">
            {label}
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-main)]">{value}</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">{helper}</p>
        </div>

        <div
          className="rounded-2xl border px-3 py-2"
          style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
        >
          <svg width="140" height="44" viewBox="0 0 140 44" fill="none" aria-hidden="true">
            <path
              d={path}
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </Surface>
  );
}

function LineChartCard({
  title,
  subtitle,
  values,
  labels,
  suffix = "",
  stroke = "var(--accent)",
  fill = "color-mix(in srgb, var(--accent) 14%, transparent)",
}: {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  suffix?: string;
  stroke?: string;
  fill?: string;
}) {
  const width = 480;
  const height = 180;
  const max = Math.max(...values, 1);
  const path = buildLinePath(values, width, height - 24);
  const areaPath = values.length
    ? `${path} L ${width} ${height} L 0 ${height} Z`
    : "";

  return (
    <Surface className="p-5">
      <div className="mb-5">
        <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
      </div>

      <div className="overflow-hidden rounded-[20px] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" aria-hidden="true">
          {[0, 1, 2, 3].map((step) => {
            const y = 12 + (step / 3) * (height - 36);
            return (
              <line
                key={step}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                stroke="color-mix(in srgb, var(--border) 80%, transparent)"
                strokeDasharray="4 6"
              />
            );
          })}
          {areaPath ? <path d={areaPath} fill={fill} /> : null}
          {path ? (
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {values.map((value, index) => {
            const x = (index / Math.max(values.length - 1, 1)) * width;
            const y = height - 24 - (value / max) * (height - 24);
            return <circle key={`${labels[index]}-${value}`} cx={x} cy={y} r="4" fill={stroke} />;
          })}
        </svg>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {labels.map((label, index) => (
            <div key={`${label}-${index}`} className="text-center">
              <p className="text-[10px] text-[var(--text-faint)]">{label.split(" ")[1] ?? label}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text-main)]">
                {values[index]}
                {suffix}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Surface>
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
    <Surface className="p-5">
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
            <div className="mt-2 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-soft)" }}>
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
    <Surface className="p-5">
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {items.map((item) => (
          <div key={item.date} className="space-y-1 text-center">
            <div
              className="h-9 rounded-xl border"
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
    <Surface className="p-5">
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

function TaskSummaryList({
  tasks,
}: {
  tasks: UserAnalyticsSummary["recentTasks"];
}) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <article
          key={task.id}
          className="rounded-2xl border px-4 py-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">{task.title}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{task.description || "No description added yet."}</p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{
                background:
                  task.status === "DONE"
                    ? "color-mix(in srgb, var(--success) 16%, var(--surface))"
                    : task.status === "IN_PROGRESS"
                      ? "color-mix(in srgb, var(--accent) 16%, var(--surface))"
                      : "var(--surface)",
                color: task.status === "DONE" ? "var(--success)" : "var(--text-soft)",
              }}
            >
              {task.status.replace("_", " ")}
            </span>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Progress</p>
              <p className="text-sm font-semibold text-[var(--text-main)]">{task.progress}%</p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${task.progress}%`,
                  background:
                    "linear-gradient(90deg, var(--accent-strong) 0%, var(--accent) 60%, var(--success) 100%)",
                }}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function StatusBreakdownCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);

  return (
    <Surface className="p-5">
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      <div className="mt-5 space-y-4">
        {items.map((item, index) => {
          const percentage = Math.round((item.value / total) * 100);
          const colors = ["var(--text-faint)", "var(--accent)", "var(--success)"];
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--text-main)]">{item.label}</p>
                <span className="text-sm font-semibold text-[var(--text-main)]">
                  {item.value} <span className="text-[var(--text-faint)]">({percentage}%)</span>
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full" style={{ background: "var(--surface-soft)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentage}%`,
                    background: colors[index] ?? "var(--accent)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function TeamMemberCard({
  member,
  active,
  onClick,
}: {
  member: CRMUser;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[22px] border p-4 text-left transition"
      style={{
        borderColor: active ? "color-mix(in srgb, var(--accent) 60%, var(--border))" : "var(--border)",
        background: active
          ? "linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface))"
          : "var(--surface-soft)",
        boxShadow: active ? "0 16px 34px rgba(37, 99, 235, 0.12)" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold"
          style={{ background: "color-mix(in srgb, var(--accent) 14%, var(--surface))", color: "var(--accent-strong)" }}
        >
          {getInitials(member.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-main)]">{member.name}</p>
              <p className="truncate text-xs text-[var(--text-soft)]">{member.designation || "Team member"}</p>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ background: "var(--surface)", color: "var(--text-soft)" }}
            >
              {formatRole(member.role)}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-[var(--text-soft)] sm:grid-cols-2">
            <p>Department: {member.department?.name || "Unassigned"}</p>
            <p>Manager: {member.manager?.name || "-"}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

function TeamAnalyticsPanel({
  members,
  selectedMemberId,
  selectedAnalytics,
  analyticsLoading,
  directoryTitle,
  directorySubtitle,
  onSelect,
}: {
  members: CRMUser[];
  selectedMemberId: string;
  selectedAnalytics: UserAnalyticsSummary | null;
  analyticsLoading: boolean;
  directoryTitle: string;
  directorySubtitle: string;
  onSelect: (memberId: string) => void;
}) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
      <Surface className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {directorySubtitle}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">{directoryTitle}</h2>
          </div>
          <span className="text-sm text-[var(--text-soft)]">{members.length} visible</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              active={member.id === selectedMemberId}
              onClick={() => onSelect(member.id)}
            />
          ))}
        </div>
      </Surface>

      <div className="space-y-4">
        {analyticsLoading || !selectedAnalytics ? (
          <StatePanel
            title="Loading team analytics"
            description="Preparing attendance, progress, and work-hour charts for the selected member."
          />
        ) : (
          <>
            <Surface className="overflow-hidden p-0">
              <div
                className="border-b px-6 py-6"
                style={{
                  borderColor: "var(--border)",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--surface)) 0%, var(--surface) 58%)",
                }}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                      Selected team member
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
                      {selectedAnalytics.user.name}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      {selectedAnalytics.user.designation || "Team member"} · {formatRole(selectedAnalytics.user.role)} ·{" "}
                      {selectedAnalytics.user.department?.name || "No department"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Status</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">
                        {selectedAnalytics.metrics.checkedIn ? "Checked in" : "Offline"}
                      </p>
                    </div>
                    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Avg hours</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">
                        {selectedAnalytics.metrics.avgDailyHours}h
                      </p>
                    </div>
                    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Avg progress</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-main)]">
                        {selectedAnalytics.metrics.avgProgress}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Assigned tasks",
                    value: selectedAnalytics.metrics.totalTasks,
                  },
                  {
                    label: "Completed",
                    value: selectedAnalytics.metrics.completedTasks,
                  },
                  {
                    label: "Pending",
                    value: selectedAnalytics.metrics.pendingTasks,
                  },
                  {
                    label: "Attendance days",
                    value: selectedAnalytics.metrics.attendanceDays,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border px-4 py-4"
                    style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)]">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </Surface>

            <div className="grid gap-4 xl:grid-cols-2">
              <LineChartCard
                title="Daily work hours"
                subtitle="Recent working-hour movement for the selected team member."
                values={selectedAnalytics.analytics.workingHoursTrend.map((item) => item.hours)}
                labels={selectedAnalytics.analytics.workingHoursTrend.map((item) => item.label)}
                suffix="h"
                stroke="var(--accent)"
                fill="color-mix(in srgb, var(--accent) 16%, transparent)"
              />
              <LineChartCard
                title="Work progress trend"
                subtitle="Average task progress updates over the last two weeks."
                values={selectedAnalytics.analytics.taskProgressTrend.map((item) => item.avgProgress)}
                labels={selectedAnalytics.analytics.taskProgressTrend.map((item) => item.label)}
                suffix="%"
                stroke="var(--success)"
                fill="color-mix(in srgb, var(--success) 14%, transparent)"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <HeatmapGrid
                title="Attendance intensity"
                subtitle="Attendance pattern over the past 35 days."
                items={selectedAnalytics.analytics.attendanceHeatmap}
              />
              <StatusBreakdownCard
                title="Task status split"
                items={selectedAnalytics.taskStatusBreakdown}
              />
            </div>

            <Surface className="p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[var(--text-main)]">Recent assigned work</p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  Latest tasks to help leadership review delivery context quickly.
                </p>
              </div>
              {selectedAnalytics.recentTasks.length ? (
                <TaskSummaryList tasks={selectedAnalytics.recentTasks} />
              ) : (
                <StatePanel title="No tasks found" description="This team member does not have assigned tasks yet." />
              )}
            </Surface>
          </>
        )}
      </div>
    </div>
  );
}

function DepartmentWisePanel({
  departments,
}: {
  departments: NonNullable<Extract<DashboardSummary, { scope: "superadmin" | "admin" }>["analytics"]["superAdmin"]>["departmentWise"];
}) {
  return (
    <Surface className="p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[var(--text-main)]">Department-wise analytics</p>
        <p className="mt-1 text-sm text-[var(--text-soft)]">
          Detailed CRM performance by department for CEO-level review.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)]">
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Projects</th>
              <th className="px-3 py-2">Tasks</th>
              <th className="px-3 py-2">Completion</th>
              <th className="px-3 py-2">Progress</th>
              <th className="px-3 py-2">Attendance</th>
              <th className="px-3 py-2">Open issues</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr
                key={department.departmentId}
                className="rounded-2xl border"
                style={{ background: "var(--surface-soft)", borderColor: "var(--border)" }}
              >
                <td className="rounded-l-2xl px-3 py-3 text-sm font-semibold text-[var(--text-main)]">
                  {department.departmentName}
                </td>
                <td className="px-3 py-3 text-sm text-[var(--text-soft)]">
                  {department.members} ({department.managers} managers, {department.interns} interns)
                </td>
                <td className="px-3 py-3 text-sm text-[var(--text-soft)]">{department.totalProjects}</td>
                <td className="px-3 py-3 text-sm text-[var(--text-soft)]">
                  {department.completedTasks}/{department.totalTasks}
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-[var(--text-main)]">
                  {department.completionRate}%
                </td>
                <td className="px-3 py-3 text-sm text-[var(--text-soft)]">{department.avgProgress}%</td>
                <td className="px-3 py-3 text-sm text-[var(--text-soft)]">
                  {department.activeAttendance} live / {department.avgWorkingHours}h avg
                </td>
                <td className="rounded-r-2xl px-3 py-3 text-sm text-[var(--text-soft)]">{department.openIssues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function GoogleWorkspacePanel({
  status,
  loading,
  message,
  onConnect,
  onDisconnect,
}: {
  status: GoogleWorkspaceStatus | null;
  loading: boolean;
  message: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (loading) {
    return (
      <StatePanel
        title="Loading Google Workspace"
        description="Checking Google Meet, Sheets, and Drive connection status."
      />
    );
  }

  return (
    <div className="space-y-4">
      {message ? <StatePanel title="Workspace update" description={message} /> : null}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface className="p-5">
          <p className="text-sm font-semibold text-[var(--text-main)]">Google Workspace connection</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            Connect once with Google Auth and manage Meet, Sheets, and Drive directly from CRM workflows.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { key: "meet", label: "Google Meet", connected: status?.services.meet ?? false },
              { key: "sheets", label: "Google Sheets", connected: status?.services.sheets ?? false },
              { key: "drive", label: "Google Drive", connected: status?.services.drive ?? false },
            ].map((service) => (
              <div
                key={service.key}
                className="rounded-2xl border px-4 py-3"
                style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                  {service.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">
                  {service.connected ? "Connected" : "Not connected"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConnect}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Connect with Google Auth
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--text-soft)" }}
            >
              Disconnect
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--text-faint)]">
            {status?.connected
              ? `Connected as ${status.workspaceEmail || "Google account"}`
              : "No workspace account connected yet."}
          </p>
        </Surface>

        <Surface className="p-5">
          <p className="text-sm font-semibold text-[var(--text-main)]">Workspace + CRM quick signals</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Total tasks</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{status?.crmSignals.totalTasks ?? 0}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Open tasks</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{status?.crmSignals.openTasks ?? 0}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Projects</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{status?.crmSignals.totalProjects ?? 0}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">Departments</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{status?.crmSignals.totalDepartments ?? 0}</p>
            </div>
          </div>
        </Surface>
      </div>

      <Surface className="p-5">
        <p className="text-sm font-semibold text-[var(--text-main)]">Recommended Google Workspace analytics for CRM</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(status?.recommendations ?? []).map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border px-4 py-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
            >
              <p className="text-sm font-semibold text-[var(--text-main)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{item.description}</p>
              <p className="mt-2 text-xs text-[var(--text-faint)]">
                Source: {item.source} | CRM value: {item.crmUseCase}
              </p>
            </article>
          ))}
        </div>
      </Surface>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [teamMembers, setTeamMembers] = useState<CRMUser[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedAnalytics, setSelectedAnalytics] = useState<UserAnalyticsSummary | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState<GoogleWorkspaceStatus | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  const leadershipView = summary?.scope === "admin" || summary?.scope === "superadmin";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const nextTab = params.get("tab");
    if (nextTab === "overview" || nextTab === "analytics" || nextTab === "departments" || nextTab === "workspace" || nextTab === "activity") {
      setActiveTab(nextTab);
    }

    const googleState = params.get("google");
    if (googleState === "connected") {
      setWorkspaceMessage("Google Workspace connected successfully.");
    } else if (googleState === "denied") {
      setWorkspaceMessage("Google connection was cancelled from consent screen.");
    } else if (googleState === "missing_config") {
      setWorkspaceMessage("Google OAuth config is missing in backend environment.");
    } else if (googleState === "token_failed" || googleState === "failed") {
      setWorkspaceMessage("Google token exchange failed. Please retry connection.");
    } else if (googleState === "missing_code") {
      setWorkspaceMessage("Google callback was incomplete. Please retry.");
    }
  }, []);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await apiGet<DashboardSummary>("/dashboard/summary");
        setSummary(data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    }

    if (user) {
      void loadSummary();
    }
  }, [user]);

  useEffect(() => {
    async function loadTeamMembers() {
      if (!leadershipView) {
        return;
      }

      try {
        setTeamLoading(true);
        const members = await apiGet<CRMUser[]>("/users");
        const visibleMembers =
          summary?.scope === "superadmin"
            ? members.filter((member) =>
                ["ADMIN", "MANAGER", "EMPLOYEE", "INTERN"].includes(member.role)
              )
            : members.filter((member) => member.role === "EMPLOYEE" || member.role === "INTERN");
        setTeamMembers(visibleMembers);
        setSelectedMemberId((current) => current || visibleMembers[0]?.id || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team members");
      } finally {
        setTeamLoading(false);
      }
    }

    void loadTeamMembers();
  }, [leadershipView, summary?.scope]);

  useEffect(() => {
    async function loadMemberAnalytics() {
      if (!leadershipView || !selectedMemberId) {
        setSelectedAnalytics(null);
        return;
      }

      try {
        setAnalyticsLoading(true);
        const data = await apiGet<UserAnalyticsSummary>(`/users/${selectedMemberId}/analytics`);
        setSelectedAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load member analytics");
      } finally {
        setAnalyticsLoading(false);
      }
    }

    void loadMemberAnalytics();
  }, [leadershipView, selectedMemberId]);

  useEffect(() => {
    async function loadWorkspaceStatus() {
      if (summary?.scope !== "superadmin") {
        setWorkspaceStatus(null);
        return;
      }

      try {
        setWorkspaceLoading(true);
        const data = await apiGet<GoogleWorkspaceStatus>("/integrations/google/status");
        setWorkspaceStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Google Workspace status");
      } finally {
        setWorkspaceLoading(false);
      }
    }

    void loadWorkspaceStatus();
  }, [summary?.scope]);

  useRealtimeRefresh(
    user,
    ["task:updated", "attendance:updated", "org:updated", "issue:updated", "project:updated"],
    async () => {
      if (!user) {
        return;
      }

      const freshSummary = await apiGet<DashboardSummary>("/dashboard/summary");
      setSummary(freshSummary);

      if (freshSummary.scope === "admin" || freshSummary.scope === "superadmin") {
        const members = await apiGet<CRMUser[]>("/users");
        const visibleMembers =
          freshSummary.scope === "superadmin"
            ? members.filter((member) =>
                ["ADMIN", "MANAGER", "EMPLOYEE", "INTERN"].includes(member.role)
              )
            : members.filter((member) => member.role === "EMPLOYEE" || member.role === "INTERN");
        setTeamMembers(visibleMembers);

        const nextSelectedId =
          visibleMembers.find((member) => member.id === selectedMemberId)?.id ??
          visibleMembers[0]?.id ??
          "";
        setSelectedMemberId(nextSelectedId);

        if (nextSelectedId) {
          const analytics = await apiGet<UserAnalyticsSummary>(`/users/${nextSelectedId}/analytics`);
          setSelectedAnalytics(analytics);
        }
      }

      if (freshSummary.scope === "superadmin") {
        const workspace = await apiGet<GoogleWorkspaceStatus>("/integrations/google/status");
        setWorkspaceStatus(workspace);
      } else {
        setWorkspaceStatus(null);
      }
    }
  );

  const overviewStats = useMemo(() => {
    if (!summary) {
      return [];
    }

    const progressSeries = summary.analytics.taskProgressTrend.map((item) => item.avgProgress);
    const attendanceSeries =
      summary.scope === "employee"
        ? summary.analytics.workingHoursTrend.map((item) => item.hours)
        : summary.analytics.attendanceHeatmap.map((item) => item.value);
    const hoursSeries = summary.analytics.workingHoursTrend.map((item) => item.hours);

    if (summary.scope === "superadmin") {
      return [
        {
          label: "Departments",
          value: summary.metrics.totalDepartments,
          helper: "Active business units",
          points: attendanceSeries.slice(-7),
        },
        {
          label: "Managers",
          value: summary.metrics.totalManagers,
          helper: "Leadership coverage",
          points: progressSeries.slice(-7),
        },
        {
          label: "Employees",
          value: summary.metrics.totalEmployees,
          helper: "Core execution team",
          points: hoursSeries.slice(-7),
        },
        {
          label: "Interns",
          value: summary.metrics.totalInterns,
          helper: "Learning pipeline",
          points: progressSeries.slice(-7).reverse(),
        },
      ];
    }

    if (summary.scope === "admin") {
      return [
        {
          label: "Employees",
          value: summary.metrics.totalEmployees,
          helper: "Employees and managers",
          points: attendanceSeries.slice(-7),
        },
        {
          label: "Interns",
          value: summary.metrics.totalInterns,
          helper: "Current intern roster",
          points: hoursSeries.slice(-7),
        },
        {
          label: "Tasks",
          value: summary.metrics.totalTasks,
          helper: "Tracked organization tasks",
          points: progressSeries.slice(-7),
        },
        {
          label: "Live attendance",
          value: summary.metrics.activeAttendance,
          helper: "Checked in right now",
          points: attendanceSeries.slice(-7).reverse(),
        },
      ];
    }

    const employeeMetrics = (summary as EmployeeDashboardSummary).metrics;

    return [
      {
        label: "Assigned",
        value: employeeMetrics.myTasks,
        helper: "Tasks in your queue",
        points: progressSeries.slice(-7),
      },
      {
        label: "Pending",
        value: employeeMetrics.pendingTasks,
        helper: "Open work items",
        points: attendanceSeries.slice(-7),
      },
      {
        label: "Done",
        value: employeeMetrics.completedTasks,
        helper: "Completed items",
        points: progressSeries.slice(-7).reverse(),
      },
      {
        label: "Status",
        value: employeeMetrics.checkedIn ? "Active" : "Offline",
        helper: "Attendance state",
        points: hoursSeries.slice(-7),
      },
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
    ...(summary.scope === "superadmin" ? [{ id: "departments" as DashboardTab, label: "Departments" }] : []),
    ...(summary.scope === "superadmin" ? [{ id: "workspace" as DashboardTab, label: "Workspace" }] : []),
    { id: "activity", label: "Activity" },
  ];

  const completionRate =
    summary.scope === "employee"
      ? Math.round(
          (((summary as EmployeeDashboardSummary).metrics.completedTasks || 0) /
            Math.max(1, (summary as EmployeeDashboardSummary).metrics.myTasks)) *
            100
        )
      : Math.round((summary.metrics.completedTasks / Math.max(1, summary.metrics.totalTasks)) * 100);

  const heroHoursValue = summary.analytics.workingHoursTrend.at(-1)?.hours ?? 0;

  const handleGoogleConnect = async () => {
    try {
      const data = await apiGet<{ authUrl: string }>("/integrations/google/auth-url?services=meet,sheets,drive");
      window.location.href = data.authUrl;
    } catch (err) {
      setWorkspaceMessage(err instanceof Error ? err.message : "Failed to start Google Auth flow.");
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await apiDelete<void>("/integrations/google/disconnect");
      setWorkspaceMessage("Google Workspace disconnected.");
      const refreshed = await apiGet<GoogleWorkspaceStatus>("/integrations/google/status");
      setWorkspaceStatus(refreshed);
    } catch (err) {
      setWorkspaceMessage(err instanceof Error ? err.message : "Failed to disconnect Google Workspace.");
    }
  };

  return (
    <CRMShell user={user}>
      <div className="space-y-5">
        <Surface className="overflow-hidden p-0">
          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">
                {summary.scope === "superadmin"
                  ? "CEO command center"
                  : summary.scope === "admin"
                    ? "Admin command center"
                    : "Personal command center"}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-main)]">
                Welcome back, {user.name.split(" ")[0]}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                {leadershipView
                  ? "Track live organization health, review employee and intern performance, and drill into attendance, working hours, and progress from one cleaner dashboard."
                  : "See your attendance, working hours, task movement, and daily progress in a more visual workspace."}
              </p>

              <div
                className="mt-6 inline-flex items-center gap-1 rounded-2xl border p-1"
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

            <div
              className="rounded-[24px] border p-5"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--surface)) 0%, var(--surface-soft) 100%)",
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[20px] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Completion rate</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--text-main)]">{completionRate}%</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">
                    {leadershipView ? "Org-level task completion snapshot" : "Your completed work snapshot"}
                  </p>
                </div>
                <div className="rounded-[20px] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Latest work hours</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--text-main)]">{heroHoursValue}h</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">
                    {leadershipView ? "Average recent working-hour trend" : "Your latest tracked work-hour signal"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <LineChartCard
                  title="Momentum"
                  subtitle="Recent progress trend across the workspace."
                  values={summary.analytics.taskProgressTrend.map((item) => item.avgProgress)}
                  labels={summary.analytics.taskProgressTrend.map((item) => item.label)}
                  suffix="%"
                  stroke="var(--accent-strong)"
                  fill="color-mix(in srgb, var(--accent) 12%, transparent)"
                />
              </div>
            </div>
          </div>
        </Surface>

        {activeTab === "overview" ? (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {overviewStats.map((stat) => (
                <SummaryStatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  helper={stat.helper}
                  points={stat.points}
                />
              ))}
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <LineChartCard
                  title={leadershipView ? "Organization work-hour trend" : "Personal work-hour trend"}
                  subtitle="A clearer view of daily work-hour movement."
                  values={summary.analytics.workingHoursTrend.map((item) => item.hours)}
                  labels={summary.analytics.workingHoursTrend.map((item) => item.label)}
                  suffix="h"
                  stroke="var(--accent)"
                  fill="color-mix(in srgb, var(--accent) 14%, transparent)"
                />
                <Surface className="p-5">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                      {leadershipView ? "Recent execution" : "Your latest tasks"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {leadershipView
                        ? "A sharper operational snapshot of active work."
                        : "A focused snapshot of your most recent assignments."}
                    </p>
                  </div>
                  {summary.recentTasks.length ? (
                    <TaskList tasks={summary.recentTasks} user={user} />
                  ) : (
                    <StatePanel title="No tasks yet" description="Work items will appear here once tasks are assigned." />
                  )}
                </Surface>
              </div>

              <div className="space-y-4">
                <AttendanceCard
                  initialCheckedIn={summary.scope === "employee" ? summary.metrics.checkedIn : false}
                />
                <UpdateFeed
                  title={leadershipView ? "Leadership updates" : "Manager/admin updates"}
                  items={summary.analytics.updatesFeed.slice(0, 4)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "analytics" ? (
          <div className="space-y-5">
            {summary.scope !== "employee" ? (
              <>
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
                      label: formatRole(role.role),
                      value: role.averageProgress,
                      helper: `${role.completed}/${role.totalAssigned} tasks completed`,
                    }))}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <HeatmapGrid
                    title="Team attendance heatmap"
                    subtitle="Daily participation trend across your organization."
                    items={summary.analytics.attendanceHeatmap}
                  />
                  <LineChartCard
                    title="Task progress trend"
                    subtitle="Recent completion momentum across the organization."
                    values={summary.analytics.taskProgressTrend.map((item) => item.avgProgress)}
                    labels={summary.analytics.taskProgressTrend.map((item) => item.label)}
                    suffix="%"
                    stroke="var(--success)"
                    fill="color-mix(in srgb, var(--success) 12%, transparent)"
                  />
                </div>

                {teamLoading ? (
                  <StatePanel
                    title="Loading team members"
                    description="Getting employees and interns ready for detailed analytics review."
                  />
                ) : teamMembers.length ? (
                  <TeamAnalyticsPanel
                    members={teamMembers}
                    selectedMemberId={selectedMemberId}
                    selectedAnalytics={selectedAnalytics}
                    analyticsLoading={analyticsLoading}
                    directoryTitle={
                      summary.scope === "superadmin" ? "Admins, managers, employees & interns" : "Employees & interns"
                    }
                    directorySubtitle={
                      summary.scope === "superadmin" ? "Leadership and execution directory" : "Team directory"
                    }
                    onSelect={setSelectedMemberId}
                  />
                ) : (
                  <StatePanel
                    title="No employees or interns yet"
                    description="Once team members are added, their cards and analytics will appear here."
                  />
                )}
              </>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <HeatmapGrid
                  title="Attendance heatmap"
                  subtitle="Your attendance intensity over recent days."
                  items={summary.analytics.attendanceHeatmap}
                />
                <LineChartCard
                  title="Working hours trend"
                  subtitle="Daily hours trend for quick workload analysis."
                  values={summary.analytics.workingHoursTrend.map((item) => item.hours)}
                  labels={summary.analytics.workingHoursTrend.map((item) => item.label)}
                  suffix="h"
                  stroke="var(--accent)"
                  fill="color-mix(in srgb, var(--accent) 16%, transparent)"
                />
                <LineChartCard
                  title="Task progress trend"
                  subtitle="Daily task completion movement based on recent updates."
                  values={summary.analytics.taskProgressTrend.map((item) => item.avgProgress)}
                  labels={summary.analytics.taskProgressTrend.map((item) => item.label)}
                  suffix="%"
                  stroke="var(--success)"
                  fill="color-mix(in srgb, var(--success) 14%, transparent)"
                />
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "departments" ? (
          summary.scope === "superadmin" && summary.analytics.superAdmin ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryStatCard
                  label="Org progress"
                  value={`${summary.analytics.superAdmin.organizationHealth.avgDepartmentProgress}%`}
                  helper="Average progress across departments"
                  points={summary.analytics.taskProgressTrend.map((item) => item.avgProgress).slice(-7)}
                />
                <SummaryStatCard
                  label="Live attendance rate"
                  value={`${summary.analytics.superAdmin.organizationHealth.liveAttendanceRate}%`}
                  helper="Currently active workforce intensity"
                  points={summary.analytics.attendanceHeatmap.map((item) => item.value).slice(-7)}
                />
                <SummaryStatCard
                  label="Open issues"
                  value={summary.analytics.superAdmin.organizationHealth.openIssues}
                  helper="Unresolved task issues across departments"
                  points={summary.analytics.taskProgressTrend.map((item) => item.created).slice(-7)}
                />
              </div>
              <DepartmentWisePanel departments={summary.analytics.superAdmin.departmentWise} />
            </div>
          ) : (
            <StatePanel
              title="Departments analytics unavailable"
              description="This section is visible only for Superadmin."
            />
          )
        ) : null}

        {activeTab === "workspace" ? (
          summary.scope === "superadmin" ? (
            <GoogleWorkspacePanel
              status={workspaceStatus}
              loading={workspaceLoading}
              message={workspaceMessage}
              onConnect={handleGoogleConnect}
              onDisconnect={handleGoogleDisconnect}
            />
          ) : (
            <StatePanel title="Workspace tab unavailable" description="Only Superadmin can connect Google Workspace." />
          )
        ) : null}

        {activeTab === "activity" ? (
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            {summary.scope !== "employee" ? (
              <Surface className="p-5">
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
