"use client";

import { useEffect, useState, type FormEvent } from "react";
import { HoloLink } from "./HoloLink";
import { Button, inputClass, Notice } from "./ui";
import { postJson } from "@/lib/api";
import { AGENTEN, KLASSE_LABEL, KLASSE_TEXT, NOTAUS_BESTAETIGUNG, type AgentName, type Freigabe, type Klasse, type SicherheitsLage } from "@/lib/sicherheit";
import { usePolling } from "@/lib/usePolling";
import { useNow } from "@/lib/useNow";

// Die Sicherheitszentrale in der Oberfläche: oben in jeder Ansicht der Not-Aus-Hinweis und offene
// Freigaben mit Ja und Nein, in den Einstellungen Not-Aus, Sperren, Freigaben und das Audit-Log.
// Entschieden wird auf dem Server; diese Seite schickt nur deine Klicks.

const ZEIT = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const zeit = (iso: string | null) => (iso ? ZEIT.format(new Date(iso)) : "");

function useSicherheit(ms = 4000) {
  const { data, reload, set } = usePolling<SicherheitsLage>("/api/sicherheit", ms);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 10_000);
    return () => clearTimeout(t);
  }, [note]);
  const send = async (body: object) => {
    setBusy(true);
    setNote(null);
    try {
      const next = await postJson<SicherheitsLage & { message: string }>("/api/sicherheit", body);
      set(next);
      setNote({ tone: "ok", text: next.message });
      return true;
    } catch (e) {
      setNote({ tone: "error", text: e instanceof Error ? e.message : String(e) });
      void reload();
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { lage: data, send, note, busy };
}

const restMinuten = (f: Freigabe, jetzt: number) => Math.max(0, Math.ceil((Date.parse(f.bis) - jetzt) / 60_000));

function FreigabeZeile({ f, send, busy, klein }: { f: Freigabe; send: (b: object) => Promise<boolean>; busy: boolean; klein?: boolean }) {
  const now = useNow(5000);
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${klein ? "" : "rounded border border-violet-300/30 bg-desk/70 p-3"}`}>
      <span className="font-bold text-violet-200">🔐 Freigabe</span>
      <span className="min-w-0 flex-1">
        <span className="text-ink">{f.was}</span>
        <span className="ml-2 text-[11px] text-quiet">
          {KLASSE_LABEL[f.klasse]} · {f.kanal === "telegram" ? "aus Telegram" : "vom Mac"}
          {now ? ` · noch ${restMinuten(f, now.getTime())} Min.` : ""}
        </span>
        {!klein && <span className="block text-xs text-quiet">{f.warum}</span>}
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => send({ aktion: "freigabe", id: f.id, ja: true })}
          className="rounded bg-up/90 px-3 py-1 text-xs font-bold text-desk hover:bg-up disabled:opacity-50"
        >
          Ja, ausführen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => send({ aktion: "freigabe", id: f.id, ja: false })}
          className="rounded border border-line px-3 py-1 text-xs font-bold hover:bg-panel-2 disabled:opacity-50"
        >
          Nein
        </button>
      </span>
    </div>
  );
}

// Schmal unter der Navigation, in allen Ansichten.
export function SicherheitsLeiste() {
  const { lage, send, note, busy } = useSicherheit();
  const offen = lage?.freigaben.filter((f) => f.zustand === "offen") ?? [];
  const notaus = lage?.zustand.notaus.an ? lage.zustand.notaus : null;
  if (!notaus && offen.length === 0 && !note) return null;
  return (
    <div className="mx-2 mb-2 space-y-2 sm:mx-5" role="status" aria-live="polite">
      {notaus && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border-2 border-down bg-down/20 px-3 py-2 text-sm shadow-lg">
          <span className="font-bold uppercase tracking-wider text-red-100">🛑 Not-Aus</span>
          <span className="min-w-0 flex-1 text-red-100">
            Alle Agenten stehen seit {zeit(notaus.seit)} ({notaus.grund}).
          </span>
          <HoloLink href="/einstellungen#sicherheit" className="rounded px-2 py-1 text-xs font-bold text-red-100 underline">
            Lösen in den Einstellungen
          </HoloLink>
        </div>
      )}
      {offen.length > 0 && (
        <div className="rounded-lg border border-violet-400/60 bg-desk/95 px-3 py-2 text-sm shadow-lg">
          <FreigabeZeile f={offen[0]} send={send} busy={busy} klein />
          {offen.length > 1 && (
            <HoloLink href="/einstellungen#sicherheit" className="mt-1 block text-xs text-sky-300 hover:underline">
              und {offen.length - 1} weitere Freigaben
            </HoloLink>
          )}
        </div>
      )}
      {note && <p className={`rounded-lg bg-desk/95 px-3 py-1 text-xs ${note.tone === "ok" ? "text-up" : "text-amber-200"}`}>{note.text}</p>}
    </div>
  );
}

const ZUSTAND_TEXT: Record<Freigabe["zustand"], string> = {
  offen: "offen",
  laeuft: "läuft",
  ausgefuehrt: "ausgeführt",
  abgelehnt: "abgelehnt",
  verfallen: "verfallen",
  fehler: "Fehler",
  gesperrt: "gesperrt",
};

// In den Einstellungen.
export function SicherheitsZentrale() {
  const { lage, send, note, busy } = useSicherheit(5000);
  const [bestaetigung, setBestaetigung] = useState("");
  const [alleAudit, setAlleAudit] = useState(false);
  if (!lage) return <p className="text-sm text-quiet">Lade …</p>;
  const { zustand, freigaben, audit, pruefung } = lage;
  const offen = freigaben.filter((f) => f.zustand === "offen");
  const erledigt = freigaben.filter((f) => f.zustand !== "offen").slice(0, 8);

  const loesen = async (e: FormEvent) => {
    e.preventDefault();
    if (await send({ aktion: "notaus_aus", bestaetigung })) setBestaetigung("");
  };
  const sperren = (agent: AgentName, an: boolean) => send(an ? { aktion: "agent_sperren", agent } : { aktion: "agent_entsperren", agent });

  return (
    <div className="space-y-5 text-sm">
      {note && <Notice tone={note.tone === "ok" ? "ok" : "error"}>{note.text}</Notice>}

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-sky-200">Not-Aus</h3>
        {zustand.notaus.an ? (
          <>
            <Notice tone="error">
              Der Not-Aus ist an, seit {zeit(zustand.notaus.seit)} ({zustand.notaus.grund}). Gespräch, Browser, Analyst, Intel und Desk stehen. JARVIS kann ihn nicht selbst lösen.
            </Notice>
            <form onSubmit={loesen} className="flex flex-wrap items-center gap-2">
              <label htmlFor="notaus-loesen" className="text-xs text-quiet">
                Zum Lösen „{NOTAUS_BESTAETIGUNG}“ eintippen:
              </label>
              <input id="notaus-loesen" value={bestaetigung} onChange={(e) => setBestaetigung(e.target.value)} autoComplete="off" className={`${inputClass} w-40`} />
              <Button type="submit" disabled={busy || bestaetigung.trim() !== NOTAUS_BESTAETIGUNG}>
                Not-Aus lösen
              </Button>
            </form>
            <p className="text-xs text-quiet">Der Spielgeld-Desk bleibt danach angehalten, bis du ihn auf dem Trading-Desk fortsetzt.</p>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => send({ aktion: "notaus_an" })}
              className="rounded-lg border-2 border-down bg-down/80 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white hover:bg-down disabled:opacity-50"
            >
              🛑 Not-Aus
            </button>
            <p className="min-w-0 flex-1 text-xs text-quiet">
              Hält sofort alle Agenten an: Gespräch, Browser, Analyst, Intel und Desk. Offene Freigaben verfallen. Auch per Telegram mit /notaus. Lösen geht nur hier.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-sky-200">Agenten einzeln sperren</h3>
        <ul className="space-y-1.5">
          {AGENTEN.map((a) => {
            const s = zustand.sperren[a.name];
            return (
              <li key={a.name} className="flex flex-wrap items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${zustand.notaus.an || s ? "bg-down" : "bg-up"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <b>{a.label}</b> <span className="text-xs text-quiet">{a.text}</span>
                  {s && <span className="ml-2 text-xs text-red-200">gesperrt seit {zeit(s.seit)}</span>}
                </span>
                <Button small tone={s ? "ghost" : "danger"} disabled={busy} onClick={() => sperren(a.name, !s)}>
                  {s ? "Entsperren" : "Sperren"}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-sky-200">Freigaben</h3>
        <ul className="space-y-1 text-xs text-quiet">
          {(["A", "B", "C", "D"] as Klasse[]).map((k) => (
            <li key={k}>
              <b className="text-sky-100">{KLASSE_LABEL[k]}</b>: {KLASSE_TEXT[k]}
            </li>
          ))}
        </ul>
        <fieldset className="flex flex-wrap gap-3 text-xs">
          <legend className="mb-1 text-quiet">Klasse C fragt vorher:</legend>
          {(
            [
              ["immer", "immer (empfohlen)"],
              ["bei-fremden-inhalten", "nur, wenn im Gespräch Mails, Webseiten oder Termine gelesen wurden"],
            ] as const
          ).map(([wert, label]) => (
            <label key={wert} className="flex items-center gap-1.5">
              <input type="radio" name="c-strenge" checked={zustand.cStrenge === wert} disabled={busy} onChange={() => send({ aktion: "c_strenge", strenge: wert })} />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-quiet">Gedächtnis-Einträge und das Starten oder Fortsetzen des Handels fragen immer.</p>
        {offen.length === 0 ? <p className="text-xs text-quiet">Keine offenen Freigaben.</p> : offen.map((f) => <FreigabeZeile key={f.id} f={f} send={send} busy={busy} />)}
        {erledigt.length > 0 && (
          <ul className="space-y-0.5 text-[11px] text-quiet">
            {erledigt.map((f) => (
              <li key={f.id}>
                {zeit(f.entschieden ?? f.erstellt)} · {f.was}: <b>{ZUSTAND_TEXT[f.zustand]}</b>
                {f.von && f.von !== "system" ? ` (${f.von === "telegram" ? "per Telegram" : "am Mac"})` : ""}
                {f.ergebnis ? ` · ${f.ergebnis.slice(0, 160)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-sky-200">Audit-Log</h3>
          <span className={`text-xs ${pruefung.ok ? "text-up" : "text-red-200"}`}>
            {pruefung.ok ? `✓ ${pruefung.eintraege} Einträge, Prüfkette intakt` : `⚠️ ${pruefung.fehler}`}
          </span>
        </div>
        {audit.length === 0 ? (
          <p className="text-xs text-quiet">Noch keine Einträge.</p>
        ) : (
          <ul className="max-h-80 space-y-0.5 overflow-y-auto font-mono text-[11px] text-sky-50/80">
            {(alleAudit ? audit : audit.slice(0, 15)).map((e) => (
              <li key={e.nr} className={e.ergebnis.startsWith("abgelehnt") || e.art === "alarm" ? "text-amber-200" : ""}>
                {zeit(e.zeit)} · {e.agent}/{e.kanal} · {e.was}
                {e.klasse ? ` [${e.klasse}]` : ""} → {e.ergebnis}
                {e.grund ? ` (${e.grund.slice(0, 120)})` : ""}
              </li>
            ))}
          </ul>
        )}
        {audit.length > 15 && (
          <Button small onClick={() => setAlleAudit(!alleAudit)}>
            {alleAudit ? "Weniger" : `Alle ${audit.length} zeigen`}
          </Button>
        )}
        <p className="text-xs text-quiet">
          Liegt in ~/.jarvis/audit.jsonl. Jede Zeile trägt die Prüfsumme der vorigen; wird eine Zeile geändert oder gelöscht, meldet die Prüfung es. Ohne Passwörter, Schlüssel
          und Mailtexte.
        </p>
      </div>
    </div>
  );
}
