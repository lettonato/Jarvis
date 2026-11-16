// Programme und Ordner am Mac öffnen (src/lib/server/desktop.ts), gegen ein nachgebautes /usr/bin/open, das nur
// aufschreibt, was es öffnen sollte. Geprüft wird die eine Regel, auf die es ankommt: An den Mac geht nur, was in
// der Liste steht und eingeschaltet ist, als fester Name oder feste Kennung, auf beiden Wegen (du am Mac und das
// KI-Gehirn über sein Werkzeug). Echte Programme werden nicht geöffnet, echte Einstellungen nicht berührt.

import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock, werkzeugErgebnisse, type ClaudeMock } from "../mocks/claude-mock";

sichereUmgebung("desktop");
const LOG = path.join(testOrdner("desktop-mac"), "aufrufe.log");
const OPEN = path.resolve("test/mocks/open-mock.mjs");
chmodSync(OPEN, 0o755);
Object.assign(process.env, { JARVIS_OPEN: OPEN, JARVIS_MAC_LOG: LOG });

let claude: ClaudeMock;
let desktop: typeof import("../../src/lib/server/desktop");
let config: typeof import("../../src/lib/server/config");
let einstellungen: typeof import("../../src/lib/server/einstellungen");
let brain: typeof import("../../src/lib/server/brain");
let gw: typeof import("../../src/lib/server/gateway/gateway");
let audit: typeof import("../../src/lib/server/gateway/audit");

// Was das nachgebaute open bekommen hat, je Aufruf die Argumente.
const aufrufe = (): string[][] =>
  existsSync(LOG)
    ? readFileSync(LOG, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((z) => (JSON.parse(z) as { args: string[] }).args)
    : [];
const fehler = async (lauf: Promise<unknown>, art: string, satz: RegExp) => {
  await assert.rejects(lauf, (e: unknown) => {
    assert.ok(e instanceof desktop.DesktopError, String(e));
    assert.equal(e.art, art);
    assert.match(e.message, satz);
    return true;
  });
};
const gut = async (aktion: Parameters<typeof einstellungen.aendereEinstellung>[0]) => {
  const r = await einstellungen.aendereEinstellung(aktion);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.config;
};
const schlecht = async (aktion: Parameters<typeof einstellungen.aendereEinstellung>[0], satz: RegExp) => {
  const r = await einstellungen.aendereEinstellung(aktion);
  assert.ok(!r.ok, "Die Änderung hätte abgelehnt werden müssen.");
  assert.match(r.error, satz);
};

before(async () => {
  claude = await starteClaudeMock();
  process.env.ANTHROPIC_BASE_URL = claude.url;
  desktop = await import("../../src/lib/server/desktop");
  config = await import("../../src/lib/server/config");
  einstellungen = await import("../../src/lib/server/einstellungen");
  brain = await import("../../src/lib/server/brain");
  gw = await import("../../src/lib/server/gateway/gateway");
  audit = await import("../../src/lib/server/gateway/audit");
});

after(async () => {
  await claude.stop();
});

beforeEach(async () => {
  rmSync(LOG, { force: true });
  for (const k of ["JARVIS_OPEN_FEHLT", "JARVIS_OPEN_HAENGT", "JARVIS_DESKTOP_FRIST_MS"]) delete process.env[k];
  process.env.JARVIS_OPEN = OPEN;
  await config.aendereConfig((c) => {
    delete c.desktop;
    return c;
  });
});

describe("Öffnen am Mac: nur was in der Liste steht", () => {
  test("ein Programm von Apple über seine Kennung, ein anderes über seinen Namen, ein Ordner über den Pfad im Benutzerordner", async () => {
    assert.equal((await desktop.oeffneZiel("safari")).name, "Safari");
    await desktop.oeffneZiel("excel");
    await desktop.oeffneZiel("downloads");
    await desktop.oeffneZiel("systemeinstellungen");
    assert.deepEqual(aufrufe(), [["-b", "com.apple.Safari"], ["-a", "Microsoft Excel"], [path.join(os.homedir(), "Downloads")], ["-b", "com.apple.systempreferences"]]);
  });

  test("was nicht in der Liste steht, erreicht den Mac nie: fremde Namen, Pfade, Schalter, falsche Typen", async () => {
    for (const id of ["terminal", "Terminal", "/Applications/Safari.app", "-a Terminal", "eigen:terminal", "eigen:/tmp/boese.app", "safari ", "SAFARI", "", "__proto__", "constructor", null, undefined, 7, {}, ["safari"]]) {
      await fehler(desktop.oeffneZiel(id), "unbekannt", /steht nicht auf der Liste/);
    }
    assert.deepEqual(aufrufe(), []);
  });

  test("ein ausgeschaltetes Ziel wird nicht geöffnet, ein wieder eingeschaltetes schon", async () => {
    await gut({ action: "desktopSchalter", id: "safari", an: false });
    await fehler(desktop.oeffneZiel("safari"), "aus", /Safari ist in den Einstellungen unter „Programme“ ausgeschaltet/);
    assert.deepEqual(aufrufe(), []);
    await desktop.oeffneZiel("word");
    await gut({ action: "desktopSchalter", id: "safari", an: true });
    await desktop.oeffneZiel("safari");
    assert.deepEqual(aufrufe(), [["-a", "Microsoft Word"], ["-b", "com.apple.Safari"]]);
  });

  test("ein eigenes Programm geht mit genau dem geprüften Namen an den Mac", async () => {
    await gut({ action: "desktopNeu", name: "  Affinity   Designer 2.app " });
    assert.equal((await desktop.oeffneZiel("eigen:affinity designer 2")).name, "Affinity Designer 2");
    assert.deepEqual(aufrufe(), [["-a", "Affinity Designer 2"]]);
  });

  test("steht in der Einstellungsdatei von Hand ein Pfad, wird er nie geöffnet", async () => {
    await config.aendereConfig((c) => ({ ...c, desktop: { eigene: ["/tmp/boese.app", "-b com.boese", "Notion"] } }));
    const ziele = desktop.desktopStatus(await config.readConfig()).ziele.filter((z) => z.eigen);
    assert.deepEqual(ziele.map((z) => z.id), ["eigen:notion"]);
    await fehler(desktop.oeffneZiel("eigen:/tmp/boese.app"), "unbekannt", /Liste/);
    await fehler(desktop.oeffneZiel("eigen:-b com.boese"), "unbekannt", /Liste/);
    assert.deepEqual(aufrufe(), []);
  });

  test("öffnet der Mac es nicht, sagt JARVIS das mit eigenem Satz, nie mit dem Text des Macs, und behauptet keinen Grund", async () => {
    process.env.JARVIS_OPEN_FEHLT = "Spotify|Pictures|com.apple.finder";
    await fehler(desktop.oeffneZiel("spotify"), "nicht-geoeffnet", /^Ich konnte Spotify nicht öffnen\. Vielleicht ist das Programm auf diesem Mac nicht installiert\.$/);
    await fehler(desktop.oeffneZiel("bilder"), "nicht-geoeffnet", /^Ich konnte den Ordner Bilder nicht öffnen\. Vielleicht gibt es ihn auf diesem Mac nicht\.$/);
    await fehler(desktop.oeffneZiel("finder"), "nicht-geoeffnet", /^Ich konnte den Finder nicht öffnen\. Vielleicht ist das Programm auf diesem Mac nicht installiert\.$/);
    // Der Mac wurde gefragt; geöffnet hat er nichts.
    assert.equal(aufrufe().length, 3);
    // Fehlt der Befehl zum Öffnen ganz, ist es derselbe Satz und kein Absturz.
    process.env.JARVIS_OPEN = "/gibt/es/nicht/open";
    await fehler(desktop.oeffneZiel("safari"), "nicht-geoeffnet", /^Ich konnte Safari nicht öffnen\./);
  });

  test("antwortet der Mac nicht rechtzeitig, weiß JARVIS nicht, ob es offen ist, und sagt das", async () => {
    Object.assign(process.env, { JARVIS_OPEN_HAENGT: "1", JARVIS_DESKTOP_FRIST_MS: "300" });
    const start = Date.now();
    await fehler(desktop.oeffneZiel("safari"), "unklar", /nicht rechtzeitig geantwortet/);
    assert.ok(Date.now() - start < 5000, "wartet nicht länger als die Frist");
  });

  test("läuft JARVIS nicht auf einem Mac, versucht er es gar nicht", { skip: process.platform === "darwin" }, async () => {
    delete process.env.JARVIS_OPEN;
    assert.equal(desktop.desktopStatus(await config.readConfig()).moeglich, false);
    await fehler(desktop.oeffneZiel("safari"), "kein-mac", /nur auf dem Mac/);
    process.env.JARVIS_OPEN = OPEN;
    assert.equal(desktop.desktopStatus(await config.readConfig()).moeglich, true);
    assert.deepEqual(aufrufe(), []);
  });
});

describe("Öffnen auf Zuruf am Mac: steht im Protokoll", () => {
  test("geöffnet und abgelehnt, mit dem Namen aus der Liste und nie mit dem, was angefragt wurde", async () => {
    await desktop.oeffneAufZuruf("safari");
    await assert.rejects(desktop.oeffneAufZuruf("/Applications/Geheim sk-ant-api03-abcdefghijk.app"));
    process.env.JARVIS_OPEN_FEHLT = "Spotify";
    await assert.rejects(desktop.oeffneAufZuruf("spotify"));
    const zeilen = (await audit.leseAudit(5)).filter((e) => e.art === "desktop").map((e) => `${e.agent}/${e.kanal} ${e.was} → ${e.ergebnis}`);
    assert.deepEqual(zeilen.toSorted(), ["mensch/mac Öffnen: Safari → geoeffnet", "mensch/mac Öffnen: Spotify → fehler:nicht-geoeffnet", "mensch/mac Öffnen: nicht auf der Liste → abgelehnt:unbekannt"].toSorted());
    assert.ok(!JSON.stringify(await audit.leseAudit(5)).includes("Geheim"));
  });
});

describe("Einstellungen: Schalter und eigene Programme", () => {
  test("der Schalter kennt nur Ziele, die es gibt, und merkt sich nichts doppelt", async () => {
    await schlecht({ action: "desktopSchalter", id: "terminal", an: false }, /gibt es nicht/);
    await schlecht({ action: "desktopSchalter", id: "safari", an: "nein" as unknown as boolean }, /Ungültige Anfrage/);
    await gut({ action: "desktopSchalter", id: "safari", an: false });
    const c = await gut({ action: "desktopSchalter", id: "safari", an: false });
    assert.deepEqual(c.desktop, { aus: ["safari"] });
    assert.deepEqual((await gut({ action: "desktopSchalter", id: "safari", an: true })).desktop, { aus: [] });
  });

  test("ein eigenes Programm: Name wird geprüft, nichts doppelt, höchstens zwölf", async () => {
    for (const name of ["", "X", "/Applications/Boese.app", "-a Terminal", "../x", "Safari; rm -rf ~", "a".repeat(61)]) {
      await schlecht({ action: "desktopNeu", name }, /So kann ein Programm nicht heißen/);
    }
    for (const name of ["safari", "Microsoft Excel", "Notes", "Ordner Bilder", "Programm Safari"]) await schlecht({ action: "desktopNeu", name }, /steht schon in der Liste/);
    for (const name of ["Mail", "Kalender", "Projekte"]) await schlecht({ action: "desktopNeu", name }, /heißt in JARVIS schon etwas anderes/);
    assert.equal((await config.readConfig()).desktop, undefined, "nichts davon wurde gespeichert");
    await gut({ action: "desktopNeu", name: "Notion" });
    await schlecht({ action: "desktopNeu", name: "notion.app" }, /steht schon in der Liste/);
    for (let i = 2; i <= 12; i++) await gut({ action: "desktopNeu", name: `Programm ${i}` });
    await schlecht({ action: "desktopNeu", name: "Programm 13" }, /höchstens 12/);
    assert.equal(desktop.desktopStatus(await config.readConfig()).ziele.filter((z) => z.eigen).length, 12);
  });

  test("entfernen geht nur bei eigenen; ein ausgeschaltetes eigenes verschwindet ganz", async () => {
    await gut({ action: "desktopNeu", name: "Notion" });
    await gut({ action: "desktopSchalter", id: "eigen:notion", an: false });
    await schlecht({ action: "desktopWeg", id: "safari" }, /Feste Programme lassen sich nur ausschalten/);
    await schlecht({ action: "desktopWeg", id: "eigen:gibtesnicht" }, /gibt es nicht/);
    assert.deepEqual((await gut({ action: "desktopWeg", id: "eigen:notion" })).desktop, { aus: [], eigene: [] });
    // Neu eingetragen ist es wieder an, nicht still ausgeschaltet.
    await gut({ action: "desktopNeu", name: "Notion" });
    assert.equal(desktop.desktopStatus(await config.readConfig()).ziele.at(-1)?.an, true);
  });

  test("steht ein eigenes Programm noch als ausgeschaltet in der Datei, ist es neu eingetragen trotzdem an", async () => {
    // So bleibt es zurück, wenn jemand den Namen von Hand aus der Datei nimmt, den Schalter aber nicht.
    writeFileSync(path.join(process.env.JARVIS_CONFIG_DIR!, "config.json"), JSON.stringify({ name: "Benedikt", desktop: { aus: ["word", "eigen:notion"], eigene: [] } }));
    assert.deepEqual((await gut({ action: "desktopNeu", name: "Notion" })).desktop, { aus: ["word"], eigene: ["Notion"] });
    assert.equal(desktop.desktopStatus(await config.readConfig()).ziele.at(-1)?.an, true);
    await desktop.oeffneZiel("eigen:notion");
    assert.deepEqual(aufrufe(), [["-a", "Notion"]]);
  });

  test("eine abgelehnte Änderung schreibt die Einstellungsdatei nicht neu", async () => {
    await gut({ action: "desktopNeu", name: "Notion" });
    const datei = path.join(process.env.JARVIS_CONFIG_DIR!, "config.json");
    const vorher = { zeit: statSync(datei).mtimeMs, inhalt: readFileSync(datei, "utf8") };
    await new Promise((r) => setTimeout(r, 20));
    await schlecht({ action: "desktopNeu", name: "Notion" }, /steht schon in der Liste/);
    await schlecht({ action: "desktopNeu", name: "Mail" }, /heißt in JARVIS schon etwas anderes/);
    assert.deepEqual({ zeit: statSync(datei).mtimeMs, inhalt: readFileSync(datei, "utf8") }, vorher);
  });

  test("steht in der Einstellungsdatei von Hand etwas Falsches, arbeiten Schalter und eigene Programme trotzdem richtig", async () => {
    const datei = path.join(process.env.JARVIS_CONFIG_DIR!, "config.json");
    for (const kaputt of [{ aus: "safari", eigene: "Notion" }, { aus: { safari: true }, eigene: 7 }, "unsinn", [1, 2]]) {
      writeFileSync(datei, JSON.stringify({ name: "Benedikt", desktop: kaputt }));
      const c = await gut({ action: "desktopSchalter", id: "word", an: false });
      assert.deepEqual(c.desktop?.aus, ["word"], JSON.stringify(kaputt));
      assert.deepEqual((await gut({ action: "desktopNeu", name: "Notion" })).desktop, { aus: ["word"], eigene: ["Notion"] }, JSON.stringify(kaputt));
      assert.deepEqual((await gut({ action: "desktopWeg", id: "eigen:notion" })).desktop, { aus: ["word"], eigene: [] }, JSON.stringify(kaputt));
    }
  });

  test("zwei Änderungen zugleich überschreiben einander nicht", async () => {
    await Promise.all([gut({ action: "desktopSchalter", id: "safari", an: false }), gut({ action: "desktopNeu", name: "Notion" }), gut({ action: "desktopSchalter", id: "word", an: false }), gut({ action: "name", name: "Bene" })]);
    const c = await config.readConfig();
    assert.deepEqual([...(c.desktop?.aus ?? [])].sort(), ["safari", "word"]);
    assert.deepEqual(c.desktop?.eigene, ["Notion"]);
    assert.equal(c.name, "Bene");
  });
});

describe("Das KI-Gehirn öffnet nur aus derselben Liste", () => {
  const frage = (text: string, channel?: "telegram") => ({ text, history: [], view: "/", focus: null, extra: [], ...(channel ? { channel } : {}) });
  const mitSchluessel = async () => ({ ...(await config.readConfig()), claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
  const werkzeug = () => (claude.anfragen[0].tools as { name: string; input_schema?: { properties?: { name?: { enum?: string[] } } } }[]).find((t) => t.name === "programm_oeffnen");

  test("es bekommt genau die eingeschalteten Ziele zur Auswahl, am Handy gar keins", async () => {
    await gut({ action: "desktopSchalter", id: "excel", an: false });
    await gut({ action: "desktopNeu", name: "Notion" });
    claude.drehbuch([{ text: "Ok." }]);
    await brain.think(await mitSchluessel(), "sk-test", frage("Hallo"));
    const namen = werkzeug()?.input_schema?.properties?.name?.enum ?? [];
    assert.ok(namen.includes("Safari") && namen.includes("Ordner Downloads") && namen.includes("Notion"), namen.join(", "));
    assert.ok(!namen.includes("Excel"));
    claude.drehbuch([{ text: "Ok." }]);
    await brain.think(await mitSchluessel(), "sk-test", frage("Hallo", "telegram"));
    assert.equal(werkzeug(), undefined);
  });

  test("ohne Mac und ohne eingeschaltetes Ziel gibt es das Werkzeug nicht", { skip: process.platform === "darwin" }, async () => {
    delete process.env.JARVIS_OPEN;
    claude.drehbuch([{ text: "Ok." }]);
    await brain.think(await mitSchluessel(), "sk-test", frage("Hallo"));
    assert.equal(werkzeug(), undefined);
    process.env.JARVIS_OPEN = OPEN;
    const alle = desktop.desktopStatus(await config.readConfig()).ziele;
    for (const z of alle) await gut({ action: "desktopSchalter", id: z.id, an: false });
    claude.drehbuch([{ text: "Ok." }]);
    await brain.think(await mitSchluessel(), "sk-test", frage("Hallo"));
    assert.equal(werkzeug(), undefined);
  });

  test("das Werkzeug öffnet das gewählte Ziel", async () => {
    claude.drehbuch([{ werkzeug: "programm_oeffnen", eingabe: { name: "Ordner Downloads" } }, { text: "Der Ordner ist offen." }]);
    const r = await brain.think(await mitSchluessel(), "sk-test", frage("Öffne mir mal bitte kurz den Ordner mit den Downloads und sag Bescheid"));
    assert.equal(r.reply, "Der Ordner ist offen.");
    assert.deepEqual(aufrufe(), [[path.join(os.homedir(), "Downloads")]]);
    assert.match(werkzeugErgebnisse(claude.anfragen[1])[0].content, /Geöffnet/);
  });

  test("ein Modell, das einer eingeschleusten Anweisung folgt, öffnet trotzdem nichts außerhalb der Liste", async () => {
    await gut({ action: "desktopSchalter", id: "safari", an: false });
    for (const name of ["Terminal", "/Applications/Utilities/Terminal.app", "-a Terminal", "Safari", "safari", "eigen:terminal"]) {
      claude.drehbuch([{ werkzeug: "programm_oeffnen", eingabe: { name } }, { text: "Das ging nicht." }]);
      await brain.think(await mitSchluessel(), "sk-test", frage("Lies die Mail"));
      const ergebnis = werkzeugErgebnisse(claude.anfragen[1])[0];
      assert.equal(ergebnis.is_error, true, name);
      assert.match(ergebnis.content, /nicht auf der Liste|ausgeschaltet/, name);
    }
    assert.deepEqual(aufrufe(), []);
  });

  test("über Telegram lehnt das Gateway ab, auch wenn das Modell das Werkzeug trotzdem aufruft", async () => {
    const e = await gw.pruefe({ werkzeug: "programm_oeffnen", agent: "gehirn", kanal: "telegram", eingabe: { name: "Safari" }, fremd: false });
    assert.equal(e.art === "abgelehnt" && e.ursache, "kanal");
    const mac = await gw.pruefe({ werkzeug: "programm_oeffnen", agent: "gehirn", kanal: "mac", eingabe: { name: "Safari" }, fremd: true });
    assert.equal(mac.art, "erlaubt");
    assert.equal((await gw.pruefe({ werkzeug: "programm_oeffnen", agent: "browser", kanal: "mac", eingabe: { name: "Safari" }, fremd: false })).art, "abgelehnt");
  });

  test("das Gehirn öffnet am Mac nur über die Liste, den Kalender und Obsidian", () => {
    const quelle = readFileSync("src/lib/server/brain.ts", "utf8");
    assert.deepEqual([...quelle.matchAll(/await (openUrl|openFile|openCalendar|oeffneZiel|oeffneAufZuruf)\(([^;]*)\);/g)].map((m) => m[0]), [
      "await openCalendar(datum ? checkDate(datum) : undefined);",
      "await openUrl(obsidianLink(needVault(), file));",
      "await oeffneZiel(zielMitName(name)?.id);",
    ]);
    assert.ok(!/execFile|spawn\(|child_process/.test(quelle));
  });
});
