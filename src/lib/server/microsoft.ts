import type { CalendarEvent } from "../calendar";
import { ausGraphTermin, istAnmeldeAdresse, istAnmeldeCode, istClientId, istFolgeseite, istTenant, MICROSOFT_RECHTE, MICROSOFT_SATZ, type MicrosoftStatus } from "../microsoft";
import { aendereConfig, readConfig, type MicrosoftConfig } from "./config";

// Microsoft 365 über Microsoft Graph: Anmeldung mit einem Code (du gibst ihn selbst auf der Seite von Microsoft
// ein, JARVIS sieht dein Passwort nie) und Termine aus Outlook lesen. Die Regeln stehen in src/lib/microsoft.ts.
//
// JARVIS spricht hier mit genau zwei Servern: dem Anmeldeserver und Graph. Der Zugangsschlüssel geht nur an
// Graph, nie an eine Adresse aus einer Antwort. Was Microsoft im Fehlerfall schreibt, steht in keiner Meldung.
// Der kurzlebige Zugangsschlüssel liegt nur im Arbeitsspeicher; der Schlüssel zum Angemeldetbleiben liegt bei
// den übrigen Zugangsdaten (Datei oder Schlüsselbund).

const loginUrl = () => (process.env.MICROSOFT_LOGIN_URL ?? "https://login.microsoftonline.com").replace(/\/+$/, "");
const graphUrl = () => (process.env.MICROSOFT_GRAPH_URL ?? "https://graph.microsoft.com/v1.0").replace(/\/+$/, "");
const FRIST_MS = 15_000;
const SEITEN = 5;
const JE_SEITE = 100;
const KALENDER_MS = 5 * 60_000;
// So lange vor dem Ablauf holt JARVIS einen neuen Zugangsschlüssel.
const VORLAUF_MS = 60_000;

export class MicrosoftFehler extends Error {}

type Anmeldung = { deviceCode: string; code: string; adresse: string; bis: number; intervallMs: number; zuletzt: number; fuer: string };
type Shared = {
  zugang: { token: string; bis: number; fuer: string } | null;
  anmeldung: Anmeldung | null;
  erneuern: Promise<string> | null;
  fehler: string | null;
  kalender: { at: number; schluessel: string; events: CalendarEvent[]; unvollstaendig: boolean } | null;
};
const holder = globalThis as typeof globalThis & { __jarvisMicrosoft?: Shared };
const shared: Shared = (holder.__jarvisMicrosoft ??= { zugang: null, anmeldung: null, erneuern: null, fehler: null, kalender: null });

const schluessel = (m: MicrosoftConfig) => `${m.tenantId}/${m.clientId}`;

async function hole(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(FRIST_MS) });
  } catch {
    throw new MicrosoftFehler(MICROSOFT_SATZ.nichtErreichbar);
  }
}

// Eine Anfrage an den Anmeldeserver. Zurück kommen Status und der gelesene Text als Objekt (oder null).
async function anmeldeserver(m: MicrosoftConfig, pfad: "devicecode" | "token", felder: Record<string, string>): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const r = await hole(`${loginUrl()}/${encodeURIComponent(m.tenantId)}/oauth2/v2.0/${pfad}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ client_id: m.clientId, ...felder }).toString(),
  });
  const json = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: r.ok, status: r.status, json: json && typeof json === "object" ? json : null };
}

// Der Stand für die Einstellungen. Ein Schlüssel ist nie dabei.
export async function microsoftStatus(now = new Date()): Promise<MicrosoftStatus> {
  const m = (await readConfig()).microsoft;
  const a = shared.anmeldung && m && shared.anmeldung.fuer === schluessel(m) && shared.anmeldung.bis > now.getTime() ? shared.anmeldung : null;
  return {
    eingerichtet: Boolean(m),
    tenantId: m?.tenantId ?? null,
    clientId: m?.clientId ?? null,
    verbunden: Boolean(m?.refreshToken),
    konto: m?.konto ?? null,
    extern: m?.extern === true,
    anmeldung: a ? { code: a.code, adresse: a.adresse, bis: new Date(a.bis).toISOString() } : null,
    fehler: shared.fehler,
  };
}

function vergissSitzung() {
  shared.zugang = null;
  shared.anmeldung = null;
  shared.erneuern = null;
  shared.kalender = null;
}

// Trägt Verzeichnis und Anwendung ein. Ändert sich eines davon, gilt eine frühere Anmeldung nicht mehr.
export async function richteMicrosoftEin(eingabe: { tenantId?: unknown; clientId?: unknown }): Promise<void> {
  const tenantId = typeof eingabe.tenantId === "string" ? eingabe.tenantId.trim().toLowerCase() : "";
  const clientId = typeof eingabe.clientId === "string" ? eingabe.clientId.trim().toLowerCase() : "";
  if (!istTenant(tenantId)) throw new MicrosoftFehler("Die Verzeichnis-ID sieht nicht richtig aus. Sie ist eine Nummer wie 12345678-abcd-1234-abcd-1234567890ab oder ein Name wie firma.onmicrosoft.com.");
  if (!istClientId(clientId)) throw new MicrosoftFehler("Die Anwendungs-ID sieht nicht richtig aus. Sie ist eine Nummer wie 12345678-abcd-1234-abcd-1234567890ab.");
  // Alle Änderungen an diesem Abschnitt laufen über aendereConfig: Ein Schalter, der gerade umgelegt wird, und
  // ein Schlüssel, der gerade erneuert wird, überschreiben sich so nicht gegenseitig.
  await aendereConfig((config) => {
    const alt = config.microsoft;
    const gleich = alt && alt.tenantId === tenantId && alt.clientId === clientId;
    if (!gleich) vergissSitzung();
    return gleich ? null : { ...config, microsoft: { tenantId, clientId } };
  });
  shared.fehler = null;
}

// Entfernt die Anmeldung von diesem Mac. Bei Microsoft selbst bleibt die Zustimmung bestehen, bis sie dort
// jemand entfernt. ganz: auch Verzeichnis und Anwendung vergessen.
export async function trenneMicrosoft(ganz = false): Promise<void> {
  vergissSitzung();
  shared.fehler = null;
  await aendereConfig((config) => {
    if (!config.microsoft) return null;
    const { tenantId, clientId } = config.microsoft;
    const rest = { ...config };
    delete rest.microsoft;
    return ganz ? rest : { ...rest, microsoft: { tenantId, clientId } };
  });
  // Lief gerade ein Erneuern, darf sein Ergebnis nicht wieder als Sitzung dastehen.
  vergissSitzung();
}

// Bricht eine laufende Anmeldung ab. Eine frühere Anmeldung bleibt, wie sie ist.
export function brichMicrosoftAnmeldungAb(): void {
  shared.anmeldung = null;
}

// Der Schalter: Outlook-Termine auch im Gespräch mit dem KI-Modell und über Telegram.
export async function setzeMicrosoftExtern(an: unknown): Promise<void> {
  let da = false;
  await aendereConfig((config) => {
    if (!config.microsoft) return null;
    da = true;
    return { ...config, microsoft: { ...config.microsoft, extern: an === true } };
  });
  if (!da) throw new MicrosoftFehler("Microsoft 365 ist nicht eingerichtet.");
}

// Startet die Anmeldung: Microsoft nennt einen Code und die Seite, auf der du ihn eingibst.
export async function starteMicrosoftAnmeldung(now = new Date()): Promise<void> {
  const m = (await readConfig()).microsoft;
  if (!m) throw new MicrosoftFehler("Trag zuerst die Verzeichnis-ID und die Anwendungs-ID ein.");
  shared.anmeldung = null;
  shared.fehler = null;
  const { ok, json } = await anmeldeserver(m, "devicecode", { scope: MICROSOFT_RECHTE.join(" ") });
  if (!ok || !json) throw new MicrosoftFehler(MICROSOFT_SATZ.anwendung);
  const dauer = Number(json.expires_in);
  const intervall = Number(json.interval);
  if (typeof json.device_code !== "string" || !json.device_code || !istAnmeldeCode(json.user_code) || !(dauer > 0)) throw new MicrosoftFehler(MICROSOFT_SATZ.unerwartet);
  if (!istAnmeldeAdresse(json.verification_uri, loginUrl())) throw new MicrosoftFehler(MICROSOFT_SATZ.adresse);
  shared.anmeldung = {
    deviceCode: json.device_code,
    code: json.user_code,
    adresse: json.verification_uri,
    bis: now.getTime() + Math.min(dauer, 1800) * 1000,
    intervallMs: Math.min(Math.max(intervall > 0 ? intervall : 5, 1), 60) * 1000,
    zuletzt: now.getTime(),
    fuer: schluessel(m),
  };
}

function uebernimmZugang(m: MicrosoftConfig, json: Record<string, unknown>, now: number): string {
  const dauer = Number(json.expires_in);
  if (typeof json.access_token !== "string" || !json.access_token || !(dauer > 0)) throw new MicrosoftFehler(MICROSOFT_SATZ.unerwartet);
  shared.zugang = { token: json.access_token, bis: now + dauer * 1000, fuer: schluessel(m) };
  return json.access_token;
}

// Fragt bei Microsoft nach, ob du den Code schon eingegeben hast. Nicht öfter, als Microsoft es wünscht.
// true: Die Anmeldung ist gerade angekommen.
export async function pruefeMicrosoftAnmeldung(now = new Date()): Promise<boolean> {
  const config = await readConfig();
  const m = config.microsoft;
  const a = shared.anmeldung;
  if (!m || !a || a.fuer !== schluessel(m)) return false;
  if (a.bis <= now.getTime()) {
    shared.anmeldung = null;
    shared.fehler = MICROSOFT_SATZ.zuSpaet;
    return false;
  }
  if (now.getTime() - a.zuletzt < a.intervallMs) return false;
  a.zuletzt = now.getTime();
  const { ok, json } = await anmeldeserver(m, "token", { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: a.deviceCode });
  if (shared.anmeldung !== a) return false;
  if (!ok) {
    const grund = json?.error;
    if (grund === "authorization_pending") return false;
    if (grund === "slow_down") {
      a.intervallMs = Math.min(a.intervallMs + 5000, 60_000);
      return false;
    }
    shared.anmeldung = null;
    shared.fehler = grund === "authorization_declined" ? MICROSOFT_SATZ.abgelehnt : grund === "expired_token" ? MICROSOFT_SATZ.zuSpaet : MICROSOFT_SATZ.anwendung;
    return false;
  }
  // Der Code ist jetzt eingelöst und gilt kein zweites Mal: Die Anmeldung endet hier, wie auch immer die Antwort aussieht.
  shared.anmeldung = null;
  shared.kalender = null;
  if (!json || typeof json.refresh_token !== "string" || !json.refresh_token) {
    shared.fehler = MICROSOFT_SATZ.unerwartet;
    return false;
  }
  // Der Schlüssel zum Angemeldetbleiben zählt. Ist der kurzlebige Zugang unlesbar, holt JARVIS beim ersten Lesen einen neuen.
  let token: string | null = null;
  try {
    token = uebernimmZugang(m, json, now.getTime());
  } catch {}
  // Welches Konto ist das? Klappt die Frage nicht, bleibt die Anmeldung trotzdem bestehen.
  const ich = token ? await graph<{ userPrincipalName?: unknown; displayName?: unknown }>(`${graphUrl()}/me?$select=displayName,userPrincipalName`, token).catch(() => null) : null;
  const konto = [ich?.userPrincipalName, ich?.displayName].find((x): x is string => typeof x === "string" && x.trim() !== "")?.replace(/[\u0000-\u001f<>]+/g, " ").trim().slice(0, 120);
  const neuerSchluessel = json.refresh_token;
  let gespeichert = false;
  await aendereConfig((frisch) => {
    // Wurden inzwischen andere Nummern eingetragen oder alles entfernt, gehört diese Anmeldung nirgends mehr hin.
    if (!frisch.microsoft || schluessel(frisch.microsoft) !== schluessel(m)) return null;
    gespeichert = true;
    return { ...frisch, microsoft: { ...frisch.microsoft, refreshToken: neuerSchluessel, konto: konto ?? "Microsoft-Konto" } };
  });
  if (!gespeichert) {
    vergissSitzung();
    return false;
  }
  shared.fehler = null;
  return true;
}

// Der Zugangsschlüssel für Graph: aus dem Arbeitsspeicher, sonst frisch geholt. Laufen mehrere Anfragen
// zugleich, holt nur eine.
async function zugang(now: number): Promise<string> {
  const config = await readConfig();
  const m = config.microsoft;
  if (!m?.refreshToken) throw new MicrosoftFehler("Microsoft 365 ist nicht verbunden.");
  if (shared.zugang && shared.zugang.fuer === schluessel(m) && shared.zugang.bis - VORLAUF_MS > now) return shared.zugang.token;
  shared.erneuern ??= (async () => {
    const { ok, status, json } = await anmeldeserver(m, "token", { grant_type: "refresh_token", refresh_token: m.refreshToken!, scope: MICROSOFT_RECHTE.join(" ") });
    if (!ok || !json) {
      // Eine Störung bei Microsoft ist keine abgelaufene Anmeldung: Beim nächsten Blick versucht JARVIS es wieder.
      if (status === 429 || status >= 500) throw new MicrosoftFehler(MICROSOFT_SATZ.pause);
      // Abgelehnt heißt: abgelaufen oder zurückgezogen. Die Anmeldung bleibt gespeichert, bis du sie erneuerst
      // oder trennst; JARVIS fragt Microsoft damit aber nicht bei jedem Blick in den Kalender neu.
      shared.fehler = MICROSOFT_SATZ.abgelaufen;
      throw new MicrosoftFehler(MICROSOFT_SATZ.abgelaufen);
    }
    const token = uebernimmZugang(m, json, now);
    // Microsoft gibt beim Erneuern einen neuen Schlüssel zum Angemeldetbleiben mit; der alte wird verworfen.
    const neuerSchluessel = json.refresh_token;
    if (typeof neuerSchluessel === "string" && neuerSchluessel && neuerSchluessel !== m.refreshToken) {
      // Nur wenn noch dieselbe Anmeldung gilt: Wer inzwischen getrennt oder sich neu angemeldet hat, behält seinen Stand.
      await aendereConfig((frisch) => (frisch.microsoft && frisch.microsoft.refreshToken === m.refreshToken ? { ...frisch, microsoft: { ...frisch.microsoft, refreshToken: neuerSchluessel } } : null));
    }
    shared.fehler = null;
    return token;
  })().finally(() => (shared.erneuern = null));
  return shared.erneuern;
}

// Graph hat den Zugangsschlüssel abgewiesen.
class Abgewiesen extends MicrosoftFehler {
  constructor() {
    super(MICROSOFT_SATZ.abgelaufen);
  }
}

// Eine lesende Anfrage an Graph. Der Schlüssel geht nur an Adressen unter dem Graph-Server.
async function graph<T>(url: string, token: string): Promise<T> {
  if (!istFolgeseite(url, graphUrl())) throw new MicrosoftFehler(MICROSOFT_SATZ.unerwartet);
  const r = await hole(url, { method: "GET", headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
  if (r.status === 401) throw new Abgewiesen();
  if (r.status === 403) throw new MicrosoftFehler(MICROSOFT_SATZ.keinRecht);
  if (r.status === 429 || r.status === 503) throw new MicrosoftFehler(MICROSOFT_SATZ.pause);
  if (!r.ok) throw new MicrosoftFehler(MICROSOFT_SATZ.unerwartet);
  const json = (await r.json().catch(() => null)) as T | null;
  if (!json || typeof json !== "object") throw new MicrosoftFehler(MICROSOFT_SATZ.unerwartet);
  return json;
}
// Wie graph, aber mit dem gespeicherten Zugang. Weist Graph den Schlüssel ab, holt JARVIS einmal einen neuen.
async function graphMitZugang<T>(url: string, now: number): Promise<T> {
  try {
    return await graph<T>(url, await zugang(now));
  } catch (e) {
    if (!(e instanceof Abgewiesen)) throw e;
    shared.zugang = null;
    return graph<T>(url, await zugang(now));
  }
}

// unvollstaendig: Es gibt mehr Termine, als JARVIS auf einmal liest, oder eine Folgeseite lag an fremder Adresse.
export type OutlookTermine = { konto: string; extern: boolean; events: CalendarEvent[]; fehler?: string; unvollstaendig?: true };

// Die Termine aus Outlook im Zeitraum, oder null, wenn Microsoft 365 nicht verbunden ist. Ein Fehlschlag
// kommt als fester Satz zurück und lässt den übrigen Kalender unberührt.
export async function outlookTermine(vonMs: number, bisMs: number, { force = false, now = new Date() } = {}): Promise<OutlookTermine | null> {
  const m = (await readConfig()).microsoft;
  if (!m?.refreshToken) return null;
  const kopf = { konto: m.konto ?? "Microsoft-Konto", extern: m.extern === true };
  const merk = `${schluessel(m)}|${vonMs}|${bisMs}`;
  const alt = shared.kalender;
  if (!force && alt && alt.schluessel === merk && now.getTime() >= alt.at && now.getTime() - alt.at < KALENDER_MS) return { ...kopf, events: alt.events, ...(alt.unvollstaendig ? { unvollstaendig: true as const } : {}) };
  // Ist die Anmeldung abgelaufen, fragt JARVIS nicht bei jedem Blick neu, sondern erst nach einer neuen Anmeldung.
  if (shared.fehler === MICROSOFT_SATZ.abgelaufen && !force) return { ...kopf, events: [], fehler: shared.fehler };
  try {
    const events: CalendarEvent[] = [];
    let abgeschnitten = false;
    const frage = new URLSearchParams({ startDateTime: new Date(vonMs).toISOString(), endDateTime: new Date(bisMs).toISOString(), $select: "id,subject,start,end,isAllDay,isCancelled,location,sensitivity", $top: String(JE_SEITE) });
    let url: string | null = `${graphUrl()}/me/calendarView?${frage}`;
    for (let seite = 0; url && seite < SEITEN; seite++) {
      const antwort: { value?: unknown; "@odata.nextLink"?: unknown } = await graphMitZugang(url, now.getTime());
      if (!Array.isArray(antwort.value)) throw new MicrosoftFehler(MICROSOFT_SATZ.unerwartet);
      for (const roh of antwort.value) {
        const termin = ausGraphTermin(roh);
        if (termin) events.push(termin);
      }
      const weiter = antwort["@odata.nextLink"];
      // Eine Folgeseite an anderer Adresse wird nicht geholt: Die Liste endet dann hier, und das steht dabei.
      url = istFolgeseite(weiter, graphUrl()) ? weiter : null;
      if (weiter !== undefined && weiter !== null && !url) abgeschnitten = true;
    }
    // Nach der letzten erlaubten Seite gäbe es noch eine: Auch dann fehlen Termine.
    if (url) abgeschnitten = true;
    events.sort((a, b) => a.start - b.start);
    shared.kalender = { at: now.getTime(), schluessel: merk, events, unvollstaendig: abgeschnitten };
    return { ...kopf, events, ...(abgeschnitten ? { unvollstaendig: true as const } : {}) };
  } catch (e) {
    return { ...kopf, events: [], fehler: e instanceof MicrosoftFehler ? e.message : MICROSOFT_SATZ.unerwartet };
  }
}

// Nur für Tests: vergisst alles, was im Arbeitsspeicher liegt.
export function vergissMicrosoft() {
  vergissSitzung();
  shared.fehler = null;
}
