// Bekannte Mail-Anbieter mit ihren IMAP-Servern. JARVIS liest das Postfach über IMAP,
// so wie es auch Apple Mail tut. Outlook.com und Hotmail erlauben das nur noch mit Microsoft-Anmeldung,
// das kommt später.

export type MailProviderId = "t-online" | "gmail" | "icloud" | "gmx" | "webde" | "andere";

export type MailProvider = { id: MailProviderId; name: string; host: string; port: number; hint: string };

export const MAIL_PROVIDERS: MailProvider[] = [
  {
    id: "t-online",
    name: "Telekom (t-online.de)",
    host: "secureimap.t-online.de",
    port: 993,
    hint: "Die Telekom verlangt für Programme wie JARVIS ein eigenes E-Mail-Passwort, nicht dein Telekom-Login. Du legst es im E-Mail Center unter Einstellungen im Bereich Passwörter an.",
  },
  {
    id: "gmail",
    name: "Gmail",
    host: "imap.gmail.com",
    port: 993,
    hint: "Google verlangt ein App-Passwort: myaccount.google.com → Sicherheit → App-Passwörter. Dafür muss die Bestätigung in zwei Schritten eingeschaltet sein.",
  },
  {
    id: "icloud",
    name: "iCloud",
    host: "imap.mail.me.com",
    port: 993,
    hint: "Apple verlangt ein app-spezifisches Passwort: account.apple.com → Anmelden und Sicherheit → App-spezifische Passwörter.",
  },
  {
    id: "gmx",
    name: "GMX",
    host: "imap.gmx.net",
    port: 993,
    hint: "Bei GMX musst du IMAP einmal einschalten: E-Mail → Einstellungen → POP3/IMAP Abruf.",
  },
  {
    id: "webde",
    name: "WEB.DE",
    host: "imap.web.de",
    port: 993,
    hint: "Bei WEB.DE musst du IMAP einmal einschalten: E-Mail → Einstellungen → POP3/IMAP Abruf.",
  },
  {
    id: "andere",
    name: "Anderer Anbieter",
    host: "",
    port: 993,
    hint: "IMAP-Server und Port stehen in der Hilfe deines Anbieters.",
  },
];

export const providerById = (id: string) => MAIL_PROVIDERS.find((p) => p.id === id) ?? MAIL_PROVIDERS[MAIL_PROVIDERS.length - 1];
