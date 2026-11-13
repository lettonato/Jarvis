import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs/promises";
import path from "node:path";
import type { Eintrag, Projekt, Vorschlag } from "../../projekte";
import { CONFIG_DIR } from "../config";

// Die Speicherschicht des Projektgedächtnisses. Alles, was dauerhaft gespeichert wird, geht durch diese
// Schnittstelle. Heute steckt dahinter eine Datei auf dem Mac (~/.jarvis/projekte.json, nur für deinen
// Benutzer lesbar). Für den zentralen Betrieb kommt eine zweite Umsetzung mit PostgreSQL dazu; die Abläufe
// darüber (projekte.ts) ändern sich dann nicht. Die Methoden entsprechen deshalb schon den Tabellen
// projekte, projekt_eintraege und projekt_vorschlaege (siehe docs/jarvis-2.0/07-projektgedaechtnis.md).

export interface ProjektSpeicher {
  // Wo die Daten liegen, für die Anzeige.
  readonly ort: string;
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

// Der Speicher selbst ist gestört (Datei beschädigt oder nicht lesbar). Das ist kein Bedienfehler.
export class SpeicherFehler extends Error {}

type Daten = { version: 1; projekte: Projekt[]; eintraege: Eintrag[]; vorschlaege: Vorschlag[] };
const leer = (): Daten => ({ version: 1, projekte: [], eintraege: [], vorschlaege: [] });
const kopie = <T>(wert: T): T => structuredClone(wert);
const ersetze = <T extends { id: string }>(liste: T[], neu: T): T[] => (liste.some((x) => x.id === neu.id) ? liste.map((x) => (x.id === neu.id ? neu : x)) : [...liste, neu]);

// Entschiedene Vorschläge bleiben eine Weile als Nachweis stehen, die ältesten fallen dann weg.
const MAX_ENTSCHIEDEN = 300;

export class DateiSpeicher implements ProjektSpeicher {
  private daten: Daten | null = null;
  private schlange: Promise<unknown> = Promise.resolve();
  // Merkt, ob ein Aufruf zu einer laufenden Transaktion gehört. Nur dann läuft er an der Warteschlange vorbei;
  // alle anderen warten, bis die Transaktion fertig ist.
  private readonly inTransaktion = new AsyncLocalStorage<true>();

  constructor(private readonly datei: string) {}

  get ort() {
    return this.datei;
  }

  private async lade(): Promise<Daten> {
    if (this.daten) return this.daten;
    let roh: string;
    try {
      roh = await fs.readFile(this.datei, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return (this.daten = leer());
      throw new SpeicherFehler(`Das Projektgedächtnis lässt sich nicht lesen (${(e as Error).message}).`);
    }
    try {
      const d = JSON.parse(roh) as Partial<Daten>;
      if (!Array.isArray(d.projekte) || !Array.isArray(d.eintraege) || !Array.isArray(d.vorschlaege)) throw new Error("unerwarteter Aufbau");
      this.daten = { version: 1, projekte: d.projekte, eintraege: d.eintraege, vorschlaege: d.vorschlaege };
    } catch (e) {
      // Eine beschädigte Datei wird nie stillschweigend durch eine leere ersetzt: Sonst wäre beim nächsten
      // Speichern alles weg. JARVIS meldet den Fehler, die Datei bleibt liegen.
      throw new SpeicherFehler(`Die Datei des Projektgedächtnisses ist beschädigt (${(e as Error).message}). Sie bleibt unverändert: ${this.datei}`);
    }
    return this.daten;
  }

  private async sichere(daten: Daten): Promise<void> {
    await fs.mkdir(path.dirname(this.datei), { recursive: true, mode: 0o700 });
    const entschieden = daten.vorschlaege.filter((v) => v.zustand !== "offen");
    if (entschieden.length > MAX_ENTSCHIEDEN) {
      const weg = new Set(entschieden.slice(0, entschieden.length - MAX_ENTSCHIEDEN).map((v) => v.id));
      daten.vorschlaege = daten.vorschlaege.filter((v) => !weg.has(v.id));
    }
    await fs.writeFile(`${this.datei}.tmp`, JSON.stringify(daten, null, 1), { mode: 0o600 });
    await fs.rename(`${this.datei}.tmp`, this.datei);
  }

  // Jede Änderung läuft einzeln durch die Warteschlange, außer sie gehört zu einer laufenden Transaktion.
  private aendere(fn: (d: Daten) => void): Promise<void> {
    const schritt = async () => {
      const d = await this.lade();
      fn(d);
      if (!this.inTransaktion.getStore()) await this.sichere(d);
    };
    if (this.inTransaktion.getStore()) return schritt();
    const lauf = this.schlange.then(schritt);
    this.schlange = lauf.catch(() => {});
    return lauf;
  }

  async projekte() {
    return kopie((await this.lade()).projekte);
  }
  speichereProjekt(projekt: Projekt) {
    return this.aendere((d) => void (d.projekte = ersetze(d.projekte, kopie(projekt))));
  }
  async eintraege(projektId?: string) {
    const alle = (await this.lade()).eintraege;
    return kopie(projektId ? alle.filter((e) => e.projektId === projektId) : alle);
  }
  speichereEintrag(eintrag: Eintrag) {
    return this.aendere((d) => void (d.eintraege = ersetze(d.eintraege, kopie(eintrag))));
  }
  async vorschlaege(zustand?: Vorschlag["zustand"]) {
    const alle = (await this.lade()).vorschlaege;
    return kopie(zustand ? alle.filter((v) => v.zustand === zustand) : alle);
  }
  speichereVorschlag(vorschlag: Vorschlag) {
    return this.aendere((d) => void (d.vorschlaege = ersetze(d.vorschlaege, kopie(vorschlag))));
  }

  transaktion<T>(arbeit: () => Promise<T>): Promise<T> {
    const lauf = this.schlange.then(async () => {
      const vorher = kopie(await this.lade());
      try {
        const ergebnis = await this.inTransaktion.run(true, arbeit);
        await this.sichere(this.daten!);
        return ergebnis;
      } catch (e) {
        this.daten = vorher;
        throw e;
      }
    });
    this.schlange = lauf.catch(() => {});
    return lauf;
  }
}

const holder = globalThis as typeof globalThis & { __jarvisProjekte?: ProjektSpeicher };

// Der Speicher, den JARVIS gerade benutzt. Tests und später die PostgreSQL-Umsetzung setzen hier ihren eigenen ein.
export const speicher = (): ProjektSpeicher => (holder.__jarvisProjekte ??= new DateiSpeicher(path.join(CONFIG_DIR, "projekte.json")));
export const setzeSpeicher = (s: ProjektSpeicher | null) => void (holder.__jarvisProjekte = s ?? undefined);
