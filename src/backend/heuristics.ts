import type { EmailMessage, ThreatCategory, ThreatVerdict } from "@/shared/types";
import { clamp, extractUrls, parseDisplayName, parseEmailDomain } from "@/shared/utils";

/**
 * Urgencia con frases, no con la palabra suelta "transferencia".
 * "urgente" negado ("no es urgente") se filtra en urgencyHit().
 */
const URGENCY =
  /\b(inmediat[oa]|ahora mismo|dentro de \d+ horas?|act(ua|úe) ya|cuenta ser[aá] suspendida|verify (now|immediately)|password (expir|reset)|wire transfer|pago urgente|transferencia urgente)\b/i;

const CRED_HARVEST =
  /\b(restablecer (?:su |tu |la |el )?(contraseñ|password)|reestablecer (?:su |tu |la )?(contraseñ|password)|verificar (?:su |tu )?(cuenta|identidad)|credenciales|actualizar (?:los |sus )?(datos|pago)|confirmar (?:su |tu )?(cuenta|identidad)|password reset|reset your password)\b/i;

/** BEC exige ingeniería social. "transferencia" o "factura adjunta" solas son correo de finanzas. */
const BEC =
  /\b(soy (el|la) (ceo|cfo|director(?: financiero)?|gerente)|como (?:el |la )?(ceo|director)|cambio de cuenta bancaria|proveedor nuevo|pago confidencial|hazlo discreto|no le digas a)\b/i;

/**
 * Jailbreak explícito. "act as" y "you are now" sueltos son falsos positivos
 * ("act as the point of contact", "you are now invited").
 */
const PROMPT_INJECTION =
  /\b(ignore (all |any )?(previous|prior|above) (instructions|rules|prompts)|ignora (las )?(instrucciones|reglas) (anteriores|previas)|system prompt|developer message|you are now (in |a |an )?(maintenance|admin|unrestricted|debug|developer|jailbreak)|act as (an? )?(unrestricted |admin |root |system |developer |dan )|exfiltrat|export(a|ar)? (all|todos?|la lista)|dump (secrets|api keys|credentials)|bypass (safety|guardrail)|reveal (your|the) (system|hidden) prompt|jailbreak)\b/i;

const AI_TARGET =
  /\b(asistente|copilot[oa]?|chatgpt|llm|ai (assistant|agent)|agente (de )?ia|summariz(e|a)|resume (este|el) (correo|email)|automatiza)\b/i;

const LOGIN_ASK =
  /\b(login|log in|sign in|inici(?:ar|a|e) sesi[oó]n)\b/i;

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly"];
const RISKY_TLD = [".zip", ".mov", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".xyz", ".click", ".country"];
const DANGEROUS_EXT = /\.(exe|scr|js|vbs|bat|cmd|ps1|hta|iso|img)(\b|$)/i;
const HTML_FILE = /\.html?(\b|$)/i;
const HIDDEN_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;

const BRAND_DOMAINS: { token: string; aliases: string[]; official: string[] }[] = [
  {
    token: "microsoft",
    aliases: ["microsoftonline", "office365"],
    official: ["microsoft.com", "microsoftonline.com", "office.com", "office365.com", "outlook.com", "live.com"],
  },
  {
    token: "google",
    aliases: [],
    official: ["google.com", "gmail.com", "googlemail.com"],
  },
  { token: "paypal", aliases: [], official: ["paypal.com"] },
  { token: "amazon", aliases: [], official: ["amazon.com", "amazon.es", "amazonses.com"] },
  { token: "apple", aliases: [], official: ["apple.com", "icloud.com"] },
];

export interface HeuristicResult {
  riskHuman: number;
  riskAgent: number;
  category: ThreatCategory;
  reasons: string[];
  iocs: string[];
  recommendation: string;
  agentSimulation?: ThreatVerdict["agentSimulation"];
}

interface Signal {
  weight: number;
  reason: string;
  ioc?: string;
}

function foldHidden(text: string): string {
  return text.normalize("NFKC").replace(HIDDEN_CHARS, "");
}

function isOfficialDomain(domain: string, official: readonly string[]): boolean {
  return official.some((o) => domain === o || domain.endsWith(`.${o}`));
}

function isAnyOfficial(domain: string): boolean {
  return BRAND_DOMAINS.some((b) => isOfficialDomain(domain, b.official));
}

/** Etiqueta del dominio, no subcadena: "snapple" no es Apple; "login-microsoft" sí es Microsoft. */
function domainMentionsBrand(domain: string, token: string, aliases: readonly string[]): boolean {
  const keys = [token, ...aliases];
  return domain.split(".").some((label) =>
    keys.some(
      (key) =>
        label === key ||
        label.startsWith(`${key}-`) ||
        label.endsWith(`-${key}`) ||
        label.includes(`-${key}-`)
    )
  );
}

function typoPattern(token: string): RegExp {
  if (token === "microsoft") return /^(?:micr[o0]s[o0]ft|rnicrosoft|microsft)$/i;
  if (token === "google") return /^(?:g[o0]{2}gle|goog1e)$/i;
  if (token === "paypal") return /^paypa[l1]$/i;
  if (token === "apple") return /^app1e$/i;
  return /^amaz[o0]n$/i;
}

/** El parecido tiene que ser la etiqueta (o un trozo entre guiones), no una subcadena cualquiera. */
function hasBrandTypo(domain: string, token: string): boolean {
  const re = typoPattern(token);
  return domain.split(".").some((label) => label.split("-").some((part) => re.test(part)));
}

function lookalikeBrand(domain: string): string | null {
  if (isAnyOfficial(domain)) return null;
  for (const brand of BRAND_DOMAINS) {
    if (domainMentionsBrand(domain, brand.token, brand.aliases) || hasBrandTypo(domain, brand.token)) {
      return brand.token;
    }
  }
  return null;
}

function isConsumerMail(domain: string): boolean {
  return (
    domain === "gmail.com" ||
    domain.endsWith(".gmail.com") ||
    domain === "googlemail.com" ||
    domain === "yahoo.com" ||
    domain.endsWith(".yahoo.com") ||
    domain === "yahoo.es" ||
    domain === "hotmail.com" ||
    domain === "proton.me" ||
    domain === "protonmail.com"
  );
}

function urgencyHit(text: string): boolean {
  if (URGENCY.test(text)) return true;
  if (!/\burgente\b/i.test(text)) return false;
  const negated = /\b(?:no(?:\s+\w+){0,3}\s+urgente|sin\s+urgente|nada\s+urgente)\b/i.test(text);
  return !negated;
}

function senderSignals(from: string, body: string): Signal[] {
  const domain = parseEmailDomain(from);
  if (!domain) return [];
  const name = (parseDisplayName(from) ?? "").toLowerCase();
  const signals: Signal[] = [];
  const angle = from.match(/<([^>]+)>/);
  const addr = (angle?.[1] ?? from).trim().toLowerCase();
  const at = addr.lastIndexOf("@");
  const local = at > 0 ? addr.slice(0, at) : "";

  const brand = lookalikeBrand(domain);
  if (brand) {
    signals.push({
      weight: 34,
      reason: `Dominio lookalike de ${brand}: ${domain}`,
      ioc: domain,
    });
  }

  if (RISKY_TLD.some((t) => domain.endsWith(t))) {
    signals.push({
      weight: 14,
      reason: `Dominio del remitente con TLD de riesgo: ${domain}`,
      ioc: domain,
    });
  }

  if (domain.startsWith("xn--") || /[^\u0000-\u007F]/.test(domain)) {
    signals.push({
      weight: 16,
      reason: `Dominio punycode o no ASCII (posible homógrafo): ${domain}`,
      ioc: domain,
    });
  }

  for (const brand of BRAND_DOMAINS) {
    if (!name.includes(brand.token)) continue;
    if (isOfficialDomain(domain, brand.official)) continue;
    signals.push({
      weight: 32,
      reason: `El nombre muestra ${brand.token} pero el dominio ${domain} no es oficial`,
      ioc: domain,
    });
    break;
  }

  if (
    (name.includes("it support") || name.includes("helpdesk") || name.includes("service desk")) &&
    isConsumerMail(domain)
  ) {
    signals.push({
      weight: 32,
      reason: `Soporte IT escribe desde correo de consumidor (${domain})`,
      ioc: domain,
    });
  }

  if (/\b(ceo|cfo)\b/i.test(name) && isConsumerMail(domain)) {
    signals.push({
      weight: 32,
      reason: `Cargo ejecutivo en el nombre y correo de consumidor (${domain})`,
      ioc: domain,
    });
  } else if (isConsumerMail(domain) && /(^|[._-])(ceo|cfo)([._-]|$)/i.test(local)) {
    signals.push({
      weight: 20,
      reason: `La cuenta de consumidor incluye un cargo ejecutivo (${local}@${domain})`,
      ioc: domain,
    });
  }

  const claimed =
    body.match(/\b(?:desde|from|on behalf of)\s+([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase() ??
    null;
  if (claimed && claimed !== domain && !domain.endsWith(claimed) && !claimed.endsWith(domain)) {
    signals.push({
      weight: 20,
      reason: `Dominio del From (${domain}) no coincide con el dominio declarado (${claimed})`,
      ioc: domain,
    });
  }

  return signals;
}

export function runHeuristics(email: EmailMessage): HeuristicResult {
  const raw = `${email.subject}\n${email.from}\n${email.body}\n${email.snippet}`;
  const text = foldHidden(raw);
  const urls = extractUrls(text);
  const reasons: string[] = [];
  const iocs: string[] = [...urls];
  let riskHuman = 8;
  let riskAgent = 5;
  let category: ThreatCategory = "safe";

  if (HIDDEN_CHARS.test(raw)) {
    riskHuman += 12;
    reasons.push("Caracteres invisibles o de control de dirección (ofuscación)");
  }

  if (urgencyHit(text)) {
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

  for (const signal of senderSignals(email.from, text)) {
    riskHuman += signal.weight;
    reasons.push(signal.reason);
    if (signal.ioc) iocs.push(signal.ioc);
    if (category === "safe") category = "phishing";
  }

  let suspiciousLink = false;
  for (const url of urls) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
        riskHuman += 15;
        suspiciousLink = true;
        reasons.push(`Acortador de URL sospechoso: ${host}`);
      }
      if (RISKY_TLD.some((t) => host.endsWith(t))) {
        riskHuman += 12;
        suspiciousLink = true;
        reasons.push(`TLD de riesgo en enlace: ${host}`);
      }
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        riskHuman += 22;
        suspiciousLink = true;
        reasons.push(`Enlace apunta a IP literal: ${host}`);
      }
      if (host.startsWith("xn--") || /[^\u0000-\u007F]/.test(host)) {
        riskHuman += 16;
        suspiciousLink = true;
        reasons.push(`Enlace con punycode o caracteres no ASCII: ${host}`);
      }
      const linkedBrand = lookalikeBrand(host);
      if (linkedBrand) {
        riskHuman += 20;
        suspiciousLink = true;
        reasons.push(`Enlace lookalike de ${linkedBrand}: ${host}`);
      }
      iocs.push(host);
    } catch {
      /* ignore bad url */
    }
  }

  if (LOGIN_ASK.test(text) && suspiciousLink && !CRED_HARVEST.test(text)) {
    riskHuman += 16;
    if (category === "safe") category = "phishing";
    reasons.push("Pide iniciar sesión mediante un enlace sospechoso");
  } else if (LOGIN_ASK.test(text) && suspiciousLink) {
    reasons.push("El pedido de login va junto a un enlace sospechoso");
  }

  const textWithoutUrls = text.replace(/https?:\/\/\S+/gi, " ");
  const attachText = text.replace(/\bnode\.js\b/gi, "nodejs");
  if (DANGEROUS_EXT.test(attachText) || HTML_FILE.test(textWithoutUrls)) {
    riskHuman += 36;
    if (category !== "prompt_injection") category = "malware";
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

  const polished =
    email.body.length > 400 &&
    !/\b(hola+!!|AAAA|asdf|qwerty)\b/i.test(email.body) &&
    (urgencyHit(text) || CRED_HARVEST.test(text));
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
