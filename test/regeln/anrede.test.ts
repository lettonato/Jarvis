// Zwei Kleinigkeiten aus Schritt J18. (1) Getippt mit „Jarvis, “ davor: Ein fester Befehl bleibt einer. Gesprochen
// trennt die Spracherkennung das Weckwort schon ab (test/regeln/zuhoeren.test.ts); getippt kam „Jarvis, öffne Safari“
// bisher als „Das verstehe ich noch nicht“ zurück. (2) Ist das Mikrofon gesperrt, fordert das Eingabefeld nicht
// mehr zum Sprechen auf.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decide, type CommandContext } from "../../src/lib/commands";
import { zieleVon, type DesktopStatus } from "../../src/lib/desktop";
import { eingabeText, leerText, ohneAnrede } from "../../src/lib/voiceText";

const JETZT = new Date(2026, 10, 16, 12, 0);
const basis: CommandContext = { name: "Benedikt", market: null, weather: null, tasks: null, mail: null, desk: null, calendar: null, intel: null, now: JETZT, session: null };
const desktop: DesktopStatus = { moeglich: true, ziele: zieleVon(undefined) };
const mit: CommandContext = { ...basis, desktop };
const NICHT_VERSTANDEN = /^Das verstehe ich noch nicht/;

describe("Die Anrede vor einem getippten Satz", () => {
  test("ohneAnrede nimmt „Jarvis“ am Anfang weg, mit und ohne Komma, auch nach „Hey“; sonst nichts", () => {
    assert.equal(ohneAnrede("Jarvis, Wochenbericht"), "Wochenbericht");
    assert.equal(ohneAnrede("jarvis wochenbericht"), "wochenbericht");
    assert.equal(ohneAnrede("Hey Jarvis: öffne Safari"), "öffne Safari");
    assert.equal(ohneAnrede("  Okay, Jarvis! Briefing  "), "Briefing");
    // Wie gesprochen: „He Jarvis“, zweimal der Name (er hat beim ersten Mal nicht reagiert), drei Punkte dahinter.
    assert.equal(ohneAnrede("He Jarvis, öffne Safari"), "öffne Safari");
    assert.equal(ohneAnrede("Jarvis, Jarvis, öffne Safari"), "öffne Safari");
    assert.equal(ohneAnrede("Jarvis… öffne Safari"), "öffne Safari");
    assert.equal(ohneAnrede("Jarvis, Jarvis"), "Jarvis");
    // Ein Gruß davor gehört zur Anrede.
    assert.equal(ohneAnrede("Guten Morgen Jarvis, öffne Safari"), "öffne Safari");
    assert.equal(ohneAnrede("Guten Abend, Jarvis: Briefing"), "Briefing");
    assert.equal(ohneAnrede("Moin Jarvis, Wochenbericht"), "Wochenbericht");
    assert.equal(ohneAnrede("Guten Morgen, Jarvis"), "Guten Morgen, Jarvis");
    // Nur am Anfang; mitten im Satz ist es ein Wort wie jedes andere.
    assert.equal(ohneAnrede("Notiere Jarvis updaten"), "Notiere Jarvis updaten");
    assert.equal(ohneAnrede("Frag Jarvis, wie es geht"), "Frag Jarvis, wie es geht");
    // Ein Wort, das nur so anfängt, ist keine Anrede.
    assert.equal(ohneAnrede("Jarvisprojekt öffnen"), "Jarvisprojekt öffnen");
    assert.equal(ohneAnrede("Jarvis-Einstellungen öffnen"), "Jarvis-Einstellungen öffnen");
    // Nur der Name: Dann bleibt der Satz, wie er ist (sonst bliebe nichts übrig).
    assert.equal(ohneAnrede("Jarvis"), "Jarvis");
    assert.equal(ohneAnrede("Hallo Jarvis!"), "Hallo Jarvis!");
    assert.equal(ohneAnrede(""), "");
  });

  test("ein fester Befehl gilt auch mit „Jarvis, “ davor", () => {
    for (const satz of ["Jarvis, öffne Safari", "jarvis öffne safari", "Hey Jarvis, öffne Safari.", "Jarvis: Öffne Safari"]) {
      const d = decide(satz, mit);
      assert.deepEqual(d?.effect, { type: "openDesktop", id: "safari" }, satz);
      assert.equal(d?.reply, "Ich öffne Safari.", satz);
    }
    for (const satz of ["Guten Morgen Jarvis, öffne Safari", "He Jarvis, öffne Safari", "Jarvis, Jarvis, öffne Safari"]) {
      assert.deepEqual(decide(satz, mit)?.effect, { type: "openDesktop", id: "safari" }, satz);
      assert.deepEqual(decide(satz, mit, true)?.effect, { type: "openDesktop", id: "safari" }, `${satz} (mit KI-Gehirn)`);
    }
    const ohneKi = decide("Jarvis, Wochenbericht", basis);
    assert.match(ohneKi?.reply ?? "", /^Deine Woche, Benedikt\./);
    assert.equal(ohneKi?.navigate, "/heute");
  });

  test("mit KI-Gehirn zählt die Anrede nicht zu den vier Wörtern eines festen Befehls", () => {
    // Fünf Wörter mit dem Namen, vier ohne: Gesprochen ist das ein fester Befehl, getippt jetzt auch.
    assert.match(decide("Jarvis, zeig mir meinen Wochenbericht", basis, true)?.reply ?? "", /^Deine Woche/);
    assert.deepEqual(decide("Jarvis, öffne Safari", mit, true)?.effect, { type: "openDesktop", id: "safari" });
    // Ein anderer Auftrag bleibt einer und geht an das KI-Gehirn.
    assert.equal(decide("Jarvis, schreib einen Wochenbericht für Projekt Alpha", basis, true), null);
    assert.equal(decide("Jarvis, wie hoch ist der Großglockner?", basis, true), null);
    assert.equal(decide("Jarvis", basis, true), null);
  });

  test("mit der Anrede kommt dasselbe heraus wie ohne; was ohne sie kein Befehl ist, gilt, wie es dasteht", () => {
    for (const satz of ["Tagesabschluss", "Briefing", "Meine Aufgaben", "Not-Aus", "Wochenbericht"]) {
      assert.deepEqual(decide(`Jarvis, ${satz}`, basis), decide(satz, basis), satz);
      assert.deepEqual(decide(`Hey Jarvis, ${satz}`, basis), decide(satz, basis), `Hey … ${satz}`);
      assert.deepEqual(decide(`Jarvis, ${satz}`, basis, true), decide(satz, basis, true), `${satz} (mit KI-Gehirn)`);
    }
    // Ein Gruß mit einer Frage dahinter bleibt, was er war: ohne KI-Gehirn das Briefing, mit ihm ein Gespräch.
    const gruss = decide("Hallo Jarvis, wie geht’s?", basis);
    assert.deepEqual(gruss, decide("Hallo", basis));
    assert.deepEqual(decide("Guten Morgen, Jarvis", basis), decide("Guten Morgen", basis));
    assert.ok(gruss && !NICHT_VERSTANDEN.test(gruss.reply));
    assert.equal(decide("Hallo Jarvis, wie geht’s?", basis, true), null);
    // Ohne KI-Gehirn bleibt Unverständliches unverständlich, mit und ohne Anrede.
    assert.match(decide("Jarvis, wie hoch ist der Großglockner?", basis)?.reply ?? "", NICHT_VERSTANDEN);
    assert.match(decide("Jarvis", basis)?.reply ?? "", /./);
  });

  test("in einer Besprechung gilt das Wort der Besprechung auch mit der Anrede", () => {
    const aufgabe = { id: "a", file: "Eingang.md", line: 0, raw: "- [ ] Bauamt anrufen", text: "Bauamt anrufen", due: "2026-11-16", important: false, recurring: false, tags: [] };
    const inBesprechung: CommandContext = { ...basis, tasks: { configured: true, tasks: [aufgabe], doneToday: 0 }, session: { kind: "aufgaben", ids: ["a"], index: 0, done: 0 } };
    assert.equal(decide("Erledigt", inBesprechung)?.effect?.type, "completeTask");
    assert.equal(decide("Jarvis, erledigt", inBesprechung)?.effect?.type, "completeTask");
    // Was auch ohne die Anrede kein Wort der Besprechung ist, bekommt deren Hinweis, nicht den allgemeinen.
    assert.match(decide("Jarvis, wie hoch ist der Großglockner?", inBesprechung)?.reply ?? "", /^Das habe ich nicht verstanden\. Sag erledigt/);
    assert.equal(decide("Jarvis, wie hoch ist der Großglockner?", inBesprechung, true), null);
  });
});

describe("Was das Eingabefeld sagt, wenn das Mikrofon gesperrt ist", () => {
  const frei = { canListen: true, handsFree: true, gesperrt: false };

  test("das Feld fordert nur zum Sprechen auf, wenn JARVIS wirklich zuhören kann", () => {
    assert.equal(eingabeText(frei), "Sag „Jarvis“ oder tippe");
    assert.equal(eingabeText({ ...frei, gesperrt: true }), "Schreib hier, was du brauchst");
    assert.equal(eingabeText({ ...frei, handsFree: false }), "Schreib hier, was du brauchst");
    assert.equal(eingabeText({ canListen: false, handsFree: false, gesperrt: false }), "Schreib hier, was du brauchst");
  });

  test("das leere Gespräch ebenso: gesperrt heißt schreiben, nicht „Sag Jarvis“ und nicht „Tippe aufs Mikrofon“", () => {
    assert.match(leerText(frei), /^Sag „Jarvis“ und dann, was du brauchst\. Oder schreib mir unten\./);
    assert.match(leerText({ ...frei, handsFree: false }), /^Tippe aufs Mikrofon, drück die Leertaste oder schreib mir\./);
    assert.equal(leerText({ canListen: false, handsFree: false, gesperrt: false }), "Schreib mir unten. Sprechen geht in Chrome und Safari.");
    for (const h of [{ ...frei, gesperrt: true }, { canListen: true, handsFree: false, gesperrt: true }]) {
      const text = leerText(h);
      assert.match(text, /^Schreib mir unten\./);
      assert.ok(!/Sag „Jarvis“|Tippe aufs Mikrofon|Chrome und Safari/.test(text), text);
      assert.match(text, /Ich kann dir alles beantworten/);
    }
  });
});
