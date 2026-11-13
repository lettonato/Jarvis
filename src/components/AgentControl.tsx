"use client";

import { useEffect, useState } from "react";
import { HoloLink } from "./HoloLink";
import { Button, Notice, Panel } from "./ui";
import { ZUSTAND_LABEL, type AgentAktion, type AgentLage, type AgentenSnapshot, type AgentZustand } from "@/lib/agenten";
import { postJson } from "@/lib/api";
import { TYPICAL_INTEL_COST_USD } from "@/lib/intel";
import { usePolling } from "@/lib/usePolling";
import { useNow } from "@/lib/useNow";

// Die Agentensteuerung: alle Agenten in einer Liste mit Zustand, letztem und nächstem Lauf, Ergebnis,
// Kosten und Grenzen. Die Knöpfe schicken nur deine Klicks an die Stellen, die es dafür schon gibt
// (Intel, Trading-Desk, Sicherheit); geprüft und entschieden wird dort auf dem Server.

const ZEIT = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const TAG = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" });
const dollar = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

// „vor 5 Min.“, „heute 07:31“, „12. November, 18:02“.
function wann(iso: string | null, jetzt: Date | null): string {
  if (!iso) return "noch nie";
  const d = new Date(iso);
  if (!jetzt) return ZEIT.format(d);
  const minuten = Math.round((jetzt.getTime() - d.getTime()) / 60_000);
  if (minuten >= 0 && minuten < 1) return "gerade eben";
  if (minuten >= 0 && minuten < 60) return `vor ${minuten} Min.`;
  if (minuten < 0 && minuten > -60) return `in ${-minuten} Min.`;
  return d.toDateString() === jetzt.toDateString() ? `heute ${ZEIT.format(d)}` : `${TAG.format(d)}, ${ZEIT.format(d)}`;
}

const FARBE: Record<AgentZustand, string> = {
  laeuft: "bg-up/15 text-up",
  bereit: "bg-sky-400/10 text-sky-200",
  wartet: "bg-sky-400/10 text-sky-200",
  pausiert: "bg-amber-400/15 text-amber-200",
  gesperrt: "bg-down/15 text-red-200",
  angehalten: "bg-down/15 text-red-200",
  "nicht-eingerichtet": "bg-panel-2 text-quiet",
  fehler: "bg-down/15 text-red-200",
};

// Wohin ein Klick geht. Starten gibt es nur für Intel: Die anderen arbeiten auf Zuruf oder werden in ihrer Ansicht gestartet.
function anfrage(agent: AgentLage, aktion: AgentAktion): { url: string; body: object } | null {
  if (aktion === "sperren") return { url: "/api/sicherheit", body: { aktion: "agent_sperren", agent: agent.name, grund: "in der Agentensteuerung gesperrt" } };
  if (aktion === "entsperren") return { url: "/api/sicherheit", body: { aktion: "agent_entsperren", agent: agent.name } };
  if (agent.name === "intel" && aktion === "starten") return { url: "/api/intel", body: { action: "aktualisieren" } };
  if (agent.name === "desk" && aktion === "pausieren") return { url: "/api/handel", body: { action: "pause" } };
  if (agent.name === "desk" && aktion === "fortsetzen") return { url: "/api/handel", body: { action: "weiter" } };
  return null;
}

const KNOPF: Record<AgentAktion, string> = { starten: "Jetzt starten", pausieren: "Pausieren", fortsetzen: "Fortsetzen", sperren: "Sperren", entsperren: "Entsperren" };

export function AgentControl() {
  const { data, reload } = usePolling<AgentenSnapshot>("/api/agenten", 10_000);
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 10_000);
    return () => clearTimeout(t);
  }, [note]);

  const klick = async (agent: AgentLage, aktion: AgentAktion) => {
    const a = anfrage(agent, aktion);
    if (!a) return;
    setBusy(true);
    setNote(null);
    try {
      const antwort = await postJson<{ message?: string }>(a.url, a.body);
      setNote({ tone: "ok", text: antwort.message ?? (aktion === "starten" ? `${agent.label} ist gestartet.` : "Erledigt.") });
    } catch (e) {
      setNote({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
      void reload();
    }
  };

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-sky-100">Steuerung</h2>
        <p className="text-xs text-quiet">Was jeder Agent gerade tut, wann er zuletzt gelaufen ist und was er heute gekostet hat.</p>
      </div>
      {(data?.notaus || note) && (
        <div className="mb-3 flex flex-col gap-2">
          {data?.notaus && <Notice tone="error">Der Not-Aus steht: Alle Agenten sind angehalten. Lösen kannst du ihn unter Einstellungen, Sicherheit.</Notice>}
          {note && <Notice tone={note.tone}>{note.text}</Notice>}
        </div>
      )}
      {!data ? (
        <p className="text-sm text-quiet">Die Agenten melden sich …</p>
      ) : (
        <ul className="flex flex-col divide-y divide-sky-300/10">
          {data.agenten.map((a) => (
            <li key={a.name} data-agent={a.name} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 lg:flex-row lg:items-start lg:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-sky-50">{a.label}</h3>
                  <span data-zustand={a.zustand} className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${FARBE[a.zustand]}`}>
                    {ZUSTAND_LABEL[a.zustand]}
                  </span>
                  <span className="text-xs text-quiet">{a.aufgabe}</span>
                </div>
                <p className="mt-1 text-sm text-sky-50/85">{a.satz}</p>
                {a.fehler && <p className="mt-1 text-sm text-red-200">Fehler: {a.fehler}</p>}
                {a.ergebnis && <p className="mt-1 text-xs text-sky-100/70">Letztes Ergebnis: {a.ergebnis}</p>}
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-quiet">Zuletzt</dt>
                    <dd className="text-sky-50">{wann(a.letzterLauf, now)}</dd>
                  </div>
                  <div>
                    <dt className="text-quiet">Nächster Lauf</dt>
                    <dd className="text-sky-50">{a.naechsterLauf ? wann(a.naechsterLauf, now) : a.takt}</dd>
                  </div>
                  <div>
                    <dt className="text-quiet">Kosten heute</dt>
                    <dd className="text-sky-50" title={a.kosten?.was}>
                      {a.kosten ? `${dollar(a.kosten.heuteUsd)}${a.kosten.budgetUsd !== null ? ` von ${dollar(a.kosten.budgetUsd)}` : ""}` : "noch nicht gezählt"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-quiet">Ansicht</dt>
                    <dd>
                      <HoloLink href={a.href} className="font-bold text-sky-300 hover:text-sky-100">
                        öffnen ›
                      </HoloLink>
                    </dd>
                  </div>
                </dl>
                <details className="mt-2 text-xs text-quiet">
                  <summary className="cursor-pointer hover:text-sky-100">Feste Grenzen</summary>
                  <ul className="mt-1 list-disc pl-5">
                    {a.grenzen.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </details>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col lg:items-stretch">
                {a.aktionen.map((aktion) => (
                  <Button
                    key={aktion}
                    small
                    tone={aktion === "sperren" ? "danger" : aktion === "starten" || aktion === "fortsetzen" ? "primary" : "ghost"}
                    disabled={busy}
                    onClick={() => void klick(a, aktion)}
                    title={a.name === "intel" && aktion === "starten" ? `Grok liest jetzt die Nachrichten. Kostet etwa ${dollar(TYPICAL_INTEL_COST_USD)}.` : undefined}
                  >
                    {KNOPF[aktion]}
                    {a.name === "intel" && aktion === "starten" ? ` (etwa ${dollar(TYPICAL_INTEL_COST_USD)})` : ""}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-quiet">Gespräch, Browser und Analyst arbeiten auf Zuruf. Den Handel startest du auf dem Trading-Desk. Entsperren und den Not-Aus lösen geht nur hier am Mac.</p>
    </Panel>
  );
}
