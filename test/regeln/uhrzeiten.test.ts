// Der Helfer für Prüfungen, die nicht von der Tageszeit abhängen dürfen (test/helfer/uhrzeiten.ts).

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { faelligerTermin, NACHHOL_FENSTER_MS, saeubereZeiten } from "../../src/lib/zeitplan";
import { ferneZeiten } from "../helfer/uhrzeiten";

describe("Prüfwerkzeug: Uhrzeiten fern von jetzt", () => {
  test("zu jeder Tageszeit ist keine der beiden Uhrzeiten fällig, auch nicht eine Stunde später", () => {
    for (let minuten = 0; minuten < 24 * 60; minuten += 7) {
      const now = new Date(2026, 10, 15, 0, minuten);
      const zeiten = ferneZeiten(now);
      assert.deepEqual(saeubereZeiten(zeiten), zeiten, "gültig und so sortiert, wie JARVIS sie speichert");
      assert.equal(zeiten.length, 2);
      for (const spaeter of [0, 20, 60]) {
        const dann = new Date(now.getTime() + spaeter * 60_000);
        assert.equal(faelligerTermin(zeiten, dann, null, NACHHOL_FENSTER_MS), null, `${zeiten.join(", ")} um ${dann.toTimeString().slice(0, 5)}`);
      }
    }
  });

  test("die Uhrzeiten ab Werk wären dagegen kurz nach 17:30 fällig (deshalb gibt es den Helfer)", () => {
    assert.notEqual(faelligerTermin(["07:30", "17:30"], new Date(2026, 10, 15, 18, 30), null, NACHHOL_FENSTER_MS), null);
  });
});
