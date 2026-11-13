// Gemeinsame Begriffe des Security Gateways, für Server und Oberfläche. Hier steht nur, was angezeigt
// wird; entschieden wird ausschließlich auf dem Server (src/lib/server/gateway/).

// A Lesen, B Vorbereiten (intern, begrenzt), C Verändern (braucht dein Ja), D Kritisch (für die KI gesperrt).
export type Klasse = "A" | "B" | "C" | "D";

export const KLASSE_LABEL: Record<Klasse, string> = {
  A: "A · Lesen",
  B: "B · Vorbereiten",
  C: "C · Verändern",
  D: "D · Kritisch",
};

export const KLASSE_TEXT: Record<Klasse, string> = {
  A: "liest nur, ändert nichts",
  B: "legt intern etwas an oder arbeitet begrenzt im Web",
  C: "ändert Daten oder kostet Geld, nur nach deinem Ja",
  D: "für die KI gesperrt, nur ein Mensch darf das",
};

// Die Agenten, die der Not-Aus anhält und die sich einzeln sperren lassen.
export type AgentName = "gehirn" | "browser" | "analyst" | "intel" | "desk";

export const AGENTEN: { name: AgentName; label: string; text: string }[] = [
  { name: "gehirn", label: "Gespräch (Claude)", text: "Antworten am Mac und per Telegram, mit allen Werkzeugen" },
  { name: "browser", label: "Browser-Agent", text: "bedient Chrome auf dem Mac" },
  { name: "analyst", label: "Analyst", text: "recherchiert und schreibt Dokumente" },
  { name: "intel", label: "Intel", text: "liest Nachrichten und X mit Grok" },
  { name: "desk", label: "Spielgeld-Desk", text: "Scan, Crawler, Chief und Handel" },
];

export const isAgent = (x: unknown): x is AgentName => AGENTEN.some((a) => a.name === x);

export type Kanal = "mac" | "telegram" | "intern";

// Wer eine Freigabe entschieden oder den Not-Aus bedient hat.
export type Wer = "mac" | "telegram" | "system";

export type NotausZustand = { an: true; seit: string; grund: string; von: Wer } | { an: false; seit: string | null; aus_von: Wer | null };

// Wie streng Klasse C ist: "immer" fragt bei jeder Änderung, "bei-fremden-inhalten" nur, wenn im
// Gespräch schon Mails, Webseiten oder Termine von Dritten gelesen wurden. Gedächtnis und Handelsstart
// fragen unabhängig davon immer.
export type CStrenge = "immer" | "bei-fremden-inhalten";

export type SicherheitsZustand = {
  notaus: NotausZustand;
  sperren: Partial<Record<AgentName, { seit: string; grund: string }>>;
  cStrenge: CStrenge;
};

export type FreigabeZustand = "offen" | "laeuft" | "ausgefuehrt" | "abgelehnt" | "verfallen" | "fehler" | "gesperrt";

export type Freigabe = {
  id: string;
  werkzeug: string;
  klasse: Klasse;
  // Der Agent, dessen Arbeit es ist, und der, der gefragt hat.
  agent: AgentName;
  aufrufer: AgentName;
  kanal: Kanal;
  // Was passieren soll, in einem Satz für dich.
  was: string;
  // Warum gefragt wird (Klasse, fremde Inhalte im Gespräch).
  warum: string;
  eingabe: Record<string, unknown>;
  erstellt: string;
  bis: string;
  zustand: FreigabeZustand;
  entschieden: string | null;
  von: Wer | null;
  ergebnis: string | null;
};

export const FREIGABE_MINUTEN = 15;

export type AuditEintrag = {
  nr: number;
  zeit: string;
  art: "werkzeug" | "freigabe" | "notaus" | "sperre" | "einstellung" | "desk" | "alarm" | "netz" | "projekt";
  agent: AgentName | "mensch" | "system";
  kanal: Kanal | Wer;
  was: string;
  klasse?: Klasse;
  ergebnis: string;
  grund?: string;
  daten?: Record<string, unknown>;
  vorher: string;
  hash: string;
};

export type AuditPruefung = { ok: boolean; eintraege: number; fehler: string | null };

// Wo die Zugangsdaten liegen (Schritt 2.3, R-07). Werte kommen hier nie vor.
export type ZugangsdatenStatus = {
  modus: "datei" | "schluesselbund";
  verfuegbar: boolean;
  datei: string;
  eintraege: { name: string; label: string; ort: "datei" | "schluesselbund" | "umgebung" | null; lesbar: boolean; fehler: string | null }[];
};

export type SicherheitsLage = {
  zustand: SicherheitsZustand;
  freigaben: Freigabe[];
  audit: AuditEintrag[];
  pruefung: AuditPruefung;
  zugangsdaten: ZugangsdatenStatus;
};

// Telegram-Knöpfe unter einer Freigabe. Eigenes Präfix, damit sie nie mit den Kauf-Rückfragen (rf:) verwechselt werden.
export const freigabeKnopf = (id: string, ja: boolean) => `fg:${id}:${ja ? "ja" : "nein"}`;

export function leseFreigabeKnopf(data: string | undefined): { id: string; ja: boolean } | null {
  const m = /^fg:([a-z0-9]{6,20}):(ja|nein)$/.exec(data ?? "");
  return m ? { id: m[1], ja: m[2] === "ja" } : null;
}

// So muss der Mensch das Lösen des Not-Aus bestätigen.
export const NOTAUS_BESTAETIGUNG = "FREIGEBEN";
