import fs from "node:fs/promises";
import path from "node:path";
import type { AgentName } from "../sicherheit";
import type { ZeitplanEintrag, ZeitplanSnapshot } from "../zeitplan";
import { CONFIG_DIR } from "./config";
import { agentSperre, leseZustand } from "./gateway/zustand";

// Der Taktgeber des gemeinsamen Zeitplans: ein einziger Zeitgeber für alles, was JARVIS von selbst tut. Jede
// Minute fragt er die angemeldeten Aufgaben, ob sie dran sind. Not-Aus und Sperre eines Agenten gelten hier für
// alle gleich, zwei Läufe derselben Aufgabe überlappen nie, und jeder Lauf steht mit Zeit und Ausgang in
// ~/.jarvis/zeitplan.json (nur Zeiten und feste Sätze des Programms, kein Inhalt und kein Text von außen). Welche Aufgaben
// es gibt, steht in zeitplan-aufgaben.ts; hier stehen keine Agenten, damit sich die Regeln allein prüfen lassen.

const DATEI = path.join(CONFIG_DIR, "zeitplan.json");
const MINUTE = 60_000;
// Kurz nach dem Hochfahren einmal nachsehen, statt eine volle Minute zu warten.
const ERSTER_BLICK_MS = 20_000;

export type Aufgabe = {
  id: string;
  // Der Agent, dessen Sperre gilt. null: kein Agent (eine Meldung).
  agent: AgentName | null;
  name: string;
  takt: (now: Date) => Promise<string>;
  // Wann sie als Nächstes dran ist. null: gerade gar nicht.
  naechster: (now: Date) => Promise<Date | null>;
  // Warum nichts ansteht (aus, nicht eingerichtet), oder null.
  hinweis: (now: Date) => Promise<string | null>;
  // Führt der Zeitplan sie selbst aus, sagt faellig, ob sie jetzt dran ist, und lauf erledigt sie. lauf wirft,
  // wenn es nicht geklappt hat. Fehlen beide, zeigt der Zeitplan die Aufgabe nur an (jemand anderes führt sie aus).
  faellig?: (now: Date, letzterLauf: Date | null) => Promise<boolean>;
  lauf?: (now: Date) => Promise<void>;
  // Für Aufgaben, die der Zeitplan nur anzeigt: wann sie zuletzt gelaufen sind.
  zuletzt?: (now: Date) => Promise<string | null>;
  // Macht aus einem Fehlschlag einen festen Satz des Programms. Fehlt die Funktion, steht nur „fehlgeschlagen“
  // da: Der Text eines Fehlers kann von einem fremden Server stammen und gehört weder in die Datei noch in die Anzeige.
  fehlerSatz?: (e: unknown) => string;
};

// Wie lange der Zeitplan auf eine Aufgabe wartet, bevor er sie wieder freigibt. Ohne Frist würde eine einzige
// hängende Abfrage (etwa ein Dialog des Schlüsselbunds) die Aufgabe bis zum nächsten Neustart stilllegen.
export type Fristen = { pruefenMs: number; laufMs: number };
const FRISTEN: Fristen = { pruefenMs: 30_000, laufMs: 10 * MINUTE };
const FEHLGESCHLAGEN = "Der Lauf ist fehlgeschlagen.";
const ZU_LANGE = "Der Lauf hat zu lange gedauert und zählt als fehlgeschlagen.";
const ABGEBROCHEN = "Der Lauf wurde nicht zu Ende geführt, weil JARVIS währenddessen beendet wurde.";

class FristVorbei extends Error {}
function mitFrist<T>(arbeit: Promise<T>, ms: number): Promise<T> {
  let uhr: ReturnType<typeof setTimeout>;
  const frist = new Promise<never>((_, ablehnen) => (uhr = setTimeout(() => ablehnen(new FristVorbei()), ms)));
  return Promise.race([arbeit, frist]).finally(() => clearTimeout(uhr));
}

// „offen“: Der Lauf hat begonnen und ist noch nicht fertig. Steht das nach einem Neustart noch da, wurde er abgebrochen.
type Lauf = { zuletzt: string; ergebnis: "ok" | "fehler" | "offen"; fehler: string | null };
type Stand = { laeufe: Record<string, Lauf> };
// laufend: belegt, solange eine Aufgabe geprüft oder ausgeführt wird. gestartet: Ihr Lauf ist wirklich unterwegs.
type Shared = { stand: Stand | null; laden: Promise<Stand> | null; speichern: Promise<void>; timer: ReturnType<typeof setInterval> | null; laufend: Set<string>; gestartet: Set<string> };
const holder = globalThis as typeof globalThis & { __jarvisZeitplan?: Shared };
const shared: Shared = (holder.__jarvisZeitplan ??= { stand: null, laden: null, speichern: Promise.resolve(), timer: null, laufend: new Set(), gestartet: new Set() });
// Ein Stand aus der Zeit vor dieser Fassung (der Server lädt im Betrieb neuen Code nach) kennt das Feld noch nicht.
shared.gestartet ??= new Set();

const istZeit = (s: unknown): s is string => typeof s === "string" && !Number.isNaN(Date.parse(s));

// Liest nur, was in den Stand gehört. Eine fehlende oder kaputte Datei heißt: noch nichts gelaufen. Schlimmstenfalls
// läuft eine Aufgabe dann einmal zu oft, und das fangen die Aufgaben selbst ab (Budget, eigener Stand).
function saeubere(roh: unknown): Stand {
  const laeufe: Record<string, Lauf> = {};
  const quelle = roh && typeof roh === "object" && "laeufe" in roh && roh.laeufe && typeof roh.laeufe === "object" ? (roh.laeufe as Record<string, unknown>) : {};
  for (const [id, wert] of Object.entries(quelle)) {
    const l = wert as Partial<Lauf> | null;
    if (!l || typeof l !== "object" || !istZeit(l.zuletzt)) continue;
    laeufe[id] = { zuletzt: l.zuletzt, ergebnis: l.ergebnis === "fehler" || l.ergebnis === "offen" ? l.ergebnis : "ok", fehler: typeof l.fehler === "string" ? l.fehler.slice(0, 300) : null };
  }
  return { laeufe };
}

async function lade(): Promise<Stand> {
  if (shared.stand) return shared.stand;
  shared.laden ??= fs
    .readFile(DATEI, "utf8")
    .then((text) => saeubere(JSON.parse(text)))
    .catch(() => ({ laeufe: {} }))
    .then((stand) => (shared.stand = stand))
    .finally(() => (shared.laden = null));
  return shared.laden;
}

function speichere(stand: Stand): Promise<void> {
  const json = JSON.stringify(stand);
  shared.speichern = shared.speichern
    .then(async () => {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${DATEI}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${DATEI}.tmp`, DATEI);
    })
    .catch((e) => console.error("Zeitplan nicht gespeichert:", e instanceof Error ? e.message : e));
  return shared.speichern;
}

// Prüft eine Aufgabe und führt sie aus, wenn sie dran ist. Die Aufgabe ist schon belegt (shared.laufend) und
// wird hier in jedem Fall wieder freigegeben.
async function pruefeUndFuehreAus(a: Aufgabe, now: Date, stand: Stand, notaus: boolean, fristen: Fristen): Promise<void> {
  try {
    const dran = await mitFrist(
      (async () => {
        // Der Not-Aus hält alles an, was ein Agent von selbst täte.
        if (a.agent && (notaus || (await agentSperre(a.agent)))) return false;
        const letzter = stand.laeufe[a.id]?.zuletzt;
        return a.faellig!(now, letzter ? new Date(letzter) : null);
      })(),
      fristen.pruefenMs,
    ).catch(() => false);
    if (!dran) return;
    // Der Lauf zählt ab seinem Beginn und steht sofort in der Datei: So ist der Termin erledigt, auch wenn der
    // Lauf lange dauert, scheitert oder JARVIS währenddessen beendet wird.
    const zuletzt = now.toISOString();
    stand.laeufe[a.id] = { zuletzt, ergebnis: "offen", fehler: null };
    shared.gestartet.add(a.id);
    await speichere(stand);
    try {
      await mitFrist(a.lauf!(now), fristen.laufMs);
      stand.laeufe[a.id] = { zuletzt, ergebnis: "ok", fehler: null };
    } catch (e) {
      const satz = e instanceof FristVorbei ? ZU_LANGE : a.fehlerSatz ? a.fehlerSatz(e) : FEHLGESCHLAGEN;
      stand.laeufe[a.id] = { zuletzt, ergebnis: "fehler", fehler: satz.slice(0, 300) };
    }
    await speichere(stand);
  } finally {
    shared.gestartet.delete(a.id);
    shared.laufend.delete(a.id);
  }
}

// Ein Blick auf die Uhr: startet, was dran ist. Kommt zurück, wenn alle gestarteten Läufe fertig sind (der
// Zeitgeber wartet darauf nicht). Wirft nie.
export async function zeitplanMinute(aufgaben: Aufgabe[], now = new Date(), fristen: Fristen = FRISTEN): Promise<void> {
  try {
    const notaus = (await leseZustand()).notaus.an;
    const stand = await lade();
    const laeufe: Promise<void>[] = [];
    for (const a of aufgaben) {
      if (!a.lauf || !a.faellig || shared.laufend.has(a.id)) continue;
      // Sofort belegen, noch vor der ersten Frage: Kommen zwei Blicke auf die Uhr im selben Augenblick (der
      // Zeitgeber und eine geöffnete Seite), startet sonst jeder die Aufgabe.
      shared.laufend.add(a.id);
      laeufe.push(pruefeUndFuehreAus(a, now, stand, notaus, fristen).catch((e) => console.error(`Zeitplan, ${a.id}:`, e instanceof Error ? e.message : e)));
    }
    await Promise.all(laeufe);
  } catch (e) {
    console.error("Zeitplan:", e instanceof Error ? e.message : e);
  }
}

export function starteTakt(aufgaben: () => Aufgabe[]): void {
  if (shared.timer) return;
  shared.timer = setInterval(() => void zeitplanMinute(aufgaben()), MINUTE);
  setTimeout(() => void zeitplanMinute(aufgaben()), ERSTER_BLICK_MS);
}

// Der Zeitplan, wie die Oberfläche ihn zeigt: je Aufgabe Takt, letzter und nächster Lauf.
export async function zeitplanUebersicht(aufgaben: Aufgabe[], now = new Date()): Promise<ZeitplanSnapshot> {
  const [zustand, stand] = await Promise.all([leseZustand(), lade()]);
  const eintraege = await Promise.all(
    aufgaben.map(async (a): Promise<ZeitplanEintrag> => {
      const selbst = Boolean(a.lauf && a.faellig);
      const lauf = selbst ? stand.laeufe[a.id] : undefined;
      const laeuft = shared.gestartet.has(a.id);
      const gesperrt = a.agent ? (zustand.notaus.an ? "Der Not-Aus steht." : zustand.sperren[a.agent] ? "Der Agent ist gesperrt." : null) : null;
      const [eigenerHinweis, takt, fremdZuletzt] = await Promise.all([
        gesperrt ? null : a.hinweis(now).catch(() => null),
        a.takt(now).catch(() => "unbekannt"),
        lauf || !a.zuletzt ? null : a.zuletzt(now).catch(() => null),
      ]);
      const hinweis = gesperrt ?? eigenerHinweis;
      const naechster = hinweis ? null : await a.naechster(now).catch(() => null);
      // Ein offener Lauf, den gerade niemand ausführt, stammt aus der Zeit vor einem Neustart.
      const abgebrochen = lauf?.ergebnis === "offen" && !laeuft;
      return {
        id: a.id,
        agent: a.agent,
        name: a.name,
        takt,
        letzterLauf: lauf?.zuletzt ?? fremdZuletzt,
        ergebnis: !lauf || laeuft ? null : abgebrochen ? "fehler" : lauf.ergebnis === "offen" ? null : lauf.ergebnis,
        fehler: abgebrochen ? ABGEBROCHEN : laeuft ? null : (lauf?.fehler ?? null),
        naechsterLauf: naechster?.toISOString() ?? null,
        hinweis,
        selbst,
        laeuft,
      };
    }),
  );
  return { eintraege, notaus: zustand.notaus.an, stand: now.toISOString() };
}

// Nur für Tests: vergisst den Stand im Speicher, damit die Datei neu gelesen wird.
export function vergissZeitplan() {
  shared.stand = null;
  shared.laden = null;
  shared.laufend.clear();
  shared.gestartet.clear();
}

export const zeitplanGeschrieben = () => shared.speichern;
