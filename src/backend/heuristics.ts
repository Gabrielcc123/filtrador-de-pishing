import type { EmailMessage, ThreatCategory, ThreatVerdict } from "@/shared/types";
import { clamp, extractUrls, parseDisplayName, parseEmailDomain } from "@/shared/utils";

const URGENCY =
  /\b(urgente|inmediat[oa]|ahora mismo|dentro de \d+ horas?|act(ua|úe) ya|cuenta ser[aá] suspendida|verify (now|immediately)|password (expir|reset)|wire transfer|transferencia|pago urgente)\b/i;

const CRED_HARVEST =
  /\b(restablecer (contraseñ|password)|verificar (cuenta|identidad)|iniciar sesi[oó]n|login|credenciales|actualizar (datos|pago)|confirmar (cuenta|identidad))\b/i;

const BEC =
  /\b(soy (el|la) (ceo|cfo|director|gerente)|como (ceo|director)|transfer(ir|encia)|wire|factura adjunta|cambio de cuenta bancaria|proveedor nuevo|pago confidencial|hazlo discreto|no le digas a)\b/i;

const PROMPT_INJECTION =
  /\b(ignore (all |any )?(previous|prior|above) (instructions|rules|prompts)|ignora (las )?(instrucciones|reglas) (anteriores|previas)|system prompt|developer message|you are now|act as|exfiltrat|export(a|ar)? (all|todos?|la lista)|dump (secrets|api keys|credentials)|bypass (safety|guardrail)|reveal (your|the) (system|hidden) prompt)\b/i;

const AI_TARGET =
  /\b(asistente|copilot[oa]?|chatgpt|llm|ai (assistant|agent)|agente (de )?ia|summariz(e|a)|resume (este|el) (correo|email)|automatiza)\b/i;

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly"];
const RISKY_TLD = [".zip", ".mov", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".xyz", ".click", ".country"];
const BAD_ATTACH = /\.(exe|scr|js|vbs|bat|cmd|ps1|hta|html?|iso|img)(\b|$)/i;

export interface HeuristicResult {
  riskHuman: number;
  riskAgent: number;
  category: ThreatCategory;
  reasons: string[];
  iocs: string[];
  recommendation: string;
  agentSimulation?: ThreatVerdict["agentSimulation"];
}

function lookalikeMismatch(from: string, body: string): string | null {
  const domain = parseEmailDomain(from);
  const name = parseDisplayName(from)?.toLowerCase() ?? "";
  if (!domain) return null;

  const claimed =
    body.match(/\b(?:desde|from|on behalf of)\s+([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase() ??
    null;

  const brandHints = ["microsoft", "google", "amazon", "paypal", "banco", "it support", "helpdesk"];
  const claimsBrand = brandHints.some((b) => name.includes(b) || body.toLowerCase().includes(b));
  const freeMail = /^(gmail|yahoo|hotmail|outlook|proton)\./i.test(domain);

  if (claimsBrand && freeMail) {
    return `Remitente usa correo gratuito (${domain}) haciéndose pasar por marca/IT corporativa`;
  }
  if (claimed && domain && !domain.endsWith(claimed) && !claimed.endsWith(domain)) {
    return `Dominio del From (${domain}) no coincide con el dominio declarado (${claimed})`;
  }
  return null;
}

export function runHeuristics(email: EmailMessage): HeuristicResult {
  const text = `${email.subject}\n${email.from}\n${email.body}\n${email.snippet}`;
  const urls = extractUrls(text);
  const reasons: string[] = [];
  const iocs: string[] = [...urls];
  let riskHuman = 8;
  let riskAgent = 5;
  let category: ThreatCategory = "safe";

  if (URGENCY.test(text)) {
    riskHuman += 18;
    reasons.push("Lenguaje de urgencia típico de ingeniería social");
  }
  if (CRED_HARVEST.test(text)) {
    riskHuman += 28;
    category = "phishing";
    reasons.push("Solicita credenciales o verificación de cuenta");
  }
  if (BEC.test(text)) {
    riskHuman += 32;
    category = category === "phishing" ? "phishing" : "bec";
    reasons.push("Patrón de fraude al ejecutivo / pedido de transferencia o secreto");
  }

  const mismatch = lookalikeMismatch(email.from, text);
  if (mismatch) {
    riskHuman += 25;
    if (category === "safe") category = "phishing";
    reasons.push(mismatch);
  }

  for (const url of urls) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
        riskHuman += 15;
        reasons.push(`Acortador de URL sospechoso: ${host}`);
      }
      if (RISKY_TLD.some((t) => host.endsWith(t))) {
        riskHuman += 12;
        reasons.push(`TLD de riesgo en enlace: ${host}`);
      }
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        riskHuman += 22;
        reasons.push(`Enlace apunta a IP literal: ${host}`);
      }
      iocs.push(host);
    } catch {
      /* ignore bad url */
    }
  }

  if (BAD_ATTACH.test(text)) {
    riskHuman += 30;
    category = "malware";
    reasons.push("Mención de adjunto o archivo con extensión de alto riesgo");
  }

  const injection = PROMPT_INJECTION.test(text);
  const targetsAi = AI_TARGET.test(text);
  if (injection) {
    riskAgent += 55;
    riskHuman += 12;
    category = "prompt_injection";
    reasons.push("Texto compatible con prompt injection dirigido a un agente IA");
  }
  if (targetsAi && (injection || CRED_HARVEST.test(text) || BEC.test(text))) {
    riskAgent += 20;
    reasons.push("El correo menciona o parece pensado para un asistente/copiloto");
  }
  if (injection && /export|dump|exfil|secrets|api keys|lista de clientes|nómina|nomina/i.test(text)) {
    riskAgent += 15;
    reasons.push("Pide exfiltración o exportación de datos vía el agente");
  }

  // Spearing LLM-like: long polished body + urgency + personalization crumbs
  const polished =
    email.body.length > 400 &&
    !/\b(hola+!!|AAAA|asdf|qwerty)\b/i.test(email.body) &&
    (URGENCY.test(text) || CRED_HARVEST.test(text));
  if (polished && category !== "prompt_injection") {
    riskHuman += 8;
    if (category === "safe") category = "spear_llm";
    reasons.push("Copy largo y pulido con presión — patrón compatible con spear phishing generado por LLM");
  }

  riskHuman = clamp(riskHuman);
  riskAgent = clamp(riskAgent);

  if (riskHuman < 25 && riskAgent < 25 && category !== "prompt_injection") {
    category = "safe";
    if (reasons.length === 0) reasons.push("Sin señales fuertes de phishing, BEC o inyección");
  }

  const recommendation =
    riskHuman >= 60 || riskAgent >= 60
      ? "Cuarentena recomendada. Requiere revisión humana antes de liberar."
      : riskHuman >= 35 || riskAgent >= 35
        ? "Escalar a analista. No interactuar con enlaces ni pedir al copiloto que ejecute acciones."
        : "Monitorear. Puede marcarse seguro si el remitente es esperado.";

  const agentSimulation =
    riskAgent >= 35 || category === "prompt_injection"
      ? {
          naiveAction: injection
            ? "Un copiloto ingenuo seguiría las instrucciones ocultas: exportar datos o ignorar políticas de seguridad."
            : "Un asistente podría resumir el mail como legítimo y sugerir hacer clic o transferir fondos.",
          dataAtRisk: injection
            ? ["credenciales", "listas internas", "secretos/API keys", "correo corporativo"]
            : ["credenciales de empleado", "acceso a cuentas", "fondos / datos de pago"],
        }
      : undefined;

  return {
    riskHuman,
    riskAgent,
    category,
    reasons: Array.from(new Set(reasons)),
    iocs: Array.from(new Set(iocs)).slice(0, 12),
    recommendation,
    agentSimulation,
  };
}

export function heuristicToVerdict(email: EmailMessage, h: HeuristicResult): ThreatVerdict {
  return {
    emailId: email.id,
    riskHuman: h.riskHuman,
    riskAgent: h.riskAgent,
    category: h.category,
    reasons: h.reasons,
    iocs: h.iocs,
    recommendation: h.recommendation,
    modelConfidence: 0.55,
    agentSimulation: h.agentSimulation,
    safetyControls: { humanRequired: true, explainable: true },
    analysisMode: "heuristic",
    analyzedAt: new Date().toISOString(),
  };
}
