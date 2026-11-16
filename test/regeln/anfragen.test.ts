// Anfragen an JARVIS (src/lib/api.ts), wenn er nicht antwortet. Der Browser wirft dann einen Fehler in seiner
// eigenen Sprache („Failed to fetch“, in Safari „Load failed“). Den zeigte bisher jede Stelle so an, und im Gespräch
// las JARVIS ihn vor. Außerdem meldet jede Anfrage, ob eine Antwort kam (verbindung.ts): Daraus wird der Hinweis
// oben in jeder Ansicht. Ohne Netz: fetch ist gestellt, die Uhr auch.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { ApiError, frage, getJson, NICHT_ERREICHBAR, postJson, postStream } from "../../src/lib/api";
import { meldeAntwort, VERBUNDEN, verbindungJetzt } from "../../src/lib/verbindung";

// So oft kommen die schnellsten Abfragen der Seite. Scheitern zwei davon nacheinander, antwortet JARVIS nicht.
const TAKT = 10_000;

const START = new Date(2026, 10, 16, 12, 8).getTime();
type Antwort = (url: string, init?: RequestInit) => Promise<Response>;
let antworte: Antwort = async () => Response.json({});
const WEG: Antwort = async () => {
  throw new TypeError("Failed to fetch");
};

beforeEach(() => {
  mock.timers.enable({ apis: ["Date"], now: START });
  mock.method(globalThis, "fetch", (url: string, init?: RequestInit) => antworte(url, init));
  antworte = async () => Response.json({});
  // Jede Prüfung beginnt mit einer Antwort, damit nichts aus der Prüfung davor nachwirkt.
  meldeAntwort();
});
afterEach(() => {
  mock.restoreAll();
  mock.timers.reset();
});

const istNichtErreichbar = (e: unknown) => {
  assert.ok(e instanceof ApiError);
  assert.equal(e.message, NICHT_ERREICHBAR);
  assert.equal(e.status, 0);
  return true;
};
// Liest eine Antwort, die Stück für Stück kommt, bis zum Ende.
const liesAlles = async (signal?: AbortSignal) => {
  const zeilen: unknown[] = [];
  for await (const z of postStream("/x", {}, signal)) zeilen.push(z);
  return zeilen;
};

describe("Anfragen an JARVIS, wenn er nicht antwortet", () => {
  test("aus dem Fehler des Browsers wird ein Satz, den jede Stelle so zeigen kann; der Fehler selbst bleibt zum Nachsehen dabei", async () => {
    antworte = WEG;
    for (const anfrage of [() => getJson("/x"), () => postJson("/x", {}), () => liesAlles()]) {
      await assert.rejects(anfrage, (e: unknown) => {
        istNichtErreichbar(e);
        assert.ok((e as ApiError).cause instanceof TypeError);
        assert.equal(((e as ApiError).cause as TypeError).message, "Failed to fetch");
        return true;
      });
    }
    assert.match(NICHT_ERREICHBAR, /^JARVIS antwortet gerade nicht\./);
    assert.doesNotMatch(NICHT_ERREICHBAR, /fetch|failed/i);
  });

  test("ein Abbruch von außen (Frist, „Stopp“) bleibt ein Abbruch und sagt nichts über JARVIS", async () => {
    const abbruch = new AbortController();
    abbruch.abort();
    antworte = async (_url, init) => {
      if (init?.signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
      return Response.json({});
    };
    const istAbbruch = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
    for (let i = 0; i < 3; i++) {
      await assert.rejects(() => getJson("/x", abbruch.signal), istAbbruch);
      await assert.rejects(() => liesAlles(abbruch.signal), istAbbruch);
      mock.timers.tick(TAKT);
    }
    assert.equal(verbindungJetzt(), VERBUNDEN);
  });

  test("antwortet JARVIS mit einem Fehler, steht dessen Satz da", async () => {
    antworte = async () => Response.json({ error: "Diese Aufgabe gibt es nicht mehr." }, { status: 409 });
    await assert.rejects(() => postJson("/x", {}), (e: unknown) => e instanceof ApiError && e.status === 409 && e.message === "Diese Aufgabe gibt es nicht mehr.");
    antworte = async () => new Response("kaputt", { status: 500 });
    await assert.rejects(() => getJson("/x"), (e: unknown) => e instanceof ApiError && e.status === 500 && e.message === "Der Server antwortet mit 500.");
  });

  test("reißt eine Antwort mittendrin ab (JARVIS wird beendet, während er schreibt), gilt derselbe Satz", async () => {
    const abgerissen = (): Response =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(new TextEncoder().encode('{"n":1}\n{"n":'));
          },
          pull(c) {
            c.error(new TypeError("network error"));
          },
        }),
      );
    antworte = async () => abgerissen();
    const zeilen: unknown[] = [];
    await assert.rejects(async () => {
      for await (const z of postStream("/x", {})) zeilen.push(z);
    }, istNichtErreichbar);
    assert.deepEqual(zeilen, [{ n: 1 }], "was schon ganz da war, ist angekommen");
    // Hat jemand „Stopp“ gesagt, ist es ein Abbruch und kein Ausfall.
    const abbruch = new AbortController();
    antworte = async () => {
      abbruch.abort();
      return abgerissen();
    };
    await assert.rejects(() => liesAlles(abbruch.signal), (e: unknown) => !(e instanceof ApiError));
  });

  test("ein Abriss mittendrin zählt als „keine Antwort“, ein „Stopp“ nicht", async () => {
    const abgerissen = (): Response =>
      new Response(
        new ReadableStream<Uint8Array>({
          pull(c) {
            c.error(new TypeError("network error"));
          },
        }),
      );
    const abbruch = new AbortController();
    antworte = async () => {
      abbruch.abort();
      return abgerissen();
    };
    for (let i = 0; i < 2; i++) {
      await assert.rejects(() => liesAlles(abbruch.signal));
      mock.timers.tick(TAKT);
    }
    assert.equal(verbindungJetzt(), VERBUNDEN, "zweimal „Stopp“");
    // Der Anfang der Antwort kam an (das ist eine Antwort); dann reißt sie ab: der erste Fehlschlag. Scheitert
    // zwölf Sekunden später die nächste Anfrage, antwortet JARVIS nicht.
    antworte = async () => abgerissen();
    await assert.rejects(() => liesAlles(), istNichtErreichbar);
    assert.equal(verbindungJetzt(), VERBUNDEN, "ein Abriss ist ein Stolperer");
    antworte = WEG;
    mock.timers.tick(12_000);
    await assert.rejects(() => getJson("/x"), istNichtErreichbar);
    assert.deepEqual(verbindungJetzt(), { aus: true, seit: START + 2 * TAKT });
  });

  test("eine ganze Antwort in Stücken kommt Zeile für Zeile an", async () => {
    antworte = async () => new Response('{"n":1}\n\n{"n":2}\n{"n":3}');
    assert.deepEqual(await liesAlles(), [{ n: 1 }, { n: 2 }, { n: 3 }]);
  });
});

describe("Jede Anfrage meldet, ob JARVIS geantwortet hat", () => {
  const scheitere = (anfrage: () => Promise<unknown>) => assert.rejects(anfrage);

  test("scheitern zwei Abfragen im Takt nacheinander, antwortet JARVIS nicht; die nächste Antwort beendet das", async () => {
    antworte = WEG;
    mock.timers.tick(60_000);
    await scheitere(() => getJson("/x"));
    await scheitere(() => getJson("/x"));
    assert.equal(verbindungJetzt(), VERBUNDEN, "zweimal im selben Augenblick ist ein Stolperer");
    mock.timers.tick(TAKT);
    await scheitere(() => getJson("/x"));
    assert.deepEqual(verbindungJetzt(), { aus: true, seit: START });
    antworte = async () => Response.json({ ok: true });
    await getJson("/x");
    assert.equal(verbindungJetzt(), VERBUNDEN);
  });

  test("auch Änderungen und das Gespräch zählen: Ein Klick, der ankommt, beendet den Hinweis sofort", async () => {
    antworte = WEG;
    mock.timers.tick(TAKT);
    await scheitere(() => postJson("/x", {}));
    mock.timers.tick(TAKT);
    await scheitere(() => liesAlles());
    assert.equal(verbindungJetzt().aus, true, "ein Klick und eine Frage ohne Antwort");
    antworte = async () => Response.json({ ok: true });
    await postJson("/x", {});
    assert.equal(verbindungJetzt(), VERBUNDEN);
    antworte = WEG;
    mock.timers.tick(TAKT);
    await scheitere(() => getJson("/x"));
    mock.timers.tick(TAKT);
    await scheitere(() => getJson("/x"));
    assert.equal(verbindungJetzt().aus, true);
    antworte = async () => new Response('{"n":1}\n');
    assert.deepEqual(await liesAlles(), [{ n: 1 }]);
    assert.equal(verbindungJetzt(), VERBUNDEN);
  });

  test("eine Antwort mit Fehler ist auch eine Antwort", async () => {
    antworte = WEG;
    mock.timers.tick(TAKT);
    await scheitere(() => getJson("/x"));
    mock.timers.tick(TAKT);
    await scheitere(() => getJson("/x"));
    assert.equal(verbindungJetzt().aus, true);
    antworte = async () => Response.json({ error: "Diese Aufgabe gibt es nicht mehr." }, { status: 409 });
    await scheitere(() => postJson("/x", {}));
    assert.equal(verbindungJetzt(), VERBUNDEN);
    // Auch viele Fehler in Folge machen keinen Ausfall.
    antworte = async () => new Response("kaputt", { status: 500 });
    for (let i = 0; i < 4; i++) {
      mock.timers.tick(TAKT);
      await scheitere(() => getJson("/x"));
    }
    assert.equal(verbindungJetzt(), VERBUNDEN);
  });

  test("auch „502“ ist eine Antwort: JARVIS sagt das selbst, wenn etwa das Postfach nicht erreichbar ist", async () => {
    for (const status of [500, 502, 503, 504]) {
      antworte = WEG;
      mock.timers.tick(TAKT);
      await scheitere(() => getJson("/x"));
      mock.timers.tick(TAKT);
      await scheitere(() => getJson("/x"));
      assert.equal(verbindungJetzt().aus, true);
      antworte = async () => Response.json({ error: "Das Postfach antwortet gerade nicht." }, { status });
      await assert.rejects(() => getJson("/x"), (e: unknown) => e instanceof ApiError && e.status === status && e.message === "Das Postfach antwortet gerade nicht.");
      assert.equal(verbindungJetzt(), VERBUNDEN, String(status));
      for (let i = 0; i < 3; i++) {
        mock.timers.tick(TAKT);
        await scheitere(() => postJson("/x", {}));
      }
      assert.equal(verbindungJetzt(), VERBUNDEN, String(status));
    }
  });

  test("auch eine Anfrage außerhalb der drei Wege (die Probe der Stimme) meldet sich über frage", async () => {
    antworte = WEG;
    mock.timers.tick(TAKT);
    await assert.rejects(() => frage("/api/stimme", { method: "POST" }), istNichtErreichbar);
    mock.timers.tick(TAKT);
    await assert.rejects(() => frage("/api/stimme", { method: "POST" }), istNichtErreichbar);
    assert.equal(verbindungJetzt().aus, true);
  });

  test("die Seite fragt JARVIS nur über frage: Sonst erführe der Hinweis oben nichts von dieser Stelle", () => {
    // Alles, was im Browser läuft: die Bausteine und die Dateien mit „use client“. Die Schnittstellen und der Server
    // (src/app/api, src/lib/server) fragen andere Dienste und gehören nicht dazu.
    const dateien = (readdirSync("src", { recursive: true }) as string[])
      .map((d) => path.join("src", d))
      .filter((d) => /\.tsx?$/.test(d) && !d.startsWith(path.join("src", "app", "api")) && !d.startsWith(path.join("src", "lib", "server")));
    const imBrowser = dateien.filter((d) => d.endsWith(".tsx") || /^["']use client["']/.test(readFileSync(d, "utf8")));
    assert.ok(imBrowser.includes(path.join("src", "lib", "useVoice.ts")) && imBrowser.includes(path.join("src", "components", "CloudVoiceSetup.tsx")), "die Suche findet die Dateien der Seite");
    const direkt = imBrowser.filter((d) => /(?<![\w.])fetch\(/.test(readFileSync(d, "utf8")));
    assert.deepEqual(direkt, [path.join("src", "lib", "api.ts")]);
  });
});
