# Estructura del proyecto ShieldMail

## Recomendación (hackaton 6h)

**Un solo app Next.js**, con carpetas claras `frontend` / `backend` / `shared`.

No partimos en dos servidores (Express + React separados): eso duplica auth, CORS, deploy y tiempo de integración. Las **Route Handlers** en `src/app/api/*` son el backend HTTP; la lógica vive en `src/backend`.

```
filtrador-de-pishing/
├── demo/                      # P4 — plantillas y fixtures
│   ├── emails/
│   └── fixtures/emails.json
├── docs/
│   └── ESTRUCTURA.md
├── scripts/
│   └── test-heuristics.mjs    # smoke P2
├── src/
│   ├── app/                   # Next.js (rutas finas)
│   │   ├── api/               # HTTP backend (thin controllers)
│   │   │   ├── analyze/
│   │   │   ├── demo/fixtures/
│   │   │   └── gmail/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # monta la consola SOC
│   │   └── globals.css
│   ├── frontend/              # P1 — UI
│   │   └── components/
│   ├── backend/               # P2 + P3 — dominio
│   │   ├── analyze.ts
│   │   ├── heuristics.ts      # P2
│   │   ├── llm-analyzer.ts    # P2
│   │   ├── fuse.ts            # P2
│   │   ├── gmail.ts           # P3
│   │   ├── session.ts         # P3
│   │   └── fixtures.ts
│   └── shared/                # contrato del equipo
│       ├── types.ts
│       └── utils.ts
├── .env.example
├── PITCH.md
└── package.json
```

## Dueños por carpeta

| Carpeta | Rol | Notas |
|---------|-----|--------|
| `src/frontend/**` | P1 | No meter OAuth ni prompts LLM |
| `src/backend/{heuristics,llm,fuse,analyze}*` | P2 | Motor de amenazas |
| `src/backend/{gmail,session}*` + `app/api/gmail/**` | P3 | Gmail |
| `src/shared/**` | Todos | Cambios de tipos = anunciar en standup |
| `demo/**`, `PITCH.md` | P4 | Demo y narrativa |
| `src/app/api/**` | P2/P3 | Controllers delgados que llaman a `backend/` |

## ¿Cuándo sí separar backend y frontend en dos repos/apps?

Solo si después de la hackaton necesitan:

- API consumida por más de un cliente (móvil, otro dashboard)
- Escala/deploy independiente del modelo vs UI

Entonces el camino natural sería:

```
apps/web     → Next o Vite (solo UI)
apps/api     → Hono/Fastify (analizar + Gmail)
packages/shared → types
```

Para ganar la hackaton, **no** migren a eso ahora.
