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
        <nav className="nav">
          <a href="/">Dashboard</a>
          <a href="/">Leads</a>
          <a href="/">Contacts</a>
          <a href="/">Deals</a>
          <a href="/">Tasks</a>
        </nav>
      </aside>
      <div className="content">{children}</div>
    </main>
  );
}
