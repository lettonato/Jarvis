// Hinweise am Tag (src/lib/hinweise.ts): wann JARVIS sich zwischendurch von selbst meldet und wann nicht.
// Reine Regeln ohne Uhr und ohne Netz. Geprüft wird vor allem die Obergrenze: nur tagsüber, höchstens drei am
// Tag, mit Abstand, jedes Ding nur einmal, und über Telegram stehen Projektinhalte nur mit dem Schalter.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { anlaesse, darfJetzt, HINWEIS_REGELN, hinweisNachricht, istAnderer, merke, neueHinweise, type FaelligeAufgabe, type HinweisStand } from "../../src/lib/hinweise";

const um = (stunde: number, minute = 0, tag = 13) => new Date(2026, 10, tag, stunde, minute, 0, 0);
const HEUTE = "2026-11-13";
const LEER: HinweisStand = { gesendet: [], gemeldet: {} };
const aufgabe = (id: string, faellig: string, mehr: Partial<FaelligeAufgabe> = {}): FaelligeAufgabe => ({ id, projekt: "Hallenneubau", vertraulich: false, text: `Aufgabe ${id}`, zustaendig: "", faellig, ...mehr });

describe("Hinweise am Tag: was ein Anlass ist", () => {
  test("wer zuständig ist: leer, „ich“ und der eigene Name sind ich selbst, alle anderen sind andere", () => {
    for (const ich of ["", "  ", "ich", "Ich", "mir", "selbst", "Benedikt", "benedikt", "Benedikt Scheuchl"]) assert.equal(istAnderer(ich, "Benedikt"), false, `„${ich}“`);
    for (const wer of ["Thomas", "Anna Huber", "Benedikta", "Statikbüro"]) assert.equal(istAnderer(wer, "Benedikt"), true, `„${wer}“`);
    assert.equal(istAnderer("Benedikt", "Benedikt Scheuchl"), false, "der Vorname reicht");
  });

  test("Überfälliges, fehlende Rückmeldungen und was heute noch offen ist, werden getrennt", () => {
    const a = anlaesse(
      [aufgabe("e1", "2026-11-12"), aufgabe("e2", "2026-11-10", { zustaendig: "Thomas" }), aufgabe("e3", HEUTE), aufgabe("e4", HEUTE, { zustaendig: "Thomas" })],
      [{ text: "Steuerberater anrufen" }],
      HEUTE,
      "Benedikt",
    );
    assert.deepEqual(a.map((x) => [x.art, x.schluessel]), [
      ["ueberfaellig", "u:e1:2026-11-12"],
      ["rueckmeldung", "u:e2:2026-11-10"],
      ["heute", `heute:${HEUTE}`],
      ["heute", `heute:${HEUTE}`],
      ["heute", `heute:${HEUTE}`],
    ]);
    assert.equal(a[4].projekt, null, "die eigene Aufgabe gehört zu keinem Projekt");
    assert.deepEqual(anlaesse([aufgabe("e9", "2026-11-14")], [], HEUTE, "Benedikt"), [], "was erst morgen fällig ist, ist kein Anlass");
  });

  test("ändert sich die Frist, ist es ein neuer Anlass", () => {
    const [vorher] = anlaesse([aufgabe("e1", "2026-11-10")], [], HEUTE, "Benedikt");
    const [nachher] = anlaesse([aufgabe("e1", "2026-11-12")], [], HEUTE, "Benedikt");
    assert.notEqual(vorher.schluessel, nachher.schluessel);
  });
});

describe("Hinweise am Tag: die Obergrenze", () => {
  const alle = anlaesse([aufgabe("e1", "2026-11-12"), aufgabe("e3", HEUTE)], [], HEUTE, "Benedikt");

  test("nur tagsüber: vor 9 und ab 18 Uhr kommt nichts", () => {
    assert.equal(darfJetzt(LEER, um(8, 59)), false);
    assert.equal(darfJetzt(LEER, um(9, 0)), true);
    assert.equal(darfJetzt(LEER, um(17, 59)), true);
    assert.equal(darfJetzt(LEER, um(18, 0)), false);
    assert.deepEqual(neueHinweise(alle, LEER, um(7, 0)), []);
    assert.deepEqual(neueHinweise(alle, LEER, um(22, 0)), []);
  });

  test("was heute fällig ist, kommt erst am Nachmittag; Überfälliges sofort", () => {
    assert.deepEqual(neueHinweise(alle, LEER, um(10)).map((a) => a.art), ["ueberfaellig"]);
    assert.deepEqual(neueHinweise(alle, LEER, um(14, 59)).map((a) => a.art), ["ueberfaellig"]);
    assert.deepEqual(neueHinweise(alle, LEER, um(15, 0)).map((a) => a.art), ["ueberfaellig", "heute"]);
  });

  test("jedes Ding nur einmal: was gemeldet ist, kommt nicht wieder", () => {
    const stand = merke(LEER, neueHinweise(alle, LEER, um(10)), um(10), true);
    assert.deepEqual(neueHinweise(alle, stand, um(11, 30)), [], "dasselbe Überfällige kommt nicht noch einmal");
    assert.deepEqual(neueHinweise(alle, stand, um(15, 0)).map((a) => a.art), ["heute"]);
    const danach = merke(stand, neueHinweise(alle, stand, um(15, 0)), um(15, 0), true);
    assert.deepEqual(neueHinweise(alle, danach, um(16, 30)), []);
    // Am nächsten Tag ist dieselbe Aufgabe weiter überfällig: Das sagt das Morgenbriefing, kein neuer Hinweis.
    assert.deepEqual(neueHinweise(anlaesse([aufgabe("e1", "2026-11-12")], [], "2026-11-14", "Benedikt"), danach, um(10, 0, 14)), []);
  });

  test("zwischen zwei Hinweisen liegt mindestens eine Stunde", () => {
    const stand = merke(LEER, [], um(10), true);
    const neu = anlaesse([aufgabe("e7", "2026-11-11")], [], HEUTE, "Benedikt");
    assert.deepEqual(neueHinweise(neu, stand, um(10, 59)), []);
    assert.equal(neueHinweise(neu, stand, um(11, 0)).length, 1);
  });

  test("höchstens drei Hinweise am Tag, am nächsten Tag wieder", () => {
    let stand = LEER;
    for (const stunde of [9, 11, 13]) stand = merke(stand, [], um(stunde), true);
    const neu = anlaesse([aufgabe("e8", "2026-11-11")], [], HEUTE, "Benedikt");
    assert.equal(HINWEIS_REGELN.hoechstensJeTag, 3);
    assert.equal(darfJetzt(stand, um(16)), false);
    assert.deepEqual(neueHinweise(neu, stand, um(16)), []);
    assert.equal(neueHinweise(neu, stand, um(9, 0, 14)).length, 1, "am nächsten Tag zählt es neu");
  });

  test("merken ohne Nachricht (das Briefing hat es schon gesagt) verbraucht keinen Hinweis", () => {
    const stand = merke(LEER, alle, um(7, 31), false);
    assert.deepEqual(stand.gesendet, []);
    assert.deepEqual(neueHinweise(alle, stand, um(10)), [], "was das Briefing gesagt hat, kommt nicht noch einmal");
    assert.equal(neueHinweise(alle, stand, um(15)).length, 0, "auch nicht am Nachmittag: gemerkt ist gemerkt");
  });

  test("der Stand wächst nicht endlos: alte Merker und alte Sendezeiten fallen weg", () => {
    let stand = merke(LEER, anlaesse([aufgabe("alt", "2026-08-01")], [], "2026-08-02", "Benedikt"), new Date(2026, 7, 2, 10), true);
    stand = merke(stand, anlaesse([aufgabe("neu", "2026-11-12")], [], HEUTE, "Benedikt"), um(10), true);
    assert.deepEqual(Object.keys(stand.gemeldet), ["u:neu:2026-11-12"]);
    assert.equal(stand.gesendet.length, 1, "nur die Sendezeiten von heute bleiben");
  });
});

describe("Hinweise am Tag: die Nachricht", () => {
  const alle = anlaesse(
    [
      aufgabe("e1", "2026-11-12", { text: "Statik prüfen" }),
      aufgabe("e2", "2026-11-10", { text: "Angebot Stahlbau", zustaendig: "Thomas" }),
      aufgabe("e3", HEUTE, { text: "Vertrag gegenlesen" }),
      aufgabe("g1", "2026-11-11", { projekt: "Adler", vertraulich: true, text: "Kaufpreis nachverhandeln", zustaendig: "Dr. Meier" }),
    ],
    [{ text: "Steuerberater anrufen" }],
    HEUTE,
    "Benedikt",
  );

  test("mit dem Schalter stehen Projekte beim Namen, getrennt nach Anlass", () => {
    const text = hinweisNachricht(alle, HEUTE, true);
    assert.match(text, /^Kurzer Hinweis:/);
    assert.match(text, /Überfällig:\n• Hallenneubau: Statik prüfen, seit gestern überfällig/);
    assert.match(text, /Hier fehlt eine Rückmeldung:\n• Hallenneubau: Angebot Stahlbau \(zuständig: Thomas\), seit 3 Tagen überfällig/);
    assert.match(text, /Heute noch offen:\n• Hallenneubau: Vertrag gegenlesen\n• Steuerberater anrufen/);
  });

  test("ein vertrauliches Projekt wird nie beim Namen genannt, auch nicht mit Schalter", () => {
    for (const namen of [true, false]) {
      const text = hinweisNachricht(alle, HEUTE, namen);
      for (const wort of ["Adler", "Kaufpreis", "Meier"]) assert.ok(!text.includes(wort), `„${wort}“ steht in der Nachricht (namen: ${namen})`);
    }
    assert.match(hinweisNachricht(alle, HEUTE, true), /• ein Eintrag aus einem vertraulichen Projekt: Einzelheiten nur am Mac/);
  });

  test("ohne den Schalter stehen Projekte nur als Zahl da; die eigenen Aufgaben bleiben lesbar", () => {
    const text = hinweisNachricht(alle, HEUTE, false);
    for (const wort of ["Hallenneubau", "Statik", "Stahlbau", "Thomas", "Vertrag"]) assert.ok(!text.includes(wort), `„${wort}“ ging ohne Schalter hinaus`);
    assert.match(text, /Projekte: Eine Aufgabe ist überfällig, bei 2 fehlt eine Rückmeldung, eine von heute ist noch offen\. Einzelheiten am Mac unter „Heute“\./);
    assert.match(text, /Heute noch offen:\n• Steuerberater anrufen/);
  });

  test("lange Listen werden gekürzt", () => {
    const viele = anlaesse(Array.from({ length: 8 }, (_, i) => aufgabe(`v${i}`, "2026-11-12")), [], HEUTE, "Benedikt");
    const text = hinweisNachricht(viele, HEUTE, true);
    assert.equal(text.split("\n").filter((z) => z.startsWith("• Hallenneubau")).length, 5);
    assert.match(text, /• und 3 weitere/);
  });
});
