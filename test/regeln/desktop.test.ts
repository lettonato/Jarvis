// Programme und Ordner am Mac auf Zuruf öffnen (src/lib/desktop.ts): welche es gibt, wie ein eigenes Programm heißen
// darf, und welcher Satz als „öffne …“ gilt. Reine Regeln; ob der Mac wirklich nur Erlaubtes öffnet, prüft
// test/module/desktop.test.ts, die Seite prüft test/hand/desktop-rauch.ts.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decide, type CommandContext } from "../../src/lib/commands";
import { ausVon, EIGENE_HOECHSTENS, FESTE_ZIELE, findeZiel, programmName, zielName, zieleVon, type DesktopStatus } from "../../src/lib/desktop";

const ALLE = zieleVon(undefined);
const MIT_EIGENEM = zieleVon({ aus: ["excel"], eigene: ["Affinity Designer 2", "DATEV Arbeitsplatz"] });
const id = (satz: string, ziele = MIT_EIGENEM) => findeZiel(satz, ziele)?.id ?? null;

describe("Die Liste der Programme und Ordner", () => {
  test("ohne eigene Einstellung ist jedes feste Ziel eingeschaltet, und es gibt kein eigenes", () => {
    assert.equal(ALLE.length, FESTE_ZIELE.length);
    assert.ok(ALLE.every((z) => z.an && !z.eigen));
    assert.equal(new Set(ALLE.map((z) => z.id)).size, ALLE.length, "jede Kennung nur einmal");
    for (const n of ["Safari", "Outlook", "Teams", "Excel", "Word", "Finder", "Downloads", "Schreibtisch"]) assert.ok(ALLE.some((z) => z.name === n), n);
  });

  test("ein festes Programm hat genau einen Weg zum Mac: einen Namen oder eine Kennung von Apple, nie einen Pfad", () => {
    for (const z of FESTE_ZIELE.filter((z) => z.art === "programm")) {
      assert.equal(Boolean(z.app) !== Boolean(z.paket), true, z.id);
      if (z.app) assert.match(z.app, /^[A-Za-z][A-Za-z ]+$/, z.id);
      if (z.paket) assert.match(z.paket, /^com\.apple\.[A-Za-z]+$/, z.id);
      assert.equal(z.ordner, undefined, z.id);
    }
  });

  test("ein fester Ordner liegt direkt im Benutzerordner", () => {
    const ordner = FESTE_ZIELE.filter((z) => z.art === "ordner");
    assert.deepEqual(ordner.map((z) => z.ordner).sort(), ["Desktop", "Documents", "Downloads", "Pictures"]);
    for (const z of ordner) assert.equal(z.app ?? z.paket, undefined, z.id);
  });

  test("ausgeschaltet bleibt in der Liste, eigene Programme stehen hinten", () => {
    assert.equal(MIT_EIGENEM.find((z) => z.id === "excel")?.an, false);
    assert.equal(MIT_EIGENEM.find((z) => z.id === "word")?.an, true);
    assert.deepEqual(
      MIT_EIGENEM.slice(-2).map((z) => ({ ...z })),
      [
        { id: "eigen:affinity designer 2", art: "programm", name: "Affinity Designer 2", an: true, eigen: true },
        { id: "eigen:datev arbeitsplatz", art: "programm", name: "DATEV Arbeitsplatz", an: true, eigen: true },
      ],
    );
    assert.equal(zieleVon({ aus: ["eigen:notion"], eigene: ["Notion"] }).at(-1)?.an, false, "auch ein eigenes lässt sich ausschalten");
  });

  test("was von Hand in der Einstellungsdatei steht und kein Programmname ist, kommt nicht in die Liste", () => {
    const ziele = zieleVon({ eigene: ["/Applications/Boese.app", "-a Terminal", "Notion", "Notion", "notion ", "../x", 7 as unknown as string] });
    assert.deepEqual(
      ziele.filter((z) => z.eigen).map((z) => z.name),
      ["Notion"],
    );
    const viele = zieleVon({ eigene: Array.from({ length: 40 }, (_, i) => `Programm ${i + 1}`) });
    assert.equal(viele.filter((z) => z.eigen).length, EIGENE_HOECHSTENS);
    // Ein eigenes, das so heißt wie ein festes, wäre zweimal dasselbe Wort.
    assert.equal(zieleVon({ eigene: ["Safari", "excel"] }).filter((z) => z.eigen).length, 0);
    // Auch mit falschen Typen in der Datei bleibt die Liste, wie sie ohne Einstellung wäre.
    assert.deepEqual(zieleVon({ aus: "safari", eigene: "Notion" } as never), ALLE);
    assert.deepEqual(zieleVon({ aus: [7, null, "word"], eigene: { 0: "Notion" } } as never).filter((z) => !z.an).map((z) => z.id), ["word"]);
    for (const falsch of [5, {}, true, { safari: true }]) assert.deepEqual(zieleVon({ aus: falsch } as never), ALLE, JSON.stringify(falsch));
    // Was beim nächsten Speichern zurück in die Datei ginge, sind nur die Kennungen.
    assert.deepEqual(ausVon({ aus: [7, null, "word", ["safari"]] } as never), ["word"]);
    assert.deepEqual(ausVon({ aus: "safari" } as never), []);
  });

  test("ein eigenes Programm kann nicht heißen wie ein festes Ziel, auch nicht auf Umwegen", () => {
    // Der Name am Mac, der englische Name, „Ordner …“ und „Programm …“ davor: „öffne …“ meint damit schon ein festes Ziel.
    const eigene = ["Microsoft Excel", "Google Chrome", "Notes", "Calculator", "System Settings", "Apple Mail", "Ordner Bilder", "Ordner Downloads", "Programm Safari", "App Excel", "Die Vorschau", "Downloads"];
    assert.deepEqual(zieleVon({ eigene }).filter((z) => z.eigen), []);
    // Jedes Ziel hat einen eigenen Namen für das KI-Gehirn und das Protokoll.
    const ziele = zieleVon({ eigene: [...eigene, "App Store", "Ordner Manager", "Bilder Pro"] });
    assert.equal(new Set(ziele.map(zielName)).size, ziele.length);
    assert.deepEqual(ziele.filter((z) => z.eigen).map((z) => z.name), ["App Store", "Ordner Manager", "Bilder Pro"]);
  });

  test("ein eigenes Programm kann nicht heißen wie ein Raum oder ein fester Befehl von JARVIS", () => {
    const vergeben = ["Mail", "Mails", "Post", "Kalender", "Notizen", "Obsidian", "Dokumente", "Bilder", "Aufgaben", "Projekte", "Einstellungen", "Browser", "Intel", "Nachrichten", "Trading", "Agenten", "Heute", "Briefing", "JARVIS"];
    assert.deepEqual(zieleVon({ eigene: vergeben }).filter((z) => z.eigen), []);
    // Mit einem Zusatz ist es ein anderes Wort.
    assert.deepEqual(zieleVon({ eigene: ["Mail Pilot", "Kalender Pro"] }).filter((z) => z.eigen).map((z) => z.name), ["Mail Pilot", "Kalender Pro"]);
  });
});

describe("Wie ein eigenes Programm heißen darf", () => {
  test("ein Name, wie er im Ordner Programme steht", () => {
    for (const [roh, name] of [
      ["Notion", "Notion"],
      ["  Affinity   Designer 2 ", "Affinity Designer 2"],
      ["1Password", "1Password"],
      ["DATEV Arbeitsplatz", "DATEV Arbeitsplatz"],
      ["Büro+", "Büro+"],
      ["Notion.app", "Notion"],
      ["Final Cut Pro", "Final Cut Pro"],
      ["AT&T Office", "AT&T Office"],
      ["Microsoft Teams (work or school)", "Microsoft Teams (work or school)"],
      ["Spark – Email App by Readdle", "Spark – Email App by Readdle"],
      ["Yoink - Improved Drag and Drop", "Yoink - Improved Drag and Drop"],
      ["Things 3", "Things 3"],
      ["1Blocker_Pro", "1Blocker_Pro"],
      ["Wow, toll!", "Wow, toll!"],
    ] as const) {
      assert.equal(programmName(roh), name, roh);
    }
  });

  test("kein Pfad, kein Schalter für den Befehl, keine Sonderzeichen, nicht zu kurz und nicht zu lang", () => {
    for (const roh of [
      "",
      " ",
      "X",
      "-a Terminal",
      "--args",
      "/Applications/Boese.app",
      "~/Boese.app",
      "../Boese",
      "Ordner/Programm",
      "Boese.app/Contents",
      "C:\\Programm",
      "Safari; rm -rf ~",
      "Safari\nTerminal",
      "Safari\u0000",
      "$(whoami)",
      "`id`",
      'Sa"fari',
      "file://x",
      "Toggl Track: Stunden",
      "(Klammer vorn)",
      "Stern*",
      "Frage?",
      "a|b",
      "a>b",
      "a".repeat(61),
      null,
      undefined,
      7,
      {},
    ]) {
      assert.equal(programmName(roh), null, String(roh));
    }
  });
});

describe("Welcher Satz „öffne …“ heißt", () => {
  test("öffnen, starten, aufmachen, in jeder üblichen Stellung", () => {
    for (const satz of [
      "öffne safari",
      "Öffne Safari.",
      "starte safari",
      "öffne bitte safari",
      "öffne mal safari",
      "mach safari auf",
      "mach mir bitte safari auf",
      "safari öffnen",
      "safari starten",
      "kannst du safari öffnen",
      "könntest du mir bitte safari aufmachen",
      "öffne das programm safari",
      "starte die app safari",
      "öffne mir safari bitte",
    ]) {
      assert.equal(id(satz), "safari", satz);
    }
  });

  test("so, wie die Programme gesprochen und vom Erkenner geschrieben werden", () => {
    for (const [satz, ziel] of [
      ["öffne outlook", "outlook"],
      ["starte teams", "teams"],
      ["öffne microsoft teams", "teams"],
      ["öffne word", "word"],
      ["öffne powerpoint", "powerpoint"],
      ["öffne power point", "powerpoint"],
      ["öffne chrome", "chrome"],
      ["öffne google chrome", "chrome"],
      ["öffne den finder", "finder"],
      ["öffne den rechner", "rechner"],
      ["öffne den taschenrechner", "rechner"],
      ["öffne die vorschau", "vorschau"],
      ["öffne die systemeinstellungen", "systemeinstellungen"],
      ["öffne apple mail", "mail"],
      ["öffne die mail-app", "mail"],
      ["öffne das mailprogramm", "mail"],
      ["öffne die notizen-app", "notizen"],
      ["öffne die erinnerungen", "erinnerungen"],
      ["öffne whatsapp", "whatsapp"],
      ["öffne whats app", "whatsapp"],
      ["öffne spotify", "spotify"],
      ["öffne affinity designer 2", "eigen:affinity designer 2"],
      ["starte datev arbeitsplatz", "eigen:datev arbeitsplatz"],
      ["öffne notes", "notizen"],
      ["öffne calculator", "rechner"],
      ["öffne system settings", "systemeinstellungen"],
    ] as const) {
      assert.equal(id(satz), ziel, satz);
    }
  });

  test("ein eigenes Programm, dessen Name wie ein Artikel, wie „App“ oder wie ein Füllwort beginnt", () => {
    const ziele = zieleVon({ eigene: ["App Store", "Die Zeit", "Der Spiegel", "Mal Studio", "Microsoft Teams (work or school)"] });
    for (const [satz, ziel] of [
      ["öffne app store", "eigen:app store"],
      ["öffne den app store", "eigen:app store"],
      ["öffne bitte mal den app store", "eigen:app store"],
      ["app store öffnen", "eigen:app store"],
      ["öffne die app app store", "eigen:app store"],
      ["starte die zeit", "eigen:die zeit"],
      ["öffne das programm die zeit", "eigen:die zeit"],
      ["mach der spiegel auf", "eigen:der spiegel"],
      ["öffne mal studio", "eigen:mal studio"],
      ["öffne microsoft teams work or school", "eigen:microsoft teams (work or school)"],
      // Die festen Ziele bleiben daneben, was sie waren.
      ["öffne die app safari", "safari"],
      ["öffne teams", "teams"],
    ] as const) {
      assert.equal(findeZiel(satz, ziele)?.id ?? null, ziel, satz);
    }
    assert.equal(findeZiel("öffne store", ziele), null);
    assert.equal(findeZiel("öffne zeit", ziele), null);
  });

  test("Ordner: auch mit „zeig mir“", () => {
    for (const [satz, ziel] of [
      ["öffne den ordner downloads", "downloads"],
      ["öffne die downloads", "downloads"],
      ["zeig mir die downloads", "downloads"],
      ["zeige den download-ordner", "downloads"],
      ["öffne den schreibtisch", "schreibtisch"],
      ["zeig mir den schreibtisch", "schreibtisch"],
      ["öffne den ordner dokumente", "dokumente"],
      ["öffne den dokumentenordner", "dokumente"],
      ["öffne den ordner bilder", "bilder"],
      ["ordner downloads öffnen", "downloads"],
    ] as const) {
      assert.equal(id(satz), ziel, satz);
    }
  });

  test("ein ausgeschaltetes Ziel wird erkannt (damit JARVIS sagen kann, dass es aus ist)", () => {
    const z = findeZiel("öffne excel", MIT_EIGENEM);
    assert.equal(z?.id, "excel");
    assert.equal(z?.an, false);
  });

  test("kein Öffnen: nur der Name, eine Frage, ein längerer Auftrag, ein unbekanntes Programm", () => {
    for (const satz of [
      "safari",
      "öffne",
      "",
      "was ist safari",
      "öffne safari und such nach hotels",
      "öffne die excel datei umsatz",
      "öffne terminal",
      "öffne photoshop",
      "schließe safari",
      "mach safari zu",
      "mach safari",
      "safari auf",
      "zeig mir safari",
      "öffne safari nicht",
      "öffne den ordner safari",
      "öffne das programm downloads",
    ]) {
      assert.equal(id(satz), null, satz);
    }
  });

  test("Wörter, die in JARVIS schon etwas anderes heißen, bleiben, was sie waren", () => {
    // Räume und die alten festen Befehle: Kalender, Obsidian, Dokumente, Einstellungen, Notizen, Post, Browser.
    for (const satz of ["öffne den kalender", "öffne obsidian", "öffne dokumente", "öffne die dokumente", "öffne die einstellungen", "öffne notizen", "öffne die post", "öffne mail", "öffne meine mails", "öffne den browser", "öffne bilder", "öffne die nachrichten", "öffne die aufgaben", "öffne projekte"]) {
      assert.equal(id(satz), null, satz);
    }
  });
});

describe("Der feste Befehl im Gespräch", () => {
  const JETZT = new Date(2026, 10, 16, 12, 0);
  const basis: CommandContext = { name: "Benedikt", market: null, weather: null, tasks: null, mail: null, desk: null, calendar: null, intel: null, now: JETZT, session: null };
  const desktop: DesktopStatus = { moeglich: true, ziele: MIT_EIGENEM };
  const mit: CommandContext = { ...basis, desktop };

  test("ein eingeschaltetes Programm wird geöffnet, mit und ohne KI-Gehirn, auch im längeren Satz", () => {
    for (const gehirn of [false, true]) {
      assert.deepEqual(decide("Öffne Safari.", mit, gehirn), { reply: "Ich öffne Safari.", effect: { type: "openDesktop", id: "safari" } });
      assert.deepEqual(decide("Kannst du mir bitte den Ordner Downloads öffnen?", mit, gehirn), { reply: "Ich öffne den Ordner Downloads.", effect: { type: "openDesktop", id: "downloads" } });
      assert.deepEqual(decide("Starte Affinity Designer 2", mit, gehirn), { reply: "Ich öffne Affinity Designer 2.", effect: { type: "openDesktop", id: "eigen:affinity designer 2" } });
      // Wo der Name allein falsch klänge, steht er mit Artikel im Satz.
      assert.equal(decide("Öffne den Finder", mit, gehirn)?.reply, "Ich öffne den Finder.");
      assert.equal(decide("Systemeinstellungen öffnen", mit, gehirn)?.reply, "Ich öffne die Systemeinstellungen.");
    }
  });

  test("ein ausgeschaltetes wird nicht geöffnet; JARVIS sagt, wo es sich einschalten lässt", () => {
    const d = decide("Öffne Excel", mit, true);
    assert.equal(d?.effect, undefined);
    assert.equal(d?.reply, "Excel ist in den Einstellungen unter „Programme“ ausgeschaltet.");
  });

  test("läuft JARVIS nicht auf einem Mac, sagt er das und versucht nichts", () => {
    const d = decide("Öffne Safari", { ...basis, desktop: { moeglich: false, ziele: ALLE } }, false);
    assert.equal(d?.effect, undefined);
    assert.equal(d?.reply, "Programme und Ordner öffnen kann ich nur auf dem Mac.");
  });

  test("solange die Einstellungen nicht geladen sind, gibt es den Befehl nicht", () => {
    assert.equal(decide("Öffne Safari", basis, true), null);
    assert.equal(decide("Öffne Safari", { ...basis, desktop: null }, true), null);
  });

  test("alle alten Befehle antworten mit der Liste genauso wie ohne sie", () => {
    for (const satz of [
      "Öffne den Kalender",
      "Öffne Obsidian",
      "Öffne Notizen",
      "Öffne die Dokumente",
      "Öffne die Einstellungen",
      "Öffne die Post",
      "Öffne den Browser",
      "Öffne Projekte",
      "Zeig mir die Aufgaben",
      "Öffne den Trading-Desk",
      "Meine Mails",
      "Briefing",
      "Wie spät ist es",
      "Hör auf zuzuhören",
      "Not-Aus",
    ]) {
      for (const gehirn of [false, true]) assert.deepEqual(decide(satz, mit, gehirn), decide(satz, basis, gehirn), satz);
    }
  });

  test("der Not-Aus und eine laufende Besprechung gehen vor", () => {
    assert.notEqual(decide("Not-Aus", mit, false)?.effect?.type, "openDesktop");
    const aufgabe = { id: "a", file: "Eingang.md", line: 0, raw: "- [ ] Bauamt anrufen", text: "Bauamt anrufen", due: "2026-11-16", important: false, recurring: false, tags: [] };
    const inBesprechung: CommandContext = { ...mit, tasks: { configured: true, tasks: [aufgabe], doneToday: 0 }, session: { kind: "aufgaben", ids: ["a"], index: 0, done: 0 } };
    // Ein Wort der Besprechung bleibt eines; „Öffne Safari“ ist keins, dann gilt der Befehl, und die Besprechung läuft weiter.
    assert.equal(decide("Erledigt", inBesprechung, false)?.effect?.type, "completeTask");
    const d = decide("Öffne Safari", inBesprechung, false);
    assert.equal(d?.effect?.type, "openDesktop");
    assert.equal(d?.session, undefined);
  });
});
