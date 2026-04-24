const metrics = [
  { label: "Open Leads", value: "128" },
  { label: "Active Deals", value: "34" },
  { label: "Tasks Due Today", value: "12" },
  { label: "Monthly Revenue", value: "$48.2k" },
];

export function OverviewCards() {
  return (
    <section className="cards-grid">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <p>{metric.label}</p>
          <h2>{metric.value}</h2>
        </article>
      ))}
    </section>
  );
}
