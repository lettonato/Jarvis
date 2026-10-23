// Die Module der Kommandozentrale. Jedes Modul ist ein Agent mit eigener Aufgabe.
// Ein neuer Agent kommt dazu, indem er hier eingetragen wird; die Kachel erscheint automatisch.
export type ModuleId =
  | "trading"
  | "markt"
  | "wetter"
  | "cognition"
  | "kalender"
  | "intel"
  | "telefon"
  | "browser";

export type JarvisModule = {
  id: ModuleId;
  code: string;
  name: string;
  tagline: string;
  // Ab welcher Phase des Bauplans das Modul arbeitet. Phase 6 = Erweiterungen nach dem Live-Handel.
  phase: number;
  href?: string;
};

export const CURRENT_PHASE = 1;

export const MODULES: JarvisModule[] = [
  { id: "trading", code: "M-01", name: "Trading", tagline: "Scan, Vet, Risk und Fills", phase: 1, href: "/trading" },
  { id: "markt", code: "M-02", name: "Markt", tagline: "Bitcoin, Ethereum, Solana", phase: 1 },
  { id: "wetter", code: "M-03", name: "Wetter", tagline: "aktuell vor Ort", phase: 1 },
  { id: "cognition", code: "M-04", name: "Cognition", tagline: "KI-Gehirn, versteht freie Sätze", phase: 2 },
  { id: "intel", code: "M-05", name: "Intel", tagline: "Crawler liest News und Social", phase: 3 },
  { id: "kalender", code: "M-06", name: "Kalender", tagline: "Termine, E-Mails, Aufgaben", phase: 4 },
  { id: "telefon", code: "M-07", name: "Telefon", tagline: "Anrufe annehmen und führen", phase: 6 },
  { id: "browser", code: "M-08", name: "Browser", tagline: "sucht und erledigt im Web", phase: 6 },
];

export const isActive = (m: JarvisModule) => m.phase <= CURRENT_PHASE;
