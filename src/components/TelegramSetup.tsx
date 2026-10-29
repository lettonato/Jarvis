"use client";

import qrcode from "qrcode-generator";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useJarvis } from "./JarvisProvider";
import { Button, inputClass, Notice } from "./ui";
import { getJson, postJson } from "@/lib/api";
import type { Settings } from "@/lib/settings";
import { findToken, pairLink, tokenProblem, REMINDER_MINUTES, TELEGRAM_DEFAULTS, type TelegramPrefs } from "@/lib/telegram";

// Einstellungen → Handy: Bot-Schlüssel eintragen, Handy koppeln, festlegen, was aufs Handy kommt.

type Message = { tone: "ok" | "error"; text: string } | null;

const CLOCK = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

export function TelegramSetup() {
  const { settings, setSettings } = useJarvis();
  const tg = settings?.telegram;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function send(body: object, done?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await postJson<Settings & { message?: string }>("/api/einstellungen", body);
      setSettings(next);
      const text = next.message ?? done;
      setMessage(text ? { tone: "ok", text } : null);
      return true;
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Solange das Handy noch nicht gekoppelt ist, schaut die Seite alle paar Sekunden nach, ob es geklappt hat.
  const waiting = Boolean(tg?.configured && !tg.paired);
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      getJson<Settings>("/api/einstellungen")
        .then((next) => {
          if (next.telegram.paired) setMessage(null);
          if (next.telegram.paired || next.telegram.code !== tg?.code) setSettings(next);
        })
        .catch(() => {});
    }, 3_000);
    return () => clearInterval(timer);
  }, [waiting, tg?.code, setSettings]);

  if (!tg) return null;
  return (
    <div className="space-y-3 text-sm">
      {!tg.configured ? (
        <TokenForm busy={busy} onSave={(token) => send({ action: "telegram", token })} />
      ) : !tg.paired ? (
        <Pairing bot={tg.bot!} code={tg.code} until={tg.codeUntil} busy={busy} onRenew={() => send({ action: "telegramCode" })} />
      ) : (
        <>
          <Notice tone="ok">
            Gekoppelt{tg.chatName ? ` mit ${tg.chatName}` : ""}. JARVIS schreibt dir über @{tg.bot}.
          </Notice>
          <Prefs prefs={tg.prefs} busy={busy} onChange={(p) => send({ action: "telegramPrefs", ...p }, "Gespeichert.")} />
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => send({ action: "telegramTest" })}>
              Testnachricht schicken
            </Button>
            <Button tone="danger" disabled={busy} onClick={() => send({ action: "telegramUnpair" }, "Getrennt. Mit dem neuen Code koppelst du wieder.")}>
              Handy trennen
            </Button>
          </div>
        </>
      )}
      {tg.error && <Notice tone="error">{tg.error}</Notice>}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {tg.configured && (
        <p className="text-xs text-quiet">
          Bot-Schlüssel {tg.hint} ·{" "}
          <button type="button" disabled={busy} onClick={() => send({ action: "removeTelegram" })} className="text-red-200 underline hover:text-red-100 disabled:opacity-40">
            Bot entfernen
          </button>
        </p>
      )}
    </div>
  );
}

function TokenForm({ busy, onSave }: { busy: boolean; onSave: (token: string) => Promise<boolean> }) {
  const [token, setToken] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await onSave(token)) setToken("");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sky-50/85">
        <li>Telegram auf dem Handy installieren und ein Konto anlegen, falls du noch keins hast.</li>
        <li>
          In Telegram den{" "}
          <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-300 underline hover:text-sky-100">
            BotFather
          </a>{" "}
          öffnen (der mit dem blauen Haken) und ihm <code className="text-sky-200">/newbot</code> schicken.
        </li>
        <li>Einen Namen wählen, zum Beispiel „Jarvis“, und einen Benutzernamen, der auf „bot“ endet, zum Beispiel „benedikt_jarvis_bot“.</li>
        <li>Der BotFather schickt dir einen Schlüssel wie 123456789:AAH… Den hier einfügen.</li>
      </ol>
      {/* Sichtbar statt Punkte, damit du beim Abtippen siehst, was im Feld steht. Gespeichert wird er nur am Mac,
          danach zeigt die Seite nur noch die letzten Zeichen. Als Textfeld füllt auch kein Passwort-Speicher etwas hinein. */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          name="telegram-bot-schluessel"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="123456789:AAH…"
          aria-label="Bot-Schlüssel von Telegram"
          className={`${inputClass} font-mono`}
        />
        <Button type="submit" tone="primary" disabled={busy || !token.trim()}>
          {busy ? "Prüfe …" : "Prüfen und speichern"}
        </Button>
      </div>
      {token.trim() && <TokenCheck text={token} />}
      <p className="text-xs text-quiet">
        Am einfachsten geht das mit Telegram am Mac (App oder web.telegram.org). Kopierst du den Schlüssel auf dem iPhone, kannst du ihn dank Handoff direkt hier
        einfügen. Telegram kostet nichts.
      </p>
    </form>
  );
}

// Schon beim Tippen sagen, ob das wie ein ganzer Schlüssel aussieht, und sonst, woran es hakt. Er hat rund 46 Zeichen.
function TokenCheck({ text }: { text: string }) {
  const found = findToken(text);
  if (found) return <p className="text-xs text-emerald-300">Sieht aus wie ein Bot-Schlüssel ({found.length} Zeichen).</p>;
  return (
    <p className="text-xs text-amber-200">
      Noch kein gültiger Schlüssel ({text.trim().length} Zeichen, meist sind es 46). {tokenProblem(text)}
    </p>
  );
}

function Pairing({ bot, code, until, busy, onRenew }: { bot: string; code: string | null; until: string | null; busy: boolean; onRenew: () => void }) {
  const link = code ? pairLink(bot, code) : null;
  return (
    <div className="space-y-3">
      <Notice tone="ok">Bot @{bot} ist verbunden. Jetzt noch dein Handy koppeln, damit JARVIS weiß, wem er antworten darf.</Notice>
      {link && code && (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <QrCode text={link} />
          <ol className="list-decimal space-y-1.5 pl-5 text-sky-50/85">
            <li>Halte die Kamera deines Handys auf den Code und tippe auf den Link.</li>
            <li>In Telegram öffnet sich dein Bot. Tippe unten auf „Starten“.</li>
            <li>
              Oder schick dem Bot diesen Code: <span className="font-mono text-base font-bold tracking-[0.2em] text-sky-50">{code}</span>
            </li>
            <li className="text-xs text-quiet">
              Der Code gilt bis {until ? CLOCK.format(new Date(until)) : "gleich"} Uhr.{" "}
              <a href={link} target="_blank" rel="noreferrer" className="text-sky-300 underline hover:text-sky-100">
                Mit Telegram am Mac öffnen
              </a>
            </li>
          </ol>
        </div>
      )}
      <p className="flex items-center gap-2 text-xs text-quiet">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-300" aria-hidden />
        Warte auf dein Handy …
        <Button small disabled={busy} onClick={onRenew}>
          Neuer Code
        </Button>
      </p>
    </div>
  );
}

// Ein QR-Code als SVG, mit dem üblichen weißen Rand, damit jede Kamera ihn erkennt.
function QrCode({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { size: n + 8, path: d };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44 shrink-0 rounded-lg" shapeRendering="crispEdges" role="img" aria-label="QR-Code zum Koppeln mit Telegram">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

function Prefs({ prefs, busy, onChange }: { prefs: TelegramPrefs; busy: boolean; onChange: (p: Partial<TelegramPrefs>) => void }) {
  const [time, setTime] = useState(prefs.briefing ?? TELEGRAM_DEFAULTS.briefing!);
  const box = "h-4 w-4 accent-sky-400";
  const row = "flex items-center gap-3 text-sky-50/85";
  return (
    <fieldset className="space-y-2" disabled={busy}>
      <legend className="mb-1 text-xs text-quiet">Was aufs Handy kommt</legend>
      <label className={row}>
        <input type="checkbox" className={box} checked={prefs.warnings} onChange={(e) => onChange({ warnings: e.target.checked })} />
        Warnungen: Intel bremst den Desk, Tageslimit erreicht
      </label>
      <label className={row}>
        <input type="checkbox" className={box} checked={prefs.trades} onChange={(e) => onChange({ trades: e.target.checked })} />
        Jeder Kauf und Verkauf des Spielgeld-Desks
      </label>
      <label className={row}>
        <input type="checkbox" className={box} checked={prefs.reminders} onChange={(e) => onChange({ reminders: e.target.checked })} />
        Erinnerung {REMINDER_MINUTES} Minuten vor jedem Termin
      </label>
      <div className={`${row} flex-wrap`}>
        <label className="flex items-center gap-3">
          <input type="checkbox" className={box} checked={prefs.briefing !== null} onChange={(e) => onChange({ briefing: e.target.checked ? time : null })} />
          Briefing jeden Morgen um
        </label>
        <span className="flex items-center gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onBlur={() => prefs.briefing !== null && time && time !== prefs.briefing && onChange({ briefing: time })}
            aria-label="Uhrzeit fürs Briefing"
            className={`${inputClass} w-32`}
          />
          <span className="text-xs text-quiet">Uhr</span>
        </span>
      </div>
    </fieldset>
  );
}
