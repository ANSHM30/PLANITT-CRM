type StatePanelProps = {
  title: string;
  description?: string;
};

export function StatePanel({ title, description }: StatePanelProps) {
  return (
    <div
      className="flex min-h-[32vh] items-center justify-center rounded-xl border p-6 text-center"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-[var(--text-main)]">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
