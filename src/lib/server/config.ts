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
};

// Twelve Data liefert die Kurse für Gold, Silber und Öl. Der kostenlose Plan reicht.
export type TwelveDataConfig = { apiKey: string };

// ElevenLabs gibt JARVIS eine natürlichere Stimme. Ohne Schlüssel und ohne Schalter (enabled) spricht der Mac.
// tagesZeichen begrenzt, wie viele Zeichen am Tag an ElevenLabs gehen dürfen.
export type ElevenlabsConfig = { apiKey: string; enabled?: boolean; voiceId?: string; voiceName?: string; model?: string; tagesZeichen?: number };

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
  elevenlabs?: ElevenlabsConfig;
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

type Tresor = { werte: Map<string, string>; unlesbar: Map<string, string> };
const holder = globalThis as typeof globalThis & { __jarvisTresor?: Tresor };
const tresor: Tresor = (holder.__jarvisTresor ??= { werte: new Map(), unlesbar: new Map() });

// Welche Einträge sich zuletzt nicht aus dem Schlüsselbund lesen ließen, mit Grund.
export const unlesbareGeheimnisse = () => new Map(tresor.unlesbar);
// Nach einem Umzug oder in Tests: beim nächsten Lesen neu aus dem Schlüsselbund holen.
export const vergissGeheimnisse = () => {
  tresor.werte.clear();
  tresor.unlesbar.clear();
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

export async function readConfig(): Promise<JarvisConfig> {
  const config = await readConfigFile();
  if (config.geheimnisse !== "schluesselbund") return config;
  for (const { name } of GEHEIMNISSE) {
    if (geheimnisLesen(config, name) !== GEHEIM_MARKE) continue;
    let wert = tresor.werte.get(name);
    if (wert === undefined) {
      try {
        const gelesen = await lies(name);
        if (gelesen === null) tresor.unlesbar.set(name, "fehlt im Schlüsselbund");
        else {
          wert = gelesen;
          tresor.werte.set(name, gelesen);
          tresor.unlesbar.delete(name);
        }
      } catch (e) {
        tresor.unlesbar.set(name, e instanceof SchluesselbundFehler ? e.message : "nicht lesbar");
      }
    }
    // Ohne Wert gilt der Dienst als nicht eingerichtet; die Marke bleibt in der Datei (siehe writeConfig).
    geheimnisSetzen(config, name, wert ?? "");
  }
  return config;
}

export async function writeConfig(config: JarvisConfig): Promise<void> {
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
        continue;
      }
      if (wert === "" && tresor.unlesbar.has(name)) {
        // War nicht lesbar (Schlüsselbund gesperrt?): nie aus Versehen löschen, Marke bleibt.
        geheimnisSetzen(datei, name, GEHEIM_MARKE);
        continue;
      }
      if (wert !== GEHEIM_MARKE && tresor.werte.get(name) !== wert) {
        await schreibe(name, wert);
        tresor.werte.set(name, wert);
        tresor.unlesbar.delete(name);
      }
      geheimnisSetzen(datei, name, GEHEIM_MARKE);
    }
  }
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  // Erst in eine Nebendatei, dann umbenennen: Bricht etwas ab, bleibt die alte Datei ganz.
  await fs.writeFile(`${FILE}.tmp`, JSON.stringify(datei, null, 2), { mode: 0o600 });
  await fs.rename(`${FILE}.tmp`, FILE);
}

export const CONFIG_FILE = FILE;

// ~ am Anfang eines Pfads ist der Benutzerordner, so wie im Terminal.
export function expandHome(p: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}
