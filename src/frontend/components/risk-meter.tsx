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
  const color =
    value >= 70
      ? "bg-rose-600"
      : value >= 40
        ? "bg-amber-500"
        : "bg-teal-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span
          className={cn(
            "font-display text-2xl tabular-nums",
            value >= 70 ? "text-rose-700" : value >= 40 ? "text-amber-700" : "text-teal-800"
          )}
        >
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          data-tone={tone}
        />
      </div>
    </div>
  );
}
