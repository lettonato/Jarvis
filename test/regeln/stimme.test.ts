// Die Regeln der ElevenLabs-Stimme und das Unterbrechen mit „Stopp“, ohne Browser und ohne Netz.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  fehlerText,
  istStimmeId,
  istStimmeModell,
  kontoAus,
  passtInsLimit,
  probeSatz,
  siehtAusWieSchluessel,
  stimmenAus,
  stimmeStatus,
  STIMME_MAX_TEXT,
  STIMME_MODELLE,
  STIMME_STANDARD_MODELL,
  STIMME_TAGESLIMIT,
  stuecke,
  tagesLimit,
} from "../../src/lib/stimme";
import { forSpeech, stopsSpeech } from "../../src/lib/voiceText";

const voll = { apiKey: "sk_abcdefghijklmnopqrstuvwxyz1234", enabled: true, voiceId: "DeutscheStimme00001", voiceName: "Elke", heuteZeichen: 0, notaus: false };

describe("ElevenLabs-Stimme: wann sie spricht", () => {
  test("aktiv ist sie nur mit Schlüssel, Stimme und Schalter, ohne Not-Aus und unter dem Tageslimit", () => {
    assert.deepEqual([stimmeStatus(voll).aktiv, stimmeStatus(voll).grund], [true, null]);
    assert.equal(stimmeStatus({ ...voll, apiKey: "" }).grund, "kein-schluessel");
    assert.equal(stimmeStatus({ ...voll, voiceId: null }).grund, "keine-stimme");
    assert.equal(stimmeStatus({ ...voll, enabled: false }).grund, "aus");
    assert.equal(stimmeStatus({ ...voll, enabled: undefined }).grund, "aus", "ohne ausdrückliches Einschalten ist sie aus");
    assert.equal(stimmeStatus({ ...voll, notaus: true }).grund, "notaus");
    assert.equal(stimmeStatus({ ...voll, enabled: false, notaus: true }).grund, "notaus", "der Not-Aus geht dem Schalter vor (sonst käme die Probe durch)");
    assert.equal(stimmeStatus({ ...voll, heuteZeichen: STIMME_TAGESLIMIT }).grund, "limit");
    for (const e of [{ apiKey: "" }, { voiceId: null }, { enabled: false }, { notaus: true }, { heuteZeichen: 999_999 }]) assert.equal(stimmeStatus({ ...voll, ...e }).aktiv, false);
  });

  test("ohne Schlüssel gilt nichts als eingeschaltet, auch wenn der Schalter in der Datei noch steht", () => {
    const s = stimmeStatus({ ...voll, apiKey: null });
    assert.deepEqual([s.configured, s.enabled, s.voiceId, s.hint], [false, false, null, null]);
  });

  test("vom Schlüssel sieht die Seite nur die letzten vier Zeichen", () => {
    const s = stimmeStatus(voll);
    assert.equal(s.hint, "…1234");
    assert.ok(!JSON.stringify(s).includes(voll.apiKey));
  });

  test("unbekanntes Modell und unsinniges Limit fallen auf die sicheren Standardwerte", () => {
    assert.equal(stimmeStatus({ ...voll, model: "gibt_es_nicht" }).model, STIMME_STANDARD_MODELL);
    assert.equal(stimmeStatus({ ...voll, tagesZeichen: -5 }).tagesZeichen, STIMME_TAGESLIMIT);
    assert.equal(tagesLimit("abc"), STIMME_TAGESLIMIT);
    assert.equal(tagesLimit(1234.4), 1234);
    assert.equal(tagesLimit(9_999_999), STIMME_TAGESLIMIT);
    assert.ok(istStimmeModell("eleven_multilingual_v2") && !istStimmeModell("eleven_flash_v2"));
    assert.deepEqual(STIMME_MODELLE.map((m) => m.id), ["eleven_flash_v2_5", "eleven_multilingual_v2", "eleven_v4"], "nur Modelle, die ElevenLabs für das Konto wirklich anbietet");
    assert.equal(STIMME_MODELLE.find((m) => m.id === "eleven_multilingual_v2")!.sprachcode, false);
  });

  test("das Limit wird vor dem Senden gezählt: Ein Satz, der nicht mehr ganz passt, geht nicht hinaus", () => {
    assert.equal(passtInsLimit("x".repeat(100), 400, 500), true);
    assert.equal(passtInsLimit("x".repeat(101), 400, 500), false);
  });

  test("der Probesatz ist fest und enthält außer dem Namen nichts von dir", () => {
    assert.equal(probeSatz("Benedikt"), "Hallo Benedikt, so klinge ich jetzt. Sag einfach Jarvis, wenn du mich brauchst.");
  });
});

describe("ElevenLabs-Stimme: Texte und Antworten", () => {
  test("lange Sätze werden an Kommas oder Leerzeichen geteilt, nichts geht verloren", () => {
    const lang = Array.from({ length: 60 }, (_, i) => `Punkt ${i + 1} der Liste, der etwas länger ist`).join(", ");
    const teile = stuecke(lang);
    assert.ok(teile.length > 1);
    for (const t of teile) assert.ok(t.length <= STIMME_MAX_TEXT, `Stück mit ${t.length} Zeichen`);
    assert.equal(teile.join(" ").replace(/\s+/g, " "), lang);
    assert.deepEqual(stuecke("Kurz."), ["Kurz."]);
    assert.deepEqual(stuecke("   "), []);
    assert.ok(stuecke("a".repeat(1500)).every((t) => t.length <= STIMME_MAX_TEXT), "auch ein Wort ohne Leerzeichen wird geteilt");
  });

  test("aus der Stimmenliste kommt nur Sauberes: Kennung, Name, Deutsch ja oder nein", () => {
    const liste = stimmenAus({
      voices: [
        { voice_id: "AbCdEfGhIjKlMnOpQrSt", name: "  Zoe \n ", category: "premade", verified_languages: [{ language: "en" }] },
        { voice_id: "DeutscheStimme00001", name: "Anna", labels: { language: "de" } },
        { voice_id: "../../etc/passwd", name: "Böse" },
        { voice_id: "OhneNamen0000000001", name: "" },
        null,
      ],
    });
    assert.deepEqual(liste, [
      { id: "DeutscheStimme00001", name: "Anna", deutsch: true, art: null },
      { id: "AbCdEfGhIjKlMnOpQrSt", name: "Zoe", deutsch: false, art: "premade" },
    ]);
    assert.deepEqual(stimmenAus(null), []);
    assert.deepEqual(stimmenAus({ voices: "kaputt" }), []);
    assert.ok(istStimmeId("vYm4B0DErmDBF04R0grX") && !istStimmeId("a/b") && !istStimmeId(""));
  });

  test("Kontostand nur, wenn die Zahlen stimmen", () => {
    assert.deepEqual(kontoAus({ tier: "free", character_count: 120, character_limit: 10000 }), { tarif: "free", verbraucht: 120, limit: 10000 });
    assert.equal(kontoAus({ tier: "free" }), null);
    assert.equal(kontoAus(null), null);
  });

  test("ein Schlüssel muss wie ein Schlüssel aussehen, bevor er überhaupt geprüft wird", () => {
    assert.ok(siehtAusWieSchluessel("sk_0123456789abcdef0123456789abcdef"));
    assert.ok(siehtAusWieSchluessel("0123456789abcdef0123456789abcdef"), "ältere Schlüssel ohne sk_");
    assert.ok(!siehtAusWieSchluessel("kurz"));
    assert.ok(!siehtAusWieSchluessel("sk_mit leerzeichen und noch mehr text hier"));
  });

  test("jeder Fehlercode ergibt einen eigenen, verständlichen Satz", () => {
    const texte = [0, 401, 402, 404, 422, 429, 500].map(fehlerText);
    assert.equal(new Set(texte).size, texte.length);
    for (const t of texte) assert.match(t, /ElevenLabs/);
  });
});

describe("Vorlesen: Zeichen, die eine Stimme nicht sicher liest", () => {
  test("ein Minuszeichen vor einer Zahl wird als „minus“ gesprochen, damit aus einem Verlust kein Gewinn wird", () => {
    assert.equal(forSpeech("Ethereum steht bei 3.310,00 €, −0,7 % in 24 Stunden."), "Ethereum steht bei 3.310,00 €, minus 0,7 % in 24 Stunden.");
    assert.equal(forSpeech("Silber-Fonds SLV: −3,3 % zum Vortag"), "Silber-Fonds SLV: minus 3,3 % zum Vortag");
    // Ein Bindestrich im Wort und ein Plus bleiben, wie sie sind.
    assert.equal(forSpeech("Der Silber-Fonds liegt +0,3 % vorn."), "Der Silber-Fonds liegt +0,3 % vorn.");
  });
});

describe("Unterbrechen: „Stopp“, während JARVIS spricht", () => {
  const SPRICHT = "Heute stehen drei Termine an, der erste um neun Uhr.";

  test("ein klares Haltewort unterbricht, auch am Ende von mitgehörtem Text", () => {
    for (const wort of ["Stopp", "stop!", "Halt.", "Ruhe", "sei still", "hör auf", "aufhören", "abbrechen"]) assert.equal(stopsSpeech(wort, SPRICHT), true, wort);
    assert.equal(stopsSpeech("drei Termine an der erste stopp", SPRICHT), true);
  });

  test("normale Sätze, „Danke“ und Haltewörter mitten im Satz unterbrechen nicht", () => {
    for (const satz of ["Danke", "egal", "das ist ja interessant", "stopp mal kurz die Musik im Wohnzimmer", "", "Jarvis"]) assert.equal(stopsSpeech(satz, SPRICHT), false, satz);
  });

  test("sagt JARVIS genau das Haltewort gerade selbst, war es der Lautsprecher", () => {
    assert.equal(stopsSpeech("Halt", "Der Zug macht in Linz Halt und fährt dann weiter."), false);
    assert.equal(stopsSpeech("hör auf", "Ich sagte ihm: Hör auf damit."), false);
  });

  test("einzelne Alltagswörter in seiner Antwort sperren das Unterbrechen nicht", () => {
    assert.equal(stopsSpeech("hör auf", "Der Termin steht auf der Liste und sei pünktlich."), true);
    assert.equal(stopsSpeech("sei still", "Dann ist es still im Haus."), true);
    assert.equal(stopsSpeech("Stopp", "Der Bus stoppt am Bahnhof."), true);
  });

  test("Fehler von ElevenLabs stehen im Zustand, aber nur solange ein Schlüssel da ist", () => {
    assert.equal(stimmeStatus({ ...voll, fehler: "ElevenLabs lehnt den Schlüssel ab." }).fehler, "ElevenLabs lehnt den Schlüssel ab.");
    assert.equal(stimmeStatus({ ...voll, apiKey: null, fehler: "alt" }).fehler, null);
    assert.equal(stimmeStatus(voll).fehler, null);
  });

  test("spricht JARVIS nicht, gibt es nichts zu unterbrechen", () => {
    assert.equal(stopsSpeech("Stopp", ""), false);
  });
});
