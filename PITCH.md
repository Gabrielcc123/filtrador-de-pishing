# Pitch ShieldMail (3 minutos)

## 0:00–0:30 — Problema
Los filtros clásicos (Proofpoint, Defender) protegen al **empleado**.  
Hoy las empresas meten **copilotos que leen el inbox**. Un mail malicioso ya no solo engaña humanos: puede **inyectar instrucciones** al agente y exfiltrar datos.

## 0:30–1:00 — Producto
**ShieldMail** es AI safety para el inbox: agente que analiza Gmail (o demo fixtures) con heurísticas + Llama (Groq), muestra **doble score** (`riskHuman` / `riskAgent`) y exige **humano en el loop**.

## 1:00–2:15 — Demo en vivo
1. Abrir consola → modo demo (o Gmail sync).
2. Abrir el mail de **prompt injection**.
3. Mostrar doble semáforo + bloque **“¿Qué haría el copiloto?”**.
4. Contrastar: “Un filtro clásico ve spam; nosotros vemos amenaza al agente IA.”
5. Pulsar **Cuarentena** (HITL).

## 2:15–2:45 — Diferenciación
- No competimos en “mejor antiphishing enterprise”.
- Competimos en **doble víctima**, **veredicto auditable**, modelo abierto, gobernanza.

## 2:45–3:00 — Cierre
ShieldMail: protege personas **y** la IA que lee su correo.  
Modelo abierto + explicable + humano en el loop.

## Plan B
Si Gmail OAuth falla → **Modo demo**. Si Groq falla → banner heurístico (demo sigue).
