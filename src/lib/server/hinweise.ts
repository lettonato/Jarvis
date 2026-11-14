import fs from "node:fs/promises";
import path from "node:path";
import { isoDate } from "../dates";
import { anlaesse, darfJetzt, HINWEIS_REGELN, hinweisMitteilung, hinweisNachricht, merke, neueHinweise, type Anlass, type HinweisStand } from "../hinweise";
import { dateOf } from "../tasks";
import { CONFIG_DIR, readConfig } from "./config";
import { MitteilungError, mitteilungMoeglich, zeigeMitteilung } from "./mitteilung";
import { readTasks } from "./obsidian";
import { faelligeAufgaben } from "./projekte/projekte";
import { prefsOf, sendeVonSelbst, wartetNoch } from "./telegram";

// Hinweise am Tag: Der gemeinsame Zeitplan fragt jede Minute, ob etwas Neues zu melden ist (hinweiseFaellig),
// und schickt es dann in einer Nachricht aufs Handy (sendeHinweise). Die Regeln stehen in src/lib/hinweise.ts.
// Der Stand in ~/.jarvis/hinweise.json enthält nur Schlüssel aus Nummern und Daten sowie Sendezeiten, keinen Text.
//
// Denselben Hinweis gibt es als Mitteilung am Mac selbst (macHinweiseFaellig, zeigeHinweise). Handy und Mac sind
// zwei Wege mit je eigenem Schalter und eigenem Stand: Ist Telegram gerade nicht erreichbar, zeigt der Mac den
// Hinweis trotzdem, und aufs Handy kommt er nach, ohne dass er am Mac ein zweites Mal erscheint. In der Datei
// steht der Stand fürs Handy wie bisher ganz oben, der für den Mac darunter unter „mac“.
//
// Eine Ausnahme verbindet die beiden: Was Morgenbriefing oder Tagesabschluss gesagt haben und was wirklich
// hinausging, gilt auch am Mac als gemeldet (merkeAmMac). Wer das Briefing gelesen hat, braucht dasselbe nicht
// noch einmal als Mitteilung.

type Kanal = "handy" | "mac";
type Stand = Record<Kanal, HinweisStand>;

const DATEI = path.join(CONFIG_DIR, "hinweise.json");
const MINUTE = 60_000;
// War Telegram nicht erreichbar, kommt der nächste Versuch nicht schon in der nächsten Minute.
const NEUER_VERSUCH_MS = 15 * MINUTE;

// Der Tresor wird für die eigenen Aufgaben von heute höchstens so oft durchsucht.
const TRESOR_ALLE_MS = 10 * MINUTE;

type Shared = { stand: Stand | null; laden: Promise<Stand> | null; speichern: Promise<void>; eigene: { at: number; heute: string; texte: { text: string }[] } | null };
const holder = globalThis as typeof globalThis & { __jarvisHinweise?: Shared };
const shared: Shared = (holder.__jarvisHinweise ??= { stand: null, laden: null, speichern: Promise.resolve(), eigene: null });

const istZeit = (s: unknown): s is string => typeof s === "string" && !Number.isNaN(Date.parse(s));
const istTag = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Liest nur, was in den Stand gehört. Eine fehlende oder kaputte Datei heißt: noch nichts gemeldet.
function saeubereKanal(roh: unknown): HinweisStand {
  const r = roh && typeof roh === "object" ? (roh as { gesendet?: unknown; gemeldet?: unknown }) : {};
  const gemeldet = r.gemeldet && typeof r.gemeldet === "object" ? Object.entries(r.gemeldet as Record<string, unknown>).filter((e): e is [string, string] => istTag(e[1])) : [];
  return { gesendet: Array.isArray(r.gesendet) ? r.gesendet.filter(istZeit).slice(-20) : [], gemeldet: Object.fromEntries(gemeldet.slice(-2000)) };
}

// Eine Datei von früher kennt nur das Handy. Was dort schon gemeldet ist (vom Briefing oder als Hinweis), ist
// dann auch für den Mac nichts Neues; gezeigt hat er aber noch nichts, die Obergrenze beginnt bei null.
function saeubere(roh: unknown): Stand {
  const handy = saeubereKanal(roh);
  const mac = roh && typeof roh === "object" ? (roh as { mac?: unknown }).mac : undefined;
  return { handy, mac: mac && typeof mac === "object" ? saeubereKanal(mac) : { gesendet: [], gemeldet: { ...handy.gemeldet } } };
}

async function lade(): Promise<Stand> {
  // Nach einem Neuladen des Programms im laufenden Betrieb kann im Speicher noch ein Stand in der alten Form
  // liegen (nur das Handy). Der wird nicht benutzt, sondern neu aus der Datei gelesen.
  if (shared.stand && !(shared.stand.handy && shared.stand.mac)) shared.stand = null;
  if (shared.stand) return shared.stand;
  shared.laden ??= fs
    .readFile(DATEI, "utf8")
    .then((text) => saeubere(JSON.parse(text)))
    .catch(() => saeubere(null))
    .then((stand) => (shared.stand = stand))
    .finally(() => (shared.laden = null));
  return shared.laden;
}

// Ändert den Stand und speichert ihn. Die Änderung rechnet immer auf dem neuesten Stand: Briefing und Hinweis
// können in derselben Minute laufen, und keiner darf überschreiben, was der andere gerade gemerkt hat.
async function aendere(aenderung: (stand: Stand) => Stand): Promise<void> {
  await lade();
  const stand = (shared.stand = aenderung(shared.stand!));
  const json = JSON.stringify({ ...stand.handy, mac: stand.mac });
  shared.speichern = shared.speichern
    .then(async () => {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${DATEI}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${DATEI}.tmp`, DATEI);
    })
    .catch((e) => console.error("Hinweise nicht gespeichert:", e instanceof Error ? e.message : e));
  return shared.speichern;
}

// Die eigenen Aufgaben aus dem Tresor, die heute fällig sind. Gemerkt für ein paar Minuten, damit der Tresor
// nicht jede Minute durchsucht wird.
async function eigeneHeute(now: Date, heute: string, vault: string | undefined): Promise<{ text: string }[]> {
  if (!vault) return [];
  const alt = shared.eigene;
  if (alt && alt.heute === heute && now.getTime() >= alt.at && now.getTime() - alt.at < TRESOR_ALLE_MS) return alt.texte;
  const tresor = await readTasks(vault).catch(() => null);
  const texte = tresor?.configured ? tresor.tasks.filter((t) => dateOf(t) === heute).map((t) => ({ text: t.text })) : [];
  shared.eigene = { at: now.getTime(), heute, texte };
  return texte;
}

// Was gerade ein Anlass wäre. Die eigenen Aufgaben zählen erst am Nachmittag und nur, solange der Hinweis von
// heute noch aussteht.
async function lage(now: Date, stand: HinweisStand, mitEigenen: boolean): Promise<Anlass[]> {
  const config = await readConfig();
  const heute = isoDate(now);
  const aufgaben = await faelligeAufgaben(now).catch(() => []);
  const nachmittag = mitEigenen && now.getHours() >= HINWEIS_REGELN.nachmittagStunde && !stand.gemeldet[`heute:${heute}`];
  return anlaesse(aufgaben, nachmittag ? await eigeneHeute(now, heute, config.vaultPath) : [], heute, config.name);
}

async function eingeschaltet(): Promise<{ namen: boolean } | null> {
  const tg = (await readConfig()).telegram;
  return tg?.chatId && prefsOf(tg).hinweise ? { namen: prefsOf(tg).projekte } : null;
}

// Die Mitteilung am Mac braucht kein Handy: nur ihren eigenen Schalter und einen Mac.
export const macHinweiseAn = async (): Promise<boolean> => (await readConfig()).mitteilungen?.hinweise === true;

// Was auf diesem Weg jetzt neu wäre. Jeder Weg rechnet mit seinem eigenen Stand.
async function neuAuf(kanal: Kanal, now: Date): Promise<Anlass[]> {
  const stand = (await lade())[kanal];
  if (!darfJetzt(stand, now)) return [];
  return neueHinweise(await lage(now, stand, true), stand, now);
}

// Merkt die Anlässe auf einem Weg als gemeldet; der andere Weg bleibt, wie er ist.
const gemeldetAuf = (kanal: Kanal, neu: Anlass[], now: Date) => aendere((s) => ({ ...s, [kanal]: merke(s[kanal], neu, now, true) }));

export async function hinweiseFaellig(now: Date, letzterLauf: Date | null): Promise<boolean> {
  if (!(await eingeschaltet()) || wartetNoch(now, letzterLauf, NEUER_VERSUCH_MS)) return false;
  return (await neuAuf("handy", now)).length > 0;
}

// Schickt, was neu ist, in einer Nachricht. Gemerkt wird erst, wenn Telegram erreichbar war (sendeVonSelbst).
export async function sendeHinweise(now: Date): Promise<void> {
  const an = await eingeschaltet();
  if (!an) return;
  const neu = await neuAuf("handy", now);
  if (!neu.length) return;
  await sendeVonSelbst([{ merken: () => gemeldetAuf("handy", neu, now), inhalt: async () => hinweisNachricht(neu, isoDate(now), an.namen) }]);
}

export async function macHinweiseFaellig(now: Date, letzterLauf: Date | null): Promise<boolean> {
  if (!mitteilungMoeglich() || !(await macHinweiseAn()) || wartetNoch(now, letzterLauf, NEUER_VERSUCH_MS)) return false;
  return (await neuAuf("mac", now)).length > 0;
}

// Zeigt, was neu ist, als eine Mitteilung am Mac. Gemerkt wird, wenn der Mac sie angenommen hat. Hat er sie
// abgelehnt, ist sicher nichts erschienen: nichts wird gemerkt, und der Zeitplan versucht es später noch einmal.
// Hat er gar nicht geantwortet, weiß niemand, ob sie erschienen ist. Dann geht der Hinweis nicht verloren, aber
// der Versuch zählt wie eine Mitteilung: Der nächste kommt frühestens eine Stunde später, höchstens drei am Tag.
export async function zeigeHinweise(now: Date): Promise<void> {
  if (!mitteilungMoeglich() || !(await macHinweiseAn())) return;
  const neu = await neuAuf("mac", now);
  if (!neu.length) return;
  const { titel, text } = hinweisMitteilung(neu);
  try {
    await zeigeMitteilung(titel, text);
  } catch (e) {
    if (e instanceof MitteilungError && e.art === "unklar") await gemeldetAuf("mac", [], now);
    throw e;
  }
  await gemeldetAuf("mac", neu, now);
}

// Nach Morgenbriefing oder Tagesabschluss: Was dort als überfällig steht, kommt nicht noch einmal als Hinweis.
// Dass jemand anderes mit seiner Aufgabe im Verzug ist, sagen die beiden nicht; dieser Hinweis kommt weiter.
// Lässt sich das Projektgedächtnis gerade nicht lesen, wird nichts gemerkt (dann nennt auch das Briefing keine Projekte).
// Gemerkt wird hier fürs Handy, und zwar noch bevor die Meldung hinausgeht (doppelt soll dort nichts kommen).
// Zurück kommt, was gemerkt wurde: Ist die Meldung wirklich hinausgegangen, gilt es danach auch am Mac (merkeAmMac).
export async function merkeGemeldet(now: Date): Promise<Anlass[]> {
  const schon = (await lage(now, (await lade()).handy, false)).filter((a) => a.art === "ueberfaellig");
  await aendere((s) => ({ ...s, handy: merke(s.handy, schon, now, false) }));
  return schon;
}

// Was das Briefing oder der Tagesabschluss gesagt hat, gilt auch am Mac als gemeldet. Erst aufrufen, wenn die
// Meldung hinausgegangen ist: Kam sie nicht an, hat sie niemand gelesen, und der Mac zeigt den Hinweis selbst.
export const merkeAmMac = (gesagt: Anlass[], now: Date): Promise<void> => aendere((s) => ({ ...s, mac: merke(s.mac, gesagt, now, false) }));

// Nur für Tests: vergisst den Stand im Speicher, damit die Datei neu gelesen wird.
export function vergissHinweise() {
  shared.stand = null;
  shared.laden = null;
  shared.eigene = null;
}
export const hinweiseGeschrieben = () => shared.speichern;
