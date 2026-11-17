import fs from "node:fs/promises";
import path from "node:path";
import { baueBericht, einordnung, fakten, HINWEIS, METALLE, METALLE_ZEITEN, metallLage, TAGE_ABFRAGEN, veraltet, type MetallBericht, type MetalleSnapshot, type MetallId, type TagesKerze } from "../metalle";
import { faelligerTermin, MAX_ZEITEN, NACHHOL_FENSTER_MS, naechsterTermin, saeubereZeiten } from "../zeitplan";
import { aendereConfig, CONFIG_DIR, readConfig, twelveKey, type JarvisConfig } from "./config";
import { getTwelve, TwelveError } from "./desk/commodities";
import { agentSperre } from "./gateway/zustand";

// Der Edelmetall-Agent: holt die Tageskurse von Gold und Silber bei Twelve Data (mit dem Schlüssel, den auch der
// Spielgeld-Desk nutzt) und rechnet daraus ein Lagebild (src/lib/metalle.ts). Kein KI-Modell, kein Handel, kein
// neuer Dienst: Ein Lauf ist eine Abfrage für zwei Kursreihen, dazu eine zweite für den Fonds, wenn der Plan ein
// Metall nicht je Feinunze liefert. Twelve Data zählt je Kursreihe einen Abruf aus dem Kontingent. Der Stand
// liegt in ~/.jarvis/metalle.json und enthält nur Zahlen, Daten und feste Sätze des Programms. Der Schlüssel
// geht nur im Header an Twelve Data.

const DATEI = path.join(CONFIG_DIR, "metalle.json");

type State = { bericht: MetallBericht | null; letzterVersuch: string | null; fehler: string | null };
type Shared = { state: State | null; laden: Promise<State> | null; speichern: Promise<void>; laeuft: Promise<MetallBericht> | null };
const holder = globalThis as typeof globalThis & { __jarvisMetalle?: Shared };
const shared: Shared = (holder.__jarvisMetalle ??= { state: null, laden: null, speichern: Promise.resolve(), laeuft: null });

export class MetalleError extends Error {}

const leer = (): State => ({ bericht: null, letzterVersuch: null, fehler: null });

async function lade(): Promise<State> {
  if (shared.state) return shared.state;
  shared.laden ??= fs
    .readFile(DATEI, "utf8")
    .then((text) => ({ ...leer(), ...(JSON.parse(text) as Partial<State>) }))
    .catch(() => leer())
    .then((state) => (shared.state = state))
    .finally(() => (shared.laden = null));
  return shared.laden;
}

function speichere(state: State): Promise<void> {
  const json = JSON.stringify(state);
  shared.speichern = shared.speichern
    .then(async () => {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${DATEI}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${DATEI}.tmp`, DATEI);
    })
    .catch((e) => console.error("Edelmetalle nicht gespeichert:", e instanceof Error ? e.message : e));
  return shared.speichern;
}

export const metalleAuto = (config: JarvisConfig) => config.metalle?.auto !== false;
export function metalleZeiten(config: JarvisConfig): string[] {
  const zeiten = saeubereZeiten(config.metalle?.zeiten);
  return zeiten.length > 0 ? zeiten : METALLE_ZEITEN;
}

type TwelveTag = { datetime?: string; open?: string; high?: string; low?: string; close?: string };
type TwelveReihe = { status?: string; code?: number; values?: TwelveTag[] };

// Tageskerzen kommen mit dem Datum als „JJJJ-MM-TT“, die neueste zuerst.
const kerzen = (werte: TwelveTag[] | undefined): TagesKerze[] =>
  (werte ?? [])
    .map((v) => ({ tag: String(v.datetime ?? "").slice(0, 10), open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close) }))
    .reverse();

// Was schiefging, als fester Satz. Der Text, den Twelve Data mitschickt, wird nicht übernommen: Er stammt von
// außen und hat in der Oberfläche und beim KI-Gehirn nichts verloren.
function erklaere(e: unknown): string {
  if (e instanceof MetalleError) return e.message;
  if (e instanceof TwelveError) {
    if (e.code === 401 || e.code === 403) return "Twelve Data nimmt den Schlüssel nicht an oder der Plan liefert diese Kurse nicht.";
    if (e.code === 429) return "Das Kontingent bei Twelve Data ist für den Moment aufgebraucht.";
    // Auch der Code kommt von außen: nur eine ganze Zahl wird genannt.
    return Number.isInteger(e.code) ? `Twelve Data meldet einen Fehler (${e.code}).` : "Twelve Data meldet einen Fehler.";
  }
  return "Twelve Data ist gerade nicht erreichbar.";
}

// Fragt Tageskerzen für eine Liste von Symbolen. Je Symbol kommen die Kerzen oder der Fehlercode, den Twelve Data
// für dieses Symbol nennt. Bei mehreren Symbolen steht jede Reihe unter ihrem Symbol, bei einem steht sie allein da.
// Wirft TwelveError, wenn die ganze Antwort ein Fehler ist.
async function frage(symbole: string[], apiKey: string): Promise<Record<string, TagesKerze[] | { code: number }>> {
  const antwort = await getTwelve<Record<string, TwelveReihe> & TwelveReihe>(`/time_series?symbol=${encodeURIComponent(symbole.join(","))}&interval=1day&outputsize=${TAGE_ABFRAGEN}&timezone=UTC`, apiKey);
  const aus: Record<string, TagesKerze[] | { code: number }> = {};
  for (const symbol of symbole) {
    const reihe = symbole.length === 1 ? antwort : antwort[symbol];
    aus[symbol] = reihe && reihe.status !== "error" ? kerzen(reihe.values) : { code: Number(reihe?.code) };
  }
  return aus;
}

const KONTINGENT = 429;

async function lies(apiKey: string, now: Date): Promise<MetallBericht> {
  const erste = await frage(METALLE.map((m) => m.symbol), apiKey);
  const reihen: Partial<Record<MetallId, TagesKerze[]>> = {};
  const codes: number[] = [];
  for (const m of METALLE) {
    const r = erste[m.symbol];
    if (Array.isArray(r)) reihen[m.id] = r;
    else codes.push(r.code);
  }
  // Was es je Feinunze nicht gibt (im kostenlosen Plan fehlt Silber), kommt vom Fonds, der dem Metall folgt.
  // Ist nur das Kontingent aufgebraucht, hilft eine zweite Abfrage nicht.
  const offen = METALLE.filter((m) => !metallLage(m, reihen[m.id] ?? []));
  const ersatz: Partial<Record<MetallId, TagesKerze[]>> = {};
  if (offen.length > 0 && !codes.includes(KONTINGENT)) {
    const zweite = await frage(offen.map((m) => m.ersatz.symbol), apiKey).catch((e) => {
      // Ohne den Fonds bleibt das Metall ohne Kurs; das Lagebild für das andere kommt trotzdem.
      if (e instanceof TwelveError) codes.push(e.code);
      return {} as Awaited<ReturnType<typeof frage>>;
    });
    for (const m of offen) {
      const r = zweite[m.ersatz.symbol];
      if (Array.isArray(r)) ersatz[m.id] = r;
      else if (r) codes.push(r.code);
    }
  }
  const bericht = baueBericht(reihen, now, ersatz);
  if (bericht.metalle.length === 0) {
    // Nennt Twelve Data einen Grund (Schlüssel, Plan, Kontingent), steht der als fester Satz da.
    const grund = codes.find((c) => [401, 403, KONTINGENT].includes(c));
    throw grund ? new TwelveError("", grund) : new MetalleError("Twelve Data hat keine brauchbaren Kurse für Gold und Silber geliefert.");
  }
  return bericht;
}

// Holt die Kurse und rechnet das Lagebild neu. Wirft MetalleError mit einem lesbaren Satz; das letzte
// Lagebild bleibt dann stehen. Läuft schon eine Abfrage, kommt deren Ergebnis.
export async function refreshMetalle(opts: { now?: Date } = {}): Promise<MetallBericht> {
  const now = opts.now ?? new Date();
  const sperre = await agentSperre("metalle");
  if (sperre) throw new MetalleError(sperre);
  const apiKey = twelveKey(await readConfig());
  if (!apiKey) throw new MetalleError("Für die Edelmetalle fehlt der Twelve-Data-Schlüssel. Den trägst du in den Einstellungen unter Rohstoffe ein.");
  const state = await lade();
  // Ab hier ohne Warten bis zur Zuweisung: Zwei Starts im selben Augenblick teilen sich eine Abfrage.
  if (shared.laeuft) return shared.laeuft;
  shared.laeuft = lies(apiKey, now)
    .then((bericht) => {
      state.bericht = bericht;
      state.fehler = null;
      return bericht;
    })
    .catch((e) => {
      state.fehler = erklaere(e);
      throw new MetalleError(state.fehler);
    })
    .finally(async () => {
      state.letzterVersuch = now.toISOString();
      shared.laeuft = null;
      await speichere(state);
    });
  return shared.laeuft;
}

// Nach einem Fehlschlag frühestens nach einer halben Stunde wieder von selbst (wie bei Intel).
const NEUER_VERSUCH_MS = 30 * 60_000;

// Ist nach Zeitplan jetzt ein Lauf dran? Dran ist die Uhrzeit, die im Nachholfenster liegt, solange seitdem kein
// Lagebild gelungen ist. Ein gelungener Lauf von Hand nach der Uhrzeit zählt mit, damit nicht gleich danach noch
// einmal gelesen wird. Ist ein Versuch gescheitert (der Mac ist gerade aufgewacht, das Netz fehlt noch), kommt
// der nächste nach einer halben Stunde, bis das Fenster zu ist. letzterLauf: der letzte Start durch den Zeitplan.
export async function metalleFaellig(now: Date, letzterLauf: Date | null): Promise<boolean> {
  const config = await readConfig();
  if (!twelveKey(config) || !metalleAuto(config) || shared.laeuft) return false;
  const termin = faelligerTermin(metalleZeiten(config), now, null, NACHHOL_FENSTER_MS);
  if (!termin) return false;
  const state = await lade();
  const seit = (iso: string | null | undefined) => (iso && new Date(iso) >= termin ? new Date(iso) : null);
  // Der letzte Versuch war gelungen, wenn danach kein Fehler steht.
  if (seit(state.letzterVersuch) && !state.fehler) return false;
  const versuch = [seit(state.letzterVersuch), letzterLauf && letzterLauf >= termin ? letzterLauf : null].filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0];
  return !versuch || now.getTime() - versuch.getTime() >= NEUER_VERSUCH_MS;
}

export async function metalleNaechster(now: Date): Promise<Date | null> {
  const config = await readConfig();
  return twelveKey(config) && metalleAuto(config) ? naechsterTermin(metalleZeiten(config), now) : null;
}

export async function metalleSnapshot(now = new Date()): Promise<MetalleSnapshot> {
  const [state, config] = await Promise.all([lade(), readConfig()]);
  const b = state.bericht;
  const naechster = (await agentSperre("metalle")) ? null : await metalleNaechster(now);
  return {
    eingerichtet: Boolean(twelveKey(config)),
    auto: metalleAuto(config),
    zeiten: metalleZeiten(config),
    laeuft: Boolean(shared.laeuft),
    bericht: b,
    fakten: b ? fakten(b) : [],
    einordnung: b ? einordnung(b) : [],
    hinweis: HINWEIS,
    veraltet: b ? veraltet(b, now) : false,
    letzterVersuch: state.letzterVersuch,
    fehler: state.fehler,
    naechsterLauf: naechster?.toISOString() ?? null,
  };
}

export async function saveMetalleSettings(input: { auto?: unknown; zeiten?: unknown }): Promise<void> {
  // Erst prüfen, dann in einem Zug lesen, ändern, speichern: So überschreibt das hier nichts, was gerade
  // woanders gespeichert wird.
  let zeiten: string[] | undefined;
  if (input.zeiten !== undefined) {
    zeiten = saeubereZeiten(input.zeiten);
    if (zeiten.length === 0 || !Array.isArray(input.zeiten) || zeiten.length !== new Set(input.zeiten).size) {
      throw new MetalleError(`Bitte eine bis ${MAX_ZEITEN} Uhrzeiten in der Form 07:30 eintragen.`);
    }
  }
  await aendereConfig((config) => {
    const metalle = { ...config.metalle };
    if (input.auto !== undefined) metalle.auto = input.auto === true;
    if (zeiten) metalle.zeiten = zeiten;
    return { ...config, metalle };
  });
}

// Nur für Tests: vergisst den Stand im Speicher, damit die Datei neu gelesen wird.
export function vergissMetalle() {
  shared.state = null;
  shared.laden = null;
}

export const metalleGeschrieben = () => shared.speichern;
