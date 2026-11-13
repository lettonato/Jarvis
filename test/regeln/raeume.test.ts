// Die Räume des Glashauses (src/lib/raeume.ts): welche Adresse in welchen Raum führt, wohin die Kamera fährt,
// und dass zu jedem Fenster ein Foto mit Bildnachweis gehört. Reine Regeln, ohne Browser.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { PHOTOS } from "../../src/lib/photos";
import { fahrtArten, RAEUME, raumVon } from "../../src/lib/raeume";

const wurzel = path.resolve(import.meta.dirname, "../..");

describe("Räume", () => {
  test("jede Seite der App hat ihren Raum, und jeder Raum hat eine Seite", () => {
    const seiten = readdirSync(path.join(wurzel, "src/app"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(wurzel, "src/app", d.name, "page.tsx")))
      .map((d) => `/${d.name}`);
    for (const seite of seiten) {
      const raum = raumVon(seite);
      // /heute ist der Eingangsraum; alle anderen Seiten müssen ihren eigenen Raum treffen.
      assert.equal(raum.href, seite === "/heute" ? "/" : seite, `${seite} landet im falschen Raum`);
    }
    for (const raum of RAEUME) {
      if (raum.href === "/") continue;
      assert.ok(seiten.includes(raum.href), `zum Raum ${raum.name} fehlt die Seite ${raum.href}`);
    }
  });

  test("Anker und Suchteile der Adresse ändern den Raum nicht", () => {
    assert.equal(raumVon("/einstellungen#sicherheit").href, "/einstellungen");
    assert.equal(raumVon("/projekte?projekt=abc").href, "/projekte");
    assert.equal(raumVon("/heute").href, "/");
    assert.equal(raumVon("/gibt-es-nicht").href, "/");
  });

  test("die Kamera fährt in die Richtung, in der der Raum in der Leiste liegt", () => {
    assert.deepEqual(fahrtArten("/", "/projekte"), ["fahrt-rechts"]);
    assert.deepEqual(fahrtArten("/projekte", "/aufgaben"), ["fahrt-links"]);
    assert.deepEqual(fahrtArten("/einstellungen", "/einstellungen#sicherheit"), []);
    assert.deepEqual(fahrtArten("/heute", "/"), []);
  });

  test("jedes Fenster zeigt ein vorhandenes Foto, und zu jedem steht der Urheber im Bildnachweis", () => {
    const quellen = readFileSync(path.join(wurzel, "public/welt/QUELLEN.md"), "utf8");
    for (const raum of RAEUME) {
      assert.ok(existsSync(path.join(wurzel, "public/welt", `${raum.foto}.webp`)), `Foto für ${raum.name} fehlt`);
      const foto = PHOTOS[raum.foto as keyof typeof PHOTOS];
      assert.ok(foto, `kein Bildnachweis in der App für ${raum.foto}`);
      assert.equal(foto.src, `/welt/${raum.foto}.webp`);
      assert.ok(quellen.includes(`${raum.foto}.webp`) && quellen.includes(foto.author), `QUELLEN.md nennt ${raum.foto} oder ${foto.author} nicht`);
    }
  });
});
