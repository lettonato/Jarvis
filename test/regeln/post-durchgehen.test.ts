// Die Mails mit JARVIS durchgehen: Was auf „Vorlesen, Aufgabe, gelesen oder weiter?“ geantwortet wird, muss tun,
// was gesagt wurde. „gelesen“ markiert die Mail als gelesen und liest sie nicht noch einmal vor.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decide, type CommandContext, type Session } from "../../src/lib/commands";
import type { MailItem, MailSnapshot } from "../../src/lib/mail";

const JETZT = new Date(2026, 10, 16, 12, 0);
const brief = (uid: number, from: string, subject: string): MailItem => ({ uid, from, fromAddress: `${uid}@example.com`, subject, date: JETZT.toISOString(), unread: true, important: true, flagged: false }) as MailItem;
const mail: MailSnapshot = { configured: true, account: "benedikt@example.org", fetchedAt: JETZT.toISOString(), unread: 2, importantUnread: 2, bulkUnread: 0, items: [brief(109, "Sabine Köhler", "Termin für die Abnahme"), brief(101, "Petra Bauer", "Angebot für den Stahlbau")] };
const session: Session = { kind: "post", ids: [109, 101], index: 0, done: 0 };
const ctx: CommandContext = { name: "Benedikt", market: null, weather: null, tasks: null, mail, desk: null, calendar: null, intel: null, now: JETZT, session };

describe("Mails durchgehen", () => {
  test("„gelesen“ markiert die Mail als gelesen und geht zur nächsten", () => {
    for (const satz of ["gelesen", "Gelesen.", "als gelesen markieren", "hab ich gelesen", "ist gelesen, weiter"]) {
      for (const gehirn of [false, true]) {
        const d = decide(satz, ctx, gehirn);
        assert.deepEqual(d?.effect, { type: "markSeen", uid: 109 }, `${satz} (${gehirn ? "mit" : "ohne"} KI-Gehirn)`);
        assert.equal(d?.reply, "Als gelesen markiert.", satz);
        assert.match(d?.after ?? "", /^Mail 2 von 2, von Petra Bauer\./, satz);
      }
    }
  });

  test("„vorlesen“ und seine Geschwister lesen vor", () => {
    for (const satz of ["vorlesen", "lies vor", "lesen", "bitte durchlesen", "was schreibt sie", "worum geht es", "die will ich vorgelesen bekommen", "kann ich das nachlesen", "weiterlesen"]) {
      const d = decide(satz, ctx, false);
      assert.deepEqual(d?.effect, { type: "readMail", uid: 109 }, satz);
      assert.equal(d?.reply, "Sabine Köhler schreibt:", satz);
    }
  });

  test("„ungelesen“ und „nicht gelesen“ markieren nichts: Die Mail bleibt, wie sie ist, und es geht weiter", () => {
    for (const satz of ["lass sie ungelesen", "ungelesen lassen", "nicht als gelesen markieren", "die bleibt ungelesen", "bitte nicht gelesen"]) {
      for (const gehirn of [false, true]) {
        const d = decide(satz, ctx, gehirn);
        assert.equal(d?.effect, undefined, `${satz} (${gehirn ? "mit" : "ohne"} KI-Gehirn)`);
        assert.equal(d?.reply, "Bleibt ungelesen.", satz);
        assert.match(d?.after ?? "", /^Mail 2 von 2, von Petra Bauer\./, satz);
      }
    }
  });

  test("„Aufgabe“ notiert, „weiter“ überspringt, „beenden“ hört auf; nichts davon markiert die Mail", () => {
    assert.equal(decide("Aufgabe", ctx, false)?.effect?.type, "addTask");
    const weiter = decide("weiter", ctx, false);
    assert.equal(weiter?.effect, undefined);
    assert.match(weiter?.after ?? "", /^Mail 2 von 2/);
    const ende = decide("beenden", ctx, false);
    assert.equal(ende?.effect, undefined);
    assert.equal(ende?.session, null);
  });
});
