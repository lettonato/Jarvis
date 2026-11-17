// Die Sicherung (scripts/sichern.sh) und ihre Prüfung (scripts/wiederherstellen-pruefen.sh), gespielt an einem
// winzigen Wegwerf-Projekt mit eigenem Git: Eine gute Sicherung besteht, jede Art von Schaden wird bemerkt und
// beim Namen genannt, und eine misslungene neue Sicherung lässt die alte gute liegen. Mit der echten Sicherung
// und dem echten Projekt hat das nichts zu tun; gearbeitet wird nur in Wegwerf-Ordnern.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";

const SICHERN = path.resolve("scripts/sichern.sh");
const PRUEFEN = path.resolve("scripts/wiederherstellen-pruefen.sh");
const wurzel = mkdtempSync(path.join(os.tmpdir(), "jarvis-sicherung-"));
after(() => rmSync(wurzel, { recursive: true, force: true }));

// Läuft der Testlauf selbst aus Git heraus (etwa aus einem Hook), zeigen GIT_DIR und Verwandte auf das echte
// Projekt. Die Wegwerf-Projekte hier dürfen davon nichts erben.
const umgebung = { ...process.env };
for (const name of Object.keys(umgebung)) if (name.startsWith("GIT_")) delete umgebung[name];
const git = (ordner: string, ...args: string[]) => execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: ordner, stdio: "pipe", env: umgebung }).toString();

// So meldet der Testlauf von Node seine Zahlen; mehr liest die Prüfung nicht. Das kleine Projekt braucht ein
// Paket („teil“, liegt im Projekt selbst, also ohne Netz): Ohne „npm ci“ läuft seine Prüfung nicht.
const zahlen = (tests: number, pass: number, fail = 0, skipped = 0) => `import "teil"; console.log("# tests ${tests}\\n# pass ${pass}\\n# fail ${fail}\\n# cancelled 0\\n# skipped ${skipped}\\n# todo 0");`;

let nummer = 0;
function kleinesProjekt(pruefen = zahlen(3, 3), paketliste = true): { projekt: string; sicherung: string } {
  const ort = path.join(wurzel, `fall-${++nummer}`);
  const projekt = path.join(ort, "projekt");
  mkdirSync(projekt, { recursive: true });
  mkdirSync(path.join(projekt, "teil"));
  writeFileSync(path.join(projekt, "teil", "package.json"), JSON.stringify({ name: "teil", version: "1.0.0", type: "module", main: "index.js" }));
  writeFileSync(path.join(projekt, "teil", "index.js"), "export default 1;\n");
  writeFileSync(path.join(projekt, "package.json"), JSON.stringify({ name: "klein", version: "1.0.0", private: true, scripts: { pruefen: "node pruefen.mjs" }, dependencies: { teil: "file:teil" } }, null, 2));
  const pakete = { "": { name: "klein", version: "1.0.0", dependencies: { teil: "file:teil" } }, "node_modules/teil": { resolved: "teil", link: true }, teil: { version: "1.0.0" } };
  if (paketliste) writeFileSync(path.join(projekt, "package-lock.json"), JSON.stringify({ name: "klein", version: "1.0.0", lockfileVersion: 3, requires: true, packages: pakete }, null, 2));
  writeFileSync(path.join(projekt, "pruefen.mjs"), pruefen);
  writeFileSync(path.join(projekt, "LIESMICH.txt"), "Hallo A\n");
  git(projekt, "init", "-q", "-b", "arbeit");
  git(projekt, "add", "-A");
  git(projekt, "commit", "-q", "-m", "Anfang");
  return { projekt, sicherung: path.join(ort, "sicherung") };
}

const sichere = (projekt: string, sicherung: string, env: Record<string, string | undefined> = {}) => spawnSync("bash", [SICHERN, sicherung], { cwd: projekt, env: { ...umgebung, ...env }, encoding: "utf8" });
const pruefe = (sicherung: string, ...args: string[]) => spawnSync("bash", [PRUEFEN, sicherung, ...args], { cwd: wurzel, env: umgebung, encoding: "utf8" });

// Ein Programm gleichen Namens vorn im Suchpfad, das beim soundsovielten Aufruf scheitert und sonst das echte ruft.
function scheitertBeimAufruf(projekt: string, programm: string, welcher: number): Record<string, string | undefined> {
  const kaputt = path.join(path.dirname(projekt), "kaputt");
  mkdirSync(kaputt);
  writeFileSync(path.join(kaputt, programm), `#!/bin/sh\nz="$(dirname "$0")/zaehler"\nn=$(($(cat "$z" 2>/dev/null || echo 0) + 1))\necho $n > "$z"\n[ "$n" -eq ${welcher} ] && exit 1\nPATH="$ECHTER_PFAD" exec ${programm} "$@"\n`);
  chmodSync(path.join(kaputt, programm), 0o755);
  return { ECHTER_PFAD: process.env.PATH, PATH: `${kaputt}${path.delimiter}${process.env.PATH}` };
}

function gesichert(pruefen?: string, paketliste = true) {
  const fall = kleinesProjekt(pruefen, paketliste);
  const lauf = sichere(fall.projekt, fall.sicherung);
  assert.equal(lauf.status, 0, lauf.stderr);
  return { ...fall, buendel: path.join(fall.sicherung, "jarvis-aktuell.bundle"), zip: path.join(fall.sicherung, "Jarvis-aktuell.zip"), liste: path.join(fall.sicherung, "sicherungen.txt") };
}

const abdruck = (ordner: string) =>
  Object.fromEntries(
    readdirSync(ordner)
      .sort()
      .map((name) => [name, createHash("sha256").update(readFileSync(path.join(ordner, name))).digest("hex")]),
  );

function scheitertMit(lauf: { status: number | null; stderr: string; stdout: string }, satz: RegExp) {
  assert.notEqual(lauf.status, 0, `Die Prüfung hätte scheitern müssen:\n${lauf.stdout}`);
  assert.match(lauf.stderr, satz);
  assert.doesNotMatch(lauf.stdout, /Sicherung geprüft/);
}

describe("Sicherung prüfen (nur Dateien)", () => {
  test("eine frische Sicherung besteht, und die Prüfung verändert sie nicht", () => {
    const { sicherung } = gesichert();
    const vorher = abdruck(sicherung);
    const lauf = pruefe(sicherung, "--nur-dateien");
    assert.equal(lauf.status, 0, lauf.stderr);
    assert.match(lauf.stdout, /Bündel unbeschädigt, Commit [0-9a-f]{7} wie in sicherungen\.txt, 1 Commits Geschichte/);
    assert.match(lauf.stdout, /ZIP enthält dieselben 6 Dateien wie der Commit/);
    assert.match(lauf.stdout, /Sicherung geprüft \(nur Dateien\)/);
    assert.deepEqual(abdruck(sicherung), vorher);
    assert.deepEqual(Object.keys(vorher), ["Jarvis-aktuell.zip", "jarvis-aktuell.bundle", "sicherungen.txt"]);
  });

  test("ein abgeschnittenes Bündel wird bemerkt", () => {
    const { sicherung, buendel } = gesichert();
    truncateSync(buendel, readFileSync(buendel).length - 40);
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /Das Git-Bündel ist beschädigt oder enthält den Zweig arbeit nicht/);
  });

  test("ein Bündel mit einem einzigen umgekippten Byte mitten im Inhalt wird bemerkt", () => {
    const { sicherung, buendel } = gesichert();
    const inhalt = readFileSync(buendel);
    inhalt[inhalt.length - 60] ^= 0xff;
    writeFileSync(buendel, inhalt);
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /Das Git-Bündel ist beschädigt/);
  });

  test("ein Bündel mit unlesbarem Kopf wird bemerkt", () => {
    const { sicherung, buendel } = gesichert();
    writeFileSync(buendel, Buffer.concat([Buffer.from("kein Bündel\n"), readFileSync(buendel).subarray(12)]));
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /Das Git-Bündel ist beschädigt \(der Kopf ist nicht lesbar\)/);
  });

  test("ein anderer Commit als in sicherungen.txt wird bemerkt", () => {
    const { sicherung, liste } = gesichert();
    writeFileSync(liste, `2026-01-01T00:00:00Z  arbeit  ${"0123456789abcdef".repeat(2)}01234567\n`);
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /sicherungen\.txt nennt 0123456789abcdef/);
  });

  test("ein ZIP mit einer einzigen geänderten Stelle wird bemerkt, auch bei gleicher Länge", () => {
    const { projekt, sicherung, zip } = gesichert();
    writeFileSync(path.join(projekt, "LIESMICH.txt"), "Hallo B\n");
    git(projekt, "commit", "-q", "-am", "Ein Buchstabe anders");
    git(projekt, "archive", "--format=zip", "--prefix=Jarvis-aktuell/", "-o", zip, "HEAD");
    const lauf = pruefe(sicherung, "--nur-dateien");
    scheitertMit(lauf, /Das ZIP enthält nicht dieselben Dateien wie der Commit im Bündel/);
    assert.match(lauf.stderr, /LIESMICH\.txt/);
  });

  test("ein ZIP mit einer Datei zu viel wird bemerkt", () => {
    const { projekt, sicherung, zip } = gesichert();
    writeFileSync(path.join(projekt, "zusatz.txt"), "gehört nicht zum Commit im Bündel\n");
    git(projekt, "add", "-A");
    git(projekt, "commit", "-q", "-m", "Eine Datei mehr");
    git(projekt, "archive", "--format=zip", "--prefix=Jarvis-aktuell/", "-o", zip, "HEAD");
    const lauf = pruefe(sicherung, "--nur-dateien");
    scheitertMit(lauf, /Das ZIP enthält nicht dieselben Dateien/);
    assert.match(lauf.stderr, /zusatz\.txt/);
  });

  test("ein abgeschnittenes ZIP wird bemerkt", () => {
    const { sicherung, zip } = gesichert();
    truncateSync(zip, Math.floor(readFileSync(zip).length / 2));
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /Das ZIP lässt sich nicht entpacken/);
  });

  test("eine fehlende oder leere Datei wird bemerkt", () => {
    const { sicherung, zip, buendel } = gesichert();
    truncateSync(zip, 0);
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /Jarvis-aktuell\.zip fehlt oder ist leer/);
    rmSync(buendel);
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /jarvis-aktuell\.bundle fehlt oder ist leer/);
  });

  test("eine letzte Zeile ohne Commit wird bemerkt", () => {
    const { sicherung, liste } = gesichert();
    writeFileSync(liste, "2026-01-01T00:00:00Z  arbeit\n");
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /nennt keinen Commit/);
    writeFileSync(liste, "2026-01-01T00:00:00Z  arbeit  kein-commit\n");
    scheitertMit(pruefe(sicherung, "--nur-dateien"), /nennt keinen Commit/);
  });

  test("fehlt der Liste der Zeilenumbruch am Ende, wird trotzdem geprüft", () => {
    const { sicherung, liste } = gesichert();
    writeFileSync(liste, readFileSync(liste, "utf8").trimEnd());
    const lauf = pruefe(sicherung, "--nur-dateien");
    assert.equal(lauf.status, 0, lauf.stderr);
    assert.match(lauf.stdout, /Sicherung geprüft \(nur Dateien\)/);
  });

  test("der Ordner darf auch von hier aus angegeben sein (ohne ganzen Pfad)", () => {
    const { sicherung } = gesichert();
    const lauf = spawnSync("bash", [PRUEFEN, "sicherung", "--nur-dateien"], { cwd: path.dirname(sicherung), env: umgebung, encoding: "utf8" });
    assert.equal(lauf.status, 0, lauf.stderr);
    assert.match(lauf.stdout, /Sicherung geprüft \(nur Dateien\)/);
    scheitertMit(pruefe(path.join(sicherung, "gibt-es-nicht"), "--nur-dateien"), /Den Ordner .*gibt-es-nicht gibt es nicht/);
  });

  test("ohne Ordner oder mit einem unbekannten Zusatz wird nichts geprüft", () => {
    const { sicherung } = gesichert();
    scheitertMit(pruefe(sicherung, "--nur-datein"), /Unbekannte Angabe/);
    const ohne = spawnSync("bash", [PRUEFEN], { cwd: wurzel, env: umgebung, encoding: "utf8" });
    assert.notEqual(ohne.status, 0);
    assert.match(ohne.stderr, /Sicherungsordner angeben/);
  });
});

describe("Sicherung vollständig zurückspielen", () => {
  test("aus dem ZIP allein: Pakete installieren, prüfen, Tests zählen", () => {
    const { sicherung } = gesichert();
    const vorher = abdruck(sicherung);
    const lauf = pruefe(sicherung);
    assert.equal(lauf.status, 0, lauf.stderr);
    assert.match(lauf.stdout, /Pakete installiert/);
    assert.match(lauf.stdout, /3 von 3 Tests im wiederhergestellten Stand/);
    assert.match(lauf.stdout, /Sicherung geprüft und wiederhergestellt/);
    assert.deepEqual(abdruck(sicherung), vorher);
  });

  test("scheitert die Prüfung im wiederhergestellten Stand, gilt die Sicherung nicht als geprüft", () => {
    const { sicherung } = gesichert(`${zahlen(3, 2, 1)} process.exit(1);`);
    scheitertMit(pruefe(sicherung), /bestehen Lint, Typprüfung oder Tests nicht/);
  });

  test("lassen sich die Pakete nicht installieren, gilt die Sicherung nicht als geprüft", () => {
    const { sicherung } = gesichert(undefined, false);
    const lauf = pruefe(sicherung);
    scheitertMit(lauf, /Die Pakete lassen sich nicht installieren/);
    assert.doesNotMatch(lauf.stdout, /Pakete installiert/);
  });

  test("weniger bestanden als gelaufen gilt nicht als bestanden, auch wenn der Lauf Erfolg meldet", () => {
    const { sicherung } = gesichert(zahlen(3, 2));
    scheitertMit(pruefe(sicherung), /Die Zahlen der Tests stimmen nicht \(2 von 3 bestanden, 0 anderes\)/);
  });

  test("ausgelassene Tests zählen nicht als bestanden", () => {
    const { sicherung } = gesichert(zahlen(3, 2, 0, 1));
    scheitertMit(pruefe(sicherung), /Die Zahlen der Tests stimmen nicht \(2 von 3 bestanden, 1 anderes\)/);
  });

  test("auch bei „3 von 3 bestanden“ darf daneben nichts ausgelassen sein", () => {
    const { sicherung } = gesichert(zahlen(3, 3, 0, 1));
    scheitertMit(pruefe(sicherung), /Die Zahlen der Tests stimmen nicht \(3 von 3 bestanden, 1 anderes\)/);
  });

  test("ein Lauf ganz ohne Zahlen oder mit null Tests gilt nicht als bestanden", () => {
    scheitertMit(pruefe(gesichert(`console.log("alles gut");`).sicherung), /Die Zahlen der Tests stimmen nicht \(\? von \? bestanden/);
    scheitertMit(pruefe(gesichert(zahlen(0, 0)).sicherung), /Die Zahlen der Tests stimmen nicht \(0 von 0 bestanden/);
  });
});

describe("Sichern", () => {
  test("zwei Sicherungen nacheinander: Die Liste wächst, geprüft wird der neueste Stand", () => {
    const { projekt, sicherung, liste } = gesichert();
    writeFileSync(path.join(projekt, "LIESMICH.txt"), "Hallo B\n");
    git(projekt, "commit", "-q", "-am", "Zweiter Stand");
    const zweiter = git(projekt, "rev-parse", "HEAD").trim();
    const lauf = sichere(projekt, sicherung);
    assert.equal(lauf.status, 0, lauf.stderr);
    assert.match(lauf.stdout, new RegExp(`Gesichert und geprüft: arbeit @ ${zweiter.slice(0, 7)}`));
    const zeilen = readFileSync(liste, "utf8").trim().split("\n");
    assert.equal(zeilen.length, 2);
    assert.ok(zeilen[1].endsWith(`  arbeit  ${zweiter}`));
    assert.match(pruefe(sicherung, "--nur-dateien").stdout, new RegExp(`Sicherung geprüft \\(nur Dateien\\): ${zweiter.slice(0, 7)}`));
    assert.deepEqual(readdirSync(sicherung).sort(), ["Jarvis-aktuell.zip", "jarvis-aktuell.bundle", "sicherungen.txt"]);
  });

  test("lässt sich die neue Sicherung nicht prüfen, bleibt die alte gute unverändert liegen", () => {
    const { projekt, sicherung } = gesichert();
    const vorher = abdruck(sicherung);
    writeFileSync(path.join(projekt, "LIESMICH.txt"), "Hallo B\n");
    git(projekt, "commit", "-q", "-am", "Zweiter Stand");
    // „unzip“ scheitert gleich beim ersten Mal: Die neue Sicherung lässt sich nicht entpacken.
    const lauf = sichere(projekt, sicherung, scheitertBeimAufruf(projekt, "unzip", 1));
    assert.notEqual(lauf.status, 0, lauf.stdout);
    assert.match(lauf.stderr, /Die alte Sicherung ist unverändert/);
    assert.doesNotMatch(lauf.stdout, /Gesichert und geprüft/);
    assert.deepEqual(abdruck(sicherung), vorher);
    assert.equal(pruefe(sicherung, "--nur-dateien").status, 0);
  });

  test("besteht die Sicherung an ihrem Platz die Prüfung nicht, wird die alte zurückgelegt", () => {
    const { projekt, sicherung } = gesichert();
    const vorher = abdruck(sicherung);
    writeFileSync(path.join(projekt, "LIESMICH.txt"), "Hallo B\n");
    git(projekt, "commit", "-q", "-am", "Zweiter Stand");
    // „unzip“ arbeitet beim ersten Mal (Prüfung der neuen Sicherung) und scheitert beim zweiten (Prüfung im
    // Ordner), als wäre beim Verschieben etwas kaputtgegangen.
    const lauf = sichere(projekt, sicherung, scheitertBeimAufruf(projekt, "unzip", 2));
    assert.notEqual(lauf.status, 0, lauf.stdout);
    assert.match(lauf.stderr, /Die alte Sicherung liegt wieder unverändert im Ordner/);
    assert.doesNotMatch(lauf.stdout, /Gesichert und geprüft/);
    assert.deepEqual(abdruck(sicherung), vorher);
    assert.equal(pruefe(sicherung, "--nur-dateien").status, 0);
  });

  for (const welcher of [1, 2, 3, 4]) {
    test(`bricht das Verschieben mittendrin ab (Schritt ${welcher} von 4), wird die alte Sicherung zurückgelegt`, () => {
      const { projekt, sicherung } = gesichert();
      const vorher = abdruck(sicherung);
      writeFileSync(path.join(projekt, "LIESMICH.txt"), "Hallo B\n");
      git(projekt, "commit", "-q", "-am", "Zweiter Stand");
      const lauf = sichere(projekt, sicherung, scheitertBeimAufruf(projekt, "mv", welcher));
      assert.notEqual(lauf.status, 0, lauf.stdout);
      assert.match(lauf.stderr, /Die alte Sicherung liegt wieder unverändert im Ordner/);
      assert.deepEqual(abdruck(sicherung), vorher);
      assert.equal(pruefe(sicherung, "--nur-dateien").status, 0);
    });
  }

  test("scheitert die allererste Sicherung, bleibt der Ordner leer", () => {
    const { projekt, sicherung } = kleinesProjekt();
    const lauf = sichere(projekt, sicherung, scheitertBeimAufruf(projekt, "mv", 2));
    assert.notEqual(lauf.status, 0, lauf.stdout);
    assert.deepEqual(readdirSync(sicherung), []);
  });

  test("der Ordner darf auch von hier aus angegeben sein (ohne ganzen Pfad)", () => {
    const { projekt, sicherung } = kleinesProjekt();
    const lauf = sichere(projekt, "../sicherung");
    assert.equal(lauf.status, 0, lauf.stderr);
    assert.equal(pruefe(sicherung, "--nur-dateien").status, 0);
  });

  test("fehlt der Liste der Zeilenumbruch am Ende, beginnt die neue Zeile trotzdem auf einer eigenen", () => {
    const { projekt, sicherung, liste } = gesichert();
    const erste = readFileSync(liste, "utf8").trimEnd();
    writeFileSync(liste, erste);
    writeFileSync(path.join(projekt, "LIESMICH.txt"), "Hallo B\n");
    git(projekt, "commit", "-q", "-am", "Zweiter Stand");
    const lauf = sichere(projekt, sicherung);
    assert.equal(lauf.status, 0, lauf.stderr);
    const zeilen = readFileSync(liste, "utf8").split("\n");
    assert.equal(zeilen.length, 3);
    assert.equal(zeilen[0], erste);
    assert.match(zeilen[1], /^\S+  arbeit  [0-9a-f]{40}$/);
    assert.equal(zeilen[2], "");
  });

  test("ohne ausgecheckten Zweig wird nicht gesichert, und das steht in der Meldung", () => {
    const { projekt, sicherung } = gesichert();
    const vorher = abdruck(sicherung);
    git(projekt, "checkout", "-q", "--detach");
    const lauf = sichere(projekt, sicherung);
    assert.notEqual(lauf.status, 0, lauf.stdout);
    assert.match(lauf.stderr, /kein Zweig ausgecheckt/);
    assert.deepEqual(abdruck(sicherung), vorher);
  });

  test("ein liegen gebliebener Arbeitsordner eines abgebrochenen Laufs wird weggeräumt", () => {
    const { projekt, sicherung } = gesichert();
    mkdirSync(path.join(sicherung, ".neu-4711"));
    writeFileSync(path.join(sicherung, ".neu-4711", "jarvis-aktuell.bundle"), "Rest eines abgebrochenen Laufs");
    const lauf = sichere(projekt, sicherung);
    assert.equal(lauf.status, 0, lauf.stderr);
    assert.deepEqual(readdirSync(sicherung).sort(), ["Jarvis-aktuell.zip", "jarvis-aktuell.bundle", "sicherungen.txt"]);
  });
});
