import type { AgentName, Kanal, Klasse } from "../../sicherheit";
import { notify } from "../notify";
import { protokolliere } from "./audit";
import { erstelleFreigabe } from "./freigaben";
import { bewerte, braucheFreigabe, RICHTLINIEN, type Regel, type Rolle } from "./richtlinien";
import { agentSperre, leseZustand } from "./zustand";

// Das Security Gateway: die eine Stelle, durch die jeder Werkzeugaufruf einer KI geht. Es entscheidet
// unabhängig vom Modell, nur nach der Richtlinientabelle, dem Not-Aus, den Agentensperren und danach, ob
// im Gespräch fremde Inhalte gelesen wurden. Jede Entscheidung landet im Audit-Log.
// Ablauf: unbekannt → abgelehnt; Aufrufer, Rolle, Kanal falsch → abgelehnt; Not-Aus oder Sperre →
// abgelehnt; Klasse D → abgelehnt; Freigabe nötig → Frage an den Menschen, das Werkzeug läuft erst nach
// seinem Ja; sonst → läuft.

export type Aufruf = {
  werkzeug: string;
  // Der Agent, der aufruft (gehirn, browser, analyst).
  agent: AgentName;
  kanal: Kanal;
  eingabe: Record<string, unknown>;
  // Im Gespräch wurde schon Text von Dritten gelesen.
  fremd: boolean;
  rolle?: Rolle;
  // Ein Mensch hat zugestimmt (die Freigabe wird gerade ausgeführt).
  bestaetigt?: boolean;
};

export type Ursache = "unbekannt" | "aufrufer" | "rolle" | "kanal" | "notaus" | "gesperrt" | "verboten";

export type Entscheidung =
  | { art: "erlaubt"; klasse: Klasse; regel: Regel }
  | { art: "freigabe"; klasse: Klasse; regel: Regel; warum: string }
  | { art: "abgelehnt"; klasse: Klasse | null; ursache: Ursache; grund: string };

// Ein vom Gateway gesperrter Aufruf. Die Werkzeug-Schleife gibt die Meldung als Fehler an das Modell zurück.
export class GatewaySperre extends Error {
  constructor(
    message: string,
    readonly ursache: Ursache,
  ) {
    super(message);
  }
}

export const regelFuer = (werkzeug: string): Regel | null => (Object.hasOwn(RICHTLINIEN, werkzeug) ? RICHTLINIEN[werkzeug] : null);

export async function pruefe(a: Aufruf): Promise<Entscheidung> {
  const regel = regelFuer(a.werkzeug);
  if (!regel) return { art: "abgelehnt", klasse: null, ursache: "unbekannt", grund: `Das Werkzeug „${a.werkzeug.slice(0, 40)}“ ist nicht freigegeben.` };
  if (!regel.aufrufer.includes(a.agent)) return { art: "abgelehnt", klasse: regel.klasse, ursache: "aufrufer", grund: `Dieses Werkzeug darf der Agent ${a.agent} nicht benutzen.` };
  if (!regel.rollen.includes(a.rolle ?? "geschaeftsfuehrung")) return { art: "abgelehnt", klasse: regel.klasse, ursache: "rolle", grund: "Dafür fehlt die Berechtigung." };
  if (!regel.kanaele.includes(a.kanal)) return { art: "abgelehnt", klasse: regel.klasse, ursache: "kanal", grund: "Das geht auf diesem Weg nicht." };
  for (const agent of new Set([a.agent, regel.agent])) {
    const sperre = await agentSperre(agent);
    if (sperre) return { art: "abgelehnt", klasse: regel.klasse, ursache: (await leseZustand()).notaus.an ? "notaus" : "gesperrt", grund: sperre };
  }
  const bewertung = await bewerte(regel, a.eingabe);
  if (bewertung.klasse === "D") return { art: "abgelehnt", klasse: "D", ursache: "verboten", grund: bewertung.verboten ?? "Für die KI gesperrt." };
  if (a.bestaetigt) return { art: "erlaubt", klasse: bewertung.klasse, regel };
  const { cStrenge } = await leseZustand();
  if (braucheFreigabe(bewertung.freigabe, { fremd: a.fremd, cStrenge })) {
    const warum =
      bewertung.freigabe === "immer"
        ? "Das fragt JARVIS immer vorher."
        : a.fremd
          ? "Im Gespräch wurden Inhalte von Dritten gelesen (Mail, Webseite, Termin oder Nachrichten). Deshalb fragt JARVIS vorher."
          : "Änderungen fragt JARVIS vorher.";
    return { art: "freigabe", klasse: bewertung.klasse, regel, warum };
  }
  return { art: "erlaubt", klasse: bewertung.klasse, regel };
}

// ---------- Alarm bei auffälligen Versuchen ----------

const ALARM_MS = 10 * 60_000;
type Alarme = { zuletzt: Map<string, number>; ablehnungen: number[] };
const holder = globalThis as typeof globalThis & { __jarvisAlarme?: Alarme };
const alarme: Alarme = (holder.__jarvisAlarme ??= { zuletzt: new Map(), ablehnungen: [] });

function alarm(a: Aufruf, e: Extract<Entscheidung, { art: "abgelehnt" }>) {
  const jetzt = Date.now();
  alarme.ablehnungen = [...alarme.ablehnungen.filter((t) => jetzt - t < ALARM_MS), jetzt];
  // Not-Aus und gesperrte Agenten sind erwartbar. Auffällig ist, was das Modell gar nicht versuchen sollte.
  const auffaellig = e.ursache !== "notaus" && e.ursache !== "gesperrt";
  const viele = alarme.ablehnungen.length >= 5;
  if (!auffaellig && !viele) return;
  const schluessel = viele ? "viele" : `${a.werkzeug}:${e.ursache}`;
  if (jetzt - (alarme.zuletzt.get(schluessel) ?? 0) < ALARM_MS) return;
  alarme.zuletzt.set(schluessel, jetzt);
  const text = viele
    ? `⚠️ Sicherheit: In den letzten zehn Minuten hat das Gateway ${alarme.ablehnungen.length} Werkzeugaufrufe abgelehnt. Im Audit-Log unter Einstellungen → Sicherheit steht, welche.`
    : `⚠️ Sicherheit: Das Gateway hat „${a.werkzeug.slice(0, 40)}“ abgelehnt (${e.grund}). Das kann ein Versuch sein, JARVIS über eine Mail oder Webseite zu steuern.`;
  notify({ kind: "warnung", text });
  void protokolliere({ art: "alarm", agent: "system", kanal: "intern", was: text, ergebnis: "gemeldet" });
}

// ---------- Ausführen ----------

// Was das Modell bekommt, wenn ein Mensch erst zustimmen muss. Das ist kein Fehler: Das Modell soll es
// dem Nutzer sagen und nicht auf anderem Weg versuchen.
export const wartetText = (was: string) =>
  `Noch nicht ausgeführt, wartet auf die Freigabe durch einen Menschen: ${was}. Die Frage steht am Mac und, wenn das Handy gekoppelt ist, in Telegram mit Ja und Nein. Du kannst sie nicht selbst freigeben. Sag in einem Satz, dass es auf das Ja per Knopf wartet, und versuch es nicht auf anderem Weg.`;

// Führt einen Werkzeugaufruf durch das Gateway aus. Abgelehnt: wirft GatewaySperre. Freigabe nötig: legt sie
// an und liefert wartetText. Erlaubt: führt aus und protokolliert das Ergebnis.
export async function durchGateway<T>(a: Aufruf, ausfuehren: () => Promise<T>): Promise<T | string> {
  const e = await pruefe(a);
  const basis = { art: "werkzeug" as const, agent: a.agent, kanal: a.kanal, was: a.werkzeug, daten: { eingabe: a.eingabe, fremd: a.fremd } };
  if (e.art === "abgelehnt") {
    await protokolliere({ ...basis, ...(e.klasse ? { klasse: e.klasse } : {}), ergebnis: `abgelehnt:${e.ursache}`, grund: e.grund });
    alarm(a, e);
    throw new GatewaySperre(e.grund, e.ursache);
  }
  if (e.art === "freigabe") {
    const f = await erstelleFreigabe({
      werkzeug: a.werkzeug,
      klasse: e.klasse,
      agent: e.regel.agent,
      aufrufer: a.agent,
      kanal: a.kanal,
      eingabe: a.eingabe,
      was: e.regel.was?.(a.eingabe) ?? a.werkzeug,
      warum: e.warum,
      fremd: a.fremd,
    });
    await protokolliere({ ...basis, klasse: e.klasse, ergebnis: "freigabe-angefragt", grund: e.warum, daten: { ...basis.daten, freigabe: f.id } });
    return wartetText(f.was);
  }
  try {
    const ergebnis = await ausfuehren();
    await protokolliere({ ...basis, klasse: e.klasse, ergebnis: "ausgefuehrt" });
    return ergebnis;
  } catch (err) {
    await protokolliere({ ...basis, klasse: e.klasse, ergebnis: "fehler", grund: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// Für Werkzeuge, die bei Anthropic laufen (web_search, web_fetch): JARVIS kann sie nicht anhalten, aber
// protokollieren. Nach ihnen gilt das Gespräch als fremd.
export async function serverWerkzeugGesehen(werkzeug: string, agent: AgentName, kanal: Kanal, eingabe: Record<string, unknown>): Promise<void> {
  const regel = regelFuer(werkzeug);
  await protokolliere({
    art: "werkzeug",
    agent,
    kanal,
    was: werkzeug,
    ...(regel ? { klasse: regel.klasse } : {}),
    ergebnis: regel ? "bei-anthropic" : "unbekannt-bei-anthropic",
    daten: { eingabe },
  });
}
