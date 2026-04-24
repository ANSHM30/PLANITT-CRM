type StatePanelProps = {
  title: string;
  description?: string;
};

export function StatePanel({ title, description }: StatePanelProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[28px] border border-slate-200/70 bg-white/80 p-8 text-center shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
