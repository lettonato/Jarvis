import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ApprovalLimit } from "../approval";
import type { MailProviderId } from "../mailProviders";

// Die Einstellungen liegen im Benutzerordner unter ~/.jarvis, damit sie ein Update von JARVIS
// überstehen. Die Datei bleibt auf dem Mac, nur du kannst sie lesen, und sie wird nie hochgeladen.

export type MailConfig = { provider: MailProviderId; host: string; port: number; user: string; password: string };

// Der Schlüssel für Claude (das KI-Gehirn) bleibt wie das Mail-Passwort nur hier.
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
  briefing?: string | null;
};

// Twelve Data liefert die Kurse für Gold, Silber und Öl. Der kostenlose Plan reicht.
export type TwelveDataConfig = { apiKey: string };

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
};

export const DEFAULT_X_BUDGET_USD = 1;

// Der Schlüssel aus den Einstellungen geht vor, sonst XAI_API_KEY aus der Umgebung.
export const grokKey = (config: JarvisConfig) => config.xai?.apiKey || process.env.XAI_API_KEY || null;
export const twelveKey = (config: JarvisConfig) => config.twelvedata?.apiKey || process.env.TWELVEDATA_API_KEY || null;
export const xBudget = (config: JarvisConfig) => config.xai?.dailyBudgetUsd ?? DEFAULT_X_BUDGET_USD;

export const CONFIG_DIR = process.env.JARVIS_CONFIG_DIR ?? path.join(os.homedir(), ".jarvis");
const FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULTS: JarvisConfig = { name: "Benedikt" };

export async function readConfig(): Promise<JarvisConfig> {
  try {
    return { ...DEFAULTS, ...(JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<JarvisConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeConfig(config: JarvisConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

// ~ am Anfang eines Pfads ist der Benutzerordner, so wie im Terminal.
export function expandHome(p: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}
