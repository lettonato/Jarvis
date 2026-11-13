"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { Antwortentwuerfe } from "../Antwortentwuerfe";
import { MailSetup } from "../setup";
import { Scheibe, Scheiben, ScheibenZeile } from "../Raum";
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
          <h2 className="mb-1 text-sm font-bold text-schiefer">Postfach verbinden</h2>
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
      subtitle={mail?.account ? `Posteingang ${mail.account}, letzte 14 Tage` : "lädt …"}
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
      <Scheiben>
        <Scheibe titel="Auf einen Blick">
          <ul>
            <ScheibenZeile wert={mail?.importantUnread ?? 0}>Neue wichtige</ScheibenZeile>
            <ScheibenZeile wert={mail?.unread ?? 0}>Ungelesen gesamt</ScheibenZeile>
            <ScheibenZeile wert={mail?.bulkUnread ?? 0}>Newsletter und Co.</ScheibenZeile>
          </ul>
        </Scheibe>
      </Scheiben>
      <Antwortentwuerfe />
      <Panel>
        <h2 className="mb-2 text-xs font-bold text-see">Wichtig <span className="font-medium text-quiet">{important.length}</span></h2>
        {mail && important.length === 0 && <p className="py-2 text-sm text-quiet">Keine wichtigen Mails. Schön ruhig heute.</p>}
        <ul className="divide-y divide-schiefer/10">
          {important.map((m) => (
            <MailRow key={m.uid} mail={m} now={now} active={m.uid === current} />
          ))}
        </ul>
      </Panel>
      {bulk.length > 0 && (
        <Panel>
          <details>
            <summary className="cursor-pointer text-xs font-bold text-see/80">
              Newsletter und Benachrichtigungen <span className="font-medium text-quiet">{bulk.length}</span>
            </summary>
            <ul className="mt-2 divide-y divide-schiefer/10">
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="post" holo="modul-post" title="Post" subtitle={subtitle}>
        {actions}
      </PageHeader>
      {children}
    </main>
  );
}


function MailRow({ mail, now, active }: { mail: MailItem; now: Date | null; active: boolean }) {
  const { run, discuss, ask, mailText, spotlight, tasks, settings } = useJarvis();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const row = useRef<HTMLLIElement>(null);
  const text = mailText[mail.uid];
  const showText = (open || active) && text;

  // Hat JARVIS die Mail gerade auf deine Frage hin geöffnet, klappt sie hier auch auf.
  const lit = spotlight.uids.includes(mail.uid) ? spotlight.n : 0;
  const [litSeen, setLitSeen] = useState(0);
  if (lit !== litSeen) {
    setLitSeen(lit);
    if (lit) setOpen(true);
  }

  useEffect(() => {
    if (active || lit) row.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active, lit]);

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
      className={`rounded-lg px-2 py-2.5 transition ${active ? "bg-gletscher/15" : ""}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={read} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${mail.unread ? "bg-gletscher" : "bg-transparent"}`} />
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className={`truncate text-sm ${mail.unread ? "font-bold text-schiefer" : "text-schiefer/80"}`}>{sender}</span>
              {mail.flagged && <span className="text-xs text-down">★ markiert</span>}
              <span className="ml-auto shrink-0 text-xs text-quiet">{when(mail.date, now)}</span>
            </span>
            <span className="block truncate text-sm text-quiet">{mail.subject}</span>
          </span>
        </button>
        <div className="flex shrink-0 flex-wrap gap-1.5 pl-5 sm:pl-0">
          {active ? (
            <span className="rounded-full border border-schiefer/50 px-2 py-1 text-xs text-stein">JARVIS bespricht das</span>
          ) : (
            mail.important &&
            mail.unread && (
              <Button small icon="fokus" onClick={() => discuss("post", mail.uid)}>
                Besprechen
              </Button>
            )
          )}
          {settings?.brain.configured && mail.important && (
            // Nur die Nummer der Mail geht in die Frage: Absender und Betreff stammen von Dritten.
            <Button small onClick={() => ask(`Entwirf mir eine Antwort auf diese Mail (uid ${mail.uid}).`)}>
              Antwort entwerfen
            </Button>
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
              className="hidden items-center rounded-full border border-schiefer/25 px-3 py-1 text-xs font-semibold text-schiefer transition-colors hover:border-schiefer/70 hover:bg-schiefer/5 sm:inline-flex"
            >
              In Mail öffnen
            </a>
          )}
        </div>
      </div>
      {(open || active) && busy && !text && <p className="mt-2 pl-5 text-xs text-quiet">Lade die Mail …</p>}
      {showText && <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-schiefer/15 bg-desk/60 p-3 pl-5 font-sans text-sm leading-relaxed text-schiefer/90">{text.text || "Kein lesbarer Text."}</pre>}
      {note && <p className={`mt-1 pl-5 text-xs ${note.tone === "ok" ? "text-up" : "text-down"}`}>{note.text}</p>}
    </li>
  );
}
