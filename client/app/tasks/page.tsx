"use client";

import { useEffect, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { TaskList } from "@/components/modules/task-list";
import { StatePanel } from "@/components/shared/state-panel";
import { useSession } from "@/hooks/use-session";
import { apiGet, apiPost } from "@/lib/api";
import { isAdminRole } from "@/lib/dashboard";
import type { CRMUser, Task } from "@/types/crm";

export default function TasksPage() {
  const { user, loading: sessionLoading } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    userIds: [] as string[],
    progress: 0,
  });

  const loadTasks = async () => {
    const data = await apiGet<Task[]>("/tasks");
    setTasks(data);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setError("");
        await loadTasks();

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
      await apiPost("/tasks", form);
      setForm({ title: "", description: "", userIds: [], progress: 0 });
      setNotice("Task created successfully.");
      await loadTasks();
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
      <div className="space-y-6">
        <section className="rounded-[34px] border border-white/70 bg-white/85 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.10)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Task workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Tasks</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
            {isAdminRole(user.role)
              ? "Create and assign work to keep the team moving clearly."
              : "Stay focused on your assigned tasks and update progress as work moves ahead."}
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          {isAdminRole(user.role) ? (
            <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Create task</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Assign work clearly</h2>

              <div className="mt-6 grid gap-4">
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-slate-950"
                  placeholder="Task title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
                <textarea
                  className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-950"
                  placeholder="Task description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />

                <div>
                  <p className="text-sm font-medium text-slate-700">Assign to team members</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {team.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
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
                    <p className="text-sm font-medium text-slate-700">Initial progress</p>
                    <span className="text-sm font-semibold text-slate-900">{form.progress}%</span>
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
                  className="h-12 rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
                >
                  {creating ? "Creating..." : "Create task"}
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Personal workflow</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Keep your queue updated</h2>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Use this page to review assignments and move work from Todo to In Progress and Done.
              </p>
            </section>
          )}

          <section className="rounded-[30px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Open list</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Current tasks</h2>
              </div>
              <span className="text-sm text-slate-500">{tasks.length} items</span>
            </div>

            {loading ? <p className="mt-6 text-sm text-slate-500">Loading tasks...</p> : null}
            {!loading && error ? <p className="mt-6 text-sm font-medium text-rose-600">{error}</p> : null}

            <div className="mt-6">
              {tasks.length ? (
                <TaskList tasks={tasks} user={user} onUpdated={loadTasks} />
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                  No tasks available yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </CRMShell>
  );
}

