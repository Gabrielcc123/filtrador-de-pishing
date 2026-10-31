/**
 * Smoke test del motor P2 (heurísticas) sin Next.
 * Uso: node scripts/test-heuristics.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(join(__dirname, "../demo/fixtures/emails.json"), "utf8")
);

const URGENCY =
  /\b(urgente|inmediat[oa]|ahora mismo|cuenta ser[aá] suspendida|wire transfer|transferencia|pago urgente)\b/i;
const CRED =
  /\b(restablecer (contraseñ|password)|verificar (cuenta|identidad)|credenciales)\b/i;
const BEC =
  /\b(soy (el|la) (ceo|cfo|director)|transfer(ir|encia)|pago confidencial|no le digas a)\b/i;
const INJECT =
  /\b(ignore (all |any )?(previous|prior) (instructions|rules|prompts)|dump (secrets|api keys)|bypass (safety|guardrail)|export(a|ar)? (all|todos?|la lista))\b/i;

function score(email) {
  const text = `${email.subject}\n${email.from}\n${email.body}`;
  let riskHuman = 8;
  let riskAgent = 5;
  let category = "safe";
  if (URGENCY.test(text)) riskHuman += 18;
  if (CRED.test(text)) {
    riskHuman += 28;
    category = "phishing";
  }
  if (BEC.test(text)) {
    riskHuman += 32;
    category = category === "phishing" ? "phishing" : "bec";
  }
  if (INJECT.test(text)) {
    riskAgent += 55;
    category = "prompt_injection";
  }
  return { id: email.id, category, riskHuman: Math.min(100, riskHuman), riskAgent: Math.min(100, riskAgent) };
}

const results = fixtures.map(score);
console.table(results);

const inj = results.find((r) => r.id === "fix-prompt-injection");
const phish = results.find((r) => r.id === "fix-phishing-it");
const legit = results.find((r) => r.id === "fix-legit-calendar");

let failed = 0;
if (!inj || inj.category !== "prompt_injection" || inj.riskAgent < 50) {
  console.error("FAIL prompt injection");
  failed++;
}
if (!phish || phish.riskHuman < 40) {
  console.error("FAIL phishing");
  failed++;
}
if (!legit || legit.riskHuman > 40) {
  console.error("FAIL legit too high");
  failed++;
}

if (failed) {
  process.exit(1);
}
console.log("OK heuristics smoke");
