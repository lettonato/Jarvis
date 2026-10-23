import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { MailProviderId } from "../mailProviders";

// Die Einstellungen liegen im Benutzerordner unter ~/.jarvis, damit sie ein Update von JARVIS
// überstehen. Die Datei bleibt auf dem Mac, nur du kannst sie lesen, und sie wird nie hochgeladen.

export type MailConfig = { provider: MailProviderId; host: string; port: number; user: string; password: string };

// Der Schlüssel für Claude (das KI-Gehirn) bleibt wie das Mail-Passwort nur hier.
export type ClaudeConfig = { apiKey: string };

export type JarvisConfig = { name: string; vaultPath?: string; mail?: MailConfig; claude?: ClaudeConfig };

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
