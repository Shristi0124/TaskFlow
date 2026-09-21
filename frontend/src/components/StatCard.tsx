export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "warning" | "danger";
}) {
  const toneClass: Record<string, string> = {
    default: "text-[var(--color-ink)]",
    accent: "text-[var(--color-accent)]",
    warning: "text-[var(--color-status-progress)]",
    danger: "text-[var(--color-priority-high)]",
  };
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white px-5 py-4">
      <p className="text-sm text-[var(--color-ink-soft)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass[tone]}`}>{value}</p>
    </div>
  );
}
