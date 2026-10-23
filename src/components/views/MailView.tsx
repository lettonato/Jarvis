"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { MailSetup } from "../setup";
import { Button, Notice, PageHeader, Panel } from "../ui";
import { addDays, isoDate } from "@/lib/dates";
import type { MailItem } from "@/lib/mail";
import { useNow } from "@/lib/useNow";

// Der Posteingang: wichtige Mails oben, Newsletter und Benachrichtigungen eingeklappt darunter.
// Die Mail, die JARVIS gerade mit dir bespricht, leuchtet, ihr Text steht direkt darunter.

const TIME = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

function when(iso: string, now: Date | null): string {
  const d = new Date(iso);
  if (now && isoDate(d) === isoDate(now)) return TIME.format(d);
  return DAY.format(d);
}

export function MailView() {
  const { mail, session, reloadMail, ask } = useJarvis();
  const now = useNow();
  const current = session?.kind === "post" ? session.ids[session.index] : null;

  if (mail && !mail.configured) {
    return (
      <Shell>
        <Panel className="max-w-2xl">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-sky-100">Postfach verbinden</h2>
          <p className="mb-4 text-sm text-quiet">
            JARVIS schaut in deinen Posteingang, sagt dir, welche Mails wichtig sind, liest sie dir vor und macht auf Zuruf Aufgaben daraus. Er löscht nichts und
            verschickt nichts.
          </p>
          <MailSetup />
        </Panel>
      </Shell>
    );
  }

  const important = (mail?.items ?? []).filter((m) => m.important);
  const bulk = (mail?.items ?? []).filter((m) => !m.important);

  return (
    <Shell
      subtitle={mail?.account ? `Posteingang ${mail.account} · letzte 14 Tage` : "lädt …"}
      actions={
        <>
          {mail && mail.importantUnread > 0 && (
            <Button tone="primary" icon="fokus" onClick={() => ask("Meine Mails")}>
              Mit JARVIS durchgehen
            </Button>
          )}
          <Button icon="laden" onClick={() => reloadMail(true)}>
            Neu laden
          </Button>
        </>
      }
    >
      {mail?.error && <Notice tone="error">{mail.error}</Notice>}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Neue wichtige" value={mail?.importantUnread ?? 0} alert />
        <Stat label="Ungelesen gesamt" value={mail?.unread ?? 0} />
        <Stat label="Newsletter und Co." value={mail?.bulkUnread ?? 0} />
      </div>
      <Panel>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-sky-300">Wichtig · {important.length}</h2>
        {mail && important.length === 0 && <p className="py-2 text-sm text-quiet">Keine wichtigen Mails. Schön ruhig heute.</p>}
        <ul className="divide-y divide-sky-300/10">
          {important.map((m) => (
            <MailRow key={m.uid} mail={m} now={now} active={m.uid === current} />
          ))}
        </ul>
      </Panel>
      {bulk.length > 0 && (
        <Panel>
          <details>
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.25em] text-sky-300/80">
              Newsletter und Benachrichtigungen · {bulk.length}
            </summary>
            <ul className="mt-2 divide-y divide-sky-300/10">
              {bulk.map((m) => (
                <MailRow key={m.uid} mail={m} now={now} active={m.uid === current} />
              ))}
            </ul>
          </details>
        </Panel>
      )}
    </Shell>
  );
}

function Shell({ children, subtitle, actions }: { children: ReactNode; subtitle?: string; actions?: ReactNode }) {
  return (
    <main className="view-enter mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="post" title="Post" subtitle={subtitle}>
        {actions}
      </PageHeader>
      {children}
    </main>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <Panel className="px-3 py-3 sm:px-4">
      <p className="text-[9px] uppercase tracking-widest text-quiet sm:text-[10px]">{label}</p>
      <p className={`text-2xl font-bold ${alert && value > 0 ? "text-pink-300" : "text-sky-50"}`}>{value}</p>
    </Panel>
  );
}

function MailRow({ mail, now, active }: { mail: MailItem; now: Date | null; active: boolean }) {
  const { run, discuss, mailText, tasks } = useJarvis();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const row = useRef<HTMLLIElement>(null);
  const text = mailText[mail.uid];
  const showText = (open || active) && text;

  useEffect(() => {
    if (active) row.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  async function act(effect: Parameters<typeof run>[0], done?: string) {
    setBusy(true);
    setNote(null);
    try {
      await run(effect);
      if (done) setNote({ tone: "ok", text: done });
    } catch (e) {
      setNote({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const read = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (!text) await act({ type: "readMail", uid: mail.uid });
  };

  const sender = mail.from !== mail.fromAddress ? mail.from : mail.fromAddress;
  const tomorrow = now ? addDays(isoDate(now), 1) : undefined;

  return (
    <li
      ref={row}
      className={`rounded-lg px-2 py-2.5 transition ${active ? "bg-sky-400/15 shadow-[0_0_0_1px_rgba(125,211,252,0.7),0_0_24px_rgba(56,189,248,0.3)]" : ""}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={read} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${mail.unread ? "bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)]" : "bg-transparent"}`} />
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className={`truncate text-sm ${mail.unread ? "font-bold text-sky-50" : "text-sky-100/80"}`}>{sender}</span>
              {mail.flagged && <span className="text-[10px] text-pink-300">★ markiert</span>}
              <span className="ml-auto shrink-0 text-[11px] text-quiet">{when(mail.date, now)}</span>
            </span>
            <span className="block truncate text-[13px] text-quiet">{mail.subject}</span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap gap-1.5 pl-5 sm:pl-0">
          {active ? (
            <span className="rounded-full border border-sky-300/50 px-2 py-1 text-[10px] uppercase tracking-widest text-sky-200">JARVIS bespricht das</span>
          ) : (
            mail.important &&
            mail.unread && (
              <Button small icon="fokus" onClick={() => discuss("post", mail.uid)}>
                Besprechen
              </Button>
            )
          )}
          {tasks?.configured && (
            <Button
              small
              disabled={busy}
              onClick={() => act({ type: "addTask", text: `${sender} antworten: ${mail.subject}`, due: tomorrow }, "Als Aufgabe für morgen notiert.")}
            >
              Als Aufgabe
            </Button>
          )}
          {mail.unread && (
            <Button small disabled={busy} onClick={() => act({ type: "markSeen", uid: mail.uid })}>
              Gelesen
            </Button>
          )}
          {mail.messageId && (
            <a
              href={`message://${encodeURIComponent(mail.messageId)}`}
              title="In Apple Mail öffnen (wenn das Postfach dort eingerichtet ist)"
              className="hidden items-center rounded-lg border border-sky-300/30 bg-sky-400/5 px-2 py-1 text-[11px] font-bold text-sky-100 hover:bg-sky-400/15 sm:inline-flex"
            >
              In Mail öffnen
            </a>
          )}
        </div>
      </div>
      {(open || active) && busy && !text && <p className="mt-2 pl-5 text-xs text-quiet">Lade die Mail …</p>}
      {showText && <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-sky-300/15 bg-desk/60 p-3 pl-5 font-sans text-[13px] leading-relaxed text-sky-50/90">{text.text || "Kein lesbarer Text."}</pre>}
      {note && <p className={`mt-1 pl-5 text-xs ${note.tone === "ok" ? "text-up" : "text-down"}`}>{note.text}</p>}
    </li>
  );
}
