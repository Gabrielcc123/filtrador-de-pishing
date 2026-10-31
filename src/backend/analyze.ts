import { heuristicToVerdict, runHeuristics } from "./heuristics";
import { hasGroqKey, runLlmAnalysis } from "./llm-analyzer";
import { fuseVerdicts } from "./fuse";
import type { AnalyzeResponseBody, EmailMessage, ThreatVerdict } from "@/shared/types";

export async function analyzeEmail(email: EmailMessage): Promise<{
  verdict: ThreatVerdict;
  modeBanner: AnalyzeResponseBody["modeBanner"];
}> {
  const heuristic = runHeuristics(email);

  if (!hasGroqKey()) {
    return {
      verdict: heuristicToVerdict(email, heuristic),
      modeBanner: "heuristic_fallback",
    };
  }

  try {
    const llm = await runLlmAnalysis(email);
    if (!llm) {
      return {
        verdict: heuristicToVerdict(email, heuristic),
        modeBanner: "heuristic_fallback",
      };
    }

    return {
      verdict: fuseVerdicts(email, heuristic, llm),
      modeBanner: "llm_ok",
    };
  } catch (err) {
    console.error("Groq/fuse falló; se usa heurística", err);
    return {
      verdict: heuristicToVerdict(email, heuristic),
      modeBanner: "heuristic_fallback",
    };
  }
}
