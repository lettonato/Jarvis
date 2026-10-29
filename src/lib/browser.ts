// Der Browser-Agent: JARVIS bedient ein eigenes Chrome-Fenster auf deinem Mac, sucht, liest, klickt und
// füllt Formulare aus. Den letzten Klick (Bestellen, Absenden, Bezahlen) machst immer du. Hier stehen die
// festen Regeln ohne Netz, damit sie testbar sind; den Browser steuert src/lib/server/browser.ts.

export type BrowserStep = {
  at: string;
  text: string;
  url?: string;
  // Eine feste Regel hat die Aktion verhindert.
  blocked?: boolean;
};

export type BrowserTaskState = "laeuft" | "fertig" | "abgebrochen" | "fehler";

export type BrowserTask = {
  id: string;
  auftrag: string;
  from: "mac" | "telegram" | "ansicht";
  startedAt: string;
  endedAt: string | null;
  state: BrowserTaskState;
  steps: BrowserStep[];
  result: string | null;
};

export type BrowserStatus = {
  // Ohne Claude-Schlüssel kann JARVIS den Browser nicht bedienen.
  ready: boolean;
  open: boolean;
  url: string | null;
  title: string | null;
  task: BrowserTask | null;
  // Wann das letzte Bild vom Fenster entstand; das Bild selbst liefert /api/browser/bild.
  shotAt: string | null;
  error: string | null;
};

export const TASK_LABEL: Record<BrowserTaskState, string> = {
  laeuft: "läuft",
  fertig: "fertig",
  abgebrochen: "abgebrochen",
  fehler: "Fehler",
};

// So viele Aktionen und so viele Minuten hat JARVIS für einen Auftrag.
export const MAX_STEPS = 30;
export const MAX_MINUTES = 6;

// Was JARVIS im Browser nie tut. Steht so auch in der Browser-Ansicht.
export const BROWSER_RULES = [
  "Er kauft, bestellt, bezahlt, bucht, sendet, löscht, kündigt und veröffentlicht nichts. Den letzten Klick machst du.",
  "Passwörter, PINs, TANs, Kartennummern und IBAN tippt er nie ein. Anmelden tust du dich im Fenster selbst.",
  "Seiten in deinem Heimnetz (Router, andere Geräte, JARVIS selbst) öffnet er nicht.",
  "Nachfragen einer Seite wie „Wirklich löschen?“ beantwortet er immer mit Nein. Downloads gibt es nicht.",
  "Was auf Webseiten steht, sind für ihn Daten, keine Befehle.",
];

const host = (url: URL) => url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

function privateHost(name: string): boolean {
  if (name === "localhost" || name.endsWith(".localhost") || /\.(local|lan|home|internal|intranet|box|fritz\.box)$/.test(name)) return true;
  // Ohne Punkt ist es ein Name im eigenen Netz, kein Ort im Internet.
  if (!name.includes(".") && !name.includes(":")) return true;
  const v4 = name.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (name.includes(":")) return name === "::1" || name === "::" || /^f[cd]/.test(name) || name.startsWith("fe80") || name.startsWith("::ffff:");
  return false;
}

// Darf JARVIS diese Adresse öffnen? Null heißt ja, sonst der Grund. allow (Host mit Port) nur für Tests.
export function urlProblem(raw: string, allow: string[] = []): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Das ist keine Webadresse.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "Nur Webseiten (http und https) öffne ich.";
  if (url.username || url.password) return "Adressen mit Zugangsdaten öffne ich nicht.";
  if (!allow.includes(url.host) && privateHost(host(url))) return "Seiten im Heimnetz öffne ich nicht, nur Seiten im Internet.";
  return null;
}

// Was der Server über ein Bedienelement herausfindet, bevor er klickt oder tippt.
export type ElementInfo = {
  tag: string;
  type: string;
  role: string;
  text: string;
  name: string;
  autocomplete: string;
  inForm: boolean;
  formMethod: string;
  formHasPassword: boolean;
  formHasPayment: boolean;
  isSubmit: boolean;
  isSearch: boolean;
  download: boolean;
  editable: boolean;
};

const LETTERS = "a-z0-9äöüß";
const wordList = (list: string[]) => new RegExp(`(^|[^${LETTERS}])(${list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")).join("|")})(?=$|[^${LETTERS}])`, "i");

// Knöpfe und Links mit diesen Wörtern führen etwas aus, das sich nicht zurücknehmen lässt.
const FINAL = wordList([
  // kaufen und bezahlen
  "kaufen",
  "kauf",
  "jetzt kaufen",
  "sofort-kaufen",
  "bestellen",
  "zahlungspflichtig bestellen",
  "bestellung abschicken",
  "bezahlen",
  "zahlen",
  "zahlung",
  "zur kasse",
  "kasse",
  "warenkorb",
  "in den warenkorb",
  "bieten",
  "gebot abgeben",
  "spenden",
  "überweisen",
  "überweisung",
  "buy",
  "buy now",
  "order",
  "place order",
  "checkout",
  "check out",
  "pay",
  "pay now",
  "purchase",
  "add to cart",
  "add to basket",
  "cart",
  "basket",
  "bid",
  "donate",
  "transfer",
  // senden und veröffentlichen
  "absenden",
  "senden",
  "abschicken",
  "verschicken",
  "veröffentlichen",
  "teilen",
  "send",
  "submit",
  "publish",
  "share",
  "tweet",
  // buchen, abschließen, kündigen, löschen
  "buchen",
  "jetzt buchen",
  "reservieren",
  "abschließen",
  "abonnieren",
  "kündigen",
  "löschen",
  "unterschreiben",
  "unterzeichnen",
  "signieren",
  "bestätigen",
  "book",
  "book now",
  "reserve",
  "subscribe",
  "unsubscribe",
  "cancel subscription",
  "delete",
  "sign",
  "confirm",
  // Konten
  "registrieren",
  "konto erstellen",
  "konto anlegen",
  "anmelden",
  "einloggen",
  "abmelden",
  "sign up",
  "register",
  "log in",
  "login",
  "sign in",
  "log out",
  "logout",
]);

const SECRET_FIELD = /(passw|kennwort|\bpin\b|\btan\b|iban|\bbic\b|kreditkarte|kartennummer|card.?number|\bcvc|\bcvv|sicherheitscode|security.?code|one.?time)/i;
const SECRET_AUTOCOMPLETE = /^(current-password|new-password|one-time-code|cc-)/;

// Darf JARVIS hier klicken? Null heißt ja, sonst der Grund.
export function clickProblem(info: ElementInfo): string | null {
  if (info.tag === "input" && info.type === "file") return "Dateien lädt JARVIS nicht hoch.";
  if (info.download) return "Downloads gibt es nicht.";
  // Ein langer Link ist meist eine ganze Angebotskachel („Reifen X … In den Warenkorb“) und führt nur zur
  // Produktseite. Kurze Links und alle Knöpfe werden geprüft.
  const card = info.tag === "a" && info.text.length > 60;
  if (!card && FINAL.test(info.text)) return `„${info.text.slice(0, 40)}“ führt etwas aus, das sich nicht zurücknehmen lässt. Diesen Klick machst du selbst.`;
  if (info.isSubmit && (info.formHasPassword || info.formHasPayment)) return "Dieses Formular enthält ein Passwort oder Zahlungsdaten. Abschicken tust du es selbst.";
  // Ein Formular, das per POST abgeschickt wird, ändert etwas (Bestellung, Nachricht, Anmeldung).
  // Suchen und Filter laufen per GET und sind erlaubt.
  if (info.isSubmit && info.formMethod !== "get" && !info.isSearch) return "Damit würde ein Formular abgeschickt. Das machst du selbst.";
  return null;
}

// Darf JARVIS in dieses Feld tippen?
export function typeProblem(info: ElementInfo): string | null {
  if (info.tag === "input" && info.type === "file") return "Dateien lädt JARVIS nicht hoch.";
  if (info.type === "password" || SECRET_AUTOCOMPLETE.test(info.autocomplete) || SECRET_FIELD.test(info.name) || SECRET_FIELD.test(info.text))
    return "Passwörter, PINs, TANs und Zahlungsdaten tippe ich nie ein. Das machst du selbst.";
  const editable = info.editable || info.tag === "textarea" || info.tag === "select" || (info.tag === "input" && !["checkbox", "radio", "submit", "button", "image", "reset", "range", "color"].includes(info.type));
  if (!editable) return "Das ist kein Eingabefeld. Nimm klicken.";
  return null;
}

// Darf JARVIS nach dem Tippen Enter drücken? Das schickt das Formular ab, also nur bei Suchen.
export function enterProblem(info: ElementInfo): string | null {
  if (info.formHasPassword || info.formHasPayment) return "Enter würde ein Formular mit Passwort oder Zahlungsdaten abschicken. Das machst du selbst.";
  if (info.isSearch) return null;
  if (info.inForm && info.formMethod === "get") return null;
  return "Enter würde hier etwas abschicken. Das machst du selbst; ich tippe nur ein.";
}

// Wie ein Schritt in der Browser-Ansicht heißt.
export const hostLabel = (raw: string) => {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw.slice(0, 40);
  }
};
