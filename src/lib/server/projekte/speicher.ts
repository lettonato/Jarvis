import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs/promises";
import path from "node:path";
import type { Eintrag, Projekt, Vorschlag } from "../../projekte";
import { CONFIG_DIR } from "../config";
import { PgSpeicher } from "./pg-speicher";
import { MAX_ENTSCHIEDEN, SpeicherFehler, type ProjektSpeicher } from "./schnittstelle";

// Die Speicherschicht des Projektgedächtnisses. Alles, was dauerhaft gespeichert wird, geht durch diese
// Schnittstelle. Heute steckt dahinter eine Datei auf dem Mac (~/.jarvis/projekte.json, nur für deinen
// Benutzer lesbar). Für den zentralen Betrieb gibt es eine zweite Umsetzung mit PostgreSQL (pg-speicher.ts);
// die Abläufe darüber (projekte.ts) sind für beide dieselben. Die Schnittstelle selbst steht in schnittstelle.ts.

export { MAX_ENTSCHIEDEN, SpeicherFehler, type ProjektSpeicher } from "./schnittstelle";

type Daten = { version: 1; projekte: Projekt[]; eintraege: Eintrag[]; vorschlaege: Vorschlag[] };
const leer = (): Daten => ({ version: 1, projekte: [], eintraege: [], vorschlaege: [] });
const kopie = <T>(wert: T): T => structuredClone(wert);
const ersetze = <T extends { id: string }>(liste: T[], neu: T): T[] => (liste.some((x) => x.id === neu.id) ? liste.map((x) => (x.id === neu.id ? neu : x)) : [...liste, neu]);

export class DateiSpeicher implements ProjektSpeicher {
  private daten: Daten | null = null;
  private schlange: Promise<unknown> = Promise.resolve();
  // Merkt, ob ein Aufruf zu einer laufenden Transaktion gehört. Nur dann läuft er an der Warteschlange vorbei;
  // alle anderen warten, bis die Transaktion fertig ist.
  private readonly inTransaktion = new AsyncLocalStorage<true>();

  constructor(private readonly datei: string) {}

  readonly art = "datei";
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

// Der Speicher, den JARVIS gerade benutzt. Ohne weitere Einstellung ist das die Datei auf dem Mac. Steht in der
// Umgebung JARVIS_PROJEKTE_DB (Adresse einer PostgreSQL-Datenbank), nimmt JARVIS die Datenbank. Ist sie
// eingestellt, aber gestört, gibt es eine Meldung und kein stilles Ausweichen auf die Datei: Sonst lägen
// die Projekte danach an zwei Orten.
const waehle = (): ProjektSpeicher => {
  const adresse = process.env.JARVIS_PROJEKTE_DB?.trim();
  return adresse ? new PgSpeicher(adresse) : new DateiSpeicher(path.join(CONFIG_DIR, "projekte.json"));
};
export const speicher = (): ProjektSpeicher => (holder.__jarvisProjekte ??= waehle());
// Tests setzen hier ihren eigenen Speicher ein; null stellt die Wahl von oben wieder her.
export const setzeSpeicher = (s: ProjektSpeicher | null) => void (holder.__jarvisProjekte = s ?? undefined);
