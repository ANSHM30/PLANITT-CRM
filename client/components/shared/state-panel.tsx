import type { ReactNode } from "react";

type StatePanelProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function StatePanel({ title, description, actions }: StatePanelProps) {
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
        {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
