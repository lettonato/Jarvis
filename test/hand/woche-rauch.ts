// Handprüfung: der Wochenbericht, im echten Browser gegen den gebauten Server, einen Testordner als Tresor und einen
// nachgebauten Telegram-Server (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/woche-rauch.ts [Ordner für Bilder]
//
// Geprüft wird der Weg von der Einstellung bis aufs Handy: aus, bis man ihn einschaltet; Wochentag und Uhrzeit; der
// Zuruf am Mac; /woche am Handy; und dass er zur eingestellten Zeit von selbst kommt, genau einmal, auch nach einem
// Neustart. Die Regeln selbst (was drinsteht und was nicht) prüft test/regeln/woche.test.ts.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { mittagsZone } from "../helfer/uhrzeiten";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteTelegramMock } from "../mocks/telegram-mock";

// Was „diese Woche“ und „überfällig“ ist, hängt am Tag: Die Prüfung gibt sich, dem Server und dem Browser eine
// Zeitzone, in der es gerade Mittag ist. So liegt „vor zwei Minuten“ nie am Tag davor.
const ZONE = mittagsZone();
process.env.TZ = ZONE;

const PORT = 3133;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("woche-rauch");
const vault = testOrdner("woche-rauch-tresor");
// Sieht aus wie ein Bot-Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const TOKEN = ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":");
const ICH = 111;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

type Plan = { tag: number; zeit: string };
const gespeichert = () => (JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as { telegram: { woche?: Plan | null; abschluss?: string | null } }).telegram;
async function warte(bedingung: () => boolean | Promise<boolean>, was: string, ms = 20_000) {
  for (const ende = Date.now() + ms; !(await bedingung()); ) {
    if (Date.now() > ende) throw new Error(`Zeit abgelaufen: ${was}`);
    await pause(100);
  }
}

const zwei = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
const tage = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const TAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

async function main() {
  const tg = await starteTelegramMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", vaultPath: vault, telegram: { token: TOKEN, bot: "jarvis_test_bot", chatId: ICH, chatName: "Benedikt", briefing: null, reminders: false } });

  // Der Tresor: zwei heute erledigt, eine am Sonntag vor dieser Woche (immer Vorwoche), eine seit drei Tagen
  // überfällig, eine in zwei Tagen fällig, dazu Zeilen, die nicht zählen dürfen.
  const heute = new Date();
  const wochentag = ((heute.getDay() + 6) % 7) + 1;
  const letzterSonntag = tage(-wochentag);
  writeFileSync(
    path.join(vault, "Aufgaben.md"),
    [
      `- [x] Angebot Müller verschickt ✅ ${iso(heute)}`,
      `- [x] Statik freigegeben ✅ ${iso(heute)}`,
      `- [x] Sonntags aufgeräumt ✅ ${iso(letzterSonntag)}`,
      "- [x] Ohne Datum abgehakt",
      `- [x] Vor einem Monat ✅ ${iso(tage(-30))}`,
      `- [ ] Steuer 📅 ${iso(tage(-3))}`,
      `- [ ] Angebot nachfassen 📅 ${iso(tage(2))}`,
      `- [ ] Weit weg 📅 ${iso(tage(20))}`,
    ].join("\n"),
  );
  const SATZ = "Deine Woche, Benedikt. Du hast 2 Aufgaben erledigt, in der Vorwoche war es eine. Eine ist überfällig. Eine Aufgabe wird fällig.";

  const umgebung = { TZ: ZONE, TELEGRAM_API_URL: tg.url, JARVIS_TELEGRAM_POLL_S: "1" };
  let server = await starteNext(PORT, umgebung);
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const stelle = (body: unknown) => fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: kopf, body: JSON.stringify(body) });
  const berichte = () => tg.texteAn(ICH).filter((t) => t.startsWith("Deine Woche"));
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);
    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const rahmen = await browser.newContext({ viewport: { width: 1280, height: 1300 }, locale: "de-DE", timezoneId: ZONE });
    const seite = await rahmen.newPage();
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`) });
    };
    const zeile = seite.locator("#handy [data-wochenbericht]");
    const haken = zeile.getByRole("checkbox");
    const tagFeld = seite.getByLabel("Wochentag für den Wochenbericht");
    const zeitFeld = seite.getByLabel("Uhrzeit für den Wochenbericht");
    const imZeitplan = seite.locator("#zeitplan li[data-aufgabe=woche]");
    const zumZeitplan = async () => {
      const ziel = `${BASIS}/agenten#zeitplan`;
      if (seite.url() === ziel) await seite.reload();
      else await seite.goto(ziel);
      await imZeitplan.waitFor({ timeout: 30_000 });
    };
    const zuEinstellungen = async () => {
      const ziel = `${BASIS}/einstellungen#handy`;
      if (seite.url() === ziel) await seite.reload();
      else await seite.goto(ziel);
      await zeile.waitFor({ timeout: 30_000 });
    };

    // ---------- 1. Ab Werk aus ----------
    await zuEinstellungen();
    assert.equal(await haken.isChecked(), false, "Voreinstellung: kein Wochenbericht");
    assert.equal(await tagFeld.inputValue(), "5", "vorgeschlagen ist der Freitag");
    assert.equal(await zeitFeld.inputValue(), "16:00");
    assert.match(await zeile.innerText(), /Wochenbericht jeden/);
    assert.equal(gespeichert().woche, undefined);
    await zumZeitplan();
    assert.match(await imZeitplan.innerText(), /Wochenbericht\s+ausgeschaltet/);
    assert.match(await imZeitplan.innerText(), /Ausgeschaltet\./);
    assert.deepEqual(berichte(), []);
    schritt("ab Werk aus: kein Haken, vorgeschlagen Freitag 16:00, im Zeitplan „ausgeschaltet“, nichts ging hinaus");

    // ---------- 2. Einschalten, Wochentag und Uhrzeit ändern ----------
    await zuEinstellungen();
    await haken.click();
    await warte(() => gespeichert().woche?.tag === 5 && gespeichert().woche?.zeit === "16:00", "Freitag 16:00 gespeichert");
    await seite.locator("input:checked").and(haken).waitFor();
    await tagFeld.selectOption("7");
    await warte(() => gespeichert().woche?.tag === 7, "der Wochentag wird sofort gespeichert");
    await zeitFeld.fill("19:30");
    await zeitFeld.blur();
    await warte(() => gespeichert().woche?.zeit === "19:30", "die Uhrzeit wird beim Verlassen des Feldes gespeichert");
    assert.deepEqual(gespeichert().woche, { tag: 7, zeit: "19:30" });
    // Ein geleertes Uhrzeitfeld geht nie hinaus: Der Wochentag lässt sich trotzdem ändern, die Uhrzeit bleibt.
    await zeitFeld.fill("");
    await zeitFeld.blur();
    await tagFeld.selectOption("6");
    await warte(() => gespeichert().woche?.tag === 6, "Wochentag gespeichert, obwohl das Uhrzeitfeld leer war");
    assert.deepEqual(gespeichert().woche, { tag: 6, zeit: "19:30" });
    assert.equal(await zeitFeld.inputValue(), "19:30", "das Feld zeigt wieder die gespeicherte Uhrzeit");
    await tagFeld.selectOption("7");
    await warte(() => gespeichert().woche?.tag === 7, "zurück auf Sonntag");
    await bild("1-eingeschaltet");
    await zumZeitplan();
    assert.match(await imZeitplan.innerText(), /sonntags um 19:30 Uhr, per Telegram/);
    assert.match(await imZeitplan.innerText(), /noch nie/);
    // Eine unsinnige Angabe nimmt die Schnittstelle nicht an.
    for (const falsch of [{ tag: 8, zeit: "16:00" }, { tag: 5, zeit: "25:00" }, "freitags"]) assert.equal((await stelle({ action: "telegramPrefs", woche: falsch })).status, 400, JSON.stringify(falsch));
    assert.deepEqual(gespeichert().woche, { tag: 7, zeit: "19:30" });
    schritt("eingeschaltet: Freitag 16:00 gespeichert; Wochentag sofort, Uhrzeit beim Verlassen; ein leeres Uhrzeitfeld geht nicht hinaus; der Zeitplan zeigt „sonntags um 19:30 Uhr“; Unsinn lehnt die Schnittstelle ab");

    // ---------- 3. Auf Zuruf am Mac ----------
    const feld = seite.getByLabel("Nachricht an JARVIS");
    const antwort = async (text: string) => {
      await feld.fill(text);
      await feld.press("Enter");
      await seite.getByText(SATZ, { exact: true }).first().waitFor({ timeout: 20_000 });
    };
    await antwort("Wochenbericht");
    await seite.waitForURL(`${BASIS}/heute`);
    await bild("2-zuruf");
    await seite.goto(`${BASIS}/aufgaben`);
    await feld.waitFor();
    await antwort("Wie war meine Woche?");
    await seite.waitForURL(`${BASIS}/heute`);
    assert.deepEqual(berichte(), [], "der Zuruf am Mac schickt nichts aufs Handy");
    schritt("„Wochenbericht“ und „Wie war meine Woche?“: zwei erledigt, in der Vorwoche eine, eine überfällig, eine wird fällig; der Raum „Heute“ geht auf; aufs Handy geht dabei nichts");

    // ---------- 4. /woche am Handy ----------
    tg.nachricht(ICH, "/woche", { name: "Benedikt" });
    await warte(() => berichte().length === 1, "Antwort auf /woche");
    const amHandy = berichte()[0];
    assert.match(amHandy, /^Deine Woche, Benedikt \(/);
    assert.match(amHandy, /Erledigt: 2 Aufgaben \(Vorwoche: 1\)\.\n• (Angebot Müller verschickt\n• Statik freigegeben|Statik freigegeben\n• Angebot Müller verschickt)/);
    assert.match(amHandy, /Liegt noch: Eine Aufgabe ist überfällig\.\n• Steuer \(seit 3 Tagen überfällig\)/);
    assert.match(amHandy, /Fällig in den nächsten sieben Tagen:\n• [^\n]*: Angebot nachfassen/);
    for (const fremd of ["Ohne Datum", "Vor einem Monat", "Sonntags", "Weit weg"]) assert.ok(!amHandy.includes(fremd), fremd);
    schritt("/woche am Handy: die Erledigten beim Namen, das Überfällige mit seinem Alter, das Kommende mit seinem Tag; was nicht zählt, steht nicht da");

    // ---------- 5. Von selbst zur eingestellten Zeit, genau einmal ----------
    tg.leeren();
    await zuEinstellungen();
    const vorhin = new Date(Date.now() - 2 * 60_000);
    const jetztZeit = `${zwei(vorhin.getHours())}:${zwei(vorhin.getMinutes())}`;
    await tagFeld.selectOption(String(wochentag));
    await warte(() => gespeichert().woche?.tag === wochentag, "heutiger Wochentag gespeichert");
    await zeitFeld.fill(jetztZeit);
    await zeitFeld.blur();
    await warte(() => gespeichert().woche?.zeit === jetztZeit, "Uhrzeit von vor zwei Minuten gespeichert");
    // Der Taktgeber sieht jede Minute nach.
    await warte(() => berichte().length === 1, "der Wochenbericht kommt von selbst", 90_000);
    assert.equal(berichte()[0], amHandy, "derselbe Bericht wie auf /woche");
    await zumZeitplan();
    assert.match(await imZeitplan.innerText(), new RegExp(`${TAGE[wochentag - 1].toLowerCase()}s um ${jetztZeit} Uhr, per Telegram`));
    assert.match(await imZeitplan.innerText(), /Zuletzt nach Plan\s+heute \d\d:\d\d/);
    assert.ok(!/Fehlgeschlagen/.test(await imZeitplan.innerText()));
    await bild("3-zeitplan-gelaufen");
    // JARVIS merkt sich den Bericht selbst (telegram.json), nicht nur der Zeitplan seinen letzten Lauf: Der schützt
    // nur ein paar Minuten vor einem zweiten Versuch, das Fenster zum Nachholen ist drei Stunden lang.
    await warte(() => (JSON.parse(readFileSync(path.join(ordner, "telegram.json"), "utf8")) as { wocheAm?: string | null }).wocheAm === iso(new Date()), "der Bericht ist für heute als geschickt gemerkt");
    // Nach einem Neustart sieht der Taktgeber nach 20 Sekunden zum ersten Mal nach: kein zweiter Bericht.
    await server.stop();
    server = await starteNext(PORT, umgebung);
    await server.bereit(`${BASIS}/api/einstellungen`);
    await zumZeitplan();
    await pause(26_000);
    assert.equal(berichte().length, 1, "heute kein zweiter Wochenbericht, auch nicht nach einem Neustart");
    await zumZeitplan();
    assert.match(await imZeitplan.innerText(), /Zuletzt nach Plan\s+heute \d\d:\d\d/);
    schritt("zur eingestellten Zeit kommt er von selbst aufs Handy, steht als Lauf im Zeitplan und kommt auch nach einem Neustart kein zweites Mal");

    // ---------- 6. Ausschalten, und es bleibt aus ----------
    await zuEinstellungen();
    assert.equal(await haken.isChecked(), true, "nach dem Neustart noch eingeschaltet");
    assert.equal(await tagFeld.inputValue(), String(wochentag));
    assert.equal(await zeitFeld.inputValue(), jetztZeit);
    await haken.click();
    await warte(() => gespeichert().woche === null, "Wochenbericht aus");
    await zuEinstellungen();
    assert.equal(await haken.isChecked(), false);
    await zumZeitplan();
    assert.match(await imZeitplan.innerText(), /Wochenbericht\s+ausgeschaltet/);
    assert.equal(berichte().length, 1);
    schritt("nach dem Neustart stehen Wochentag und Uhrzeit noch da; ausgeschaltet bleibt aus, auch nach neuem Laden");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    await browser.close();
    console.log("Handprüfung Wochenbericht: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
    // Der Server hält noch eine wartende Anfrage offen; darauf wartet die Prüfung nicht.
    await Promise.race([tg.stop(), new Promise((r) => setTimeout(r, 2000))]);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
