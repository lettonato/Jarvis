import fs from "node:fs/promises";
import path from "node:path";
import { isoDate } from "../dates";
import { anlaesse, darfJetzt, HINWEIS_REGELN, hinweisNachricht, merke, neueHinweise, type Anlass, type HinweisStand } from "../hinweise";
import { dateOf } from "../tasks";
import { CONFIG_DIR, readConfig } from "./config";
import { readTasks } from "./obsidian";
import { faelligeAufgaben } from "./projekte/projekte";
import { prefsOf, sendeVonSelbst, wartetNoch } from "./telegram";

// Hinweise am Tag: Der gemeinsame Zeitplan fragt jede Minute, ob etwas Neues zu melden ist (hinweiseFaellig),
// und schickt es dann in einer Nachricht aufs Handy (sendeHinweise). Die Regeln stehen in src/lib/hinweise.ts.
// Der Stand in ~/.jarvis/hinweise.json enthält nur Schlüssel aus Nummern und Daten sowie Sendezeiten, keinen Text.

const DATEI = path.join(CONFIG_DIR, "hinweise.json");
const MINUTE = 60_000;
// War Telegram nicht erreichbar, kommt der nächste Versuch nicht schon in der nächsten Minute.
const NEUER_VERSUCH_MS = 15 * MINUTE;

// Der Tresor wird für die eigenen Aufgaben von heute höchstens so oft durchsucht.
const TRESOR_ALLE_MS = 10 * MINUTE;

type Shared = { stand: HinweisStand | null; laden: Promise<HinweisStand> | null; speichern: Promise<void>; eigene: { at: number; heute: string; texte: { text: string }[] } | null };
const holder = globalThis as typeof globalThis & { __jarvisHinweise?: Shared };
const shared: Shared = (holder.__jarvisHinweise ??= { stand: null, laden: null, speichern: Promise.resolve(), eigene: null });

const istZeit = (s: unknown): s is string => typeof s === "string" && !Number.isNaN(Date.parse(s));
const istTag = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Liest nur, was in den Stand gehört. Eine fehlende oder kaputte Datei heißt: noch nichts gemeldet.
function saeubere(roh: unknown): HinweisStand {
  const r = roh && typeof roh === "object" ? (roh as { gesendet?: unknown; gemeldet?: unknown }) : {};
  const gemeldet = r.gemeldet && typeof r.gemeldet === "object" ? Object.entries(r.gemeldet as Record<string, unknown>).filter((e): e is [string, string] => istTag(e[1])) : [];
  return { gesendet: Array.isArray(r.gesendet) ? r.gesendet.filter(istZeit).slice(-20) : [], gemeldet: Object.fromEntries(gemeldet.slice(-2000)) };
}

async function lade(): Promise<HinweisStand> {
  if (shared.stand) return shared.stand;
  shared.laden ??= fs
    .readFile(DATEI, "utf8")
    .then((text) => saeubere(JSON.parse(text)))
    .catch(() => ({ gesendet: [], gemeldet: {} }))
    .then((stand) => (shared.stand = stand))
    .finally(() => (shared.laden = null));
  return shared.laden;
}

// Ändert den Stand und speichert ihn. Die Änderung rechnet immer auf dem neuesten Stand: Briefing und Hinweis
// können in derselben Minute laufen, und keiner darf überschreiben, was der andere gerade gemerkt hat.
async function aendere(aenderung: (stand: HinweisStand) => HinweisStand): Promise<void> {
  await lade();
  const stand = (shared.stand = aenderung(shared.stand!));
  const json = JSON.stringify(stand);
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

export async function hinweiseFaellig(now: Date, letzterLauf: Date | null): Promise<boolean> {
  if (!(await eingeschaltet()) || wartetNoch(now, letzterLauf, NEUER_VERSUCH_MS)) return false;
  const stand = await lade();
  if (!darfJetzt(stand, now)) return false;
  return neueHinweise(await lage(now, stand, true), stand, now).length > 0;
}

// Schickt, was neu ist, in einer Nachricht. Gemerkt wird erst, wenn Telegram erreichbar war (sendeVonSelbst).
export async function sendeHinweise(now: Date): Promise<void> {
  const an = await eingeschaltet();
  if (!an) return;
  const stand = await lade();
  const neu = neueHinweise(await lage(now, stand, true), stand, now);
  if (!neu.length) return;
  await sendeVonSelbst([{ merken: () => aendere((s) => merke(s, neu, now, true)), inhalt: async () => hinweisNachricht(neu, isoDate(now), an.namen) }]);
}

// Nach Morgenbriefing oder Tagesabschluss: Was dort als überfällig steht, kommt nicht noch einmal als Hinweis.
// Dass jemand anderes mit seiner Aufgabe im Verzug ist, sagen die beiden nicht; dieser Hinweis kommt weiter.
// Lässt sich das Projektgedächtnis gerade nicht lesen, wird nichts gemerkt (dann nennt auch das Briefing keine Projekte).
export async function merkeGemeldet(now: Date): Promise<void> {
  const schon = (await lage(now, await lade(), false)).filter((a) => a.art === "ueberfaellig");
  await aendere((s) => merke(s, schon, now, false));
}

// Nur für Tests: vergisst den Stand im Speicher, damit die Datei neu gelesen wird.
export function vergissHinweise() {
  shared.stand = null;
  shared.laden = null;
  shared.eigene = null;
}
export const hinweiseGeschrieben = () => shared.speichern;
