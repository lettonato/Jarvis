import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { MemoryFact, MemoryStand } from "../brain";
import { sauber } from "../projekte";
import { CONFIG_DIR } from "./config";

// Das Gedächtnis von JARVIS: kurze Dinge über dich, die Claude sich von selbst oder auf Zuruf merkt
// (Vorlieben, Namen, Umstände), damit er sie im nächsten Gespräch noch weiß. Es liegt nur auf deinem Mac
// in ~/.jarvis/gedaechtnis.json; in den Einstellungen siehst du jeden Eintrag und kannst ihn löschen.
//
// Es gelten dieselben Zusagen wie beim Projektgedächtnis (projekte/speicher.ts):
// - Jede Änderung liest, ändert und speichert in einem Zug, eine nach der anderen. Zwei Änderungen zur selben
//   Zeit (das KI-Gehirn merkt sich zwei Dinge auf einmal) überschreiben sich nicht.
// - Eine beschädigte Datei wird nie stillschweigend durch eine leere ersetzt: Sonst wäre beim nächsten Merken
//   alles weg. JARVIS meldet den Fehler, die Datei bleibt liegen. Erst auf deinen Knopfdruck wird sie unter einem
//   neuen Namen beiseitegelegt; was sich darin noch lesen lässt, gilt danach weiter.
// - Scheitert das Speichern, erfährt man es, und es ist nichts geändert (auch nicht bis zum nächsten Neustart).
// Die Datei behält ihren Aufbau. Eine Fassung für die Datenbank gibt es bewusst noch nicht: Dieses Gedächtnis
// gehört zu einer Person, und dafür braucht ein zentraler Betrieb erst die Anmeldung je Person (Schritt I2).

const FILE = path.join(CONFIG_DIR, "gedaechtnis.json");
export const MAX_FACTS = 120;
const MAX_LENGTH = 300;

// beschaedigt: Der Inhalt der Datei ist nicht das, was JARVIS schreibt. nicht-lesbar: Die Datei gibt es, aber sie
// lässt sich nicht öffnen. nicht-gespeichert: Das Schreiben ist gescheitert.
type Art = "beschaedigt" | "nicht-lesbar" | "nicht-gespeichert";

// Feste Sätze. Sie gehen als Ergebnis eines Werkzeugs auch ans Modell und nennen deshalb weder den Ort der Datei
// (darin steht der Benutzername) noch, was darin steht. Welche Datei es ist, erfährt nur die Seite (gedaechtnisStand).
const SATZ: Record<Art, string> = {
  beschaedigt: "Die Datei des Gedächtnisses ist beschädigt. JARVIS lässt sie unverändert und merkt sich so lange nichts Neues. In den Einstellungen unter „Gedächtnis“ lässt sie sich beiseitelegen.",
  "nicht-lesbar": "Das Gedächtnis lässt sich gerade nicht lesen.",
  "nicht-gespeichert": "Das Gedächtnis ließ sich nicht speichern. Es ist nichts geändert.",
};

export class GedaechtnisFehler extends Error {
  constructor(readonly art: Art) {
    super(SATZ[art]);
    this.name = "GedaechtnisFehler";
  }
}

type Shared = { facts: MemoryFact[] | null; schlange: Promise<unknown> };
const holder = globalThis as typeof globalThis & { __jarvisGedaechtnis?: Shared };
const shared: Shared = (holder.__jarvisGedaechtnis ??= { facts: null, schlange: Promise.resolve() });

// Auch die Zeit muss lesbar sein: Anzeige und Prompt rechnen damit.
const istFakt = (f: unknown): f is MemoryFact => {
  const e = f && typeof f === "object" ? (f as Record<string, unknown>) : null;
  return Boolean(e) && typeof e!.id === "string" && typeof e!.text === "string" && typeof e!.at === "string" && !Number.isNaN(Date.parse(e!.at as string));
};

// Gelesen wird auch außerhalb der Warteschlange (das Gespräch wartet nicht auf eine laufende Änderung). Ist beim
// Lesen der Datei inzwischen ein Stand da, gilt der: Er stammt von einer Änderung, die das Lesen überholt hat.
// Sonst käme nach einem Neustart ein alter Stand zurück, und die nächste Änderung schriebe ihn über den neuen.
async function lade(): Promise<MemoryFact[]> {
  if (shared.facts) return shared.facts;
  // Nur eine fehlende Datei heißt „noch nichts gemerkt“. Alles andere ist ein Fehler, kein leeres Gedächtnis.
  const roh = await fs.readFile(FILE, "utf8").catch((e: NodeJS.ErrnoException) => (e.code === "ENOENT" ? null : new GedaechtnisFehler("nicht-lesbar")));
  if (shared.facts) return shared.facts;
  if (roh instanceof GedaechtnisFehler) throw roh;
  if (roh === null) return (shared.facts = []);
  let facts: unknown;
  try {
    facts = (JSON.parse(roh) as { facts?: unknown } | null)?.facts;
  } catch {
    throw new GedaechtnisFehler("beschaedigt");
  }
  // Auch ein einzelner Eintrag in fremder Form zählt als beschädigt: Er fiele sonst beim nächsten Speichern still weg.
  if (!Array.isArray(facts) || !facts.every(istFakt)) throw new GedaechtnisFehler("beschaedigt");
  return (shared.facts = facts);
}

// Was sich aus einer beschädigten Datei noch lesen lässt: die Einträge in der richtigen Form. Sonst nichts.
async function lesbares(): Promise<MemoryFact[]> {
  try {
    const facts = (JSON.parse(await fs.readFile(FILE, "utf8")) as { facts?: unknown } | null)?.facts;
    return Array.isArray(facts) ? facts.filter(istFakt).slice(-MAX_FACTS) : [];
  } catch {
    return [];
  }
}

// Schreibt über eine Nebendatei, damit nie eine halbe Datei liegen bleibt.
async function schreibe(facts: MemoryFact[]): Promise<void> {
  const tmp = `${FILE}.tmp`;
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
    await fs.writeFile(tmp, JSON.stringify({ facts }, null, 2), { mode: 0o600 });
    await fs.rename(tmp, FILE);
  } catch {
    await fs.unlink(tmp).catch(() => {});
    throw new GedaechtnisFehler("nicht-gespeichert");
  }
}

// Eines nach dem anderen: Was hier läuft, sieht den Stand, den der Lauf davor hinterlassen hat.
function nacheinander<T>(lauf: () => Promise<T>): Promise<T> {
  const ergebnis = shared.schlange.then(lauf);
  shared.schlange = ergebnis.catch(() => {});
  return ergebnis;
}

// Eine Änderung: liest den Stand von jetzt, rechnet darauf und speichert. Im Speicher gilt das Neue erst, wenn es
// in der Datei steht. `facts` weglassen heißt: nichts zu speichern.
const aendere = <T>(aenderung: (facts: MemoryFact[]) => { facts?: MemoryFact[]; ergebnis: T }): Promise<T> =>
  nacheinander(async () => {
    const { facts, ergebnis } = aenderung(await lade());
    if (facts) {
      await schreibe(facts);
      shared.facts = facts;
    }
    return ergebnis;
  });

// Der Ausweg aus einer beschädigten Datei, ohne etwas zu zerstören: Erst entsteht daneben eine Kopie
// (gedaechtnis.json.beschaedigt-…), dann wird neu geschrieben. Scheitert das Schreiben, liegt die beschädigte Datei
// weiter an ihrem Platz, und die Kopie ist wieder weg: Es ist wirklich nichts geändert. Ist nichts beschädigt,
// geschieht nichts; eine Datei, die sich gar nicht lesen lässt, bleibt ein Fehler.
async function rette(behalten: boolean): Promise<boolean> {
  try {
    await lade();
    return false;
  } catch (e) {
    if (!(e instanceof GedaechtnisFehler) || e.art !== "beschaedigt") throw e;
  }
  const facts = behalten ? await lesbares() : [];
  const kopie = `${FILE}.beschaedigt-${Date.now()}`;
  let angelegt = false;
  try {
    // Gibt es unter dem Namen schon eine Datei (eine früher beiseitegelegte), wird sie nicht überschrieben.
    await fs.copyFile(FILE, kopie, fsConstants.COPYFILE_EXCL);
    angelegt = true;
    await fs.chmod(kopie, 0o600);
    await schreibe(facts);
  } catch {
    if (angelegt) await fs.unlink(kopie).catch(() => {});
    throw new GedaechtnisFehler("nicht-gespeichert");
  }
  shared.facts = facts;
  return true;
}

export const readMemory = (): Promise<MemoryFact[]> => lade();

// Für die Seite: der Stand, oder ein leerer Stand mit dem festen Satz, warum er nicht zu lesen ist. Ist die Datei
// beschädigt, steht dabei, welche es ist und wie viele Einträge sich daraus noch lesen lassen (nur die Zahl):
// Dann bietet die Seite das Beiseitelegen an.
export const gedaechtnisStand = (): Promise<MemoryStand> =>
  lade().then(
    (facts) => ({ facts }),
    async (e) => ({
      facts: [],
      fehler: e instanceof GedaechtnisFehler ? e.message : SATZ["nicht-lesbar"],
      ...(e instanceof GedaechtnisFehler && e.art === "beschaedigt" ? { beschaedigt: { datei: FILE, lesbar: (await lesbares()).length } } : {}),
    }),
  );

// Spitze Klammern fallen weg (kein Ausbruch aus dem Gedächtnis-Block im Prompt), ebenso Steuerzeichen und halbe
// Zeichenpaare; gekürzt wird nie mitten in einem Zeichen.
const clean = (text: string) => sauber(text, MAX_LENGTH);

// Merkt sich etwas. Steht es schon so da, bleibt es bei dem einen Eintrag; ist das Gedächtnis voll,
// fällt der älteste weg.
export async function remember(text: string, now = new Date()): Promise<MemoryFact> {
  const t = clean(text);
  if (!t) throw new Error("Da ist nichts zum Merken.");
  return aendere((facts) => {
    const same = facts.find((f) => f.text.toLowerCase() === t.toLowerCase());
    if (same) return { ergebnis: same };
    const fact: MemoryFact = { id: `g${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 5)}`, text: t, at: now.toISOString() };
    return { facts: [...facts, fact].slice(-MAX_FACTS), ergebnis: fact };
  });
}

// Ersetzt einen Eintrag, wenn sich etwas geändert hat (umgezogen, neue Stelle).
export async function revise(id: string, text: string): Promise<MemoryFact> {
  const t = clean(text);
  return aendere((facts) => {
    const old = facts.find((f) => f.id === id);
    if (!old) throw new Error("Diesen Eintrag gibt es nicht mehr.");
    if (!t) throw new Error("Da ist nichts zum Merken.");
    const fact = { ...old, text: t, at: new Date().toISOString() };
    return { facts: facts.map((f) => (f.id === id ? fact : f)), ergebnis: fact };
  });
}

export async function forget(id: string): Promise<boolean> {
  return aendere((facts) => (facts.some((f) => f.id === id) ? { facts: facts.filter((f) => f.id !== id), ergebnis: true } : { ergebnis: false }));
}

// Vergisst alles. Ist die Datei beschädigt, wird sie dabei nicht gelöscht, sondern beiseitegelegt.
export const forgetAll = (): Promise<void> =>
  nacheinander(async () => {
    if (await rette(false)) return;
    await schreibe([]);
    shared.facts = [];
  });

// Legt eine beschädigte Datei beiseite und macht mit dem weiter, was sich daraus noch lesen lässt.
export const legeBeiseite = (): Promise<void> => nacheinander(async () => void (await rette(true)));

// Nur für Tests: vergisst den Stand im Speicher, damit die Datei neu gelesen wird (wie nach einem Neustart).
export function vergissGedaechtnis() {
  shared.facts = null;
}
export const gedaechtnisGeschrieben = () => shared.schlange;
