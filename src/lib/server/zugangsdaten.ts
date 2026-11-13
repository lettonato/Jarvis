import { promises as fs } from "node:fs";
import type { Wer, ZugangsdatenStatus } from "../sicherheit";
import { CONFIG_FILE, GEHEIM_MARKE, GEHEIMNISSE, geheimnisLesen, merkeGeheimnis, readConfig, readConfigFile, unlesbareGeheimnisse, vergissGeheimnisse, writeConfig } from "./config";
import { protokolliere } from "./gateway/audit";
import { lies, loesche, schluesselbundVerfuegbar, schreibe } from "./schluesselbund";

// Umzug der Zugangsdaten (R-07): aus der Klartextdatei ~/.jarvis/config.json in den macOS-Schlüsselbund
// und, falls nötig, zurück. Beides nur auf Knopfdruck eines Menschen am Mac. Ins Audit-Log kommen nur
// die Namen der Einträge, nie Werte.

export class ZugangsdatenFehler extends Error {}

export async function zugangsdatenStatus(): Promise<ZugangsdatenStatus> {
  const datei = await readConfigFile();
  const config = await readConfig();
  const unlesbar = unlesbareGeheimnisse();
  const modus = datei.geheimnisse === "schluesselbund" ? "schluesselbund" : "datei";
  return {
    modus,
    verfuegbar: schluesselbundVerfuegbar(),
    datei: CONFIG_FILE,
    eintraege: GEHEIMNISSE.map((g) => {
      const roh = geheimnisLesen(datei, g.name);
      const wert = geheimnisLesen(config, g.name);
      const ort = roh === GEHEIM_MARKE ? "schluesselbund" : roh ? "datei" : g.umgebung && process.env[g.umgebung] ? "umgebung" : null;
      return { name: g.name, label: g.label, ort, lesbar: ort !== "schluesselbund" || Boolean(wert), fehler: unlesbar.get(g.name) ?? null };
    }),
  };
}

// Prüft, dass an den Stellen der Schlüssel und Passwörter nur noch die Marke steht, und dass kein langer Wert
// (ein Schlüssel) irgendwo sonst in der Datei auftaucht. Kurze Werte werden nur an ihrer Stelle geprüft: Ein
// Passwort, das zufällig wie der Name oder der Server heißt, wäre in der ganzen Datei gesucht ein falscher Alarm.
const LANG = 16;
async function dateiFrei(werte: string[]): Promise<boolean> {
  const datei = await readConfigFile();
  const stellen = GEHEIMNISSE.every((g) => {
    const wert = geheimnisLesen(datei, g.name);
    return wert === undefined || wert === "" || wert === GEHEIM_MARKE;
  });
  const roh = await fs.readFile(CONFIG_FILE, "utf8").catch(() => "");
  return stellen && werte.filter((w) => w.length >= LANG).every((w) => !roh.includes(w) && !roh.includes(JSON.stringify(w).slice(1, -1)));
}

export async function inSchluesselbund(von: Wer): Promise<string> {
  if (von !== "mac") throw new ZugangsdatenFehler("Den Umzug startet nur ein Mensch am Mac.");
  if (!schluesselbundVerfuegbar()) throw new ZugangsdatenFehler("Der macOS-Schlüsselbund ist hier nicht verfügbar.");
  const config = await readConfig();
  if (config.geheimnisse === "schluesselbund") return "Die Zugangsdaten liegen schon im Schlüsselbund.";
  const vorhanden = GEHEIMNISSE.map((g) => ({ name: g.name, wert: geheimnisLesen(config, g.name) })).filter((g): g is { name: (typeof g)["name"]; wert: string } => Boolean(g.wert));
  // 1. In den Schlüsselbund schreiben und jeden Wert zurücklesen. Stimmt einer nicht, wird alles
  //    zurückgenommen und die Datei bleibt, wie sie war.
  const geschrieben: string[] = [];
  try {
    for (const g of vorhanden) {
      await schreibe(g.name, g.wert);
      geschrieben.push(g.name);
      if ((await lies(g.name)) !== g.wert) throw new ZugangsdatenFehler(`„${g.name}“ kam aus dem Schlüsselbund nicht gleich zurück.`);
    }
  } catch (e) {
    for (const name of geschrieben) await loesche(name).catch(() => {});
    await protokolliere({ art: "einstellung", agent: "mensch", kanal: von, was: "Zugangsdaten in den Schlüsselbund", ergebnis: "fehler", grund: e instanceof Error ? e.message : String(e) });
    throw e instanceof ZugangsdatenFehler ? e : new ZugangsdatenFehler(`Umzug abgebrochen, nichts geändert: ${e instanceof Error ? e.message : String(e)}`);
  }
  // 2. Erst jetzt die Datei umstellen: Statt der Werte stehen dort Marken.
  vergissGeheimnisse();
  for (const g of vorhanden) merkeGeheimnis(g.name, g.wert);
  await writeConfig({ ...config, geheimnisse: "schluesselbund" });
  if (!(await dateiFrei(vorhanden.map((g) => g.wert)))) throw new ZugangsdatenFehler("In der Datei steht noch ein Wert im Klartext. Bitte melden.");
  await protokolliere({ art: "einstellung", agent: "mensch", kanal: von, was: "Zugangsdaten in den Schlüsselbund", ergebnis: "umgezogen", daten: { eintraege: vorhanden.map((g) => g.name) } });
  return `${vorhanden.length} ${vorhanden.length === 1 ? "Eintrag liegt" : "Einträge liegen"} jetzt im Schlüsselbund, die Datei enthält keine Schlüssel und Passwörter mehr.`;
}

// Rückweg, falls der Schlüsselbund Probleme macht: Werte wieder in die Datei, Einträge im Schlüsselbund löschen.
export async function zurueckInDatei(von: Wer): Promise<string> {
  if (von !== "mac") throw new ZugangsdatenFehler("Das stellt nur ein Mensch am Mac um.");
  const config = await readConfig();
  if (config.geheimnisse !== "schluesselbund") return "Die Zugangsdaten liegen schon in der Datei.";
  const unlesbar = unlesbareGeheimnisse();
  if (unlesbar.size) throw new ZugangsdatenFehler(`Nicht lesbar: ${[...unlesbar.keys()].join(", ")}. Erst den Schlüsselbund entsperren, sonst gingen sie verloren.`);
  const namen = GEHEIMNISSE.filter((g) => geheimnisLesen(config, g.name)).map((g) => g.name);
  await writeConfig({ ...config, geheimnisse: "datei" });
  for (const name of namen) await loesche(name).catch(() => {});
  vergissGeheimnisse();
  await protokolliere({ art: "einstellung", agent: "mensch", kanal: von, was: "Zugangsdaten zurück in die Datei", ergebnis: "zurueck", daten: { eintraege: namen } });
  return "Die Zugangsdaten liegen wieder in der Datei.";
}
