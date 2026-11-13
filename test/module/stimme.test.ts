// Die ElevenLabs-Stimme gegen einen nachgebauten ElevenLabs-Server (test/mocks/elevenlabs-mock.ts).
// Geprüft wird, was dich schützt: Ohne Schlüssel, Stimme und Schalter geht kein Zeichen hinaus, das Tageslimit
// und der Not-Aus halten, der Schlüssel erreicht nie die Seite, und Fehlertexte des Dienstes werden nicht gezeigt.
// Kein Test hier spricht mit dem echten ElevenLabs.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung } from "../helfer/umgebung";
import { MOCK_SCHLUESSEL, starteElevenMock, type ElevenMock } from "../mocks/elevenlabs-mock";

const ordner = sichereUmgebung("stimme");
const JETZT = new Date(2026, 10, 13, 9, 0);
const MORGEN = new Date(2026, 10, 14, 9, 0);

let el: ElevenMock;
let config: typeof import("../../src/lib/server/config");
let stimme: typeof import("../../src/lib/server/stimme");
let zustand: typeof import("../../src/lib/server/gateway/zustand");
let audit: typeof import("../../src/lib/server/gateway/audit");

// So wie die Einstellungen-Schnittstelle: lesen, ändern, bei Erfolg speichern, Zustand zurück.
const stelle = async (body: import("../../src/lib/server/stimme").StimmeAktion) => {
  const c = await config.readConfig();
  const r = await stimme.stimmeEinstellen(c, body);
  if (r.ok) await config.writeConfig(c);
  const daten = { stimme: await stimme.stimmeStatusVon(await config.readConfig(), JETZT), error: r.ok ? undefined : r.error, message: r.ok ? r.message : undefined };
  return { status: r.ok ? 200 : 400, daten };
};
const bytes = async (strom: ReadableStream<Uint8Array>) => Buffer.from(await new Response(strom).arrayBuffer());
const bisGefragt = async (n: number) => {
  for (let i = 0; i < 200 && el.gesprochen().length < n; i++) await new Promise((r) => setTimeout(r, 5));
};
const fertig = async (schalter = true) => {
  await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: MOCK_SCHLUESSEL, voiceId: "DeutscheStimme00001", voiceName: "Elke – freundlich", enabled: schalter } });
};

before(async () => {
  el = await starteElevenMock();
  process.env.ELEVENLABS_BASE_URL = el.url;
  config = await import("../../src/lib/server/config");
  stimme = await import("../../src/lib/server/stimme");
  zustand = await import("../../src/lib/server/gateway/zustand");
  audit = await import("../../src/lib/server/gateway/audit");
});

after(async () => {
  await el.stop();
});

beforeEach(() => {
  el.leeren();
  stimme.vergissStimmen();
});

describe("ElevenLabs-Stimme: einrichten", () => {
  test("ohne Schlüssel ist sie aus und nichts geht hinaus", async () => {
    await config.writeConfig({ name: "Benedikt" });
    const status = await stimme.stimmeStatusVon(await config.readConfig(), JETZT);
    assert.deepEqual([status.configured, status.enabled, status.aktiv, status.grund], [false, false, false, "kein-schluessel"]);
    const ergebnis = await stimme.sprich("Guten Morgen.", { now: JETZT });
    assert.equal(ergebnis.ok, false);
    assert.equal(!ergebnis.ok && ergebnis.status, 409);
    assert.equal(el.anfragen.length, 0, "kein Aufruf bei ElevenLabs");
  });

  test("ein falscher Schlüssel wird nicht gespeichert; der Fehlertext kommt von JARVIS, nicht vom Dienst", async () => {
    const zuKurz = await stelle({ action: "elevenlabs", apiKey: "abc" });
    assert.equal(zuKurz.status, 400);
    assert.equal(el.anfragen.length, 0, "was nicht nach Schlüssel aussieht, wird gar nicht erst geprüft");
    const falsch = await stelle({ action: "elevenlabs", apiKey: "sk_falsch_aber_lang_genug_0123456789" });
    assert.equal(falsch.status, 400);
    assert.match(String(falsch.daten.error), /lehnt den Schlüssel ab/);
    assert.equal((await config.readConfig()).elevenlabs, undefined);
  });

  test("der richtige Schlüssel wird geprüft und gespeichert, schaltet aber nichts ein und erreicht nie die Seite", async () => {
    const r = await stelle({ action: "elevenlabs", apiKey: `  ${MOCK_SCHLUESSEL} ` });
    assert.equal(r.status, 200);
    assert.match(String(r.daten.message), /3 Stimmen/);
    assert.equal(el.anfragen[0].pfad, "/v2/voices");
    assert.equal(el.anfragen[0].schluessel, MOCK_SCHLUESSEL, "der Schlüssel geht im Kopf xi-api-key an ElevenLabs");
    const s = r.daten.stimme!;
    assert.deepEqual([s.configured, s.enabled, s.aktiv, s.grund, s.hint], [true, false, false, "keine-stimme", "…cdef"]);
    assert.ok(!JSON.stringify(r.daten).includes(MOCK_SCHLUESSEL), "die Antwort an die Seite enthält den Schlüssel nicht");
    assert.equal(el.gesprochen().length, 0, "beim Einrichten wird nichts vorgelesen");
  });

  test("einschalten geht erst mit einer Stimme aus dem eigenen Konto; der Name kommt von ElevenLabs", async () => {
    await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: MOCK_SCHLUESSEL } });
    assert.equal((await stelle({ action: "elevenlabsPrefs", enabled: true })).status, 400, "ohne Stimme kein Einschalten");
    assert.equal((await stelle({ action: "elevenlabsPrefs", voiceId: "FremdeStimme000001" })).status, 400, "eine Stimme, die nicht im Konto ist");
    assert.equal((await stelle({ action: "elevenlabsPrefs", voiceId: "../../v1/user" })).status, 400, "keine Pfade als Stimme");
    const gewaehlt = await stelle({ action: "elevenlabsPrefs", voiceId: "DeutscheStimme00001" });
    assert.equal(gewaehlt.daten.stimme!.voiceName, "Elke – freundlich");
    assert.equal(gewaehlt.daten.stimme!.aktiv, false, "gewählt ist noch nicht eingeschaltet");
    const an = await stelle({ action: "elevenlabsPrefs", enabled: true });
    assert.deepEqual([an.daten.stimme!.enabled, an.daten.stimme!.aktiv, an.daten.stimme!.grund], [true, true, null]);
    const log = await audit.leseAudit(20);
    assert.ok(log.some((e) => /ElevenLabs-Stimme eingeschaltet/.test(e.was)), "das Einschalten steht im Audit-Log");
    assert.ok(!JSON.stringify(log).includes(MOCK_SCHLUESSEL), "der Schlüssel steht nicht im Audit-Log");
  });

  test("Modell und Tageslimit nur in den erlaubten Grenzen", async () => {
    await fertig();
    assert.equal((await stelle({ action: "elevenlabsPrefs", model: "irgendein_modell" })).status, 400);
    assert.equal((await stelle({ action: "elevenlabsPrefs", tagesZeichen: 10 })).status, 400);
    assert.equal((await stelle({ action: "elevenlabsPrefs", tagesZeichen: 9_999_999 })).status, 400);
    const ok = await stelle({ action: "elevenlabsPrefs", model: "eleven_multilingual_v2", tagesZeichen: 1000 });
    assert.deepEqual([ok.daten.stimme!.model, ok.daten.stimme!.tagesZeichen], ["eleven_multilingual_v2", 1000]);
  });

  test("Schlüssel entfernen: danach ist alles wieder aus, und das Ausschalten steht im Audit-Log", async () => {
    await fertig();
    const r = await stelle({ action: "removeElevenlabs" });
    assert.equal(r.daten.stimme!.configured, false);
    assert.equal((await config.readConfig()).elevenlabs, undefined);
    assert.ok((await audit.leseAudit(5)).some((e) => /ausgeschaltet \(Schlüssel entfernt\)/.test(e.was)));
  });

  test("ein anderer Schlüssel setzt Stimme und Schalter zurück; derselbe Schlüssel lässt alles, wie es ist", async () => {
    await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: "sk_alter_schluessel_eines_anderen_kontos_01", voiceId: "StimmeImAltenKonto01", voiceName: "Alt", enabled: true, tagesZeichen: 800, model: "eleven_v4" } });
    const neu = await stelle({ action: "elevenlabs", apiKey: MOCK_SCHLUESSEL });
    assert.equal(neu.status, 200);
    assert.deepEqual([neu.daten.stimme!.enabled, neu.daten.stimme!.voiceId, neu.daten.stimme!.aktiv], [false, null, false], "nichts bleibt eingeschaltet");
    assert.deepEqual([neu.daten.stimme!.tagesZeichen, neu.daten.stimme!.model], [800, "eleven_v4"], "Limit und Modell bleiben");
    await fertig();
    const gleich = await stelle({ action: "elevenlabs", apiKey: MOCK_SCHLUESSEL });
    assert.deepEqual([gleich.daten.stimme!.enabled, gleich.daten.stimme!.voiceId], [true, "DeutscheStimme00001"]);
  });

  test("der Schlüssel zieht mit in den Schlüsselbund um (steht in der Liste der Zugangsdaten)", () => {
    assert.ok(config.GEHEIMNISSE.some((g) => g.name === "elevenlabs.apiKey"));
  });
});

describe("ElevenLabs-Stimme: vorlesen", () => {
  test("ein Satz geht mit Stimme, Modell und Sprache an ElevenLabs und kommt als Ton zurück", async () => {
    await fertig();
    const ergebnis = await stimme.sprich("  Guten Morgen,\n Benedikt.  ", { now: JETZT });
    assert.ok(ergebnis.ok);
    const ton = await bytes(ergebnis.audio);
    assert.deepEqual([...ton.subarray(0, 2)], [0xff, 0xfb], "es kommt ein MP3 zurück");
    const a = el.anfragen.at(-1)!;
    assert.equal(a.pfad, "/v1/text-to-speech/DeutscheStimme00001/stream");
    assert.equal(a.query.output_format, "mp3_44100_128");
    assert.equal(a.schluessel, MOCK_SCHLUESSEL);
    assert.deepEqual(a.body, { text: "Guten Morgen, Benedikt.", model_id: "eleven_flash_v2_5", language_code: "de" });
    assert.equal((await stimme.stimmeStatusVon(await config.readConfig(), JETZT)).heuteZeichen, "Guten Morgen, Benedikt.".length);
  });

  test("Multilingual 2 bekommt keinen Sprachcode (das Modell kennt das Feld nicht)", async () => {
    await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: MOCK_SCHLUESSEL, voiceId: "DeutscheStimme00001", enabled: true, model: "eleven_multilingual_v2" } });
    assert.ok((await stimme.sprich("Hallo.", { now: MORGEN })).ok);
    assert.deepEqual(el.anfragen.at(-1)!.body, { text: "Hallo.", model_id: "eleven_multilingual_v2" });
  });

  test("ausgeschaltet geht nichts hinaus; nur die Probe mit dem festen Satz", async () => {
    await fertig(false);
    const aus = await stimme.sprich("Deine Mail von der Bank: …", { now: JETZT });
    assert.equal(!aus.ok && aus.grund, "aus");
    assert.equal(el.gesprochen().length, 0);
    const probe = await stimme.sprich("Das hier darf nie gesendet werden.", { probe: true, now: JETZT });
    assert.ok(probe.ok);
    assert.deepEqual(el.gesprochen(), ["Hallo Benedikt, so klinge ich jetzt. Sag einfach Jarvis, wenn du mich brauchst."], "die Probe schickt nur den festen Satz");
  });

  test("das Tageslimit hält: Was nicht mehr passt, geht nicht hinaus; am nächsten Tag geht es wieder", async () => {
    await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: MOCK_SCHLUESSEL, voiceId: "DeutscheStimme00001", enabled: true, tagesZeichen: 500 } });
    const tag = new Date(2026, 10, 20, 9, 0);
    const satz = "x".repeat(200);
    assert.ok((await stimme.sprich(satz, { now: tag })).ok);
    assert.ok((await stimme.sprich(satz, { now: tag })).ok);
    const dritter = await stimme.sprich(satz, { now: tag });
    assert.deepEqual([!dritter.ok && dritter.status, !dritter.ok && dritter.grund], [429, "limit"]);
    assert.equal(el.gesprochen().length, 2, "der dritte Satz hat ElevenLabs nie erreicht");
    // Gleichzeitig abgeschickte Sätze überspringen das Limit nicht gemeinsam.
    const gleichzeitig = await Promise.all([stimme.sprich("y".repeat(60), { now: tag }), stimme.sprich("y".repeat(60), { now: tag })]);
    assert.equal(gleichzeitig.filter((g) => g.ok).length, 1);
    assert.ok((await stimme.sprich(satz, { now: new Date(2026, 10, 21, 9, 0) })).ok, "am nächsten Tag zählt es neu");
  });

  test("zu lange und leere Texte lehnt der Server ab", async () => {
    await fertig();
    const lang = await stimme.sprich("z".repeat(601), { now: MORGEN });
    assert.equal(!lang.ok && lang.status, 413);
    const leer = await stimme.sprich("   ", { now: MORGEN });
    assert.equal(!leer.ok && leer.status, 400);
    assert.equal(el.gesprochen().length, 0);
  });

  test("beim Not-Aus geht nichts an ElevenLabs, auch keine Probe", async () => {
    await fertig();
    await zustand.notausAn("Test", "mac");
    try {
      const status = await stimme.stimmeStatusVon(await config.readConfig(), MORGEN);
      assert.deepEqual([status.aktiv, status.grund], [false, "notaus"]);
      assert.equal((await stimme.sprich("Hallo.", { now: MORGEN })).ok, false);
      assert.equal((await stimme.sprich("", { probe: true, now: MORGEN })).ok, false);
      // Auch bei ausgeschaltetem Schalter, wo die Probe sonst erlaubt ist.
      await fertig(false);
      const probe = await stimme.sprich("", { probe: true, now: MORGEN });
      assert.deepEqual([probe.ok, !probe.ok && probe.grund], [false, "notaus"]);
      await fertig();
      assert.equal(el.gesprochen().length, 0);
    } finally {
      await zustand.notausAus("FREIGEBEN", "mac");
    }
    assert.ok((await stimme.sprich("Hallo.", { now: MORGEN })).ok, "nach dem Lösen geht es wieder");
  });

  test("Fehler von ElevenLabs: eigener Satz statt Text des Dienstes, und die Zeichen zählen nicht", async () => {
    await fertig();
    const tag = new Date(2026, 10, 25, 9, 0);
    for (const [code, muster] of [[401, /lehnt den Schlüssel ab/], [402, /bezahlten Tarif/], [422, /nimmt die Anfrage so nicht an/], [429, /ausgelastet|aufgebraucht/], [500, /Fehler \(500\)/]] as const) {
      el.fehler([code]);
      const r = await stimme.sprich("Ein Satz.", { now: tag });
      assert.equal(r.ok, false, String(code));
      if (r.ok) continue;
      assert.equal(r.status, 502);
      assert.match(r.error, muster);
      assert.ok(!/IGNORIERE/.test(r.error), "der Text des Dienstes wird nicht weitergegeben");
    }
    const danach = await stimme.stimmeStatusVon(await config.readConfig(), tag);
    assert.equal(danach.heuteZeichen, 0, "fehlgeschlagene Sätze verbrauchen kein Tageslimit");
    assert.match(String(danach.fehler), /Fehler \(500\)/, "der letzte Fehler steht im Zustand, damit die Einstellungen ihn zeigen");
    assert.ok((await stimme.sprich("Ein Satz.", { now: tag })).ok);
    assert.equal((await stimme.stimmeStatusVon(await config.readConfig(), tag)).fehler, null, "nach einem gelungenen Satz ist er weg");
  });

  test("eine Rückbuchung nach Mitternacht überschreibt den Zähler des neuen Tages nicht", async () => {
    await fertig();
    const abends = new Date(2026, 11, 1, 23, 59, 50);
    const morgens = new Date(2026, 11, 2, 0, 0, 5);
    // Der Satz von 23:59 scheitert erst, nachdem um 00:00 schon ein neuer gezählt wurde.
    el.fehler([500]);
    el.verzoegere(200);
    const spaet = stimme.sprich("Satz von gestern Abend.", { now: abends });
    await bisGefragt(1);
    assert.ok((await stimme.sprich("Satz von heute.", { now: morgens })).ok);
    assert.equal((await spaet).ok, false);
    assert.equal((await stimme.stimmeStatusVon(await config.readConfig(), morgens)).heuteZeichen, "Satz von heute.".length, "der Satz von heute bleibt gezählt");
    const roh = JSON.parse(readFileSync(path.join(ordner, "stimme.json"), "utf8")) as { tag: string };
    assert.equal(roh.tag, "2026-12-02", "der Zähler gehört dem neuen Tag");
  });

  test("ist ElevenLabs nicht erreichbar, gibt es einen klaren Fehler statt eines Absturzes", async () => {
    await fertig();
    process.env.ELEVENLABS_BASE_URL = "http://127.0.0.1:9";
    try {
      const r = await stimme.sprich("Hallo.", { now: MORGEN });
      assert.equal(!r.ok && r.status, 502);
      assert.match(!r.ok ? r.error : "", /nicht erreichbar/);
    } finally {
      process.env.ELEVENLABS_BASE_URL = el.url;
    }
  });

  test("Stimmenliste: deutsche zuerst, Kontostand dabei; fehlt dem Schlüssel das Recht, fehlt nur die Angabe", async () => {
    const liste = await stimme.stimmenListe(MOCK_SCHLUESSEL);
    assert.ok(liste.ok);
    assert.deepEqual(liste.stimmen.map((s) => [s.name, s.deutsch]), [["Elke – freundlich", true], ["Konrad", true], ["Rachel", false]]);
    assert.deepEqual(await stimme.stimmeKonto(MOCK_SCHLUESSEL), { tarif: "starter", verbraucht: 1200, limit: 30000 });
    el.konto(null);
    assert.equal(await stimme.stimmeKonto(MOCK_SCHLUESSEL), null);
  });
});

describe("ElevenLabs-Stimme: was auf der Platte liegt", () => {
  test("gespeichert wird nur die Zeichenzahl des Tages, kein vorgelesener Text", async () => {
    await fertig();
    assert.ok((await stimme.sprich("Ein ganz bestimmter Satz.", { now: new Date(2026, 10, 28, 9, 0) })).ok);
    const verbrauch = readFileSync(path.join(ordner, "stimme.json"), "utf8");
    assert.deepEqual(Object.keys(JSON.parse(verbrauch) as object).sort(), ["tag", "zeichen"]);
    assert.ok(!JSON.stringify(await audit.leseAudit(200)).includes("bestimmter Satz"), "auch im Audit-Log steht kein vorgelesener Text");
  });

  test("die Schnittstelle zum Vorlesen prüft Herkunft und JARVIS-Kopf, bevor sie etwas tut", () => {
    const quelle = readFileSync("src/app/api/stimme/route.ts", "utf8");
    assert.match(quelle, /guard\(request, \{ write: true \}\)[\s\S]*sprich\(/, "erst der Schutz, dann das Vorlesen");
  });
});
