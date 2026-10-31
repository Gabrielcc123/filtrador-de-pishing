# Pitch ShieldMail (3 minutos)

Guion para jueces. Narrador: **P4**. Operador de consola: **P1** (o P4 si van solos).

## Frase de apertura (30 s)

Los filtros clásicos protegen al **empleado**.  
Hoy las empresas meten **copilotos que leen el inbox**. Un mail malicioso ya no solo engaña humanos: puede **inyectar instrucciones** al agente y exfiltrar datos.

**ShieldMail** es AI safety para el inbox.

## Producto (30 s)

- Heurísticas + **Llama vía Groq**
- **Doble score:** `riskHuman` (persona) / `riskAgent` (copiloto)
- Veredicto con reasons + IOCs en español
- **Humano en el loop:** cuarentena / seguro / escalar (no borramos solos)

## Demo en vivo (75 s)

| Tiempo | Quién | Qué hacer / decir |
|--------|-------|-------------------|
| 0:00 | P1 | Abrir `http://127.0.0.1:43127` → **Modo demo** |
| 0:10 | P4 | “Cuatro correos de ataque preparados. Sin Gmail también funciona.” |
| 0:20 | P1 | Abrir **prompt injection** |
| 0:30 | P4 | Señalar `riskAgent` alto + bloque **“¿Qué haría el copiloto?”** |
| 0:45 | P4 | “Un filtro clásico ve spam; nosotros vemos amenaza al agente IA.” |
| 0:55 | P1 | Pulsar **Cuarentena** |
| 1:05 | P4 | (Opcional) Abrir phishing IT → IOCs `bit.ly` / IP; contrastar Calendar = safe |

## Diferenciación (30 s)

No competimos en “mejor antiphishing enterprise”.  
Competimos en **doble víctima**, **veredicto auditable**, modelo abierto y gobernanza.

## Cierre (15 s)

ShieldMail: protege personas **y** la IA que lee su correo.  
Modelo abierto + explicable + humano en el loop.

## Qué detectamos (lista para jueces)

1. **Phishing / credenciales** — urgencia, reset password, acortadores, IP, lookalike  
2. **BEC** — “soy el CEO”, pago confidencial, no le digas a nadie  
3. **Malware** — `.exe`, `.html` adjunto, etc.  
4. **Prompt injection** — ignore previous instructions, dump secrets, bypass guardrails  
5. **Spear estilo LLM** — copy pulido + presión  

Detalle: [docs/QUE-DETECTAMOS.md](./docs/QUE-DETECTAMOS.md)

## Plan B (decir en voz alta si hace falta)

| Fallo | Qué hacer |
|-------|-----------|
| Gmail OAuth | **Modo demo** (fixtures) |
| Sin `GROQ_API_KEY` / Groq cae | Banner **modo heurístico** — demo sigue |
| UI rota | Abrir fixture en JSON + `npm run test:heuristics` |

## Ensayo (P4)

- [ ] Ensayo 1 cronometrado ≤ 3:00  
- [ ] Ensayo 2 con Plan B (sin Groq)  
- [ ] Ensayo 3 con P1 operando la consola  
