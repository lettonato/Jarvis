"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { CalendarSetup, MailSetup, VaultSetup } from "../setup";
import { Button, inputClass, Notice, PageHeader, Panel } from "../ui";
import { postJson } from "@/lib/api";
import type { Settings } from "@/lib/settings";
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
            text="Mit dem KI-Gehirn versteht JARVIS freie Sätze: „Was muss ich bis Freitag noch erledigen?“, „Fass mir die Mail von Anna zusammen“ oder „Schieb den Zahnarzt auf nächsten Dienstag“. Kurze Befehle wie Briefing oder Weiter erledigt er weiter sofort selbst."
          >
            <BrainSetup />
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
                Mit KI-Gehirn gehen deine Frage, die letzten Sätze des Gesprächs und das, was Claude dafür nachliest (Aufgaben, Mails), verschlüsselt an Anthropic. Claude
                kann keine Mails schreiben oder löschen und ändert Aufgaben nur, wenn du es sagst.
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
        JARVIS nutzt Claude Opus 5.5. Eine Frage kostet meist ein bis drei Cent, je nachdem, wie viel er dafür nachlesen muss. Der Schlüssel bleibt in deiner
        Einstellungsdatei auf diesem Mac.
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
