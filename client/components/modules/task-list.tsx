"use client";

import { useState } from "react";
import { apiPut } from "@/lib/api";
import type { CRMUser, Task } from "@/types/crm";

type TaskListProps = {
  tasks: Task[];
  user: CRMUser;
  onUpdated?: () => Promise<void> | void;
};

const statuses: Array<Task["status"]> = ["TODO", "IN_PROGRESS", "DONE"];

const statusStyles: Record<Task["status"], string> = {
  TODO: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  DONE: "bg-emerald-100 text-emerald-800",
};

export function TaskList({ tasks, user, onUpdated }: TaskListProps) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const canManageTask = (task: Task) =>
    user.role === "SUPERADMIN" ||
    user.role === "ADMIN" ||
    user.role === "MANAGER" ||
    task.assignments.some((assignment) => assignment.userId === user.id);

  const handleTaskUpdate = async (
    taskId: string,
    payload: Partial<Pick<Task, "status" | "progress">>
  ) => {
    try {
      setSavingId(taskId);
      await apiPut(`/tasks/${taskId}`, payload);
      await onUpdated?.();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {tasks.map((task) => (
        <article
          key={task.id}
          className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                Task
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{task.title}</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}>
              {task.status.replace("_", " ")}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {task.description || "No description provided."}
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                Progress
              </p>
              <span className="text-sm font-semibold text-slate-900">{task.progress}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-950 via-blue-600 to-emerald-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
              Assigned to
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {task.assignments.map((assignment) => (
                <span
                  key={assignment.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {assignment.user.name} - {assignment.user.role}
                </span>
              ))}
            </div>
          </div>

          {canManageTask(task) ? (
            <div className="mt-6 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
              <label className="text-sm font-medium text-slate-600">Update status</label>
              <select
                defaultValue={task.status}
                disabled={savingId === task.id}
                onChange={(event) =>
                  void handleTaskUpdate(task.id, {
                    status: event.target.value as Task["status"],
                  })
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none ring-0"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>

              <label className="text-sm font-medium text-slate-600">Update progress</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={task.progress}
                  disabled={savingId === task.id}
                  onChange={(event) =>
                    void handleTaskUpdate(task.id, {
                      progress: Number(event.target.value),
                    })
                  }
                  className="w-full accent-slate-950"
                />
                <span className="w-12 text-right text-sm font-semibold text-slate-900">
                  {task.progress}%
                </span>
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

