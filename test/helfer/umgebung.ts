// Gemeinsame Testumgebung: Jeder Test bekommt einen eigenen, leeren Einstellungsordner, damit nie
// echte Daten aus ~/.jarvis gelesen oder überschrieben werden. Die Umgebungsvariablen müssen gesetzt
// sein, bevor ein Servermodul geladen wird, deshalb laden die Tests sie mit await import(...).

import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export function testOrdner(name: string): string {
  return mkdtempSync(path.join(os.tmpdir(), `jarvis-test-${name}-`));
}

// Setzt einen frischen Einstellungsordner und schaltet alle echten Dienste ab: Jede Adresse zeigt auf
// einen Port, auf dem nichts läuft, solange ein Test keinen nachgebauten Dienst startet.
export function sichereUmgebung(name: string): string {
  const dir = testOrdner(name);
  const tot = "http://127.0.0.1:9";
  Object.assign(process.env, {
    JARVIS_CONFIG_DIR: dir,
    JARVIS_DOCS_DIR: path.join(dir, "Dokumente"),
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL ?? tot,
    XAI_BASE_URL: tot,
    TELEGRAM_API_URL: tot,
    DEXSCREENER_URL: tot,
    COINGECKO_URL: tot,
    GECKOTERMINAL_URL: tot,
    RUGCHECK_URL: tot,
    TWELVEDATA_URL: tot,
  });
  // Echte Schlüssel aus der Umgebung des Entwicklers dürfen in Tests nie benutzt werden.
  for (const key of ["ANTHROPIC_API_KEY", "XAI_API_KEY", "TWELVEDATA_API_KEY"]) delete process.env[key];
  return dir;
}
