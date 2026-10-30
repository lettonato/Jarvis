"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { CalendarSetup, MailSetup, VaultSetup } from "../setup";
import { TelegramSetup } from "../TelegramSetup";
import { Button, inputClass, Notice, PageHeader, Panel } from "../ui";
import { postJson } from "@/lib/api";
import { APPROVAL, APPROVAL_CHOICES, type ApprovalLimit } from "@/lib/approval";
import type { MemoryFact } from "@/lib/brain";
import { SAFETY } from "@/lib/paper";
import type { Settings } from "@/lib/settings";
import { PHOTOS, readWorldStyle, saveWorldStyle, type WorldStyle } from "@/lib/photos";
import { chooseQuality, QUALITY_LABEL, QUALITY_SHOWN_EVENT, readQuality, readQualityChoice, type QualityChoice, type QualityLevel } from "@/lib/quality";
import { VOICE_KEY } from "@/lib/useVoice";

// Einstellungen: wie JARVIS dich nennt, welcher Obsidian-Tresor und welches Postfach, welche Stimme.

export function SettingsView() {
  const { settings } = useJarvis();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="einstellungen" title="Einstellungen" subtitle="Alles bleibt auf deinem Mac." />
      {!settings ? (
        <p className="text-sm text-quiet">Lade Einstellungen …</p>
      ) : (
        <>
          <Section title="Du">
            <NameForm />
          </Section>
          <Section
            id="gehirn"
            title="KI-Gehirn (Claude)"
            text="Mit dem KI-Gehirn redest du mit JARVIS wie mit Claude: Er beantwortet jede Frage, sieht bei Aktuellem im Web nach und versteht freie Sätze wie „Was muss ich bis Freitag noch erledigen?“, „Fass mir die Mail von Anna zusammen“ oder „Schieb den Zahnarzt auf nächsten Dienstag“. Kurze Befehle wie Briefing oder Weiter erledigt er weiter sofort selbst."
          >
            <BrainSetup />
          </Section>
          {settings.brain.configured && (
            <Section
              id="gedaechtnis"
              title="Was JARVIS über dich weiß"
              text="Erzählst du JARVIS etwas, das länger gilt (Vorlieben, Namen, Umstände), merkt er es sich hier und weiß es im nächsten Gespräch noch. Du kannst auch sagen „Merk dir, dass …“ oder „Vergiss, dass …“. Das Gedächtnis liegt nur auf diesem Mac."
            >
              <MemorySetup />
            </Section>
          )}
          <Section
            id="handy"
            title="Handy (Telegram)"
            text="Über Telegram hast du JARVIS auch unterwegs dabei: Er schickt dir morgens das Briefing, erinnert dich an Termine, meldet Warnungen und Trades, und du kannst ihm schreiben wie in der App. Dafür legst du dir bei Telegram einen eigenen Bot an. JARVIS antwortet nur deinem Handy, und dein Mac bleibt von außen unerreichbar."
          >
            <TelegramSetup />
          </Section>
          <Section
            id="rueckfrage"
            title="Rückfrage vor Käufen"
            text={`Ab dieser Grenze kauft der Trading-Desk nicht selbst. JARVIS fragt dich per Telegram mit Ja/Nein-Knöpfen und oben in JARVIS, und kauft erst nach deinem Ja. Ohne Antwort verfällt die Frage nach ${APPROVAL.timeoutMinutes} Minuten, dann wird nicht gekauft.`}
          >
            <ApprovalSetup />
          </Section>
          <Section
            id="crawler"
            title="Grok: Crawler auf X und Intel"
            text="Wie im GrokBot-Video liest der Crawler vor jedem Kauf, was auf X über den Coin geschrieben wird, und prüft das X-Konto des Projekts. Gelesen werden nur Coins, die Blockchain und Projektseite schon bestanden haben. Mit demselben Schlüssel liest Intel die Nachrichten und X für dein Briefing; Themen und Budget dafür stellst du in der Intel-Ansicht ein."
          >
            <CrawlerSetup />
          </Section>
          <Section title="Obsidian" text="Aus diesem Tresor liest JARVIS deine Aufgaben. Neue Aufgaben landen in JARVIS/Eingang.md, Notizen in JARVIS/Notizen.md.">
            <VaultSetup />
          </Section>
          <Section
            id="kalender"
            title="Kalender"
            text="JARVIS liest die Kalender-App auf deinem Mac und trägt neue Termine auf Zuruf ein. Ändern oder löschen kann er nichts. Einen Schlüssel braucht es nicht, nur einmal die Freigabe von macOS."
          >
            <CalendarSetup />
          </Section>
          <Section title="E-Mail" text="JARVIS liest deinen Posteingang über IMAP. Er löscht nichts und verschickt nichts; markieren als gelesen geht nur auf deinen Zuruf.">
            <MailSetup />
          </Section>
          <Section
            id="sprache"
            title="Sprache"
            text="Sag „Jarvis“ und dann, was du brauchst, zum Beispiel „Jarvis, wie läuft der Handel?“. Nach seiner Antwort hört er noch ein paar Sekunden zu, da reicht die nächste Frage ohne „Jarvis“. „Jarvis, stopp“ unterbricht ihn."
          >
            <HandsFreeSetup />
          </Section>
          <Section
            id="aussehen"
            title="Aussehen"
            text="Hinter JARVIS liegt eine Landschaft, und bei jedem Wechsel der Ansicht fliegst du in die nächste. Wähle das gerechnete Gebirge oder echte Fotos. Gilt für diesen Browser."
          >
            <WorldStylePicker />
            <WorldQualityPicker />
          </Section>
          <Section title="Stimme">
            <VoicePicker />
          </Section>
          <Section title="Sicherheit">
            <ul className="space-y-1.5 text-sm text-sky-50/85">
              <li>
                Freihändig hört der Browser dauerhaft mit, damit er „Jarvis“ erkennt. Hat Chrome das deutsche Sprachpaket, bleibt der Ton auf dem Mac; sonst schickt Chrome
                ihn zur Erkennung an Google, Safari an Apple. Ausschalten mit dem Schalter oder „Jarvis, Mikrofon aus“.
              </li>
              <li>Mit Grok gehen Name, Symbol, Adresse und Konten der geprüften Coins an xAI, und für Intel deine Themen. Sonst nichts von dir.</li>
              <li>
                Mit KI-Gehirn gehen deine Frage, die letzten Sätze des Gesprächs, was JARVIS sich über dich gemerkt hat, und das, was Claude dafür nachliest (Aufgaben,
                Mails), verschlüsselt an Anthropic. Sucht Claude im Web, gehen nur seine Suchbegriffe an die Suche; Links aus deinen Mails ruft er nicht auf. Claude kann
                keine Mails schreiben oder löschen und ändert Aufgaben nur, wenn du es sagst.
              </li>
              <li>
                Mit Telegram holt JARVIS die Nachrichten an deinen Bot selbst bei Telegram ab; dafür muss niemand an deinen Mac heran. Was ihr schreibt, läuft über die
                Server von Telegram und ist dort nicht Ende-zu-Ende verschlüsselt. JARVIS antwortet nur dem einen gekoppelten Chat und kann auch von dort keine Mails
                schreiben oder löschen.
              </li>
              <li>
                Der Browser-Agent bedient ein eigenes Chrome-Profil, getrennt von deinem normalen Chrome. Er kauft, bestellt, sendet und meldet sich nirgends an, tippt keine
                Passwörter oder Zahlungsdaten und öffnet keine Seiten in deinem Heimnetz. Den letzten Klick machst immer du.
              </li>
              <li>JARVIS läuft nur auf diesem Mac (127.0.0.1). Andere Geräte im WLAN erreichen ihn nicht.</li>
              <li>Webseiten, die du im Browser offen hast, können JARVIS nicht fernsteuern und deine Daten nicht lesen.</li>
              <li>
                Deine Einstellungen samt Mail-Passwort liegen in <code className="text-sky-200">{settings.configFile}</code>, lesbar nur für deinen Benutzer.
              </li>
            </ul>
          </Section>
        </>
      )}
    </main>
  );
}

function Section({ id, title, text, children }: { id?: string; title: string; text?: string; children: ReactNode }) {
  return (
    <Panel id={id}>
      <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-sky-100">{title}</h2>
      {text && <p className="mt-1 text-xs text-quiet">{text}</p>}
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

function NameForm() {
  const { settings, setSettings } = useJarvis();
  const [name, setName] = useState(settings?.name ?? "");
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSettings(await postJson<Settings>("/api/einstellungen", { action: "name", name }));
      setState({ tone: "ok", text: "Gespeichert." });
    } catch (err) {
      setState({ tone: "error", text: err instanceof Error ? err.message : String(err) });
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-xs text-quiet" htmlFor="jarvis-name">
        So spricht JARVIS dich an
      </label>
      <div className="flex gap-2">
        <input id="jarvis-name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} sm:max-w-xs`} />
        <Button type="submit" tone="primary" disabled={!name.trim()}>
          Speichern
        </Button>
      </div>
      {state && <Notice tone={state.tone}>{state.text}</Notice>}
    </form>
  );
}

function BrainSetup() {
  const { settings, setSettings } = useJarvis();
  const brain = settings?.brain;
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function send(body: object) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await postJson<Settings & { message?: string }>("/api/einstellungen", body);
      setSettings(next);
      setKey("");
      setMessage(next.message ? { tone: "ok", text: next.message } : null);
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send({ action: "claude", apiKey: key });
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      {brain?.configured && (
        <Notice tone="ok">{brain.hint ? `Verbunden mit dem Schlüssel ${brain.hint}.` : "Verbunden über ANTHROPIC_API_KEY."} JARVIS versteht jetzt auch freie Sätze.</Notice>
      )}
      <ol className="list-decimal space-y-1 pl-5 text-sky-50/85">
        <li>
          Auf{" "}
          <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer" className="text-sky-300 underline hover:text-sky-100">
            platform.claude.com
          </a>{" "}
          anmelden oder ein Konto anlegen.
        </li>
        <li>Unter „API Keys“ einen Schlüssel erstellen und hier einfügen. Er beginnt mit sk-ant-.</li>
        <li>Unter „Billing“ Guthaben aufladen und am besten ein Monatslimit setzen, dann kann nie mehr ausgegeben werden.</li>
      </ol>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={brain?.hint ? `gespeichert (${brain.hint}), zum Ändern neuen einfügen` : "sk-ant-…"}
          aria-label="Claude-Schlüssel"
          className={inputClass}
        />
        <Button type="submit" tone="primary" disabled={busy || !key.trim()}>
          {busy ? "Prüfe …" : "Prüfen und speichern"}
        </Button>
      </div>
      <p className="text-xs text-quiet">
        JARVIS nutzt Claude Opus 5.5. Eine Frage kostet meist ein bis drei Cent, je nachdem, wie viel er dafür nachlesen muss; sucht er im Web, kommt etwa ein Cent
        pro Suche dazu. Der Schlüssel bleibt in deiner Einstellungsdatei auf diesem Mac.
      </p>
      {brain?.hint && (
        <Button tone="danger" disabled={busy} onClick={() => send({ action: "removeClaude" })}>
          Schlüssel entfernen
        </Button>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </form>
  );
}

const SINCE = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });

function MemorySetup() {
  const { memory, setMemory } = useJarvis();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: object) {
    setBusy(true);
    setError(null);
    try {
      setMemory((await postJson<{ facts: MemoryFact[] }>("/api/gedaechtnis", body)).facts);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await send({ action: "merken", text })) setText("");
  };

  if (!memory) return <p className="text-sm text-quiet">Lade …</p>;
  return (
    <div className="space-y-3 text-sm">
      {memory.length === 0 ? (
        <p className="text-quiet">Noch nichts. Erzähl ihm einfach von dir, zum Beispiel: „Ich trinke meinen Kaffee schwarz.“</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {[...memory].reverse().map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 text-sky-50/90">
                {f.text}
                <span className="ml-2 text-[11px] text-quiet">seit {SINCE.format(new Date(f.at))}</span>
              </span>
              <Button small tone="ghost" disabled={busy} onClick={() => send({ action: "vergessen", id: f.id })} title="Diesen Eintrag vergessen">
                Vergessen
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Selbst etwas eintragen, zum Beispiel: Meine Frau heißt Anna." aria-label="Neuer Eintrag" className={inputClass} />
        <Button type="submit" tone="primary" disabled={busy || !text.trim()}>
          Merken
        </Button>
      </form>
      {memory.length > 0 &&
        (sure ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-red-200">Wirklich alles vergessen?</span>
            <Button tone="danger" disabled={busy} onClick={() => send({ action: "alles" }).then(() => setSure(false))}>
              Ja, alles vergessen
            </Button>
            <Button onClick={() => setSure(false)}>Abbrechen</Button>
          </div>
        ) : (
          <Button tone="danger" onClick={() => setSure(true)}>
            Alles vergessen
          </Button>
        ))}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

function CrawlerSetup() {
  const { settings, setSettings } = useJarvis();
  const crawler = settings?.crawler;
  const [key, setKey] = useState("");
  const [budget, setBudget] = useState(String(crawler?.budgetUsd ?? 1).replace(".", ","));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function send(body: object, done?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await postJson<Settings & { message?: string }>("/api/einstellungen", body);
      setSettings(next);
      setKey("");
      const text = next.message ?? done;
      setMessage(text ? { tone: "ok", text } : null);
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send({ action: "xai", apiKey: key });
  };
  const saveBudget = (e: FormEvent) => {
    e.preventDefault();
    send({ action: "xaiBudget", budgetUsd: Number(budget.replace(",", ".")) }, "Tagesbudget gespeichert.");
  };

  return (
    <div className="space-y-3 text-sm">
      {crawler?.configured && (
        <Notice tone="ok">
          {crawler.hint ? `Verbunden mit dem Schlüssel ${crawler.hint}.` : "Verbunden über XAI_API_KEY."} Grok darf am Tag bis zu{" "}
          {crawler.budgetUsd.toLocaleString("de-DE", { minimumFractionDigits: 2 })} $ für den Crawler ausgeben.
        </Notice>
      )}
      <form onSubmit={submit} className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-sky-50/85">
          <li>
            Auf{" "}
            <a href="https://console.x.ai" target="_blank" rel="noreferrer" className="text-sky-300 underline hover:text-sky-100">
              console.x.ai
            </a>{" "}
            anmelden, am einfachsten mit deinem X-Konto.
          </li>
          <li>Unter „API Keys“ einen Schlüssel erstellen und hier einfügen. Er beginnt mit xai-.</li>
          <li>Unter „Billing“ Guthaben aufladen, zum Beispiel 10 $, und dort ein Limit setzen.</li>
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={crawler?.hint ? `gespeichert (${crawler.hint}), zum Ändern neuen einfügen` : "xai-…"}
            aria-label="xAI-Schlüssel"
            className={inputClass}
          />
          <Button type="submit" tone="primary" disabled={busy || !key.trim()}>
            {busy ? "Prüfe …" : "Prüfen und speichern"}
          </Button>
        </div>
      </form>
      {crawler?.configured && (
        <form onSubmit={saveBudget} className="flex flex-wrap items-center gap-2">
          <label htmlFor="x-budget" className="text-xs text-quiet">
            Tagesbudget für den Crawler in Dollar
          </label>
          <input id="x-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={`${inputClass} w-24`} />
          <Button type="submit" disabled={busy}>
            Speichern
          </Button>
        </form>
      )}
      <p className="text-xs text-quiet">
        Grok berechnet pro gelesenem X-Beitrag einen halben Cent, dazu ein wenig für die Auswertung. Ein Coin kostet meist 10 bis 30 Cent. Ist das Tagesbudget
        aufgebraucht, prüft der Crawler bis morgen keine neuen Coins, und der Desk kauft nichts Neues. Gekaufte Coins bewacht er weiter.
      </p>
      {crawler?.hint && (
        <Button tone="danger" disabled={busy} onClick={() => send({ action: "removeXai" })}>
          Schlüssel entfernen
        </Button>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </div>
  );
}

function ApprovalSetup() {
  const { settings, setSettings, desk } = useJarvis();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = settings?.approval.limitUsd;
  const ticket = Math.floor((desk && desk.status !== "aus" ? desk.equity : SAFETY.startCapitalUsd) * SAFETY.maxTradeShare);

  async function choose(limitUsd: ApprovalLimit) {
    setBusy(true);
    setError(null);
    try {
      setSettings(await postJson<Settings>("/api/einstellungen", { action: "approval", limitUsd }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rückfrage ab">
        {APPROVAL_CHOICES.map((c) => {
          const on = current === c.value;
          return (
            <button
              key={String(c.value)}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy}
              onClick={() => choose(c.value)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                on ? "border-sky-300/80 bg-sky-400/20 text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.25)]" : "border-sky-300/20 bg-sky-400/5 text-sky-200/80 hover:border-sky-300/50"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-quiet">
        Im Spielgeld-Test ist ein Kauf etwa {ticket} $ ({SAFETY.maxTradeShare * 100} % des Kontos).{" "}
        {current === null
          ? "Mit „Nie fragen“ kauft der Desk wie bisher selbst und meldet dir den Kauf."
          : current !== undefined && ticket >= current
            ? "Mit dieser Grenze fragt JARVIS also gerade vor jedem Kauf."
            : "Mit dieser Grenze kauft der Desk gerade noch selbst; erst größere Käufe brauchen dein Ja."}
      </p>
      <ul className="space-y-1 text-xs text-sky-50/85">
        <li>· Freigeben kannst nur du mit den Knöpfen, nicht das KI-Gehirn und nicht per Sprache.</li>
        <li>· Nach deinem Ja prüft der Desk noch einmal den Kurs: Ist er seit der Frage um mehr als 5 % gestiegen, kauft er nicht.</li>
        <li>· Verkäufe wie Stop-Loss und Gewinnmitnahme fragen nie nach, dort kostet Warten Geld.</li>
        <li>· {settings?.telegram.paired ? "Die Frage kommt auf dein gekoppeltes Handy." : "Ohne gekoppeltes Handy siehst du die Frage nur hier in JARVIS."}</li>
      </ul>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

function HandsFreeSetup() {
  const { voice } = useJarvis();
  if (!voice.canListen) return <p className="text-sm text-quiet">Dieser Browser kann nicht zuhören. Öffne JARVIS in Chrome oder Safari.</p>;
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 text-sm text-sky-50/85">
        <input type="checkbox" checked={voice.handsFree} onChange={(e) => voice.setHandsFree(e.target.checked)} className="h-4 w-4 accent-sky-400" />
        Freihändig: auf „Jarvis“ hören, ohne Knopf
      </label>
      <p className="text-xs text-quiet">
        {voice.local
          ? "Die Spracherkennung läuft auf diesem Mac, der Ton bleibt hier."
          : "Die Spracherkennung macht der Browser: Chrome schickt den Ton dafür an Google, Safari an Apple."}{" "}
        Ohne Freihändig sprichst du über das Mikrofon oder die Leertaste.
      </p>
      {voice.error && <Notice tone="error">{voice.error}</Notice>}
    </div>
  );
}

const STYLES: { id: WorldStyle; title: string; text: string; preview: string }[] = [
  {
    id: "gebirge",
    title: "Gebirge (3D)",
    text: "Gerechnete Landschaft mit Gitter, Nordlicht und Holo-Tafeln. Jede Ansicht hat ihre eigene.",
    preview: "/welt/vorschau-gebirge.webp",
  },
  {
    id: "fotos",
    title: "Echte Fotos",
    text: "Zehn echte Landschaftsfotos, eins je Ansicht, leicht abgedunkelt. Beim Wechsel fliegst du ins Bild hinein.",
    preview: "/welt/vorschau-fotos.webp",
  },
];

function WorldStylePicker() {
  const [style, setStyle] = useState<WorldStyle | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setStyle(readWorldStyle()), 0);
    return () => clearTimeout(first);
  }, []);

  const choose = (next: WorldStyle) => {
    setStyle(next);
    saveWorldStyle(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Landschaft hinter JARVIS">
        {STYLES.map((s) => {
          const on = style === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(s.id)}
              className={`overflow-hidden rounded-xl border text-left transition ${
                on ? "border-sky-300/80 bg-sky-400/15 shadow-[0_0_24px_rgba(56,189,248,0.25)]" : "border-sky-300/20 bg-sky-400/5 hover:border-sky-300/50"
              }`}
            >
              <span aria-hidden className="block h-28 w-full bg-cover bg-center" style={{ backgroundImage: `url(${s.preview})` }} />
              <span className="block p-3">
                <span className="flex items-center justify-between gap-2 text-sm font-bold text-sky-50">
                  {s.title}
                  {on && <span className="rounded-full border border-sky-300/50 px-2 py-0.5 text-[10px] uppercase tracking-widest text-sky-200">Aktiv</span>}
                </span>
                <span className="mt-1 block text-xs text-quiet">{s.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      <details className="text-xs text-quiet">
        <summary className="cursor-pointer text-sky-200/80">Bildnachweis der Fotos</summary>
        <p className="mt-2">Alle Fotos stehen unter freien Creative-Commons-Lizenzen und stammen aus den Hintergrundbildern von Ubuntu.</p>
        <ul className="mt-1.5 space-y-0.5">
          {Object.values(PHOTOS).map((p) => (
            <li key={p.src}>
              {p.title}: {p.author}, {p.license}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

const QUALITY_CHOICES: { id: QualityChoice; title: string; text: string }[] = [
  { id: "auto", title: "Automatisch", text: "Passt sich deinem Rechner an. Gewechselt wird nur im Flug, damit nichts springt." },
  { id: 2, title: "Hoch", text: "Gestochen scharf, mit Leuchten. Braucht die meiste Grafikleistung." },
  { id: 1, title: "Mittel", text: "Etwas weicher, mit Leuchten." },
  { id: 0, title: "Einfach", text: "Ohne Leuchten, für ältere Rechner." },
];

// Wie fein die Landschaft gerechnet wird. Flackert oder ruckelt es, hilft eine feste Stufe.
function WorldQualityPicker() {
  const [choice, setChoice] = useState<QualityChoice | null>(null);
  const [shown, setShown] = useState<QualityLevel | null>(null);

  useEffect(() => {
    const first = setTimeout(() => {
      setChoice(readQualityChoice());
      setShown(readQuality().level);
    }, 0);
    const onShown = (e: Event) => setShown((e as CustomEvent<QualityLevel>).detail);
    window.addEventListener(QUALITY_SHOWN_EVENT, onShown);
    return () => {
      clearTimeout(first);
      window.removeEventListener(QUALITY_SHOWN_EVENT, onShown);
    };
  }, []);

  const choose = (next: QualityChoice) => {
    setChoice(next);
    if (next !== "auto") setShown(next);
    chooseQuality(next);
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-sky-200/80">Bildqualität</p>
      <div className="grid gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Bildqualität der Landschaft">
        {QUALITY_CHOICES.map((q) => {
          const on = choice === q.id;
          return (
            <button
              key={String(q.id)}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(q.id)}
              className={`flex flex-col justify-start rounded-lg border p-2.5 text-left transition ${
                on ? "border-sky-300/80 bg-sky-400/20 shadow-[0_0_18px_rgba(56,189,248,0.25)]" : "border-sky-300/20 bg-sky-400/5 hover:border-sky-300/50"
              }`}
            >
              <span className="block text-xs font-bold text-sky-50">{q.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-quiet">{q.text}</span>
            </button>
          );
        })}
      </div>
      {choice === "auto" && shown !== null && <p className="text-xs text-quiet">Zurzeit: {QUALITY_LABEL[shown]}.</p>}
    </div>
  );
}

function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [chosen, setChosen] = useState("");

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de")));
    const first = setTimeout(() => {
      load();
      try {
        setChosen(localStorage.getItem(VOICE_KEY) ?? "");
      } catch {
        // Ohne Speicher bleibt die Standardstimme.
      }
    }, 0);
    synth.addEventListener("voiceschanged", load);
    return () => {
      clearTimeout(first);
      synth.removeEventListener("voiceschanged", load);
    };
  }, []);

  const choose = (name: string) => {
    setChosen(name);
    try {
      if (name) localStorage.setItem(VOICE_KEY, name);
      else localStorage.removeItem(VOICE_KEY);
    } catch {
      // Dann gilt die Wahl nur bis zum Neuladen.
    }
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find((v) => v.name === name);
    if (synth) {
      synth.cancel();
      const u = new SpeechSynthesisUtterance("Hallo, so klinge ich jetzt.");
      u.lang = "de-DE";
      if (voice) u.voice = voice;
      synth.speak(u);
    }
  };

  if (voices.length === 0) return <p className="text-sm text-quiet">Dieser Browser bietet keine deutschen Stimmen an. In Chrome und Safari auf dem Mac gibt es mehrere.</p>;
  return (
    <div className="space-y-2">
      <select value={chosen} onChange={(e) => choose(e.target.value)} className={`${inputClass} sm:max-w-sm`} aria-label="Stimme von JARVIS">
        <option value="">Automatisch</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-quiet">
        Mehr und bessere Stimmen bekommst du auf dem Mac unter Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte → Systemstimme → Stimmen verwalten.
      </p>
    </div>
  );
}
