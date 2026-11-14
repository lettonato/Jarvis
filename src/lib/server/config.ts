import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ApprovalLimit } from "../approval";
import type { MailProviderId } from "../mailProviders";
import { lies, loesche, SchluesselbundFehler, schreibe } from "./schluesselbund";

// Die Einstellungen liegen im Benutzerordner unter ~/.jarvis, damit sie ein Update von JARVIS
// überstehen. Die Datei bleibt auf dem Mac, nur du kannst sie lesen, und sie wird nie hochgeladen.

export type MailConfig = { provider: MailProviderId; host: string; port: number; user: string; password: string };

// Der Schlüssel für Claude (das KI-Gehirn) bleibt wie das Mail-Passwort auf dem Mac: in dieser Datei oder,
// nach dem Umzug, im macOS-Schlüsselbund (siehe GEHEIMNISSE unten).
export type ClaudeConfig = { apiKey: string };

// Grok von xAI liest für den Crawler X mit. Das Tagesbudget begrenzt, was das kosten darf.
export type XaiConfig = { apiKey: string; dailyBudgetUsd?: number };

// Der Apple-Kalender braucht keinen Schlüssel, nur die Freigabe von macOS. Hier steht nur, in welchen
// Kalender JARVIS neue Termine einträgt (leer: der Standardkalender des Macs).
export type CalendarConfig = { target?: string };

// Intel liest mit demselben xAI-Schlüssel Nachrichten und X. Eigene Themen und ein eigenes Tagesbudget.
export type IntelConfig = { topics?: string[]; budgetUsd?: number; auto?: boolean };

// Telegram bringt JARVIS aufs Handy. Der Schlüssel gehört zu deinem eigenen Bot; JARVIS antwortet nur dem
// einen Chat, der sich mit dem Code aus den Einstellungen gekoppelt hat. Briefing ist eine Uhrzeit (HH:MM) oder null.
export type TelegramConfig = {
  token: string;
  bot: string;
  chatId?: number;
  chatName?: string;
  trades?: boolean;
  warnings?: boolean;
  reminders?: boolean;
  projekte?: boolean;
  briefing?: string | null;
  // Uhrzeit (HH:MM) für den Tagesabschluss oder null. Fehlt der Wert, kommt keiner.
  abschluss?: string | null;
  // Hinweise am Tag (überfällig geworden, Rückmeldung fehlt, heute noch offen). Fehlt der Wert, kommen keine.
  hinweise?: boolean;
};

// Der Edelmetall-Agent: ob er nach Zeitplan liest und zu welchen Uhrzeiten (HH:MM). Fehlt etwas, gilt der
// Vorschlag aus src/lib/metalle.ts.
export type MetalleConfig = { auto?: boolean; zeiten?: string[] };

// Twelve Data liefert die Kurse für Gold, Silber und Öl. Der kostenlose Plan reicht.
export type TwelveDataConfig = { apiKey: string };

// ElevenLabs gibt JARVIS eine natürlichere Stimme. Ohne Schlüssel und ohne Schalter (enabled) spricht der Mac.
// tagesZeichen begrenzt, wie viele Zeichen am Tag an ElevenLabs gehen dürfen.
export type ElevenlabsConfig = { apiKey: string; enabled?: boolean; voiceId?: string; voiceName?: string; model?: string; tagesZeichen?: number };

// Microsoft 365 (src/lib/microsoft.ts): Verzeichnis und Anwendung aus Entra, das verbundene Konto und der
// Schlüssel, mit dem JARVIS angemeldet bleibt (refreshToken, ein Geheimnis). extern: Outlook-Termine dürfen ins
// Gespräch mit dem KI-Modell und über Telegram; fehlt der Wert, bleiben sie am Mac.
export type MicrosoftConfig = { tenantId: string; clientId: string; konto?: string; refreshToken?: string; extern?: boolean };

// Ab welchem Betrag der Desk vor einem Kauf fragt (src/lib/approval.ts). Fehlt der Wert, gilt die Grenze von dort.
export type ApprovalConfig = { limitUsd: ApprovalLimit };

export type JarvisConfig = {
  name: string;
  vaultPath?: string;
  mail?: MailConfig;
  claude?: ClaudeConfig;
  xai?: XaiConfig;
  calendar?: CalendarConfig;
  intel?: IntelConfig;
  telegram?: TelegramConfig;
  approval?: ApprovalConfig;
  twelvedata?: TwelveDataConfig;
  metalle?: MetalleConfig;
  elevenlabs?: ElevenlabsConfig;
  microsoft?: MicrosoftConfig;
  // Wo Schlüssel und Passwörter liegen: in dieser Datei (bisher) oder im macOS-Schlüsselbund.
  geheimnisse?: GeheimnisModus;
};

// ---------- Zugangsdaten ----------
// Im Modus „schluesselbund“ steht in config.json statt des Werts nur GEHEIM_MARKE; readConfig holt den Wert
// aus dem Schlüsselbund, writeConfig legt ihn dort ab. Wer readConfig benutzt, merkt davon nichts.

export type GeheimnisModus = "datei" | "schluesselbund";
export const GEHEIM_MARKE = "@schluesselbund";

export const GEHEIMNISSE = [
  { name: "claude.apiKey", label: "Claude-Schlüssel", umgebung: "ANTHROPIC_API_KEY" },
  { name: "xai.apiKey", label: "xAI-Schlüssel (Grok)", umgebung: "XAI_API_KEY" },
  { name: "twelvedata.apiKey", label: "Twelve-Data-Schlüssel", umgebung: "TWELVEDATA_API_KEY" },
  { name: "mail.password", label: "Mail-Passwort", umgebung: null },
  { name: "telegram.token", label: "Telegram-Bot-Schlüssel", umgebung: null },
  { name: "elevenlabs.apiKey", label: "ElevenLabs-Schlüssel", umgebung: null },
  { name: "microsoft.refreshToken", label: "Microsoft-365-Anmeldung", umgebung: null },
] as const;

export type GeheimnisName = (typeof GEHEIMNISSE)[number]["name"];

export function geheimnisLesen(config: JarvisConfig, name: GeheimnisName): string | undefined {
  const [teil, feld] = name.split(".");
  const v = (config as unknown as Record<string, Record<string, unknown> | undefined>)[teil]?.[feld];
  return typeof v === "string" ? v : undefined;
}

function geheimnisSetzen(config: JarvisConfig, name: GeheimnisName, wert: string) {
  const [teil, feld] = name.split(".");
  const obj = (config as unknown as Record<string, Record<string, unknown> | undefined>)[teil];
  if (obj) obj[feld] = wert;
}

// versucht: wann ein Eintrag zuletzt vergeblich gelesen wurde. Solange die Pause läuft, fragt JARVIS den
// Schlüsselbund nicht erneut; sonst startete jede Anfrage das Programm `security` neu und macOS fragte bei
// gesperrtem Schlüsselbund womöglich immer wieder nach dem Passwort.
type Tresor = { werte: Map<string, string>; unlesbar: Map<string, string>; versucht: Map<string, number> };
const holder = globalThis as typeof globalThis & { __jarvisTresor?: Tresor };
const tresor: Tresor = (holder.__jarvisTresor ??= { werte: new Map(), unlesbar: new Map(), versucht: new Map() });
tresor.versucht ??= new Map();
export const SCHLUESSELBUND_PAUSE_MS = 20_000;

// Welche Einträge sich zuletzt nicht aus dem Schlüsselbund lesen ließen, mit Grund.
export const unlesbareGeheimnisse = () => new Map(tresor.unlesbar);
// Nach einem Umzug oder in Tests: beim nächsten Lesen neu aus dem Schlüsselbund holen.
export const vergissGeheimnisse = () => {
  tresor.werte.clear();
  tresor.unlesbar.clear();
  tresor.versucht.clear();
};
export const merkeGeheimnis = (name: string, wert: string) => tresor.werte.set(name, wert);

export const DEFAULT_X_BUDGET_USD = 1;

// Der Schlüssel aus den Einstellungen geht vor, sonst XAI_API_KEY aus der Umgebung.
export const grokKey = (config: JarvisConfig) => config.xai?.apiKey || process.env.XAI_API_KEY || null;
export const twelveKey = (config: JarvisConfig) => config.twelvedata?.apiKey || process.env.TWELVEDATA_API_KEY || null;
export const xBudget = (config: JarvisConfig) => config.xai?.dailyBudgetUsd ?? DEFAULT_X_BUDGET_USD;

export const CONFIG_DIR = process.env.JARVIS_CONFIG_DIR ?? path.join(os.homedir(), ".jarvis");
const FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULTS: JarvisConfig = { name: "Benedikt" };

// Die Datei, wie sie auf der Platte steht (im Schlüsselbund-Modus nur mit Marken statt Werten).
export async function readConfigFile(): Promise<JarvisConfig> {
  try {
    return { ...DEFAULTS, ...(JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<JarvisConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function readConfig(jetzt = Date.now()): Promise<JarvisConfig> {
  const config = await readConfigFile();
  if (config.geheimnisse !== "schluesselbund") return config;
  for (const { name } of GEHEIMNISSE) {
    if (geheimnisLesen(config, name) !== GEHEIM_MARKE) continue;
    let wert = tresor.werte.get(name);
    const zuletzt = tresor.versucht.get(name);
    if (wert === undefined && (zuletzt === undefined || jetzt - zuletzt >= SCHLUESSELBUND_PAUSE_MS || jetzt < zuletzt)) {
      try {
        const gelesen = await lies(name);
        if (gelesen === null) {
          tresor.unlesbar.set(name, "fehlt im Schlüsselbund");
          tresor.versucht.set(name, jetzt);
        } else {
          wert = gelesen;
          tresor.werte.set(name, gelesen);
          tresor.unlesbar.delete(name);
          tresor.versucht.delete(name);
        }
      } catch (e) {
        tresor.unlesbar.set(name, e instanceof SchluesselbundFehler ? e.message : "nicht lesbar");
        tresor.versucht.set(name, jetzt);
      }
    }
    // Ohne Wert gilt der Dienst als nicht eingerichtet; die Marke bleibt in der Datei (siehe writeConfig).
    geheimnisSetzen(config, name, wert ?? "");
  }
  return config;
}

// Speichern läuft immer nacheinander: Zwei Anfragen zur selben Zeit (Einstellungen und Telegram etwa) würden
// sich sonst die Nebendatei gegenseitig wegziehen oder halb überschreiben.
const warteschlange = globalThis as typeof globalThis & { __jarvisConfigSchreiben?: Promise<unknown> };
let nebendatei = 0;

// Schreibt genau, was es bekommt, auch einen veralteten Stand. Nur für die erste Einrichtung und für Tests; im
// Programm ändert jede Stelle über aendereConfig (ein Test prüft, dass sonst niemand writeConfig benutzt).
export function writeConfig(config: JarvisConfig): Promise<void> {
  const lauf = (warteschlange.__jarvisConfigSchreiben ?? Promise.resolve()).then(() => schreibeConfig(config));
  warteschlange.__jarvisConfigSchreiben = lauf.catch(() => {});
  return lauf;
}

// Lesen, ändern und speichern in einem Zug, in derselben Reihe wie jedes andere Speichern: Dazwischen kommt
// keine zweite Änderung, die sonst mit ihrem älteren Stand die erste wieder überschriebe. fn bekommt den Stand
// von jetzt und gibt den neuen zurück, oder null, wenn nichts zu ändern ist.
// danach läuft nach dem Speichern noch in derselben Reihe, also bevor die nächste Änderung drankommt (der Umzug
// der Zugangsdaten räumt so auf, ohne dass ihm ein anderes Speichern dazwischenkommt).
export function aendereConfig(fn: (config: JarvisConfig) => JarvisConfig | null, danach?: (neu: JarvisConfig) => Promise<void>): Promise<JarvisConfig> {
  const lauf = (warteschlange.__jarvisConfigSchreiben ?? Promise.resolve()).then(async () => {
    const alt = await readConfig();
    const neu = fn(alt);
    if (neu) await schreibeConfig(neu);
    if (neu && danach) await danach(neu);
    return neu ?? alt;
  });
  warteschlange.__jarvisConfigSchreiben = lauf.catch(() => {});
  return lauf;
}

async function schreibeConfig(config: JarvisConfig): Promise<void> {
  const datei: JarvisConfig = structuredClone(config);
  if (config.geheimnisse === "schluesselbund") {
    const vorher = await readConfigFile();
    for (const { name } of GEHEIMNISSE) {
      const wert = geheimnisLesen(config, name);
      if (wert === undefined) {
        // Abschnitt entfernt (z. B. Telegram getrennt): Eintrag im Schlüsselbund mit löschen.
        if (geheimnisLesen(vorher, name) === GEHEIM_MARKE) await loesche(name);
        tresor.werte.delete(name);
        tresor.unlesbar.delete(name);
        tresor.versucht.delete(name);
        continue;
      }
      if (wert === "" && (tresor.unlesbar.has(name) || geheimnisLesen(vorher, name) === GEHEIM_MARKE)) {
        // Ein leerer Wert für einen Eintrag, der im Schlüsselbund liegt, heißt nie „löschen“ (dafür wird der
        // Abschnitt entfernt), sondern: Beim Lesen war der Schlüsselbund nicht lesbar. Das gilt auch, wenn er
        // inzwischen wieder aufgegangen ist. Der Eintrag bleibt unangetastet, die Marke bleibt in der Datei.
        geheimnisSetzen(datei, name, GEHEIM_MARKE);
        continue;
      }
      // Ein leerer Wert ohne Eintrag im Schlüsselbund ist kein Geheimnis (etwa ein Tagesbudget für X, wenn der
      // Schlüssel nur aus der Umgebung kommt): Er bleibt leer in der Datei und kommt nicht in den Schlüsselbund.
      if (wert === "") continue;
      if (wert !== GEHEIM_MARKE && tresor.werte.get(name) !== wert) {
        await schreibe(name, wert);
        tresor.werte.set(name, wert);
        tresor.unlesbar.delete(name);
        tresor.versucht.delete(name);
      }
      geheimnisSetzen(datei, name, GEHEIM_MARKE);
    }
  }
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  // Erst in eine Nebendatei, dann umbenennen: Bricht etwas ab, bleibt die alte Datei ganz.
  const tmp = `${FILE}.${process.pid}.${++nebendatei}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(datei, null, 2), { mode: 0o600 });
    await fs.rename(tmp, FILE);
  } catch (e) {
    await fs.rm(tmp, { force: true });
    throw e;
  }
}

export const CONFIG_FILE = FILE;

// ~ am Anfang eines Pfads ist der Benutzerordner, so wie im Terminal.
export function expandHome(p: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}
