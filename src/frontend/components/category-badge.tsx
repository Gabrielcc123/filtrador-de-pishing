import type { ThreatCategory } from "@/shared/types";
import { cn } from "@/shared/utils";

const LABELS: Record<ThreatCategory, string> = {
  phishing: "Phishing",
  bec: "BEC / Fraude",
  malware: "Malware",
  prompt_injection: "Prompt injection",
  spear_llm: "Spear LLM",
  safe: "Seguro",
  unknown: "Desconocido",
};

export function CategoryBadge({ category }: { category: ThreatCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tracking-wide",
        category === "safe" && "bg-teal-100 text-teal-900",
        category === "prompt_injection" && "bg-slate-900 text-teal-100",
        category === "phishing" && "bg-rose-100 text-rose-900",
        category === "bec" && "bg-orange-100 text-orange-950",
        category === "malware" && "bg-red-100 text-red-950",
        category === "spear_llm" && "bg-sky-100 text-sky-950",
        category === "unknown" && "bg-slate-100 text-slate-700"
      )}
    >
      {LABELS[category]}
    </span>
  );
}
