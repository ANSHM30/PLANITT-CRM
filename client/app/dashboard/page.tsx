import { DashboardShell } from "@/components/layout/dashboard-shell";
import AttendanceButton from "@/components/modules/attendance-button";
import TaskCard from "@/components/modules/task-card";

const sampleTasks = [
  {
    id: "1",
    title: "Follow up with new enterprise lead",
    description: "Call the prospect and confirm requirements for onboarding.",
    status: "TODO",
  },
  {
    id: "2",
    title: "Prepare weekly sales review",
    description: "Compile conversions, pending deals, and blockers.",
    status: "IN_PROGRESS",
  },
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <AttendanceButton />
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <p>Total Employees</p>
            <h2>25</h2>
          </div>

          <div className="stat-box">
            <p>Tasks Pending</p>
            <h2>10</h2>
          </div>

          <div className="stat-box">
            <p>Completed Tasks</p>
            <h2>15</h2>
          </div>
        </div>

        <section className="tasks-section">
          <h2 className="section-title">Recent Tasks</h2>
          <div className="tasks-grid">
            {sampleTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
