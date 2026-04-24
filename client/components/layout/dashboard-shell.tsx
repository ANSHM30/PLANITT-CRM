import Sidebar from "./sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <p className="brand">Planitt</p>
          <p className="brand-subtitle">CRM Workspace</p>
        </div>
        <Sidebar />
      </aside>
      <div className="content">{children}</div>
    </main>
  );
}
