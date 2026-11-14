"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CloudVoiceSetup } from "../CloudVoiceSetup";
import { useJarvis } from "../JarvisProvider";
import { MicrosoftSetup } from "../MicrosoftSetup";
import { CalendarSetup, MailSetup, VaultSetup } from "../setup";
import { SicherheitsZentrale } from "../Sicherheit";
import { TelegramSetup } from "../TelegramSetup";
import { Button, inputClass, Notice, PageHeader, Panel } from "../ui";
import { postJson } from "@/lib/api";
import { APPROVAL, APPROVAL_CHOICES, type ApprovalLimit } from "@/lib/approval";
import type { MemoryFact } from "@/lib/brain";
import { COMMODITY_RULES } from "@/lib/commodities";
import { HINWEIS_REGELN } from "@/lib/hinweise";
import { SAFETY } from "@/lib/paper";
import type { Settings } from "@/lib/settings";
import { MODELLE } from "@/lib/modelle";
import { PHOTOS } from "@/lib/photos";
import { RAEUME } from "@/lib/raeume";
import { VOICE_KEY } from "@/lib/useVoice";

// Einstellungen: wie JARVIS dich nennt, welcher Obsidian-Tresor und welches Postfach, welche Stimme.

// Ein Abschnitt der Einstellungen. Sprungleiste und Abschnitte kommen aus derselben Liste: So zeigt jeder Eintrag
// der Leiste auf einen Abschnitt, den es gibt. Die ids stehen auch in Links aus anderen Räumen
// (etwa /einstellungen#rohstoffe) und bleiben deshalb, wie sie sind.
type Abschnitt = { id: string; kurz: string; title: string; text?: string; zeigen?: boolean; inhalt: ReactNode };

function abschnitteVon(settings: Settings): Abschnitt[] {
  const alle: Abschnitt[] = [
    {
      id: "du",
      kurz: "Du",
      title: "Du",
      inhalt: <NameForm />,
    },
    {
      id: "gehirn",
      kurz: "KI-Gehirn",
      title: "KI-Gehirn (Claude)",
      text: "Mit dem KI-Gehirn redest du mit JARVIS wie mit Claude: Er beantwortet jede Frage, sieht bei Aktuellem im Web nach und versteht freie Sätze wie „Was muss ich bis Freitag noch erledigen?“, „Fass mir die Mail von Anna zusammen“ oder „Schieb den Zahnarzt auf nächsten Dienstag“. Kurze Befehle wie Briefing oder Weiter erledigt er weiter sofort selbst.",
      inhalt: <BrainSetup />,
    },
    {
      id: "gedaechtnis",
      kurz: "Gedächtnis",
      title: "Was JARVIS über dich weiß",
      text: "Erzählst du JARVIS etwas, das länger gilt (Vorlieben, Namen, Umstände), merkt er es sich hier und weiß es im nächsten Gespräch noch. Du kannst auch sagen „Merk dir, dass …“ oder „Vergiss, dass …“. Das Gedächtnis liegt nur auf diesem Mac.",
      zeigen: settings.brain.configured,
      inhalt: <MemorySetup />,
    },
    {
      id: "handy",
      kurz: "Handy",
      title: "Handy (Telegram)",
      text: "Über Telegram hast du JARVIS auch unterwegs dabei: Er schickt dir morgens das Briefing, erinnert dich an Termine, meldet Warnungen und Trades, und du kannst ihm schreiben wie in der App. Dafür legst du dir bei Telegram einen eigenen Bot an. JARVIS antwortet nur deinem Handy, und dein Mac bleibt von außen unerreichbar.",
      inhalt: <TelegramSetup />,
    },
    {
      id: "mitteilungen",
      kurz: "Mitteilungen",
      title: "Mitteilungen am Mac",
      text: "JARVIS kann sich auch am Mac selbst melden, ohne Handy: als Mitteilung von macOS oben rechts am Bildschirm, auch wenn das Fenster von JARVIS gerade nicht vorn ist. Dafür wird nichts installiert, und nichts verlässt den Mac.",
      inhalt: <MitteilungenSetup />,
    },
    {
      id: "rueckfrage",
      kurz: "Rückfrage",
      title: "Rückfrage vor Käufen",
      text: `Ab dieser Grenze kauft der Trading-Desk nicht selbst. JARVIS fragt dich per Telegram mit Ja/Nein-Knöpfen und oben in JARVIS, und kauft erst nach deinem Ja. Ohne Antwort verfällt die Frage nach ${APPROVAL.timeoutMinutes} Minuten, dann wird nicht gekauft.`,
      inhalt: <ApprovalSetup />,
    },
    {
      id: "crawler",
      kurz: "Grok",
      title: "Grok: Crawler auf X und Intel",
      text: "Wie im GrokBot-Video liest der Crawler vor jedem Kauf, was auf X über den Coin geschrieben wird, und prüft das X-Konto des Projekts. Gelesen werden nur Coins, die Blockchain und Projektseite schon bestanden haben. Mit demselben Schlüssel liest Intel die Nachrichten und X für dein Briefing; Themen und Budget dafür stellst du in der Intel-Ansicht ein.",
      inhalt: <CrawlerSetup />,
    },
    {
      id: "rohstoffe",
      kurz: "Rohstoffe",
      title: "Rohstoffe: Gold, Silber, Öl",
      text: "Neben den Memecoins handelt der Spielgeld-Desk auch Gold, Silber und Öl. Dort folgt er dem Trend: Er kauft, wenn der Kurs seit Stunden nach oben zieht, und steigt mit einem Nachlauf-Stop aus, sobald es kippt. Die Kurse kommen von Twelve Data; der kostenlose Plan reicht.",
      inhalt: <CommoditySetup />,
    },
    {
      id: "obsidian",
      kurz: "Obsidian",
      title: "Obsidian",
      text: "Aus diesem Tresor liest JARVIS deine Aufgaben. Neue Aufgaben landen in JARVIS/Eingang.md, Notizen in JARVIS/Notizen.md.",
      inhalt: <VaultSetup />,
    },
    {
      id: "kalender",
      kurz: "Kalender",
      title: "Kalender",
      text: "JARVIS liest die Kalender-App auf deinem Mac und trägt neue Termine auf Zuruf ein. Ändern oder löschen kann er nichts. Einen Schlüssel braucht es nicht, nur einmal die Freigabe von macOS.",
      inhalt: <CalendarSetup />,
    },
    {
      id: "microsoft",
      kurz: "Microsoft 365",
      title: "Microsoft 365: Termine aus Outlook",
      text: "JARVIS liest deine Termine aus Outlook und zeigt sie im Raum Kalender. Er trägt dort nichts ein, ändert und löscht nichts, und Mails, Dateien oder Teams liest er darüber nicht. Als privat oder vertraulich markierte Termine zeigt er ohne Titel und Ort.",
      inhalt: <MicrosoftSetup />,
    },
    {
      id: "email",
      kurz: "E-Mail",
      title: "E-Mail",
      text: "JARVIS liest deinen Posteingang über IMAP. Er löscht nichts und verschickt nichts; markieren als gelesen geht nur auf deinen Zuruf.",
      inhalt: <MailSetup />,
    },
    {
      id: "sprache",
      kurz: "Sprache",
      title: "Sprache",
      text: "Sag „Jarvis“ und dann, was du brauchst, zum Beispiel „Jarvis, wie läuft der Handel?“. Nach seiner Antwort hört er noch ein paar Sekunden zu, da reicht die nächste Frage ohne „Jarvis“. Unterbrechen kannst du ihn jederzeit: Sag einfach „Stopp“, drück Escape oder sprich ihn mit „Jarvis“ neu an.",
      inhalt: <HandsFreeSetup />,
    },
    {
      id: "aussehen",
      kurz: "Aussehen",
      title: "Aussehen",
      text: "Jeder Raum hat ein eigenes Fenster mit eigener Aussicht. Beim Wechsel fährt die Kamera seitlich in den nächsten Raum. Alle Fotos stehen unter freien Creative-Commons-Lizenzen und stammen aus den Hintergrundbildern von Ubuntu.",
      inhalt: <Aussicht />,
    },
    {
      id: "stimme",
      kurz: "Stimme",
      title: "Stimme",
      text: "So klingt JARVIS, wenn er dir antwortet. Die Stimme des Macs kostet nichts und bleibt auf dem Mac.",
      inhalt: (
        <>
          <VoicePicker />
          <div className="mt-4 border-t border-schiefer/10 pt-4">
            <CloudVoiceSetup />
          </div>
        </>
      ),
    },
    {
      id: "sicherheit",
      kurz: "Sicherheit",
      title: "Sicherheit",
      text: "Jedes Werkzeug, das eine KI benutzt, läuft durch das Security Gateway: Es prüft nach festen Regeln, fragt dich vor Änderungen und schreibt alles ins Audit-Log.",
      inhalt: <SicherheitsZentrale />,
    },
    {
      id: "datenschutz",
      kurz: "Datenschutz",
      title: "Datenschutz",
      inhalt: <Datenschutz configFile={settings.configFile} />,
    },
  ];
  return alle.filter((a) => a.zeigen !== false);
}

export function SettingsView() {
  const { settings } = useJarvis();
  const abschnitte = settings ? abschnitteVon(settings) : [];
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="einstellungen" title="Einstellungen" subtitle="Alles bleibt auf deinem Mac." />
      {!settings ? (
        <p className="text-sm text-quiet">Lade Einstellungen …</p>
      ) : (
        <>
          <nav aria-label="Abschnitte der Einstellungen" className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {abschnitte.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="font-medium text-see underline-offset-4 hover:underline focus-visible:underline">
                {a.kurz}
              </a>
            ))}
          </nav>
          {abschnitte.map((a) => (
            <Section key={a.id} id={a.id} title={a.title} text={a.text}>
              {a.inhalt}
            </Section>
          ))}
        </>
      )}
    </main>
  );
}

function Datenschutz({ configFile }: { configFile: string }) {
  return (
    <ul className="space-y-1.5 text-sm text-schiefer/85">
      <li>
        Freihändig hört der Browser dauerhaft mit, damit er „Jarvis“ erkennt. Hat Chrome das deutsche Sprachpaket, bleibt der Ton auf dem Mac; sonst schickt Chrome
        ihn zur Erkennung an Google, Safari an Apple. Ausschalten mit dem Schalter oder „Jarvis, Mikrofon aus“.
      </li>
      <li>
        Mit eingeschalteter ElevenLabs-Stimme geht jeder Satz, den JARVIS laut vorliest, zum Vertonen an ElevenLabs, auch wenn er aus Mails, Terminen oder
        Aufgaben stammt. Ausgeschaltet oder ohne Schlüssel spricht der Mac, und nichts davon verlässt ihn.
      </li>
      <li>Mit Grok gehen Name, Symbol, Adresse und Konten der geprüften Coins an xAI, und für Intel deine Themen. Sonst nichts von dir.</li>
      <li>
        Mit KI-Gehirn gehen deine Frage, die letzten Sätze des Gesprächs, was JARVIS sich über dich gemerkt hat, und das, was Claude dafür nachliest (Aufgaben,
        Mails), verschlüsselt an Anthropic. Sucht Claude im Web, gehen nur seine Suchbegriffe an die Suche; Links aus deinen Mails ruft er nicht auf. Claude kann
        keine Mails schreiben oder löschen; Änderungen an Aufgaben, Terminen, Mails und Gedächtnis führt JARVIS erst nach deinem Ja per Knopf aus.
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
        Deine Einstellungen liegen in <code className="text-stein">{configFile}</code>, lesbar nur für deinen Benutzer. Schlüssel und Mail-Passwort
        stehen dort im Klartext, bis du sie unter Sicherheit in den macOS-Schlüsselbund umziehst.
      </li>
    </ul>
  );
}

function Section({ id, title, text, children }: { id?: string; title: string; text?: string; children: ReactNode }) {
  return (
    <Panel id={id}>
      <h2 className="text-sm font-bold text-schiefer">{title}</h2>
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
      <ol className="list-decimal space-y-1 pl-5 text-schiefer/85">
        <li>
          Auf{" "}
          <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer" className="text-see underline hover:text-schiefer">
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
        <Button type="submit" tone="primary" fest disabled={busy || !key.trim()}>
          {busy ? "Prüfe …" : "Prüfen und speichern"}
        </Button>
      </div>
      <p className="text-xs text-quiet">
        JARVIS nutzt {MODELLE.gespraech.name}. Eine Frage kostet meist ein bis drei Cent, je nachdem, wie viel er dafür nachlesen muss; sucht er im Web, kommt etwa ein Cent
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
              <span className="min-w-0 flex-1 text-schiefer/90">
                {f.text}
                <span className="ml-2 text-xs text-quiet">seit {SINCE.format(new Date(f.at))}</span>
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
            <span className="text-down">Wirklich alles vergessen?</span>
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
        <ol className="list-decimal space-y-1 pl-5 text-schiefer/85">
          <li>
            Auf{" "}
            <a href="https://console.x.ai" target="_blank" rel="noreferrer" className="text-see underline hover:text-schiefer">
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
          <Button type="submit" tone="primary" fest disabled={busy || !key.trim()}>
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
        aufgebraucht, prüft der Crawler bis morgen ohne X weiter: Blockchain und Projektseite liest er trotzdem. Ein höheres Budget heißt, dass mehr Coins auch auf X
        geprüft werden.
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

function CommoditySetup() {
  const { settings, setSettings } = useJarvis();
  const info = settings?.commodities;
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
    send({ action: "twelvedata", apiKey: key });
  };

  return (
    <div className="space-y-3 text-sm">
      {info?.configured && <Notice tone="ok">{info.hint ? `Verbunden mit dem Schlüssel ${info.hint}.` : "Verbunden über TWELVEDATA_API_KEY."} Der Desk schaut alle 6 Minuten auf Gold, Silber und Öl.</Notice>}
      <form onSubmit={submit} className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-schiefer/85">
          <li>
            Auf{" "}
            <a href="https://twelvedata.com" target="_blank" rel="noreferrer" className="text-see underline hover:text-schiefer">
              twelvedata.com
            </a>{" "}
            kostenlos registrieren. Der Plan „Basic“ kostet nichts, eine Karte brauchst du nicht.
          </li>
          <li>Im Dashboard unter „API Keys“ den Schlüssel kopieren und hier einfügen.</li>
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={info?.hint ? `gespeichert (${info.hint}), zum Ändern neuen einfügen` : "Schlüssel von Twelve Data"}
            aria-label="Twelve-Data-Schlüssel"
            className={inputClass}
          />
          <Button type="submit" tone="primary" fest disabled={busy || !key.trim()}>
            {busy ? "Prüfe …" : "Prüfen und speichern"}
          </Button>
        </div>
      </form>
      <ul className="space-y-1 text-xs text-schiefer/85">
        <li>· Je Rohstoff höchstens {COMMODITY_RULES.tradeShare * 100} % des Kontos, zusammen also höchstens {COMMODITY_RULES.tradeShare * 300} %.</li>
        <li>· Gold kommt als Feinunze. Liefert dein Plan Silber und Öl nicht direkt, nimmt der Desk die US-Fonds SLV und USO. Die handeln nur zur Börsenzeit in New York (15:30 bis 22 Uhr).</li>
        <li>· Ist ein Markt zu, wird dort weder gekauft noch verkauft. Am Wochenende ruhen alle drei.</li>
        <li>· Kosten wie bei einem Online-Broker: 1 $ pro Auftrag und eine kleine Spanne.</li>
      </ul>
      {info?.hint && (
        <Button tone="danger" disabled={busy} onClick={() => send({ action: "removeTwelvedata" })}>
          Schlüssel entfernen
        </Button>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </div>
  );
}

// Hinweise am Tag als Mitteilung von macOS. Der Schalter ist unabhängig vom Handy; die Probe zeigt, ob macOS
// die Mitteilung auch wirklich anzeigt (Erlaubnis, Fokus), denn das kann JARVIS selbst nicht sehen.
function MitteilungenSetup() {
  const { settings, setSettings } = useJarvis();
  const m = settings?.mitteilungen;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function send(body: object) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await postJson<Settings & { message?: string }>("/api/einstellungen", body);
      setSettings(next);
      setMessage(next.message ? { tone: "ok", text: next.message } : null);
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  if (!m) return null;
  return (
    <div className="space-y-3 text-sm">
      {!m.moeglich && <Notice tone="error">Mitteilungen gibt es nur auf dem Mac. JARVIS läuft gerade auf einem anderen Rechner.</Notice>}
      <label className="flex items-start gap-3 text-schiefer/85">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-gletscher"
          checked={m.hinweise}
          disabled={busy || (!m.moeglich && !m.hinweise)}
          onChange={(e) => send({ action: "macHinweise", an: e.target.checked })}
        />
        <span>
          Hinweise am Tag: wenn in einem Projekt etwas überfällig wird, eine Rückmeldung fehlt oder am Nachmittag noch etwas von heute offen ist
          <span className="block text-xs text-quiet">
            Aus, bis du es willst. Nur zwischen {HINWEIS_REGELN.vonStunde} und {HINWEIS_REGELN.bisStunde} Uhr, höchstens {HINWEIS_REGELN.hoechstensJeTag} am Tag, jedes Ding nur einmal. Unabhängig vom
            Handy: Du kannst beides einschalten oder nur eines.
          </span>
        </span>
      </label>
      <ul className="space-y-1 text-xs text-schiefer/85">
        <li>
          · In der Mitteilung stehen immer nur Zahlen, zum Beispiel „Eine Aufgabe ist überfällig“. Projektnamen und Aufgaben stehen dort nie, weil eine Mitteilung
          auch auf dem Sperrbildschirm oder beim Teilen des Bildschirms zu sehen ist. Die Einzelheiten zeigt der Raum Heute.
        </li>
        <li>· Ob eine Mitteilung erscheint, entscheidet macOS: Sie muss für den „Skripteditor“ erlaubt sein, und ein Fokus (Nicht stören) hält sie zurück.</li>
        <li>· Ein Klick auf die Mitteilung öffnet nicht JARVIS; macOS öffnet dabei meist den Skripteditor. Das lässt sich ohne Zusatzprogramm nicht ändern.</li>
      </ul>
      <Button disabled={busy || !m.moeglich} onClick={() => send({ action: "macMitteilungProbe" })}>
        {busy ? "Einen Moment …" : "Mitteilung zur Probe zeigen"}
      </Button>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </div>
  );
}

function ApprovalSetup() {
  const { settings, setSettings, desk } = useJarvis();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = settings?.approval.limitUsd;
  const account = desk && desk.status !== "aus" ? desk.equity : SAFETY.startCapitalUsd;
  const low = Math.floor(account * SAFETY.minTradeShare);
  const high = Math.floor(account * SAFETY.maxTradeShare);
  const metal = Math.floor(account * COMMODITY_RULES.tradeShare);

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
                on ? "border-schiefer/80 bg-gletscher/20 text-schiefer" : "border-schiefer/20 bg-gletscher/5 text-stein/80 hover:border-schiefer/50"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-quiet">
        Im Spielgeld-Test kostet ein Coin {low} bis {high} $ ({SAFETY.minTradeShare * 100} bis {SAFETY.maxTradeShare * 100} % des Kontos), Gold, Silber oder Öl je
        etwa {metal} $.{" "}
        {current === null
          ? "Mit „Nie fragen“ kauft der Desk sofort selbst und meldet dir jeden Kauf danach. So verpasst er keine schnelle Chance."
          : current !== undefined && low >= current
            ? "Mit dieser Grenze fragt JARVIS also vor jedem Kauf. Schnelle Chancen sind manchmal weg, bis du antwortest."
            : "Mit dieser Grenze kauft der Desk kleinere Coins selbst; größere Käufe brauchen dein Ja."}
      </p>
      <ul className="space-y-1 text-xs text-schiefer/85">
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
      <label className="flex items-center gap-3 text-sm text-schiefer/85">
        <input type="checkbox" checked={voice.handsFree} onChange={(e) => voice.setHandsFree(e.target.checked)} className="h-4 w-4 accent-gletscher" />
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

// Die Aussicht jedes Raums ist ein Foto unter freier Lizenz. Der Nachweis steht offen da, nicht versteckt.
function Aussicht() {
  return (
    <ul className="divide-y divide-schiefer/10 text-sm">
      {RAEUME.map((r) => {
        const foto = PHOTOS[r.foto as keyof typeof PHOTOS];
        return (
          <li key={r.href} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
            <span className="w-32 shrink-0 font-bold text-schiefer">{r.name}</span>
            <span className="min-w-0 flex-1 text-stein">{foto.title}</span>
            <span className="text-xs text-quiet">
              Foto: {foto.author}, {foto.license}
            </span>
          </li>
        );
      })}
    </ul>
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
