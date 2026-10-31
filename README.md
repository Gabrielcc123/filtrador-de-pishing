# ShieldMail — Email Safety Agent

Agente de **AI safety para el inbox**: analiza correos (Gmail o fixtures demo), estima riesgo para el **empleado** y para un **copiloto IA**, explica el veredicto y permite cuarentena con humano en el loop.

**Repo:** [Gabrielcc123/filtrador-de-pishing](https://github.com/Gabrielcc123/filtrador-de-pishing)

## Por qué no es “otro anti-phishing”

Los filtros enterprise ya cubren spam/BEC clásico. ShieldMail se diferencia así:

1. **Doble score** — `riskHuman` vs `riskAgent`
2. **Simulación “¿Qué haría el copiloto?”** — daño si un asistente lee el mail
3. **Veredicto auditable** — reasons + IOCs en español
4. **Human-in-the-loop** — cuarentena / seguro / escalar (sin borrar solo)

## Arranque rápido (modo demo)

```bash
git clone https://github.com/Gabrielcc123/filtrador-de-pishing.git
cd filtrador-de-pishing
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://127.0.0.1:43127](http://127.0.0.1:43127) — carga fixtures y analiza con heurísticas (sin keys).

## Estructura del proyecto

Un solo Next.js (no dos servidores). Carpetas por rol:

```
src/
  frontend/     # P1 — UI / consola SOC
  backend/      # P2 motor amenazas + P3 Gmail
  shared/       # types + utils (contrato del equipo)
  app/          # rutas Next + API HTTP delgada
demo/           # P4 — fixtures y plantillas de ataque
docs/           # plan y estructura
```

Detalle: [docs/ESTRUCTURA.md](./docs/ESTRUCTURA.md)

| Rol | Dueño de |
|-----|----------|
| **P1** UI | `src/frontend/**` |
| **P2** Threat Engine | `src/backend/{heuristics,llm-analyzer,fuse,analyze}*` |
| **P3** Gmail | `src/backend/{gmail,session}*` + `src/app/api/gmail/**` |
| **P4** Demo / Pitch | `demo/`, [PITCH.md](./PITCH.md), QA |

## Variables de entorno

Copia `.env.example` → `.env.local`:

| Variable | Uso |
|----------|-----|
| `GROQ_API_KEY` | Llama vía Groq (fusión LLM + heurística) |
| `GOOGLE_CLIENT_ID` / `SECRET` | OAuth Gmail |
| `GOOGLE_REDIRECT_URI` | `http://127.0.0.1:43127/api/gmail/callback` |
| `SESSION_SECRET` | Cookie de sesión |
| `NEXT_PUBLIC_APP_URL` | `http://127.0.0.1:43127` |

Sin Groq → banner **modo heurístico** (demo sigue). Sin Gmail → botón **Modo demo**.

### Gmail OAuth (P3)

1. Google Cloud → habilitar **Gmail API**
2. OAuth client (Web) con el redirect de arriba
3. Scopes: `gmail.readonly`, `gmail.modify`
4. Labels creados por la app: `ShieldMail/Quarantine`, `ShieldMail/Safe`

## Scripts

```bash
npm run dev              # http://127.0.0.1:43127
npm run build
npm run start
npm run lint
npm run test:heuristics  # smoke del motor P2
```

## Flujo

```
Email → heurísticas + (opcional) Groq/Llama → fuse → ThreatVerdict
                                              ↓
                         UI SOC (HITL: cuarentena / seguro / escalar)
```

## Documentación

- [docs/ESTRUCTURA.md](./docs/ESTRUCTURA.md) — layout y dueños
- [docs/plan-antiphishing.md](./docs/plan-antiphishing.md) — plan de sprints / arquitectura
- [PITCH.md](./PITCH.md) — guion de 3 minutos para jueces
