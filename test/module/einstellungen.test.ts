// Einstellungen speichern, ohne dass eine Änderung die andere überschreibt. Früher las jede Stelle erst alle
// Einstellungen, prüfte dann in Ruhe (ein Schlüssel wird beim Anbieter getestet, das dauert) und schrieb am Ende
// ihren alten Stand ganz zurück: Was in der Zwischenzeit woanders gespeichert wurde, war wieder weg. Jetzt liest,
// ändert und speichert jede Stelle in einem Zug (aendereConfig). Geprüft wird hier jede Stelle, die speichert,
// gegen nachgebaute Dienste; echte Dienste und echte Einstellungen werden nicht berührt.

import assert from "node:assert/strict";
import { chmodSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock, type ClaudeMock } from "../mocks/claude-mock";
import { starteTelegramMock, type TelegramMock } from "../mocks/telegram-mock";

sichereUmgebung("einstellungen");

let claude: ClaudeMock;
let tg: TelegramMock;
let config: typeof import("../../src/lib/server/config");
let einstellungen: typeof import("../../src/lib/server/einstellungen");
let telegram: typeof import("../../src/lib/server/telegram");
let intel: typeof import("../../src/lib/server/intel");
let metalle: typeof import("../../src/lib/server/metalle");
let kalender: typeof import("../../src/lib/server/calendar");

// Sehen aus wie echte Schlüssel, sind aber keine. Zusammengesetzt, damit gitleaks sie nicht meldet.
const CLAUDE = ["sk-ant-api03", "test", "nur", "fuer", "die", "einstellungen"].join("-");
const TOKEN = ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":");
const TOKEN2 = ["987654321", "AAHtest_ein_zweiter_bot_im_telegram_mock"].join(":");
const ELEVEN = ["sk", "test0nur0fuer0die0einstellungen0abcdef0123456789"].join("_");

const gut = async (lauf: ReturnType<typeof einstellungen.aendereEinstellung>) => {
  const r = await lauf;
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r;
};
const schlecht = async (lauf: ReturnType<typeof einstellungen.aendereEinstellung>, satz: RegExp) => {
  const r = await lauf;
  assert.ok(!r.ok, "Die Änderung hätte abgelehnt werden müssen.");
  assert.match(r.error, satz);
};

before(async () => {
  claude = await starteClaudeMock();
  tg = await starteTelegramMock();
  Object.assign(process.env, { ANTHROPIC_BASE_URL: claude.url, TELEGRAM_API_URL: tg.url });
  config = await import("../../src/lib/server/config");
  einstellungen = await import("../../src/lib/server/einstellungen");
  telegram = await import("../../src/lib/server/telegram");
  intel = await import("../../src/lib/server/intel");
  metalle = await import("../../src/lib/server/metalle");
  kalender = await import("../../src/lib/server/calendar");
});

after(async () => {
  await claude.stop();
  await tg.stop();
});

beforeEach(async () => {
  await config.writeConfig({ name: "Benedikt" });
});

describe("Einstellungen: zwei Änderungen zur selben Zeit", () => {
  test("Name und Freigabegrenze zugleich: beide bleiben", async () => {
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "name", name: "Ben" })), gut(einstellungen.aendereEinstellung({ action: "approval", limitUsd: 100 }))]);
    const c = await config.readConfig();
    assert.equal(c.name, "Ben");
    assert.deepEqual(c.approval, { limitUsd: 100 });
  });

  test("was gespeichert wird, während ein Schlüssel noch beim Anbieter geprüft wird, bleibt", async () => {
    await Promise.all([
      gut(einstellungen.aendereEinstellung({ action: "claude", apiKey: CLAUDE })),
      gut(einstellungen.aendereEinstellung({ action: "name", name: "Ben" })),
      intel.saveIntelSettings({ topics: ["Halbleiter"], auto: false }),
      metalle.saveMetalleSettings({ auto: false, zeiten: ["07:30"] }),
      kalender.speichereKalenderZiel("Arbeit"),
    ]);
    const c = await config.readConfig();
    assert.equal(c.claude?.apiKey, CLAUDE);
    assert.equal(c.name, "Ben");
    assert.deepEqual(c.intel, { topics: ["Halbleiter"], auto: false });
    assert.deepEqual(c.metalle, { auto: false, zeiten: ["07:30"] });
    assert.deepEqual(c.calendar, { target: "Arbeit" });
  });

  test("zwanzig Änderungen durcheinander: keine geht verloren", async () => {
    const themen = Array.from({ length: 10 }, (_, i) => `Thema ${i}`);
    await Promise.all([
      ...themen.map((_, i) => (i % 2 ? intel.saveIntelSettings({ budgetUsd: 1 + i }) : metalle.saveMetalleSettings({ auto: i % 4 === 0 }))),
      ...themen.map((_, i) => gut(einstellungen.aendereEinstellung(i % 2 ? { action: "name", name: `Ben ${i}` } : { action: "approval", limitUsd: 250 }))),
    ]);
    const c = await config.readConfig();
    assert.match(c.name, /^Ben \d$/);
    assert.deepEqual(c.approval, { limitUsd: 250 });
    assert.ok((c.intel?.budgetUsd ?? 0) >= 2);
    assert.equal(typeof c.metalle?.auto, "boolean");
  });

  test("das Kalenderziel lässt sich setzen und wieder leeren, ohne anderes anzufassen", async () => {
    await config.writeConfig({ name: "Benedikt", approval: { limitUsd: 100 } });
    await kalender.speichereKalenderZiel("Arbeit");
    assert.deepEqual((await config.readConfig()).calendar, { target: "Arbeit" });
    await kalender.speichereKalenderZiel("");
    assert.deepEqual(await config.readConfig(), { name: "Benedikt", approval: { limitUsd: 100 } });
  });
});

describe("Einstellungen: Handy (Telegram)", () => {
  const gekoppelt = { token: TOKEN, bot: "jarvis_test_bot", chatId: 111, chatName: "Benedikt", trades: false, hinweise: true, briefing: "07:15", abschluss: "18:00" };

  test("das Handy trennen überschreibt nicht, was inzwischen gespeichert wurde, und behält alle Schalter", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: gekoppelt });
    // Die Abschiedsnachricht braucht einen Moment: Genau dann wird woanders gespeichert.
    tg.warte.sendMessage = 150;
    await Promise.all([telegram.unpairTelegram(), new Promise((r) => setTimeout(r, 30)).then(() => gut(einstellungen.aendereEinstellung({ action: "name", name: "Ben" })))]);
    const c = await config.readConfig();
    assert.equal(c.name, "Ben");
    assert.deepEqual(c.telegram, { token: TOKEN, bot: "jarvis_test_bot", trades: false, hinweise: true, briefing: "07:15", abschluss: "18:00" });
  });

  test("Schalter ändern, während das Handy gerade gekoppelt wird: Kopplung und Schalter bleiben", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: { token: TOKEN, bot: "jarvis_test_bot" } });
    await Promise.all([
      gut(einstellungen.aendereEinstellung({ action: "telegramPrefs", trades: false, briefing: "06:45" })),
      config.aendereConfig((c) => ({ ...c, telegram: { ...c.telegram!, chatId: 111, chatName: "Benedikt" } })),
    ]);
    const t = (await config.readConfig()).telegram;
    assert.deepEqual(t, { token: TOKEN, bot: "jarvis_test_bot", chatId: 111, chatName: "Benedikt", trades: false, briefing: "06:45" });
  });

  test("derselbe Schlüssel noch einmal: Kopplung und Schalter bleiben", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: gekoppelt });
    const r = await gut(einstellungen.aendereEinstellung({ action: "telegram", token: TOKEN }));
    assert.match(r.message ?? "", /Verbunden mit @/);
    assert.equal(r.config.telegram?.chatId, 111);
    assert.equal((await config.readConfig()).telegram?.hinweise, true);
  });

  test("ein anderer Bot: Schalter bleiben, die Kopplung nicht", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: gekoppelt });
    const r = await gut(einstellungen.aendereEinstellung({ action: "telegram", token: TOKEN2 }));
    assert.equal(r.message, undefined);
    const t = (await config.readConfig()).telegram;
    assert.equal(t?.token, TOKEN2);
    assert.equal(t?.chatId, undefined);
    assert.equal(t?.trades, false);
    assert.equal(t?.hinweise, true);
    assert.equal(t?.briefing, "07:15");
  });

  test("Telegram entfernen, während woanders gespeichert wird: Telegram ist weg, das andere bleibt", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: gekoppelt });
    tg.warte.sendMessage = 150;
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "removeTelegram" })), new Promise((r) => setTimeout(r, 30)).then(() => intel.saveIntelSettings({ auto: false }))]);
    const c = await config.readConfig();
    assert.equal(c.telegram, undefined);
    assert.deepEqual(c.intel, { auto: false });
  });

  test("koppelt sich während der Abschiedsnachricht ein anderes Handy, wird das neue nicht mit getrennt", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: gekoppelt });
    tg.warte.sendMessage = 150;
    await Promise.all([telegram.unpairTelegram(), new Promise((r) => setTimeout(r, 30)).then(() => config.aendereConfig((c) => ({ ...c, telegram: { ...c.telegram!, chatId: 222, chatName: "Neues Handy" } })))]);
    const t = (await config.readConfig()).telegram;
    assert.equal(t?.chatId, 222);
    assert.equal(t?.chatName, "Neues Handy");
  });

  test("Schalter ohne eingerichteten Bot und eine unmögliche Uhrzeit werden abgelehnt", async () => {
    await schlecht(einstellungen.aendereEinstellung({ action: "telegramPrefs", trades: false }), /zuerst den Bot-Schlüssel/);
    await config.writeConfig({ name: "Benedikt", telegram: gekoppelt });
    await schlecht(einstellungen.aendereEinstellung({ action: "telegramPrefs", briefing: "25:00" }), /Uhrzeit wie 07:30/);
    for (const falsch of [{ tag: 8, zeit: "16:00" }, { tag: 5, zeit: "16 Uhr" }, { tag: 5 }, "freitag"]) await schlecht(einstellungen.aendereEinstellung({ action: "telegramPrefs", woche: falsch as never }), /Wochentag und eine Uhrzeit wie 16:00/);
    assert.deepEqual((await config.readConfig()).telegram, gekoppelt);
    // Der Wochenbericht: einschalten mit Wochentag und Uhrzeit, ausschalten mit null; nur der Plan wird gespeichert.
    await gut(einstellungen.aendereEinstellung({ action: "telegramPrefs", woche: { tag: 5, zeit: "16:00", mehr: "x" } as never }));
    assert.deepEqual((await config.readConfig()).telegram?.woche, { tag: 5, zeit: "16:00" });
    await gut(einstellungen.aendereEinstellung({ action: "telegramPrefs", trades: true }));
    assert.deepEqual((await config.readConfig()).telegram?.woche, { tag: 5, zeit: "16:00" }, "ein anderer Schalter lässt ihn stehen");
    await gut(einstellungen.aendereEinstellung({ action: "telegramPrefs", woche: null }));
    assert.equal((await config.readConfig()).telegram?.woche, null);
  });
});

describe("Einstellungen: was abgelehnt wird, ändert nichts", () => {
  const vorher = { name: "Benedikt", approval: { limitUsd: 100 as const } };
  const unveraendert = async () => assert.deepEqual(await config.readConfig(), vorher);

  test("leerer Name, unbekannte Grenze, unbekannte Aktion", async () => {
    await config.writeConfig(vorher);
    await schlecht(einstellungen.aendereEinstellung({ action: "name", name: "   " }), /Bitte einen Namen/);
    await schlecht(einstellungen.aendereEinstellung({ action: "approval", limitUsd: 7 as never }), /Diese Grenze gibt es nicht/);
    await schlecht(einstellungen.aendereEinstellung({ action: "gibtEsNicht" } as never), /Unbekannte Aktion/);
    await schlecht(einstellungen.aendereEinstellung({ action: "mail" } as never), /E-Mail-Adresse eintragen/);
    await unveraendert();
  });

  test("Schlüssel, die nicht nach Schlüssel aussehen, und ein Budget ohne Schlüssel", async () => {
    await config.writeConfig(vorher);
    await schlecht(einstellungen.aendereEinstellung({ action: "claude", apiKey: "kein-schluessel" }), /beginnt mit sk-ant-/);
    await schlecht(einstellungen.aendereEinstellung({ action: "xai", apiKey: "kein-schluessel" }), /beginnt mit xai-/);
    await schlecht(einstellungen.aendereEinstellung({ action: "xaiBudget", budgetUsd: 2 }), /zuerst den xAI-Schlüssel/);
    await schlecht(einstellungen.aendereEinstellung({ action: "twelvedata", apiKey: "zu kurz" }), /Twelve-Data-Schlüssel/);
    await schlecht(einstellungen.aendereEinstellung({ action: "vault", path: "/gibt/es/nicht/jarvis-test" }), /gibt es nicht/);
    await unveraendert();
  });

  test("ein Schlüssel, den der Anbieter nicht annimmt, wird nicht gespeichert", async () => {
    await config.writeConfig(vorher);
    const r = await einstellungen.aendereEinstellung({ action: "xai", apiKey: "xai-test-nur-fuer-einen-toten-port" });
    assert.equal(r.ok, false);
    await unveraendert();
  });
});

describe("Einstellungen: einzelne Abschnitte", () => {
  test("das Tagesbudget für X behält den Schlüssel", async () => {
    await config.writeConfig({ name: "Benedikt", xai: { apiKey: "xai-test-nur-fuer-den-mock" } });
    await gut(einstellungen.aendereEinstellung({ action: "xaiBudget", budgetUsd: 2.5 }));
    assert.deepEqual((await config.readConfig()).xai, { apiKey: "xai-test-nur-fuer-den-mock", dailyBudgetUsd: 2.5 });
  });

  test("entfernen nimmt nur den einen Abschnitt weg", async () => {
    const mail = { provider: "andere" as const, host: "imap.example.invalid", port: 993, user: "b@example.invalid", password: "nur-ein-test" };
    await config.writeConfig({ name: "Benedikt", mail, claude: { apiKey: CLAUDE }, xai: { apiKey: "xai-test" }, twelvedata: { apiKey: "a".repeat(32) } });
    await Promise.all([
      gut(einstellungen.aendereEinstellung({ action: "removeMail" })),
      gut(einstellungen.aendereEinstellung({ action: "removeXai" })),
      gut(einstellungen.aendereEinstellung({ action: "removeTwelvedata" })),
    ]);
    assert.deepEqual(await config.readConfig(), { name: "Benedikt", claude: { apiKey: CLAUDE } });
    await gut(einstellungen.aendereEinstellung({ action: "removeClaude" }));
    assert.deepEqual(await config.readConfig(), { name: "Benedikt" });
  });

  test("die Stimme: eine Änderung dort überschreibt nicht, was zugleich woanders gespeichert wird", async () => {
    await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: ELEVEN, voiceId: "stimme1", voiceName: "Eine Stimme" } });
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "elevenlabsPrefs", tagesZeichen: 5000 })), gut(einstellungen.aendereEinstellung({ action: "name", name: "Ben" })), intel.saveIntelSettings({ auto: false })]);
    const c = await config.readConfig();
    assert.equal(c.name, "Ben");
    assert.deepEqual(c.intel, { auto: false });
    assert.deepEqual(c.elevenlabs, { apiKey: ELEVEN, voiceId: "stimme1", voiceName: "Eine Stimme", tagesZeichen: 5000 });
  });
});

describe("Einstellungen: was inzwischen entfernt wurde, kommt nicht zurück", () => {
  test("die Stimme: Wird der Schlüssel entfernt, während eine Änderung an der Stimme läuft, bleibt er entfernt", async () => {
    await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: ELEVEN, voiceId: "stimme1", voiceName: "Eine Stimme" } });
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "removeElevenlabs" })), gut(einstellungen.aendereEinstellung({ action: "elevenlabsPrefs", tagesZeichen: 5000 }))]);
    assert.deepEqual(await config.readConfig(), { name: "Benedikt" });
  });

  test("die Stimme: zwei Änderungen zugleich bleiben beide", async () => {
    await config.writeConfig({ name: "Benedikt", elevenlabs: { apiKey: ELEVEN, voiceId: "stimme1", voiceName: "Eine Stimme" } });
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "elevenlabsPrefs", tagesZeichen: 5000 })), gut(einstellungen.aendereEinstellung({ action: "elevenlabsPrefs", enabled: true }))]);
    assert.deepEqual((await config.readConfig()).elevenlabs, { apiKey: ELEVEN, voiceId: "stimme1", voiceName: "Eine Stimme", tagesZeichen: 5000, enabled: true });
  });

  test("das Handy: Wird der Bot entfernt, während ein Schalter umgelegt wird, bleibt er entfernt", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: { token: TOKEN, bot: "jarvis_test_bot" } });
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "removeTelegram" })), gut(einstellungen.aendereEinstellung({ action: "telegramPrefs", trades: false }))]);
    assert.deepEqual(await config.readConfig(), { name: "Benedikt" });
  });

  test("das Budget für X: Wird der Schlüssel zugleich entfernt, entsteht kein leerer Abschnitt", async () => {
    await config.writeConfig({ name: "Benedikt", xai: { apiKey: "xai-test-nur-fuer-den-mock" } });
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "removeXai" })), gut(einstellungen.aendereEinstellung({ action: "xaiBudget", budgetUsd: 2.5 }))]);
    assert.deepEqual(await config.readConfig(), { name: "Benedikt" });
  });
});

describe("Einstellungen: Mitteilungen am Mac", () => {
  const LOG = path.join(testOrdner("einstellungen-mac"), "aufrufe.log");
  const gezeigt = () =>
    (existsSync(LOG) ? readFileSync(LOG, "utf8") : "")
      .split("\n")
      .filter(Boolean)
      .map((z) => (JSON.parse(z) as { args: string[] }).args)
      .filter((a) => a[1]?.includes("display notification"))
      .map((a) => ({ text: a[2], titel: a[3] }));

  before(() => chmodSync("test/mocks/osascript-mock.mjs", 0o755));
  beforeEach(() => {
    rmSync(LOG, { force: true });
    Object.assign(process.env, { JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_MAC_LOG: LOG, JARVIS_MITTEILUNG_FRIST_MS: "1500" });
    delete process.env.JARVIS_MAC_MITTEILUNG;
  });
  after(() => {
    for (const name of ["JARVIS_OSASCRIPT", "JARVIS_MAC_LOG", "JARVIS_MITTEILUNG_FRIST_MS", "JARVIS_MAC_MITTEILUNG"]) delete process.env[name];
  });

  test("der Schalter für die Hinweise am Tag ist aus, lässt sich ein- und wieder ausschalten und fasst sonst nichts an", async () => {
    await config.writeConfig({ name: "Benedikt", telegram: { token: TOKEN, bot: "jarvis_test_bot", chatId: 111, hinweise: true } });
    assert.equal((await config.readConfig()).mitteilungen, undefined);
    const an = await gut(einstellungen.aendereEinstellung({ action: "macHinweise", an: true }));
    assert.deepEqual(an.config.mitteilungen, { hinweise: true });
    assert.match(an.message ?? "", /zur Probe/);
    assert.deepEqual(gezeigt(), [], "einschalten allein zeigt noch nichts");
    const aus = await gut(einstellungen.aendereEinstellung({ action: "macHinweise", an: false }));
    assert.deepEqual(aus.config.mitteilungen, { hinweise: false });
    assert.deepEqual((await config.readConfig()).telegram, { token: TOKEN, bot: "jarvis_test_bot", chatId: 111, hinweise: true }, "der Schalter fürs Handy ist ein anderer");
  });

  test("einschalten, während woanders gespeichert wird: beides bleibt", async () => {
    await Promise.all([gut(einstellungen.aendereEinstellung({ action: "macHinweise", an: true })), gut(einstellungen.aendereEinstellung({ action: "name", name: "Ben" }))]);
    const c = await config.readConfig();
    assert.deepEqual([c.name, c.mitteilungen], ["Ben", { hinweise: true }]);
  });

  test("ohne klares Ja oder Nein wird nichts gespeichert", async () => {
    for (const an of [undefined, "ja", 1, null]) await schlecht(einstellungen.aendereEinstellung({ action: "macHinweise", an } as never), /Ungültige Anfrage/);
    assert.deepEqual(await config.readConfig(), { name: "Benedikt" });
  });

  test("die Mitteilung zur Probe: ein fester Satz ohne Inhalte, und die Einstellungen bleiben, wie sie sind", async () => {
    const r = await gut(einstellungen.aendereEinstellung({ action: "macMitteilungProbe" }));
    assert.deepEqual(gezeigt(), [{ titel: "JARVIS", text: "So sieht ein Hinweis von JARVIS aus." }]);
    assert.match(r.message ?? "", /Skripteditor/);
    assert.deepEqual(await config.readConfig(), { name: "Benedikt" });
  });

  test("nimmt der Mac die Probe nicht an oder antwortet er nicht, steht ein fester Satz da, nichts vom Mac", async () => {
    process.env.JARVIS_MAC_MITTEILUNG = "abgelehnt";
    const r = await einstellungen.aendereEinstellung({ action: "macMitteilungProbe" });
    assert.deepEqual(r, { ok: false, error: "Der Mac hat die Mitteilung nicht angenommen." });
    process.env.JARVIS_MAC_MITTEILUNG = "haengt";
    assert.deepEqual(await einstellungen.aendereEinstellung({ action: "macMitteilungProbe" }), { ok: false, error: "Der Mac hat nicht rechtzeitig geantwortet." });
    // Wird osascript von außen beendet, weiß auch niemand, ob die Mitteilung erschienen ist.
    process.env.JARVIS_MAC_MITTEILUNG = "abgeschossen";
    assert.deepEqual(await einstellungen.aendereEinstellung({ action: "macMitteilungProbe" }), { ok: false, error: "Der Mac hat nicht rechtzeitig geantwortet." });
  });

  test("was während der Probe woanders gespeichert wird, steht in der Antwort", async () => {
    process.env.JARVIS_MAC_MITTEILUNG = "langsam";
    const [probe] = await Promise.all([gut(einstellungen.aendereEinstellung({ action: "macMitteilungProbe" })), gut(einstellungen.aendereEinstellung({ action: "name", name: "Ben" }))]);
    assert.equal(probe.config.name, "Ben");
  });

  test("nicht auf einem Mac: einschalten und Probe werden abgelehnt, ausschalten geht", { skip: process.platform === "darwin" && "nur außerhalb von macOS prüfbar" }, async () => {
    await config.writeConfig({ name: "Benedikt", mitteilungen: { hinweise: true } });
    delete process.env.JARVIS_OSASCRIPT;
    await schlecht(einstellungen.aendereEinstellung({ action: "macHinweise", an: true }), /^Mitteilungen gibt es nur auf dem Mac\.$/);
    await schlecht(einstellungen.aendereEinstellung({ action: "macMitteilungProbe" }), /^Mitteilungen gibt es nur auf dem Mac\.$/);
    const aus = await gut(einstellungen.aendereEinstellung({ action: "macHinweise", an: false }));
    assert.deepEqual(aus.config.mitteilungen, { hinweise: false });
  });
});

describe("Einstellungen: eine Stelle zum Speichern", () => {
  const dateien = (ordner: string): string[] => readdirSync(ordner, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? dateien(path.join(ordner, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(ordner, e.name)] : []));

  test("im Programm speichert niemand mehr einen ganzen, vorher gelesenen Stand zurück", () => {
    // writeConfig schreibt, was man ihm gibt, auch einen veralteten Stand. Im Programm benutzt es deshalb nur
    // noch config.ts selbst; alle anderen ändern über aendereConfig.
    const nutzer = dateien("src").filter((d) => /\bwriteConfig\b/.test(readFileSync(d, "utf8")));
    assert.deepEqual(nutzer, [path.join("src", "lib", "server", "config.ts")]);
  });
});
