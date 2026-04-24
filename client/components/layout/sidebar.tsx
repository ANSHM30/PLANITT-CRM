const navItems = ["Dashboard", "Employees", "Tasks", "Attendance"];

export default function Sidebar() {
  return (
    <div className="sidebar-panel">
      <h1 className="sidebar-title">CRM</h1>

      <ul className="sidebar-nav">
        {navItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
