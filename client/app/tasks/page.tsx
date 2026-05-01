"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { TaskList } from "@/components/modules/task-list";
import { StatePanel } from "@/components/shared/state-panel";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useSession } from "@/hooks/use-session";
import { apiGet, apiPost } from "@/lib/api";
import { isAdminRole } from "@/lib/dashboard";
import { useSearchParams } from "next/navigation";
import type { CRMUser, Task } from "@/types/crm";
type PaginatedResponse<T> = { items: T[]; total: number; hasMore: boolean; nextOffset: number };

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

export default function TasksPage() {
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [nextTaskOffset, setNextTaskOffset] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    userIds: [] as string[],
    progress: 0,
    checklistText: "",
  });

  const fieldStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-soft)",
    color: "var(--text-main)",
  } as const;

  const initialIssueTaskId = searchParams.get("taskId");
  const initialIssueId = searchParams.get("issueId");

  const loadTasks = async (append = false) => {
    const offset = append ? nextTaskOffset : 0;
    const data = await apiGet<PaginatedResponse<Task>>(`/tasks?paginate=true&limit=30&offset=${offset}`);
    setTasks((current) => (append ? [...current, ...data.items] : data.items));
    setHasMoreTasks(data.hasMore);
    setNextTaskOffset(data.nextOffset);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setError("");
        await loadTasks(false);

        if (user && isAdminRole(user.role)) {
          const users = await apiGet<CRMUser[]>("/users");
          setTeam(users);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      void fetchData();
    }
  }, [user]);

  useRealtimeRefresh(user, ["task:updated", "issue:updated", "org:updated"], async () => {
    await loadTasks(false);

    if (user && isAdminRole(user.role)) {
      const users = await apiGet<CRMUser[]>("/users");
      setTeam(users);
    }
  });

  const handleAssigneeToggle = (userId: string) => {
    setForm((current) => ({
      ...current,
      userIds: current.userIds.includes(userId)
        ? current.userIds.filter((id) => id !== userId)
        : [...current.userIds, userId],
    }));
  };

  const createTask = async () => {
    try {
      setCreating(true);
      setError("");
      setNotice("");
      await apiPost("/tasks", {
        title: form.title,
        description: form.description,
        userIds: form.userIds,
        progress: form.progress,
        checklistItems: form.checklistText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setForm({ title: "", description: "", userIds: [], progress: 0, checklistText: "" });
      setNotice("Task created successfully.");
      await loadTasks(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  if (sessionLoading || !user) {
    return <StatePanel title="Loading tasks" description="Preparing the task workspace." />;
  }

  return (
    <CRMShell user={user}>
      <div className="space-y-4">
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
            Task workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-main)]">Tasks</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
            {isAdminRole(user.role)
              ? "Create and assign work in a focused workspace without oversized panels."
              : "Review assignments, update progress, and report blockers from one clean view."}
          </p>
        </Surface>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          {isAdminRole(user.role) ? (
            <Surface>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Create task
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">Assign work clearly</h2>

              <div className="mt-5 grid gap-4">
                <input
                  className="h-12 rounded-2xl border px-4 outline-none"
                  style={fieldStyle}
                  placeholder="Task title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
                <textarea
                  className="min-h-28 rounded-2xl border px-4 py-3 outline-none"
                  style={fieldStyle}
                  placeholder="Task description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
                <textarea
                  className="min-h-32 rounded-2xl border px-4 py-3 outline-none"
                  style={fieldStyle}
                  placeholder={"Checklist items, one per line\nExample:\nCreate first draft\nReview with manager\nSubmit final work"}
                  value={form.checklistText}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, checklistText: event.target.value }))
                  }
                />

                <div>
                  <p className="text-sm font-medium text-[var(--text-main)]">Assign to team members</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {team.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--surface-soft)",
                          color: "var(--text-main)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.userIds.includes(member.id)}
                          onChange={() => handleAssigneeToggle(member.id)}
                        />
                        <span>
                          {member.name} - {member.role}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--text-main)]">Initial progress</p>
                    <span className="text-sm font-semibold text-[var(--text-main)]">{form.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={form.progress}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        progress: Number(event.target.value),
                      }))
                    }
                    className="mt-3 w-full accent-slate-950"
                  />
                </div>

                {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                {notice ? <p className="text-sm font-medium text-emerald-600">{notice}</p> : null}

                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void createTask()}
                  className="h-12 rounded-2xl text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70"
                  style={{ background: "var(--accent-strong)" }}
                >
                  {creating ? "Creating..." : "Create task"}
                </button>
              </div>
            </Surface>
          ) : (
            <Surface>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Personal workflow
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">Keep your queue updated</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                Use this page to review assignments and move work from Todo to In Progress and Done.
              </p>
            </Surface>
          )}

          <Surface>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                  Open list
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-main)]">Current tasks</h2>
              </div>
              <span className="text-sm text-[var(--text-soft)]">{tasks.length} items</span>
            </div>

            {loading ? <p className="mt-6 text-sm text-[var(--text-soft)]">Loading tasks...</p> : null}
            {!loading && error ? <p className="mt-6 text-sm font-medium text-rose-600">{error}</p> : null}

            <div className="mt-6">
              {tasks.length ? (
                <TaskList
                  tasks={tasks}
                  user={user}
                  team={team}
                  onUpdated={loadTasks}
                  initialIssueTaskId={initialIssueTaskId}
                  initialIssueId={initialIssueId}
                />
              ) : (
                <div
                  className="rounded-3xl border border-dashed p-8 text-sm"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-soft)",
                    color: "var(--text-soft)",
                  }}
                >
                  No tasks available yet.
                </div>
              )}
              {hasMoreTasks ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => {
                      setLoadingMore(true);
                      void loadTasks(true).finally(() => setLoadingMore(false));
                    }}
                    className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    style={{ borderColor: "var(--border)", color: "var(--text-main)" }}
                  >
                    {loadingMore ? "Loading..." : "Load more tasks"}
                  </button>
                </div>
              ) : null}
            </div>
          </Surface>
        </div>
      </div>
    </CRMShell>
  );
}
