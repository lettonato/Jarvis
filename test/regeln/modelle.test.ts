// Die eine Stelle für Modellwahl und Preise (src/lib/modelle.ts). Geprüft wird: Jede Rolle hat ein Modell mit
// bekanntem Preis, und die Kosten einer Anfrage werden so gerechnet, wie Anthropic sie nach Listenpreis abrechnet
// (Stand der Preise: siehe PREISE_STAND). Die Zahlen hier stammen aus der Preisliste, nicht aus dem Programm.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { kostenVon, MODELLE, modellName, preisBekannt, verbrauchVon, WEBSUCHE_USD, type Verbrauch } from "../../src/lib/modelle";

const nah = (ist: number, soll: number, text?: string) => assert.ok(Math.abs(ist - soll) < 1e-9, `${text ?? ""} erwartet ${soll}, bekommen ${ist}`);
const OPUS = "claude-opus-5-5";
const HAIKU = "claude-haiku-5-5";

describe("Modellwahl an einer Stelle", () => {
  test("jede Rolle hat ein Modell mit Namen und bekanntem Preis", () => {
    assert.deepEqual(Object.keys(MODELLE).sort(), ["analyst", "browser", "chief", "gespraech"]);
    for (const [rolle, m] of Object.entries(MODELLE)) {
      assert.match(m.id, /^claude-/, rolle);
      assert.ok(m.name.startsWith("Claude "), rolle);
      assert.equal(m.name, modellName(m.id), "der Name kommt aus derselben Tabelle wie der Preis");
      assert.ok(preisBekannt(m.id), `für ${m.id} steht ein Preis in der Tabelle`);
    }
  });

  test("die Wahl ist unverändert: Gespräch, Browser und Analyst mit Opus 5.5, der Chief mit Haiku 5.5", () => {
    assert.deepEqual([MODELLE.gespraech.id, MODELLE.browser.id, MODELLE.analyst.id, MODELLE.chief.id], [OPUS, OPUS, OPUS, HAIKU]);
    assert.equal(modellName(OPUS), "Claude Opus 5.5");
    assert.equal(modellName("claude-unbekannt-9"), "claude-unbekannt-9");
  });
});

describe("Kosten einer Anfrage nach Listenpreis", () => {
  test("Opus 5.5: 4 Dollar je Million Eingabe, 20 je Million Ausgabe", () => {
    nah(kostenVon(OPUS, { input_tokens: 1_000_000, output_tokens: 1_000_000 }), 24);
    nah(kostenVon(OPUS, { input_tokens: 10, output_tokens: 5 }), 0.00014);
  });

  test("Zwischenspeicher: Lesen 0,20, Schreiben 5 (fünf Minuten) oder 8 (eine Stunde) je Million", () => {
    nah(kostenVon(OPUS, { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 }), 0.2);
    nah(kostenVon(OPUS, { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000 }), 5, "ohne Aufteilung gilt der Fünf-Minuten-Preis");
    const geteilt: Verbrauch = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1_000_000, cache_creation: { ephemeral_5m_input_tokens: 400_000, ephemeral_1h_input_tokens: 600_000 } };
    nah(kostenVon(OPUS, geteilt), 0.4 * 5 + 0.6 * 8);
  });

  test("eine Websuche kostet einen Cent, zusätzlich zu den Token", () => {
    assert.equal(WEBSUCHE_USD, 0.01);
    nah(kostenVon(OPUS, { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 3 } }), 0.03);
  });

  test("Haiku 5.5: bis 100.000 Token Prompt der kleine Preis, darüber der große, je Anfrage", () => {
    nah(kostenVon(HAIKU, { input_tokens: 50_000, output_tokens: 1_000 }), 0.005 + 0.0005);
    nah(kostenVon(HAIKU, { input_tokens: 100_000, output_tokens: 0 }), 0.01, "genau 100.000 zählt noch klein");
    // Zum Prompt zählen auch gelesene und geschriebene Zwischenspeicher-Token.
    const gross: Verbrauch = { input_tokens: 60_000, output_tokens: 1_000, cache_read_input_tokens: 50_000 };
    nah(kostenVon(HAIKU, gross), (60_000 * 0.5 + 50_000 * 0.05 + 1_000 * 2.5) / 1e6);
  });

  test("ohne Verbrauch kostet es nichts", () => {
    assert.equal(kostenVon(OPUS, undefined), 0);
    assert.equal(kostenVon(OPUS, null), 0);
  });

  test("hat ein anderes Modell geantwortet, gilt dessen Preis; ein unbekanntes wird wie das angefragte gerechnet", () => {
    const u: Verbrauch = { input_tokens: 1_000_000, output_tokens: 0 };
    nah(kostenVon(OPUS, u, "claude-opus-4-8"), 5);
    nah(kostenVon(OPUS, u, "claude-opus-4-8-20260301"), 5, "auch mit Datum am Namen");
    nah(kostenVon(OPUS, u, "claude-etwas-neues"), 4);
    // Nur ein angehängtes Datum zählt als derselbe Name: Ein Modell „5-2“ ist nicht „5“ mit Anhang.
    nah(kostenVon(OPUS, u, "claude-opus-5-2"), 4);
    nah(kostenVon(OPUS, u, "claude-opus-5-20260101"), 5);
    assert.equal(preisBekannt("claude-opus-5-25"), false);
  });

  test("Ausweichmodell nach einer Ablehnung: jeder Versuch mit Ausgabe zählt zum Preis seines Modells", () => {
    const u: Verbrauch = {
      // Die Zahlen ganz oben beschreiben dann nur den letzten Versuch; maßgeblich sind die einzelnen Versuche.
      input_tokens: 1_000,
      output_tokens: 500,
      server_tool_use: { web_search_requests: 1 },
      iterations: [
        { type: "message", model: OPUS, input_tokens: 1_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        { type: "message", model: OPUS, input_tokens: 2_000, output_tokens: 100, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        { type: "fallback_message", model: "claude-opus-4-8", input_tokens: 1_000, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      ],
    };
    // Der erste Versuch brach ohne Ausgabe ab und wird in den üblichen Fällen nicht berechnet.
    const soll = (2_000 * 4 + 100 * 20) / 1e6 + (1_000 * 5 + 500 * 25) / 1e6 + 0.01;
    nah(kostenVon(OPUS, u, "claude-opus-4-8"), soll);
  });

  test("Versuche ohne Ausweichmodell ändern nichts: dann gilt die Summe ganz oben", () => {
    const u: Verbrauch = { input_tokens: 3_000, output_tokens: 600, iterations: [{ type: "message", model: OPUS, input_tokens: 1_000, output_tokens: 200 }] };
    nah(kostenVon(OPUS, u), (3_000 * 4 + 600 * 20) / 1e6);
  });
});

describe("Verbrauch in Zahlen für das Kostenbuch", () => {
  test("Eingabe zählt alles, was als Prompt ging; dazu Ausgabe und Suchen", () => {
    assert.deepEqual(verbrauchVon({ input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 20, server_tool_use: { web_search_requests: 2 } }), { eingabe: 130, ausgabe: 5, suchen: 2 });
    assert.deepEqual(verbrauchVon(undefined), { eingabe: 0, ausgabe: 0, suchen: 0 });
  });
});
