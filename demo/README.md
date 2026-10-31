# Pack de demo (P4)

## Fixtures (sin Gmail)

`fixtures/emails.json` — los carga la app con **Modo demo** o `GET /api/demo/fixtures`.

| ID | Amenaza | Esperado |
|----|---------|----------|
| `fix-phishing-it` | Credential harvest + lookalike | `phishing`, riskHuman alto |
| `fix-bec-ceo` | Fraude al CEO | `bec` |
| `fix-prompt-injection` | Jailbreak al copiloto | `prompt_injection`, riskAgent alto |
| `fix-legit-calendar` | Control FP | `safe` / bajo |

## Plantillas para enviar a Gmail real

En `emails/`: copiar el cuerpo a un correo y enviarlo a la bandeja de demo **antes** del pitch.

1. `01-phishing-it.md`  
2. `02-bec-ceo.md`  
3. `03-prompt-injection.md`  
4. `04-legit-calendar.md`  

Orden sugerido en bandeja: injection → phishing → BEC → calendar (para abrir injection primero).

## Smoke del motor

```bash
npm run test:heuristics
```
