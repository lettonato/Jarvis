// Vorbereitung für den zentralen Betrieb (Bereich I): das Projektgedächtnis in PostgreSQL statt in einer Datei.
// Hier steht, was sich ohne laufende Datenbank prüfen lässt: wie JARVIS die Adresse der Datenbank liest, dass
// außerhalb dieses Rechners immer verschlüsselt wird, dass kein Kennwort in einer Meldung landet, dass ohne
// Einstellung alles bei der Datei bleibt und dass beim Umziehen nichts überschrieben wird.
// Die Prüfung gegen ein echtes PostgreSQL ist eine Handprüfung: test/hand/postgres-rauch.ts.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung } from "../helfer/umgebung";
import type { Eintrag, Projekt, Vorschlag } from "../../src/lib/projekte";

const ordner = sichereUmgebung("projekte-datenbank");
const KENNWORT = "Sehr-Geheim-4711";

let sp: typeof import("../../src/lib/server/projekte/speicher");
let pg: typeof import("../../src/lib/server/projekte/pg-speicher");
let umzug: typeof import("../../src/lib/server/projekte/umzug");
let lib: typeof import("../../src/lib/projekte");
let schnitt: typeof import("../../src/lib/server/projekte/schnittstelle");

const quelle = { art: "eingabe", hinweis: "", kanal: "mac", fremd: false, von: "mensch" } as const;
const projekt = (id: string, name: string): Projekt => ({ id, name, beschreibung: "", status: "aktiv", verantwortliche: ["Benedikt"], fortschritt: null, stichworte: [], vertraulich: false, quelle, erstelltAm: "2026-11-14T08:00:00.000Z", geaendertAm: "2026-11-14T08:00:00.000Z" });
const eintrag = (id: string, projektId: string, text: string): Eintrag => ({ id, projektId, art: "notiz", text, zustaendig: "", faellig: null, datum: "2026-11-14", erledigt: false, quelle, erstelltAm: "2026-11-14T08:00:00.000Z", bestaetigtAm: "2026-11-14T08:00:00.000Z", geaendertAm: null, verlauf: [], zurueckgezogen: null });
const vorschlag = (id: string, zustand: Vorschlag["zustand"]): Vorschlag => ({ id, art: "projekt", projektId: null, projektName: `Idee ${id}`, eintragId: null, inhalt: { beschreibung: "aus dem Gespräch" }, quelle: { ...quelle, art: "gespraech", von: "jarvis" }, erstelltAm: "2026-11-14T08:00:00.000Z", zustand, entschiedenAm: zustand === "offen" ? null : "2026-11-14T09:00:00.000Z" });

before(async () => {
  sp = await import("../../src/lib/server/projekte/speicher");
  pg = await import("../../src/lib/server/projekte/pg-speicher");
  umzug = await import("../../src/lib/server/projekte/umzug");
  lib = await import("../../src/lib/projekte");
  schnitt = await import("../../src/lib/server/projekte/schnittstelle");
});

beforeEach(() => {
  delete process.env.JARVIS_PROJEKTE_DB;
  sp.setzeSpeicher(null);
});

after(() => {
  delete process.env.JARVIS_PROJEKTE_DB;
  sp.setzeSpeicher(null);
});

describe("Datenbank fürs Projektgedächtnis: die Adresse", () => {
  test("auf diesem Rechner ohne Verschlüsselung, überall sonst verschlüsselt und mit geprüftem Zertifikat", () => {
    const lokal = pg.pgVerbindung("postgres://jarvis@127.0.0.1:5433/jarvis");
    assert.deepEqual(lokal.pool, { host: "127.0.0.1", port: 5433, user: "jarvis", password: undefined, database: "jarvis", ssl: false });
    assert.equal(pg.pgVerbindung("postgresql://jarvis@localhost/jarvis").pool.port, 5432);

    const fern = pg.pgVerbindung(`postgres://jarvis_app:${KENNWORT}@ds-jarvis.postgres.database.azure.com:5432/jarvis`);
    assert.deepEqual(fern.pool.ssl, { rejectUnauthorized: true });
    assert.equal(fern.pool.password, KENNWORT);
    assert.equal(fern.pool.host, "ds-jarvis.postgres.database.azure.com");
  });

  test("Zusätze in der Adresse schalten die Verschlüsselung nicht ab", () => {
    for (const zusatz of ["?sslmode=disable", "?ssl=false", "?sslmode=no-verify", "?sslmode=require&rejectUnauthorized=false"]) {
      assert.deepEqual(pg.pgVerbindung(`postgres://a:b@db.example.com/jarvis${zusatz}`).pool.ssl, { rejectUnauthorized: true }, zusatz);
    }
    // Ein Name, der nur so aussieht wie dieser Rechner, gilt nicht als dieser Rechner.
    for (const host of ["127.0.0.1.nip.io", "localhost.example.com", "10.0.0.5"]) {
      assert.deepEqual(pg.pgVerbindung(`postgres://a:b@${host}/jarvis`).pool.ssl, { rejectUnauthorized: true }, host);
    }
  });

  test("der Ort für die Anzeige nennt Datenbank und Rechner, nie Benutzer oder Kennwort", () => {
    const { ort } = pg.pgVerbindung(`postgres://jarvis_app:${KENNWORT}@db.example.com:5432/jarvis`);
    assert.equal(ort, "PostgreSQL-Datenbank „jarvis“ auf db.example.com");
    assert.ok(!ort.includes(KENNWORT) && !ort.includes("jarvis_app"));
  });

  test("eine unbrauchbare Adresse wird abgelehnt, ohne sie zu wiederholen", () => {
    for (const kaputt of ["", "jarvis", `https://a:${KENNWORT}@db.example.com/jarvis`, `postgres://a:${KENNWORT}@db.example.com`, `postgres://a:${KENNWORT}@/jarvis`, `postgres://a:${KENNWORT}@db.example.com:abc/jarvis`]) {
      assert.throws(
        () => pg.pgVerbindung(kaputt),
        (e: unknown) => e instanceof sp.SpeicherFehler && !e.message.includes(KENNWORT) && /JARVIS_PROJEKTE_DB/.test(e.message),
        kaputt.replace(KENNWORT, "…"),
      );
    }
  });
});

describe("Datenbank fürs Projektgedächtnis: die Wahl des Speichers", () => {
  test("ohne Einstellung bleibt alles bei der Datei auf dem Mac", () => {
    const s = sp.speicher();
    assert.ok(s instanceof sp.DateiSpeicher);
    assert.equal(s.ort, path.join(ordner, "projekte.json"));
  });

  test("mit JARVIS_PROJEKTE_DB nimmt JARVIS die Datenbank und verbindet sich erst beim ersten Zugriff", () => {
    process.env.JARVIS_PROJEKTE_DB = "postgres://jarvis@127.0.0.1:9/jarvis";
    const s = sp.speicher();
    assert.ok(s instanceof pg.PgSpeicher);
    assert.equal(s.ort, "PostgreSQL-Datenbank „jarvis“ auf 127.0.0.1");
  });

  test("ist die Datenbank eingestellt, aber nicht erreichbar, meldet JARVIS das und weicht nicht auf die Datei aus", async () => {
    process.env.JARVIS_PROJEKTE_DB = `postgres://jarvis_app:${KENNWORT}@127.0.0.1:9/jarvis`;
    const s = sp.speicher();
    const meldungen: string[] = [];
    for (const versuch of [() => s.projekte(), () => s.speichereProjekt(projekt("p1", "Halle")), () => s.transaktion(async () => 1)]) {
      await assert.rejects(versuch(), (e: unknown) => {
        assert.ok(e instanceof sp.SpeicherFehler, String(e));
        meldungen.push((e as Error).message);
        return true;
      });
    }
    for (const m of meldungen) {
      assert.match(m, /^Die Datenbank des Projektgedächtnisses ist nicht erreichbar oder hat einen Fehler gemeldet \(Kennung ECONNREFUSED\)\.$/, "ein fester Satz mit Kennung, ohne den Text der Datenbank");
      assert.ok(!m.includes(KENNWORT) && !m.includes("jarvis_app"), "weder Kennwort noch Benutzer stehen in der Meldung");
    }
    assert.equal(existsSync(path.join(ordner, "projekte.json")), false, "es wurde nichts in die Datei geschrieben");
  });

  test("eine unbrauchbare Einstellung führt zu einer Meldung, nicht still zur Datei", () => {
    process.env.JARVIS_PROJEKTE_DB = "db.example.com/jarvis";
    assert.throws(() => sp.speicher(), sp.SpeicherFehler);
  });
});

describe("Text, den jeder Speicher halten kann", () => {
  // Die Datenbank lehnt das Zeichen NUL und halbe Zeichenpaare (ein beim Kürzen zerschnittenes Emoji) ab.
  test("Eingaben verlieren das Zeichen NUL, und ein Emoji an der Grenze wird nicht zerschnitten", () => {
    assert.equal(lib.sauber("Halle\u0000 3\u0007", 80), "Halle 3");
    const gekuerzt = lib.sauber("123456789😀", 10);
    assert.equal(gekuerzt, "123456789");
    assert.equal(lib.sauber("12345678😀", 10), "12345678😀");
    assert.equal(lib.sauber("vorn \ud83d hinten", 80), "vorn \ufffd hinten", "ein halbes Zeichenpaar mitten im Text wird ersetzt");
    assert.equal(lib.sauber("  <b>Statik</b>\n prüfen  ", 80), "b Statik /b prüfen", "die bisherigen Regeln gelten weiter");
  });

  test("vor dem Speichern in der Datenbank wird jeder Text bereinigt, auch tief im Datensatz", () => {
    const roh = { ...projekt("p1", "Halle\u0000 3"), stichworte: ["ok", "halb\ud83d"], extra: undefined } as Projekt & { extra?: string };
    const fertig = schnitt.speicherbar(roh);
    assert.equal(fertig.name, "Halle 3");
    assert.deepEqual(fertig.stichworte, ["ok", "halb\ufffd"]);
    assert.equal("extra" in fertig, false);
    assert.equal(fertig.fortschritt, null);
    assert.doesNotThrow(() => new TextEncoder().encode(JSON.stringify(fertig)));
    assert.equal(JSON.stringify(fertig).includes("\\u0000"), false);
  });

  test("beide Speicher behalten gleich viele entschiedene Vorschläge", () => {
    assert.equal(schnitt.MAX_ENTSCHIEDEN, 300);
  });
});

describe("Ansicht Projekte: wo das Gedächtnis liegt", () => {
  test("die Datei heißt „auf diesem Mac“, die Datenbank nicht", () => {
    assert.equal(lib.ablageSatz({ ablage: "/Users/b/.jarvis/projekte.json" }), "Gespeichert auf diesem Mac in /Users/b/.jarvis/projekte.json.");
    assert.equal(lib.ablageSatz({ ablage: "PostgreSQL-Datenbank „jarvis“ auf db.example.com", ablageArt: "datenbank" }), "Gespeichert in der PostgreSQL-Datenbank „jarvis“ auf db.example.com.");
    assert.equal(new sp.DateiSpeicher("/tmp/x.json").art, "datei");
    assert.equal(new pg.PgSpeicher("postgres://jarvis@127.0.0.1:9/jarvis").art, "datenbank");
  });
});

describe("Projektgedächtnis umziehen: kopieren, nie überschreiben", () => {
  const fuelle = async (s: import("../../src/lib/server/projekte/speicher").ProjektSpeicher) => {
    await s.speichereProjekt(projekt("p1", "Hallenneubau"));
    await s.speichereProjekt(projekt("p2", "Fuhrpark"));
    await s.speichereEintrag(eintrag("e1", "p1", "Kickoff war gut"));
    await s.speichereEintrag(eintrag("e2", "p2", "Angebot liegt vor"));
    await s.speichereEintrag(eintrag("e3", "p1", "Statik beauftragt"));
    await s.speichereVorschlag(vorschlag("v1", "uebernommen"));
    await s.speichereVorschlag(vorschlag("v2", "offen"));
  };

  test("kopiert alles in derselben Reihenfolge, die Quelle bleibt unverändert", async () => {
    const von = new sp.DateiSpeicher(path.join(ordner, "von.json"));
    const nach = new sp.DateiSpeicher(path.join(ordner, "nach.json"));
    await fuelle(von);
    assert.deepEqual(await umzug.kopiereSpeicher(von, nach), { projekte: 2, eintraege: 3, vorschlaege: 2 });
    const frisch = new sp.DateiSpeicher(path.join(ordner, "nach.json"));
    assert.deepEqual(await frisch.projekte(), await von.projekte());
    assert.deepEqual(await frisch.eintraege(), await von.eintraege());
    assert.deepEqual(await frisch.vorschlaege(), await von.vorschlaege());
    assert.deepEqual((await von.eintraege()).map((e) => e.id), ["e1", "e2", "e3"]);
  });

  test("in ein Ziel, in dem schon etwas steht, wird nicht kopiert", async () => {
    const von = new sp.DateiSpeicher(path.join(ordner, "von2.json"));
    const nach = new sp.DateiSpeicher(path.join(ordner, "nach2.json"));
    await fuelle(von);
    await nach.speichereVorschlag(vorschlag("alt", "offen"));
    await assert.rejects(umzug.kopiereSpeicher(von, nach), (e: unknown) => e instanceof sp.SpeicherFehler && /Im Ziel steht schon etwas/.test(e.message), "abgelehnt wird vor dem ersten Schreiben, nicht erst beim Vergleich danach");
    assert.deepEqual((await nach.vorschlaege()).map((v) => v.id), ["alt"]);
    assert.equal((await nach.projekte()).length, 0);
  });

  test("kommt im Ziel nicht genau dasselbe an, bleibt das Ziel leer", async () => {
    const von = new sp.DateiSpeicher(path.join(ordner, "von3.json"));
    await fuelle(von);
    // Ein Ziel, das einen Eintrag still verschluckt.
    const echt = new sp.DateiSpeicher(path.join(ordner, "nach3.json"));
    const lueckenhaft = Object.create(echt) as typeof echt;
    lueckenhaft.speichereEintrag = (e: Eintrag) => (e.id === "e2" ? Promise.resolve() : echt.speichereEintrag(e));
    lueckenhaft.transaktion = (arbeit) => echt.transaktion(arbeit);
    await assert.rejects(umzug.kopiereSpeicher(von, lueckenhaft), (e: unknown) => e instanceof sp.SpeicherFehler && /Einträge: 3 in der Quelle, 2 im Ziel/.test(e.message));
    assert.equal((await echt.projekte()).length, 0);
    assert.equal((await echt.eintraege()).length, 0);
  });

  test("was die Datei an Sonderfällen hält (NUL, halbes Zeichenpaar, leere Angabe), verhindert den Umzug nicht", async () => {
    const von = new sp.DateiSpeicher(path.join(ordner, "von4.json"));
    await von.speichereProjekt({ ...projekt("p1", "Halle\u0000 3"), extra: undefined } as Projekt);
    await von.speichereEintrag(eintrag("e1", "p1", "halb\ud83d"));
    // Ein Ziel, das wie die Datenbank bereinigt, was es speichert.
    const echt = new sp.DateiSpeicher(path.join(ordner, "nach4.json"));
    const wieDatenbank = Object.create(echt) as typeof echt;
    wieDatenbank.speichereProjekt = (x: Projekt) => echt.speichereProjekt(schnitt.speicherbar(x));
    wieDatenbank.speichereEintrag = (x: Eintrag) => echt.speichereEintrag(schnitt.speicherbar(x));
    wieDatenbank.transaktion = (arbeit) => echt.transaktion(arbeit);
    assert.deepEqual(await umzug.kopiereSpeicher(von, wieDatenbank), { projekte: 1, eintraege: 1, vorschlaege: 0 });
    assert.equal((await echt.projekte())[0].name, "Halle 3");
  });
});
