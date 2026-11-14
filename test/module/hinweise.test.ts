// Was per Telegram von selbst kommt, läuft über den gemeinsamen Zeitplan: Morgenbriefing, Erinnerungen vor
// Terminen, Hinweise am Tag und Tagesabschluss. Gegen einen nachgebauten Telegram-Server und einen
// nachgebauten Mac-Kalender. Geprüft wird vor allem die Obergrenze der Hinweise (aus, bis man sie einschaltet,
// nur tagsüber, höchstens drei am Tag, jedes Ding einmal), dass nichts doppelt hinausgeht, dass ein Fehlschlag
// mit festem Satz im Zeitplan steht und dass Projektinhalte nur mit dem Schalter über Telegram gehen.
// Dazu die Hinweise als Mitteilung am Mac selbst (ohne Handy): eigener Schalter, nur Zahlen, eigener Merker.

import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteTelegramMock, type TelegramMock } from "../mocks/telegram-mock";

const ordner = sichereUmgebung("hinweise");
const ablage = testOrdner("hinweise-mac");
const vault = testOrdner("hinweise-tresor");
const STORE = path.join(ablage, "kalender.json");
const MAC_LOG = path.join(ablage, "aufrufe.log");
const OSASCRIPT = path.resolve("test/mocks/osascript-mock.mjs");
chmodSync("test/mocks/osascript-mock.mjs", 0o755);
Object.assign(process.env, { JARVIS_OSASCRIPT: OSASCRIPT, JARVIS_MAC_STORE: STORE, JARVIS_MAC_LOG: MAC_LOG, JARVIS_MITTEILUNG_FRIST_MS: "1500" });

// Sieht aus wie ein Bot-Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const TOKEN = ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":");
const ICH = 111;
const um = (stunde: number, minute = 0, tag = 13) => new Date(2026, 10, tag, stunde, minute, 0, 0);
const EINGETRAGEN = um(6, 0, 9);

let tg: TelegramMock;
let aufgaben: typeof import("../../src/lib/server/zeitplan-aufgaben");
let plan: typeof import("../../src/lib/server/zeitplan");
let hinweise: typeof import("../../src/lib/server/hinweise");
let telegram: typeof import("../../src/lib/server/telegram");
let config: typeof import("../../src/lib/server/config");
let p: typeof import("../../src/lib/server/projekte/projekte");
let sp: typeof import("../../src/lib/server/projekte/speicher");
let kalender: typeof import("../../src/lib/server/calendar");
let zustand: typeof import("../../src/lib/server/gateway/zustand");
let sicherheit: typeof import("../../src/lib/sicherheit");

const basis = { token: TOKEN, bot: "jarvis_test_bot", chatId: ICH, briefing: null, reminders: false };
const stelleEin = (mehr: Record<string, unknown> = {}) => config.writeConfig({ name: "Benedikt", vaultPath: vault, telegram: { ...basis, ...mehr } });
const eintrag = async (id: string, now: Date) => (await aufgaben.zeitplanSnapshot(now)).eintraege.find((e) => e.id === id)!;
const texte = () => tg.texteAn(ICH);
// Nur der Mac, ohne Handy; und beides zusammen.
const nurMac = () => config.writeConfig({ name: "Benedikt", vaultPath: vault, mitteilungen: { hinweise: true } });
const beides = (mehr: Record<string, unknown> = {}) => config.writeConfig({ name: "Benedikt", vaultPath: vault, telegram: { ...basis, hinweise: true, ...mehr }, mitteilungen: { hinweise: true } });
// Was JARVIS dem Mac als Mitteilung übergeben hat: das Skript und danach Text und Titel als eigene Argumente.
type Aufruf = { args: string[] };
const mitteilungen = (): { skript: string; text: string; titel: string; mehr: string[] }[] =>
  (existsSync(MAC_LOG) ? readFileSync(MAC_LOG, "utf8") : "")
    .split("\n")
    .filter(Boolean)
    .map((zeile) => JSON.parse(zeile) as Aufruf)
    .filter((a) => a.args[0] === "-e" && a.args[1].includes("display notification"))
    .map((a) => ({ skript: a.args[1], text: a.args[2], titel: a.args[3], mehr: a.args.slice(4) }));
const datei = (name: string) => readFileSync(path.join(ordner, name), "utf8");

// Ein offenes und ein vertrauliches Projekt, jedes mit einer überfälligen Aufgabe.
async function fuelle() {
  const halle = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", EINGETRAGEN);
  await p.trageEin(halle.id, { art: "aufgabe", text: "Statik prüfen", faellig: "2026-11-12" }, "mac", EINGETRAGEN);
  const geheim = await p.legeProjektAn({ name: "Adler", vertraulich: true }, "mac", EINGETRAGEN);
  await p.trageEin(geheim.id, { art: "aufgabe", text: "Kaufpreis nachverhandeln", faellig: "2026-11-11" }, "mac", EINGETRAGEN);
  return halle;
}

before(async () => {
  tg = await starteTelegramMock();
  process.env.TELEGRAM_API_URL = tg.url;
  aufgaben = await import("../../src/lib/server/zeitplan-aufgaben");
  plan = await import("../../src/lib/server/zeitplan");
  hinweise = await import("../../src/lib/server/hinweise");
  telegram = await import("../../src/lib/server/telegram");
  config = await import("../../src/lib/server/config");
  p = await import("../../src/lib/server/projekte/projekte");
  sp = await import("../../src/lib/server/projekte/speicher");
  kalender = await import("../../src/lib/server/calendar");
  zustand = await import("../../src/lib/server/gateway/zustand");
  sicherheit = await import("../../src/lib/sicherheit");
});

after(async () => {
  await tg.stop();
});

beforeEach(async () => {
  await plan.zeitplanGeschrieben();
  await hinweise.hinweiseGeschrieben();
  for (const name of ["zeitplan.json", "hinweise.json", "projekte.json"]) rmSync(path.join(ordner, name), { force: true });
  rmSync(path.join(vault, "Aufgaben.md"), { force: true });
  rmSync(MAC_LOG, { force: true });
  delete process.env.JARVIS_MAC_MITTEILUNG;
  process.env.JARVIS_OSASCRIPT = OSASCRIPT;
  writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [] }));
  plan.vergissZeitplan();
  hinweise.vergissHinweise();
  sp.setzeSpeicher(null);
  await stelleEin();
  await telegram.resetTelegram();
  await kalender.readCalendar({ force: true });
  for (const k of Object.keys(tg.fehler)) delete tg.fehler[k];
  tg.leeren();
  const z = await zustand.leseZustand();
  if (z.notaus.an) await zustand.notausAus(sicherheit.NOTAUS_BESTAETIGUNG, "mac");
});

describe("Hinweise am Tag: aus, bis man sie einschaltet", () => {
  test("in der Voreinstellung kommt nichts, und der Zeitplan sagt, warum", async () => {
    await fuelle();
    await aufgaben.zeitplanJetzt(um(10));
    assert.deepEqual(texte(), []);
    const e = await eintrag("hinweise", um(10));
    assert.deepEqual([e.takt, e.hinweis, e.letzterLauf, e.selbst], ["ausgeschaltet", "Ausgeschaltet.", null, true]);
  });

  test("ohne gekoppeltes Handy kommt nichts", async () => {
    await fuelle();
    await config.writeConfig({ name: "Benedikt", telegram: { token: TOKEN, bot: "jarvis_test_bot", hinweise: true } });
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal(tg.gesendet.length, 0);
    assert.equal((await eintrag("hinweise", um(10))).hinweis, "Telegram ist nicht verbunden.");
  });
});

describe("Hinweise am Tag: die Obergrenze", () => {
  test("eingeschaltet: nachts nichts, tagsüber ein Hinweis, und derselbe kommt nicht noch einmal", async () => {
    await fuelle();
    await stelleEin({ hinweise: true });
    await aufgaben.zeitplanJetzt(um(8, 30));
    assert.deepEqual(texte(), [], "vor 9 Uhr nichts");
    await aufgaben.zeitplanJetzt(um(9, 0));
    assert.equal(texte().length, 1);
    for (const spaeter of [um(9, 1), um(10, 30), um(14), um(17, 59), um(20)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(texte().length, 1, "dasselbe kommt nicht noch einmal");

    const e = await eintrag("hinweise", um(12));
    assert.deepEqual([e.takt, e.letzterLauf, e.ergebnis, e.hinweis], ["zwischen 9 und 18 Uhr, höchstens 3 am Tag, per Telegram", um(9, 0).toISOString(), "ok", null]);
    // Auch am nächsten Tag ist es kein neuer Hinweis: Überfälliges nennt dann das Morgenbriefing.
    await aufgaben.zeitplanJetzt(um(10, 0, 14));
    assert.equal(texte().length, 1);
  });

  test("ohne den Schalter für Projektnamen stehen nur Zahlen da; mit ihm die Namen, Vertrauliches nie", async () => {
    await fuelle();
    await stelleEin({ hinweise: true });
    await aufgaben.zeitplanJetzt(um(10));
    assert.match(texte()[0], /^Kurzer Hinweis:\n\nProjekte: 2 Aufgaben sind überfällig\. Einzelheiten am Mac unter „Heute“\.$/);

    // Ein neuer Tag mit leerem Merkzettel, diesmal mit dem Schalter.
    await hinweise.hinweiseGeschrieben();
    rmSync(path.join(ordner, "hinweise.json"), { force: true });
    hinweise.vergissHinweise();
    tg.leeren();
    await stelleEin({ hinweise: true, projekte: true });
    await aufgaben.zeitplanJetzt(um(10, 0, 14));
    const [text] = texte();
    assert.match(text, /Überfällig:\n• Hallenneubau: Statik prüfen, seit 2 Tagen überfällig\n• ein Eintrag aus einem vertraulichen Projekt: Einzelheiten nur am Mac/);
    for (const wort of ["Adler", "Kaufpreis"]) assert.ok(!text.includes(wort), `„${wort}“ ging über Telegram`);
  });

  test("ist jemand anderes zuständig, heißt es: Hier fehlt eine Rückmeldung", async () => {
    const halle = await fuelle();
    await p.trageEin(halle.id, { art: "aufgabe", text: "Angebot Stahlbau", zustaendig: "Thomas", faellig: "2026-11-10" }, "mac", EINGETRAGEN);
    await stelleEin({ hinweise: true, projekte: true });
    await aufgaben.zeitplanJetzt(um(10));
    assert.match(texte()[0], /Hier fehlt eine Rückmeldung:\n• Hallenneubau: Angebot Stahlbau \(zuständig: Thomas\), seit 3 Tagen überfällig/);
  });

  test("am Nachmittag einmal: was heute fällig und noch offen ist, auch aus dem Tresor", async () => {
    const halle = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", EINGETRAGEN);
    await p.trageEin(halle.id, { art: "aufgabe", text: "Vertrag gegenlesen", faellig: "2026-11-13" }, "mac", EINGETRAGEN);
    writeFileSync(path.join(vault, "Aufgaben.md"), "- [ ] Steuerberater anrufen 📅 2026-11-13\n- [ ] Erst morgen 📅 2026-11-14\n- [x] Schon erledigt 📅 2026-11-13 ✅ 2026-11-13\n");
    await stelleEin({ hinweise: true, projekte: true });
    await aufgaben.zeitplanJetzt(um(11));
    await aufgaben.zeitplanJetzt(um(14, 59));
    assert.deepEqual(texte(), [], "vor 15 Uhr noch nichts: Der Tag ist noch lang");
    await aufgaben.zeitplanJetzt(um(15, 0));
    assert.deepEqual(texte(), ["Kurzer Hinweis:\n\nHeute noch offen:\n• Hallenneubau: Vertrag gegenlesen\n• Steuerberater anrufen"]);
    await aufgaben.zeitplanJetzt(um(16, 30));
    assert.equal(texte().length, 1, "einmal am Tag");
  });

  test("ist die Aufgabe inzwischen erledigt, kommt kein Hinweis", async () => {
    const halle = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", EINGETRAGEN);
    const e = await p.trageEin(halle.id, { art: "aufgabe", text: "Statik prüfen", faellig: "2026-11-12" }, "mac", EINGETRAGEN);
    await p.korrigiere(e.id, { erledigt: true }, "erledigt", "mac");
    await stelleEin({ hinweise: true });
    await aufgaben.zeitplanJetzt(um(10));
    assert.deepEqual(texte(), []);
  });

  test("höchstens drei Hinweise am Tag und mindestens eine Stunde dazwischen, auch wenn ständig Neues kommt", async () => {
    const halle = await fuelle();
    await stelleEin({ hinweise: true });
    const neues = (n: number) => p.trageEin(halle.id, { art: "aufgabe", text: `Nachtrag ${n}`, faellig: "2026-11-12" }, "mac", um(9, 0));
    await aufgaben.zeitplanJetzt(um(9, 0));
    await neues(1);
    await aufgaben.zeitplanJetzt(um(9, 30));
    assert.equal(texte().length, 1, "eine halbe Stunde später noch nicht");
    await aufgaben.zeitplanJetzt(um(10, 0));
    assert.equal(texte().length, 2);
    await neues(2);
    await aufgaben.zeitplanJetzt(um(11, 0));
    assert.equal(texte().length, 3);
    await neues(3);
    for (const spaeter of [um(12), um(14), um(16), um(17, 59)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(texte().length, 3, "der vierte Hinweis des Tages bleibt aus");
    // Am nächsten Morgen holt JARVIS nach, was liegen blieb.
    await aufgaben.zeitplanJetzt(um(9, 0, 14));
    assert.equal(texte().length, 4);
    assert.match(texte()[3], /Projekte: Eine Aufgabe ist überfällig\./);
  });

  test("was das Morgenbriefing schon gesagt hat, kommt nicht noch einmal; Neues danach schon", async () => {
    const halle = await fuelle();
    await stelleEin({ hinweise: true, projekte: true, briefing: "07:30" });
    await aufgaben.zeitplanJetzt(um(7, 31));
    assert.equal(texte().length, 1, "das Briefing");
    assert.match(texte()[0], /Hallenneubau: Eine Aufgabe ist überfällig/);
    await aufgaben.zeitplanJetzt(um(9, 0));
    await aufgaben.zeitplanJetzt(um(10, 0));
    assert.equal(texte().length, 1, "kein Hinweis auf dasselbe");
    await p.trageEin(halle.id, { art: "aufgabe", text: "Brandschutz nachreichen", faellig: "2026-11-12" }, "mac", um(10, 30));
    await aufgaben.zeitplanJetzt(um(10, 31));
    assert.equal(texte().length, 2);
    assert.match(texte()[1], /Überfällig:\n• Hallenneubau: Brandschutz nachreichen, seit gestern überfällig$/);
  });

  test("dass jemand anderes im Verzug ist, sagt das Briefing nicht: Dieser Hinweis kommt trotzdem", async () => {
    const halle = await fuelle();
    await p.trageEin(halle.id, { art: "aufgabe", text: "Angebot Stahlbau", zustaendig: "Thomas", faellig: "2026-11-12" }, "mac", EINGETRAGEN);
    await stelleEin({ hinweise: true, projekte: true, briefing: "07:30" });
    await aufgaben.zeitplanJetzt(um(7, 31));
    await aufgaben.zeitplanJetzt(um(9, 0));
    assert.equal(texte().length, 2);
    assert.equal(texte()[1], "Kurzer Hinweis:\n\nHier fehlt eine Rückmeldung:\n• Hallenneubau: Angebot Stahlbau (zuständig: Thomas), seit gestern überfällig");
  });

  test("stehen Briefing und Hinweis in derselben Minute an, kommt nur das Briefing", async () => {
    await fuelle();
    await stelleEin({ hinweise: true, briefing: "09:30" });
    await aufgaben.zeitplanJetzt(um(9, 30));
    assert.equal(texte().length, 1);
    assert.match(texte()[0], /Benedikt/);
    for (const spaeter of [um(9, 31), um(10, 31), um(12)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(texte().length, 1, "kein Hinweis auf das, was das Briefing eben gesagt hat");
  });

  test("Tagesabschluss und Hinweis kurz nacheinander: Beide merken sich ihren Teil, keiner überschreibt den anderen", async () => {
    const halle = await fuelle();
    await p.trageEin(halle.id, { art: "aufgabe", text: "Angebot Stahlbau", zustaendig: "Thomas", faellig: "2026-11-12" }, "mac", EINGETRAGEN);
    await stelleEin({ hinweise: true, abschluss: "17:00" });
    // Gleichzeitig angestoßen, wie vom Taktgeber und von einer geöffneten Seite.
    await Promise.all([aufgaben.zeitplanJetzt(um(17, 0)), aufgaben.zeitplanJetzt(um(17, 0))]);
    assert.equal(texte().length, 1, "erst der Tagesabschluss, einmal");
    await aufgaben.zeitplanJetzt(um(17, 1));
    assert.equal(texte().length, 2, "danach der Hinweis auf die fehlende Rückmeldung");
    await hinweise.hinweiseGeschrieben();
    const stand = JSON.parse(datei("hinweise.json")) as { gesendet: string[]; gemeldet: Record<string, string> };
    assert.equal(stand.gesendet.length, 1);
    assert.equal(Object.keys(stand.gemeldet).length, 3, "zwei vom Tagesabschluss, einer vom Hinweis");
    await aufgaben.zeitplanJetzt(um(17, 30));
    assert.equal(texte().length, 2);
  });

  test("merkt sich etwas anderes den Stand, während ein Hinweis unterwegs ist, geht keines von beiden verloren", async () => {
    const halle = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", EINGETRAGEN);
    await p.trageEin(halle.id, { art: "aufgabe", text: "Angebot Stahlbau", zustaendig: "Thomas", faellig: "2026-11-12" }, "mac", EINGETRAGEN);
    await stelleEin({ hinweise: true });
    // Der Hinweis wartet auf Telegram; in der Zeit kommt eine überfällige Aufgabe dazu, und das Briefing merkt sie.
    tg.warte.getMe = 300;
    const unterwegs = hinweise.sendeHinweise(um(10));
    await new Promise((r) => setTimeout(r, 100));
    await p.trageEin(halle.id, { art: "aufgabe", text: "Statik prüfen", faellig: "2026-11-12" }, "mac", um(10));
    await hinweise.merkeGemeldet(um(10));
    await unterwegs;
    await hinweise.hinweiseGeschrieben();
    const stand = JSON.parse(datei("hinweise.json")) as { gesendet: string[]; gemeldet: Record<string, string> };
    assert.equal(Object.keys(stand.gemeldet).length, 2, "der Merker des Briefings und der des Hinweises");
    assert.equal(stand.gesendet.length, 1);
  });

  test("der Tresor wird am Nachmittag nicht jede Minute durchsucht", async () => {
    await stelleEin({ hinweise: true });
    await aufgaben.zeitplanJetzt(um(15, 0));
    writeFileSync(path.join(vault, "Aufgaben.md"), "- [ ] Steuerberater anrufen 📅 2026-11-13\n");
    await aufgaben.zeitplanJetzt(um(15, 5));
    assert.deepEqual(texte(), [], "fünf Minuten später gilt noch, was um 15 Uhr gelesen wurde");
    await aufgaben.zeitplanJetzt(um(15, 10));
    assert.equal(texte().length, 1);
  });

  test("im Stand stehen nur Schlüssel und Zeiten, kein Text aus den Projekten", async () => {
    await fuelle();
    await stelleEin({ hinweise: true, projekte: true });
    await aufgaben.zeitplanJetzt(um(10));
    await hinweise.hinweiseGeschrieben();
    await plan.zeitplanGeschrieben();
    for (const name of ["hinweise.json", "zeitplan.json"]) for (const wort of ["Statik", "Hallenneubau", "Adler", "Kaufpreis"]) assert.ok(!datei(name).includes(wort), `„${wort}“ steht in ${name}`);
  });

  test("der Not-Aus hält Agenten an, nicht die Nachrichten an dich", async () => {
    await fuelle();
    await stelleEin({ hinweise: true });
    await zustand.notausAn("Test", "mac");
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal(texte().length, 1);
  });
});

describe("Hinweise am Tag: wenn Telegram nicht mitmacht", () => {
  test("ist Telegram nicht erreichbar, geht nichts verloren: fester Satz im Zeitplan, neuer Versuch eine Viertelstunde später", async () => {
    await fuelle();
    await stelleEin({ hinweise: true });
    tg.fehler.getMe = 502;
    await aufgaben.zeitplanJetzt(um(10));
    assert.deepEqual(texte(), []);
    const e = await eintrag("hinweise", um(10, 1));
    assert.deepEqual([e.ergebnis, e.fehler], ["fehler", "Telegram war nicht erreichbar. Der Hinweis kommt, sobald es wieder geht."]);
    await aufgaben.zeitplanJetzt(um(10, 1));
    await aufgaben.zeitplanJetzt(um(10, 14));
    assert.deepEqual(texte(), [], "kein Dauerfeuer");
    await aufgaben.zeitplanJetzt(um(10, 15));
    assert.equal(texte().length, 1, "der Hinweis kommt nach");
    assert.equal((await eintrag("hinweise", um(10, 16))).ergebnis, "ok");
  });

  test("lehnt Telegram die Nachricht ab, steht ein fester Satz da, nichts von Telegram, und doppelt kommt nichts", async () => {
    await fuelle();
    await stelleEin({ hinweise: true });
    tg.fehler.sendMessage = 400;
    await aufgaben.zeitplanJetzt(um(10));
    const e = await eintrag("hinweise", um(10, 1));
    assert.deepEqual([e.ergebnis, e.fehler], ["fehler", "Telegram hat den Hinweis nicht angenommen."]);
    await plan.zeitplanGeschrieben();
    assert.ok(!datei("zeitplan.json").includes("Testfehler"), "der Text von Telegram steht nicht in der Datei");
    for (const spaeter of [um(10, 30), um(11, 30), um(13)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.deepEqual(texte(), [], "ein Teil könnte angekommen sein: kein zweiter Versuch");
  });

  test("kennt Telegram den Schlüssel nicht mehr, steht genau das da, auch in den Einstellungen", async () => {
    await fuelle();
    await stelleEin({ hinweise: true });
    tg.fehler.getMe = 401;
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal((await eintrag("hinweise", um(10, 1))).fehler, "Telegram kennt den Schlüssel des Bots nicht. Sieh unter Einstellungen beim Handy nach.");
    assert.match(telegram.telegramStatus(await config.readConfig()).error ?? "", /Telegram kennt diesen Schlüssel nicht/);
  });

  test("reißt die Verbindung beim Senden ab, steht das da und nicht „nicht angenommen“; ein zweites Mal wird nicht gesendet", async () => {
    await fuelle();
    await stelleEin({ hinweise: true });
    tg.fehler.sendMessage = -1;
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal((await eintrag("hinweise", um(10, 1))).fehler, "Die Verbindung zu Telegram ist beim Senden abgerissen. Damit nichts doppelt kommt, schickt JARVIS den Hinweis nicht noch einmal.");
    for (const spaeter of [um(10, 30), um(12)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.deepEqual(texte(), []);
  });
});

describe("Hinweise am Tag als Mitteilung am Mac", () => {
  const MAC_TAKT = "zwischen 9 und 18 Uhr, höchstens 3 am Tag, als Mitteilung am Mac";

  test("aus, bis man sie einschaltet, und der Zeitplan sagt, warum", async () => {
    await fuelle();
    await aufgaben.zeitplanJetzt(um(10));
    assert.deepEqual(mitteilungen(), []);
    const e = await eintrag("hinweise-mac", um(10));
    assert.deepEqual([e.takt, e.hinweis, e.letzterLauf, e.selbst], ["ausgeschaltet", "Ausgeschaltet.", null, true]);
  });

  test("eingeschaltet, auch ganz ohne Handy: nachts nichts, tagsüber eine Mitteilung nur mit Zahlen, und dieselbe nicht noch einmal", async () => {
    await fuelle();
    await nurMac();
    await aufgaben.zeitplanJetzt(um(8, 30));
    assert.deepEqual(mitteilungen(), [], "vor 9 Uhr nichts");
    await aufgaben.zeitplanJetzt(um(9, 0));
    assert.deepEqual(
      mitteilungen().map((m) => [m.titel, m.text, m.mehr]),
      [["JARVIS", "2 Aufgaben sind überfällig. Einzelheiten in JARVIS unter „Heute“.", []]],
    );
    for (const spaeter of [um(9, 1), um(10, 30), um(14), um(17, 59), um(20), um(10, 0, 14)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(mitteilungen().length, 1, "dasselbe kommt nicht noch einmal");
    assert.equal(tg.gesendet.length, 0, "ohne Handy geht nichts an Telegram");

    const e = await eintrag("hinweise-mac", um(12));
    assert.deepEqual([e.takt, e.letzterLauf, e.ergebnis, e.hinweis], [MAC_TAKT, um(9, 0).toISOString(), "ok", null]);
  });

  test("der Text steht nie im Skript: Er geht als eigenes Argument an den Mac", async () => {
    const halle = await fuelle();
    await nurMac();
    await aufgaben.zeitplanJetzt(um(9, 0));
    await p.trageEin(halle.id, { art: "aufgabe", text: 'Zitat "prüfen" & `whoami`', zustaendig: "Thomas", faellig: "2026-11-12" }, "mac", um(9, 30));
    await aufgaben.zeitplanJetzt(um(10, 0));
    const [erste, zweite] = mitteilungen();
    assert.equal(zweite.text, "Bei einer fehlt eine Rückmeldung. Einzelheiten in JARVIS unter „Heute“.");
    assert.equal(erste.skript, zweite.skript, "das Skript ist immer dasselbe");
    for (const wort of ["überfällig", "Rückmeldung", "Zitat", "whoami", "Hallenneubau", "JARVIS"]) assert.ok(!zweite.skript.includes(wort), `„${wort}“ steht im Skript`);
    assert.match(zweite.skript, /item 1 of argv/);
  });

  test("Zeilenumbrüche und Steuerzeichen kommen nicht beim Mac an, und überlange Texte werden gekürzt", async () => {
    const mitteilung = await import("../../src/lib/server/mitteilung");
    await mitteilung.zeigeMitteilung("JARVIS\nzweite Zeile", `erste\u0000Zeile\r\n\tzweite ${"x".repeat(400)}`);
    const [m] = mitteilungen();
    assert.equal(m.titel, "JARVIS zweite Zeile");
    assert.match(m.text, /^erste Zeile zweite x+$/);
    assert.equal(m.text.length, 300);
  });

  test("am Nachmittag einmal: was heute fällig und noch offen ist, auch aus dem Tresor, ohne den Wortlaut", async () => {
    writeFileSync(path.join(vault, "Aufgaben.md"), "- [ ] Steuerberater anrufen 📅 2026-11-13\n- [x] Erledigtes 📅 2026-11-13\n");
    await nurMac();
    await aufgaben.zeitplanJetzt(um(11));
    assert.deepEqual(mitteilungen(), [], "am Vormittag noch nicht");
    await aufgaben.zeitplanJetzt(um(15, 0));
    await aufgaben.zeitplanJetzt(um(16, 30));
    assert.deepEqual(mitteilungen().map((m) => m.text), ["Eine von heute ist noch offen. Einzelheiten in JARVIS unter „Heute“."]);
  });

  test("beides an: Handy und Mac bekommen denselben Hinweis je einmal", async () => {
    await fuelle();
    await beides();
    await aufgaben.zeitplanJetzt(um(10));
    for (const spaeter of [um(10, 1), um(11, 30), um(14)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(texte().length, 1);
    assert.equal(mitteilungen().length, 1);
  });

  test("ist Telegram nicht erreichbar, zeigt der Mac den Hinweis trotzdem; aufs Handy kommt er nach, am Mac nicht noch einmal", async () => {
    await fuelle();
    await beides();
    tg.fehler.getMe = 502;
    await aufgaben.zeitplanJetzt(um(10));
    assert.deepEqual([texte().length, mitteilungen().length], [0, 1]);
    assert.equal((await eintrag("hinweise", um(10, 1))).ergebnis, "fehler");
    assert.equal((await eintrag("hinweise-mac", um(10, 1))).ergebnis, "ok");
    for (const spaeter of [um(10, 15), um(10, 16), um(11, 30)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.deepEqual([texte().length, mitteilungen().length], [1, 1]);
  });

  test("nimmt der Mac die Mitteilung nicht an: fester Satz, nichts gemerkt, neuer Versuch eine Viertelstunde später", async () => {
    await fuelle();
    await beides();
    process.env.JARVIS_MAC_MITTEILUNG = "abgelehnt";
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal(texte().length, 1, "das Handy bekommt seinen Hinweis trotzdem");
    const e = await eintrag("hinweise-mac", um(10, 1));
    assert.deepEqual([e.ergebnis, e.fehler], ["fehler", "Der Mac hat die Mitteilung nicht angenommen. JARVIS versucht es in einer Viertelstunde noch einmal."]);
    await plan.zeitplanGeschrieben();
    assert.ok(!datei("zeitplan.json").includes("Testfehler"), "der Text vom Mac steht nicht in der Datei");
    await aufgaben.zeitplanJetzt(um(10, 1));
    await aufgaben.zeitplanJetzt(um(10, 14));
    assert.equal(mitteilungen().length, 1, "kein Dauerfeuer: nur der eine abgelehnte Versuch");
    delete process.env.JARVIS_MAC_MITTEILUNG;
    await aufgaben.zeitplanJetzt(um(10, 15));
    assert.equal(mitteilungen().length, 2, "der Hinweis kommt nach");
    assert.equal((await eintrag("hinweise-mac", um(10, 16))).ergebnis, "ok");
    for (const spaeter of [um(10, 30), um(11, 30), um(13)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.deepEqual([texte().length, mitteilungen().length], [1, 2]);
  });

  test("antwortet der Mac nicht rechtzeitig, geht der Hinweis nicht verloren: nächster Versuch erst nach einer Stunde, höchstens drei am Tag", async () => {
    await fuelle();
    await nurMac();
    process.env.JARVIS_MAC_MITTEILUNG = "haengt";
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal((await eintrag("hinweise-mac", um(10, 1))).fehler, "Der Mac hat nicht rechtzeitig geantwortet. JARVIS versucht es frühestens in einer Stunde noch einmal, höchstens dreimal am Tag.");
    for (const spaeter of [um(10, 15), um(10, 30), um(10, 59)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(mitteilungen().length, 1, "sie könnte erschienen sein: vor Ablauf einer Stunde kein zweiter Versuch");
    for (const spaeter of [um(11), um(12), um(13), um(14), um(16)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(mitteilungen().length, 3, "bleibt der Mac stumm, sind es höchstens drei Versuche am Tag");
    delete process.env.JARVIS_MAC_MITTEILUNG;
    await aufgaben.zeitplanJetzt(um(17));
    assert.equal(mitteilungen().length, 3);
    await aufgaben.zeitplanJetzt(um(9, 0, 14));
    assert.equal(mitteilungen().length, 4, "am nächsten Morgen kommt der Hinweis an");
    assert.equal((await eintrag("hinweise-mac", um(9, 1, 14))).ergebnis, "ok");
    await aufgaben.zeitplanJetzt(um(11, 0, 14));
    assert.equal(mitteilungen().length, 4, "und danach nicht noch einmal");
  });

  test("auch am Mac höchstens drei am Tag und mindestens eine Stunde dazwischen", async () => {
    const halle = await fuelle();
    await nurMac();
    const neues = (n: number) => p.trageEin(halle.id, { art: "aufgabe", text: `Nachtrag ${n}`, faellig: "2026-11-12" }, "mac", um(9, 0));
    await aufgaben.zeitplanJetzt(um(9, 0));
    await neues(1);
    await aufgaben.zeitplanJetzt(um(9, 30));
    assert.equal(mitteilungen().length, 1, "eine halbe Stunde später noch nicht");
    await aufgaben.zeitplanJetzt(um(10, 0));
    await neues(2);
    await aufgaben.zeitplanJetzt(um(11, 0));
    await neues(3);
    for (const spaeter of [um(12), um(14), um(16), um(17, 59)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(mitteilungen().length, 3, "die vierte Mitteilung des Tages bleibt aus");
    await aufgaben.zeitplanJetzt(um(9, 0, 14));
    assert.equal(mitteilungen().length, 4);
  });

  test("was das Morgenbriefing schon gesagt hat, kommt auch am Mac nicht noch einmal; Neues danach schon", async () => {
    const halle = await fuelle();
    await beides({ briefing: "09:30" });
    await aufgaben.zeitplanJetzt(um(9, 30));
    assert.deepEqual([texte().length, mitteilungen().length], [1, 0], "in der Minute des Briefings wartet auch der Mac");
    for (const spaeter of [um(9, 31), um(10, 31)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.equal(mitteilungen().length, 0, "keine Mitteilung auf das, was das Briefing eben gesagt hat");
    await p.trageEin(halle.id, { art: "aufgabe", text: "Brandschutz nachreichen", faellig: "2026-11-12" }, "mac", um(11));
    await aufgaben.zeitplanJetzt(um(11, 1));
    assert.deepEqual(mitteilungen().map((m) => m.text), ["Eine Aufgabe ist überfällig. Einzelheiten in JARVIS unter „Heute“."]);
  });

  test("kommt das Briefing nicht durch, weil Telegram nicht erreichbar ist, wartet der Mac höchstens zehn Minuten darauf", async () => {
    await fuelle();
    await beides({ briefing: "09:30" });
    for (const [stunde, minute] of [[9, 30], [9, 31], [9, 35], [9, 39]]) {
      tg.fehler.getMe = 502;
      await aufgaben.zeitplanJetzt(um(stunde, minute));
    }
    assert.deepEqual([texte().length, mitteilungen().length], [0, 0], "in den ersten zehn Minuten wartet der Mac auf das Briefing");
    tg.fehler.getMe = 502;
    await aufgaben.zeitplanJetzt(um(9, 40));
    assert.deepEqual([texte().length, mitteilungen().length], [0, 1], "danach zeigt der Mac den Hinweis, auch wenn Telegram weiter fehlt");
    assert.equal(mitteilungen()[0].text, "2 Aufgaben sind überfällig. Einzelheiten in JARVIS unter „Heute“.");
  });

  test("nimmt Telegram das Briefing nicht an, hat es niemand gelesen: Der Mac zeigt das Überfällige trotzdem", async () => {
    await fuelle();
    await beides({ briefing: "09:30" });
    tg.fehler.sendMessage = 400;
    await aufgaben.zeitplanJetzt(um(9, 30));
    assert.deepEqual([texte().length, mitteilungen().length], [0, 0]);
    await aufgaben.zeitplanJetzt(um(9, 31));
    assert.deepEqual(mitteilungen().map((m) => m.text), ["2 Aufgaben sind überfällig. Einzelheiten in JARVIS unter „Heute“."]);
    for (const spaeter of [um(10, 31), um(12)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.deepEqual([texte().length, mitteilungen().length], [0, 1], "aufs Handy kommt nichts doppelt, am Mac bleibt es bei der einen");
  });

  test("ein Stand von früher ohne Teil für den Mac: Was schon gemeldet war, kommt am Mac nicht noch einmal, Neues schon; der Teil fürs Handy bleibt", async () => {
    const halle = await fuelle();
    await stelleEin({ hinweise: true });
    await aufgaben.zeitplanJetzt(um(10));
    await hinweise.hinweiseGeschrieben();
    type Teil = { gesendet: string[]; gemeldet: Record<string, string> };
    const alt = JSON.parse(datei("hinweise.json")) as Teil & { mac?: Teil };
    assert.deepEqual([alt.gesendet.length, Object.keys(alt.gemeldet).length], [1, 2]);

    // So sah die Datei aus, bevor es die Mitteilung am Mac gab: nur der Teil fürs Handy.
    writeFileSync(path.join(ordner, "hinweise.json"), JSON.stringify({ gesendet: alt.gesendet, gemeldet: alt.gemeldet }));
    hinweise.vergissHinweise();
    await beides();
    await aufgaben.zeitplanJetzt(um(12));
    assert.deepEqual([texte().length, mitteilungen().length], [1, 0], "was das Handy schon gemeldet hat, ist auch am Mac nichts Neues");
    await p.trageEin(halle.id, { art: "aufgabe", text: "Brandschutz nachreichen", faellig: "2026-11-12" }, "mac", um(12, 30));
    await aufgaben.zeitplanJetzt(um(13));
    assert.deepEqual([texte().length, mitteilungen().length], [2, 1]);
    assert.equal(mitteilungen()[0].text, "Eine Aufgabe ist überfällig. Einzelheiten in JARVIS unter „Heute“.");
    await hinweise.hinweiseGeschrieben();
    const neu = JSON.parse(datei("hinweise.json")) as Teil & { mac?: Teil };
    assert.deepEqual([neu.gesendet.length, Object.keys(neu.gemeldet).length, neu.mac?.gesendet.length, Object.keys(neu.mac?.gemeldet ?? {}).length], [2, 3, 1, 3]);
    assert.deepEqual(neu.gesendet[0], alt.gesendet[0], "der Teil fürs Handy steht weiter ganz oben");
  });

  test("liegt im Speicher noch ein Stand in der alten Form (nach einem Neuladen des Programms), wird er neu gelesen statt falsch benutzt", async () => {
    await fuelle();
    await nurMac();
    (globalThis as unknown as { __jarvisHinweise: { stand: unknown } }).__jarvisHinweise.stand = { gesendet: [], gemeldet: {} };
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal(mitteilungen().length, 1);
    assert.equal((await eintrag("hinweise-mac", um(10, 1))).ergebnis, "ok");
  });

  // Auf einem echten Mac lässt sich „kein Mac“ nicht nachstellen: Dort riefe der Test das echte osascript.
  test("läuft JARVIS nicht auf einem Mac, wird nichts versucht, und der Zeitplan sagt es", { skip: process.platform === "darwin" && "nur außerhalb von macOS prüfbar" }, async () => {
    await fuelle();
    await nurMac();
    delete process.env.JARVIS_OSASCRIPT;
    await aufgaben.zeitplanJetzt(um(10));
    assert.deepEqual(mitteilungen(), []);
    const e = await eintrag("hinweise-mac", um(10, 1));
    assert.deepEqual([e.takt, e.hinweis, e.letzterLauf], ["ausgeschaltet", "Mitteilungen gibt es nur auf dem Mac.", null]);
  });

  test("im Stand und im Zeitplan steht kein Text aus den Projekten; der Not-Aus hält die Mitteilung nicht an", async () => {
    await fuelle();
    await nurMac();
    await zustand.notausAn("Test", "mac");
    await aufgaben.zeitplanJetzt(um(10));
    assert.equal(mitteilungen().length, 1);
    await hinweise.hinweiseGeschrieben();
    await plan.zeitplanGeschrieben();
    for (const name of ["hinweise.json", "zeitplan.json"]) for (const wort of ["Statik", "Hallenneubau", "Adler", "Kaufpreis"]) assert.ok(!datei(name).includes(wort), `„${wort}“ steht in ${name}`);
  });
});

describe("Zeitplan: Morgenbriefing und Tagesabschluss laufen über den gemeinsamen Taktgeber", () => {
  test("das Briefing kommt einmal und steht als Lauf im Zeitplan", async () => {
    await stelleEin({ briefing: "07:30" });
    const vorher = await eintrag("briefing", um(6));
    assert.deepEqual([vorher.takt, vorher.naechsterLauf, vorher.hinweis, vorher.letzterLauf, vorher.selbst], ["täglich um 07:30 Uhr, per Telegram", um(7, 30).toISOString(), null, null, true]);
    await aufgaben.zeitplanJetzt(um(7, 29));
    assert.deepEqual(texte(), []);
    await aufgaben.zeitplanJetzt(um(7, 30));
    await aufgaben.zeitplanJetzt(um(7, 31));
    await aufgaben.zeitplanJetzt(um(9));
    assert.equal(texte().length, 1);
    assert.match(texte()[0], /Benedikt/);
    const e = await eintrag("briefing", um(9));
    assert.deepEqual([e.letzterLauf, e.ergebnis, e.naechsterLauf], [um(7, 30).toISOString(), "ok", um(7, 30, 14).toISOString()]);
  });

  test("ist Telegram zur Uhrzeit nicht erreichbar, kommt das Briefing ein paar Minuten später, aber nur einmal", async () => {
    await stelleEin({ briefing: "07:30" });
    tg.fehler.getMe = 502;
    await aufgaben.zeitplanJetzt(um(7, 30));
    assert.deepEqual(texte(), []);
    assert.equal((await eintrag("briefing", um(7, 31))).fehler, "Telegram war nicht erreichbar. Das Morgenbriefing kommt, sobald es wieder geht.");
    await aufgaben.zeitplanJetzt(um(7, 31));
    await aufgaben.zeitplanJetzt(um(7, 34));
    assert.deepEqual(texte(), [], "nicht jede Minute ein Versuch");
    await aufgaben.zeitplanJetzt(um(7, 35));
    await aufgaben.zeitplanJetzt(um(7, 41));
    assert.equal(texte().length, 1);
  });

  test("lehnt Telegram das Briefing ab, kommt kein zweites, und im Zeitplan steht ein fester Satz", async () => {
    await stelleEin({ briefing: "07:30" });
    tg.fehler.sendMessage = 400;
    await aufgaben.zeitplanJetzt(um(7, 30));
    for (const spaeter of [um(7, 36), um(8), um(10)]) await aufgaben.zeitplanJetzt(spaeter);
    assert.deepEqual(texte(), []);
    const e = await eintrag("briefing", um(10));
    assert.deepEqual([e.ergebnis, e.fehler], ["fehler", "Telegram hat das Morgenbriefing nicht angenommen."]);
  });

  test("der Tagesabschluss ist aus, bis eine Uhrzeit eingestellt ist; dann kommt er einmal", async () => {
    await aufgaben.zeitplanJetzt(um(18, 1));
    assert.deepEqual(texte(), []);
    const aus = await eintrag("abschluss", um(12));
    assert.deepEqual([aus.takt, aus.naechsterLauf, aus.hinweis], ["ausgeschaltet", null, "Ausgeschaltet."]);

    await stelleEin({ abschluss: "18:00" });
    const an = await eintrag("abschluss", um(12));
    assert.deepEqual([an.takt, an.naechsterLauf, an.hinweis], ["täglich um 18:00 Uhr, per Telegram", um(18).toISOString(), null]);
    await aufgaben.zeitplanJetzt(um(18, 1));
    await aufgaben.zeitplanJetzt(um(18, 2));
    assert.equal(texte().length, 1);
    assert.match(texte()[0], /^Feierabend, Benedikt\./);
  });
});

describe("Zeitplan: Erinnerungen vor Terminen laufen über den gemeinsamen Taktgeber", () => {
  // Der Kalender liest ab heute, deshalb hier die echte Uhrzeit.
  const termin = (start: number) => ({ id: "a", title: "Jour fixe", start, end: start + 3_600_000, allDay: false, location: "", calendar: "Privat" });
  const kalenderMit = async (start: number) => {
    writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [termin(start)] }));
    await kalender.readCalendar({ force: true });
  };

  test("eine Viertelstunde vorher kommt die Erinnerung, einmal, und der Zeitplan zeigt den Lauf", async () => {
    const nun = new Date();
    const start = nun.getTime() + 40 * 60_000;
    await kalenderMit(start);
    await stelleEin({ reminders: true });
    await aufgaben.zeitplanJetzt(nun);
    assert.deepEqual(texte(), [], "40 Minuten vorher noch nichts");
    const wartet = await eintrag("erinnerungen", nun);
    assert.deepEqual([wartet.takt, wartet.naechsterLauf, wartet.hinweis], ["15 Minuten vor jedem Termin, per Telegram", new Date(start - 15 * 60_000).toISOString(), null]);

    const dann = new Date(start - 14 * 60_000);
    await aufgaben.zeitplanJetzt(dann);
    await aufgaben.zeitplanJetzt(new Date(dann.getTime() + 60_000));
    assert.equal(texte().length, 1);
    assert.ok(texte()[0].startsWith("⏰") && texte()[0].includes("Jour fixe"), texte()[0]);
    const e = await eintrag("erinnerungen", new Date(dann.getTime() + 60_000));
    assert.deepEqual([e.letzterLauf, e.ergebnis], [dann.toISOString(), "ok"]);
  });

  test("ist Telegram kurz weg, kommt die Erinnerung in der nächsten Minute nach", async () => {
    const nun = new Date();
    await kalenderMit(nun.getTime() + 10 * 60_000);
    await stelleEin({ reminders: true });
    tg.fehler.getMe = 502;
    await aufgaben.zeitplanJetzt(nun);
    assert.deepEqual(texte(), []);
    assert.equal((await eintrag("erinnerungen", nun)).fehler, "Telegram war nicht erreichbar. Die Erinnerung kommt, sobald es wieder geht.");
    await aufgaben.zeitplanJetzt(new Date(nun.getTime() + 60_000));
    assert.equal(texte().length, 1);
  });

  test("zwei Termine zur selben Zeit: zwei Erinnerungen, aber nur ein Blick, ob Telegram erreichbar ist", async () => {
    const nun = new Date();
    const start = nun.getTime() + 10 * 60_000;
    writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [termin(start), { ...termin(start), id: "b", title: "Bauherr" }] }));
    await kalender.readCalendar({ force: true });
    await stelleEin({ reminders: true });
    await aufgaben.zeitplanJetzt(nun);
    assert.equal(texte().length, 2);
    assert.equal(tg.gesendet.filter((g) => g.methode === "getMe").length, 1);
  });

  test("abgeschaltet kommt keine", async () => {
    const nun = new Date();
    await kalenderMit(nun.getTime() + 10 * 60_000);
    await aufgaben.zeitplanJetzt(nun);
    assert.deepEqual(texte(), []);
    const e = await eintrag("erinnerungen", nun);
    assert.deepEqual([e.takt, e.hinweis], ["ausgeschaltet", "Ausgeschaltet."]);
  });
});
