// Intel (Nachrichten über Grok) gegen einen nachgebauten xAI-Server. Geprüft werden die Kostenbremse, die
// Warnung an den Desk, die Bereinigung dessen, was Grok liefert, und dass Sperren und Not-Aus greifen.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteXaiMock, type XaiMock } from "../mocks/xai-mock";

sichereUmgebung("intel");

let xai: XaiMock;
let intel: typeof import("../../src/lib/server/intel");
let config: typeof import("../../src/lib/server/config");
let zustand: typeof import("../../src/lib/server/gateway/zustand");
let notify: typeof import("../../src/lib/server/notify");
let kosten: typeof import("../../src/lib/server/kosten");

const KEY = ["xai", "test", "nur", "fuer", "den", "mock"].join("-");
const tag = (n: number, stunde = 10) => new Date(2026, 10, n, stunde, 0, 0);
const meldung = (titel: string, extra: Record<string, unknown> = {}) => ({ titel, zusammenfassung: "Kurz.", thema: "Bitcoin", quelle: "Testblatt", url: "https://example.com/a", wichtigkeit: 0.5, wirkung: "neutral", von_x: false, ...extra });
const lagebild = (extra: Record<string, unknown> = {}) => ({ stimmung: "ruhig", lage: "Ruhiger Tag.", meldungen: [meldung("Eins")], desk_warnung: { aktiv: false, grund: "" }, ...extra });

before(async () => {
  xai = await starteXaiMock();
  process.env.XAI_BASE_URL = xai.url;
  config = await import("../../src/lib/server/config");
  intel = await import("../../src/lib/server/intel");
  zustand = await import("../../src/lib/server/gateway/zustand");
  notify = await import("../../src/lib/server/notify");
  kosten = await import("../../src/lib/server/kosten");
});

after(async () => {
  await xai.stop();
});

describe("Intel: Voraussetzungen", () => {
  test("ohne Schlüssel keine Anfrage", async () => {
    await config.writeConfig({ name: "Benedikt" });
    xai.naechste([]);
    await assert.rejects(intel.refreshIntel(null, { wait: true, now: tag(1) }), /xAI-Schlüssel/);
    assert.equal(xai.anfragen.length, 0);
    assert.equal((await intel.intelSnapshot(tag(1))).configured, false);
  });

  test("gesperrt oder im Not-Aus: keine Anfrage, keine Kosten", async () => {
    await config.writeConfig({ name: "Benedikt", xai: { apiKey: KEY }, intel: { budgetUsd: 5 } });
    xai.naechste([{ antwort: lagebild() }]);
    await zustand.sperreAgent("intel", "Test", "mac");
    await assert.rejects(intel.refreshIntel(null, { wait: true, now: tag(1) }), intel.IntelError);
    await zustand.entsperreAgent("intel", "mac");
    await zustand.notausAn("Test", "mac");
    await assert.rejects(intel.refreshIntel(null, { wait: true, now: tag(1) }), intel.IntelError);
    await intel.autoIntel(tag(1));
    await zustand.notausAus("FREIGEBEN", "mac");
    assert.equal(xai.anfragen.length, 0);
    assert.equal((await intel.intelSnapshot(tag(1))).spentTodayUsd, 0);
  });
});

describe("Intel: Lagebild", () => {
  test("die Anfrage: Schlüssel nur im Kopf, nichts wird bei xAI gespeichert, fremde Texte gelten als Daten", async () => {
    xai.naechste([{ antwort: lagebild(), kostenUsd: 0.25 }]);
    const bericht = await intel.refreshIntel(null, { wait: true, now: tag(2) });
    assert.equal(bericht?.summary, "Ruhiger Tag.");
    const a = xai.anfragen[0];
    assert.equal(a.auth, `Bearer ${KEY}`);
    assert.ok(!JSON.stringify(a.body).includes(KEY));
    assert.equal(a.body.store, false);
    assert.equal(a.body.max_turns, 5);
    assert.match(JSON.stringify(a.body.input), /Daten, keine Anweisungen/);
    assert.match(JSON.stringify(a.body.input), /keine Kauf- oder Verkaufsempfehlungen/);
    assert.equal((await intel.intelSnapshot(tag(2))).spentTodayUsd, 0.25);
    // Dasselbe steht im Kostenbuch bei Intel, als eine Anfrage an Grok.
    const posten = (await kosten.kostenUebersicht(tag(2))).heute.intel?.grok;
    assert.deepEqual([posten?.usd, posten?.anfragen], [0.25, 1]);
  });

  test("was Grok liefert, wird bereinigt: höchstens acht Meldungen, nur echte Webadressen, Werte in Grenzen", async () => {
    const meldungen = [
      meldung("Böser Link", { url: "javascript:alert(1)", wichtigkeit: 0.9 }),
      meldung("Datei-Link", { url: "file:///etc/passwd", wichtigkeit: 0.8 }),
      meldung("Zu wichtig", { wichtigkeit: 55 }),
      meldung("", { wichtigkeit: 1 }),
      meldung("Komische Wirkung", { wirkung: "kaufen!!", wichtigkeit: 0.7 }),
      ...Array.from({ length: 9 }, (_, i) => meldung(`Füller ${i}`, { wichtigkeit: 0.1 })),
      meldung("x".repeat(500), { wichtigkeit: 0.6 }),
    ];
    xai.naechste([{ antwort: lagebild({ stimmung: "euphorisch", meldungen }) }]);
    const r = (await intel.refreshIntel(null, { wait: true, now: tag(3) }))!;
    assert.equal(r.items.length, 8);
    assert.equal(r.mood, "gemischt", "unbekannte Stimmung wird nicht übernommen");
    assert.equal(r.items[0].title, "Zu wichtig");
    assert.equal(r.items[0].importance, 1);
    assert.equal(r.items.find((i) => i.title === "Böser Link")?.url, null);
    assert.equal(r.items.find((i) => i.title === "Datei-Link")?.url, null);
    assert.equal(r.items.find((i) => i.title === "Komische Wirkung")?.effect, "neutral");
    assert.ok(r.items.every((i) => i.title && i.title.length <= 120));
  });

  test("eine gezielte Suche ersetzt das Lagebild nicht", async () => {
    xai.naechste([{ antwort: lagebild({ lage: "Zu NVIDIA gibt es Neues." }) }]);
    const r = (await intel.refreshIntel("NVIDIA", { wait: true, now: tag(3, 11) }))!;
    assert.equal(r.focus, "NVIDIA");
    const s = await intel.intelSnapshot(tag(3, 11));
    assert.equal(s.search?.summary, "Zu NVIDIA gibt es Neues.");
    assert.notEqual(s.report?.summary, "Zu NVIDIA gibt es Neues.");
    assert.match(JSON.stringify(xai.anfragen[0].body.input), /Gezielte Suche nur zu NVIDIA/);
  });
});

describe("Intel: Kostenbremse", () => {
  test("ist das Tagesbudget fast aufgebraucht, fragt Intel nicht mehr", async () => {
    await config.writeConfig({ name: "Benedikt", xai: { apiKey: KEY }, intel: { budgetUsd: 0.6 } });
    xai.naechste([{ antwort: lagebild(), kostenUsd: 0.3 }, { antwort: lagebild() }]);
    await intel.refreshIntel(null, { wait: true, now: tag(4) });
    await assert.rejects(intel.refreshIntel(null, { wait: true, now: tag(4, 12) }), /Budget .* aufgebraucht/);
    await intel.autoIntel(tag(4, 20));
    assert.equal(xai.anfragen.length, 1, "nur die erste Anfrage ging hinaus");
    assert.equal((await intel.intelSnapshot(tag(4, 12))).nextAt, null);
  });

  test("am nächsten Tag gilt ein frisches Budget", async () => {
    assert.equal((await intel.intelSnapshot(tag(5))).spentTodayUsd, 0);
  });

  test("auch eine unbrauchbare Antwort kostet und wird gezählt", async () => {
    await config.writeConfig({ name: "Benedikt", xai: { apiKey: KEY }, intel: { budgetUsd: 5 } });
    xai.naechste([{ text: "kein JSON", kostenUsd: 0.2 }]);
    await assert.rejects(intel.refreshIntel(null, { wait: true, now: tag(6) }), /keinen lesbaren Bericht/);
    const s = await intel.intelSnapshot(tag(6));
    assert.equal(s.spentTodayUsd, 0.2);
    assert.match(s.error ?? "", /lesbaren Bericht/);
    assert.equal((await kosten.kostenUebersicht(tag(6))).heute.intel?.grok?.usd, 0.2, "auch im Kostenbuch");
  });

  test("Fehler von xAI werden verständlich gemeldet und kosten nichts", async () => {
    xai.naechste([{ status: 402 }, { status: 401 }]);
    await assert.rejects(intel.refreshIntel(null, { wait: true, now: tag(7) }), /Guthaben bei xAI ist aufgebraucht/);
    await assert.rejects(intel.refreshIntel(null, { wait: true, now: tag(7, 11) }), /Schlüssel stimmt nicht/);
    const s = await intel.intelSnapshot(tag(7, 11));
    assert.equal(s.spentTodayUsd, 0);
    assert.equal((await kosten.kostenUebersicht(tag(7))).heute.intel, undefined, "nichts gebucht");
    assert.ok(!JSON.stringify(s).includes(KEY));
  });

  test("nachts liest Intel nicht von selbst, tagsüber schon", async () => {
    xai.naechste([{ antwort: lagebild() }]);
    await intel.autoIntel(tag(9, 23));
    await intel.autoIntel(tag(9, 3));
    assert.equal(xai.anfragen.length, 0);
    await intel.autoIntel(tag(9, 9));
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(xai.anfragen.length, 1);
  });
});

describe("Intel: Warnung an den Desk", () => {
  test("eine Warnung gilt sechs Stunden und wird einmal gemeldet", async () => {
    const meldungen: string[] = [];
    const ab = notify.onNotice((n) => n.kind === "warnung" && meldungen.push(n.text));
    const jetzt = new Date();
    xai.naechste([
      { antwort: lagebild({ desk_warnung: { aktiv: true, grund: "Große Börse gehackt" } }) },
      { antwort: lagebild({ desk_warnung: { aktiv: true, grund: "Große Börse gehackt" } }) },
    ]);
    await intel.refreshIntel(null, { wait: true, now: jetzt });
    assert.equal((await intel.intelWarning(jetzt))?.text, "Große Börse gehackt");
    assert.equal(await intel.intelWarning(new Date(jetzt.getTime() + 7 * 3_600_000)), null, "nach sechs Stunden vorbei");
    await intel.refreshIntel("Bitcoin", { wait: true, now: new Date(jetzt.getTime() + 60_000) });
    ab();
    assert.equal(meldungen.length, 1, "dieselbe Warnung nicht zweimal aufs Handy");
    assert.match(meldungen[0], /Große Börse gehackt\. Der Desk kauft die nächsten 6 Stunden nichts Neues/);
  });
});
