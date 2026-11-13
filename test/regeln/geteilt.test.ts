// Geteilte Abfragen (src/lib/geteilt.ts): Fragen mehrere Stellen der Oberfläche dieselbe Schnittstelle ab
// (die Sicherheitslage in der Hinweisleiste, in „Heute“ und in den Einstellungen), läuft nur eine Abfrage,
// im kürzesten gewünschten Takt, und alle sehen denselben Stand. Reine Regeln ohne Netz, mit gestellter Uhr.

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { abonniere, ladeNeu, setze, stand } from "../../src/lib/geteilt";

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
