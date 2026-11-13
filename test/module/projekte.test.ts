// Das Projektgedächtnis (Bereich C). Geprüft wird vor allem die Grundregel: Nichts gilt als wahr, was ein
// Mensch am Mac nicht bestätigt hat. Das Modell kann nur vorschlagen, Korrekturen bleiben nachvollziehbar,
// zurückgezogen heißt nicht gelöscht, vertrauliche Projekte verlassen den Mac nicht, und eine beschädigte
// Datei wird nie stillschweigend überschrieben.

import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock, werkzeugErgebnisse, type ClaudeMock } from "../mocks/claude-mock";
import { starteTelegramMock, type TelegramMock } from "../mocks/telegram-mock";
import type { Eintrag, Projekt, Vorschlag } from "../../src/lib/projekte";
import type { ProjektSpeicher } from "../../src/lib/server/projekte/speicher";

const ordner = sichereUmgebung("projekte");
const ablage = testOrdner("projekte-mac");
const STORE = path.join(ablage, "kalender.json");
chmodSync("test/mocks/osascript-mock.mjs", 0o755);
Object.assign(process.env, { JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_MAC_STORE: STORE });

let claude: ClaudeMock;
let tg: TelegramMock;
let p: typeof import("../../src/lib/server/projekte/projekte");
let sp: typeof import("../../src/lib/server/projekte/speicher");
let lib: typeof import("../../src/lib/projekte");
let audit: typeof import("../../src/lib/server/gateway/audit");
let brain: typeof import("../../src/lib/server/brain");
let regeln: typeof import("../../src/lib/server/gateway/richtlinien");
let config: typeof import("../../src/lib/server/config");
let zeitplan: typeof import("../../src/lib/server/zeitplan-aufgaben");
let kalender: typeof import("../../src/lib/server/calendar");

const DATEI = path.join(ordner, "projekte.json");
const TOKEN = ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":");
const ICH = 111;
const JETZT = new Date(2026, 10, 13, 10, 0);
const frage = (text: string, extra: Record<string, unknown> = {}) => ({ text, history: [], view: "/", focus: null, extra: [], ...extra });
const cfg = () => ({ name: "Benedikt", claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
const gesendet = () => JSON.stringify(claude.anfragen);

// Ein zweiter Speicher mit derselben Schnittstelle, ganz ohne Datei. Steht für die spätere Datenbank: Läuft
// die Logik darauf unverändert, hängt sie nicht an der Datei.
class SpeicherImKopf implements ProjektSpeicher {
  readonly ort = "Arbeitsspeicher (Test)";
  private d = { projekte: [] as Projekt[], eintraege: [] as Eintrag[], vorschlaege: [] as Vorschlag[] };
  private schlange: Promise<unknown> = Promise.resolve();
  private setze<T extends { id: string }>(liste: T[], neu: T) {
    const i = liste.findIndex((x) => x.id === neu.id);
    if (i >= 0) liste[i] = structuredClone(neu);
    else liste.push(structuredClone(neu));
  }
  async projekte() {
    return structuredClone(this.d.projekte);
  }
  async speichereProjekt(x: Projekt) {
    this.setze(this.d.projekte, x);
  }
  async eintraege(projektId?: string) {
    return structuredClone(projektId ? this.d.eintraege.filter((e) => e.projektId === projektId) : this.d.eintraege);
  }
  async speichereEintrag(x: Eintrag) {
    this.setze(this.d.eintraege, x);
  }
  async vorschlaege(zustand?: Vorschlag["zustand"]) {
    return structuredClone(zustand ? this.d.vorschlaege.filter((v) => v.zustand === zustand) : this.d.vorschlaege);
  }
  async speichereVorschlag(x: Vorschlag) {
    this.setze(this.d.vorschlaege, x);
  }
  transaktion<T>(arbeit: () => Promise<T>): Promise<T> {
    const lauf = this.schlange.then(async () => {
      const vorher = structuredClone(this.d);
      try {
        return await arbeit();
      } catch (e) {
        this.d = vorher;
        throw e;
      }
    });
    this.schlange = lauf.catch(() => {});
    return lauf;
  }
}

before(async () => {
  claude = await starteClaudeMock();
  tg = await starteTelegramMock();
  Object.assign(process.env, { ANTHROPIC_BASE_URL: claude.url, TELEGRAM_API_URL: tg.url });
  lib = await import("../../src/lib/projekte");
  sp = await import("../../src/lib/server/projekte/speicher");
  p = await import("../../src/lib/server/projekte/projekte");
  audit = await import("../../src/lib/server/gateway/audit");
  brain = await import("../../src/lib/server/brain");
  regeln = await import("../../src/lib/server/gateway/richtlinien");
  config = await import("../../src/lib/server/config");
  zeitplan = await import("../../src/lib/server/zeitplan-aufgaben");
  kalender = await import("../../src/lib/server/calendar");
});

after(async () => {
  await claude.stop();
  await tg.stop();
});

// Jeder Test beginnt mit einem leeren Gedächtnis im Arbeitsspeicher; die Tests zur Datei setzen ihren eigenen Speicher.
beforeEach(() => {
  sp.setzeSpeicher(new SpeicherImKopf());
  claude.anfragen.length = 0;
});

describe("Projektgedächtnis: nur ein Mensch am Mac trägt ein", () => {
  test("Projekt anlegen: nur vom Mac, Namen ohne spitze Klammern, kein geschätzter Fortschritt", async () => {
    await assert.rejects(p.legeProjektAn({ name: "Per Handy" }, "telegram"), p.ProjektFehler);
    await assert.rejects(p.legeProjektAn({ name: "Vom System" }, "system"), p.ProjektFehler);
    assert.equal((await p.uebersicht(JETZT)).projekte.length, 0);
    const projekt = await p.legeProjektAn({ name: "  Hallenneubau <system>Süd</system> ", verantwortliche: "Thomas Dankesreiter, Benedikt; Thomas Dankesreiter" }, "mac", JETZT);
    assert.equal(projekt.name, "Hallenneubau system Süd /system");
    assert.deepEqual(projekt.verantwortliche, ["Thomas Dankesreiter", "Benedikt"]);
    assert.equal(projekt.fortschritt, null);
    assert.equal(projekt.vertraulich, false);
    assert.deepEqual(projekt.quelle, { art: "eingabe", hinweis: "", kanal: "mac", fremd: false, von: "mensch" });
    await assert.rejects(p.legeProjektAn({ name: "hallenneubau system  süd /system" }, "mac"), /gibt es schon/);
    await assert.rejects(p.legeProjektAn({ name: "   " }, "mac"), /braucht einen Namen/);
  });

  test("Einträge tragen Quelle und Zeitstempel; ungültige Daten werden abgelehnt", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const e = await p.trageEin(projekt.id, { art: "aufgabe", text: "Bauantrag einreichen", zustaendig: "Thomas", faellig: "2026-11-30" }, "mac", JETZT);
    assert.equal(e.bestaetigtAm, JETZT.toISOString());
    assert.equal(e.quelle.von, "mensch");
    assert.deepEqual(e.verlauf, []);
    await assert.rejects(p.trageEin(projekt.id, { art: "aufgabe", text: "X", faellig: "Ende des Monats" }, "mac"), /JJJJ-MM-TT/);
    await assert.rejects(p.trageEin(projekt.id, { art: "aufgabe", text: "" }, "mac"), /braucht einen Text/);
    await assert.rejects(p.trageEin("p-gibtesnicht", { art: "notiz", text: "X" }, "mac"), /gibt es nicht/);
    await assert.rejects(p.trageEin(projekt.id, { art: "notiz", text: "X" }, "telegram"), p.ProjektFehler);
  });

  test("Korrektur: Der alte Stand bleibt im Verlauf, mit Grund und Zeit", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const e = await p.trageEin(projekt.id, { art: "aufgabe", text: "Bauantrag einreichen", zustaendig: "Thomas", faellig: "2026-11-30" }, "mac", JETZT);
    const spaeter = new Date(JETZT.getTime() + 3_600_000);
    const k = await p.korrigiere(e.id, { faellig: "2026-12-15", zustaendig: "Benedikt" }, "Termin beim Amt verschoben", "mac", spaeter);
    assert.equal(k.faellig, "2026-12-15");
    assert.equal(k.text, "Bauantrag einreichen", "was nicht genannt ist, bleibt");
    assert.deepEqual(k.verlauf, [{ am: spaeter.toISOString(), von: "mac", grund: "Termin beim Amt verschoben", vorher: { faellig: "2026-11-30", zustaendig: "Thomas" } }]);
    assert.equal(k.geaendertAm, spaeter.toISOString());
    assert.equal(k.bestaetigtAm, e.bestaetigtAm);
    // Eine Korrektur ohne Änderung schreibt keinen leeren Verlaufseintrag.
    assert.equal((await p.korrigiere(e.id, { faellig: "2026-12-15" }, "", "mac")).verlauf.length, 1);
    await assert.rejects(p.korrigiere(e.id, { text: "Per Handy" }, "", "telegram"), p.ProjektFehler);
  });

  test("Zurückziehen löscht nicht: Der Eintrag verschwindet aus der Akte und bleibt nachvollziehbar", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const e = await p.trageEin(projekt.id, { art: "entscheidung", text: "Wir bauen zweistöckig", datum: "2026-11-10" }, "mac", JETZT);
    await p.zieheZurueck(e.id, "war ein Missverständnis", "mac", JETZT);
    const akte = await p.akte("Hallenneubau", JETZT);
    assert.equal(akte.eintraege.length, 0);
    assert.equal(akte.zurueckgezogen.length, 1);
    assert.equal(akte.zurueckgezogen[0].text, "Wir bauen zweistöckig");
    assert.deepEqual(akte.zurueckgezogen[0].zurueckgezogen, { am: JETZT.toISOString(), grund: "war ein Missverständnis" });
    assert.equal(akte.projekt.letzteEntscheidung, null, "zählt nicht mehr mit");
    await assert.rejects(p.korrigiere(e.id, { text: "Doch" }, "", "mac"), /zurückgezogen/);
  });

  test("Übersicht: offene und überfällige Aufgaben, nächste Frist, letzte Entscheidung", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau", fortschritt: 40 }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "aufgabe", text: "Statik prüfen", faellig: "2026-11-10" }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "aufgabe", text: "Angebote einholen", faellig: "2026-11-20" }, "mac", JETZT);
    const fertig = await p.trageEin(projekt.id, { art: "aufgabe", text: "Grundstück vermessen", faellig: "2026-11-01" }, "mac", JETZT);
    await p.korrigiere(fertig.id, { erledigt: true }, "erledigt", "mac", JETZT);
    await p.trageEin(projekt.id, { art: "entscheidung", text: "Stahlbau statt Holz", datum: "2026-11-05" }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "risiko", text: "Lieferzeit Stahl" }, "mac", JETZT);
    const karte = (await p.uebersicht(JETZT)).projekte[0];
    assert.equal(karte.offeneAufgaben, 2);
    assert.equal(karte.ueberfaellig, 1);
    assert.deepEqual(karte.naechsteFrist, { text: "Statik prüfen", faellig: "2026-11-10" });
    assert.deepEqual(karte.letzteEntscheidung, { text: "Stahlbau statt Holz", datum: "2026-11-05" });
    assert.equal(karte.risiken, 1);
    assert.equal(karte.fortschritt, 40);
  });
});

describe("Projektgedächtnis: JARVIS schlägt nur vor", () => {
  const vorschlag = { projekt: "Hallenneubau", beschreibung: "Neue Halle am Standort Süd", quelle_art: "gespraech", quelle_hinweis: "Besprechung am 12.11.", eintraege: [{ art: "entscheidung", text: "Bauantrag geht bis Ende November raus", datum: "2026-11-12" }, { art: "aufgabe", text: "Bauantrag fertigstellen", zustaendig: "Thomas", faellig: "2026-11-30" }] };

  test("ein Vorschlag ist noch kein Wissen: kein Projekt, kein Eintrag, nichts in der Akte", async () => {
    const r = await p.schlageVor(vorschlag, { kanal: "mac", fremd: false }, JETZT);
    assert.deepEqual(r.angelegt.map((v) => v.art), ["projekt", "eintrag", "eintrag"]);
    const snap = await p.uebersicht(JETZT);
    assert.equal(snap.projekte.length, 0);
    assert.equal(snap.vorschlaege.length, 3);
    assert.ok(snap.vorschlaege.every((v) => v.zustand === "offen" && v.quelle.von === "jarvis" && v.quelle.hinweis === "Besprechung am 12.11."));
    await assert.rejects(p.akte("Hallenneubau"), p.ProjektFehler);
  });

  test("Herkunft setzt der Server: fremdes Gespräch oder Quelle Mail heißt fremd; „eingabe“ kann das Modell nicht behaupten", async () => {
    const a = await p.schlageVor({ ...vorschlag, projekt: "A" }, { kanal: "telegram", fremd: true });
    assert.ok(a.angelegt.every((v) => v.quelle.fremd && v.quelle.kanal === "telegram"));
    const b = await p.schlageVor({ ...vorschlag, projekt: "B", quelle_art: "mail" }, { kanal: "mac", fremd: false });
    assert.ok(b.angelegt.every((v) => v.quelle.fremd && v.quelle.art === "mail"));
    const c = await p.schlageVor({ ...vorschlag, projekt: "C", quelle_art: "eingabe" }, { kanal: "mac", fremd: false });
    assert.ok(c.angelegt.every((v) => v.quelle.art === "gespraech" && v.quelle.von === "jarvis" && !v.quelle.fremd));
  });

  test("Doppeltes und Ungültiges wird übersprungen", async () => {
    await p.schlageVor(vorschlag, { kanal: "mac", fremd: false });
    const nochmal = await p.schlageVor({ ...vorschlag, eintraege: [...vorschlag.eintraege, { art: "aufgabe", text: "Neu", faellig: "bald" }, { art: "risiko", text: "" }] }, { kanal: "mac", fremd: false });
    assert.equal(nochmal.angelegt.length, 0);
    assert.equal(nochmal.uebersprungen.length, 4);
    assert.equal((await p.uebersicht()).vorschlaege.length, 3);
  });

  test("der Eingang hat eine Obergrenze, damit ihn niemand fluten kann", async () => {
    for (let runde = 0; runde < 7; runde++) {
      await p.schlageVor({ projekt: "Flut", eintraege: Array.from({ length: 20 }, (_, i) => ({ art: "notiz", text: `Eintrag ${runde}-${i}` })) }, { kanal: "telegram", fremd: true });
    }
    assert.equal((await p.uebersicht()).vorschlaege.length, lib.GRENZEN.offeneVorschlaege);
    const voll = await p.schlageVor({ projekt: "Flut", eintraege: [{ art: "notiz", text: "noch einer" }] }, { kanal: "mac", fremd: false });
    assert.equal(voll.angelegt.length, 0);
    assert.match(voll.uebersprungen.join(" "), /Eingang für Vorschläge ist voll/);
  });
});

describe("Projektgedächtnis: bestätigen, ändern, ablehnen", () => {
  const lege = () => p.schlageVor({ projekt: "Hallenneubau", beschreibung: "Neue Halle", quelle_art: "mail", quelle_hinweis: "Mail vom Architekten", eintraege: [{ art: "aufgabe", text: "Bauantrag fertigstellen", zustaendig: "Thomas", faellig: "2026-11-30" }] }, { kanal: "mac", fremd: true }, JETZT);

  test("nur ein Mensch am Mac bestätigt; per Telegram oder vom System bleibt der Vorschlag offen", async () => {
    const [projekt] = (await lege()).angelegt;
    await assert.rejects(p.entscheide(projekt.id, true, "telegram"), p.ProjektFehler);
    await assert.rejects(p.entscheide(projekt.id, true, "system"), p.ProjektFehler);
    const snap = await p.uebersicht();
    assert.equal(snap.projekte.length, 0);
    assert.equal(snap.vorschlaege.length, 2);
  });

  test("übernehmen legt an, genau einmal; die Quelle bleibt mit Herkunft erhalten", async () => {
    const [projekt, aufgabe] = (await lege()).angelegt;
    const r1 = await p.entscheide(projekt.id, true, "mac", {}, JETZT);
    assert.equal(r1.projekt?.name, "Hallenneubau");
    assert.equal(r1.projekt?.beschreibung, "Neue Halle");
    await assert.rejects(p.entscheide(projekt.id, true, "mac"), /schon übernommen/);
    const r2 = await p.entscheide(aufgabe.id, true, "mac", {}, JETZT);
    assert.equal(r2.eintrag?.text, "Bauantrag fertigstellen");
    assert.deepEqual(r2.eintrag?.quelle, { art: "mail", hinweis: "Mail vom Architekten", kanal: "mac", fremd: true, von: "jarvis" });
    assert.equal(r2.eintrag?.bestaetigtAm, JETZT.toISOString());
    await assert.rejects(p.entscheide(aufgabe.id, false, "mac"), /schon übernommen/);
    const akte = await p.akte("Hallenneubau", JETZT);
    assert.equal(akte.eintraege.length, 1);
    assert.equal((await p.uebersicht()).vorschlaege.length, 0);
  });

  test("ändern und übernehmen: Es gilt, was der Mensch daraus gemacht hat", async () => {
    const [, aufgabe] = (await lege()).angelegt;
    const r = await p.entscheide(aufgabe.id, true, "mac", { text: "Bauantrag mit Statik fertigstellen", faellig: "2026-12-05", projektName: "Halle Süd" }, JETZT);
    assert.equal(r.eintrag?.text, "Bauantrag mit Statik fertigstellen");
    assert.equal(r.eintrag?.faellig, "2026-12-05");
    assert.equal(r.eintrag?.zustaendig, "Thomas");
    // Der Eintrag gehörte zu einem Projekt, das noch nicht bestätigt war: Es wird mit angelegt, unter dem geänderten Namen.
    assert.equal(r.projekt?.name, "Halle Süd");
    await assert.rejects(p.entscheide(aufgabe.id, true, "mac", { faellig: "irgendwann" }), p.ProjektFehler);
  });

  test("ein Eintrag bestätigt sein Projekt mit; der Projektvorschlag ist damit erledigt", async () => {
    const [, aufgabe] = (await lege()).angelegt;
    const r = await p.entscheide(aufgabe.id, true, "mac", {}, JETZT);
    assert.equal(r.projekt?.name, "Hallenneubau");
    assert.equal(r.projekt?.beschreibung, "Neue Halle");
    assert.equal((await p.uebersicht()).vorschlaege.length, 0);
  });

  test("ablehnen speichert nichts", async () => {
    const [projekt, aufgabe] = (await lege()).angelegt;
    await p.entscheide(aufgabe.id, false, "mac");
    await p.entscheide(projekt.id, false, "mac");
    const snap = await p.uebersicht();
    assert.equal(snap.projekte.length, 0);
    assert.equal(snap.vorschlaege.length, 0);
    await assert.rejects(p.entscheide(projekt.id, true, "mac"), /schon abgelehnt/);
  });

  test("Korrektur als Vorschlag: zeigt den bisherigen Stand und ändert erst nach dem Ja, mit Verlauf", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const e = await p.trageEin(projekt.id, { art: "aufgabe", text: "Bauantrag einreichen", zustaendig: "Thomas", faellig: "2026-11-30" }, "mac", JETZT);
    const r = await p.schlageVor({ projekt: "Hallenneubau", eintraege: [{ ersetzt: e.id, faellig: "2026-12-15" }, { ersetzt: "e-gibtesnicht", text: "X" }, { ersetzt: e.id, faellig: "2026-11-30" }] }, { kanal: "mac", fremd: false }, JETZT);
    assert.equal(r.angelegt.length, 1);
    assert.equal(r.uebersprungen.length, 2, "unbekannter Eintrag und Korrektur ohne Änderung");
    const [v] = (await p.uebersicht()).vorschlaege;
    assert.equal(v.art, "korrektur");
    assert.equal(v.bisher?.faellig, "2026-11-30");
    assert.equal(v.inhalt.text, "Bauantrag einreichen", "der Text bleibt, wie er war");
    assert.equal((await p.akte(projekt.id)).eintraege[0].faellig, "2026-11-30", "vor dem Ja ändert sich nichts");
    const fertig = await p.entscheide(v.id, true, "mac", {}, JETZT);
    assert.equal(fertig.eintrag?.faellig, "2026-12-15");
    assert.deepEqual(fertig.eintrag?.verlauf[0].vorher, { faellig: "2026-11-30" });
    assert.match(fertig.eintrag!.verlauf[0].grund, /Vorschlag von JARVIS/);
  });

  test("eine Korrektur ändert nur, was JARVIS vorgeschlagen hat: Was du inzwischen von Hand geändert hast, bleibt", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const e = await p.trageEin(projekt.id, { art: "aufgabe", text: "Bauantrag einreichen", zustaendig: "Thomas", faellig: "2026-11-30" }, "mac", JETZT);
    // JARVIS schlägt vor, die Aufgabe als erledigt zu führen.
    await p.schlageVor({ projekt: "Hallenneubau", eintraege: [{ ersetzt: e.id, erledigt: true }] }, { kanal: "mac", fremd: false }, JETZT);
    const [v] = (await p.uebersicht()).vorschlaege;
    assert.equal(v.art, "korrektur");
    // Bevor du übernimmst, änderst du Frist und Text von Hand.
    await p.korrigiere(e.id, { text: "Bauantrag mit Statik einreichen", faellig: "2026-12-10" }, "von Hand", "mac", JETZT);
    const fertig = await p.entscheide(v.id, true, "mac", {}, JETZT);
    assert.equal(fertig.eintrag?.erledigt, true, "der Vorschlag selbst gilt");
    assert.equal(fertig.eintrag?.text, "Bauantrag mit Statik einreichen", "dein Text bleibt");
    assert.equal(fertig.eintrag?.faellig, "2026-12-10", "deine Frist bleibt");
    assert.equal(fertig.eintrag?.zustaendig, "Thomas");
  });

  test("ein umbenanntes Projekt nimmt seine wartenden Einträge mit: kein zweites Projekt unter dem alten Namen", async () => {
    const r = await p.schlageVor({ projekt: "Halle", beschreibung: "Neue Halle", eintraege: [{ art: "aufgabe", text: "Bauantrag fertigstellen" }, { art: "notiz", text: "Kickoff war gut" }] }, { kanal: "mac", fremd: false }, JETZT);
    const [projekt, aufgabe, notiz] = r.angelegt;
    const angelegt = await p.entscheide(projekt.id, true, "mac", { projektName: "Hallenneubau Nord" }, JETZT);
    assert.equal(angelegt.projekt?.name, "Hallenneubau Nord");
    const offen = (await p.uebersicht()).vorschlaege;
    assert.ok(offen.every((x) => x.projektId === angelegt.projekt!.id && x.projektName === "Hallenneubau Nord"), "die wartenden Einträge zeigen auf das umbenannte Projekt");
    await p.entscheide(aufgabe.id, true, "mac", {}, JETZT);
    await p.entscheide(notiz.id, true, "mac", {}, JETZT);
    const snap = await p.uebersicht();
    assert.deepEqual(snap.projekte.map((x) => x.name), ["Hallenneubau Nord"], "es gibt nur ein Projekt");
    assert.equal((await p.akte(angelegt.projekt!.id)).eintraege.length, 2);
  });

  test("schlägt das Übernehmen fehl, bleibt alles beim Alten und der Vorschlag offen", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const e = await p.trageEin(projekt.id, { art: "aufgabe", text: "Bauantrag einreichen" }, "mac", JETZT);
    await p.schlageVor({ projekt: "Hallenneubau", eintraege: [{ ersetzt: e.id, text: "Bauantrag und Statik einreichen" }] }, { kanal: "mac", fremd: false });
    const [v] = (await p.uebersicht()).vorschlaege;
    await p.zieheZurueck(e.id, "erledigt sich", "mac");
    await assert.rejects(p.entscheide(v.id, true, "mac"), /zurückgezogen/);
    assert.equal((await p.uebersicht()).vorschlaege[0].zustand, "offen");
  });
});

describe("Projektgedächtnis: Speicher in der Datei", () => {
  test("liegt im Einstellungsordner, nur für den eigenen Benutzer lesbar, und übersteht einen Neustart", async () => {
    sp.setzeSpeicher(null);
    assert.equal(sp.speicher().ort, DATEI);
    assert.equal(existsSync(DATEI), false);
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "notiz", text: "Kickoff war gut", datum: "2026-11-12" }, "mac", JETZT);
    assert.equal(statSync(DATEI).mode & 0o777, 0o600);
    assert.equal(existsSync(`${DATEI}.tmp`), false, "geschrieben wird über eine Zwischendatei, die danach weg ist");
    // „Neustart“: ein frischer Speicher liest dieselbe Datei.
    sp.setzeSpeicher(new sp.DateiSpeicher(DATEI));
    const akte = await p.akte("Hallenneubau", JETZT);
    assert.equal(akte.eintraege[0].text, "Kickoff war gut");
  });

  test("gleichzeitige Einträge gehen nicht verloren", async () => {
    sp.setzeSpeicher(new sp.DateiSpeicher(path.join(ordner, "gleichzeitig.json")));
    const projekt = await p.legeProjektAn({ name: "Parallel" }, "mac");
    await Promise.all(Array.from({ length: 25 }, (_, i) => p.trageEin(projekt.id, { art: "notiz", text: `Notiz ${i}` }, "mac")));
    sp.setzeSpeicher(new sp.DateiSpeicher(path.join(ordner, "gleichzeitig.json")));
    assert.equal((await p.akte("Parallel")).eintraege.length, 25);
  });

  test("schlägt ein Schritt fehl, steht in der Datei der Stand von vorher", async () => {
    const datei = path.join(ordner, "transaktion.json");
    const s = new sp.DateiSpeicher(datei);
    sp.setzeSpeicher(s);
    const projekt = await p.legeProjektAn({ name: "Stabil" }, "mac");
    const vorher = readFileSync(datei, "utf8");
    await assert.rejects(
      s.transaktion(async () => {
        await s.speichereProjekt({ ...projekt, name: "Halb fertig" });
        throw new Error("mittendrin abgebrochen");
      }),
      /mittendrin/,
    );
    assert.equal(readFileSync(datei, "utf8"), vorher);
    assert.equal((await s.projekte())[0].name, "Stabil");
  });

  test("eine beschädigte Datei wird gemeldet und nie überschrieben", async () => {
    const datei = path.join(ordner, "kaputt.json");
    writeFileSync(datei, '{"version":1,"projekte":[{"id":"p1","name":"Wichtig"');
    sp.setzeSpeicher(new sp.DateiSpeicher(datei));
    await assert.rejects(p.uebersicht(), sp.SpeicherFehler);
    await assert.rejects(p.legeProjektAn({ name: "Neu" }, "mac"), sp.SpeicherFehler);
    await assert.rejects(p.schlageVor({ projekt: "Neu", eintraege: [] }, { kanal: "mac", fremd: false }), sp.SpeicherFehler);
    assert.equal(readFileSync(datei, "utf8"), '{"version":1,"projekte":[{"id":"p1","name":"Wichtig"');
  });
});

describe("Projektgedächtnis: Audit-Log ohne Inhalte", () => {
  test("jede Änderung steht im Log, aber nur mit Nummern und Arten", async () => {
    const projekt = await p.legeProjektAn({ name: "Geheimprojekt Adler" }, "mac", JETZT);
    const e = await p.trageEin(projekt.id, { art: "entscheidung", text: "Kaufpreis höchstens 2,4 Millionen" }, "mac", JETZT);
    await p.korrigiere(e.id, { text: "Kaufpreis höchstens 2,6 Millionen" }, "nachverhandelt", "mac", JETZT);
    await p.schlageVor({ projekt: "Geheimprojekt Adler", eintraege: [{ art: "risiko", text: "Verkäufer springt ab" }] }, { kanal: "mac", fremd: false });
    await audit.auditFertig();
    const eintraege = (await audit.leseAudit(50)).filter((a) => a.art === "projekt");
    const was = eintraege.map((a) => a.was);
    for (const erwartet of ["Projekt angelegt", "Eintrag angelegt", "Eintrag korrigiert", "Vorschläge für das Projektgedächtnis"]) assert.ok(was.includes(erwartet), erwartet);
    const roh = JSON.stringify(eintraege);
    for (const inhalt of ["Adler", "Millionen", "nachverhandelt", "springt ab"]) assert.ok(!roh.includes(inhalt), `„${inhalt}“ steht im Audit-Log`);
    assert.ok(roh.includes(projekt.id) && roh.includes(e.id));
    assert.equal((await audit.pruefeAudit()).ok, true);
  });
});

describe("Projektgedächtnis: das Gehirn liest Bestätigtes und schlägt vor", () => {
  test("es gibt kein Werkzeug, das Einträge schreibt; projekt_vorschlagen ist Klasse B, die Lesewerkzeuge Klasse A", async () => {
    claude.drehbuch([{ text: "Ok." }]);
    await brain.think(cfg(), "sk-test", frage("Hallo"));
    const namen = (claude.anfragen[0].tools as { name: string }[]).map((t) => t.name).filter((n) => n.startsWith("projekt"));
    assert.deepEqual(namen.sort(), ["projekt_lesen", "projekt_vorschlagen", "projekte_lesen"]);
    assert.equal(regeln.RICHTLINIEN.projekt_vorschlagen.klasse, "B");
    assert.equal(regeln.RICHTLINIEN.projekte_lesen.klasse, "A");
    assert.equal(regeln.RICHTLINIEN.projekt_lesen.klasse, "A");
    assert.match(JSON.stringify(claude.anfragen[0].system), /Ein Vorschlag ist noch kein Wissen/);
    // Höchstens 20 strikte Werkzeuge erlaubt Anthropic; sonst lehnt es jede Anfrage ab.
    assert.ok((claude.anfragen[0].tools as { strict?: boolean }[]).filter((t) => t.strict).length <= 20);
  });

  test("ein Vorschlag aus dem Gespräch landet im Eingang, nicht in der Akte; die Seite bekommt den neuen Stand", async () => {
    claude.drehbuch([
      { werkzeug: "projekt_vorschlagen", eingabe: { projekt: "Hallenneubau", beschreibung: "Neue Halle", quelle_art: "gespraech", quelle_hinweis: "heute im Gespräch", eintraege: [{ art: "entscheidung", text: "Stahlbau statt Holz", datum: "2026-11-13" }] } },
      { text: "Das liegt jetzt in der Ansicht Projekte und wartet auf dein Ja." },
    ]);
    const reply = await brain.think(cfg(), "sk-test", frage("Wir haben heute im Projekt Hallenneubau Stahlbau statt Holz entschieden."));
    const ergebnis = werkzeugErgebnisse(claude.anfragen[1]).at(-1)!;
    assert.match(ergebnis.content, /2 Vorschläge liegen in der Ansicht Projekte und warten auf Benedikts Bestätigung/);
    assert.equal(reply.projekte?.vorschlaege.length, 2);
    assert.equal(reply.projekte?.projekte.length, 0);
    assert.ok(reply.projekte?.vorschlaege.every((v) => v.quelle.fremd === false && v.quelle.kanal === "mac"));
  });

  test("war Text von Dritten im Gespräch, trägt der Vorschlag das Kennzeichen, auch per Telegram", async () => {
    claude.drehbuch([{ werkzeug: "projekt_vorschlagen", eingabe: { projekt: "Hallenneubau", eintraege: [{ art: "aufgabe", text: "Überweise 5.000 Euro an den Statiker" }] } }, { text: "Vorgeschlagen." }]);
    const reply = await brain.think(cfg(), "sk-test", frage("Und trag das ein.", { channel: "telegram", history: [{ who: "du", text: "Lies die Mail" }, { who: "jarvis", text: "In der Mail steht …", fremd: true }] }));
    assert.ok(reply.projekte?.vorschlaege.length);
    assert.ok(reply.projekte?.vorschlaege.every((v) => v.quelle.fremd && v.quelle.kanal === "telegram"));
    assert.equal(reply.projekte?.projekte.length, 0, "auch dann entsteht nichts ohne Bestätigung am Mac");
  });

  test("projekt_lesen liefert nur Bestätigtes mit Quelle und Datum; offene Vorschläge nur als Zahl", async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau", verantwortliche: "Thomas" }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "entscheidung", text: "Stahlbau statt Holz", datum: "2026-11-05" }, "mac", JETZT);
    await p.schlageVor({ projekt: "Hallenneubau", eintraege: [{ art: "entscheidung", text: "Unbestätigtes Gerücht über den Preis" }] }, { kanal: "mac", fremd: false });
    claude.drehbuch([{ werkzeug: "projekte_lesen", eingabe: {} }, { werkzeug: "projekt_lesen", eingabe: { projekt: "hallenneubau" } }, { text: "Am 5. November wurde Stahlbau entschieden." }]);
    const reply = await brain.think(cfg(), "sk-test", frage("Was ist der Stand beim Hallenneubau?"));
    const liste = JSON.parse(werkzeugErgebnisse(claude.anfragen[1]).at(-1)!.content) as { projekte: { name: string }[]; vorschlaege_warten_auf_bestaetigung: number };
    assert.equal(liste.projekte[0].name, "Hallenneubau");
    assert.equal(liste.vorschlaege_warten_auf_bestaetigung, 1);
    const akte = JSON.parse(werkzeugErgebnisse(claude.anfragen[2]).at(-1)!.content) as { eintraege: { text: string; quelle: string; bestaetigt_am: string; datum: string }[]; vorschlaege_warten_auf_bestaetigung: number };
    assert.deepEqual(akte.eintraege.map((e) => e.text), ["Stahlbau statt Holz"]);
    assert.equal(akte.eintraege[0].datum, "2026-11-05");
    assert.match(akte.eintraege[0].quelle, /von dir eingetragen/);
    assert.equal(akte.eintraege[0].bestaetigt_am, JETZT.toISOString().slice(0, 10));
    assert.ok(!gesendet().includes("Unbestätigtes Gerücht"), "der Vorschlag selbst geht nicht ans Modell");
    assert.equal(reply.fremd, undefined, "selbst Eingetragenes macht das Gespräch nicht fremd");
  });

  test("ein vertrauliches Projekt geht nicht an Anthropic: weder Name noch Beschreibung noch Inhalt, nur die Zahl", async () => {
    const geheim = await p.legeProjektAn({ name: "Projekt Adler", beschreibung: "Übernahme der Firma Mustermann GmbH", vertraulich: true }, "mac", JETZT);
    await p.trageEin(geheim.id, { art: "entscheidung", text: "Kaufpreis höchstens 2,4 Millionen" }, "mac", JETZT);
    // Das Modell rät einen Teil des Namens; die Antwort darf den ganzen Namen nicht verraten.
    claude.drehbuch([{ werkzeug: "projekte_lesen", eingabe: {} }, { werkzeug: "projekt_lesen", eingabe: { projekt: "adler" } }, { text: "Das Projekt ist vertraulich." }]);
    await brain.think(cfg(), "sk-test", frage("Was steht in dem vertraulichen Projekt?"));
    const liste = JSON.parse(werkzeugErgebnisse(claude.anfragen[1]).at(-1)!.content) as { projekte: unknown[]; vertrauliche_projekte: number };
    assert.deepEqual(liste.projekte, []);
    assert.equal(liste.vertrauliche_projekte, 1);
    const ergebnis = werkzeugErgebnisse(claude.anfragen[2]).at(-1)!;
    assert.equal(ergebnis.is_error, true);
    assert.match(ergebnis.content, /vertraulich markiert/);
    for (const inhalt of ["Projekt Adler", "Mustermann", "Millionen", geheim.id]) assert.ok(!gesendet().includes(inhalt), `„${inhalt}“ ging ans Modell`);
  });

  test("Bestätigtes aus fremder Quelle macht das Gespräch fremd; sein Projektname steht nicht in der Lagezeile", async () => {
    const [vp, ve] = (await p.schlageVor({ projekt: "Angebot Huber", quelle_art: "mail", eintraege: [{ art: "aufgabe", text: "Rückruf bei Huber" }] }, { kanal: "mac", fremd: true })).angelegt;
    await p.entscheide(vp.id, true, "mac");
    await p.entscheide(ve.id, true, "mac");
    await p.legeProjektAn({ name: "Eigenes Projekt" }, "mac");
    claude.drehbuch([{ werkzeug: "projekt_lesen", eingabe: { projekt: "Angebot Huber" } }, { text: "Du wolltest Huber zurückrufen." }]);
    const reply = await brain.think(cfg(), "sk-test", frage("Was war mit Huber?"));
    assert.equal(reply.fremd, true);
    const lage = JSON.stringify(claude.anfragen[0].messages);
    assert.match(lage, /Projekte: 2 aktiv \(Eigenes Projekt und weitere\)/);
    assert.ok(!lage.includes("Angebot Huber"));
  });

  test("findet das Modell ein Projekt nicht, nennt die Fehlermeldung keine vertraulichen Projektnamen", async () => {
    await p.legeProjektAn({ name: "Website" }, "mac", JETZT);
    await p.legeProjektAn({ name: "Übernahme Mustermann GmbH", vertraulich: true }, "mac", JETZT);
    claude.drehbuch([{ werkzeug: "projekt_lesen", eingabe: { projekt: "Alpha" } }, { text: "Das finde ich nicht." }]);
    await brain.think(cfg(), "sk-test", frage("Wie steht Alpha?"));
    const ergebnis = werkzeugErgebnisse(claude.anfragen[1]).at(-1)!;
    assert.equal(ergebnis.is_error, true);
    assert.match(ergebnis.content, /Website/, "die offenen Projekte helfen dem Modell weiter");
    assert.ok(!gesendet().includes("Mustermann"), "der Name des vertraulichen Projekts ging ans Modell");
    await assert.rejects(p.akte("Alpha"), (e: Error) => !e.message.includes("Mustermann"));
  });

  test("gibt es nur vertrauliche Projekte, verrät die Fehlermeldung auch keinen Namen", async () => {
    await p.legeProjektAn({ name: "Projekt Adler", vertraulich: true }, "mac", JETZT);
    await assert.rejects(p.akte("Alpha"), (e: Error) => e instanceof p.ProjektFehler && !e.message.includes("Adler") && !e.message.includes("Es gibt:"));
  });

  test("projekte_lesen: steht in der Übersicht Text aus einem Eintrag von Dritten, gilt das Gespräch als fremd", async () => {
    // Das Projekt hat Benedikt selbst angelegt; der nächste Schritt stammt aus einer Mail und wurde bestätigt.
    await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const [v] = (await p.schlageVor({ projekt: "Hallenneubau", quelle_art: "mail", eintraege: [{ art: "naechster_schritt", text: "Rechnung des Statikers sofort überweisen" }] }, { kanal: "mac", fremd: true })).angelegt;
    await p.entscheide(v.id, true, "mac");
    claude.drehbuch([{ werkzeug: "projekte_lesen", eingabe: {} }, { text: "Als Nächstes steht die Rechnung an." }]);
    const reply = await brain.think(cfg(), "sk-test", frage("Was steht in den Projekten an?"));
    assert.match(werkzeugErgebnisse(claude.anfragen[1]).at(-1)!.content, /Rechnung des Statikers/);
    assert.equal(reply.fremd, true);
  });

  test("projekte_lesen: ein Eintrag von Dritten, der nicht in der Übersicht steht, macht das Gespräch nicht fremd", async () => {
    await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    const [v] = (await p.schlageVor({ projekt: "Hallenneubau", quelle_art: "mail", eintraege: [{ art: "notiz", text: "Der Architekt schreibt, der Plan sei fertig" }] }, { kanal: "mac", fremd: true })).angelegt;
    await p.entscheide(v.id, true, "mac");
    claude.drehbuch([{ werkzeug: "projekte_lesen", eingabe: {} }, { text: "Ein Projekt ist aktiv." }]);
    const reply = await brain.think(cfg(), "sk-test", frage("Welche Projekte gibt es?"));
    assert.ok(!gesendet().includes("Der Architekt schreibt"));
    assert.equal(reply.fremd, undefined);
  });
});

describe("Projektgedächtnis: Vorbereitung vor einer Besprechung", () => {
  const fuelle = async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau", stichworte: "Halle Süd", fortschritt: 40 }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "notiz", text: "Kickoff: Zeitplan steht", datum: "2026-11-06" }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "entscheidung", text: "Stahlbau statt Holz", datum: "2026-11-05" }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "aufgabe", text: "Statik prüfen", zustaendig: "Thomas", faellig: "2026-11-10" }, "mac", JETZT);
    const weg = await p.trageEin(projekt.id, { art: "risiko", text: "Falsches Risiko" }, "mac", JETZT);
    await p.zieheZurueck(weg.id, "falsch", "mac");
    const geheim = await p.legeProjektAn({ name: "Adler", vertraulich: true }, "mac", JETZT);
    await p.trageEin(geheim.id, { art: "entscheidung", text: "Kaufpreis höchstens 2,4 Millionen" }, "mac", JETZT);
    return projekt;
  };

  test("Projekte werden im Titel als ganze Wörter erkannt, auch über Stichworte", async () => {
    const projekte = [{ name: "Halle", stichworte: ["HN-26"] }, { name: "IT", stichworte: [] }];
    assert.equal(lib.projekteImText(projekte, "Jour fixe Halle, 14 Uhr").length, 1);
    assert.equal(lib.projekteImText(projekte, "Hallenbad mit den Kindern").length, 0);
    assert.equal(lib.projekteImText(projekte, "Abstimmung hn-26").length, 1);
    assert.equal(lib.projekteImText(projekte, "IT").length, 0, "zu kurze Namen lösen nichts aus");
  });

  test("die Vorbereitung nennt letzte Besprechung, Entscheidungen und Offenes mit Datum; Zurückgezogenes und Vertrauliches fehlen", async () => {
    await fuelle();
    const [v] = await p.terminVorbereitung("Jour fixe Halle Süd", JETZT);
    assert.equal(v.projekt, "Hallenneubau");
    assert.match(v.text, /^Projekt Hallenneubau \(40 %\)/);
    assert.match(v.text, /Letzte Besprechung \(6\. November\): Kickoff: Zeitplan steht/);
    assert.match(v.text, /• Stahlbau statt Holz \(5\. November\)/);
    assert.match(v.text, /• Statik prüfen \(Thomas\), seit 3 Tagen überfällig/);
    assert.ok(!v.text.includes("Falsches Risiko"));
    assert.equal(v.fremd, false);
    assert.deepEqual(await p.terminVorbereitung("Abstimmung Adler", JETZT), []);
    assert.deepEqual(await p.terminVorbereitung("Zahnarzt", JETZT), []);
  });

  test("per Telegram kommt die Vorbereitung nur, wenn es eingeschaltet ist, und nie aus vertraulichen Projekten", async () => {
    await fuelle();
    // Der Kalender liest ab heute, deshalb hier die echte Uhrzeit. Erzwungenes Lesen umgeht den Zwischenspeicher.
    const nun = new Date();
    const start = nun.getTime() + 10 * 60_000;
    const termin = (id: string, title: string) => ({ id, title, start, end: start + 3_600_000, allDay: false, location: "", calendar: "Privat" });
    writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [termin("a", "Jour fixe Hallenneubau"), termin("b", "Abstimmung Adler")] }));
    const basis = { token: TOKEN, bot: "jarvis_test_bot", chatId: ICH, briefing: null };

    await config.writeConfig({ ...cfg(), telegram: basis });
    await kalender.readCalendar({ force: true });
    await zeitplan.zeitplanJetzt(nun);
    const ohne = tg.texteAn(ICH);
    assert.equal(ohne.filter((t) => t.startsWith("⏰")).length, 2, "die Erinnerungen selbst kommen");
    assert.ok(!ohne.some((t) => t.includes("Stahlbau")), "ohne Einschalten keine Projektinhalte über Telegram");

    tg.leeren();
    await config.writeConfig({ ...cfg(), telegram: { ...basis, projekte: true } });
    // Derselbe Termin eine Minute später, als wäre noch nicht erinnert worden: neuer Startzeitpunkt, neuer Schlüssel.
    writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [{ ...termin("a", "Jour fixe Hallenneubau"), start: start + 60_000 }, { ...termin("b", "Abstimmung Adler"), start: start + 60_000 }] }));
    await kalender.readCalendar({ force: true });
    await zeitplan.zeitplanJetzt(new Date(nun.getTime() + 6 * 60_000));
    const mit = tg.texteAn(ICH);
    assert.ok(mit.some((t) => t.startsWith("Projekt Hallenneubau") && t.includes("Stahlbau statt Holz")), mit.join(" | "));
    assert.ok(!mit.some((t) => t.includes("Millionen")), "Vertrauliches geht nie über Telegram");
  });
});

describe("Projektgedächtnis: Briefing und Tagesabschluss per Telegram", () => {
  const fuelle = async () => {
    const projekt = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", JETZT);
    await p.trageEin(projekt.id, { art: "aufgabe", text: "Statik prüfen", faellig: "2026-11-10" }, "mac", JETZT);
    const geheim = await p.legeProjektAn({ name: "Adler", vertraulich: true }, "mac", JETZT);
    await p.trageEin(geheim.id, { art: "aufgabe", text: "Kaufpreis nachverhandeln", faellig: "2026-11-11" }, "mac", JETZT);
    // Ein leerer Kalender: Titel von Terminen stehen ohnehin im Briefing, hier geht es nur um das Projektgedächtnis.
    writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [] }));
    await kalender.readCalendar({ force: true });
  };
  // Erinnerungen aus: Hier zählen nur Briefing und Tagesabschluss.
  const basis = { token: TOKEN, bot: "jarvis_test_bot", chatId: ICH, reminders: false };
  const am = (tag: number, stunde: number, minute: number) => new Date(2026, 10, tag, stunde, minute);

  test("im Briefing stehen Projekte ohne den Schalter nur als Zahl, mit ihm beim Namen; vertrauliche nie", async () => {
    await fuelle();
    tg.leeren();
    await config.writeConfig({ ...cfg(), telegram: { ...basis, briefing: "07:30" } });
    await zeitplan.zeitplanJetzt(am(13, 7, 31));
    const [zahlen] = tg.texteAn(ICH);
    assert.match(zahlen, /Projekte: 2 brauchen dich, alle dringend\. Einzelheiten am Mac unter „Heute“\./);
    for (const wort of ["Hallenneubau", "Statik", "Adler", "Kaufpreis"]) assert.ok(!zahlen.includes(wort), `„${wort}“ ging ohne Schalter über Telegram`);

    tg.leeren();
    await config.writeConfig({ ...cfg(), telegram: { ...basis, briefing: "07:30", projekte: true } });
    await zeitplan.zeitplanJetzt(am(14, 7, 31));
    const [namen] = tg.texteAn(ICH);
    assert.match(namen, /• Hallenneubau: Eine Aufgabe ist überfällig: Statik prüfen, seit 4 Tagen überfällig/);
    assert.match(namen, /• ein vertrauliches Projekt: Einzelheiten nur am Mac/);
    for (const wort of ["Adler", "Kaufpreis"]) assert.ok(!namen.includes(wort), `„${wort}“ ging über Telegram`);
  });

  test("der Tagesabschluss kommt nur, wenn eine Uhrzeit eingestellt ist, dann einmal am Tag", async () => {
    await fuelle();
    tg.leeren();
    await config.writeConfig({ ...cfg(), telegram: { ...basis, briefing: null } });
    await zeitplan.zeitplanJetzt(am(13, 18, 1));
    assert.equal(tg.texteAn(ICH).length, 0, "Voreinstellung: kein Tagesabschluss");

    await config.writeConfig({ ...cfg(), telegram: { ...basis, briefing: null, abschluss: "18:00" } });
    await zeitplan.zeitplanJetzt(am(13, 17, 59));
    assert.equal(tg.texteAn(ICH).length, 0, "vor der Zeit nichts");
    await zeitplan.zeitplanJetzt(am(13, 18, 1));
    const texte = tg.texteAn(ICH);
    assert.equal(texte.length, 1);
    assert.match(texte[0], /^Feierabend, Benedikt\. Dein Tag in Kürze:/);
    assert.match(texte[0], /Projekte: 2 haben Überfälliges oder eine Frist von heute\. Einzelheiten am Mac unter „Heute“\./);
    for (const wort of ["Hallenneubau", "Statik", "Adler", "Kaufpreis"]) assert.ok(!texte[0].includes(wort), `„${wort}“ ging ohne Schalter über Telegram`);
    await zeitplan.zeitplanJetzt(am(13, 18, 2));
    assert.equal(tg.texteAn(ICH).length, 1, "kein zweiter Tagesabschluss am selben Tag");
  });
});
