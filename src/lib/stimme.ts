// Die Wolkenstimme (ElevenLabs) als reine Regeln, ohne Browser und ohne Netz, damit alles prüfbar ist.
// Sie ist ein Zusatz: Ohne Schlüssel, ohne Schalter, über dem Tageslimit oder beim Not-Aus spricht JARVIS
// mit der Stimme des Macs weiter. Was laut vorgelesen wird, geht nur bei eingeschalteter Wolkenstimme an ElevenLabs.

export type StimmeModell = (typeof STIMME_MODELLE)[number]["id"];

// sprachcode: Das Modell bekommt „de“ mitgeschickt, damit Zahlen und Abkürzungen deutsch gelesen werden.
// Multilingual v2 kennt das Feld laut ElevenLabs nicht.
export const STIMME_MODELLE = [
  { id: "eleven_flash_v2_5", label: "Schnell (Flash 2.5)", text: "Antwortet am schnellsten und kostet bei ElevenLabs die Hälfte.", sprachcode: true },
  { id: "eleven_multilingual_v2", label: "Ruhig und gleichmäßig (Multilingual 2)", text: "Sehr stabil, braucht etwas länger und kostet den vollen Preis.", sprachcode: false },
  { id: "eleven_v4", label: "Am natürlichsten (v4)", text: "Beste Qualität, am langsamsten und zum vollen Preis.", sprachcode: true },
] as const;

export const STIMME_STANDARD_MODELL: StimmeModell = "eleven_flash_v2_5";
export const istStimmeModell = (v: unknown): v is StimmeModell => STIMME_MODELLE.some((m) => m.id === v);
export const modellInfo = (id: StimmeModell) => STIMME_MODELLE.find((m) => m.id === id)!;

// So viele Zeichen darf JARVIS am Tag vorlesen lassen, bis du es änderst. Danach spricht der Mac.
export const STIMME_TAGESLIMIT = 5000;
export const STIMME_LIMIT_MIN = 500;
export const STIMME_LIMIT_MAX = 200_000;
// Mehr nimmt der Server in einer Anfrage nicht an; die Seite teilt längere Texte vorher in Stücke.
export const STIMME_MAX_TEXT = 600;
// Der feste Satz für „Probe hören“: So verlässt beim Ausprobieren kein Inhalt von dir den Mac.
export const probeSatz = (name: string) => `Hallo ${name}, so klinge ich jetzt. Sag einfach Jarvis, wenn du mich brauchst.`;

export type StimmeGrund = "kein-schluessel" | "aus" | "keine-stimme" | "limit" | "notaus";

export const GRUND_TEXT: Record<StimmeGrund, string> = {
  "kein-schluessel": "Es ist kein ElevenLabs-Schlüssel eingetragen.",
  aus: "Die ElevenLabs-Stimme ist ausgeschaltet.",
  "keine-stimme": "Es ist noch keine Stimme ausgewählt.",
  limit: "Das Tageslimit für ElevenLabs ist erreicht. Bis morgen spreche ich mit der Stimme des Macs.",
  notaus: "Der Not-Aus steht. Solange geht nichts an ElevenLabs.",
};

// Was die Seite über die Wolkenstimme erfährt. Der Schlüssel ist nie dabei, nur seine letzten Zeichen.
export type StimmeStatus = {
  configured: boolean;
  hint: string | null;
  enabled: boolean;
  // Spricht JARVIS gerade wirklich über ElevenLabs? Nur dann schickt die Seite Sätze an den Server.
  aktiv: boolean;
  grund: StimmeGrund | null;
  voiceId: string | null;
  voiceName: string | null;
  model: StimmeModell;
  heuteZeichen: number;
  tagesZeichen: number;
  // Der letzte Fehler von ElevenLabs als Satz von JARVIS, bis wieder ein Satz gelingt.
  fehler: string | null;
};

export type StimmeEingabe = {
  apiKey?: string | null;
  enabled?: boolean;
  voiceId?: string | null;
  voiceName?: string | null;
  model?: string | null;
  tagesZeichen?: number | null;
  heuteZeichen: number;
  notaus: boolean;
  fehler?: string | null;
};

export function tagesLimit(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= STIMME_LIMIT_MIN && n <= STIMME_LIMIT_MAX ? n : STIMME_TAGESLIMIT;
}

// Erst, was fehlt (Schlüssel, Stimme), dann der Not-Aus, dann der Schalter, dann das Limit. Der Not-Aus steht vor
// dem Schalter, damit er auch die Probe hält, die sonst bei ausgeschalteter Stimme erlaubt ist.
export function stimmeStatus(e: StimmeEingabe): StimmeStatus {
  const configured = Boolean(e.apiKey);
  const tagesZeichen = tagesLimit(e.tagesZeichen);
  const enabled = configured && e.enabled === true;
  const voiceId = configured && e.voiceId ? e.voiceId : null;
  let grund: StimmeGrund | null = null;
  if (!configured) grund = "kein-schluessel";
  else if (!voiceId) grund = "keine-stimme";
  else if (e.notaus) grund = "notaus";
  else if (!enabled) grund = "aus";
  else if (e.heuteZeichen >= tagesZeichen) grund = "limit";
  return {
    configured,
    hint: e.apiKey ? `…${e.apiKey.slice(-4)}` : null,
    enabled,
    aktiv: grund === null,
    grund,
    voiceId,
    voiceName: voiceId ? (e.voiceName ?? null) : null,
    model: istStimmeModell(e.model) ? e.model : STIMME_STANDARD_MODELL,
    heuteZeichen: e.heuteZeichen,
    tagesZeichen,
    fehler: configured ? (e.fehler ?? null) : null,
  };
}

// Darf dieser Text jetzt noch zu ElevenLabs? Gezählt wird vor dem Senden, denn berechnet wird jedes Zeichen.
export function passtInsLimit(text: string, heuteZeichen: number, tagesZeichen: number): boolean {
  return heuteZeichen + text.length <= tagesZeichen;
}

// Teilt einen zu langen Satz an Kommas oder Leerzeichen, damit jedes Stück in eine Anfrage passt.
export function stuecke(text: string, max = STIMME_MAX_TEXT): string[] {
  const teile: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const fenster = rest.slice(0, max + 1);
    let schnitt = Math.max(fenster.lastIndexOf(", "), fenster.lastIndexOf("; "), fenster.lastIndexOf(": "));
    if (schnitt < max / 2) schnitt = fenster.lastIndexOf(" ");
    if (schnitt < max / 2) schnitt = max - 1;
    teile.push(rest.slice(0, schnitt + 1).trim());
    rest = rest.slice(schnitt + 1).trim();
  }
  if (rest) teile.push(rest);
  return teile;
}

// Eine Stimme aus dem ElevenLabs-Konto, so wie die Einstellungen sie zeigen.
export type StimmeWahl = { id: string; name: string; deutsch: boolean; art: string | null };

// Aus der Antwort von ElevenLabs nur, was die Auswahl braucht; Stimmen mit Deutsch zuerst, dann nach Name.
export function stimmenAus(antwort: unknown): StimmeWahl[] {
  const roh = (antwort as { voices?: unknown } | null)?.voices;
  if (!Array.isArray(roh)) return [];
  const liste: StimmeWahl[] = [];
  for (const v of roh as Record<string, unknown>[]) {
    const id = typeof v?.voice_id === "string" ? v.voice_id : "";
    const name = typeof v?.name === "string" ? v.name.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    if (!istStimmeId(id) || !name) continue;
    const sprachen = Array.isArray(v.verified_languages) ? (v.verified_languages as { language?: unknown }[]).map((s) => String(s?.language ?? "").toLowerCase()) : [];
    const labels = (v.labels ?? {}) as Record<string, unknown>;
    const deutsch = sprachen.some((s) => s === "de" || s.startsWith("de-")) || String(labels.language ?? "").toLowerCase() === "de";
    liste.push({ id, name, deutsch, art: typeof v.category === "string" ? v.category.slice(0, 30) : null });
  }
  return liste.sort((a, b) => Number(b.deutsch) - Number(a.deutsch) || a.name.localeCompare(b.name, "de"));
}

export const istStimmeId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9]{10,40}$/.test(v);

// Ein ElevenLabs-Schlüssel: Buchstaben, Zahlen und Unterstrich, heute meist mit sk_ am Anfang.
export const siehtAusWieSchluessel = (v: string) => /^[A-Za-z0-9_-]{24,120}$/.test(v);

// Was dein ElevenLabs-Konto diesen Monat schon verbraucht hat. Fehlt dem Schlüssel das Recht dazu, bleibt es leer.
export type StimmeKonto = { tarif: string | null; verbraucht: number; limit: number };

export function kontoAus(antwort: unknown): StimmeKonto | null {
  const a = antwort as { tier?: unknown; character_count?: unknown; character_limit?: unknown } | null;
  const verbraucht = Number(a?.character_count);
  const limit = Number(a?.character_limit);
  if (!Number.isFinite(verbraucht) || !Number.isFinite(limit) || limit <= 0) return null;
  return { tarif: typeof a?.tier === "string" ? a.tier.slice(0, 30) : null, verbraucht, limit };
}

// Was ElevenLabs auf eine Anfrage antwortet, in einem Satz für dich. Der Text des Dienstes selbst wird nicht gezeigt.
export function fehlerText(status: number): string {
  if (status === 401 || status === 403) return "ElevenLabs lehnt den Schlüssel ab. Er ist falsch, abgelaufen, darf keine Sprache erzeugen, oder ElevenLabs hat den kostenlosen Zugang gesperrt.";
  if (status === 402) return "ElevenLabs verlangt dafür einen bezahlten Tarif oder mehr Guthaben.";
  if (status === 404) return "ElevenLabs kennt diese Stimme nicht mehr. Bitte eine andere auswählen.";
  if (status === 422 || status === 400) return "ElevenLabs nimmt die Anfrage so nicht an. Stimme und Modell passen vielleicht nicht zusammen.";
  if (status === 429) return "ElevenLabs ist gerade ausgelastet oder dein Kontingent dort ist aufgebraucht.";
  if (status === 0) return "ElevenLabs ist nicht erreichbar. Prüf die Internetverbindung.";
  return `ElevenLabs antwortet mit einem Fehler (${status}).`;
}
