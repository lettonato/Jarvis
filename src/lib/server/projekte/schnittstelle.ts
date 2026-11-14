import { speicherText, type Eintrag, type Projekt, type Vorschlag } from "../../projekte";

// Die Schnittstelle der Speicherschicht des Projektgedächtnisses. Es gibt zwei Umsetzungen: die Datei auf dem
// Mac (speicher.ts) und PostgreSQL für den zentralen Betrieb (pg-speicher.ts). Die Abläufe in projekte.ts
// kennen nur diese Schnittstelle.

export interface ProjektSpeicher {
  // Wo die Daten liegen, für die Anzeige.
  readonly ort: string;
  readonly art: "datei" | "datenbank";
  projekte(): Promise<Projekt[]>;
  speichereProjekt(projekt: Projekt): Promise<void>;
  eintraege(projektId?: string): Promise<Eintrag[]>;
  speichereEintrag(eintrag: Eintrag): Promise<void>;
  vorschlaege(zustand?: Vorschlag["zustand"]): Promise<Vorschlag[]>;
  speichereVorschlag(vorschlag: Vorschlag): Promise<void>;
  // Führt zusammengehörige Schritte nacheinander und ungestört aus (Datei: Warteschlange; PostgreSQL: Transaktion).
  // Schlägt ein Schritt fehl, bleibt der Stand von vorher.
  transaktion<T>(arbeit: () => Promise<T>): Promise<T>;
}

// Der Speicher selbst ist gestört (Datei beschädigt, Datenbank nicht erreichbar). Das ist kein Bedienfehler.
export class SpeicherFehler extends Error {}

// Entschiedene Vorschläge bleiben eine Weile als Nachweis stehen, die ältesten fallen dann weg. Die Grenze gilt
// für jeden Speicher gleich, sonst ließe sich nicht von einem in den anderen umziehen.
export const MAX_ENTSCHIEDEN = 300;

// Der Datensatz in der Form, die jeder Speicher halten kann: wie er als JSON geschrieben würde (Angaben ohne
// Wert fallen weg) und mit bereinigtem Text (siehe speicherText).
export const speicherbar = <T>(wert: T): T => JSON.parse(JSON.stringify(wert, (_schluessel, v: unknown) => (typeof v === "string" ? speicherText(v) : v))) as T;
