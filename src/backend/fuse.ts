import type { HeuristicResult } from "./heuristics";
import type { LlmPartial } from "./llm-analyzer";
import type { EmailMessage, ThreatCategory, ThreatVerdict } from "@/shared/types";
import { clamp } from "@/shared/utils";

const CRITICAL_HUMAN: ThreatCategory[] = ["phishing", "bec", "malware"];

/**
 * Fusiona heurística + LLM.
 * Regla de oro: un hit crítico heurístico NUNCA se baja solo porque el LLM diga "safe".
 */
export function fuseVerdicts(
  email: EmailMessage,
  heuristic: HeuristicResult,
  llm: LlmPartial | null
): ThreatVerdict {
  if (!llm) {
    return {
      emailId: email.id,
      riskHuman: heuristic.riskHuman,
      riskAgent: heuristic.riskAgent,
      category: heuristic.category,
      reasons: heuristic.reasons,
      iocs: heuristic.iocs,
      recommendation: heuristic.recommendation,
      modelConfidence: 0.55,
      agentSimulation: heuristic.agentSimulation,
      safetyControls: { humanRequired: true, explainable: true },
      analysisMode: "heuristic",
      analyzedAt: new Date().toISOString(),
    };
  }

  const heuristicCritical =
    CRITICAL_HUMAN.includes(heuristic.category) && heuristic.riskHuman >= 50;
  const injectionHit =
    heuristic.category === "prompt_injection" || heuristic.riskAgent >= 55;

  let riskHuman = clamp(Math.max(heuristic.riskHuman, llm.riskHuman * 0.85 + heuristic.riskHuman * 0.15));
  let riskAgent = clamp(Math.max(heuristic.riskAgent, llm.riskAgent * 0.85 + heuristic.riskAgent * 0.15));

  // Prefer weighted average when both agree directionally
  if (!heuristicCritical && Math.abs(heuristic.riskHuman - llm.riskHuman) < 35) {
    riskHuman = clamp(heuristic.riskHuman * 0.45 + llm.riskHuman * 0.55);
  }
  if (!injectionHit && Math.abs(heuristic.riskAgent - llm.riskAgent) < 35) {
    riskAgent = clamp(heuristic.riskAgent * 0.4 + llm.riskAgent * 0.6);
  }

  if (heuristicCritical) {
    riskHuman = Math.max(riskHuman, heuristic.riskHuman);
  }
  if (injectionHit) {
    riskAgent = Math.max(riskAgent, heuristic.riskAgent);
  }

  let category: ThreatCategory = llm.category;
  if (heuristicCritical && (llm.category === "safe" || llm.category === "unknown")) {
    category = heuristic.category;
  }
  if (injectionHit && llm.category !== "prompt_injection") {
    category = "prompt_injection";
  }

  const reasons = Array.from(
    new Set([
      ...heuristic.reasons.slice(0, 4),
      ...llm.reasons.slice(0, 4),
      ...(heuristicCritical && llm.category === "safe"
        ? ["Heurística crítica prevaleció sobre veredicto LLM 'safe' (safety fusion)"]
        : []),
    ])
  );

  const iocs = Array.from(new Set([...heuristic.iocs, ...llm.iocs])).slice(0, 12);

  const agentSimulation =
    llm.agentSimulation ??
    heuristic.agentSimulation ??
    (riskAgent >= 40
      ? {
          naiveAction:
            "Un copiloto podría interpretar el mensaje como instrucción ejecutable y comprometer datos.",
          dataAtRisk: ["datos corporativos", "credenciales"],
        }
      : undefined);

  const recommendation =
    heuristicCritical || injectionHit
      ? heuristic.recommendation
      : llm.recommendation || heuristic.recommendation;

  return {
    emailId: email.id,
    riskHuman,
    riskAgent,
    category,
    reasons,
    iocs,
    recommendation,
    modelConfidence: Math.max(0, Math.min(1, llm.modelConfidence)),
    agentSimulation,
    safetyControls: { humanRequired: true, explainable: true },
    analysisMode: "fused",
    analyzedAt: new Date().toISOString(),
  };
}
