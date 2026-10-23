import type { MailProviderId } from "./mailProviders";

// Was die Einstellungen-Seite vom Server bekommt. Ein Passwort ist nie dabei.
export type Settings = {
  name: string;
  vaultPath: string | null;
  detectedVaults: { name: string; path: string }[];
  mail: { provider: MailProviderId; host: string; port: number; user: string; hasPassword: boolean } | null;
  configFile: string;
};
