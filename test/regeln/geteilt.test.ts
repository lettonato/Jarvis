// Geteilte Abfragen (src/lib/geteilt.ts): Fragen mehrere Stellen der Oberfläche dieselbe Schnittstelle ab
// (die Sicherheitslage in der Hinweisleiste, in „Heute“ und in den Einstellungen), läuft nur eine Abfrage,
// im kürzesten gewünschten Takt, und alle sehen denselben Stand. Reine Regeln ohne Netz, mit gestellter Uhr.

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { abonniere, bild, gescheitert, ladeNeu, setze, stand } from "../../src/lib/geteilt";

let abrufe: string[] = [];
let antwort: unknown = { n: 1 };
let kaputt = false;
const lade = async (url: string) => {
  abrufe.push(url);
  if (kaputt) throw new Error("nicht erreichbar");
  return structuredClone(antwort);
};
// Lässt die Uhr laufen und wartet, bis angestoßene Abfragen fertig sind.
const vor = async (ms: number) => {
  mock.timers.tick(ms);
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  abrufe = [];
  antwort = { n: 1 };
  kaputt = false;
});
afterEach(() => mock.timers.reset());

describe("Geteilte Abfrage", () => {
  test("zwei Stellen, eine Abfrage: sofort einmal, danach im kürzeren Takt", async () => {
    const ab1 = abonniere("/a", 4_000, () => {}, lade);
    const ab2 = abonniere("/a", 10_000, () => {}, lade);
    await vor(0);
    assert.equal(abrufe.length, 1, "der zweite Abonnent löst keine eigene Abfrage aus");
    await vor(12_000);
    assert.equal(abrufe.length, 4, "alle 4 Sekunden, nicht zusätzlich alle 10");
    ab1();
    ab2();
  });

  test("alle sehen denselben Stand und erfahren von Änderungen, aber nicht von gleichen Antworten", async () => {
    let a = 0;
    let b = 0;
    const ab1 = abonniere("/b", 1_000, () => a++, lade);
    const ab2 = abonniere("/b", 1_000, () => b++, lade);
    await vor(0);
    assert.deepEqual([a, b], [1, 1]);
    assert.deepEqual(stand("/b"), { n: 1 });
    await vor(1_000);
    assert.deepEqual([a, b], [1, 1], "gleiche Antwort: niemand zeichnet neu");
    antwort = { n: 2 };
    await vor(1_000);
    assert.deepEqual([a, b], [2, 2]);
    assert.deepEqual(stand("/b"), { n: 2 });
    ab1();
    ab2();
  });

  test("setzt eine Stelle den Stand (nach einem Klick), sehen ihn alle sofort", async () => {
    let b = 0;
    const ab1 = abonniere("/c", 1_000, () => {}, lade);
    const ab2 = abonniere("/c", 1_000, () => b++, lade);
    await vor(0);
    setze("/c", { n: 99 });
    assert.deepEqual(stand("/c"), { n: 99 });
    assert.equal(b, 2);
    ab1();
    ab2();
  });

  test("geht die schnelle Stelle, gilt der Takt der übrigen; geht die letzte, hört die Abfrage auf und der Stand ist vergessen", async () => {
    const schnell = abonniere("/d", 1_000, () => {}, lade);
    const langsam = abonniere("/d", 5_000, () => {}, lade);
    await vor(0);
    schnell();
    abrufe = [];
    await vor(10_000);
    assert.equal(abrufe.length, 2);
    langsam();
    abrufe = [];
    await vor(20_000);
    assert.equal(abrufe.length, 0);
    assert.equal(stand("/d"), null, "wer später wiederkommt, beginnt frisch");
    const neu = abonniere("/d", 1_000, () => {}, lade);
    await vor(0);
    assert.equal(abrufe.length, 1);
    neu();
  });

  test("ein Fehler lässt den letzten Stand stehen; die nächste Abfrage versucht es wieder", async () => {
    const ab = abonniere("/e", 1_000, () => {}, lade);
    await vor(0);
    kaputt = true;
    await vor(1_000);
    assert.deepEqual(stand("/e"), { n: 1 });
    kaputt = false;
    antwort = { n: 3 };
    await vor(1_000);
    assert.deepEqual(stand("/e"), { n: 3 });
    ab();
  });

  test("antwortet die Schnittstelle von Anfang an nicht, ist das bekannt und nicht bloß „lädt noch“", async () => {
    kaputt = true;
    let meldungen = 0;
    const ab = abonniere("/f", 4_000, () => meldungen++, lade);
    assert.equal(gescheitert("/f"), false, "vor der ersten Antwort lädt sie noch");
    await vor(0);
    assert.equal(stand("/f"), null);
    assert.equal(gescheitert("/f"), true);
    assert.equal(meldungen, 1, "die Stellen erfahren davon");
    await vor(4_000);
    assert.equal(meldungen, 1, "ein weiterer Fehlschlag ist nichts Neues");
    // Sobald sie antwortet, ist der Stand da.
    kaputt = false;
    await vor(4_000);
    assert.deepEqual(stand("/f"), { n: 1 });
    assert.equal(gescheitert("/f"), false);
    // Fällt sie später aus, bleibt der letzte Stand stehen; das ist kein „nie geladen“.
    kaputt = true;
    await vor(4_000);
    assert.deepEqual(stand("/f"), { n: 1 });
    assert.equal(gescheitert("/f"), false);
    ab();
    assert.equal(gescheitert("/f"), false, "ohne Abonnenten ist nichts gemerkt");
  });

  test("solange noch nie etwas kam, wartet der nächste Versuch nicht den ganzen Takt: nach 5, dann 15, dann 45 Sekunden", async () => {
    kaputt = true;
    const ab = abonniere("/versuche", 300_000, () => {}, lade);
    await vor(0);
    assert.equal(abrufe.length, 1);
    await vor(4_999);
    assert.equal(abrufe.length, 1);
    await vor(1);
    assert.equal(abrufe.length, 2, "nach 5 Sekunden");
    await vor(15_000);
    assert.equal(abrufe.length, 3, "dann nach 15");
    await vor(44_999);
    assert.equal(abrufe.length, 3);
    // Antwortet sie jetzt, ist der Stand nach 65 Sekunden da und nicht erst nach fünf Minuten.
    kaputt = false;
    await vor(1);
    assert.equal(abrufe.length, 4, "dann nach 45");
    assert.deepEqual(stand("/versuche"), { n: 1 });
    assert.equal(gescheitert("/versuche"), false);
    // Danach gilt wieder nur der Takt, auch wenn sie später ausfällt (der Stand bleibt dann stehen).
    kaputt = true;
    await vor(234_999);
    assert.equal(abrufe.length, 4, "bis zum Takt (fünf Minuten nach dem Anmelden) kein weiterer Versuch");
    await vor(1);
    assert.equal(abrufe.length, 5);
    await vor(60_000);
    assert.equal(abrufe.length, 5, "ein Ausfall mit vorhandenem Stand löst keine schnellen Versuche aus");
    ab();
  });

  test("die schnellen Versuche werden nie dichter als der Takt und enden mit der letzten Stelle", async () => {
    kaputt = true;
    const ab = abonniere("/dicht", 4_000, () => {}, lade);
    await vor(0);
    await vor(12_000);
    // Takt 4 s: Der erste schnelle Versuch käme nach 5 s, also später als der Takt ohnehin fragt. Es bleibt bei
    // 0, 4, 8 und 12 Sekunden.
    assert.equal(abrufe.length, 4);
    ab();
    // Mit langem Takt steht ein schneller Versuch aus; geht die letzte Stelle, findet er nicht mehr statt.
    const ab2 = abonniere("/dicht", 300_000, () => {}, lade);
    await vor(0);
    assert.equal(abrufe.length, 5);
    ab2();
    await vor(120_000);
    assert.equal(abrufe.length, 5, "ohne Abonnenten kein Versuch mehr");
  });

  test("Stand und Ausfall kommen als ein Bild, das dasselbe bleibt, solange sich nichts ändert", async () => {
    const leer = bild("/bild");
    assert.deepEqual(leer, { stand: null, gescheitert: false });
    assert.equal(bild("/gibt-es-nicht"), leer, "ohne Abfrage immer dasselbe leere Bild");
    let meldungen = 0;
    const ab = abonniere("/bild", 4_000, () => meldungen++, lade);
    await vor(0);
    const erstes = bild("/bild");
    assert.deepEqual(erstes, { stand: { n: 1 }, gescheitert: false });
    await vor(4_000);
    assert.equal(bild("/bild"), erstes, "gleiche Antwort: dasselbe Bild (sonst zeichnete React endlos neu)");
    antwort = { n: 2 };
    await vor(4_000);
    assert.notEqual(bild("/bild"), erstes);
    assert.deepEqual(bild("/bild"), { stand: { n: 2 }, gescheitert: false });
    setze("/bild", { n: 9 });
    assert.deepEqual(bild("/bild"), { stand: { n: 9 }, gescheitert: false });
    ab();
    assert.equal(bild("/bild"), leer);
    // Von Anfang an nicht erreichbar: Das Bild sagt es.
    kaputt = true;
    const ab2 = abonniere("/bild", 4_000, () => {}, lade);
    await vor(0);
    assert.deepEqual(bild("/bild"), { stand: null, gescheitert: true });
    ab2();
  });

  test("eine Abfrage, die schon unterwegs war, überschreibt keinen neueren Stand", async () => {
    // Die Abfrage startet, dann setzt ein Klick den Stand, erst danach kommt die alte Antwort an.
    let antworte: (wert: unknown) => void = () => {};
    const langsam = () => new Promise<unknown>((resolve) => (antworte = resolve));
    let n = 0;
    const ab = abonniere("/g", 1_000, () => n++, langsam);
    await vor(0);
    setze("/g", { freigaben: [] });
    antworte({ freigaben: ["alt"] });
    await vor(0);
    assert.deepEqual(stand("/g"), { freigaben: [] }, "die Freigabe taucht nicht wieder auf");
    assert.equal(n, 1);
    ab();
  });

  test("zwei Abfragen zugleich: die später gestartete gilt, auch wenn die frühere zuletzt ankommt", async () => {
    const offen: ((wert: unknown) => void)[] = [];
    const ab = abonniere("/h", 60_000, () => {}, () => new Promise<unknown>((resolve) => offen.push(resolve)));
    await vor(0);
    void ladeNeu("/h");
    await vor(0);
    assert.equal(offen.length, 2);
    offen[1]({ n: "neu" });
    await vor(0);
    offen[0]({ n: "alt" });
    await vor(0);
    assert.deepEqual(stand("/h"), { n: "neu" });
    ab();
  });

  test("schnelles Ab- und wieder Anmelden (wie beim Neuaufbau einer Ansicht) löst nur eine Abfrage aus", async () => {
    const ab1 = abonniere("/i", 1_000, () => {}, lade);
    ab1();
    const ab2 = abonniere("/i", 1_000, () => {}, lade);
    await vor(0);
    assert.equal(abrufe.length, 1);
    ab2();
  });

  test("sofort neu laden geht jederzeit, auch mit Zusatz an der Adresse", async () => {
    const ab = abonniere("/f", 60_000, () => {}, lade);
    await vor(0);
    antwort = { n: 5 };
    await ladeNeu("/f", "?frisch=1");
    assert.equal(abrufe.at(-1), "/f?frisch=1");
    assert.deepEqual(stand("/f"), { n: 5 });
    ab();
  });
});
