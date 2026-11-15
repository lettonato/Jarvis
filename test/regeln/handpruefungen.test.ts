// Der Sammellauf der Handprüfungen (test/hand/alle.ts, Schritt J4): welche Prüfungen dazugehören, wann eine
// ausgelassen wird, wie ein Lauf bewertet wird und was am Ende dasteht. Geprüft wird hier nur die Auswertung;
// die Prüfungen selbst brauchen ein echtes Chrome und laufen nicht bei npm test.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { HANDPRUEFUNGEN, ausgelassenWeil, bewerte, brauchtBau, leseArgumente, pruefeChrome, zusammenfassung, type Ergebnis } from "../helfer/handpruefungen";

const ORDNER = path.join(process.cwd(), "test", "hand");
const pruefung = (name: string) => HANDPRUEFUNGEN.find((p) => p.name === name)!;
const json = (daten: unknown) => `Vorgeplänkel\n${JSON.stringify(daten, null, 1)}\n`;

describe("Handprüfungen: was zum Sammellauf gehört", () => {
  test("jede Datei test/hand/*-rauch.ts steht in der Liste, und jede Datei der Liste gibt es", () => {
    const dateien = readdirSync(ORDNER).filter((d) => d.endsWith("-rauch.ts")).sort();
    assert.deepEqual([...new Set(HANDPRUEFUNGEN.map((p) => p.datei))].sort(), dateien, "eine neue Handprüfung muss in test/helfer/handpruefungen.ts eingetragen werden");
    for (const p of HANDPRUEFUNGEN) assert.ok(existsSync(path.join(ORDNER, p.datei)), p.datei);
  });

  test("die Namen sind eindeutig; die Schau der Räume ist keine Prüfung", () => {
    assert.equal(new Set(HANDPRUEFUNGEN.map((p) => p.name)).size, HANDPRUEFUNGEN.length);
    assert.ok(!HANDPRUEFUNGEN.some((p) => p.datei.includes("schau")));
  });

  test("Bilder gehen je Prüfung in einen eigenen Unterordner; die Netzschleuse bekommt ihren leeren Profilordner", () => {
    assert.deepEqual(pruefung("marktlage").argumente({ bilder: "/tmp/b", profil: "/tmp/p" }), ["/tmp/b/marktlage"]);
    assert.deepEqual(pruefung("marktlage").argumente({ bilder: null, profil: "/tmp/p" }), []);
    assert.deepEqual(pruefung("schleuse").argumente({ bilder: "/tmp/b", profil: "/tmp/p" }), ["/tmp/p"]);
    assert.deepEqual(pruefung("projekte-postgres").argumente({ bilder: "/tmp/b", profil: "/tmp/p" }), ["/tmp/b/projekte-postgres", "--postgres"]);
    assert.deepEqual(pruefung("projekte-postgres").argumente({ bilder: null, profil: "/tmp/p" }), ["--postgres"], "ohne Bilder darf --postgres nicht als Ordner gelten");
  });
});

describe("Handprüfungen: wann gebaut wird", () => {
  test("genau die Prüfungen, die den gebauten Server starten, brauchen den Bau", () => {
    for (const p of HANDPRUEFUNGEN) {
      const startetServer = /"next", "start"/.test(readFileSync(path.join(ORDNER, p.datei), "utf8"));
      assert.equal(p.braucht.includes("bau"), startetServer, p.name);
    }
  });

  test("gebaut wird nur, wenn eine Prüfung läuft, die den Bau braucht", () => {
    const alles = { chrome: true, postgres: true };
    assert.equal(brauchtBau(HANDPRUEFUNGEN, alles), true);
    assert.equal(brauchtBau([pruefung("pdf"), pruefung("schleuse"), pruefung("browser"), pruefung("postgres")], alles), false);
    assert.equal(brauchtBau([pruefung("pdf"), pruefung("marktlage")], alles), true);
    assert.equal(brauchtBau([pruefung("marktlage"), pruefung("postgres")], { chrome: false, postgres: true }), false, "fällt die Prüfung mit Bau ohnehin aus, wird nicht gebaut");
    assert.equal(brauchtBau([], alles), false);
  });
});

describe("Handprüfungen: wo Chrome liegt", () => {
  const gibtEs = (p: string) => p === "/da/chrome";

  test("ohne Angabe fallen die Prüfungen im Browser aus; das ist kein Fehler", () => {
    assert.deepEqual(pruefeChrome(undefined, gibtEs), { chrome: false });
    assert.deepEqual(pruefeChrome("", gibtEs), { chrome: false });
  });

  test("eine Angabe, die stimmt", () => {
    assert.deepEqual(pruefeChrome("/da/chrome", gibtEs), { chrome: true });
  });

  test("ein Tippfehler im Pfad bricht ab, statt still fast alles auszulassen", () => {
    assert.deepEqual(pruefeChrome("/da/chrom", gibtEs), { fehler: "JARVIS_CHROME zeigt auf /da/chrom; dort liegt keine Datei." });
  });
});

describe("Handprüfungen: auslassen", () => {
  test("ohne Chrome fallen die Prüfungen im Browser aus, mit Grund; die Datenbank allein läuft trotzdem", () => {
    const ohne = { chrome: false, postgres: true };
    assert.equal(ausgelassenWeil(pruefung("marktlage"), ohne), "kein Chrome gefunden (JARVIS_CHROME)");
    assert.equal(ausgelassenWeil(pruefung("postgres"), ohne), null);
    assert.match(ausgelassenWeil(pruefung("projekte-postgres"), ohne) ?? "", /Chrome/);
    assert.deepEqual(HANDPRUEFUNGEN.filter((p) => ausgelassenWeil(p, ohne) === null).map((p) => p.name), ["postgres"], "ohne Chrome läuft nur die Prüfung der Datenbank");
  });

  test("ohne PostgreSQL fallen nur die beiden Prüfungen mit Datenbank aus", () => {
    const ohne = { chrome: true, postgres: false };
    const aus = HANDPRUEFUNGEN.filter((p) => ausgelassenWeil(p, ohne) !== null).map((p) => p.name);
    assert.deepEqual(aus.sort(), ["postgres", "projekte-postgres"]);
    assert.equal(ausgelassenWeil(pruefung("postgres"), ohne), "PostgreSQL ist auf diesem Rechner nicht installiert");
  });

  test("ist alles da, wird nichts ausgelassen", () => {
    assert.ok(HANDPRUEFUNGEN.every((p) => ausgelassenWeil(p, { chrome: true, postgres: true }) === null));
  });
});

describe("Handprüfungen: einen Lauf bewerten", () => {
  test("bestanden ist nur das Ende mit Code 0", () => {
    assert.deepEqual(bewerte(pruefung("marktlage"), 0, "alle Schritte in Ordnung"), { zustand: "bestanden" });
    assert.deepEqual(bewerte(pruefung("marktlage"), 1, "AssertionError: x\n    at main"), { zustand: "fehlgeschlagen", grund: "beendet mit Code 1" });
    assert.deepEqual(bewerte(pruefung("marktlage"), null, ""), { zustand: "fehlgeschlagen", grund: "nicht in der Zeit fertig geworden und abgebrochen" });
  });

  test("die Netzschleuse endet immer mit Code 0: Dort zählt, was sie ausgibt", () => {
    const gut = { direkt: "fehler", internHits: 0, textNachNavigation: false };
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, json(gut)), { zustand: "bestanden" });
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, json({ ...gut, internHits: 2 })), { zustand: "fehlgeschlagen", grund: "der interne Dienst wurde 2-mal erreicht" });
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, json({ ...gut, textNachNavigation: true })), { zustand: "fehlgeschlagen", grund: "die interne Seite war nach der Navigation zu lesen" });
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, "nichts Brauchbares"), { zustand: "fehlgeschlagen", grund: "kein Ergebnis in der Ausgabe gefunden" });
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, json({ direkt: "fehler" })), { zustand: "fehlgeschlagen", grund: "in der Ausgabe fehlt, wie oft der interne Dienst erreicht wurde" }, "fehlt die Zahl, ist das kein Bestehen");
    assert.equal(bewerte(pruefung("schleuse"), 1, json(gut)).zustand, "fehlgeschlagen", "ein Absturz bleibt ein Absturz");
  });

  test("der Browser-Agent: Seite gelesen, Internes abgelehnt, nichts Internes erreicht, Audit-Kette heil", () => {
    const gut = { seiteGelesen: true, interneSeiteAbgelehnt: true, internHits: 0, auditKette: true };
    assert.deepEqual(bewerte(pruefung("browser"), 0, json(gut)), { zustand: "bestanden" });
    assert.equal(bewerte(pruefung("browser"), 0, json({ ...gut, seiteGelesen: false })).grund, "der Agent hat die erlaubte Seite nicht gelesen");
    assert.equal(bewerte(pruefung("browser"), 0, json({ ...gut, interneSeiteAbgelehnt: false })).grund, "die interne Seite wurde nicht abgelehnt");
    assert.equal(bewerte(pruefung("browser"), 0, json({ ...gut, internHits: 1 })).grund, "der interne Dienst wurde 1-mal erreicht");
    assert.equal(bewerte(pruefung("browser"), 0, json({ ...gut, auditKette: false })).grund, "die Kette des Audit-Logs ist nicht in Ordnung");
  });

  test("das Ergebnis darf geschachtelt sein und nach anderen Zeilen kommen", () => {
    const ausgabe = `Server läuft\n{ nicht: das }\n${JSON.stringify({ internHits: 0, textNachNavigation: false, sperren: [{ grund: "intern", ziel: { host: "a" } }] }, null, 1)}\n`;
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, ausgabe), { zustand: "bestanden" });
  });

  test("stehen zwei Ergebnisse in der Ausgabe, zählt das letzte", () => {
    const gut = { internHits: 0, textNachNavigation: false };
    const schlecht = { internHits: 3, textNachNavigation: false };
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, json(schlecht) + json(gut)), { zustand: "bestanden" });
    assert.deepEqual(bewerte(pruefung("schleuse"), 0, json(gut) + json(schlecht)), { zustand: "fehlgeschlagen", grund: "der interne Dienst wurde 3-mal erreicht" });
  });
});

describe("Handprüfungen: was am Ende dasteht", () => {
  const ok = (name: string): Ergebnis => ({ name, zustand: "bestanden", sekunden: 12 });

  test("alle gelaufen und bestanden: Code 0, und nur dann steht „alle“ da", () => {
    const z = zusammenfassung([ok("a"), ok("b")], 2);
    assert.equal(z.code, 0);
    assert.equal(z.text, "Alle 2 Handprüfungen bestanden.");
  });

  test("eine fehlgeschlagen: Code 1, mit Namen und Grund", () => {
    const z = zusammenfassung([ok("a"), { name: "b", zustand: "fehlgeschlagen", grund: "beendet mit Code 1", sekunden: 3 }, { name: "c", zustand: "ausgelassen", grund: "kein Chrome gefunden (JARVIS_CHROME)" }], 3);
    assert.equal(z.code, 1);
    assert.equal(z.text, "1 von 3 Handprüfungen FEHLGESCHLAGEN: b (beendet mit Code 1). Bestanden: 1. Nicht geprüft: c (kein Chrome gefunden (JARVIS_CHROME)).");
  });

  test("ausgelassen ist nicht bestanden: Code 2, und „alle“ steht nicht da", () => {
    const z = zusammenfassung([ok("a"), { name: "c", zustand: "ausgelassen", grund: "PostgreSQL ist auf diesem Rechner nicht installiert" }], 2);
    assert.equal(z.code, 2);
    assert.equal(z.text, "1 von 2 Handprüfungen bestanden, keine fehlgeschlagen. Nicht geprüft: c (PostgreSQL ist auf diesem Rechner nicht installiert).");
    assert.doesNotMatch(z.text, /^Alle/);
  });

  test("nur eine Auswahl gelaufen: Das steht da, auch wenn sie besteht", () => {
    const z = zusammenfassung([ok("a")], 5);
    assert.equal(z.code, 2);
    assert.equal(z.text, "1 von 5 Handprüfungen bestanden, keine fehlgeschlagen. Nicht geprüft: 4 nicht ausgewählte.");
  });

  test("nichts gelaufen ist kein Erfolg", () => {
    assert.equal(zusammenfassung([], 5).code, 2);
    assert.equal(zusammenfassung([], 5).text, "0 von 5 Handprüfungen bestanden, keine fehlgeschlagen. Nicht geprüft: 5 nicht ausgewählte.");
  });
});

describe("Handprüfungen: der Aufruf", () => {
  test("ohne Angaben läuft alles, mit Bauen, ohne Bilder", () => {
    assert.deepEqual(leseArgumente([]), { ziel: null, nur: null, ohneBauen: false });
  });

  test("Ordner, Auswahl und --ohne-bauen in beliebiger Reihenfolge", () => {
    assert.deepEqual(leseArgumente(["/tmp/b", "--nur", "marktlage,risiken", "--ohne-bauen"]), { ziel: "/tmp/b", nur: ["marktlage", "risiken"], ohneBauen: true });
    assert.deepEqual(leseArgumente(["--nur", "pdf", "bilder"]), { ziel: "bilder", nur: ["pdf"], ohneBauen: false }, "der Name nach --nur ist nicht der Ordner");
  });

  test("ein Tippfehler bricht ab, statt still alles oder nichts laufen zu lassen", () => {
    assert.deepEqual(leseArgumente(["--nur"]), { fehler: "Nach --nur fehlen die Namen der Prüfungen." });
    assert.deepEqual(leseArgumente(["--nur", "--ohne-bauen"]), { fehler: "Nach --nur fehlen die Namen der Prüfungen." });
    assert.deepEqual(leseArgumente(["--nur", "marktlage,gibtesnicht"]), { fehler: `Unbekannte Prüfung: gibtesnicht. Es gibt: ${HANDPRUEFUNGEN.map((p) => p.name).join(", ")}.` });
    assert.deepEqual(leseArgumente(["--ohnebauen"]), { fehler: "Unbekannte Angabe: --ohnebauen. Erlaubt sind --ohne-bauen und --nur name,name." });
    assert.deepEqual(leseArgumente(["a", "b"]), { fehler: "Nur ein Ordner für Bilder und Protokolle ist erlaubt: a, b." });
  });
});
