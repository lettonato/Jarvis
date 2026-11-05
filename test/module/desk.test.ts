// Spielgeld-Desk (src/lib/server/desk/engine.ts): Steuerung und Verhalten ohne Marktdaten.
// Alle Marktadressen zeigen auf einen Port ohne Dienst; der Desk darf dann nichts kaufen.

import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { before, describe, test } from "node:test";
import { sichereUmgebung } from "../helfer/umgebung";

const dir = sichereUmgebung("desk");
let desk: typeof import("../../src/lib/server/desk/engine");

before(async () => {
  desk = await import("../../src/lib/server/desk/engine");
});

describe("Desk: Steuerung", () => {
  test("startet mit 10.000 $ Spielgeld", async () => {
    const msg = await desk.control({ action: "start" });
    assert.match(msg, /gestartet/);
    const snap = await desk.deskSnapshot();
    assert.equal(snap.status, "laeuft");
    assert.equal(snap.cash, 10_000);
    assert.equal(snap.positions.length, 0);
  });

  test("zweiter Start wird abgelehnt", async () => {
    await assert.rejects(desk.control({ action: "start" }), desk.DeskError);
  });

  test("Pause, weiter, Not-Aus", async () => {
    await desk.control({ action: "pause" });
    assert.equal((await desk.deskSnapshot()).status, "pausiert");
    await desk.control({ action: "weiter" });
    assert.equal((await desk.deskSnapshot()).status, "laeuft");
    await desk.control({ action: "notaus" });
    assert.equal((await desk.deskSnapshot()).status, "notaus");
  });

  test("während Not-Aus arbeitet der Takt nicht", async () => {
    const before = await desk.deskSnapshot();
    await desk.tick();
    await desk.huntDone();
    const after = await desk.deskSnapshot();
    assert.equal(after.status, "notaus");
    assert.equal(after.trades.length, before.trades.length);
  });

  test("ohne Marktdaten wird nichts gekauft", async () => {
    await desk.control({ action: "weiter" });
    await desk.tick();
    await desk.huntDone();
    const snap = await desk.deskSnapshot();
    assert.equal(snap.positions.length, 0);
    assert.equal(snap.cash, 10_000);
    await desk.control({ action: "notaus" });
  });

  test("Stand liegt nur im Testordner, Datei nur für den Benutzer lesbar", async () => {
    const stat = await fs.stat(path.join(dir, "spielgeld.json"));
    assert.equal(stat.mode & 0o077, 0, "keine Rechte für andere");
  });

  test("Zurücksetzen nur im angehaltenen Zustand", async () => {
    await desk.control({ action: "zuruecksetzen" });
    assert.equal((await desk.deskSnapshot()).status, "aus");
  });
});
