// Die eine Stelle für die Modellwahl und die Preise. Jeder Agent, der Claude fragt, holt sein Modell von hier,
// und jede Kostenrechnung nimmt die Preise von hier. Wer ein Modell wechseln will, ändert genau diese Datei.
// Hier wird nur gerechnet und benannt, nichts gesendet: Die Datei darf auch im Browser geladen werden.

export type ModellRolle = "gespraech" | "browser" | "analyst" | "chief";

// Gespräch, Browser-Agent und Analyst arbeiten mit Opus 5.5. Der Chief des Spielgeld-Desks nimmt Haiku 5.5:
// schnell, und eine Bewertung kostet nur Bruchteile eines Cents.
const WAHL: Record<ModellRolle, string> = {
  gespraech: "claude-opus-5-5",
  browser: "claude-opus-5-5",
  analyst: "claude-opus-5-5",
  chief: "claude-haiku-5-5",
};

// Listenpreise in Dollar je Million Token, abgelesen von platform.claude.com/docs/en/about-claude/pricing.
// Ändert Anthropic die Preise, muss diese Tabelle nachgezogen werden; die Zahlen in JARVIS sind deshalb eine
// Schätzung nach Listenpreis und keine Rechnung. Maßgeblich bleibt die Abrechnung in der Anthropic-Konsole.
export const PREISE_STAND = "2026-11-13";

type Preis = { eingabe: number; ausgabe: number; cacheLesen: number; cacheSchreiben5m: number; cacheSchreiben1h: number };
// Manche Modelle kosten mehr, sobald der Prompt einer Anfrage über eine Grenze geht.
type Tarif = Preis & { gross?: { ueberTokens: number; preis: Preis } };

const PREISE: Record<string, Tarif & { name: string }> = {
  "claude-opus-5-5": { name: "Claude Opus 5.5", eingabe: 4, ausgabe: 20, cacheLesen: 0.2, cacheSchreiben5m: 5, cacheSchreiben1h: 8 },
  "claude-haiku-5-5": {
    name: "Claude Haiku 5.5",
    eingabe: 0.1,
    ausgabe: 0.5,
    cacheLesen: 0.01,
    cacheSchreiben5m: 0.125,
    cacheSchreiben1h: 0.2,
    gross: { ueberTokens: 100_000, preis: { eingabe: 0.5, ausgabe: 2.5, cacheLesen: 0.05, cacheSchreiben5m: 0.625, cacheSchreiben1h: 1 } },
  },
  // Diese Modelle wählt JARVIS nicht selbst. Lehnt Opus 5.5 eine Anfrage ab, kann Anthropic sie aber von einem
  // anderen Modell beantworten lassen; dann gilt dessen Preis.
  "claude-opus-5": { name: "Claude Opus 5", eingabe: 5, ausgabe: 25, cacheLesen: 0.5, cacheSchreiben5m: 6.25, cacheSchreiben1h: 10 },
  "claude-opus-4-8": { name: "Claude Opus 4.8", eingabe: 5, ausgabe: 25, cacheLesen: 0.5, cacheSchreiben5m: 6.25, cacheSchreiben1h: 10 },
  "claude-sonnet-5-5": { name: "Claude Sonnet 5.5", eingabe: 2, ausgabe: 10, cacheLesen: 0.1, cacheSchreiben5m: 2.5, cacheSchreiben1h: 4 },
};

// Eine Websuche bei Anthropic: 10 Dollar je 1.000 Suchen.
export const WEBSUCHE_USD = 0.01;

// Der Verbrauch, wie ihn Anthropic mit jeder Antwort meldet. Nur die Felder, mit denen gerechnet wird.
type TokenZahlen = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens: number; ephemeral_1h_input_tokens: number } | null;
};
export type Verbrauch = TokenZahlen & {
  server_tool_use?: { web_search_requests?: number | null } | null;
  // Die einzelnen Versuche einer Anfrage. Ein Eintrag „fallback_message“ heißt: Ein Ausweichmodell hat geantwortet.
  iterations?: (TokenZahlen & { type: string; model?: string | null })[] | null;
};

// Antworten tragen manchmal ein Datum am Namen (claude-opus-4-8-20260301). Nur ein solches Datum darf anhängen:
// „claude-opus-5-2“ wäre ein anderes Modell und nicht „claude-opus-5“ mit Anhang.
function tarifVon(modell: string | null | undefined): (Tarif & { name: string }) | null {
  if (!modell) return null;
  const id = modell.replace(/-\d{8}$/, "");
  return Object.hasOwn(PREISE, id) ? PREISE[id] : null;
}

export const preisBekannt = (modell: string) => tarifVon(modell) !== null;
export const modellName = (modell: string) => tarifVon(modell)?.name ?? modell;

// Modell und Name je Rolle. Der Name kommt aus der Preistabelle, damit ein Wechsel nur eine Zeile braucht.
export const MODELLE = Object.fromEntries((Object.keys(WAHL) as ModellRolle[]).map((rolle) => [rolle, { id: WAHL[rolle], name: modellName(WAHL[rolle]) }])) as Record<ModellRolle, { id: string; name: string }>;

// Nur brauchbare Zahlen zählen: Fehlendes, Negatives und Unsinn gelten als null.
export const zahl = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

function tokenKosten(tarif: Tarif, u: TokenZahlen): number {
  const eingabe = zahl(u.input_tokens);
  const lesen = zahl(u.cache_read_input_tokens);
  const schreiben = zahl(u.cache_creation_input_tokens);
  // Zum Prompt einer Anfrage zählen alle Eingabe-Token, auch die aus dem Zwischenspeicher.
  const preis = tarif.gross && eingabe + lesen + schreiben > tarif.gross.ueberTokens ? tarif.gross.preis : tarif;
  // Meldet Anthropic, wie lange der Zwischenspeicher halten soll, gilt je Teil der passende Preis; sonst der für fünf Minuten.
  const stunde = Math.min(schreiben, zahl(u.cache_creation?.ephemeral_1h_input_tokens));
  const summe = eingabe * preis.eingabe + zahl(u.output_tokens) * preis.ausgabe + lesen * preis.cacheLesen + (schreiben - stunde) * preis.cacheSchreiben5m + stunde * preis.cacheSchreiben1h;
  return summe / 1e6;
}

// Was eine Anfrage nach Listenpreis gekostet hat, in Dollar. angefragt ist das Modell, das JARVIS gewählt hat,
// geantwortet das Modell aus der Antwort. Kennt die Tabelle das antwortende Modell nicht, wird wie für das
// angefragte gerechnet.
export function kostenVon(angefragt: string, u: Verbrauch | null | undefined, geantwortet?: string | null): number {
  if (!u) return 0;
  const basis = tarifVon(angefragt);
  const suchen = zahl(u.server_tool_use?.web_search_requests) * WEBSUCHE_USD;
  const versuche = u.iterations ?? [];
  // Mit Ausweichmodell beschreiben die Zahlen ganz oben nur den letzten Versuch. Dann zählt jeder Versuch für
  // sich, zum Preis seines Modells. Ein Versuch, der ohne Ausgabe abgelehnt wurde, wird in den üblichen Fällen
  // nicht berechnet und zählt hier nicht mit.
  if (versuche.some((v) => v.type === "fallback_message")) {
    let summe = suchen;
    for (const v of versuche) {
      if (v.type !== "message" && v.type !== "fallback_message") continue;
      if (zahl(v.output_tokens) === 0) continue;
      const tarif = tarifVon(v.model) ?? basis;
      if (tarif) summe += tokenKosten(tarif, v);
    }
    return summe;
  }
  const tarif = tarifVon(geantwortet) ?? basis;
  return (tarif ? tokenKosten(tarif, u) : 0) + suchen;
}

// Der Verbrauch in drei Zahlen für das Kostenbuch.
export function verbrauchVon(u: Verbrauch | null | undefined): { eingabe: number; ausgabe: number; suchen: number } {
  if (!u) return { eingabe: 0, ausgabe: 0, suchen: 0 };
  return {
    eingabe: zahl(u.input_tokens) + zahl(u.cache_read_input_tokens) + zahl(u.cache_creation_input_tokens),
    ausgabe: zahl(u.output_tokens),
    suchen: zahl(u.server_tool_use?.web_search_requests),
  };
}
