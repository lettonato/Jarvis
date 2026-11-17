// Microsoft 365 (src/lib/server/microsoft.ts) gegen ein nachgebautes Microsoft: Anmeldung mit Code, Erneuern,
// Termine aus Outlook lesen. Geprüft wird vor allem, was nicht passieren darf: kein Schlüssel an eine fremde
// Adresse, kein Text von Microsoft in einer Meldung, kein Outlook-Termin im Gespräch mit dem KI-Modell oder
// über Telegram ohne den Schalter. Das echte Microsoft wird nie berührt.

import assert from "node:assert/strict";
import { chmodSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock, werkzeugErgebnisse, type ClaudeMock } from "../mocks/claude-mock";
import { graphTermin, MOCK_CLIENT, MOCK_TENANT, starteMicrosoftMock, type MicrosoftMock } from "../mocks/microsoft-mock";
import { MICROSOFT_SATZ } from "../../src/lib/microsoft";

const ordner = sichereUmgebung("microsoft");
const ablage = testOrdner("microsoft-mac");
const MAC = path.join(ablage, "kalender.json");

let ms: MicrosoftMock;
let claude: ClaudeMock;
let m: typeof import("../../src/lib/server/microsoft");
let aktionen: typeof import("../../src/lib/server/microsoft-aktionen");
let kalender: typeof import("../../src/lib/server/calendar");
let config: typeof import("../../src/lib/server/config");
let brain: typeof import("../../src/lib/server/brain");

const JETZT = new Date(2026, 10, 13, 10, 0);
const spaeter = (sekunden: number) => new Date(JETZT.getTime() + sekunden * 1000);
const VON = new Date(2026, 10, 13).getTime();
const BIS = new Date(2026, 11, 14).getTime();
const datei = () => readFileSync(path.join(ordner, "config.json"), "utf8");
const gespeichert = () => (JSON.parse(datei()) as { microsoft?: Record<string, unknown> }).microsoft;
const zuGraph = () => ms.anfragen.filter((a) => a.pfad.startsWith("/v1.0/"));
const zurAnmeldung = () => ms.anfragen.filter((a) => a.pfad.includes("/oauth2/"));
const termine = (now = JETZT, force = false) => m.outlookTermine(VON, BIS, { now, force });

async function richteEin() {
  await aktionen.microsoftAktion({ action: "einrichten", tenantId: MOCK_TENANT, clientId: MOCK_CLIENT }, JETZT);
}
// Der ganze Weg: eintragen, Anmeldung starten, „du“ bestätigst bei Microsoft, JARVIS fragt nach.
async function meldeAn() {
  await richteEin();
  await aktionen.microsoftAktion({ action: "anmelden" }, JETZT);
  ms.anmeldung = "bestaetigt";
  return aktionen.microsoftAktion({ action: "pruefen" }, spaeter(2));
}

before(async () => {
  ms = await starteMicrosoftMock();
  claude = await starteClaudeMock();
  Object.assign(process.env, { MICROSOFT_LOGIN_URL: ms.loginUrl, MICROSOFT_GRAPH_URL: ms.graphUrl, ANTHROPIC_BASE_URL: claude.url });
  m = await import("../../src/lib/server/microsoft");
  aktionen = await import("../../src/lib/server/microsoft-aktionen");
  kalender = await import("../../src/lib/server/calendar");
  config = await import("../../src/lib/server/config");
  brain = await import("../../src/lib/server/brain");
});

after(async () => {
  await ms.stop();
  await claude.stop();
});

beforeEach(async () => {
  Object.assign(ms, { anmeldung: "wartet", userCode: "ABCD-EFGH", adresse: null, intervall: 1, angemeldetBleibenGilt: true, anmeldeStoerung: null, graphStoerung: null, fremdeFolgeseite: null, verbiegeSchluessel: null, graphWartezeit: 0, graphUmleitung: null, zugang: null, bleib: null });
  ms.termine = [graphTermin("t1", "Baubesprechung Halle 3", "2026-11-16T09:00:00", "2026-11-16T10:00:00", { location: { displayName: "Raum 2" } })];
  ms.leeren();
  ms.neu();
  Object.assign(process.env, { MICROSOFT_LOGIN_URL: ms.loginUrl, MICROSOFT_GRAPH_URL: ms.graphUrl });
  delete process.env.JARVIS_OSASCRIPT;
  await config.writeConfig({ name: "Benedikt" });
  m.vergissMicrosoft();
  kalender.vergissKalender();
});

describe("Microsoft 365: einrichten", () => {
  test("ohne Einrichtung ist nichts verbunden, und es geht nichts ins Netz", async () => {
    const status = await aktionen.microsoftStand(JETZT);
    assert.deepEqual([status.eingerichtet, status.verbunden, status.konto, status.extern, status.anmeldung, status.fehler], [false, false, null, false, null, null]);
    assert.equal(await termine(), null);
    await assert.rejects(aktionen.microsoftAktion({ action: "anmelden" }, JETZT), /Trag zuerst die Verzeichnis-ID/);
    await assert.rejects(aktionen.microsoftAktion({ action: "extern", an: true }, JETZT), /nicht eingerichtet/);
    assert.equal(ms.anfragen.length, 0);
  });

  test("nur ein einzelnes Verzeichnis und eine Anwendungsnummer werden angenommen", async () => {
    for (const tenantId of ["common", "organizations", "", "firma", "x/y.de"]) await assert.rejects(aktionen.microsoftAktion({ action: "einrichten", tenantId, clientId: MOCK_CLIENT }, JETZT), /Verzeichnis-ID sieht nicht richtig aus/, tenantId);
    await assert.rejects(aktionen.microsoftAktion({ action: "einrichten", tenantId: MOCK_TENANT, clientId: "meine-app" }, JETZT), /Anwendungs-ID sieht nicht richtig aus/);
    assert.equal(gespeichert(), undefined);
    const status = await aktionen.microsoftAktion({ action: "einrichten", tenantId: `  ${MOCK_TENANT.toUpperCase()} `, clientId: MOCK_CLIENT }, JETZT);
    assert.deepEqual([status.eingerichtet, status.tenantId, status.clientId, status.verbunden], [true, MOCK_TENANT, MOCK_CLIENT, false]);
    assert.equal(ms.anfragen.length, 0, "eintragen allein fragt Microsoft nichts");
  });

  test("eine unbekannte Aktion gibt es nicht", async () => {
    await assert.rejects(aktionen.microsoftAktion({ action: "senden" } as never, JETZT), aktionen.UnbekannteAktion);
  });
});

describe("Microsoft 365: anmelden mit Code", () => {
  test("JARVIS bittet um genau die drei Rechte und zeigt Code und Adresse von Microsoft", async () => {
    await richteEin();
    const status = await aktionen.microsoftAktion({ action: "anmelden" }, JETZT);
    assert.deepEqual(status.anmeldung, { code: "ABCD-EFGH", adresse: `${ms.loginUrl}/geraet`, bis: spaeter(900).toISOString() });
    assert.equal(status.verbunden, false);
    const [anfrage] = ms.anfragen;
    assert.equal(anfrage.pfad, `/${MOCK_TENANT}/oauth2/v2.0/devicecode`);
    assert.deepEqual(Object.fromEntries(new URLSearchParams(anfrage.body)), { client_id: MOCK_CLIENT, scope: "offline_access User.Read Calendars.ReadBasic" });
  });

  test("solange du den Code nicht eingegeben hast, wartet JARVIS und fragt nicht öfter, als Microsoft es wünscht", async () => {
    await richteEin();
    ms.intervall = 5;
    await aktionen.microsoftAktion({ action: "anmelden" }, JETZT);
    for (const s of [1, 2, 4]) await aktionen.microsoftStand(spaeter(s));
    assert.equal(zurAnmeldung().length, 1, "vor Ablauf der fünf Sekunden geht nur die erste Anfrage hinaus");
    const status = await aktionen.microsoftStand(spaeter(6));
    assert.equal(zurAnmeldung().length, 2);
    assert.deepEqual([status.verbunden, status.anmeldung?.code, status.fehler], [false, "ABCD-EFGH", null]);
  });

  test("nach deiner Bestätigung ist das Konto verbunden; die Schlüssel stehen nie im Stand für die Seite", async () => {
    const status = await meldeAn();
    assert.deepEqual([status.verbunden, status.konto, status.anmeldung, status.fehler], [true, "benedikt@ds-test.example", null, null]);
    assert.ok(!/zugang-|bleib-|geraetecode/.test(JSON.stringify(status)), "kein Schlüssel im Stand");
    assert.equal(gespeichert()!.refreshToken, "bleib-1");
    assert.ok(!datei().includes("zugang-1"), "der kurzlebige Zugangsschlüssel steht in keiner Datei");
    const frage = zurAnmeldung().at(-1)!;
    assert.deepEqual(Object.fromEntries(new URLSearchParams(frage.body)), { client_id: MOCK_CLIENT, grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: "geraetecode-1" });
    assert.deepEqual(zuGraph().map((a) => [a.pfad, a.auth]), [["/v1.0/me?$select=displayName,userPrincipalName", "Bearer zugang-1"]]);
  });

  test("abgelehnt, abgelaufen oder falscher Code: ein fester Satz, und die Anmeldung ist beendet", async () => {
    for (const [zustand, satz] of [["abgelehnt", MICROSOFT_SATZ.abgelehnt], ["abgelaufen", MICROSOFT_SATZ.zuSpaet], ["falscher-code", MICROSOFT_SATZ.anwendung]] as const) {
      await richteEin();
      await aktionen.microsoftAktion({ action: "anmelden" }, JETZT);
      ms.anmeldung = zustand;
      const status = await aktionen.microsoftStand(spaeter(2));
      assert.deepEqual([status.verbunden, status.anmeldung, status.fehler], [false, null, satz], zustand);
      assert.equal(gespeichert()!.refreshToken, undefined);
    }
  });

  test("läuft die Frist ab, endet die Anmeldung von selbst, ohne noch einmal zu fragen", async () => {
    await richteEin();
    await aktionen.microsoftAktion({ action: "anmelden" }, JETZT);
    ms.leeren();
    const status = await aktionen.microsoftStand(spaeter(901));
    assert.deepEqual([status.anmeldung, status.fehler], [null, MICROSOFT_SATZ.zuSpaet]);
    assert.equal(ms.anfragen.length, 0);
  });

  test("nennt der Anmeldeserver eine Adresse, die nicht bei Microsoft liegt, zeigt JARVIS sie nicht", async () => {
    await richteEin();
    for (const adresse of ["https://microsoft.com.evil.example/devicelogin", "http://evil.example/geraet", "javascript:alert(1)"]) {
      ms.adresse = adresse;
      await assert.rejects(aktionen.microsoftAktion({ action: "anmelden" }, JETZT), (e: Error) => e.message === MICROSOFT_SATZ.adresse, adresse);
      assert.equal((await aktionen.microsoftStand(JETZT)).anmeldung, null);
    }
    ms.adresse = null;
    ms.userCode = "<img src=x>";
    await assert.rejects(aktionen.microsoftAktion({ action: "anmelden" }, JETZT), (e: Error) => e.message === MICROSOFT_SATZ.unerwartet);
  });

  test("kennt Microsoft die Anwendung nicht oder ist nicht erreichbar, steht ein fester Satz da, nie der Text von Microsoft", async () => {
    await aktionen.microsoftAktion({ action: "einrichten", tenantId: MOCK_TENANT, clientId: "99999999-9999-9999-9999-999999999999" }, JETZT);
    await assert.rejects(aktionen.microsoftAktion({ action: "anmelden" }, JETZT), (e: Error) => e.message === MICROSOFT_SATZ.anwendung && !e.message.includes("GEHEIMER"));
    process.env.MICROSOFT_LOGIN_URL = "http://127.0.0.1:9";
    await assert.rejects(aktionen.microsoftAktion({ action: "anmelden" }, JETZT), (e: Error) => e.message === MICROSOFT_SATZ.nichtErreichbar);
  });

  test("ist Microsoft beim Nachfragen kurz nicht erreichbar, bleibt die Anmeldung offen", async () => {
    await richteEin();
    await aktionen.microsoftAktion({ action: "anmelden" }, JETZT);
    process.env.MICROSOFT_LOGIN_URL = "http://127.0.0.1:9";
    assert.equal((await aktionen.microsoftStand(spaeter(2))).anmeldung?.code, "ABCD-EFGH");
    process.env.MICROSOFT_LOGIN_URL = ms.loginUrl;
    ms.anmeldung = "bestaetigt";
    assert.equal((await aktionen.microsoftStand(spaeter(4))).verbunden, true);
  });

  test("eine neue Anmeldung abbrechen lässt die alte, wie sie ist", async () => {
    await meldeAn();
    const neu = await aktionen.microsoftAktion({ action: "anmelden" }, spaeter(10));
    assert.equal(neu.anmeldung?.code, "ABCD-EFGH");
    const danach = await aktionen.microsoftAktion({ action: "abbrechen" }, spaeter(12));
    assert.deepEqual([danach.anmeldung, danach.verbunden, danach.konto], [null, true, "benedikt@ds-test.example"]);
    assert.equal(gespeichert()!.refreshToken, "bleib-1");
    assert.equal((await termine(spaeter(13), true))!.events.length, 1, "und lesen geht weiter");
  });

  test("andere Nummern eintragen beendet die alte Anmeldung; dieselben noch einmal eintragen nicht", async () => {
    await meldeAn();
    await richteEin();
    assert.equal(gespeichert()!.refreshToken, "bleib-1", "dieselben Nummern: Die Anmeldung bleibt");
    await aktionen.microsoftAktion({ action: "einrichten", tenantId: "firma.onmicrosoft.com", clientId: MOCK_CLIENT }, JETZT);
    assert.deepEqual(gespeichert(), { tenantId: "firma.onmicrosoft.com", clientId: MOCK_CLIENT });
    assert.equal(await termine(), null);
  });

  test("im Schlüsselbund-Modus liegt die Anmeldung im Schlüsselbund, in der Datei nur die Marke", async () => {
    const store = path.join(ablage, "schluesselbund.json");
    Object.assign(process.env, { JARVIS_SECURITY_BIN: path.resolve("test/mocks/security-mock.mjs"), JARVIS_SECURITY_STORE: store, JARVIS_SECURITY_LOG: path.join(ablage, "security.log") });
    chmodSync("test/mocks/security-mock.mjs", 0o755);
    try {
      await config.writeConfig({ name: "Benedikt", geheimnisse: "schluesselbund" });
      await meldeAn();
      assert.equal(gespeichert()!.refreshToken, "@schluesselbund");
      assert.ok(!datei().includes("bleib-1"));
      // Der Schlüsselbund hält den Wert verpackt (b64:…), siehe src/lib/server/schluesselbund.ts.
      assert.ok(readFileSync(store, "utf8").includes(Buffer.from("bleib-1").toString("base64")));
      assert.equal((await termine())!.events.length, 1, "und JARVIS kann damit lesen");
      await aktionen.microsoftAktion({ action: "trennen" }, JETZT);
      assert.ok(!readFileSync(store, "utf8").includes("microsoft.refreshToken"), "nach dem Trennen ist der Eintrag auch im Schlüsselbund weg");
    } finally {
      for (const k of ["JARVIS_SECURITY_BIN", "JARVIS_SECURITY_STORE", "JARVIS_SECURITY_LOG"]) delete process.env[k];
      config.vergissGeheimnisse();
    }
  });
});

describe("Microsoft 365: Termine aus Outlook lesen", () => {
  test("liest den Zeitraum, nimmt nur die nötigen Felder und zeigt Privates ohne Titel", async () => {
    await meldeAn();
    ms.leeren();
    ms.termine = [
      graphTermin("t2", "Abnahme Stahlbau", "2026-11-17T13:00:00", "2026-11-17T14:00:00"),
      graphTermin("t1", "Baubesprechung Halle 3", "2026-11-16T09:00:00", "2026-11-16T10:00:00", { location: { displayName: "Raum 2" } }),
      graphTermin("t3", "Arzttermin Dr. Meier", "2026-11-16T15:00:00", "2026-11-16T16:00:00", { sensitivity: "private", location: { displayName: "Praxis" } }),
      graphTermin("t4", "Abgesagte Runde", "2026-11-16T11:00:00", "2026-11-16T12:00:00", { isCancelled: true }),
      graphTermin("t5", "Messe", "2026-11-18T00:00:00", "2026-11-20T00:00:00", { isAllDay: true }),
    ];
    const r = (await termine())!;
    assert.deepEqual([r.konto, r.extern, r.fehler], ["benedikt@ds-test.example", false, undefined]);
    assert.deepEqual(r.events.map((e) => [e.title, e.location, e.allDay]), [["Baubesprechung Halle 3", "Raum 2", false], ["Privater Termin", "", false], ["Abnahme Stahlbau", "", false], ["Messe", "", true]]);
    assert.ok(r.events.every((e) => e.quelle === "outlook" && e.calendar === "Outlook" && e.id.startsWith("outlook:")));
    assert.ok(!JSON.stringify(r).includes("Meier") && !JSON.stringify(r).includes("Praxis"));
    const [anfrage] = zuGraph();
    const url = new URL(anfrage.pfad, ms.loginUrl);
    assert.equal(url.pathname, "/v1.0/me/calendarView");
    assert.deepEqual([url.searchParams.get("startDateTime"), url.searchParams.get("endDateTime")], [new Date(VON).toISOString(), new Date(BIS).toISOString()]);
    assert.equal(url.searchParams.get("$select"), "id,subject,start,end,isAllDay,isCancelled,location,sensitivity", "kein Text der Einladung, keine Teilnehmer");
    assert.ok(ms.anfragen.every((a) => a.methode === "GET" || a.pfad.includes("/oauth2/")), "an Graph gehen nur lesende Anfragen");
  });

  test("mehrere Seiten werden geholt, aber höchstens fünf", async () => {
    await meldeAn();
    ms.termine = Array.from({ length: 250 }, (_, i) => graphTermin(`s${i}`, `Termin ${i}`, "2026-11-16T09:00:00", "2026-11-16T10:00:00"));
    ms.leeren();
    assert.equal((await termine())!.events.length, 250);
    assert.equal(zuGraph().length, 3);
    ms.termine = Array.from({ length: 620 }, (_, i) => graphTermin(`s${i}`, `Termin ${i}`, "2026-11-16T09:00:00", "2026-11-16T10:00:00"));
    ms.leeren();
    const viele = (await termine(JETZT, true))!;
    assert.deepEqual([viele.events.length, viele.unvollstaendig, viele.fehler], [500, true, undefined], "dass Termine fehlen, steht dabei");
    assert.equal(zuGraph().length, 5);
    assert.equal((await termine(spaeter(30)))!.unvollstaendig, true, "auch aus dem Zwischenspeicher");
    assert.equal((await kalender.readCalendarGanz({ force: true })).outlook?.unvollstaendig, true);
    ms.termine = ms.termine.slice(0, 3);
    assert.equal((await termine(spaeter(60), true))!.unvollstaendig, undefined);
  });

  test("eine Folgeseite an fremder Adresse wird nicht geholt: Der Schlüssel geht nur an Graph", async () => {
    await meldeAn();
    const fremd = await starteMicrosoftMock();
    try {
      ms.fremdeFolgeseite = `${fremd.graphUrl}/me/calendarView?$skip=100`;
      ms.leeren();
      const r = (await termine())!;
      assert.deepEqual([r.events.length, r.fehler, r.unvollstaendig], [1, undefined, true], "die erste Seite bleibt gültig, und dass etwas fehlt, steht dabei");
      assert.equal(fremd.anfragen.length, 0, "an die fremde Adresse ging nichts");
    } finally {
      await fremd.stop();
    }
  });

  test("einer Umleitung folgt JARVIS nicht: Der Schlüssel und die Anfrage bleiben bei Graph", async () => {
    await meldeAn();
    const fremd = await starteMicrosoftMock();
    try {
      ms.graphUmleitung = `${fremd.graphUrl}/me/calendarView?startDateTime=a&endDateTime=b`;
      const r = (await termine())!;
      assert.deepEqual([r.events, r.fehler], [[], MICROSOFT_SATZ.nichtErreichbar]);
      assert.equal(fremd.anfragen.length, 0, "an die fremde Adresse ging nichts");
    } finally {
      await fremd.stop();
    }
  });

  test("innerhalb von fünf Minuten wird nicht neu gefragt, außer du lädst neu", async () => {
    await meldeAn();
    await termine();
    ms.leeren();
    await termine(spaeter(200));
    assert.equal(ms.anfragen.length, 0);
    await termine(spaeter(200), true);
    assert.equal(zuGraph().length, 1);
    await termine(spaeter(600));
    assert.equal(zuGraph().length, 2, "nach fünf Minuten von selbst");
  });

  test("ist der Zugangsschlüssel abgelaufen, holt JARVIS einen neuen und merkt sich den neuen Schlüssel zum Angemeldetbleiben", async () => {
    await meldeAn();
    ms.leeren();
    // Nach zwei Stunden ist der Zugangsschlüssel (eine Stunde) abgelaufen.
    assert.equal((await termine(spaeter(7200)))!.events.length, 1);
    const erneuern = zurAnmeldung();
    assert.equal(erneuern.length, 1);
    assert.deepEqual(Object.fromEntries(new URLSearchParams(erneuern[0].body)), { client_id: MOCK_CLIENT, grant_type: "refresh_token", refresh_token: "bleib-1", scope: "offline_access User.Read Calendars.ReadBasic" });
    assert.equal(gespeichert()!.refreshToken, "bleib-2");
    assert.equal(zuGraph().at(-1)!.auth, "Bearer zugang-2");
  });

  test("weist Graph den Schlüssel ab, holt JARVIS genau einmal einen neuen und fragt noch einmal", async () => {
    await meldeAn();
    ms.verfalleZugang();
    ms.leeren();
    const r = (await termine())!;
    assert.deepEqual([r.events.length, r.fehler], [1, undefined]);
    assert.deepEqual(zuGraph().map((a) => a.auth), ["Bearer zugang-1", "Bearer zugang-2"]);
    assert.equal(zurAnmeldung().length, 1);
  });

  test("mehrere Abrufe zur selben Zeit erneuern nur einmal", async () => {
    await meldeAn();
    ms.leeren();
    await Promise.all([termine(spaeter(7200), true), termine(spaeter(7200), true), termine(spaeter(7200), true)]);
    assert.equal(zurAnmeldung().length, 1);
  });

  test("ist die Anmeldung abgelaufen oder zurückgezogen, steht das da, und JARVIS fragt nicht bei jedem Blick neu", async () => {
    await meldeAn();
    ms.angemeldetBleibenGilt = false;
    ms.leeren();
    const r = (await termine(spaeter(7200)))!;
    assert.deepEqual([r.events, r.fehler], [[], MICROSOFT_SATZ.abgelaufen]);
    assert.equal((await aktionen.microsoftStand(spaeter(7200))).fehler, MICROSOFT_SATZ.abgelaufen);
    assert.equal(gespeichert()!.refreshToken, "bleib-1", "gelöscht wird nichts von selbst");
    const bisher = ms.anfragen.length;
    assert.equal((await termine(spaeter(7300)))!.fehler, MICROSOFT_SATZ.abgelaufen);
    assert.equal(ms.anfragen.length, bisher, "kein weiterer Versuch ohne neue Anmeldung");
    // Nach einer neuen Anmeldung geht es wieder.
    ms.angemeldetBleibenGilt = true;
    await aktionen.microsoftAktion({ action: "anmelden" }, spaeter(7400));
    ms.anmeldung = "bestaetigt";
    assert.deepEqual([(await aktionen.microsoftStand(spaeter(7410))).verbunden, (await aktionen.microsoftStand(spaeter(7410))).fehler], [true, null]);
    assert.equal((await termine(spaeter(7420)))!.events.length, 1);
  });

  test("eine neue Anmeldung bei schon verbundenem Konto liest den Kalender sofort neu", async () => {
    await meldeAn();
    ms.graphStoerung = 403;
    assert.equal((await kalender.readCalendarGanz({ force: true })).outlook?.fehler, MICROSOFT_SATZ.keinRecht);
    await aktionen.microsoftAktion({ action: "anmelden" }, spaeter(10));
    // Der gemerkte Kalender mit dem Fehler steht wieder im Zwischenspeicher, während du den Code eingibst.
    ms.graphStoerung = 403;
    await kalender.readCalendarGanz({ force: true });
    ms.anmeldung = "bestaetigt";
    const status = await aktionen.microsoftStand(spaeter(20));
    assert.deepEqual([status.verbunden, status.anmeldung], [true, null]);
    const snap = await kalender.readCalendarGanz();
    assert.deepEqual([snap.outlook?.fehler, snap.events.length], [undefined, 1], "ohne auf den Zwischenspeicher zu warten");
  });

  test("auch mit einer halb kaputten Antwort geht die Anmeldung nicht verloren, und der Code wird kein zweites Mal geschickt", async () => {
    await richteEin();
    await aktionen.microsoftAktion({ action: "anmelden" }, JETZT);
    ms.anmeldung = "bestaetigt";
    ms.verbiegeSchluessel = (a) => ({ ...a, expires_in: "bald" });
    const status = await aktionen.microsoftAktion({ action: "pruefen" }, spaeter(2));
    ms.verbiegeSchluessel = null;
    assert.deepEqual([status.verbunden, status.anmeldung, status.fehler], [true, null, null]);
    assert.equal(gespeichert()!.refreshToken, "bleib-1");
    const bisher = zurAnmeldung().length;
    await aktionen.microsoftStand(spaeter(10));
    assert.equal(zurAnmeldung().length, bisher, "der eingelöste Code geht nicht noch einmal hinaus");
    assert.equal((await termine(spaeter(12)))!.events.length, 1, "beim ersten Lesen holt JARVIS einen frischen Zugang");
    // Ohne Schlüssel zum Angemeldetbleiben ist es keine Anmeldung; auch dann endet das Nachfragen.
    await aktionen.microsoftAktion({ action: "trennen" }, spaeter(20));
    await aktionen.microsoftAktion({ action: "anmelden" }, spaeter(30));
    ms.anmeldung = "bestaetigt";
    ms.verbiegeSchluessel = (a) => ({ ...a, refresh_token: undefined });
    const ohne = await aktionen.microsoftAktion({ action: "pruefen" }, spaeter(32));
    ms.verbiegeSchluessel = null;
    assert.deepEqual([ohne.verbunden, ohne.anmeldung, ohne.fehler], [false, null, MICROSOFT_SATZ.unerwartet]);
  });

  test("eine Störung beim Erneuern ist keine abgelaufene Anmeldung: Der nächste Blick versucht es wieder", async () => {
    await meldeAn();
    ms.anmeldeStoerung = 503;
    assert.equal((await termine(spaeter(7200)))!.fehler, MICROSOFT_SATZ.pause);
    assert.equal((await aktionen.microsoftStand(spaeter(7200))).fehler, null);
    assert.deepEqual([(await termine(spaeter(7260)))!.events.length, (await termine(spaeter(7260)))!.fehler], [1, undefined]);
  });

  test("Fehler von Graph kommen als feste Sätze, nie mit dem Text von Microsoft", async () => {
    await meldeAn();
    for (const [status, satz] of [[403, MICROSOFT_SATZ.keinRecht], [429, MICROSOFT_SATZ.pause], [503, MICROSOFT_SATZ.pause], [500, MICROSOFT_SATZ.unerwartet], [404, MICROSOFT_SATZ.unerwartet]] as const) {
      ms.graphStoerung = status;
      const r = (await termine(JETZT, true))!;
      assert.deepEqual([r.events, r.fehler], [[], satz], String(status));
      assert.ok(!JSON.stringify(r).includes("GEHEIMER"));
    }
    process.env.MICROSOFT_GRAPH_URL = "http://127.0.0.1:9/v1.0";
    assert.equal((await termine(JETZT, true))!.fehler, MICROSOFT_SATZ.nichtErreichbar);
  });

  test("trennen entfernt die Anmeldung von diesem Mac; „ganz“ auch die Nummern", async () => {
    await meldeAn();
    const status = await aktionen.microsoftAktion({ action: "trennen" }, JETZT);
    assert.deepEqual([status.eingerichtet, status.verbunden, status.konto], [true, false, null]);
    assert.deepEqual(gespeichert(), { tenantId: MOCK_TENANT, clientId: MOCK_CLIENT });
    ms.leeren();
    assert.equal(await termine(), null);
    assert.equal(ms.anfragen.length, 0, "ohne Anmeldung geht nichts mehr an Microsoft");
    assert.equal((await aktionen.microsoftAktion({ action: "trennen", ganz: true }, JETZT)).eingerichtet, false);
    assert.equal(gespeichert(), undefined);
  });
});

describe("Microsoft 365: Outlook im Kalender von JARVIS", () => {
  test("ohne Mac-Kalender gilt der Kalender als lesbar, sobald Outlook Termine liefert", async () => {
    assert.equal((await kalender.readCalendarGanz({ force: true })).access, "kein-mac");
    await meldeAn();
    const snap = await kalender.readCalendarGanz();
    assert.deepEqual([snap.access, snap.error, snap.events.map((e) => e.title)], ["ok", undefined, ["Baubesprechung Halle 3"]]);
    assert.deepEqual(snap.calendars, [{ name: "Outlook", writable: false }], "eintragen kann JARVIS in Outlook nicht");
    assert.deepEqual(snap.outlook, { konto: "benedikt@ds-test.example", extern: false });
    assert.equal(snap.nurLesen, true, "lesen ja, eintragen nein");
  });

  test("fehlen die Outlook-Termine, steht der Grund dabei, und der übrige Kalender bleibt, wie er ist", async () => {
    await meldeAn();
    ms.graphStoerung = 403;
    const snap = await kalender.readCalendarGanz({ force: true });
    assert.deepEqual([snap.access, snap.events, snap.outlook?.fehler], ["kein-mac", [], MICROSOFT_SATZ.keinRecht]);
  });

  test("mit Mac-Kalender stehen beide zusammen, nach Zeit sortiert", async () => {
    chmodSync("test/mocks/osascript-mock.mjs", 0o755);
    const morgen = Date.now() + 86_400_000;
    writeFileSync(MAC, JSON.stringify({ zugriff: "ok", standard: "Privat", kalender: [{ name: "Privat", writable: true }], events: [{ id: "m1", title: "Zahnarzt", start: morgen, end: morgen + 3_600_000, allDay: false, location: "", calendar: "Privat" }] }));
    Object.assign(process.env, { JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_MAC_STORE: MAC });
    await meldeAn();
    ms.termine = [graphTermin("t1", "Früher Termin", new Date(morgen - 7_200_000).toISOString().slice(0, 19), new Date(morgen - 3_600_000).toISOString().slice(0, 19)), graphTermin("t2", "Später Termin", new Date(morgen + 7_200_000).toISOString().slice(0, 19), new Date(morgen + 9_000_000).toISOString().slice(0, 19))];
    const snap = await kalender.readCalendarGanz({ force: true });
    assert.equal(snap.access, "ok");
    assert.deepEqual(snap.events.map((e) => [e.title, e.quelle]), [["Früher Termin", "outlook"], ["Zahnarzt", undefined], ["Später Termin", "outlook"]]);
    assert.deepEqual(snap.calendars.map((c) => c.name), ["Privat", "Outlook"]);
    assert.equal(snap.target, "Privat", "neue Termine trägt JARVIS weiter nur in den Mac-Kalender ein");
    assert.equal(snap.nurLesen, undefined);
  });

  test("steht das Firmenkonto auch in der Kalender-App, erscheint derselbe Termin nur einmal", async () => {
    chmodSync("test/mocks/osascript-mock.mjs", 0o755);
    const morgen = Math.floor((Date.now() + 86_400_000) / 60_000) * 60_000;
    const utc = (ms: number) => new Date(ms).toISOString().slice(0, 19);
    writeFileSync(MAC, JSON.stringify({ zugriff: "ok", standard: "Privat", kalender: [{ name: "Privat", writable: true }, { name: "Firma", writable: true }], events: [{ id: "m1", title: "Baubesprechung  halle 3", start: morgen, end: morgen + 3_600_000, allDay: false, location: "Raum 2", calendar: "Firma" }] }));
    Object.assign(process.env, { JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_MAC_STORE: MAC });
    await meldeAn();
    ms.termine = [
      graphTermin("t1", "Baubesprechung Halle 3", utc(morgen), utc(morgen + 3_600_000)),
      graphTermin("t2", "Baubesprechung Halle 3", utc(morgen + 7_200_000), utc(morgen + 9_000_000)),
      graphTermin("t3", "Abnahme", utc(morgen), utc(morgen + 3_600_000)),
    ];
    const snap = await kalender.readCalendarGanz({ force: true });
    assert.deepEqual(snap.events.map((e) => [e.title, e.calendar]).sort(), [["Abnahme", "Outlook"], ["Baubesprechung  halle 3", "Firma"], ["Baubesprechung Halle 3", "Outlook"]], "gleicher Titel, Beginn und Ende: nur der Eintrag des Macs; anderes bleibt");
  });

  test("wird der Schalter ausgeschaltet, während der Kalender gerade gelesen wird, zählt das Gelesene nicht mehr", async () => {
    await meldeAn();
    await aktionen.microsoftAktion({ action: "extern", an: true }, JETZT);
    // Graph lässt sich Zeit: Das Lesen läuft noch, wenn der Schalter umgelegt wird.
    ms.graphWartezeit = 300;
    const laeuft = kalender.readCalendar({ force: true });
    await aktionen.microsoftAktion({ action: "extern", an: false }, JETZT);
    ms.graphWartezeit = 0;
    assert.deepEqual((await laeuft).events, [], "auch wer schon wartete, bekommt den neuen Stand");
    assert.deepEqual((await kalender.readCalendar()).events, []);
    assert.equal((await kalender.readCalendarGanz()).events.length, 1, "am Bildschirm steht der Termin weiter");
    // Das Lesen hat nebenbei den Schlüssel erneuert (die Anmeldung im Test liegt Stunden zurück). Beide Änderungen
    // stehen in der Datei: Keine hat die andere mit ihrem älteren Stand überschrieben.
    assert.deepEqual([gespeichert()!.extern, gespeichert()!.refreshToken !== "bleib-1"], [false, true]);
  });

  test("die Erinnerungen fürs Handy vergessen ihren gemerkten Kalender, sobald der Schalter ausgeht", async () => {
    const telegram = await import("../../src/lib/server/telegram");
    const nun = new Date();
    const start = new Date(nun.getTime() + 10 * 60_000).toISOString().slice(0, 19);
    const ende = new Date(nun.getTime() + 70 * 60_000).toISOString().slice(0, 19);
    ms.termine = [graphTermin("t1", "Baubesprechung Halle 3", start, ende)];
    await meldeAn();
    await config.writeConfig({ ...(await config.readConfig()), telegram: { token: ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":"), bot: "jarvis_test_bot", chatId: 111, briefing: null } });
    assert.equal(await telegram.erinnerungenFaellig(nun), false, "ohne den Schalter gibt es fürs Handy keinen Outlook-Termin");
    await aktionen.microsoftAktion({ action: "extern", an: true }, JETZT);
    assert.equal(await telegram.erinnerungenFaellig(nun), true, "mit dem Schalter sofort");
    await aktionen.microsoftAktion({ action: "extern", an: false }, JETZT);
    assert.equal(await telegram.erinnerungenFaellig(nun), false, "und ohne ihn sofort nicht mehr, nicht erst nach fünf Minuten");
    assert.equal(await telegram.naechsteErinnerung(nun), null);
  });

  test("ohne den Schalter verlässt kein Outlook-Termin den Mac; mit dem Schalter schon", async () => {
    await meldeAn();
    assert.deepEqual((await kalender.readCalendarGanz()).events.map((e) => e.title), ["Baubesprechung Halle 3"], "der Bildschirm am Mac zeigt ihn");
    assert.deepEqual((await kalender.readCalendar()).events, []);
    const status = await aktionen.microsoftAktion({ action: "extern", an: true }, JETZT);
    assert.equal(status.extern, true);
    assert.deepEqual((await kalender.readCalendar()).events.map((e) => e.title), ["Baubesprechung Halle 3"], "sofort, ohne auf den Zwischenspeicher zu warten");
    await aktionen.microsoftAktion({ action: "extern", an: "ja" }, JETZT);
    assert.deepEqual((await kalender.readCalendar()).events, [], "nur ein echtes Ja schaltet ein");
  });

  test("das KI-Modell sieht Outlook-Termine weder in der Lage noch über termine_lesen, solange der Schalter aus ist", async () => {
    // Die Tage hängen an heute: Das Gehirn liest ab dem heutigen Tag.
    const tag = (plus: number) => new Date(Date.now() + plus * 86_400_000).toISOString().slice(0, 10);
    ms.termine = [
      graphTermin("t0", "Betriebsversammlung", `${tag(0)}T00:00:00`, `${tag(1)}T00:00:00`, { isAllDay: true }),
      graphTermin("t1", "Baubesprechung Halle 3", `${tag(2)}T09:00:00`, `${tag(2)}T10:00:00`, { location: { displayName: "Raum 2" } }),
    ];
    await meldeAn();
    const frage = { text: "Was steht nächste Woche an?", history: [], view: "/", focus: null, extra: [] };
    const cfg = async () => ({ ...(await config.readConfig()), claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
    claude.drehbuch([{ werkzeug: "termine_lesen", eingabe: { von: tag(0), bis: tag(20) } }, { text: "Nichts." }]);
    await brain.think(await cfg(), "sk-test", frage);
    const gesendet = JSON.stringify(claude.anfragen);
    assert.ok(!/Baubesprechung|Betriebsversammlung|Raum 2/.test(gesendet), "nichts aus Outlook ging an das Modell");
    // Dass es welche gibt, erfährt das Modell, damit es nicht „frei“ behauptet: nur die Zahl.
    assert.match(gesendet, /dazu heute 1 aus Outlook, die nicht fürs Gespräch freigegeben sind/);
    const ergebnis = JSON.parse(werkzeugErgebnisse(claude.anfragen[1]).at(-1)!.content) as { termine: unknown[]; nicht_gezeigt?: string };
    assert.deepEqual(ergebnis.termine, []);
    assert.match(ergebnis.nicht_gezeigt!, /Termine aus Outlook \(2, /);
    await aktionen.microsoftAktion({ action: "extern", an: true }, JETZT);
    claude.drehbuch([{ werkzeug: "termine_lesen", eingabe: { von: tag(0), bis: tag(20) } }, { text: "Die Baubesprechung." }]);
    await brain.think(await cfg(), "sk-test", frage);
    const offen = JSON.parse(werkzeugErgebnisse(claude.anfragen[1]).at(-1)!.content) as { termine: { titel: string }[]; nicht_gezeigt?: string };
    assert.deepEqual(offen.termine.map((t) => t.titel), ["Betriebsversammlung", "Baubesprechung Halle 3"]);
    assert.equal(offen.nicht_gezeigt, undefined);
  });

  test("den ganzen Kalender liest nur die Schnittstelle für den Bildschirm; alles andere nimmt den gefilterten", () => {
    const dateien = (ordner: string): string[] => readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? dateien(path.join(ordner, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(ordner, e.name)] : []));
    const mit = dateien("src").filter((f) => /\breadCalendarGanz\b/.test(readFileSync(f, "utf8")));
    assert.deepEqual(mit.sort(), ["src/app/api/kalender/route.ts", "src/lib/server/calendar.ts"]);
  });
});
