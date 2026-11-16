// Solange ein Raum seine Quelle nicht hat, steht dort ein Satz: „… lädt noch“, oder, wenn JARVIS selbst dort nicht
// antwortet, „… lässt sich gerade nicht laden“. Ein Satz, der ewig „Lade …“ sagt, ist falsch, und eine Null ist es
// auch. Die Sätze stehen an einer Stelle (src/lib/ladestand.ts) und kommen über einen Baustein auf die Seite
// (Ladestand in ui.tsx), der die Auskunft „antwortet nicht“ verlangt. Was die Räume wirklich zeigen, misst die
// Prüfung im Browser (test/hand/ausfall-rauch.ts).

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { luecken } from "../../src/lib/heute";
import { pauseNach } from "../../src/lib/geteilt";
import { ladestand, QUELLEN, verbindungsSatz, type Quelle } from "../../src/lib/ladestand";

const dateien = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? dateien(path.join(ordner, e.name)) : e.name.endsWith(".tsx") ? [path.join(ordner, e.name)] : []));

describe("Ladestand", () => {
  test("eine Quelle, die noch nicht da ist, lädt noch; antwortet JARVIS dort nicht, lässt sie sich gerade nicht laden", () => {
    assert.deepEqual(ladestand("kalender", false), { art: "laedt", text: "Der Kalender lädt noch." });
    assert.deepEqual(ladestand("kalender", true), { art: "gestoert", text: "Der Kalender lässt sich gerade nicht laden." });
    assert.deepEqual(ladestand("dokumente", false), { art: "laedt", text: "Die Dokumente laden noch." });
    assert.deepEqual(ladestand("dokumente", true), { art: "gestoert", text: "Die Dokumente lassen sich gerade nicht laden." });
  });

  test("jede Quelle hat beide Sätze, in Einzahl oder Mehrzahl, und keiner verspricht etwas", () => {
    const namen = Object.keys(QUELLEN) as Quelle[];
    assert.ok(namen.length >= 15, `nur ${namen.length} Quellen`);
    for (const q of namen) {
      const laedt = ladestand(q, false);
      const gestoert = ladestand(q, true);
      assert.equal(laedt.art, "laedt");
      assert.equal(gestoert.art, "gestoert");
      assert.match(laedt.text, /^(Der|Die|Das) .+ (lädt|laden) noch\.$/, q);
      assert.match(gestoert.text, /^(Der|Die|Das) .+ (lässt|lassen) sich gerade nicht laden\.$/, q);
      // Einzahl und Mehrzahl passen in beiden Sätzen zusammen.
      assert.equal(/ laden noch\.$/.test(laedt.text), / lassen sich /.test(gestoert.text), q);
      // Derselbe Name in beiden Sätzen.
      assert.equal(laedt.text.replace(/ (lädt|laden) noch\.$/, ""), gestoert.text.replace(/ (lässt|lassen) sich gerade nicht laden\.$/, ""), q);
    }
  });

  test("„Heute“ und die Räume sagen dasselbe über dieselbe Quelle", () => {
    const nichts = { calendar: null, tasks: null, mail: null, projekte: null };
    for (const aus of [false, true]) {
      const l = luecken(nichts, { calendar: aus, tasks: aus, mail: aus, projekte: aus });
      assert.deepEqual(l.kalender, ladestand("kalender", aus));
      assert.deepEqual(l.aufgaben, ladestand("aufgaben", aus));
      assert.deepEqual(l.post, ladestand("post", aus));
      assert.deepEqual(l.projekte, ladestand("projekte", aus));
    }
  });

  // Ein von Hand geschriebenes „Lade …“ weiß nicht, ob JARVIS antwortet, und bleibt bei einem Ausfall für immer stehen.
  test("kein Raum schreibt sein „Lade …“ selbst: Der Satz kommt über den Baustein Ladestand", () => {
    // Zwei Stellen warten nicht auf eine Abfrage an JARVIS und dürfen ihren Satz behalten.
    const ERLAUBT = new Map([
      ["src/components/views/TodayView.tsx", "Lade den Tag …"], // wartet auf die Uhr des Browsers, nicht auf JARVIS
      ["src/components/views/MailView.tsx", "Lade die Mail …"], // steht nur, solange der Klick läuft; scheitert er, steht die Meldung da
    ]);
    const SELBST = /Lade[^"`<>{}\n]*…|[a-zäöü]+ lädt …|"lädt …"|melden sich …|Wetter lädt/g;
    const treffer: string[] = [];
    let gelesen = 0;
    // Auf jedem System derselbe Name mit Schrägstrichen, damit die Ausnahmen oben auch unter Windows gelten.
    const alle = dateien("src/components").concat(dateien("src/app")).map((d) => d.split(path.sep).join("/"));
    for (const datei of alle) {
      gelesen++;
      for (const fund of readFileSync(datei, "utf8").match(SELBST) ?? []) if (ERLAUBT.get(datei) !== fund) treffer.push(`${datei}: ${fund}`);
    }
    assert.ok(gelesen > 40, `nur ${gelesen} Dateien gelesen`);
    assert.deepEqual(treffer, []);
    // Gegenstück: Das Muster findet die erlaubten Stellen wirklich.
    for (const [datei, satz] of ERLAUBT) {
      const funde: string[] = readFileSync(datei, "utf8").match(SELBST) ?? [];
      assert.ok(funde.includes(satz), `${datei}: „${satz}“ steht dort nicht mehr`);
    }
  });

  test("ein neuer Versuch kommt nach 5, 15 und 45 Sekunden, nicht alle paar Sekunden für immer", () => {
    assert.deepEqual([0, 1, 2, 3].map(pauseNach), [5_000, 15_000, 45_000, 135_000]);
  });

  test("der Baustein verlangt die Auskunft, ob JARVIS antwortet, und zeigt die Art an", () => {
    const ui = readFileSync("src/components/ui.tsx", "utf8");
    assert.match(ui, /export function Ladestand\(\{ quelle, aus[,} ]/);
    assert.match(ui, /aus: boolean/);
    assert.match(ui, /data-ladestand=\{/);
  });
});

describe("JARVIS antwortet nicht mehr", () => {
  const REST = " Uhr nicht. Du siehst den Stand von davor, und Änderungen kommen gerade nicht an.";
  const jetzt = new Date(2026, 10, 16, 12, 30).getTime();

  test("der Hinweis sagt, seit wann, dass der Stand von davor ist und dass Änderungen nicht ankommen", () => {
    assert.equal(verbindungsSatz(new Date(2026, 10, 16, 12, 8, 41).getTime(), jetzt), `JARVIS antwortet seit 12:08${REST}`);
    assert.equal(verbindungsSatz(new Date(2026, 10, 16, 7, 5).getTime(), jetzt), `JARVIS antwortet seit 07:05${REST}`);
  });

  test("ist das nicht heute (der Mac hat über Nacht geschlafen), steht der Tag dabei", () => {
    assert.equal(verbindungsSatz(new Date(2026, 10, 15, 23, 10).getTime(), jetzt), `JARVIS antwortet seit gestern, 23:10${REST}`);
    assert.equal(verbindungsSatz(new Date(2026, 10, 14, 9, 0).getTime(), jetzt), `JARVIS antwortet seit dem 14. November, 09:00${REST}`);
    // Kurz nach Mitternacht ist „gestern“ erst ein paar Minuten her.
    assert.equal(verbindungsSatz(new Date(2026, 10, 15, 23, 58).getTime(), new Date(2026, 10, 16, 0, 3).getTime()), `JARVIS antwortet seit gestern, 23:58${REST}`);
    // Über den Monatswechsel.
    assert.equal(verbindungsSatz(new Date(2026, 9, 31, 22, 0).getTime(), new Date(2026, 10, 1, 8, 0).getTime()), `JARVIS antwortet seit gestern, 22:00${REST}`);
  });

  test("hat er in diesem Besuch noch nie geantwortet, behauptet der Hinweis keinen Stand", () => {
    assert.equal(verbindungsSatz(null, jetzt), "JARVIS antwortet gerade nicht. Änderungen kommen gerade nicht an.");
  });
});
