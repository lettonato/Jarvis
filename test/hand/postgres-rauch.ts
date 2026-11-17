// Handprüfung: das Projektgedächtnis in einem echten PostgreSQL (nicht Teil von npm test, weil dafür PostgreSQL
// auf dem Rechner installiert sein muss).
//   npx tsx test/hand/postgres-rauch.ts
// Das Skript startet ein eigenes, leeres PostgreSQL auf 127.0.0.1 in einem Wegwerf-Ordner und räumt es danach
// weg. Es berührt keine Datenbank im Netz und nichts in Azure. Die Programme sucht es in JARVIS_PG_BIN oder an
// den üblichen Orten (siehe test/helfer/postgres.ts).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { sichereUmgebung } from "../helfer/umgebung";
import { startePostgres } from "../helfer/postgres";
import type { Eintrag, Projekt, Vorschlag } from "../../src/lib/projekte";

const ordner = sichereUmgebung("postgres-rauch");
const quelle = { art: "eingabe", hinweis: "", kanal: "mac", fremd: false, von: "mensch" } as const;
const projekt = (id: string, name: string, extra: Partial<Projekt> = {}): Projekt => ({ id, name, beschreibung: "Zeile 1\nZeile 2 mit „Anführung“, ' und \\", status: "aktiv", verantwortliche: ["Benedikt", "Jörg"], fortschritt: null, stichworte: ["Halle 3"], vertraulich: false, quelle, erstelltAm: "2026-11-14T08:00:00.000Z", geaendertAm: "2026-11-14T08:00:00.000Z", ...extra });
const eintrag = (id: string, projektId: string, text: string): Eintrag => ({ id, projektId, art: "aufgabe", text, zustaendig: "Benedikt", faellig: "2026-11-20", datum: null, erledigt: false, quelle, erstelltAm: "2026-11-14T08:00:00.000Z", bestaetigtAm: "2026-11-14T08:00:00.000Z", geaendertAm: null, verlauf: [{ am: "2026-11-14T09:00:00.000Z", von: "mac", grund: "Tippfehler", vorher: { text: "alt" } }], zurueckgezogen: null });
const vorschlag = (id: string, zustand: Vorschlag["zustand"]): Vorschlag => ({ id, art: "projekt", projektId: null, projektName: `Idee ${id}`, eintragId: null, inhalt: { beschreibung: "aus dem Gespräch" }, quelle: { ...quelle, art: "gespraech", von: "jarvis" }, erstelltAm: "2026-11-14T08:00:00.000Z", zustand, entschiedenAm: zustand === "offen" ? null : "2026-11-14T09:00:00.000Z" });
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const db = startePostgres(54329, { zweiteAdresse: true });
  const { PgSpeicher } = await import("../../src/lib/server/projekte/pg-speicher");
  const { DateiSpeicher, SpeicherFehler } = await import("../../src/lib/server/projekte/speicher");
  const { kopiereSpeicher } = await import("../../src/lib/server/projekte/umzug");
  const offen: InstanceType<typeof PgSpeicher>[] = [];
  const neu = () => {
    const s = new PgSpeicher(db.url);
    offen.push(s);
    return s;
  };
  const sql = async (text: string, adresse = db.url) => {
    const c = new Client({ connectionString: adresse });
    await c.connect();
    try {
      return (await c.query(text)).rows;
    } finally {
      await c.end();
    }
  };
  const leere = () => sql("truncate projekt_vorschlaege, projekt_eintraege, projekte");
  const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

  try {
    console.log((await sql("select version()"))[0].version);

    // 1. Zwei JARVIS-Prozesse starten gleichzeitig an einer leeren Datenbank: Die Tabellen entstehen genau einmal.
    const a = neu();
    const b = neu();
    assert.deepEqual(await Promise.all([a.projekte(), b.projekte(), a.eintraege(), b.vorschlaege()]), [[], [], [], []]);
    assert.deepEqual((await sql("select table_name from information_schema.tables where table_schema = 'public' order by 1")).map((z) => z.table_name), ["projekt_eintraege", "projekt_vorschlaege", "projekte"]);
    assert.equal(a.ort, "PostgreSQL-Datenbank „postgres“ auf 127.0.0.1");
    schritt("Tabellen werden beim ersten Zugriff angelegt, auch wenn zwei Prozesse gleichzeitig starten");

    // 2. Was hineingeht, kommt genauso heraus, in der Reihenfolge des Anlegens; Ersetzen behält den Platz.
    const p1 = projekt("p1", "Hallenneubau");
    const p2 = projekt("p2", "Fuhrpark", { fortschritt: 40, vertraulich: true });
    await a.speichereProjekt(p1);
    await a.speichereProjekt(p2);
    await a.speichereProjekt({ ...p1, status: "pausiert" });
    assert.deepEqual(await b.projekte(), [{ ...p1, status: "pausiert" }, p2]);
    const e = [eintrag("e1", "p1", "Statik beauftragen"), eintrag("e2", "p2", "Angebote einholen"), eintrag("e3", "p1", "Bauantrag")];
    for (const x of e) await a.speichereEintrag(x);
    await a.speichereEintrag({ ...e[0], erledigt: true });
    assert.deepEqual(await b.eintraege(), [{ ...e[0], erledigt: true }, e[1], e[2]]);
    assert.deepEqual((await b.eintraege("p1")).map((x) => x.id), ["e1", "e3"]);
    assert.deepEqual(await b.eintraege("gibt-es-nicht"), []);
    await a.speichereVorschlag(vorschlag("v1", "offen"));
    await a.speichereVorschlag(vorschlag("v2", "abgelehnt"));
    await a.speichereVorschlag({ ...vorschlag("v1", "uebernommen") });
    await a.speichereVorschlag(vorschlag("v3", "offen"));
    assert.deepEqual((await b.vorschlaege()).map((v) => `${v.id}:${v.zustand}`), ["v1:uebernommen", "v2:abgelehnt", "v3:offen"]);
    assert.deepEqual((await b.vorschlaege("offen")).map((v) => v.id), ["v3"]);
    assert.deepEqual((await b.vorschlaege("uebernommen"))[0], vorschlag("v1", "uebernommen"));
    schritt("speichern und lesen: gleicher Inhalt, gleiche Reihenfolge, Filter nach Projekt und Zustand");

    // 3. „Neustart“: Ein frischer Prozess liest denselben Stand.
    await a.schliesse();
    assert.equal((await neu().projekte()).length, 2);
    schritt("der Stand übersteht einen Neustart");

    // 4. Schlägt ein Schritt fehl, bleibt der Stand von vorher; der Fehler der Abläufe kommt unverändert an.
    await assert.rejects(
      b.transaktion(async () => {
        await b.speichereProjekt({ ...p2, name: "Halb fertig" });
        await b.speichereEintrag(eintrag("e9", "p2", "kommt nie an"));
        assert.equal((await b.projekte())[1].name, "Halb fertig", "innerhalb sieht die Transaktion ihren eigenen Stand");
        throw new Error("mittendrin abgebrochen");
      }),
      /^Error: mittendrin abgebrochen$/,
    );
    assert.equal((await b.projekte())[1].name, "Fuhrpark");
    assert.equal((await b.eintraege()).length, 3);
    schritt("Abbruch mitten in einer Transaktion: nichts davon ist gespeichert");

    // 5. Ein Eintrag zu einem Projekt, das es nicht gibt, wird abgelehnt. Wird der Fehler verschluckt, gilt die
    //    ganze Transaktion trotzdem nicht als gelungen.
    await assert.rejects(b.speichereEintrag(eintrag("e8", "gibt-es-nicht", "verwaist")), (f: unknown) => f instanceof SpeicherFehler && /Kennung 23503/.test(f.message));
    await assert.rejects(
      b.transaktion(async () => {
        await b.speichereProjekt({ ...p2, name: "Sollte nicht bleiben" });
        await b.speichereEintrag(eintrag("e8", "gibt-es-nicht", "verwaist")).catch(() => {});
      }),
      SpeicherFehler,
    );
    assert.equal((await b.projekte())[1].name, "Fuhrpark");
    schritt("verwaiste Einträge lehnt die Datenbank ab; ein verschluckter Fehler geht nicht als Erfolg durch");

    // 6. Gleichzeitiges Schreiben: nichts geht verloren, auch nicht zwischen zwei Prozessen.
    const c = neu();
    await Promise.all(Array.from({ length: 40 }, (_, i) => (i % 2 ? b : c).speichereEintrag(eintrag(`g${i}`, "p1", `gleichzeitig ${i}`))));
    assert.equal((await b.eintraege("p1")).length, 42);
    // Lesen, rechnen, schreiben in einer Transaktion, 2 × 15-mal gleichzeitig aus zwei Prozessen.
    await b.speichereProjekt({ ...p1, fortschritt: 0 });
    const plusEins = (s: InstanceType<typeof PgSpeicher>) =>
      s.transaktion(async () => {
        const jetzt = (await s.projekte()).find((x) => x.id === "p1")!;
        await pause(3);
        await s.speichereProjekt({ ...jetzt, fortschritt: (jetzt.fortschritt ?? 0) + 1 });
      });
    await Promise.all(Array.from({ length: 30 }, (_, i) => plusEins(i % 2 ? b : c)));
    assert.equal((await b.projekte())[0].fortschritt, 30);
    schritt("gleichzeitige Änderungen aus zwei Prozessen: 40 Einträge und 30 Zählschritte, keiner verloren");

    // 7. Eine einzelne Änderung wartet, bis eine laufende Transaktion eines anderen Prozesses fertig ist.
    const reihenfolge: string[] = [];
    const lang = b.transaktion(async () => {
      const jetzt = (await b.projekte())[0];
      reihenfolge.push("Transaktion liest");
      await pause(400);
      await b.speichereProjekt({ ...jetzt, beschreibung: "aus der Transaktion" });
      reihenfolge.push("Transaktion schreibt");
    });
    await pause(100);
    const einzeln = c.speichereProjekt({ ...p1, beschreibung: "einzelne Änderung" }).then(() => reihenfolge.push("einzelne Änderung"));
    await Promise.all([lang, einzeln]);
    assert.deepEqual(reihenfolge, ["Transaktion liest", "Transaktion schreibt", "einzelne Änderung"]);
    assert.equal((await b.projekte())[0].beschreibung, "einzelne Änderung");
    schritt("eine einzelne Änderung wartet auf die laufende Transaktion, statt dazwischenzuschreiben");

    // 8. Entschiedene Vorschläge: Die ältesten fallen weg, offene bleiben alle.
    await leere();
    for (let i = 0; i < 3; i++) await b.speichereVorschlag(vorschlag(`offen${i}`, "offen"));
    await b.transaktion(async () => {
      for (let i = 0; i < 305; i++) await b.speichereVorschlag(vorschlag(`alt${String(i).padStart(3, "0")}`, i % 2 ? "abgelehnt" : "uebernommen"));
    });
    const rest = await b.vorschlaege();
    assert.equal(rest.filter((v) => v.zustand === "offen").length, 3);
    const entschieden = rest.filter((v) => v.zustand !== "offen").map((v) => v.id);
    assert.equal(entschieden.length, 300);
    assert.deepEqual([entschieden[0], entschieden.at(-1)], ["alt005", "alt304"]);
    schritt("von 305 entschiedenen Vorschlägen bleiben die neuesten 300, die drei offenen bleiben");

    // 9. Umzug aus der Datei: kopiert in ein leeres Ziel, verweigert ein gefülltes, die Datei bleibt.
    await leere();
    const datei = new DateiSpeicher(path.join(ordner, "projekte.json"));
    await datei.speichereProjekt(p1);
    await datei.speichereProjekt(p2);
    for (const x of e) await datei.speichereEintrag(x);
    await datei.speichereVorschlag(vorschlag("v1", "offen"));
    assert.deepEqual(await kopiereSpeicher(datei, b), { projekte: 2, eintraege: 3, vorschlaege: 1 });
    assert.deepEqual(await c.projekte(), await datei.projekte());
    assert.deepEqual(await c.eintraege(), await datei.eintraege());
    assert.deepEqual(await c.vorschlaege(), await datei.vorschlaege());
    await assert.rejects(kopiereSpeicher(datei, b), SpeicherFehler);
    assert.equal((await c.eintraege()).length, 3);
    schritt("Umzug aus der Datei in die leere Datenbank: gleicher Inhalt; ein zweiter Umzug wird verweigert");

    // 9a. Text, den die Datenbank so nicht annimmt (NUL, halbes Zeichenpaar), wird bereinigt gespeichert statt abgelehnt.
    await b.speichereProjekt(projekt("p3", "Halle\u0000 3", { beschreibung: "halb\ud83d", stichworte: ["ok\u0000"] }));
    const bereinigt = (await c.projekte()).find((x) => x.id === "p3")!;
    assert.deepEqual([bereinigt.name, bereinigt.beschreibung, bereinigt.stichworte], ["Halle 3", "halb\ufffd", ["ok"]]);
    schritt("NUL und ein halbes Zeichenpaar im Text: bereinigt gespeichert, nicht abgelehnt");

    // 9b. Geringste Rechte: Hat die IT die Tabellen angelegt, reicht JARVIS ein Konto, das nur lesen, einfügen,
    //     ändern und löschen darf. Fehlen die Tabellen und darf das Konto nichts anlegen, gibt es eine Meldung.
    await sql("create role jarvis_app login");
    await sql("grant select, insert, update, delete on projekte, projekt_eintraege, projekt_vorschlaege to jarvis_app");
    const alsApp = db.url.replace("jarvis@", "jarvis_app@");
    await assert.rejects(sql("create table darf_nicht (x int)", alsApp), /permission denied/);
    const knapp = new PgSpeicher(alsApp);
    offen.push(knapp);
    await knapp.speichereProjekt(projekt("p4", "Mit knappen Rechten"));
    await knapp.speichereEintrag(eintrag("e4", "p4", "geht"));
    await knapp.speichereVorschlag(vorschlag("v4", "abgelehnt"));
    assert.equal((await knapp.projekte()).at(-1)!.name, "Mit knappen Rechten");
    await sql("create database leer");
    const ohneTabellen = new PgSpeicher(alsApp.replace(/\/postgres$/, "/leer"));
    offen.push(ohneTabellen);
    await assert.rejects(ohneTabellen.projekte(), (f: unknown) => f instanceof SpeicherFehler && /Kennung 42501/.test(f.message));
    schritt("ein Konto ohne das Recht, Tabellen anzulegen, reicht; fehlen die Tabellen, kommt eine Meldung (42501)");

    // 9c. Hält jemand die Sperre lange, bleibt Lesen möglich, wartende Änderungen kommen danach an, und eine
    //     Änderung mit kurzer Geduld gibt mit einer Meldung auf, statt endlos zu hängen.
    const halter = new Client({ connectionString: db.url });
    await halter.connect();
    await halter.query("select pg_advisory_lock($1)", [0x4a525653]);
    const wartend = Array.from({ length: 8 }, (_, i) => b.speichereEintrag(eintrag(`w${i}`, "p1", `wartet ${i}`)));
    await pause(150);
    const t0 = Date.now();
    await Promise.all(Array.from({ length: 6 }, () => b.projekte().then(() => b.eintraege())));
    assert.ok(Date.now() - t0 < 1000, `Lesen ging in ${Date.now() - t0} ms, obwohl acht Änderungen auf die Sperre warten`);
    assert.equal((await b.eintraege()).filter((x) => x.id.startsWith("w")).length, 0);
    const ungeduldig = new PgSpeicher(db.url, { sperrfristMs: 300 });
    offen.push(ungeduldig);
    const zuLang = new Promise<never>((_, nein) => setTimeout(() => nein(new Error("die Änderung hängt, statt nach ihrer Frist aufzugeben")), 5_000));
    try {
      await assert.rejects(Promise.race([ungeduldig.speichereProjekt(p2), zuLang]), (f: unknown) => f instanceof SpeicherFehler && /Kennung 55P03/.test(f.message));
    } finally {
      // Mit dem Ende dieser Verbindung ist die Sperre in jedem Fall wieder frei.
      await halter.end();
    }
    await Promise.all(wartend);
    assert.deepEqual((await b.eintraege()).filter((x) => x.id.startsWith("w")).map((x) => x.id), ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"]);
    schritt("lange gehaltene Sperre: Lesen geht weiter, acht wartende Änderungen kommen in ihrer Reihenfolge an, kurze Geduld meldet 55P03");

    // 9e. Die Datenbank beendet die Verbindung mitten in einer Transaktion (so, wie es ein Neustart des Dienstes
    //     oder ein Abriss im Netz tut), während JARVIS gerade nichts fragt. Der Server muss weiterlaufen, die
    //     Transaktion scheitert mit der festen Meldung, nichts davon ist gespeichert, und danach geht es weiter.
    await assert.rejects(
      b.transaktion(async () => {
        await b.speichereProjekt({ ...p2, name: "Geht mit der Verbindung verloren" });
        const beendet = await sql("select pg_terminate_backend(pid) as weg from pg_stat_activity where pid <> pg_backend_pid() and state = 'idle in transaction'");
        assert.equal(beendet.length, 1, "genau die Verbindung dieser Transaktion wurde beendet");
        await pause(300);
        await b.projekte();
      }),
      SpeicherFehler,
    );
    assert.equal((await b.projekte()).find((x) => x.id === "p2")!.name, "Fuhrpark");
    await b.speichereProjekt(p2);
    schritt("die Datenbank kappt die Verbindung mitten in einer Transaktion: Server läuft weiter, nichts gespeichert, danach geht es weiter");

    // 9d. Verschlüsselung: An eine Adresse, die nicht dieser Rechner ist, geht nichts unverschlüsselt und nichts
    //     an ein Zertifikat, dem niemand vertraut. (127.0.0.2 ist technisch dieser Rechner, zählt für JARVIS aber nicht dazu.)
    const fern = db.url.replace("127.0.0.1", "127.0.0.2");
    const unverschluesselt = new PgSpeicher(fern);
    offen.push(unverschluesselt);
    await assert.rejects(unverschluesselt.projekte(), (f: unknown) => f instanceof SpeicherFehler && /Kennung KEINE_VERSCHLUESSELUNG/.test(f.message));
    for (const s of offen) await s.schliesse();
    db.mitSelbstAusgestelltemZertifikat();
    assert.equal((await sql("show ssl"))[0].ssl, "on");
    await assert.rejects(new PgSpeicher(fern).projekte(), (f: unknown) => f instanceof SpeicherFehler && /Kennung (DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN)/.test(f.message));
    await assert.rejects(new PgSpeicher(`${fern}?sslmode=disable`).projekte(), (f: unknown) => f instanceof SpeicherFehler && /SELF_SIGNED/.test(f.message), "sslmode=disable in der Adresse ändert nichts");
    assert.ok((await b.projekte()).length >= 2, "auf 127.0.0.1 geht es weiter wie bisher");
    schritt("fremde Adresse: ohne Verschlüsselung keine Verbindung, mit selbst ausgestelltem Zertifikat auch nicht");

    // 10. Die Datenbank fällt aus: feste Meldung ohne Benutzer und Adresse; kommt sie wieder, geht es weiter.
    db.anhalten();
    for (const versuch of [() => b.projekte(), () => b.speichereProjekt(p1), () => b.transaktion(async () => 1), () => neu().projekte()]) {
      await assert.rejects(versuch(), (f: unknown) => {
        assert.ok(f instanceof SpeicherFehler, String(f));
        assert.match(f.message, /^Die Datenbank des Projektgedächtnisses ist nicht erreichbar oder hat einen Fehler gemeldet \(Kennung [0-9A-Z_]+\)\.$/);
        assert.ok(!f.message.includes("jarvis@") && !f.message.includes("127.0.0.1"));
        return true;
      });
    }
    db.weiter();
    assert.equal((await b.projekte()).length, 4);
    await b.speichereProjekt({ ...p1, status: "abgeschlossen" });
    assert.equal((await c.projekte())[0].status, "abgeschlossen");
    schritt("Ausfall der Datenbank: feste Meldung, nichts verloren; danach geht es von selbst weiter");

    // 11. Die ganze Logik des Projektgedächtnisses (dieselben Tests wie in npm test) gegen diese Datenbank.
    for (const s of offen) await s.schliesse();
    const lauf = spawnSync(process.execPath, ["--import", "tsx", "--test", "test/module/projekte.test.ts"], { env: { ...process.env, JARVIS_TEST_PG: db.url }, encoding: "utf8" });
    const zahl = (name: string) => Number(new RegExp(`^# ${name} (\\d+)$`, "m").exec(lauf.stdout)?.[1] ?? -1);
    if (lauf.status !== 0 || zahl("fail") !== 0) console.log(lauf.stdout.split("\n").filter((z) => /^\s*not ok|error:|expected|actual/i.test(z)).slice(0, 40).join("\n"));
    assert.equal(lauf.status, 0, "die Tests des Projektgedächtnisses bestehen gegen PostgreSQL");
    assert.deepEqual([zahl("fail"), zahl("cancelled"), zahl("skipped"), zahl("todo")], [0, 0, 0, 0]);
    assert.ok(zahl("pass") >= 38 && zahl("pass") === zahl("tests"));
    // Beleg, dass die Tests wirklich in dieser Datenbank gearbeitet haben: Vom letzten Test stehen Zeilen darin.
    const spuren = Number((await sql("select (select count(*) from projekte) + (select count(*) from projekt_eintraege) as n"))[0].n);
    assert.ok(spuren > 0, "die Tests haben in der Datenbank gearbeitet");
    schritt(`die Tests des Projektgedächtnisses gegen PostgreSQL: ${zahl("pass")} von ${zahl("tests")} bestehen (vier davon prüfen nur die Datei)`);

    console.log("Projektgedächtnis in PostgreSQL: alle Schritte in Ordnung.");
  } finally {
    for (const s of offen) await s.schliesse();
    db.stop();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
