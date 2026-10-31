import type { ThreatCategory } from "@/shared/types";

export interface DetectionEntry {
  category: Exclude<ThreatCategory, "safe" | "unknown">;
  title: string;
  /** Una línea para jueces: qué señal cuenta y qué no. */
  forJudges: string;
}

/** Lista estable de lo que el motor afirma detectar. P4 puede citarla en el pitch. */
export const DETECTION_CATALOG: DetectionEntry[] = [
  {
    category: "phishing",
    title: "Phishing / robo de credenciales",
    forJudges:
      "Urgencia real, restablecer contraseña, acortadores, IP literal, TLD de riesgo y lookalike (marca en el nombre o en una etiqueta del dominio, sin ser el dominio oficial). Mencionar Microsoft en el cuerpo, o la palabra login sola, no alcanza.",
  },
  {
    category: "bec",
    title: "BEC / fraude al ejecutivo",
    forJudges:
      "Suplantación en primera persona (soy el CEO/CFO), cambio de cuenta, pago confidencial o pedido de secreto. Una transferencia de nómina o una factura adjunta no bastan.",
  },
  {
    category: "malware",
    title: "Malware / adjuntos peligrosos",
    forJudges: "Extensiones de alto riesgo en el cuerpo (.exe, .html, .iso, .js, .ps1, .bat, etc.).",
  },
  {
    category: "prompt_injection",
    title: "Prompt injection contra copilotos",
    forJudges:
      "Ignorar reglas, exfiltrar secretos, bypass de guardrails o cambiar el rol del agente. «Act as point of contact» o «you are now invited» no cuentan. riskAgent no se baja si el LLM dice safe.",
  },
  {
    category: "spear_llm",
    title: "Spear phishing con estilo LLM",
    forJudges:
      "Cuerpo largo y pulido junto con presión o pedido de credenciales, cuando no hay una categoría más fuerte.",
  },
];
