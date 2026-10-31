# Qué detecta ShieldMail (para jueces)

Fuente de verdad en código: `src/backend/detections.ts`.

| Categoría | Título | Qué cuenta / qué no |
|-----------|--------|---------------------|
| `phishing` | Phishing / robo de credenciales | Urgencia real, restablecer contraseña, acortadores, IP literal, TLD de riesgo, lookalike de marca. Mencionar Microsoft en el cuerpo o “login” solo **no** alcanza. |
| `bec` | BEC / fraude al ejecutivo | “Soy el CEO/CFO”, cambio de cuenta, pago confidencial, secreto. Transferencia de nómina o “factura adjunta” solas **no** bastan. |
| `malware` | Malware / adjuntos peligrosos | Extensiones de alto riesgo (`.exe`, `.html` como adjunto, `.iso`, `.js`, `.ps1`, …). |
| `prompt_injection` | Prompt injection contra copilotos | Ignorar reglas, exfiltrar secretos, bypass de guardrails. “Act as point of contact” / “you are now invited” **no** cuentan. Si el LLM dice safe, la fusión **no** baja un hit de inyección. |
| `spear_llm` | Spear phishing estilo LLM | Cuerpo largo y pulido + presión o pedido de credenciales, si no hay categoría más fuerte. |

## Doble score (AI safety)

- **`riskHuman`** — engaño a un empleado  
- **`riskAgent`** — daño si un copiloto lee o ejecuta el mail  

Cada veredicto incluye reasons, IOCs, recomendación y (si aplica) simulación “¿Qué haría el copiloto?”.
