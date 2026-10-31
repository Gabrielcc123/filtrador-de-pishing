# Checklist QA / E2E — ShieldMail (P4)

Correr antes del pitch. Marcar ✅ / ❌. Bugs P0 van al final.

## 0. Preflight

- [ ] `npm install` OK  
- [ ] `.env.local` desde `.env.example`  
- [ ] `npm run dev` abre http://127.0.0.1:43127  
- [ ] `npm run test:heuristics` → `OK motor P2`  

## 1. Modo demo (obligatorio — Plan B)

- [ ] Clic **Modo demo** carga 4 correos  
- [ ] `fix-phishing-it` → phishing, `riskHuman` alto, IOC con bit.ly o IP  
- [ ] `fix-bec-ceo` → bec, `riskHuman` alto  
- [ ] `fix-prompt-injection` → prompt_injection, `riskAgent` alto, bloque copiloto visible  
- [ ] `fix-legit-calendar` → safe / riesgo bajo  
- [ ] **Cuarentena** / **Seguro** / **Escalar** marcan acción local y toast  

## 2. Groq (si hay `GROQ_API_KEY`)

- [ ] Banner no dice solo heurístico (o `modeBanner` llm_ok en red)  
- [ ] Tras analizar, `analysisMode` puede ser `fused`  
- [ ] Quitar temporalmente la key → banner heurístico y UI **no** se cae  

## 3. Gmail (si P3 tiene OAuth)

- [ ] **Conectar Gmail** completa OAuth  
- [ ] **Sincronizar Gmail** trae ≤20 mails analizados  
- [ ] Cuarentena crea/usa label `ShieldMail/Quarantine`  
- [ ] Seguro usa `ShieldMail/Safe`  
- [ ] Si OAuth falla → volver a Modo demo en <10 s  

## 4. Narrativa AI safety (ensayo)

- [ ] Se dice en voz alta: doble víctima (humano + agente)  
- [ ] Se muestra prompt injection, no solo phishing IT  
- [ ] Se menciona humano en el loop  

## Bugs P0 anotados

| ID | Qué | Workaround pitch |
|----|-----|------------------|
| | | |

## Freeze

- [ ] Sin features nuevas 15–20 min antes de presentar  
- [ ] P4 tiene [PITCH.md](../PITCH.md) impreso o en segunda pantalla  
