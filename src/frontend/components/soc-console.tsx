"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { AnalyzedEmail, AnalystAction } from "@/shared/types";
import { Button } from "@/frontend/components/ui/button";
import { RiskMeter } from "@/frontend/components/risk-meter";
import { CategoryBadge } from "@/frontend/components/category-badge";
import { cn } from "@/shared/utils";

type Status = {
  gmailConfigured: boolean;
  gmailConnected: boolean;
  gmailEmail: string | null;
  groqConfigured: boolean;
};

type LoadState = "idle" | "loading" | "error" | "ready";

export function SocConsole() {
  const [status, setStatus] = useState<Status | null>(null);
  const [items, setItems] = useState<AnalyzedEmail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [modeBanner, setModeBanner] = useState<"heuristic_fallback" | "llm_ok" | null>(null);
  const [source, setSource] = useState<"fixture" | "gmail">("fixture");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((i) => i.email.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function loadFixtures() {
    setLoadState("loading");
    setError(null);
    try {
      const res = await fetch("/api/demo/fixtures");
      if (!res.ok) throw new Error("No se pudieron cargar fixtures");
      const data = await res.json();
      setItems(data.items);
      setModeBanner(data.modeBanner);
      setSource("fixture");
      setSelectedId(data.items[0]?.email.id ?? null);
      setLoadState("ready");
    } catch (e) {
      setLoadState("error");
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function loadGmail() {
    setLoadState("loading");
    setError(null);
    try {
      const res = await fetch("/api/gmail/sync");
      if (res.status === 401) {
        window.location.href = "/api/gmail/auth";
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Sync Gmail falló");
      }
      const data = await res.json();
      setItems(data.items);
      setModeBanner(data.modeBanner);
      setSource("gmail");
      setSelectedId(data.items[0]?.email.id ?? null);
      setLoadState("ready");
      setStatus((s) =>
        s
          ? { ...s, gmailConnected: true, gmailEmail: data.account ?? s.gmailEmail }
          : s
      );
    } catch (e) {
      setLoadState("error");
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  useEffect(() => {
    void loadFixtures();
  }, []);

  function setAction(id: string, action: AnalystAction) {
    setItems((prev) => prev.map((i) => (i.email.id === id ? { ...i, action } : i)));
  }

  async function onAction(action: AnalystAction) {
    if (!selected || action === "none") return;
    const id = selected.email.id;
    let message = "";

    if (source === "gmail" && (action === "quarantine" || action === "safe")) {
      startTransition(() => setAction(id, action));
      try {
        const res = await fetch("/api/gmail/label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: id, action }),
        });
        if (!res.ok) {
          message =
            "No se pudo aplicar el label en Gmail (¿sesión?). Acción marcada localmente.";
        } else {
          const data = await res.json();
          message = `Label aplicado: ${data.labelName}`;
        }
      } catch {
        message = "Error de red al etiquetar en Gmail. Acción marcada localmente.";
      }
    } else if (action === "escalate") {
      startTransition(() => setAction(id, action));
      message = "Escalado registrado para revisión humana (HITL).";
    } else {
      startTransition(() => setAction(id, action));
      message =
        action === "quarantine"
          ? "Cuarentena local (modo demo). En Gmail se crearía ShieldMail/Quarantine."
          : "Marcado seguro en demo local.";
    }

    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) {
      c[i.verdict.category] = (c[i.verdict.category] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const heuristicMode =
    modeBanner === "heuristic_fallback" || (status !== null && !status.groqConfigured);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-300/50 bg-white/45 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 px-4 py-5 sm:px-6">
          <div className="animate-fade-up min-w-0">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tracking-tight text-white shadow-sm"
              >
                SM
              </span>
              <div>
                <p className="font-display text-3xl tracking-tight text-slate-950 sm:text-4xl">
                  ShieldMail
                </p>
                <p className="mt-0.5 max-w-xl text-sm text-slate-600">
                  AI safety para el inbox — protege empleados y copilotos.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wide">
              <span className="rounded-md bg-teal-900/90 px-2 py-1 text-teal-50">
                {source === "fixture" ? "Fuente · demo" : `Fuente · ${status?.gmailEmail || "Gmail"}`}
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-1",
                  heuristicMode
                    ? "bg-amber-100 text-amber-950"
                    : "bg-teal-100 text-teal-950"
                )}
              >
                {heuristicMode ? "Análisis · heurístico" : "Análisis · Llama + fuse"}
              </span>
              <span className="rounded-md bg-slate-200/80 px-2 py-1 text-slate-700">
                HITL · humano en el loop
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void loadFixtures()} disabled={pending}>
              Modo demo
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (status && !status.gmailConfigured) {
                  setToast("Configura GOOGLE_CLIENT_ID/SECRET o usa modo demo.");
                  setTimeout(() => setToast(null), 4000);
                  return;
                }
                if (status && !status.gmailConnected) {
                  window.location.href = "/api/gmail/auth";
                  return;
                }
                void loadGmail();
              }}
              disabled={pending}
            >
              {status?.gmailConnected ? "Sincronizar Gmail" : "Conectar Gmail"}
            </Button>
          </div>
        </div>
      </header>

      {heuristicMode && (
        <div className="border-b border-amber-300/80 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          Modo heurístico activo — sin <code className="rounded bg-amber-100 px-1">GROQ_API_KEY</code>{" "}
          o LLM no disponible. El demo sigue vivo; añade Groq para fusión con Llama.
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-up sticky top-0 z-20 border-b border-teal-300 bg-teal-100 px-4 py-2.5 text-center text-sm font-medium text-teal-950 shadow-sm"
        >
          {toast}
        </div>
      )}

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <section className="surface-panel animate-fade-up rounded-xl p-4">
            <h2 className="font-display text-lg text-slate-900">Ataques detectados</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {Object.keys(counts).length === 0 && (
                <li className="text-slate-500">Sin datos aún — carga demo o Gmail</li>
              )}
              {Object.entries(counts).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="capitalize">{k.replaceAll("_", " ")}</span>
                  <span className="tabular-nums font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-panel overflow-hidden rounded-xl">
            <div className="border-b border-slate-200/80 px-4 py-3">
              <h2 className="font-display text-lg text-slate-900">Bandeja analizada</h2>
            </div>
            {loadState === "loading" && (
              <div className="space-y-3 px-4 py-5" aria-busy="true" aria-label="Analizando correos">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-4/5 animate-pulse-soft rounded bg-slate-200/90" />
                    <div className="h-2 w-1/2 animate-pulse-soft rounded bg-slate-200/70" />
                  </div>
                ))}
                <p className="pt-1 text-center text-xs text-slate-500">Analizando correos…</p>
              </div>
            )}
            {loadState === "error" && (
              <div className="space-y-3 px-4 py-6 text-center">
                <p className="text-sm text-rose-700">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void loadFixtures()}>
                  Reintentar con demo
                </Button>
              </div>
            )}
            {loadState === "ready" && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Inbox vacío. Usa Modo demo o sincroniza Gmail.
              </p>
            )}
            <ul className="max-h-[28rem] divide-y divide-slate-100/90 overflow-y-auto">
              {items.map((item, index) => {
                const active = (selected?.email.id ?? null) === item.email.id;
                const maxRisk = Math.max(item.verdict.riskHuman, item.verdict.riskAgent);
                return (
                  <li
                    key={item.email.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.email.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition hover:bg-teal-50/50",
                        active && "bg-teal-50/90"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-slate-900">
                          {item.email.subject}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                            maxRisk >= 70
                              ? "bg-rose-100 text-rose-800"
                              : maxRisk >= 40
                                ? "bg-amber-100 text-amber-900"
                                : "bg-teal-100 text-teal-900"
                          )}
                        >
                          {maxRisk}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.email.from}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <CategoryBadge category={item.verdict.category} />
                        {item.action !== "none" && (
                          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                            {item.action === "quarantine"
                              ? "cuarentena"
                              : item.action === "safe"
                                ? "seguro"
                                : "escalado"}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>

        <section className="surface-panel rounded-xl p-5 sm:p-6">
          {!selected && loadState !== "loading" && (
            <div className="flex min-h-[24rem] flex-col items-center justify-center gap-2 text-center text-slate-500">
              <p className="font-display text-xl text-slate-700">Sin selección</p>
              <p className="max-w-sm text-sm">
                Selecciona un correo para ver el veredicto explicable del agente.
              </p>
            </div>
          )}
          {selected && (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={selected.verdict.category} />
                  <span className="text-xs text-slate-500">
                    modo {selected.verdict.analysisMode}
                    {selected.action !== "none" ? ` · acción: ${selected.action}` : ""}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
                  {selected.email.subject}
                </h1>
                <p className="mt-1 text-sm text-slate-600">{selected.email.from}</p>
                <p className="text-xs text-slate-400">{selected.email.date}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200/90 bg-white/70 p-4">
                  <RiskMeter label="Riesgo humano" value={selected.verdict.riskHuman} tone="human" />
                </div>
                <div className="rounded-lg border border-slate-200/90 bg-white/70 p-4">
                  <RiskMeter
                    label="Riesgo agente IA"
                    value={selected.verdict.riskAgent}
                    tone="agent"
                  />
                </div>
              </div>

              {selected.verdict.agentSimulation && (
                <div className="relative overflow-hidden rounded-lg border border-teal-900/15 bg-slate-900 p-4 text-teal-50">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-teal-400/20 blur-2xl" />
                  <h3 className="font-display text-lg text-white">¿Qué haría el copiloto?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-teal-50/90">
                    {selected.verdict.agentSimulation.naiveAction}
                  </p>
                  {selected.verdict.agentSimulation.dataAtRisk.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {selected.verdict.agentSimulation.dataAtRisk.map((d) => (
                        <li
                          key={d}
                          className="rounded-md bg-white/10 px-2 py-1 text-xs text-teal-50"
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="font-display text-lg text-slate-900">Por qué se marcó</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {selected.verdict.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Recomendación:</span>{" "}
                    {selected.verdict.recommendation}
                  </p>
                  {selected.verdict.iocs.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        IOCs
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selected.verdict.iocs.map((ioc) => (
                          <code
                            key={ioc}
                            className="max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-800"
                          >
                            {ioc}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-display text-lg text-slate-900">Correo</h3>
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {selected.email.body}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => void onAction("quarantine")}
                >
                  Cuarentena
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void onAction("safe")}
                >
                  Marcar seguro
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => void onAction("escalate")}
                >
                  Escalar
                </Button>
                <p className="w-full text-xs text-slate-500 sm:ml-auto sm:w-auto sm:self-center">
                  Human-in-the-loop: ninguna acción destructiva automática.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
