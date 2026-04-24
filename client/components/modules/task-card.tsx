export type TaskCardProps = {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
  };
};

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="task-card">
      <h2 className="task-card-title">{task.title}</h2>
      <p className="task-card-description">{task.description || "No description provided."}</p>
      <div className="task-card-status">Status: {task.status}</div>
    </div>
  );
}
