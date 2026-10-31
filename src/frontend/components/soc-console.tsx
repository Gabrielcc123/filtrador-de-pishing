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

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-300/60 bg-white/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-2xl tracking-tight text-slate-900 sm:text-3xl">
              ShieldMail
            </p>
            <p className="mt-0.5 max-w-xl text-sm text-slate-600">
              AI safety para el inbox — protege empleados y copilotos.
            </p>
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

      {(modeBanner === "heuristic_fallback" || (status && !status.groqConfigured)) && (
        <div className="border-b border-amber-300/80 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          Modo heurístico activo — sin <code className="rounded bg-amber-100 px-1">GROQ_API_KEY</code>{" "}
          o LLM no disponible. El demo sigue vivo; añade Groq para fusión con Llama.
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-20 border-b border-teal-300 bg-teal-100 px-4 py-2.5 text-center text-sm font-medium text-teal-950 shadow-sm"
        >
          {toast}
        </div>
      )}

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
            <h2 className="font-display text-lg text-slate-900">Ataques detectados</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {Object.keys(counts).length === 0 && <li className="text-slate-500">Sin datos aún</li>}
              {Object.entries(counts).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="capitalize">{k.replace("_", " ")}</span>
                  <span className="tabular-nums font-medium">{v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Fuente: {source === "fixture" ? "fixtures demo" : status?.gmailEmail || "Gmail"}
            </p>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-display text-lg text-slate-900">Bandeja analizada</h2>
            </div>
            {loadState === "loading" && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Analizando correos…</p>
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
              <p className="px-4 py-8 text-center text-sm text-slate-500">Inbox vacío</p>
            )}
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
              {items.map((item) => {
                const active = (selected?.email.id ?? null) === item.email.id;
                const maxRisk = Math.max(item.verdict.riskHuman, item.verdict.riskAgent);
                return (
                  <li key={item.email.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.email.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition hover:bg-slate-50",
                        active && "bg-teal-50/80"
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

        <section className="rounded-xl border border-slate-200/80 bg-white/80 p-5 shadow-sm sm:p-6">
          {!selected && loadState !== "loading" && (
            <div className="flex min-h-[24rem] items-center justify-center text-slate-500">
              Selecciona un correo para ver el veredicto del agente.
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
                <h1 className="mt-2 font-display text-2xl text-slate-900 sm:text-3xl">
                  {selected.email.subject}
                </h1>
                <p className="mt-1 text-sm text-slate-600">{selected.email.from}</p>
                <p className="text-xs text-slate-400">{selected.email.date}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                  <RiskMeter label="Riesgo humano" value={selected.verdict.riskHuman} tone="human" />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                  <RiskMeter
                    label="Riesgo agente IA"
                    value={selected.verdict.riskAgent}
                    tone="agent"
                  />
                </div>
              </div>

              {selected.verdict.agentSimulation && (
                <div className="relative overflow-hidden rounded-lg border border-violet-200 bg-violet-50/60 p-4">
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-200/40 blur-2xl" />
                  <h3 className="font-display text-lg text-violet-950">
                    ¿Qué haría el copiloto?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-violet-950/90">
                    {selected.verdict.agentSimulation.naiveAction}
                  </p>
                  {selected.verdict.agentSimulation.dataAtRisk.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {selected.verdict.agentSimulation.dataAtRisk.map((d) => (
                        <li
                          key={d}
                          className="rounded-md bg-white/70 px-2 py-1 text-xs text-violet-900"
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

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
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
