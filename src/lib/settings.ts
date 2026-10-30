import type { ApprovalLimit } from "./approval";
import type { MailProviderId } from "./mailProviders";
import type { TelegramStatus } from "./telegram";

// Was die Einstellungen-Seite vom Server bekommt. Ein Passwort ist nie dabei.
export type Settings = {
  name: string;
  vaultPath: string | null;
  detectedVaults: { name: string; path: string }[];
  mail: { provider: MailProviderId; host: string; port: number; user: string; hasPassword: boolean } | null;
  // Das KI-Gehirn: ob ein Claude-Schlüssel da ist und seine letzten Zeichen. Der Schlüssel selbst nie.
  brain: { configured: boolean; hint: string | null; fromEnv: boolean };
  // Grok für den Crawler: ob ein xAI-Schlüssel da ist und wie viel er am Tag ausgeben darf.
  crawler: { configured: boolean; hint: string | null; fromEnv: boolean; budgetUsd: number };
  // Twelve Data für Gold, Silber und Öl: ob ein Schlüssel da ist und seine letzten Zeichen.
  commodities: { configured: boolean; hint: string | null; fromEnv: boolean };
  // JARVIS auf dem Handy über Telegram.
  telegram: TelegramStatus;
  // Ab welchem Betrag der Desk vor einem Kauf fragt.
  approval: { limitUsd: ApprovalLimit };
  configFile: string;
};
