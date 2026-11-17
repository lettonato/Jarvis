"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RaumLink } from "./RaumLink";
import { useJarvis } from "./JarvisProvider";
import { postJson } from "@/lib/api";
import { APPROVAL, assetLabel, secondsLeft, type Approval } from "@/lib/approval";
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
    <section className="rounded-md border-2 border-sonne/70 bg-sonne/10 p-3" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-ocker">
          {open.length === 1 ? "JARVIS fragt vor einem Kauf" : open.length > 1 ? `JARVIS fragt vor ${open.length} Käufen` : "Rückfrage"}
        </h2>
        <p className="text-xs text-schiefer/70">
          {desk.approvalPhone ? "Dieselbe Frage ist auf deinem Handy. Was du zuerst beantwortest, gilt." : "Kein Handy gekoppelt, die Frage steht nur hier."}
        </p>
      </div>
      <ul className="mt-2 space-y-2">
        {open.map((a) => {
          const left = now ? secondsLeft(a, now.getTime()) : APPROVAL.timeoutMinutes * 60;
          return (
            <li key={a.id} className="flex flex-col gap-2 rounded border border-sonne/30 bg-desk/70 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-schiefer">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {assetLabel(a)}
                    </a>
                  ) : (
                    assetLabel(a)
                  )}{" "}
                  für {formatUsd(a.usd)} kaufen?
                  <span className="ml-2 align-middle text-xs font-normal text-quiet">Spielgeld</span>
                </p>
                <p className="mt-0.5 text-xs text-quiet">Warum: {a.why}</p>
                <p className={`mt-1 text-xs tabular-nums ${left < 120 ? "text-ocker" : "text-schiefer/70"}`}>
                  {left > 0 ? `Noch ${countdown(left)} Minuten, ohne Antwort kaufe ich nicht.` : "Abgelaufen, gekauft wird nicht."}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy !== null || left === 0}
                  onClick={() => answer(a, true)}
                  className="rounded-full bg-up px-4 py-2 text-sm font-bold text-white hover:bg-up/90 disabled:opacity-50"
                >
                  {busy === a.id ? "Prüfe …" : "Ja, kaufen"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null || left === 0}
                  onClick={() => answer(a, false)}
                  className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-bold hover:bg-panel-2 disabled:opacity-50"
                >
                  Nein
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {note && <p className={`mt-2 text-xs ${note.tone === "ok" ? "text-up" : "text-ocker"}`}>{note.text}</p>}
      {done.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-quiet">
          {done.map((a) => (
            <li key={a.id}>
              {assetLabel(a)}, {formatUsd(a.usd)}: {a.result}
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
    <div className="rounded-2xl border-l-4 border-sonne bg-white/92 px-4 py-2.5 text-sm shadow-[0_24px_50px_-18px_rgba(20,34,40,0.45)] backdrop-blur-xl" role="status">
      {a ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-bold text-ocker">Rückfrage</span>
          <span className="min-w-0 flex-1">
            Soll ich <b>{assetLabel(a)}</b> für {formatUsd(a.usd)} kaufen?
            <span className="ml-2 text-xs tabular-nums text-quiet">{now ? `noch ${countdown(secondsLeft(a, now.getTime()))}` : ""}</span>
            {open.length > 1 && <span className="ml-2 text-xs text-quiet">und {open.length - 1} weitere</span>}
          </span>
          <span className="flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => answer(a, true)} className="rounded-full bg-up px-3.5 py-1 text-xs font-bold text-white hover:bg-up/90 disabled:opacity-50">
              {busy === a.id ? "Prüfe …" : "Ja, kaufen"}
            </button>
            <button type="button" disabled={busy !== null} onClick={() => answer(a, false)} className="rounded-full border border-line px-3.5 py-1 text-xs font-bold hover:bg-panel-2 disabled:opacity-50">
              Nein
            </button>
            <RaumLink href="/trading" className="rounded px-2 py-1 text-xs text-see hover:underline">
              Ansehen
            </RaumLink>
          </span>
        </div>
      ) : (
        note && <p className={note.tone === "ok" ? "text-up" : "text-ocker"}>{note.text}</p>
      )}
    </div>
  );
}

export function ApprovalRule({ desk }: { desk: DeskSnapshot }) {
  const limit = desk.approvalLimit;
  return (
    <p className="text-xs text-quiet">
      Rückfrage vor Käufen:{" "}
      <RaumLink href="/einstellungen#rueckfrage" className="text-see hover:underline">
        {limit === null ? "aus, der Desk kauft selbst" : `${limit === 0 ? "bei jedem Kauf" : `ab ${limit} $`}${desk.approvalPhone ? ", per Telegram und hier" : ", hier in JARVIS"}`}
      </RaumLink>
    </p>
  );
}
