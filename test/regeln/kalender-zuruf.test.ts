// „Trag … in den Kalender Arbeit ein“ ohne KI-Gehirn (fester Befehl): Ein genannter Kalender, den es gibt, gilt
// fest und gehört nicht in den Titel. So wird er nie still durch den Standardkalender ersetzt.
// Mit KI-Gehirn geht ein so langer Satz an Claude; dort gilt dasselbe über das Werkzeug termin_eintragen.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CalendarSnapshot } from "../../src/lib/calendar";
import { decide, type CommandContext } from "../../src/lib/commands";

// Montag, 16. November 2026, 12 Uhr.
const JETZT = new Date(2026, 10, 16, 12, 0);
const kalender: CalendarSnapshot = {
  access: "ok",
  events: [],
  calendars: [
    { name: "Privat", writable: true },
    { name: "Arbeit", writable: true },
    { name: "Arbeit Baustelle", writable: true },
    { name: "Feiertage", writable: false },
  ],
  target: "Privat",
  from: "2026-11-16",
  to: "2026-11-30",
};
const ctx: CommandContext = { name: "Benedikt", market: null, weather: null, tasks: null, mail: null, desk: null, calendar: kalender, intel: null, now: JETZT, session: null };
const termin = (satz: string) => {
  const d = decide(satz, ctx, false);
  assert.equal(d?.effect?.type, "addEvent", satz);
  return { reply: d!.reply, event: (d!.effect as { event: Record<string, unknown> }).event };
};

describe("Termin auf Zuruf mit genanntem Kalender", () => {
  test("ein genannter Kalender, den es gibt, wird das feste Ziel und steht nicht im Titel", () => {
    const r = termin("Trag übermorgen um 10 Uhr Abnahme in den Kalender Arbeit ein");
    assert.deepEqual(r.event, { title: "Abnahme", date: "2026-11-18", time: "10:00", minutes: 60, calendar: "Arbeit" });
    assert.equal(r.reply, "Eingetragen im Kalender Arbeit: Abnahme, übermorgen um 10 Uhr.");
    assert.equal(decide("Trag übermorgen um 10 Uhr Abnahme in den Kalender Arbeit ein", ctx, true), null, "mit KI-Gehirn entscheidet Claude");
  });

  test("Groß- und Kleinschreibung spielt keine Rolle; der längere Name gewinnt", () => {
    assert.equal(termin("trag morgen um 9 uhr zahnarzt in den kalender arbeit ein").event.calendar, "Arbeit");
    const r = termin("Trag morgen um 9 Uhr Begehung im Kalender Arbeit Baustelle ein");
    assert.equal(r.event.calendar, "Arbeit Baustelle");
    assert.equal(r.event.title, "Begehung");
  });

  test("auch ein schreibgeschützter Kalender wird genannt weitergegeben: Dann lehnt der Mac ab, statt woanders einzutragen", () => {
    const r = termin("Trag übermorgen um 10 Uhr JARVIS-Test zwei in den Kalender Feiertage ein");
    assert.equal(r.event.calendar, "Feiertage");
    assert.equal(r.event.title, "JARVIS-Test zwei");
  });

  test("ohne genannten Kalender bleibt alles wie bisher", () => {
    const r = termin("Trag morgen um 9 Uhr Zahnarzt ein");
    assert.ok(!("calendar" in r.event));
    assert.equal(r.reply, "Eingetragen im Kalender Privat: Zahnarzt, morgen um 9 Uhr.");
    assert.ok(!("calendar" in termin("Schreib in den Kalender: morgen um 9 Uhr Zahnarzt").event));
  });

  test("ist der Name alles, was vom Satz bleibt, ist er der Titel", () => {
    const r = termin("Trag morgen um 9 Uhr in den Kalender Arbeit ein");
    assert.equal(r.event.title, "Arbeit");
    assert.ok(!("calendar" in r.event));
  });

  test("ein Wort, das kein Kalender ist, bleibt im Titel", () => {
    const r = termin("Trag morgen um 9 Uhr in den Kalender Arbeitsessen ein");
    assert.equal(r.event.title, "Arbeitsessen");
    assert.ok(!("calendar" in r.event));
  });
});
