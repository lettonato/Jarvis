"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HoloLink } from "./HoloLink";
import { useJarvis } from "./JarvisProvider";
import { postJson } from "@/lib/api";
import { APPROVAL, secondsLeft, type Approval } from "@/lib/approval";
import { formatUsd } from "@/lib/format";
import type { DeskSnapshot } from "@/lib/paper";
import { useNow } from "@/lib/useNow";

// Rückfrage vor Käufen in JARVIS: Auf dem Trading-Desk steht die Frage groß mit Ja und Nein, in allen
// anderen Ansichten als schmale Leiste unter der Navigation. Dieselbe Frage kommt per Telegram aufs Handy;
// was du zuerst beantwortest, gilt.

export function useApprovalAnswer() {
  const { setDesk } = useJarvis();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Die Bestätigung bleibt ein paar Sekunden stehen.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 8_000);
    return () => clearTimeout(t);
  }, [note]);
  const answer = async (a: Approval, yes: boolean) => {
    setBusy(a.id);
    setNote(null);
    try {
      const next = await postJson<DeskSnapshot & { message: string }>("/api/handel", { action: "rueckfrage", id: a.id, ja: yes });
      setDesk(next);
      setNote({ tone: next.message.startsWith("Gekauft") || !yes ? "ok" : "error", text: next.message });
    } catch (e) {
      setNote({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };
  return { answer, busy, note };
}

const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const openApprovals = (desk: DeskSnapshot | null) => desk?.approvals?.filter((a) => a.state === "offen") ?? [];

// Groß auf dem Trading-Desk: offene Fragen mit Ja und Nein, darunter die letzten Antworten.
export function ApprovalPanel({ desk }: { desk: DeskSnapshot }) {
  const now = useNow(1000);
  const { answer, busy, note } = useApprovalAnswer();
  const open = openApprovals(desk);
  const done = (desk.approvals ?? []).filter((a) => a.state !== "offen").slice(0, 3);
  if (open.length === 0 && !note) return null;
  return (
    <section className="rounded-md border-2 border-amber-400/70 bg-amber-400/10 p-3 shadow-[0_0_24px_rgba(251,191,36,0.15)]" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-amber-200">
          {open.length === 1 ? "JARVIS fragt vor einem Kauf" : open.length > 1 ? `JARVIS fragt vor ${open.length} Käufen` : "Rückfrage"}
        </h2>
        <p className="text-[11px] text-amber-100/70">
          {desk.approvalPhone ? "Dieselbe Frage ist auf deinem Handy. Was du zuerst beantwortest, gilt." : "Kein Handy gekoppelt, die Frage steht nur hier."}
        </p>
      </div>
      <ul className="mt-2 space-y-2">
        {open.map((a) => {
          const left = now ? secondsLeft(a, now.getTime()) : APPROVAL.timeoutMinutes * 60;
          return (
            <li key={a.id} className="flex flex-col gap-2 rounded border border-amber-300/30 bg-desk/70 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-ink">
                  <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline">
                    ${a.symbol}
                  </a>{" "}
                  für {formatUsd(a.usd)} kaufen?
                  <span className="ml-2 align-middle text-[10px] font-normal uppercase tracking-wider text-quiet">Spielgeld</span>
                </p>
                <p className="mt-0.5 text-xs text-quiet">Warum: {a.why}</p>
                <p className={`mt-1 text-[11px] tabular-nums ${left < 120 ? "text-amber-300" : "text-amber-100/70"}`}>
                  {left > 0 ? `Noch ${countdown(left)} Minuten, ohne Antwort kaufe ich nicht.` : "Abgelaufen, gekauft wird nicht."}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy !== null || left === 0}
                  onClick={() => answer(a, true)}
                  className="rounded bg-up/90 px-4 py-2 text-sm font-bold text-desk hover:bg-up disabled:opacity-50"
                >
                  {busy === a.id ? "Prüfe …" : "Ja, kaufen"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null || left === 0}
                  onClick={() => answer(a, false)}
                  className="rounded border border-line bg-panel px-4 py-2 text-sm font-bold hover:bg-panel-2 disabled:opacity-50"
                >
                  Nein
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {note && <p className={`mt-2 text-xs ${note.tone === "ok" ? "text-up" : "text-amber-200"}`}>{note.text}</p>}
      {done.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-quiet">
          {done.map((a) => (
            <li key={a.id}>
              ${a.symbol}, {formatUsd(a.usd)}: {a.result}
              {a.via === "telegram" ? " (per Telegram)" : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Schmal in der Navigation, in allen Ansichten außer dem Trading-Desk.
export function ApprovalBar() {
  const pathname = usePathname();
  const { desk } = useJarvis();
  const now = useNow(1000);
  const { answer, busy, note } = useApprovalAnswer();
  const open = openApprovals(desk);
  if (pathname === "/trading" || (open.length === 0 && !note)) return null;
  const a = open[0];
  return (
    <div className="mx-2 mb-2 rounded-lg border border-amber-400/60 bg-desk/90 px-3 py-2 text-sm shadow-lg backdrop-blur sm:mx-5" role="status">
      {a ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-bold text-amber-200">🟡 Rückfrage</span>
          <span className="min-w-0 flex-1">
            Soll ich <b>${a.symbol}</b> für {formatUsd(a.usd)} kaufen?
            <span className="ml-2 text-xs tabular-nums text-quiet">{now ? `noch ${countdown(secondsLeft(a, now.getTime()))}` : ""}</span>
            {open.length > 1 && <span className="ml-2 text-xs text-quiet">und {open.length - 1} weitere</span>}
          </span>
          <span className="flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => answer(a, true)} className="rounded bg-up/90 px-3 py-1 text-xs font-bold text-desk hover:bg-up disabled:opacity-50">
              {busy === a.id ? "Prüfe …" : "Ja, kaufen"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => answer(a, false)} className="rounded border border-line px-3 py-1 text-xs font-bold hover:bg-panel-2 disabled:opacity-50">
              Nein
            </button>
            <HoloLink href="/trading" className="rounded px-2 py-1 text-xs text-sky-300 hover:underline">
              Ansehen
            </HoloLink>
          </span>
        </div>
      ) : (
        note && <p className={note.tone === "ok" ? "text-up" : "text-amber-200"}>{note.text}</p>
      )}
    </div>
  );
}

export function ApprovalRule({ desk }: { desk: DeskSnapshot }) {
  const limit = desk.approvalLimit;
  return (
    <p className="text-[11px] text-quiet">
      Rückfrage vor Käufen:{" "}
      <HoloLink href="/einstellungen#rueckfrage" className="text-sky-300 hover:underline">
        {limit === null ? "aus, der Desk kauft selbst" : `${limit === 0 ? "bei jedem Kauf" : `ab ${limit} $`}${desk.approvalPhone ? ", per Telegram und hier" : ", hier in JARVIS"}`}
      </HoloLink>
    </p>
  );
}
