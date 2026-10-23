import type { MailProviderId } from "./mailProviders";

// Was die Einstellungen-Seite vom Server bekommt. Ein Passwort ist nie dabei.
export type Settings = {
  name: string;
  vaultPath: string | null;
  detectedVaults: { name: string; path: string }[];
  mail: { provider: MailProviderId; host: string; port: number; user: string; hasPassword: boolean } | null;
  // Das KI-Gehirn: ob ein Claude-Schlüssel da ist und seine letzten Zeichen. Der Schlüssel selbst nie.
  brain: { configured: boolean; hint: string | null; fromEnv: boolean };
  configFile: string;
};
