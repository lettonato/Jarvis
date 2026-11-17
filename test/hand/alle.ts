// Alle Handprüfungen nacheinander (Schritt J4, nicht Teil von npm test): baut JARVIS einmal und klickt dann
// jede Prüfung aus test/hand/*-rauch.ts im echten Browser durch. Am Ende steht eine Zeile, was bestanden hat,
// was fehlgeschlagen ist und was auf diesem Rechner nicht geprüft werden konnte.
//   JARVIS_CHROME=/pfad/zu/chrome npm run handpruefung -- [Ordner für Bilder und Protokolle] [--ohne-bauen] [--nur name,name]
// Ende mit Code 0 nur, wenn alle Prüfungen gelaufen sind und bestanden haben; 1 bei einem Fehlschlag;
// 2, wenn etwas ausgelassen wurde (kein Chrome, kein PostgreSQL, Auswahl mit --nur).
// Jede Prüfung nutzt eigene, leere Testordner und nachgebaute Dienste; es geht nichts an echte Dienste.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { HANDPRUEFUNGEN, ausgelassenWeil, bewerte, brauchtBau, leseArgumente, pruefeChrome, zusammenfassung, type Ergebnis } from "../helfer/handpruefungen";
import { postgresVorhanden } from "../helfer/postgres";
import { beendeMitMarke } from "../helfer/prozessgruppe";

const ZEIT_MS = 6 * 60_000;
const wurzel = process.cwd();

// Jede Prüfung bekommt eine eigene Marke in die Umgebung. Ihr Server läuft in einer eigenen Prozessgruppe und
// überlebt deshalb einen Abbruch der Prüfung; an der Marke findet der Sammellauf ihn danach trotzdem.
const MARKE = "JARVIS_HANDLAUF";

// Was gerade läuft, damit ein Abbruch des Sammellaufs (Strg+C) es mitnimmt.
const laeuft: { pid: number | null; marke: string | null; profil: string | null } = { pid: null, marke: null, profil: null };

// Startet ein Programm in einer eigenen Prozessgruppe, sammelt die Ausgabe und bricht es nach der Frist ab.
function laufe(befehl: string, argumente: string[], fristMs: number, env: NodeJS.ProcessEnv = process.env): Promise<{ code: number | null; ausgabe: string }> {
  return new Promise((fertig) => {
    const kind = spawn(befehl, argumente, { cwd: wurzel, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    laeuft.pid = kind.pid ?? null;
    let ausgabe = "";
    let abgebrochen = false;
    kind.stdout.on("data", (d: Buffer) => (ausgabe += d.toString()));
    kind.stderr.on("data", (d: Buffer) => (ausgabe += d.toString()));
    const frist = setTimeout(() => {
      abgebrochen = true;
      try {
        process.kill(-kind.pid!, "SIGKILL");
      } catch {}
    }, fristMs);
    const ende = (code: number | null) => {
      clearTimeout(frist);
      laeuft.pid = null;
      fertig({ code: abgebrochen ? null : code, ausgabe });
    };
    kind.on("error", (e) => {
      ausgabe += `\n${e.message}`;
      ende(127);
    });
    kind.on("close", ende);
  });
}

// Strg+C oder ein Signal zum Beenden: Die laufende Prüfung, ihr Server und ihr Chrome enden mit. Ohne das liefen
// sie weiter (eigene Prozessgruppe), und der nächste Lauf bekäme Antworten vom liegen gebliebenen Server.
let bricht = false;
async function abbruch(signal: "SIGINT" | "SIGTERM") {
  if (bricht) return;
  bricht = true;
  console.error("\nAbgebrochen. Beende die laufende Prüfung …");
  try {
    if (laeuft.pid) process.kill(-laeuft.pid, "SIGKILL");
  } catch {}
  const reste = laeuft.marke ? await beendeMitMarke(MARKE, laeuft.marke).catch(() => -1) : 0;
  if (reste === null) console.error("Ob noch ein Server oder Browser der Prüfung läuft, lässt sich auf diesem Rechner nicht feststellen.");
  if (reste === -1) console.error("Prozesse der Prüfung ließen sich nicht beenden.");
  if (laeuft.profil) rmSync(laeuft.profil, { recursive: true, force: true });
  process.exit(signal === "SIGINT" ? 130 : 143);
}
process.on("SIGINT", () => void abbruch("SIGINT"));
process.on("SIGTERM", () => void abbruch("SIGTERM"));

async function main(): Promise<number> {
  const angaben = leseArgumente(process.argv.slice(2));
  if ("fehler" in angaben) {
    console.error(angaben.fehler);
    return 1;
  }
  const chrome = pruefeChrome(process.env.JARVIS_CHROME, existsSync);
  if ("fehler" in chrome) {
    console.error(chrome.fehler);
    return 1;
  }
  const { ziel, nur, ohneBauen } = angaben;
  const auswahl = HANDPRUEFUNGEN.filter((p) => !nur || nur.includes(p.name));
  const da = { chrome: chrome.chrome, postgres: postgresVorhanden() };
  const schreibeErgebnis = (z: { text: string; code: number }, ergebnisse: Ergebnis[]) => {
    if (ziel) writeFileSync(path.join(ziel, "ergebnis.json"), JSON.stringify({ am: new Date().toISOString(), text: z.text, code: z.code, ergebnisse }, null, 1));
  };
  if (ziel) {
    mkdirSync(ziel, { recursive: true });
    // Das Ergebnis eines früheren Laufs darf nicht wie das von diesem aussehen, falls dieser vorzeitig endet.
    rmSync(path.join(ziel, "ergebnis.json"), { force: true });
  }

  if (!ohneBauen && brauchtBau(auswahl, da)) {
    console.log("Baue JARVIS (npx next build) …");
    const bau = await laufe("npx", ["next", "build"], 10 * 60_000);
    if (ziel) writeFileSync(path.join(ziel, "bauen.log"), bau.ausgabe);
    if (bau.code !== 0) {
      const text = "Der Bau ist gescheitert; keine Handprüfung ist gelaufen.";
      console.error(bau.ausgabe.split("\n").slice(-30).join("\n"));
      console.error(text);
      schreibeErgebnis({ text, code: 1 }, []);
      return 1;
    }
  }

  const ergebnisse: Ergebnis[] = [];
  for (const p of auswahl) {
    const grund = ausgelassenWeil(p, da);
    if (grund) {
      ergebnisse.push({ name: p.name, zustand: "ausgelassen", grund });
      console.log(`– ${p.name}: ausgelassen, ${grund}`);
      continue;
    }
    const profil = mkdtempSync(path.join(os.tmpdir(), "jarvis-hand-profil-"));
    const start = Date.now();
    const marke = `${process.pid}-${p.name}-${start}`;
    laeuft.marke = marke;
    laeuft.profil = profil;
    const lauf = await laufe("npx", ["tsx", path.join("test", "hand", p.datei), ...p.argumente({ bilder: ziel, profil })], ZEIT_MS, { ...process.env, [MARKE]: marke });
    const sekunden = Math.round((Date.now() - start) / 1000);
    // Was von der Prüfung noch läuft (Server, Chrome), wird beendet, bevor die nächste beginnt.
    const reste = await beendeMitMarke(MARKE, marke).catch(() => -1);
    const notiz =
      reste === -1
        ? "Prozesse dieser Prüfung ließen sich nicht beenden."
        : reste
          ? `${reste} noch laufende Prozesse dieser Prüfung beendet.`
          : reste === null && lauf.code === null
            ? "Ob vom Abbruch noch ein Server oder Browser läuft, lässt sich auf diesem Rechner nicht feststellen."
            : "";
    rmSync(profil, { recursive: true, force: true });
    laeuft.marke = null;
    laeuft.profil = null;
    const urteil = bewerte(p, lauf.code, lauf.ausgabe);
    ergebnisse.push({ name: p.name, sekunden, ...urteil });
    if (ziel) writeFileSync(path.join(ziel, `${p.name}.log`), lauf.ausgabe + (notiz ? `\nSammellauf: ${notiz}\n` : ""));
    if (urteil.zustand === "bestanden") console.log(`✓ ${p.name} (${sekunden} s)`);
    else {
      console.log(`✗ ${p.name} (${sekunden} s): ${urteil.grund}`);
      // Das Ende der Ausgabe gleich zeigen: Dort steht, welcher Schritt nicht gepasst hat.
      console.log(lauf.ausgabe.trimEnd().split("\n").slice(-25).map((z) => `    ${z}`).join("\n"));
    }
    // Nach einer bestandenen Prüfung ist ein noch auslaufender Server normal; gemeldet wird nur, was auffällt.
    if (notiz && (urteil.zustand !== "bestanden" || reste === -1)) console.log(`    ${notiz}`);
  }

  const z = zusammenfassung(ergebnisse, HANDPRUEFUNGEN.length);
  console.log(`\n${z.text}`);
  schreibeErgebnis(z, ergebnisse);
  return z.code;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
