// Handprüfung: Einstellungen speichern im echten Browser gegen den gebauten Server (nicht Teil von npm test).
// Geprüft wird die ganze Strecke Seite → Schnittstelle → Datei: Speichern über die Seite, abgelehnte Eingaben,
// fremde Seiten, und vor allem, dass viele Änderungen zur selben Zeit sich nicht gegenseitig überschreiben, auch
// wenn eine davon erst einen Schlüssel beim Anbieter prüft. Claude und Telegram sind nachgebaut; es geht nichts
// an echte Dienste. Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/einstellungen-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";
import { starteTelegramMock } from "../mocks/telegram-mock";

const PORT = 3114;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("einstellungen-rauch");
const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Sehen aus wie echte Schlüssel, sind aber keine. Zusammengesetzt, damit gitleaks sie nicht meldet.
const CLAUDE = ["sk-ant-api03", "test", "nur", "fuer", "die", "handpruefung"].join("-");
const TOKEN = ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":");

type Datei = { name: string; approval?: { limitUsd: number | null }; claude?: { apiKey: string }; telegram?: { token: string; bot: string; chatId?: number; trades?: boolean; hinweise?: boolean; briefing?: string | null }; intel?: { topics?: string[]; auto?: boolean }; metalle?: { auto?: boolean; zeiten?: string[] } };
const gespeichert = () => JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as Datei;
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

async function main() {
  const claude = await starteClaudeMock();
  const tg = await starteTelegramMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt" });

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, PORT: String(PORT), ANTHROPIC_BASE_URL: claude.url, TELEGRAM_API_URL: tg.url, JARVIS_TELEGRAM_POLL_S: "1" }, stdio: "ignore", detached: true });
  const stop = () => {
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {}
  };
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const sende = (pfad: string, body: object, mehr: Record<string, string> = {}) => fetch(`${BASIS}${pfad}`, { method: "POST", headers: { ...kopf, ...mehr }, body: JSON.stringify(body) });
  const stelle = async (body: object) => {
    const r = await sende("/api/einstellungen", body);
    return { status: r.status, daten: (await r.json()) as { error?: string; message?: string; name?: string } };
  };
  try {
    for (let i = 0; ; i++) {
      if (await fetch(`${BASIS}/api/einstellungen`).then((r) => r.ok, () => false)) break;
      if (i > 120) throw new Error("Der Server ist nicht gestartet.");
      await warte(500);
    }

    // 1. Fremde Seiten und Anfragen ohne den JARVIS-Kopf dürfen nichts ändern.
    assert.equal((await fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: { "content-type": "application/json" }, body: '{"action":"name","name":"Fremd"}' })).status, 403);
    assert.equal((await sende("/api/einstellungen", { action: "name", name: "Fremd" }, { origin: "https://boese.example" })).status, 403);
    assert.equal(gespeichert().name, "Benedikt");
    schritt("fremde Seiten und Anfragen ohne JARVIS-Kopf werden abgewiesen, nichts geändert");

    // 2. Abgelehnte Eingaben: klare Meldung, Status 400, nichts gespeichert.
    for (const [body, satz] of [
      [{ action: "name", name: "  " }, /Bitte einen Namen/],
      [{ action: "approval", limitUsd: 7 }, /Diese Grenze gibt es nicht/],
      [{ action: "claude", apiKey: "kein-schluessel" }, /beginnt mit sk-ant-/],
      [{ action: "mail" }, /E-Mail-Adresse eintragen/],
      [{ action: "telegramPrefs", trades: false }, /zuerst den Bot-Schlüssel/],
      [{ action: "gibtEsNicht" }, /Unbekannte Aktion/],
    ] as const) {
      const r = await stelle(body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.match(r.daten.error ?? "", satz);
    }
    assert.deepEqual(gespeichert(), { name: "Benedikt" });
    schritt("sechs abgelehnte Eingaben: je eine klare Meldung, nichts gespeichert");

    // 3. Über die Seite: Namen ändern und die Rückfrage-Grenze wählen.
    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    await seite.goto(`${BASIS}/einstellungen`);
    const feld = seite.locator("#jarvis-name");
    await feld.waitFor();
    await feld.fill("Ben");
    await feld.locator("xpath=ancestor::form").getByRole("button", { name: "Speichern" }).click();
    await feld.locator("xpath=ancestor::form").getByText("Gespeichert.").waitFor();
    assert.equal(gespeichert().name, "Ben");
    const grenze = seite.getByRole("radiogroup", { name: "Rückfrage ab" });
    await grenze.getByRole("radio", { name: "Ab 250 $" }).click();
    await grenze.locator('[role="radio"][aria-checked="true"]', { hasText: "Ab 250 $" }).waitFor();
    assert.deepEqual(gespeichert().approval, { limitUsd: 250 });
    assert.equal(gespeichert().name, "Ben");
    schritt("über die Seite: Name „Ben“ und Rückfrage „Ab 250 $“ gespeichert und angezeigt");

    // 4. Sechs Änderungen zur selben Zeit, aus der Seite heraus abgeschickt. Zwei davon prüfen erst einen
    //    Schlüssel beim (nachgebauten) Anbieter, der sich dafür Zeit lässt.
    tg.warte.getMe = 400;
    // (Als Text übergeben: tsx hängt an benannte Funktionen einen Helfer, den es in der Seite nicht gibt.)
    const aenderungen: [string, object][] = [
      ["/api/einstellungen", { action: "telegram", token: TOKEN }],
      ["/api/einstellungen", { action: "claude", apiKey: CLAUDE }],
      ["/api/einstellungen", { action: "name", name: "Benedikt S." }],
      ["/api/einstellungen", { action: "approval", limitUsd: 100 }],
      ["/api/intel", { action: "einstellungen", topics: ["Halbleiter"], auto: false }],
      ["/api/metalle", { action: "einstellungen", auto: false, zeiten: ["07:30", "16:00"] }],
    ];
    const antworten = (await seite.evaluate(
      `Promise.all(${JSON.stringify(aenderungen)}.map(([pfad, body]) => fetch(pfad, { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1" }, body: JSON.stringify(body) }).then((r) => r.status)))`,
    )) as number[];
    console.log(`  Antworten der sechs gleichzeitigen Änderungen: ${antworten.join(", ")}`);
    const nach = gespeichert();
    assert.deepEqual(antworten.slice(0, 4), [200, 200, 200, 200]);
    assert.equal(nach.telegram?.token, TOKEN);
    assert.equal(nach.telegram?.bot, "jarvis_test_bot");
    assert.equal(nach.claude?.apiKey, CLAUDE);
    assert.equal(nach.name, "Benedikt S.");
    assert.deepEqual(nach.approval, { limitUsd: 100 });
    schritt("gleichzeitig: Bot-Schlüssel (langsam geprüft), Claude-Schlüssel, Name und Grenze stehen alle in der Datei");
    assert.deepEqual(antworten.slice(4), [200, 200]);
    assert.deepEqual(nach.intel, { topics: ["Halbleiter"], auto: false });
    assert.deepEqual(nach.metalle, { auto: false, zeiten: ["07:30", "16:00"] });
    schritt("im selben Augenblick auch Lagebild (Thema, Zeitplan aus) und Edelmetalle (Uhrzeiten): stehen ebenfalls in der Datei");

    // 5. Das Handy koppelt sich wirklich (Code aus den Einstellungen, geschickt über das nachgebaute Telegram),
    //    und solange das läuft, werden immer wieder Schalter umgelegt. Am Ende steht beides in der Datei.
    const status = (await (await fetch(`${BASIS}/api/einstellungen`)).json()) as { telegram?: { code?: string | null } };
    const code = status.telegram?.code;
    assert.match(code ?? "", /^[A-HJ-NP-Z2-9]{8}$/, "die Einstellungen zeigen einen Code zum Koppeln");
    tg.nachricht(111, code!, { name: "Benedikt" });
    let umgelegt = 0;
    for (const ende = Date.now() + 30_000; gespeichert().telegram?.chatId !== 111; umgelegt++) {
      if (Date.now() > ende) throw new Error("Zeit abgelaufen: Das Handy hat sich nicht gekoppelt.");
      assert.equal((await stelle({ action: "telegramPrefs", trades: umgelegt % 2 === 0, hinweise: true, briefing: "06:45" })).status, 200);
    }
    assert.equal((await stelle({ action: "telegramPrefs", trades: false })).status, 200);
    const t = gespeichert().telegram;
    assert.deepEqual([t?.chatId, t?.trades, t?.hinweise, t?.briefing], [111, false, true, "06:45"]);
    schritt(`Handy über den Code gekoppelt, währenddessen ${umgelegt}-mal Schalter umgelegt: Kopplung und Schalter stehen in der Datei`);

    // 6. Handy trennen: Die Abschiedsnachricht dauert, in der Zeit wird der Name geändert. Die Schalter bleiben.
    tg.warte.sendMessage = 400;
    const [trennen, name] = await Promise.all([stelle({ action: "telegramUnpair" }), warte(100).then(() => stelle({ action: "name", name: "Benedikt" }))]);
    assert.deepEqual([trennen.status, name.status], [200, 200]);
    const danach = gespeichert();
    assert.equal(danach.name, "Benedikt");
    assert.deepEqual([danach.telegram?.chatId, danach.telegram?.trades, danach.telegram?.hinweise, danach.telegram?.briefing], [undefined, false, true, "06:45"]);
    assert.ok(tg.texteAn(111).some((text) => /getrennt/.test(text)), "die Abschiedsnachricht ging an das Handy");
    schritt("Handy getrennt, während der Name geändert wurde: Name bleibt, Schalter bleiben (auch „Hinweise am Tag“)");

    // 7. Die Seite zeigt nach neuem Laden den Stand der Datei; kein Schlüssel steht im Seitentext.
    await seite.reload();
    await seite.locator("#jarvis-name").waitFor();
    assert.equal(await seite.locator("#jarvis-name").inputValue(), "Benedikt");
    await seite.getByRole("radiogroup", { name: "Rückfrage ab" }).locator('[role="radio"][aria-checked="true"]', { hasText: "Ab 100 $" }).waitFor();
    const text = await seite.locator("body").innerText();
    assert.ok(!text.includes(CLAUDE) && !text.includes(TOKEN), "kein Schlüssel im Seitentext");
    const antwort = await (await fetch(`${BASIS}/api/einstellungen`)).text();
    assert.ok(!antwort.includes(CLAUDE) && !antwort.includes(TOKEN), "kein Schlüssel in der Antwort der Schnittstelle");
    if (bilder) {
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, "einstellungen.png"), fullPage: true });
    }
    schritt("nach neuem Laden zeigt die Seite den gespeicherten Stand; kein Schlüssel im Seitentext oder in der Antwort");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    assert.deepEqual(readdirSync(ordner).filter((n) => n.endsWith(".tmp")), [], "keine Nebendatei bleibt liegen");
    schritt("keine Fehler in der Seite, keine liegen gebliebene Nebendatei");
    await browser.close();
    console.log("Handprüfung Einstellungen: alle Schritte in Ordnung.");
  } finally {
    stop();
    await claude.stop();
    await tg.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
