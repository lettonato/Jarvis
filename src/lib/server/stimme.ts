import { promises as fs } from "node:fs";
import path from "node:path";
import { isoDate } from "../dates";
import {
  fehlerText,
  GRUND_TEXT,
  istStimmeId,
  istStimmeModell,
  kontoAus,
  modellInfo,
  passtInsLimit,
  probeSatz,
  siehtAusWieSchluessel,
  stimmenAus,
  stimmeStatus,
  STIMME_LIMIT_MAX,
  STIMME_LIMIT_MIN,
  STIMME_MAX_TEXT,
  type StimmeGrund,
  type StimmeKonto,
  type StimmeStatus,
  type StimmeWahl,
} from "../stimme";
import { aendereConfig, CONFIG_DIR, readConfig, type ElevenlabsConfig, type JarvisConfig } from "./config";
import { protokolliere } from "./gateway/audit";
import { notausAktiv } from "./gateway/zustand";

// Die Wolkenstimme: JARVIS schickt einen Satz an ElevenLabs und bekommt ihn als Ton zurück.
// Der Schlüssel bleibt auf dem Server; die Seite bekommt nur den Ton. Vor jeder Anfrage wird geprüft:
// Schlüssel da, Stimme gewählt, eingeschaltet, kein Not-Aus, Tageslimit nicht erreicht. Sonst spricht der Mac.
// Was vorgelesen wird, steht nirgends im Audit-Log und wird hier nicht gespeichert, nur die Zeichenzahl des Tages.

const basis = () => process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io";
const datei = () => path.join(CONFIG_DIR, "stimme.json");
const SPRECH_TIMEOUT_MS = 20_000;
const LISTEN_TIMEOUT_MS = 10_000;
// So lange darf der Ton eines Satzes höchstens fließen.
const TON_TIMEOUT_MS = 90_000;
// MP3 mit 44,1 kHz und 128 kbit/s: gibt es in jedem Tarif und spielt jeder Browser.
const FORMAT = "mp3_44100_128";

type Verbrauch = { tag: string; zeichen: number };
type Shared = { kette: Promise<unknown>; stimmen: Map<string, { bis: number; liste: StimmeWahl[] }>; fehler: string | null };
const holder = globalThis as typeof globalThis & { __jarvisStimme?: Shared };
const shared: Shared = (holder.__jarvisStimme ??= { kette: Promise.resolve(), stimmen: new Map(), fehler: null });

async function liesVerbrauch(now: Date): Promise<number> {
  try {
    const v = JSON.parse(await fs.readFile(datei(), "utf8")) as Verbrauch;
    return v.tag === isoDate(now) && Number.isFinite(v.zeichen) ? Math.max(0, v.zeichen) : 0;
  } catch {
    return 0;
  }
}

// Eine Buchung nach der anderen, damit zwei Sätze gleichzeitig das Limit nicht gemeinsam überspringen.
function nacheinander<T>(f: () => Promise<T>): Promise<T> {
  const next = shared.kette.then(f, f);
  shared.kette = next.catch(() => {});
  return next;
}

async function schreibeVerbrauch(now: Date, zeichen: number) {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(datei(), JSON.stringify({ tag: isoDate(now), zeichen: Math.max(0, zeichen) } satisfies Verbrauch), { mode: 0o600 });
}

// Zählt vor dem Senden: ElevenLabs berechnet jedes Zeichen, auch wenn du JARVIS mitten im Satz unterbrichst.
const reserviere = (now: Date, text: string, limit: number) =>
  nacheinander(async () => {
    const heute = await liesVerbrauch(now);
    if (!passtInsLimit(text, heute, limit)) return false;
    await schreibeVerbrauch(now, heute + text.length);
    return true;
  });

// Gibt nur zurück, wenn der Zähler noch vom selben Tag ist: Nach Mitternacht gehört er schon dem neuen Tag.
const gibZurueck = (now: Date, zeichen: number) =>
  nacheinander(async () => {
    let tag = "";
    try {
      tag = (JSON.parse(await fs.readFile(datei(), "utf8")) as Verbrauch).tag;
    } catch {
      return;
    }
    if (tag === isoDate(now)) await schreibeVerbrauch(now, (await liesVerbrauch(now)) - zeichen);
  });

export async function stimmeStatusVon(config: JarvisConfig, now = new Date()): Promise<StimmeStatus> {
  const el = config.elevenlabs;
  return stimmeStatus({
    apiKey: el?.apiKey,
    enabled: el?.enabled,
    voiceId: el?.voiceId,
    voiceName: el?.voiceName,
    model: el?.model,
    tagesZeichen: el?.tagesZeichen,
    heuteZeichen: await liesVerbrauch(now),
    notaus: await notausAktiv(),
    fehler: shared.fehler,
  });
}

async function frage(apiKey: string, pfad: string): Promise<{ ok: true; daten: unknown } | { ok: false; status: number }> {
  try {
    const res = await fetch(`${basis()}${pfad}`, { headers: { "xi-api-key": apiKey, accept: "application/json" }, signal: AbortSignal.timeout(LISTEN_TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, daten: await res.json() };
  } catch {
    return { ok: false, status: 0 };
  }
}

// Die Stimmen deines ElevenLabs-Kontos. Dient auch als Prüfung des Schlüssels: Wer die Liste bekommt, ist angemeldet.
export async function stimmenListe(apiKey: string, { frisch = false } = {}): Promise<{ ok: true; stimmen: StimmeWahl[] } | { ok: false; error: string }> {
  const gemerkt = shared.stimmen.get(apiKey);
  if (!frisch && gemerkt && gemerkt.bis > Date.now()) return { ok: true, stimmen: gemerkt.liste };
  const antwort = await frage(apiKey, "/v2/voices?page_size=100");
  if (!antwort.ok) return { ok: false, error: fehlerText(antwort.status) };
  const liste = stimmenAus(antwort.daten);
  shared.stimmen.set(apiKey, { bis: Date.now() + 5 * 60_000, liste });
  return { ok: true, stimmen: liste };
}

export const testElevenKey = (apiKey: string) => stimmenListe(apiKey, { frisch: true });

// Was das Konto diesen Monat verbraucht hat. Darf der Schlüssel das nicht lesen, fehlt die Angabe einfach.
export async function stimmeKonto(apiKey: string): Promise<StimmeKonto | null> {
  const antwort = await frage(apiKey, "/v1/user/subscription");
  return antwort.ok ? kontoAus(antwort.daten) : null;
}

export const vergissStimmen = () => {
  shared.stimmen.clear();
  shared.fehler = null;
};

const AUS = { art: "einstellung", agent: "mensch", kanal: "mac", ergebnis: "ausgefuehrt" } as const;

export type StimmeAktion =
  | { action: "elevenlabs"; apiKey: string }
  | { action: "elevenlabsPrefs"; enabled?: boolean; voiceId?: string; model?: string; tagesZeichen?: number }
  | { action: "removeElevenlabs" };

// Einrichten und Schalten aus den Einstellungen. Erst wird geprüft (Schlüssel und Stimme beim Anbieter, das kann
// dauern), dann in einem Zug gelesen, geändert und gespeichert. Geändert wird der Abschnitt der Stimme, wie er
// in dem Augenblick ist: Wurde der Schlüssel inzwischen entfernt oder getauscht, gilt eine Änderung an Stimme,
// Modell, Limit oder Schalter nicht mehr. Ins Audit-Log kommt, was sich wirklich geändert hat.
export async function stimmeEinstellen(body: StimmeAktion): Promise<{ ok: true; config: JarvisConfig; message?: string } | { ok: false; error: string }> {
  const stand = (await readConfig()).elevenlabs;
  let aendern: (alt: ElevenlabsConfig | undefined) => ElevenlabsConfig | undefined;
  let message: string | undefined;
  let grund = "";
  if (body.action === "removeElevenlabs") {
    aendern = () => undefined;
    grund = " (Schlüssel entfernt)";
  } else if (body.action === "elevenlabs") {
    const apiKey = String(body.apiKey ?? "").trim();
    if (!siehtAusWieSchluessel(apiKey)) return { ok: false, error: "Das sieht nicht nach einem ElevenLabs-Schlüssel aus. Bitte den ganzen Schlüssel einfügen, er beginnt meist mit sk_." };
    const result = await testElevenKey(apiKey);
    if (!result.ok) return result;
    message = stand?.apiKey === apiKey ? "Verbunden. Der Schlüssel ist derselbe wie bisher." : `Verbunden. In deinem Konto sind ${result.stimmen.length} Stimmen. Such dir eine aus und schalte sie ein.`;
    // Ein neuer Schlüssel schaltet nichts ein, und ein anderer Schlüssel kann zu einem anderen Konto gehören:
    // Stimme und Schalter wählst du danach selbst. Modell und Tageslimit bleiben.
    aendern = (alt) => (alt?.apiKey === apiKey ? alt : { apiKey, ...(alt?.model ? { model: alt.model } : {}), ...(alt?.tagesZeichen ? { tagesZeichen: alt.tagesZeichen } : {}) });
    grund = " (neuer Schlüssel)";
  } else {
    if (!stand?.apiKey) return { ok: false, error: "Bitte zuerst den ElevenLabs-Schlüssel eintragen." };
    let stimme: { id: string; name: string } | undefined;
    if (body.voiceId !== undefined) {
      // Der Name kommt aus der Liste von ElevenLabs, nicht von der Seite; eine fremde Kennung wird nicht gespeichert.
      const liste = istStimmeId(body.voiceId) ? await stimmenListe(stand.apiKey) : null;
      if (liste && !liste.ok) return liste;
      stimme = liste?.ok ? liste.stimmen.find((v) => v.id === body.voiceId) : undefined;
      if (!stimme) return { ok: false, error: "Diese Stimme gibt es in deinem ElevenLabs-Konto nicht." };
    }
    if (body.model !== undefined && !istStimmeModell(body.model)) return { ok: false, error: "Dieses Modell gibt es nicht." };
    const model = body.model;
    let limit: number | undefined;
    if (body.tagesZeichen !== undefined) {
      limit = Math.round(Number(body.tagesZeichen));
      if (!(limit >= STIMME_LIMIT_MIN && limit <= STIMME_LIMIT_MAX)) {
        return { ok: false, error: `Bitte eine Zahl zwischen ${STIMME_LIMIT_MIN.toLocaleString("de-DE")} und ${STIMME_LIMIT_MAX.toLocaleString("de-DE")} eintragen.` };
      }
    }
    if (body.enabled === true && !(stimme ?? stand.voiceId)) return { ok: false, error: "Bitte zuerst eine Stimme auswählen." };
    const schluessel = stand.apiKey;
    aendern = (alt) => {
      if (!alt || alt.apiKey !== schluessel) return alt;
      const next = { ...alt };
      if (stimme) {
        next.voiceId = stimme.id;
        next.voiceName = stimme.name;
      }
      if (model !== undefined) next.model = model;
      if (limit !== undefined) next.tagesZeichen = limit;
      // Einschalten nur mit einer Stimme (sie könnte inzwischen fehlen); ausschalten geht immer.
      if (typeof body.enabled === "boolean" && (!body.enabled || next.voiceId)) next.enabled = body.enabled;
      return next;
    };
  }
  let war = false;
  let ist = false;
  const config = await aendereConfig((c) => {
    war = c.elevenlabs?.enabled === true;
    const next = aendern(c.elevenlabs);
    ist = next?.enabled === true;
    if (next === c.elevenlabs) return null;
    const neu = { ...c };
    if (next) neu.elevenlabs = next;
    else delete neu.elevenlabs;
    return neu;
  });
  shared.fehler = null;
  // Ab dem Einschalten geht Vorgelesenes an einen fremden Dienst (oder nicht mehr): Das gehört ins Audit-Log.
  if (war !== ist) await protokolliere({ ...AUS, was: ist ? "ElevenLabs-Stimme eingeschaltet: Vorgelesenes geht an ElevenLabs" : `ElevenLabs-Stimme ausgeschaltet${grund}` });
  return { ok: true, config, ...(message ? { message } : {}) };
}

export type Gesprochen =
  | { ok: true; audio: ReadableStream<Uint8Array>; typ: string }
  | { ok: false; status: number; grund: StimmeGrund | "text" | "dienst"; error: string };

// Ein Satz zu ElevenLabs, der Ton zurück. probe: der feste Probesatz, auch wenn der Schalter noch aus ist.
export async function sprich(text: string, { probe = false, now = new Date() }: { probe?: boolean; now?: Date } = {}): Promise<Gesprochen> {
  const config = await readConfig();
  const status = await stimmeStatusVon(config, now);
  const satz = probe ? probeSatz(config.name) : String(text ?? "").replace(/\s+/g, " ").trim();
  if (!satz) return { ok: false, status: 400, grund: "text", error: "Es gibt nichts vorzulesen." };
  if (satz.length > STIMME_MAX_TEXT) return { ok: false, status: 413, grund: "text", error: `Mehr als ${STIMME_MAX_TEXT} Zeichen auf einmal lese ich nicht vor.` };
  const grund = probe && status.grund === "aus" ? null : status.grund;
  if (grund) return { ok: false, status: grund === "limit" ? 429 : 409, grund, error: GRUND_TEXT[grund] };
  const el = config.elevenlabs!;
  if (!(await reserviere(now, satz, status.tagesZeichen))) return { ok: false, status: 429, grund: "limit", error: GRUND_TEXT.limit };

  const modell = modellInfo(status.model);
  let antwort: Response | null = null;
  let code = 0;
  // Die Frist gilt bis zur Antwort; für den Ton selbst gibt es danach eine eigene, längere.
  const abbruch = new AbortController();
  const frist = setTimeout(() => abbruch.abort(), SPRECH_TIMEOUT_MS);
  try {
    antwort = await fetch(`${basis()}/v1/text-to-speech/${encodeURIComponent(status.voiceId!)}/stream?output_format=${FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": el.apiKey, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: satz, model_id: modell.id, ...(modell.sprachcode ? { language_code: "de" } : {}) }),
      signal: abbruch.signal,
      cache: "no-store",
    });
    code = antwort.status;
  } catch {
    antwort = null;
  } finally {
    clearTimeout(frist);
  }
  if (!antwort?.ok || !antwort.body) {
    // Nichts bekommen, also nichts verbraucht. Den Text des Dienstes liest JARVIS nicht aus, nur den Statuscode.
    abbruch.abort();
    await gibZurueck(now, satz.length);
    shared.fehler = fehlerText(code);
    return { ok: false, status: 502, grund: "dienst", error: shared.fehler };
  }
  shared.fehler = null;
  setTimeout(() => abbruch.abort(), TON_TIMEOUT_MS).unref?.();
  return { ok: true, audio: antwort.body, typ: "audio/mpeg" };
}
