import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { FREIGABE_MINUTEN, KLASSE_LABEL, type AgentName, type Freigabe, type Geaendert, type Kanal, type Klasse, type Wer } from "../../sicherheit";
import { CONFIG_DIR } from "../config";
import { notify } from "../notify";
import { protokolliere } from "./audit";

// Freigaben: Was die KI ändern will und ein Mensch erst bestätigen muss. Die Frage steht am Mac und in
// Telegram, jeweils mit Ja und Nein. Ein Ja führt die Aktion genau einmal aus, mit der Eingabe, die in der
// Frage stand; vorher prüft das Gateway noch einmal Not-Aus, Sperren und Klasse D. Ohne Antwort verfällt
// die Frage nach FREIGABE_MINUTEN. Die KI hat kein Werkzeug, mit dem sie eine Freigabe erteilen könnte.

const DATEI = path.join(CONFIG_DIR, "freigaben.json");
const BEHALTEN = 60;

type Shared = { liste: Freigabe[] | null; speichern: Promise<void>; sperre: Promise<unknown> };
const holder = globalThis as typeof globalThis & { __jarvisFreigaben?: Shared };
const shared: Shared = (holder.__jarvisFreigaben ??= { liste: null, speichern: Promise.resolve(), sperre: Promise.resolve() });

export class FreigabeFehler extends Error {}

// Entscheidungen laufen nacheinander, damit ein doppelter Klick (Mac und Telegram gleichzeitig) nie
// zweimal ausführt.
function nacheinander<T>(arbeit: () => Promise<T>): Promise<T> {
  const p = shared.sperre.then(arbeit);
  shared.sperre = p.catch(() => {});
  return p;
}

async function lade(): Promise<Freigabe[]> {
  if (shared.liste) return shared.liste;
  try {
    const roh = JSON.parse(await fs.readFile(DATEI, "utf8")) as { freigaben?: Freigabe[] };
    shared.liste = Array.isArray(roh.freigaben) ? roh.freigaben.filter((f) => typeof f?.id === "string" && typeof f?.werkzeug === "string") : [];
  } catch {
    shared.liste = [];
  }
  return shared.liste;
}

function speichere(liste: Freigabe[]): Promise<void> {
  shared.liste = liste.slice(0, BEHALTEN);
  const json = JSON.stringify({ freigaben: shared.liste }, null, 2);
  shared.speichern = shared.speichern
    .then(async () => {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${DATEI}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${DATEI}.tmp`, DATEI);
    })
    .catch((e) => console.error("Freigaben nicht gespeichert:", e));
  return shared.speichern;
}

// Abgelaufene offene Fragen verfallen.
function verfallen(liste: Freigabe[], jetzt: number): Freigabe[] {
  const geaendert: Freigabe[] = [];
  for (const f of liste) {
    if (f.zustand === "offen" && Date.parse(f.bis) <= jetzt) {
      f.zustand = "verfallen";
      f.entschieden = new Date(jetzt).toISOString();
      f.ergebnis = "Ohne Antwort verfallen, nichts geändert.";
      geaendert.push(f);
    }
  }
  for (const f of geaendert) {
    notify({ kind: "freigabe_ende", id: f.id, text: "⌛ Verfallen, nichts geändert." });
    void protokolliere({ art: "freigabe", agent: f.agent, kanal: f.kanal, was: f.werkzeug, klasse: f.klasse, ergebnis: "verfallen", daten: { freigabe: f.id } });
  }
  return geaendert;
}

export async function leseFreigaben(jetzt = Date.now()): Promise<Freigabe[]> {
  return nacheinander(async () => {
    const liste = await lade();
    if (verfallen(liste, jetzt).length) await speichere(liste);
    return liste;
  });
}

export const offeneFreigaben = async () => (await leseFreigaben()).filter((f) => f.zustand === "offen");

export const frageText = (f: Pick<Freigabe, "was" | "warum" | "klasse">) => `🔐 JARVIS möchte: ${f.was}.\n${f.warum} (${KLASSE_LABEL[f.klasse]})`;

export async function erstelleFreigabe(input: {
  werkzeug: string;
  klasse: Klasse;
  agent: AgentName;
  aufrufer: AgentName;
  kanal: Kanal;
  eingabe: Record<string, unknown>;
  was: string;
  warum: string;
  fremd: boolean;
}): Promise<Freigabe> {
  const jetzt = new Date();
  const f: Freigabe = {
    id: randomBytes(6).toString("hex"),
    werkzeug: input.werkzeug,
    klasse: input.klasse,
    agent: input.agent,
    aufrufer: input.aufrufer,
    kanal: input.kanal,
    was: input.was,
    warum: input.warum,
    eingabe: structuredClone(input.eingabe),
    erstellt: jetzt.toISOString(),
    bis: new Date(jetzt.getTime() + FREIGABE_MINUTEN * 60_000).toISOString(),
    zustand: "offen",
    entschieden: null,
    von: null,
    ergebnis: null,
  };
  await nacheinander(async () => {
    const liste = await lade();
    await speichere([f, ...liste]);
  });
  notify({ kind: "freigabe", id: f.id, text: frageText(f) });
  return f;
}

// Ja oder Nein eines Menschen. Liefert, was danach passiert ist, als Satz.
// geaendert: welche Bereiche die ausgeführte Aktion verändert hat (leer nach Nein, Sperre oder Fehler).
export async function entscheideFreigabe(id: string, ja: boolean, von: Wer): Promise<{ text: string; freigabe: Freigabe; geaendert: Geaendert[] }> {
  if (von === "system") throw new FreigabeFehler("Freigaben entscheidet nur ein Mensch.");
  // Erst unter der Sperre: offen → laeuft (oder abgelehnt). Danach kann kein zweiter Klick mehr ausführen.
  const f = await nacheinander(async () => {
    const liste = await lade();
    verfallen(liste, Date.now());
    const f = liste.find((x) => x.id === id);
    if (!f) throw new FreigabeFehler("Diese Freigabe gibt es nicht mehr.");
    if (f.zustand !== "offen") throw new FreigabeFehler(f.zustand === "verfallen" ? "Diese Frage ist schon verfallen." : "Diese Frage ist schon beantwortet.");
    f.entschieden = new Date().toISOString();
    f.von = von;
    if (!ja) {
      f.zustand = "abgelehnt";
      f.ergebnis = "Abgelehnt, nichts geändert.";
    } else f.zustand = "laeuft";
    await speichere(liste);
    return f;
  });
  await protokolliere({ art: "freigabe", agent: "mensch", kanal: von, was: f.werkzeug, klasse: f.klasse, ergebnis: ja ? "ja" : "nein", daten: { freigabe: f.id } });
  if (!ja) {
    notify({ kind: "freigabe_ende", id: f.id, text: "✖️ Abgelehnt, nichts geändert." });
    return { text: "Abgelehnt. Ich ändere nichts.", freigabe: f, geaendert: [] };
  }

  // Noch einmal durch das Gateway, diesmal mit Zustimmung: Not-Aus, Sperren und Klasse D gelten weiter.
  const { pruefe } = await import("./gateway");
  const e = await pruefe({ werkzeug: f.werkzeug, agent: f.aufrufer, kanal: f.kanal, eingabe: f.eingabe, fremd: true, bestaetigt: true });
  let text: string;
  let geaendert: Geaendert[] = [];
  if (e.art !== "erlaubt") {
    f.zustand = "gesperrt";
    text = e.art === "abgelehnt" ? `Nicht ausgeführt: ${e.grund}` : "Nicht ausgeführt.";
    await protokolliere({ art: "freigabe", agent: f.agent, kanal: f.kanal, was: f.werkzeug, klasse: f.klasse, ergebnis: "gesperrt", grund: text, daten: { freigabe: f.id } });
  } else {
    try {
      const { fuehreAusMitFolgen } = await import("../aktionen");
      ({ text, geaendert } = await fuehreAusMitFolgen(f.werkzeug, f.eingabe, { kanal: f.kanal }));
      f.zustand = "ausgefuehrt";
      await protokolliere({ art: "freigabe", agent: f.agent, kanal: f.kanal, was: f.werkzeug, klasse: f.klasse, ergebnis: "ausgefuehrt", daten: { freigabe: f.id } });
    } catch (err) {
      f.zustand = "fehler";
      text = `Das hat nicht geklappt: ${err instanceof Error ? err.message : String(err)}`;
      await protokolliere({ art: "freigabe", agent: f.agent, kanal: f.kanal, was: f.werkzeug, klasse: f.klasse, ergebnis: "fehler", grund: text, daten: { freigabe: f.id } });
    }
  }
  f.ergebnis = text.slice(0, 3000);
  await nacheinander(async () => speichere(await lade()));
  notify({ kind: "freigabe_ende", id: f.id, text: `${f.zustand === "ausgefuehrt" ? "✅" : "⚠️"} ${f.ergebnis}` });
  return { text: f.ergebnis, freigabe: f, geaendert };
}

// Beim Not-Aus: alle offenen Fragen schließen, nichts wird mehr ausgeführt.
export async function sperreOffeneFreigaben(grund: string): Promise<number> {
  const geschlossen = await nacheinander(async () => {
    const liste = await lade();
    const offen = liste.filter((f) => f.zustand === "offen");
    for (const f of offen) {
      f.zustand = "gesperrt";
      f.entschieden = new Date().toISOString();
      f.von = "system";
      f.ergebnis = `${grund}: nicht ausgeführt.`;
    }
    if (offen.length) await speichere(liste);
    return offen;
  });
  for (const f of geschlossen) notify({ kind: "freigabe_ende", id: f.id, text: `🛑 ${f.ergebnis}` });
  return geschlossen.length;
}

export const freigabeZustand = async (id: string) => (await leseFreigaben()).find((f) => f.id === id)?.zustand ?? null;
