// Kleine Verweise und Knöpfe bekommen ihre Klickfläche (mindestens 24 Pixel hoch) über die Klasse „griff“, alles
// zum Aufklappen (summary) von selbst: unsichtbarer Rand oben und unten, nach außen wieder weggenommen
// (src/app/globals.css). Das geht nur auf, wenn am selben Element kein eigener Abstand nach oben oder unten steht.
// Gemessen wird die Höhe im Browser (test/hand/vorlesen-rauch.ts); hier steht nur, was sich ohne Browser sagen lässt.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

const dateien = (ordner: string): string[] =>
  readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? dateien(path.join(ordner, e.name)) : e.name.endsWith(".tsx") ? [path.join(ordner, e.name)] : []));

// Abstand oder Rand nach oben oder unten als Klasse: p-2, py-1, pt-0.5, m-1, my-2, mt-3, -mb-1, max-sm:mt-2 …
const SENKRECHT = /(^|[\s:])-?(p|py|pt|pb|m|my|mt|mb)-[\d[]/;

describe("Klickflächen", () => {
  const quellen = dateien("src").map((datei) => ({ datei, text: readFileSync(datei, "utf8") }));

  test("die Regel steht in der Ebene der Bausteine und gilt für .griff und summary", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const ebene = css.slice(css.indexOf("@layer components {"));
    assert.match(ebene, /^@layer components \{\s*\.griff,\s*summary \{\s*padding-block: 6px;\s*margin-block: -6px;\s*\}/);
    assert.match(ebene, /label:has\(> input\[type="checkbox"\]\),\s*label:has\(> input\[type="radio"\]\) \{\s*min-height: 24px;/);
  });

  test("an einem Element mit „griff“ steht kein eigener Abstand nach oben oder unten", () => {
    const treffer: string[] = [];
    let gezaehlt = 0;
    for (const { datei, text } of quellen)
      for (const m of text.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const klassen = m[1] ?? m[2];
        if (!/(^|\s)griff(\s|$)/.test(klassen)) continue;
        gezaehlt++;
        if (SENKRECHT.test(klassen)) treffer.push(`${datei}: ${klassen}`);
      }
    assert.ok(gezaehlt >= 10, `die Klasse wird benutzt (${gezaehlt} Stellen)`);
    assert.deepEqual(treffer, []);
  });

  test("an keinem summary steht ein eigener Abstand nach oben oder unten", () => {
    const treffer: string[] = [];
    let gezaehlt = 0;
    for (const { datei, text } of quellen)
      for (const m of text.matchAll(/<summary\b([^>]*)>/g)) {
        gezaehlt++;
        if (SENKRECHT.test(/className="([^"]*)"/.exec(m[1])?.[1] ?? "")) treffer.push(`${datei}: ${m[1].trim()}`);
        // Eine zusammengesetzte Klasse ließe sich hier nicht lesen.
        assert.ok(!m[1].includes("className={"), `${datei}: summary mit fester Klasse`);
      }
    assert.ok(gezaehlt >= 5, `es gibt Aufklapper (${gezaehlt})`);
    assert.deepEqual(treffer, []);
  });

  test("die Regel erkennt einen Abstand, wenn einer dasteht", () => {
    for (const k of ["griff mt-3 inline-flex", "griff py-1", "-mb-1 griff", "griff max-sm:pt-2", "griff m-[3px]"]) assert.ok(SENKRECHT.test(k), k);
    for (const k of ["griff font-bold", "griff shrink-0 text-sm", "griff min-w-0 gap-1.5 px-2 mx-1 ml-2"]) assert.ok(!SENKRECHT.test(k), k);
  });
});
