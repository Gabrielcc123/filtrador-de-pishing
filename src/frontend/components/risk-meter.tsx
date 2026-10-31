import { cn } from "@/shared/utils";

export function RiskMeter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "human" | "agent";
}) {
  const level = value >= 70 ? "high" : value >= 40 ? "mid" : "low";
  const bar =
    level === "high" ? "bg-rose-600" : level === "mid" ? "bg-amber-500" : "bg-teal-600";
  const text =
    level === "high" ? "text-rose-700" : level === "mid" ? "text-amber-700" : "text-teal-800";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className={cn("font-display text-2xl tabular-nums", text)}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={cn("h-full origin-left rounded-full animate-meter-fill", bar)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          data-tone={tone}
        />
      </div>
    </div>
  );
}
