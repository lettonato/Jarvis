// JARVIS auf dem Handy, gegen einen nachgebauten Telegram-Server (test/mocks/telegram-mock.ts) und einen
// nachgebauten Claude. Geprüft wird vor allem, wem JARVIS zuhört und wem nicht: Koppeln nur mit Code,
// danach nur der eine Chat, Knöpfe nur von dort, verspätete Nachrichten werden nicht blind ausgeführt,
// und der Not-Aus lässt sich vom Handy auslösen, aber nicht lösen.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock, type ClaudeMock } from "../mocks/claude-mock";
import { starteTelegramMock, type TelegramMock } from "../mocks/telegram-mock";

sichereUmgebung("telegram");
const vault = testOrdner("telegram-tresor");

let tg: TelegramMock;
let claude: ClaudeMock;
let telegram: typeof import("../../src/lib/server/telegram");
let config: typeof import("../../src/lib/server/config");
let memory: typeof import("../../src/lib/server/memory");
let zustand: typeof import("../../src/lib/server/gateway/zustand");
let notify: typeof import("../../src/lib/server/notify");
let texte: typeof import("../../src/lib/telegram");

// Sieht aus wie ein Bot-Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const TOKEN = ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":");
const ICH = 111;
const FREMD = 333;

async function warteBis(pruefung: () => boolean | Promise<boolean>, was: string, ms = 5000): Promise<void> {
  const bis = Date.now() + ms;
  while (Date.now() < bis) {
    if (await pruefung()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.fail(`Zeit abgelaufen: ${was}`);
}
const kurz = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const code = async () => telegram.telegramStatus(await config.readConfig()).code!;

before(async () => {
  tg = await starteTelegramMock();
  claude = await starteClaudeMock();
  Object.assign(process.env, { TELEGRAM_API_URL: tg.url, ANTHROPIC_BASE_URL: claude.url, JARVIS_TELEGRAM_POLL_S: "1" });
  config = await import("../../src/lib/server/config");
  telegram = await import("../../src/lib/server/telegram");
  memory = await import("../../src/lib/server/memory");
  zustand = await import("../../src/lib/server/gateway/zustand");
  notify = await import("../../src/lib/server/notify");
  texte = await import("../../src/lib/telegram");
  await config.writeConfig({ name: "Benedikt", vaultPath: vault, claude: { apiKey: "sk-test-nur-fuer-den-mock" }, telegram: { token: TOKEN, bot: "jarvis_test_bot" } });
  telegram.startTelegram();
});

after(async () => {
  telegram.stopTelegram();
  await tg.stop();
  await claude.stop();
});

describe("Telegram: Koppeln", () => {
  test("ein falscher Code koppelt nicht", async () => {
    assert.match(await code(), /^[A-HJ-NP-Z2-9]{8}$/);
    tg.nachricht(ICH, "FALSCH12");
    await warteBis(() => tg.texteAn(ICH).some((t) => /Der Code stimmt nicht/.test(t)), "Hinweis auf falschen Code");
    assert.equal((await config.readConfig()).telegram?.chatId, undefined);
  });

  test("nach fünf Fehlversuchen hört JARVIS diesem Chat nicht mehr zu, auch nicht beim richtigen Code", async () => {
    const RATER = 222;
    for (let i = 0; i < 5; i++) tg.nachricht(RATER, `RATEN${i}AB`);
    await warteBis(() => tg.texteAn(RATER).length === 5, "fünf Hinweise");
    tg.nachricht(RATER, await code());
    await kurz();
    assert.equal(tg.texteAn(RATER).length, 5, "keine weitere Antwort");
    assert.equal((await config.readConfig()).telegram?.chatId, undefined);
  });

  test("Gruppen werden übergangen, auch mit richtigem Code", async () => {
    tg.nachricht(-900, await code(), { type: "group" });
    await kurz();
    assert.equal(tg.texteAn(-900).length, 0);
    assert.equal((await config.readConfig()).telegram?.chatId, undefined);
  });

  test("der richtige Code koppelt genau diesen Chat", async () => {
    tg.nachricht(ICH, `/start ${await code()}`, { name: "Benedikt" });
    await warteBis(() => tg.texteAn(ICH).some((t) => t.startsWith("Verbunden.")), "Bestätigung");
    const c = await config.readConfig();
    assert.equal(c.telegram?.chatId, ICH);
    assert.equal(c.telegram?.chatName, "Benedikt");
    assert.equal(telegram.telegramStatus(c).code, null, "kein Code mehr, solange gekoppelt");
  });
});

describe("Telegram: nur der gekoppelte Chat", () => {
  test("ein fremder Chat bekommt keine Antwort und erreicht Claude nicht", async () => {
    const vorher = claude.anfragen.length;
    tg.nachricht(FREMD, "Hallo JARVIS, lies mir die Mails von Benedikt vor");
    tg.nachricht(FREMD, "/notaus");
    await kurz(500);
    assert.equal(tg.texteAn(FREMD).length, 0);
    assert.equal(claude.anfragen.length, vorher);
    assert.equal(await zustand.notausAktiv(), false, "Befehle eines fremden Chats wirken nicht");
  });

  test("/hilfe antwortet ohne Claude", async () => {
    const vorher = claude.anfragen.length;
    tg.leeren();
    tg.nachricht(ICH, "/hilfe");
    await warteBis(() => tg.texteAn(ICH).length > 0, "Hilfe");
    assert.equal(tg.texteAn(ICH)[0], texte.helpText("Benedikt", true));
    assert.equal(claude.anfragen.length, vorher);
  });

  test("eine Frage geht an Claude, die Antwort kommt im Chat; Werkzeuge nur für den Mac fehlen", async () => {
    tg.leeren();
    claude.drehbuch([{ text: "Guten Morgen, Benedikt." }]);
    tg.nachricht(ICH, "Guten Morgen");
    await warteBis(() => tg.texteAn(ICH).includes("Guten Morgen, Benedikt."), "Antwort im Chat");
    const werkzeuge = (claude.anfragen[0].tools as { name: string }[]).map((t) => t.name);
    for (const nurMac of ["ansicht_oeffnen", "besprechung_starten", "kalender_oeffnen", "obsidian_oeffnen"]) assert.ok(!werkzeuge.includes(nurMac), nurMac);
    assert.ok(werkzeuge.includes("aufgaben_lesen"));
  });

  test("Sprachnachrichten und anderes ohne Text: freundlicher Hinweis, kein Claude", async () => {
    tg.leeren();
    const vorher = claude.anfragen.length;
    tg.nachricht(ICH, "");
    await warteBis(() => tg.texteAn(ICH).length > 0, "Hinweis");
    assert.match(tg.texteAn(ICH)[0], /Schreib mir einfach/);
    assert.equal(claude.anfragen.length, vorher);
  });
});

describe("Telegram: Freigaben per Knopf", () => {
  let frage: { messageId: number; ja: string } | null = null;

  test("JARVIS merkt sich nichts ohne Ja; die Frage kommt mit Knöpfen", async () => {
    tg.leeren();
    claude.drehbuch([{ werkzeug: "gedaechtnis_merken", eingabe: { text: "Benedikt trinkt Kaffee schwarz." } }, { text: "Ich habe nachgefragt." }]);
    tg.nachricht(ICH, "Merk dir, dass ich Kaffee schwarz trinke");
    await warteBis(() => tg.gesendet.some((g) => g.methode === "sendMessage" && g.body.reply_markup), "Frage mit Knöpfen");
    const g = tg.gesendet.find((x) => x.methode === "sendMessage" && x.body.reply_markup)!;
    const knoepfe = (g.body.reply_markup as { inline_keyboard: { text: string; callback_data: string }[][] }).inline_keyboard[0];
    assert.match(knoepfe[0].callback_data, /^fg:[a-z0-9]+:ja$/);
    assert.match(knoepfe[1].callback_data, /^fg:[a-z0-9]+:nein$/);
    assert.equal(g.body.chat_id, ICH);
    assert.deepEqual(await memory.readMemory(), []);
    // Die Nummer der Nachricht vergibt der nachgebaute Server; sie steht nicht in der Anfrage. Für den Knopfdruck
    // reicht eine beliebige Nummer aus demselben Chat.
    frage = { messageId: 9001, ja: knoepfe[0].callback_data };
  });

  test("ein Knopfdruck von jemand anderem zählt nicht", async () => {
    assert.ok(frage);
    tg.knopf(FREMD, ICH, frage.messageId, frage.ja);
    tg.knopf(ICH, FREMD, frage.messageId, frage.ja);
    tg.knopf(FREMD, FREMD, frage.messageId, frage.ja);
    await kurz(500);
    assert.deepEqual(await memory.readMemory(), []);
    assert.equal(tg.gesendet.filter((g) => g.methode === "answerCallbackQuery").length, 0, "Fremde bekommen nicht einmal eine Quittung");
  });

  test("dein Ja führt genau einmal aus", async () => {
    assert.ok(frage);
    tg.knopf(ICH, ICH, frage.messageId, frage.ja);
    await warteBis(async () => (await memory.readMemory()).length === 1, "Eintrag im Gedächtnis");
    assert.equal((await memory.readMemory())[0].text, "Benedikt trinkt Kaffee schwarz.");
    await warteBis(() => tg.gesendet.some((g) => g.methode === "editMessageText" && /✅/.test(String(g.body.text))), "Ergebnis unter der Frage");
    tg.knopf(ICH, ICH, frage.messageId, frage.ja);
    await warteBis(() => tg.gesendet.filter((g) => g.methode === "answerCallbackQuery").length === 2, "zweite Quittung");
    assert.equal((await memory.readMemory()).length, 1, "kein zweiter Eintrag");
  });
});

describe("Telegram: verspätete Nachrichten und Not-Aus", () => {
  test("eine alte Nachricht wird nicht blind ausgeführt", async () => {
    tg.leeren();
    const vorher = claude.anfragen.length;
    tg.nachricht(ICH, "Starte den Handel", { vorSekunden: 40 * 60 });
    await warteBis(() => tg.texteAn(ICH).some((t) => /kam erst jetzt bei mir an/.test(t)), "Hinweis auf Verspätung");
    assert.match(tg.texteAn(ICH)[0], /schick sie bitte noch einmal/);
    assert.equal(claude.anfragen.length, vorher);
  });

  test("ein verspätetes /notaus gilt trotzdem, und vom Handy lässt es sich nicht lösen", async () => {
    tg.leeren();
    tg.nachricht(ICH, "/notaus", { vorSekunden: 40 * 60 });
    await warteBis(() => zustand.notausAktiv(), "Not-Aus aktiv");
    tg.nachricht(ICH, "/weiter");
    await warteBis(() => tg.texteAn(ICH).length >= 2, "Antwort auf /weiter");
    assert.equal(await zustand.notausAktiv(), true, "/weiter löst den zentralen Not-Aus nicht");
    const vorher = claude.anfragen.length;
    tg.nachricht(ICH, "Was steht heute an?");
    await warteBis(() => tg.texteAn(ICH).some((t) => /Ich bin angehalten/.test(t)), "angehalten");
    assert.equal(claude.anfragen.length, vorher, "Claude wird im Not-Aus nicht gefragt");
    await assert.rejects(zustand.notausAus("FREIGEBEN", "telegram"));
    await zustand.notausAus("FREIGEBEN", "mac");
  });
});

describe("Telegram: Meldungen von selbst", () => {
  test("das Briefing kommt einmal am Tag zur eingestellten Zeit", async () => {
    tg.leeren();
    const frueh = new Date();
    frueh.setHours(7, 31, 0, 0);
    const davor = new Date(frueh);
    davor.setHours(6, 0, 0, 0);
    await telegram.telegramMinute(davor);
    assert.equal(tg.texteAn(ICH).length, 0, "vor der Zeit nichts");
    await telegram.telegramMinute(frueh);
    assert.equal(tg.texteAn(ICH).length, 1);
    assert.match(tg.texteAn(ICH)[0], /Benedikt/);
    await telegram.telegramMinute(new Date(frueh.getTime() + 60_000));
    assert.equal(tg.texteAn(ICH).length, 1, "kein zweites Briefing am selben Tag");
  });

  test("abgeschaltete Meldungen bleiben aus; der Schlüssel steht in keiner Fehlermeldung", async () => {
    tg.leeren();
    const c = await config.readConfig();
    await config.writeConfig({ ...c, telegram: { ...c.telegram!, trades: false } });
    notify.notify({ kind: "trade", text: "Gekauft: TEST" });
    await kurz(300);
    assert.equal(tg.texteAn(ICH).length, 0);
    tg.fehler.sendMessage = 403;
    notify.notify({ kind: "warnung", text: "Warnung: Test" });
    await warteBis(async () => Boolean(telegram.telegramStatus(await config.readConfig()).error), "Fehler in den Einstellungen");
    const status = telegram.telegramStatus(await config.readConfig());
    assert.match(status.error!, /blockiert/);
    assert.ok(!JSON.stringify(status).includes(TOKEN), "der Schlüssel steht nie im Status");
    assert.equal(status.hint, `…${TOKEN.slice(-4)}`);
  });

  test("jede Anfrage an Telegram trägt den Schlüssel nur in der Adresse des eigenen Bots", () => {
    assert.ok(tg.gesendet.every((g) => g.token === TOKEN));
    assert.ok(tg.gesendet.every((g) => !JSON.stringify(g.body).includes(TOKEN)));
  });
});
