/** Contrato compartido ShieldMail — P1/P2/P3/P4 */

export type ThreatCategory =
  | "phishing"
  | "bec"
  | "malware"
  | "prompt_injection"
  | "spear_llm"
  | "safe"
  | "unknown";

export type AnalystAction = "quarantine" | "safe" | "escalate" | "none";

export interface EmailMessage {
  id: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  labels?: string[];
  /** Origen: gmail sync o fixture demo */
  source: "gmail" | "fixture";
}

export interface AgentSimulation {
  /** Qué haría un copiloto ingenuo si procesara este mail */
  naiveAction: string;
  /** Datos que podrían exfiltrarse o comprometerse */
  dataAtRisk: string[];
}

export interface ThreatVerdict {
  emailId: string;
  /** Riesgo para el empleado humano (0–100) */
  riskHuman: number;
  /** Riesgo para un agente/copiloto que lea el correo (0–100) */
  riskAgent: number;
  category: ThreatCategory;
  reasons: string[];
  iocs: string[];
  recommendation: string;
  modelConfidence: number;
  agentSimulation?: AgentSimulation;
  safetyControls: {
    humanRequired: true;
    explainable: true;
  };
  /** Cómo se produjo el veredicto */
  analysisMode: "heuristic" | "llm" | "fused";
  analyzedAt: string;
}

export interface AnalyzedEmail {
  email: EmailMessage;
  verdict: ThreatVerdict;
  action: AnalystAction;
}

export interface AnalyzeRequestBody {
  email: EmailMessage;
}

export interface AnalyzeResponseBody {
  verdict: ThreatVerdict;
  modeBanner?: "heuristic_fallback" | "llm_ok";
}
