"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RaumLink } from "./RaumLink";
import { Button, inputClass, Notice } from "./ui";
import { postJson } from "@/lib/api";
import { ladeNeu } from "@/lib/geteilt";
import { AGENTEN, KLASSE_LABEL, KLASSE_TEXT, NOTAUS_BESTAETIGUNG, type AgentName, type Freigabe, type Geaendert, type Klasse, type SicherheitsLage, type ZugangsdatenStatus } from "@/lib/sicherheit";
import { usePolling } from "@/lib/usePolling";
import { useNow } from "@/lib/useNow";

// Die Sicherheitszentrale in der Oberfläche: oben in jeder Ansicht der Not-Aus-Hinweis und offene
// Freigaben mit Ja und Nein, in den Einstellungen Not-Aus, Sperren, Freigaben und das Audit-Log.
// Entschieden wird auf dem Server; diese Seite schickt nur deine Klicks.

const ZEIT = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const zeit = (iso: string | null) => (iso ? ZEIT.format(new Date(iso)) : "");

// Was nach einem Ja frisch geladen wird. Der Server sagt, welche Bereiche die Aktion geändert hat (geaendert);
// sonst zeigte der Raum bis zur nächsten regulären Abfrage (beim Kalender fünf Minuten) den alten Stand, während
// oben schon „Eingetragen“ steht. Der Kalender ist am Server schon frisch gelesen, das Postfach noch nicht.
const NACH_JA: Record<Geaendert, [url: string, zusatz?: string]> = {
  calendar: ["/api/kalender"],
  tasks: ["/api/aufgaben"],
  mail: ["/api/post", "?force=1"],
  memory: ["/api/gedaechtnis"],
  desk: ["/api/handel"],
  documents: ["/api/dokumente"],
  intel: ["/api/intel"],
};

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
      const { geaendert, ...next } = await postJson<SicherheitsLage & { message: string; geaendert?: Geaendert[] }>("/api/sicherheit", body);
      set(next);
      setNote({ tone: "ok", text: next.message });
      for (const bereich of geaendert ?? []) if (Object.hasOwn(NACH_JA, bereich)) void ladeNeu(...NACH_JA[bereich]);
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
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${klein ? "" : "rounded border border-gletscher/30 bg-desk/70 p-3"}`}>
      <span className="font-bold text-see">Freigabe</span>
      <span className="min-w-0 flex-1">
        <span className="text-schiefer">{f.was}</span>
        <span className="ml-2 text-xs text-quiet">
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
          className="rounded-full bg-up px-3.5 py-1 text-xs font-bold text-white hover:bg-up/90 disabled:opacity-50"
        >
          Ja, ausführen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => send({ aktion: "freigabe", id: f.id, ja: false })}
          className="rounded-full border border-line px-3.5 py-1 text-xs font-bold hover:bg-panel-2 disabled:opacity-50"
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
    <div className="space-y-2" role="status" aria-live="polite">
      {notaus && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-l-4 border-down bg-white/92 px-4 py-2.5 text-sm shadow-[0_24px_50px_-18px_rgba(20,34,40,0.45)] backdrop-blur-xl">
          <span className="font-bold text-down">Not-Aus</span>
          <span className="min-w-0 flex-1 text-down">
            Alle Agenten stehen seit {zeit(notaus.seit)} ({notaus.grund}).
          </span>
          <RaumLink href="/einstellungen#sicherheit" className="rounded px-2 py-1 text-xs font-bold text-down underline">
            Lösen in den Einstellungen
          </RaumLink>
        </div>
      )}
      {offen.length > 0 && (
        <div className="rounded-2xl border-l-4 border-gletscher bg-white/92 px-4 py-2.5 text-sm shadow-[0_24px_50px_-18px_rgba(20,34,40,0.45)] backdrop-blur-xl">
          <FreigabeZeile f={offen[0]} send={send} busy={busy} klein />
          {offen.length > 1 && (
            <RaumLink href="/einstellungen#sicherheit" className="mt-1 block text-xs text-see hover:underline">
              und {offen.length - 1} weitere Freigaben
            </RaumLink>
          )}
        </div>
      )}
      {note && <p className={`rounded-2xl bg-white/92 px-4 py-1.5 text-xs shadow-[0_24px_50px_-18px_rgba(20,34,40,0.45)] backdrop-blur-xl ${note.tone === "ok" ? "text-up" : "text-ocker"}`}>{note.text}</p>}
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
  const { zustand, freigaben, audit, pruefung, zugangsdaten } = lage;
  const offen = freigaben.filter((f) => f.zustand === "offen");
  const erledigt = freigaben.filter((f) => f.zustand !== "offen").slice(0, 8);

  const loesen = async (e: FormEvent) => {
    e.preventDefault();
    if (await send({ aktion: "notaus_aus", bestaetigung })) setBestaetigung("");
  };
  const sperren = (agent: AgentName, an: boolean) => send(an ? { aktion: "agent_sperren", agent } : { aktion: "agent_entsperren", agent });

  return (
    <div className="space-y-5 text-sm">
      {note && <Notice meldung tone={note.tone === "ok" ? "ok" : "error"}>{note.text}</Notice>}

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-stein">Not-Aus</h3>
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
              className="rounded-lg border-2 border-down bg-down/80 px-4 py-2 text-sm font-bold text-white hover:bg-down disabled:opacity-50"
            >
              Not-Aus
            </button>
            <p className="min-w-0 flex-1 text-xs text-quiet">
              Hält sofort alle Agenten an: Gespräch, Browser, Analyst, Intel und Desk. Offene Freigaben verfallen. Auch per Telegram mit /notaus. Lösen geht nur hier.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-stein">Agenten einzeln sperren</h3>
        <ul className="space-y-1.5">
          {AGENTEN.map((a) => {
            const s = zustand.sperren[a.name];
            return (
              <li key={a.name} className="flex flex-wrap items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${zustand.notaus.an || s ? "bg-down" : "bg-up"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <b>{a.label}</b> <span className="text-xs text-quiet">{a.text}</span>
                  {s && <span className="ml-2 text-xs text-down">gesperrt seit {zeit(s.seit)}</span>}
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
        <h3 className="text-xs font-bold text-stein">Freigaben</h3>
        <ul className="space-y-1 text-xs text-quiet">
          {(["A", "B", "C", "D"] as Klasse[]).map((k) => (
            <li key={k}>
              <b className="text-schiefer">{KLASSE_LABEL[k]}</b>: {KLASSE_TEXT[k]}
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
          <ul className="space-y-0.5 text-xs text-quiet">
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

      <Zugangsdaten z={zugangsdaten} send={send} busy={busy} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold text-stein">Audit-Log</h3>
          <span className={`text-xs ${pruefung.ok ? "text-up" : "text-down"}`}>
            {pruefung.ok ? `✓ ${pruefung.eintraege} Einträge, Prüfkette intakt` : `⚠️ ${pruefung.fehler}`}
          </span>
        </div>
        {audit.length === 0 ? (
          <p className="text-xs text-quiet">Noch keine Einträge.</p>
        ) : (
          <ul className="max-h-80 space-y-0.5 overflow-y-auto font-mono text-xs text-schiefer/80">
            {(alleAudit ? audit : audit.slice(0, 15)).map((e) => (
              <li key={e.nr} className={e.ergebnis.startsWith("abgelehnt") || e.art === "alarm" ? "text-ocker" : ""}>
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

const ORT: Record<NonNullable<ZugangsdatenStatus["eintraege"][number]["ort"]>, string> = {
  datei: "Klartext in der Datei",
  schluesselbund: "Schlüsselbund",
  umgebung: "Umgebungsvariable",
};

// Wo Schlüssel und Passwörter liegen, und der Umzug in den macOS-Schlüsselbund (nur auf Knopfdruck).
function Zugangsdaten({ z, send, busy }: { z: ZugangsdatenStatus; send: (b: object) => Promise<boolean>; busy: boolean }) {
  const [sicher, setSicher] = useState(false);
  const imSchluesselbund = z.modus === "schluesselbund";
  const klartext = z.eintraege.some((e) => e.ort === "datei");
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-stein">Zugangsdaten</h3>
      <ul className="space-y-0.5 text-xs">
        {z.eintraege.map((e) => (
          <li key={e.name} className="flex flex-wrap gap-x-2">
            <span className={`inline-block h-2 w-2 translate-y-1 rounded-full ${e.ort === "datei" ? "bg-sonne" : e.ort ? "bg-up" : "bg-line"}`} aria-hidden />
            <b className="text-schiefer">{e.label}</b>
            <span className="text-quiet">{e.ort ? ORT[e.ort] : "nicht eingerichtet"}</span>
            {e.fehler && <span className="text-down">{e.fehler}</span>}
          </li>
        ))}
      </ul>
      {!imSchluesselbund ? (
        z.verfuegbar ? (
          <div className="space-y-2">
            <p className="text-xs text-quiet">
              {klartext ? "Schlüssel und Passwörter stehen im Klartext in " : "Neue Schlüssel und Passwörter landen sonst im Klartext in "}
              <code className="text-stein">{z.datei}</code>. Im macOS-Schlüsselbund sind sie verschlüsselt und nur mit deinem Mac-Login lesbar. JARVIS prüft jeden Wert nach dem
              Speichern; geht etwas schief, bleibt alles, wie es war.
            </p>
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={sicher} onChange={(e) => setSicher(e.target.checked)} className="mt-0.5" />
              Ich möchte die Zugangsdaten jetzt in den Schlüsselbund umziehen. macOS fragt dabei eventuell nach meinem Passwort.
            </label>
            <Button disabled={busy || !sicher} onClick={() => send({ aktion: "zugangsdaten_schluesselbund" }).then((ok) => ok && setSicher(false))}>
              In den Schlüsselbund umziehen
            </Button>
          </div>
        ) : (
          <p className="text-xs text-quiet">Der macOS-Schlüsselbund ist auf diesem Rechner nicht verfügbar; die Zugangsdaten bleiben in {z.datei}.</p>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-xs text-quiet">
            Die Datei enthält nur noch Verweise. Im Programm „Schlüsselbundverwaltung“ stehen die Einträge unter „JARVIS“.
          </p>
          <Button small disabled={busy} onClick={() => send({ aktion: "zugangsdaten_datei" })}>
            Zurück in die Datei
          </Button>
        </div>
      )}
    </div>
  );
}
