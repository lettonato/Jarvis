import fs from "node:fs/promises";
import path from "node:path";
import { AGENTEN, NOTAUS_BESTAETIGUNG, type AgentName, type CStrenge, type SicherheitsZustand, type Wer } from "../../sicherheit";
import { CONFIG_DIR } from "../config";
import { notify } from "../notify";
import { protokolliere } from "./audit";

// Der zentrale Sicherheitszustand: Not-Aus, Sperren einzelner Agenten und wie streng Klasse C fragt.
// Er liegt in ~/.jarvis/sicherheit.json. Einschalten darf ihn jeder Weg (Knopf am Mac, /notaus in Telegram);
// lösen nur ein Mensch am Mac, mit getippter Bestätigung. Es gibt kein Werkzeug, mit dem die KI ihn
// lösen könnte, und die Funktion notausAus wird nur von der Schnittstelle /api/sicherheit aufgerufen.

const DATEI = path.join(CONFIG_DIR, "sicherheit.json");

const LEER: SicherheitsZustand = { notaus: { an: false, seit: null, aus_von: null }, sperren: {}, cStrenge: "immer" };

type Shared = { zustand: SicherheitsZustand | null; speichern: Promise<void> };
const holder = globalThis as typeof globalThis & { __jarvisSicherheit?: Shared };
const shared: Shared = (holder.__jarvisSicherheit ??= { zustand: null, speichern: Promise.resolve() });

export class SicherheitsFehler extends Error {}

export async function leseZustand(): Promise<SicherheitsZustand> {
  if (shared.zustand) return shared.zustand;
  try {
    const roh = JSON.parse(await fs.readFile(DATEI, "utf8")) as Partial<SicherheitsZustand>;
    const notaus = roh.notaus && typeof roh.notaus === "object" && "an" in roh.notaus ? roh.notaus : LEER.notaus;
    const sperren: SicherheitsZustand["sperren"] = {};
    for (const a of AGENTEN) {
      const s = roh.sperren?.[a.name];
      if (s && typeof s.seit === "string") sperren[a.name] = { seit: s.seit, grund: String(s.grund ?? "") };
    }
    shared.zustand = { notaus, sperren, cStrenge: roh.cStrenge === "bei-fremden-inhalten" ? "bei-fremden-inhalten" : "immer" };
  } catch (e) {
    // Fehlt die Datei, gilt der leere Zustand. Ist sie kaputt, bleibt JARVIS auf der sicheren Seite: Not-Aus an.
    const fehlt = (e as NodeJS.ErrnoException)?.code === "ENOENT";
    shared.zustand = fehlt ? structuredClone(LEER) : { ...structuredClone(LEER), notaus: { an: true, seit: new Date().toISOString(), grund: "Die Datei sicherheit.json ist beschädigt.", von: "system" } };
  }
  return shared.zustand;
}

function speichere(z: SicherheitsZustand): Promise<void> {
  shared.zustand = z;
  const json = JSON.stringify(z, null, 2);
  shared.speichern = shared.speichern
    .then(async () => {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${DATEI}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${DATEI}.tmp`, DATEI);
    })
    .catch((e) => console.error("Sicherheitszustand nicht gespeichert:", e));
  return shared.speichern;
}

// Warum ein Agent gerade nicht arbeiten darf, oder null.
export async function agentSperre(agent: AgentName): Promise<string | null> {
  const z = await leseZustand();
  if (z.notaus.an) return `Der zentrale Not-Aus ist an (${z.notaus.grund}). Lösen kann ihn nur ein Mensch am Mac in den Einstellungen.`;
  const s = z.sperren[agent];
  if (s) return `Der Agent ${AGENTEN.find((a) => a.name === agent)?.label ?? agent} ist gesperrt${s.grund ? ` (${s.grund})` : ""}. Entsperren kann ihn nur ein Mensch am Mac.`;
  return null;
}

export const notausAktiv = async () => (await leseZustand()).notaus.an;

// Hält alles an: Desk, Browser, Analyst; offene Freigaben verfallen. Ist der Not-Aus schon an, bleibt es dabei.
export async function notausAn(grund: string, von: Wer): Promise<string> {
  const z = await leseZustand();
  const text = grund.trim().slice(0, 200) || "ohne Angabe";
  if (!z.notaus.an) {
    await speichere({ ...z, notaus: { an: true, seit: new Date().toISOString(), grund: text, von } });
    await protokolliere({ art: "notaus", agent: von === "system" ? "system" : "mensch", kanal: von, was: "Not-Aus eingeschaltet", ergebnis: "an", grund: text });
  }
  // Alles, was gerade läuft, anhalten. Fehler einzelner Teile halten die anderen nicht auf.
  const schritte: Promise<unknown>[] = [
    import("../desk/engine").then(async ({ control, deskSnapshot }) => {
      const desk = await deskSnapshot();
      if (desk.status !== "aus" && desk.status !== "notaus") await control({ action: "notaus" });
    }),
    import("../browser").then(({ stopBrowserTask }) => stopBrowserTask()),
    import("../documents").then(({ cancelDocument }) => cancelDocument()),
    import("./freigaben").then(({ sperreOffeneFreigaben }) => sperreOffeneFreigaben("Not-Aus")),
  ];
  const ergebnisse = await Promise.allSettled(schritte);
  for (const r of ergebnisse) if (r.status === "rejected") console.error("Not-Aus:", r.reason);
  if (!z.notaus.an) notify({ kind: "warnung", text: `🛑 Zentraler Not-Aus: ${text}. Alle Agenten stehen. Lösen kannst du ihn nur am Mac unter Einstellungen → Sicherheit.` });
  return "Der zentrale Not-Aus ist an. Alle Agenten stehen. Lösen kannst du ihn nur am Mac unter Einstellungen → Sicherheit.";
}

// Löst den Not-Aus. Nur ein Mensch am Mac, mit getippter Bestätigung. Der Desk bleibt im Not-Aus, bis du
// ihn auf dem Trading-Desk selbst fortsetzt.
export async function notausAus(bestaetigung: string, von: Wer): Promise<string> {
  if (von !== "mac") throw new SicherheitsFehler("Den Not-Aus kann nur ein Mensch am Mac lösen.");
  if (bestaetigung.trim() !== NOTAUS_BESTAETIGUNG) throw new SicherheitsFehler(`Zum Lösen bitte genau „${NOTAUS_BESTAETIGUNG}“ eintippen.`);
  const z = await leseZustand();
  if (!z.notaus.an) return "Der Not-Aus ist schon aus.";
  await speichere({ ...z, notaus: { an: false, seit: new Date().toISOString(), aus_von: von } });
  await protokolliere({ art: "notaus", agent: "mensch", kanal: von, was: "Not-Aus gelöst", ergebnis: "aus" });
  return "Der Not-Aus ist gelöst. Der Spielgeld-Desk bleibt angehalten, bis du ihn auf dem Trading-Desk fortsetzt.";
}

export async function sperreAgent(agent: AgentName, grund: string, von: Wer): Promise<void> {
  const z = await leseZustand();
  await speichere({ ...z, sperren: { ...z.sperren, [agent]: { seit: new Date().toISOString(), grund: grund.trim().slice(0, 200) } } });
  await protokolliere({ art: "sperre", agent: von === "system" ? "system" : "mensch", kanal: von, was: `Agent ${agent} gesperrt`, ergebnis: "gesperrt", grund });
  if (agent === "browser") await import("../browser").then(({ stopBrowserTask }) => stopBrowserTask()).catch(() => {});
  if (agent === "analyst") await import("../documents").then(({ cancelDocument }) => cancelDocument()).catch(() => {});
  if (agent === "desk")
    await import("../desk/engine")
      .then(async ({ control, deskSnapshot }) => {
        const s = (await deskSnapshot()).status;
        if (s === "laeuft" || s === "tageslimit") await control({ action: "pause" });
      })
      .catch(() => {});
}

export async function entsperreAgent(agent: AgentName, von: Wer): Promise<void> {
  if (von !== "mac") throw new SicherheitsFehler("Entsperren kann nur ein Mensch am Mac.");
  const z = await leseZustand();
  const sperren = { ...z.sperren };
  delete sperren[agent];
  await speichere({ ...z, sperren });
  await protokolliere({ art: "sperre", agent: "mensch", kanal: von, was: `Agent ${agent} entsperrt`, ergebnis: "entsperrt" });
}

export async function setzeCStrenge(strenge: CStrenge, von: Wer): Promise<void> {
  if (von !== "mac") throw new SicherheitsFehler("Das stellt nur ein Mensch am Mac um.");
  const z = await leseZustand();
  await speichere({ ...z, cStrenge: strenge });
  await protokolliere({ art: "einstellung", agent: "mensch", kanal: von, was: "Rückfrage für Klasse C", ergebnis: strenge });
}

