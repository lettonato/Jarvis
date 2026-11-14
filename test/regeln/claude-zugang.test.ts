// Die eine Stelle, an der JARVIS die Verbindung zu Claude aufbaut (src/lib/server/claude.ts). Soll Claude
// später über einen anderen Zugang laufen (zum Beispiel über Microsoft Foundry in eurem Azure), ändert sich
// nur diese Datei. Geprüft wird: Keine andere Datei baut sich eine eigene Verbindung, und jede Rolle behält
// ihre Geduld (Wartezeit und Wiederholungen) von vorher.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { claudeFuer, CLAUDE_GEDULD } from "../../src/lib/server/claude";
import { MODELLE } from "../../src/lib/modelle";

const dateien = (ordner: string): string[] => readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? dateien(path.join(ordner, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(ordner, e.name)] : []));

describe("Zugang zu Claude an einer Stelle", () => {
  test("nur src/lib/server/claude.ts baut eine Verbindung zu Claude auf", () => {
    const bauen = dateien("src").filter((d) => /new\s+Anthropic\w*\s*\(/.test(readFileSync(d, "utf8")));
    assert.deepEqual(bauen, [path.join("src", "lib", "server", "claude.ts")]);
  });

  test("jede Rolle aus der Modellwahl hat ihre Geduld, und sie ist unverändert", () => {
    assert.deepEqual(Object.keys(CLAUDE_GEDULD).sort(), Object.keys(MODELLE).sort());
    assert.deepEqual(CLAUDE_GEDULD, {
      gespraech: { timeout: 60_000, maxRetries: 1 },
      browser: { timeout: 90_000, maxRetries: 1 },
      analyst: { timeout: 15 * 60_000, maxRetries: 2 },
      chief: { timeout: 60_000, maxRetries: 1 },
    });
  });

  test("die Verbindung trägt Schlüssel und Geduld der Rolle", () => {
    const client = claudeFuer("analyst", "sk-test-nur-fuer-diesen-test");
    assert.equal(client.apiKey, "sk-test-nur-fuer-diesen-test");
    assert.equal(client.timeout, 15 * 60_000);
    assert.equal(client.maxRetries, 2);
    assert.equal(claudeFuer("gespraech", "sk-test").timeout, 60_000);
  });
});
