// Was per Telegram von selbst kommt, läuft über den gemeinsamen Zeitplan: Morgenbriefing, Erinnerungen vor
// Terminen, Hinweise am Tag und Tagesabschluss. Gegen einen nachgebauten Telegram-Server und einen
// nachgebauten Mac-Kalender. Geprüft wird vor allem die Obergrenze der Hinweise (aus, bis man sie einschaltet,
// nur tagsüber, höchstens drei am Tag, jedes Ding einmal), dass nichts doppelt hinausgeht, dass ein Fehlschlag
// mit festem Satz im Zeitplan steht und dass Projektinhalte nur mit dem Schalter über Telegram gehen.

import assert from "node:assert/strict";
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteTelegramMock, type TelegramMock } from "../mocks/telegram-mock";

const ordner = sichereUmgebung("hinweise");
const ablage = testOrdner("hinweise-mac");
const vault = testOrdner("hinweise-tresor");
const STORE = path.join(ablage, "kalender.json");
chmodSync("test/mocks/osascript-mock.mjs", 0o755);
Object.assign(process.env, { JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_MAC_STORE: STORE });

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
