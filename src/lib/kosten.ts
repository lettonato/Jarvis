import type { AgentName } from "./sicherheit";

// Was das Kostenbuch ausgibt (src/lib/server/kosten.ts). Hier stehen nur die Formen, damit auch die Ansichten sie kennen.

// Die bezahlten Dienste: Claude (Anthropic) und Grok (xAI).
export type Dienst = "claude" | "grok";

// Eine Zeile im Buch: Betrag nach Listenpreis, Zahl der Anfragen und, bei Claude, Token und Websuchen.
export type KostenPosten = { usd: number; anfragen: number; eingabe: number; ausgabe: number; suchen: number };

export type TagesKosten = Partial<Record<AgentName, Partial<Record<Dienst, KostenPosten>>>>;

export type KostenUebersicht = {
  heute: TagesKosten;
  heuteUsd: number;
  // Alle gebuchten Tage des laufenden Monats zusammen.
  monatUsd: number;
  // Der erste Tag, der im Buch steht (JJJJ-MM-TT). Davor wurde nicht gezählt.
  seit: string | null;
};
