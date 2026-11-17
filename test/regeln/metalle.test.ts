// Der Edelmetall-Agent (src/lib/metalle.ts): aus Tageskursen für Gold und Silber wird ein Lagebild mit Zahlen
// (Fakten) und einer Einordnung nach festen Regeln. Kein KI-Modell, keine Prognose. Die Zahlen in diesen Tests
// sind von Hand gerechnet.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { baueBericht, einordnung, fakten, HINWEIS, metallLage, metallSatz, METALLE, veraltet, type TagesKerze } from "../../src/lib/metalle";

const GOLD = METALLE[0];

// Eine Reihe von Handelstagen, die am 30. September 2026 endet; kurse[0] ist der älteste Tag.
function reihe(kurse: number[], spanne = 0.01): TagesKerze[] {
  const ende = Date.UTC(2026, 8, 30);
  return kurse.map((close, i) => {
    const tag = new Date(ende - (kurse.length - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { tag, open: close, high: close * (1 + spanne), low: close * (1 - spanne), close };
  });
}
const linie = (von: number, bis: number, n: number) => Array.from({ length: n }, (_, i) => von + ((bis - von) * i) / (n - 1));
const nah = (ist: number | null, soll: number, stellen = 6) => assert.ok(ist !== null && Math.abs(ist - soll) < 10 ** -stellen, `erwartet ${soll}, bekommen ${ist}`);

describe("Edelmetalle: die Lage eines Metalls aus Tageskursen", () => {
  test("Kurs, Datum und Veränderung zum Vortag, zur Vorwoche (5 Handelstage) und zum Vormonat (21 Handelstage)", () => {
    const kurse = [...Array(38).fill(100), ...linie(100, 110, 21), 121];
    const l = metallLage(GOLD, reihe(kurse))!;
    assert.equal(l.kurs, 121);
    assert.equal(l.kursVom, "2026-09-30");
    nah(l.aenderung.tag, 10);
    // Vor fünf Handelstagen stand der Kurs bei 108 (100 + 16 Schritte zu 0,5).
    nah(l.aenderung.woche, (121 / 108 - 1) * 100);
    nah(l.aenderung.monat, (121 / 100 - 1) * 100);
  });

  test("Hoch und Tief der letzten 21 Handelstage und der Abstand zum Hoch", () => {
    const kurse = [...Array(40).fill(100), 130, ...Array(18).fill(100), 110];
    const l = metallLage(GOLD, reihe(kurse, 0))!;
    assert.equal(l.hoch, 130);
    assert.equal(l.tief, 100);
    nah(l.abstandHochPct, (110 / 130 - 1) * 100);
  });

  test("ein Hoch, das älter als 21 Handelstage ist, zählt nicht mehr", () => {
    const kurse = [...Array(30).fill(100), 500, ...Array(29).fill(100)];
    assert.equal(metallLage(GOLD, reihe(kurse, 0))!.hoch, 100);
  });

  test("die Schwankung ist die mittlere Tagesspanne der letzten 14 Handelstage im Verhältnis zum Kurs", () => {
    // Jede Kerze reicht ein Prozent nach oben und nach unten: zwei Prozent Spanne.
    nah(metallLage(GOLD, reihe(Array(60).fill(200), 0.01))!.schwankungPct, 2);
  });

  test("Trend nach fester Regel: Kurs über dem 20-Tage-Schnitt und der über dem 50-Tage-Schnitt heißt aufwärts", () => {
    assert.equal(metallLage(GOLD, reihe(linie(100, 160, 60)))!.trend, "aufwaerts");
    assert.equal(metallLage(GOLD, reihe(linie(160, 100, 60)))!.trend, "abwaerts");
    assert.equal(metallLage(GOLD, reihe(Array(60).fill(100)))!.trend, "seitwaerts");
    // Lange gestiegen, zuletzt unter den 20-Tage-Schnitt gefallen: weder noch.
    assert.equal(metallLage(GOLD, reihe([...linie(100, 160, 59), 140]))!.trend, "seitwaerts");
    // Lange gefallen, zuletzt über den 20-Tage-Schnitt gesprungen: Der liegt noch unter dem 50-Tage-Schnitt, also weder noch.
    assert.equal(metallLage(GOLD, reihe([...linie(160, 100, 59), 150]))!.trend, "seitwaerts");
  });

  test("mit weniger als 50 Handelstagen gibt es keinen Trend, mit weniger als zwei keine Lage", () => {
    const l = metallLage(GOLD, reihe(linie(100, 120, 30)))!;
    assert.equal(l.trend, null);
    assert.equal(l.aenderung.monat !== null, true);
    assert.equal(metallLage(GOLD, reihe(linie(100, 104, 5)))!.aenderung.monat, null);
    assert.equal(metallLage(GOLD, reihe([100])), null);
    assert.equal(metallLage(GOLD, []), null);
  });

  test("unbrauchbare Kerzen (null, negativ, keine Zahl) werden übergangen", () => {
    const kerzen = reihe(Array(60).fill(100), 0);
    kerzen[58] = { ...kerzen[58], close: Number.NaN };
    kerzen[57] = { ...kerzen[57], close: -5 };
    const l = metallLage(GOLD, kerzen)!;
    assert.equal(l.kurs, 100);
    nah(l.aenderung.tag, 0);
  });
});

describe("Edelmetalle: der Bericht", () => {
  const gold = reihe(linie(3000, 4000, 60));
  const silber = reihe(linie(50, 40, 60));
  const now = new Date("2026-09-30T16:00:00Z");

  test("beide Metalle, das Verhältnis von Gold zu Silber, Quelle und Zeitpunkt", () => {
    const b = baueBericht({ gold, silber }, now);
    assert.deepEqual(b.metalle.map((m) => m.id), ["gold", "silber"]);
    nah(b.verhaeltnis, 100);
    assert.equal(b.erstelltAm, now.toISOString());
    assert.match(b.quelle, /Twelve Data/);
    assert.deepEqual(b.fehlend, []);
  });

  test("fehlt ein Metall, steht es unter „fehlend“, und es gibt kein Verhältnis", () => {
    const b = baueBericht({ gold }, now);
    assert.deepEqual(b.metalle.map((m) => m.id), ["gold"]);
    assert.deepEqual(b.fehlend, ["Silber"]);
    assert.equal(b.verhaeltnis, null);
  });

  test("Fakten sind Zahlen mit Datum; die Einordnung steht getrennt davon und nennt ihre Regel", () => {
    const b = baueBericht({ gold, silber }, now);
    const f = fakten(b);
    assert.equal(f.length, 3);
    assert.match(f[0], /^Gold: 4\.000,00 \$ je Feinunze \(Kurs vom 30\.09\.2026\)/);
    assert.match(f[0], /zum Vortag/);
    assert.match(f[1], /^Silber: 40,00 \$/);
    assert.match(f[2], /^Eine Unze Gold kostet so viel wie 100 Unzen Silber\./);
    const e = einordnung(b);
    assert.match(e[0], /^Gold: Aufwärtstrend/);
    assert.match(e[0], /Schnitt der letzten 20 Handelstage/);
    assert.match(e[1], /^Silber: Abwärtstrend/);
    // Keine Zahl aus den Fakten wird in der Einordnung zur Vorhersage.
    for (const satz of e) assert.doesNotMatch(satz, /wird steigen|wird fallen|Kursziel|kaufen|verkaufen/i);
    assert.match(HINWEIS, /keine Prognose/);
    assert.match(HINWEIS, /keine Anlageberatung/);
  });

  test("ohne Trend sagt die Einordnung, dass die Kurse dafür nicht reichen", () => {
    const b = baueBericht({ gold: reihe(linie(3000, 3100, 30)) }, now);
    assert.match(einordnung(b)[0], /^Gold: Für einen Trend reichen die Kurse noch nicht/);
  });

  test("ein Satz für die Agentensteuerung", () => {
    const b = baueBericht({ gold, silber }, now);
    assert.match(metallSatz(b), /^Gold 4\.000,00 \$ \(\+0,4 % zum Vortag\), Silber 40,00 \$ \(−0,4 % zum Vortag\)\.$/);
    assert.equal(metallSatz(baueBericht({}, now)), "Keine Kurse bekommen.");
  });

  test("veraltet ist ein Bericht, dessen jüngster Kurs älter als vier Tage ist (ein langes Wochenende zählt nicht)", () => {
    const b = baueBericht({ gold, silber }, now);
    assert.equal(veraltet(b, new Date("2026-10-04T12:00:00Z")), false);
    assert.equal(veraltet(b, new Date("2026-10-05T12:00:00Z")), true);
    assert.equal(veraltet(baueBericht({}, now), now), true);
  });
});

describe("Edelmetalle: ein Fonds als Ersatz, wenn der Kurs je Feinunze fehlt", () => {
  const gold = reihe(linie(3000, 4000, 60));
  const slv = reihe(linie(50, 44, 60));
  const now = new Date("2026-09-30T16:00:00Z");

  test("der Fonds steht mit eigenem Namen und „je Anteil“ da, nie als Kurs je Feinunze", () => {
    const b = baueBericht({ gold }, now, { silber: slv });
    assert.deepEqual(b.metalle.map((m) => [m.id, m.art, m.bezeichnung, m.einheit]), [
      ["gold", "spot", "Gold", "Feinunze"],
      ["silber", "fonds", "Silber-Fonds SLV", "Anteil"],
    ]);
    assert.deepEqual(b.fehlend, []);
    const f = fakten(b);
    assert.match(f[1], /^Silber-Fonds SLV: 44,00 \$ je Anteil \(Kurs vom 30\.09\.2026\)/);
    assert.doesNotMatch(f[1], /Feinunze/);
    assert.ok(f.includes("Silber: Den Kurs je Feinunze liefert dein Plan bei Twelve Data nicht. Stattdessen steht hier der Silber-Fonds SLV, der dem Silberpreis folgt; sein Kurs gilt je Anteil."));
    assert.match(einordnung(b)[1], /^Silber-Fonds SLV: Abwärtstrend/);
    assert.match(metallSatz(b), /Silber-Fonds SLV 44,00 \$/);
  });

  test("das Verhältnis von Gold zu Silber gibt es nur aus zwei Kursen je Feinunze", () => {
    assert.equal(baueBericht({ gold }, now, { silber: slv }).verhaeltnis, null);
    assert.equal(baueBericht({ silber: reihe(linie(50, 40, 60)) }, now, { gold: reihe(linie(300, 380, 60)) }).verhaeltnis, null, "auch nicht mit Gold als Fonds");
    assert.ok(!fakten(baueBericht({ gold }, now, { silber: slv })).some((satz) => /Unzen Silber/.test(satz)));
  });

  test("der Kurs je Feinunze geht vor; ist auch der Fonds leer, fehlt das Metall", () => {
    const silber = reihe(linie(50, 40, 60));
    assert.equal(baueBericht({ gold, silber }, now, { silber: slv }).metalle[1].art, "spot");
    assert.deepEqual(baueBericht({ gold }, now, { silber: [] }).fehlend, ["Silber"]);
  });
});
