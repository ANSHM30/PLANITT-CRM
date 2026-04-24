"use client";

import { useState } from "react";
import { apiDelete, apiPost, apiPut } from "@/lib/api";
import type { CRMUser, Task } from "@/types/crm";

type TaskListProps = {
  tasks: Task[];
  user: CRMUser;
  team?: CRMUser[];
  onUpdated?: () => Promise<void> | void;
};

const statuses: Array<Task["status"]> = ["TODO", "IN_PROGRESS", "DONE"];

const statusStyles: Record<Task["status"], string> = {
  TODO: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
};

export function TaskList({ tasks, user, team = [], onUpdated }: TaskListProps) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [issueDrafts, setIssueDrafts] = useState<
    Record<string, { title: string; description: string }>
  >({});
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<
    Record<string, { title: string; description: string; userIds: string[]; checklistText: string }>
  >({});

  const canManageTask = (task: Task) =>
    user.role === "SUPERADMIN" ||
    user.role === "ADMIN" ||
    user.role === "MANAGER" ||
    task.assignments.some((assignment) => assignment.userId === user.id);

  const canReportIssue = (task: Task) =>
    user.role === "SUPERADMIN" ||
    user.role === "ADMIN" ||
    user.role === "MANAGER" ||
    task.assignments.some((assignment) => assignment.userId === user.id);

  const canRespondToIssues =
    user.role === "SUPERADMIN" || user.role === "ADMIN" || user.role === "MANAGER";
  const canEditTask = canRespondToIssues;

  const openEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForms((current) => ({
      ...current,
      [task.id]: {
        title: task.title,
        description: task.description ?? "",
        userIds: task.assignments.map((assignment) => assignment.userId),
        checklistText: task.checklistItems.map((item) => item.title).join("\n"),
      },
    }));
  };

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

  const handleChecklistToggle = async (itemId: string, taskId: string) => {
    try {
      setSavingId(taskId);
      await apiPut(`/tasks/checklist/${itemId}`);
      await onUpdated?.();
    } finally {
      setSavingId(null);
    }
  };

  const handleIssueSubmit = async (taskId: string) => {
    const draft = issueDrafts[taskId];

    if (!draft?.title || !draft?.description) {
      return;
    }

    try {
      setSavingId(taskId);
      await apiPost(`/tasks/${taskId}/issues`, draft);
      setIssueDrafts((current) => ({
        ...current,
        [taskId]: { title: "", description: "" },
      }));
      await onUpdated?.();
    } finally {
      setSavingId(null);
    }
  };

  const handleIssueResponse = async (issueId: string, taskId: string) => {
    const managerResponse = responseDrafts[issueId];

    if (!managerResponse) {
      return;
    }

    try {
      setSavingId(taskId);
      await apiPut(`/tasks/issues/${issueId}/respond`, { managerResponse });
      setResponseDrafts((current) => ({
        ...current,
        [issueId]: "",
      }));
      await onUpdated?.();
    } finally {
      setSavingId(null);
    }
  };

  const handleEditAssigneeToggle = (taskId: string, userId: string) => {
    setEditForms((current) => {
      const form = current[taskId];
      if (!form) {
        return current;
      }

      return {
        ...current,
        [taskId]: {
          ...form,
          userIds: form.userIds.includes(userId)
            ? form.userIds.filter((id) => id !== userId)
            : [...form.userIds, userId],
        },
      };
    });
  };

  const saveTaskEdits = async (taskId: string) => {
    const form = editForms[taskId];
    if (!form) {
      return;
    }

    try {
      setSavingId(taskId);
      await apiPut(`/tasks/${taskId}`, {
        title: form.title,
        description: form.description,
        userIds: form.userIds,
        checklistItems: form.checklistText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setEditingTaskId(null);
      await onUpdated?.();
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const shouldDelete = window.confirm("Delete this task permanently?");
    if (!shouldDelete) {
      return;
    }

    try {
      setSavingId(taskId);
      await apiDelete(`/tasks/${taskId}`);
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
      }
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
          className="rounded-[20px] border p-5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Task
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--text-main)]">{task.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {canEditTask ? (
                <>
                  <button
                    type="button"
                    onClick={() => openEditTask(task)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ borderColor: "var(--border)", color: "var(--text-soft)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteTask(task.id)}
                    disabled={savingId === task.id}
                    className="rounded-full border px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-60"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Delete
                  </button>
                </>
              ) : null}
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}>
                {task.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {editingTaskId === task.id ? (
            <div
              className="mt-4 grid gap-3 rounded-2xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
            >
              <input
                className="h-11 rounded-2xl border px-3 text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-main)" }}
                value={editForms[task.id]?.title ?? ""}
                onChange={(event) =>
                  setEditForms((current) => ({
                    ...current,
                    [task.id]: {
                      ...(current[task.id] ?? { title: "", description: "", userIds: [], checklistText: "" }),
                      title: event.target.value,
                    },
                  }))
                }
              />
              <textarea
                className="min-h-24 rounded-2xl border px-3 py-3 text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-main)" }}
                value={editForms[task.id]?.description ?? ""}
                onChange={(event) =>
                  setEditForms((current) => ({
                    ...current,
                    [task.id]: {
                      ...(current[task.id] ?? { title: "", description: "", userIds: [], checklistText: "" }),
                      description: event.target.value,
                    },
                  }))
                }
              />
              <textarea
                className="min-h-24 rounded-2xl border px-3 py-3 text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-main)" }}
                value={editForms[task.id]?.checklistText ?? ""}
                placeholder="Checklist items, one per line"
                onChange={(event) =>
                  setEditForms((current) => ({
                    ...current,
                    [task.id]: {
                      ...(current[task.id] ?? { title: "", description: "", userIds: [], checklistText: "" }),
                      checklistText: event.target.value,
                    },
                  }))
                }
              />
              {team.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {team
                    .filter((member) => ["EMPLOYEE", "INTERN"].includes(member.role))
                    .map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-main)" }}
                      >
                        <input
                          type="checkbox"
                          checked={editForms[task.id]?.userIds.includes(member.id) ?? false}
                          onChange={() => handleEditAssigneeToggle(task.id, member.id)}
                        />
                        <span>{member.name}</span>
                      </label>
                    ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingId === task.id}
                  onClick={() => void saveTaskEdits(task.id)}
                  className="rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--accent-strong)" }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTaskId(null)}
                  className="rounded-2xl border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: "var(--border)", color: "var(--text-soft)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
            {task.description || "No description provided."}
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Progress
              </p>
              <span className="text-sm font-semibold text-[var(--text-main)]">{task.progress}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-soft)" }}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-950 via-blue-600 to-emerald-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>

          {task.checklistItems.length ? (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Checklist
              </p>
              <div className="mt-3 space-y-2">
                {task.checklistItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-soft)",
                      color: "var(--text-main)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      disabled={savingId === task.id}
                      onChange={() => void handleChecklistToggle(item.id, task.id)}
                    />
                    <span className={item.completed ? "line-through opacity-60" : ""}>{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-faint)]">
              Assigned to
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {task.assignments.map((assignment) => (
                <span
                  key={assignment.id}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-soft)",
                    color: "var(--text-soft)",
                  }}
                >
                  {assignment.user.name} - {assignment.user.role}
                </span>
              ))}
            </div>
          </div>

          {canManageTask(task) && !task.checklistItems.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
              <label className="text-sm font-medium text-[var(--text-soft)]">Update status</label>
              <select
                defaultValue={task.status}
                disabled={savingId === task.id}
                onChange={(event) =>
                  void handleTaskUpdate(task.id, {
                    status: event.target.value as Task["status"],
                  })
                }
                className="rounded-2xl border px-3 py-2 text-sm outline-none ring-0"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-soft)",
                  color: "var(--text-main)",
                }}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>

              <label className="text-sm font-medium text-[var(--text-soft)]">Update progress</label>
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
                <span className="w-12 text-right text-sm font-semibold text-[var(--text-main)]">
                  {task.progress}%
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Blockers / issues
              </p>
              <span className="text-xs font-semibold text-[var(--text-soft)]">{task.issues.length} reports</span>
            </div>

            <div className="mt-4 space-y-3">
              {task.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text-main)]">{issue.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">{issue.description}</p>
                      <p className="mt-2 text-xs text-[var(--text-soft)]">
                        Reported by {issue.reporter.name} - {issue.status}
                      </p>
                    </div>
                  </div>

                  {issue.managerResponse ? (
                    <div className="mt-3 rounded-xl p-3 text-sm" style={{ background: "var(--surface)" }}>
                      <p className="font-semibold text-[var(--text-main)]">Manager response</p>
                      <p className="mt-1 text-[var(--text-soft)]">{issue.managerResponse}</p>
                    </div>
                  ) : canRespondToIssues ? (
                    <div className="mt-3 space-y-3">
                      <textarea
                        className="min-h-24 w-full rounded-2xl border px-3 py-3 text-sm outline-none"
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--surface)",
                          color: "var(--text-main)",
                        }}
                        placeholder="Add guidance, help, or an alternative solution"
                        value={responseDrafts[issue.id] ?? ""}
                        onChange={(event) =>
                          setResponseDrafts((current) => ({
                            ...current,
                            [issue.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        disabled={savingId === task.id}
                        onClick={() => void handleIssueResponse(issue.id, task.id)}
                        className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70"
                        style={{ background: "var(--accent-strong)" }}
                      >
                        Send response
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {canReportIssue(task) ? (
              <div
                className="mt-4 grid gap-3 rounded-2xl border border-dashed p-4"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <input
                  className="h-11 rounded-2xl border px-3 text-sm outline-none"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-soft)",
                    color: "var(--text-main)",
                  }}
                  placeholder="Issue title"
                  value={issueDrafts[task.id]?.title ?? ""}
                  onChange={(event) =>
                    setIssueDrafts((current) => ({
                      ...current,
                      [task.id]: {
                        title: event.target.value,
                        description: current[task.id]?.description ?? "",
                      },
                    }))
                  }
                />
                <textarea
                  className="min-h-24 rounded-2xl border px-3 py-3 text-sm outline-none"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-soft)",
                    color: "var(--text-main)",
                  }}
                  placeholder="Describe the blocker so your manager can help"
                  value={issueDrafts[task.id]?.description ?? ""}
                  onChange={(event) =>
                    setIssueDrafts((current) => ({
                      ...current,
                      [task.id]: {
                        title: current[task.id]?.title ?? "",
                        description: event.target.value,
                      },
                    }))
                  }
                />
                <button
                  type="button"
                  disabled={savingId === task.id}
                  onClick={() => void handleIssueSubmit(task.id)}
                  className="rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70"
                  style={{ background: "var(--danger)" }}
                >
                  Report issue
                </button>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
