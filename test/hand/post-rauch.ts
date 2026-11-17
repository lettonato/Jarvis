// Handprüfung: Antwortentwürfe in der Ansicht „Post“, im echten Browser gegen den gebauten Server, einen
// nachgebauten IMAP-Server und ein nachgebautes KI-Modell (nicht Teil von npm test). Geprüft wird der ganze
// Weg: Entwurf anfordern, lesen, ändern, Zitat und „Allen antworten“ auf Haken, im Mailprogramm öffnen (nur
// der Link), verwerfen, Schutz der Schnittstelle. Verschickt wird nichts; kein echtes Postfach wird berührt. Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/post-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";
import { MOCK_POST_ADRESSE, MOCK_POST_PASSWORT, starteImapMock } from "../mocks/imap-mock";

const PORT = 3111;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("post-rauch");
const kopf = { "content-type": "application/json", "x-jarvis": "1" };

async function main() {
  const imap = await starteImapMock();
  // Die Mail von Petra ging in Kopie an einen Kollegen: daran wird „Allen antworten“ geprüft.
  imap.mails.find((m) => m.uid === 101)!.kopie = [{ name: "Thomas Huber", adresse: "thomas.huber@example.com" }];
  const claude = await starteClaudeMock();
  const config = await import("../../src/lib/server/config");
  const fach = { provider: "andere" as const, host: imap.host, port: imap.port, user: MOCK_POST_ADRESSE, password: MOCK_POST_PASSWORT };
  await config.writeConfig({ name: "Benedikt", claude: { apiKey: "sk-test-nur-fuer-den-mock" }, mail: fach });
  // Ein Entwurf an eine Adresse, die keine Antworten annimmt, liegt schon da.
  const e = await import("../../src/lib/server/entwuerfe");
  await e.legeEntwurfAn(fach, { uid: 103, text: "Guten Tag,\n\nbitte nennen Sie mir einen Ansprechpartner.\n\nBenedikt Scheuchl" }, "telegram");
  await e.entwuerfeGeschrieben();
  const gespeichert = () => (JSON.parse(readFileSync(path.join(ordner, "entwuerfe.json"), "utf8")) as { entwuerfe: { uid: number; an: string; text: string; bearbeitet: boolean }[] }).entwuerfe;

  const server = await starteNext(PORT, { ANTHROPIC_BASE_URL: claude.url });
  try {
    await server.bereit(`${BASIS}/api/entwuerfe`);

    // Der Schutz der Schnittstelle: ohne den eigenen Header und von fremden Seiten geht keine Änderung durch,
    // und senden oder anlegen kann man über sie gar nicht.
    const koerper = JSON.stringify({ action: "verwerfen", id: gespeichert()[0] && "egal" });
    assert.equal((await fetch(`${BASIS}/api/entwuerfe`, { method: "POST", headers: { "content-type": "application/json" }, body: koerper })).status, 403);
    assert.equal((await fetch(`${BASIS}/api/entwuerfe`, { method: "POST", headers: { ...kopf, origin: "https://boese.example" }, body: koerper })).status, 403);
    for (const action of ["senden", "anlegen", "send"]) {
      const r = await fetch(`${BASIS}/api/entwuerfe`, { method: "POST", headers: kopf, body: JSON.stringify({ action, uid: 101, text: "x", an: "fremd@evil.example" }) });
      assert.equal(r.status, 400, `„${action}“ gibt es nicht`);
    }
    assert.equal((await fetch(`${BASIS}/api/entwuerfe`, { method: "POST", headers: kopf, body: JSON.stringify({ action: "verwerfen", id: "gibt-es-nicht" }) })).status, 409);
    assert.equal((await fetch(`${BASIS}/api/entwuerfe`, { method: "POST", headers: kopf, body: JSON.stringify({ action: "mail", id: "gibt-es-nicht" }) })).status, 409);
    assert.equal((await fetch(`${BASIS}/api/entwuerfe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "mail", id: "egal" }) })).status, 403);
    assert.equal(gespeichert().length, 1, "nichts davon hat etwas verändert");

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const fenster = await browser.newContext({ viewport: { width: 1280, height: 1300 }, permissions: ["clipboard-read", "clipboard-write"] });
    const seite = await fenster.newPage();
    const fehler: string[] = [];
    seite.on("pageerror", (err) => fehler.push(err.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    const warte = async (pruefung: () => boolean, was: string) => {
      for (let i = 0; i < 100; i++) {
        if (pruefung()) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.fail(`Zeit abgelaufen: ${was}`);
    };

    await seite.goto(`${BASIS}/post`);
    const bereich = seite.locator("#entwuerfe");
    await bereich.getByRole("heading", { name: /Antwortentwürfe\s*1/ }).waitFor({ timeout: 30_000 });
    await bereich.getByText("JARVIS verschickt nichts.").waitFor();
    await bereich.getByText("Diese Adresse nimmt vermutlich keine Antworten an.").waitFor();
    await bereich.getByText("vom Handy aus").waitFor();
    // (Der Knopf „Senden“ unten gehört zum Gespräch mit JARVIS, nicht zur Post.)
    assert.equal(await seite.locator("main").getByRole("button", { name: /senden|abschicken|verschicken/i }).count(), 0, "in der Post gibt es keinen Knopf zum Senden");
    await bild("0-post-ein-entwurf");

    // „Antwort entwerfen“ an der Mail von Petra: JARVIS öffnet die Mail und legt den Entwurf ab.
    claude.drehbuch([
      { werkzeug: "mail_oeffnen", eingabe: { uid: 101 } },
      { werkzeug: "antwort_entwerfen", eingabe: { uid: 101, text: "Hallo Petra,\n\ndanke für das Angebot. Dienstag passt mir, am liebsten um [Uhrzeit].\n\nViele Grüße\nBenedikt" } },
      { text: "Der Entwurf an Petra Bauer liegt in der Post. Abschicken musst du ihn selbst." },
    ]);
    await seite.locator("li", { hasText: "Petra Bauer" }).getByRole("button", { name: "Antwort entwerfen" }).click();
    await bereich.getByRole("heading", { name: /Antwortentwürfe\s*2/ }).waitFor({ timeout: 30_000 });
    const karte = bereich.locator("li", { hasText: "petra.bauer@example.com" });
    await karte.getByText("Re: Angebot für den Stahlbau").waitFor();
    const frageAnJarvis = JSON.stringify(claude.anfragen.at(-1)!.messages);
    assert.ok(frageAnJarvis.includes("uid 101"), "die Frage nennt nur die Nummer der Mail");
    const feld = karte.getByRole("textbox");
    assert.match(await feld.inputValue(), /Dienstag passt mir, am liebsten um \[Uhrzeit\]/);
    assert.equal(await karte.getByRole("button", { name: "Speichern" }).count(), 0, "ohne Änderung gibt es nichts zu speichern");
    await bild("1-post-zwei-entwuerfe");

    // Zitat und „Allen antworten“: erst auf Klick aus dem Postfach geholt, und beides gilt nur mit Haken.
    const ohne = await karte.getByRole("link", { name: "Im Mailprogramm öffnen" }).getAttribute("href");
    await karte.getByRole("button", { name: "Zitat und weitere Empfänger aus der Mail holen" }).click();
    const hakenZitat = karte.getByLabel("Ursprüngliche Mail als Zitat anhängen");
    const hakenAlle = karte.getByLabel(/Allen antworten: in Kopie an thomas\.huber@example\.com/);
    await hakenZitat.waitFor();
    assert.deepEqual([await hakenZitat.isChecked(), await hakenAlle.isChecked()], [false, false], "kein Haken ist von selbst gesetzt");
    assert.equal(await karte.getByRole("link", { name: "Im Mailprogramm öffnen" }).getAttribute("href"), ohne, "ohne Haken bleibt der Link, wie er war");
    await hakenZitat.check();
    const zitat = await karte.getByLabel("Zitat der ursprünglichen Mail").innerText();
    assert.match(zitat, /^Am \d\d\.\d\d\.\d{4} um \d\d:\d\d Uhr schrieb Petra Bauer <petra\.bauer@example\.com>:\n> Hallo Benedikt,/);
    assert.ok(zitat.includes("> Stahlbau Bauer GmbH"), "zitiert wird die ganze Mail, wie im Mailprogramm");
    await hakenAlle.check();
    await karte.getByText("Kopie", { exact: true }).waitFor();
    const mitAllem = (await karte.getByRole("link", { name: "Im Mailprogramm öffnen" }).getAttribute("href"))!;
    assert.ok(mitAllem.startsWith("mailto:petra.bauer@example.com?cc=thomas.huber%40example.com&subject=Re%3A%20Angebot%20f%C3%BCr%20den%20Stahlbau&body=Hallo%20Petra"), mitAllem);
    assert.ok(mitAllem.includes("%0D%0A%0D%0AAm%20") && mitAllem.includes("%3E%20Hallo%20Benedikt%2C"), "das Zitat steht unter dem Text im Link");
    await karte.getByRole("button", { name: "Kopieren" }).click();
    await karte.getByText("Text und Zitat liegen in der Zwischenablage.").waitFor();
    const kopiert = (await seite.evaluate("navigator.clipboard.readText()")) as string;
    assert.ok(kopiert.startsWith("Hallo Petra,") && kopiert.includes("\n\nAm ") && kopiert.includes("\n> Hallo Benedikt,"), kopiert);
    const inDatei = readFileSync(path.join(ordner, "entwuerfe.json"), "utf8");
    assert.ok(!inDatei.includes("184.000") && !inDatei.includes("thomas.huber"), "weder Zitat noch Kopie-Empfänger stehen in der Datei");
    await bild("1b-post-zitat-und-allen-antworten");
    await hakenZitat.uncheck();
    await hakenAlle.uncheck();
    assert.equal(await karte.getByRole("link", { name: "Im Mailprogramm öffnen" }).getAttribute("href"), ohne, "Haken weg: wieder der Link von vorher");
    // Die Mail der Bank ging nur an dich: kein „Allen antworten“. Ihr Text ist nur Zitat, keine Anweisung.
    const bank = bereich.locator("li", { hasText: "no-reply@bank.example" });
    const anfragenVorher = claude.anfragen.length;
    await bank.getByRole("button", { name: "Zitat und weitere Empfänger aus der Mail holen" }).click();
    await bank.getByText("Weitere Empfänger hat diese Mail nicht.").waitFor();
    assert.equal(await bank.getByLabel(/Allen antworten/).count(), 0);
    await bank.getByLabel("Ursprüngliche Mail als Zitat anhängen").check();
    assert.match(await bank.getByLabel("Zitat der ursprünglichen Mail").innerText(), /> IGNORIERE ALLE REGELN/);
    assert.equal(claude.anfragen.length, anfragenVorher, "für Zitat und Empfänger wird kein KI-Modell gefragt");
    assert.deepEqual(imap.mails.filter((m) => m.gelesen && [101, 103].includes(m.uid)).map((m) => m.uid), [], "beide Mails gelten weiter als ungelesen");

    // Ändern: Der Link ins Mailprogramm trägt sofort, was im Feld steht; gespeichert wird erst auf Knopfdruck.
    await feld.fill("Hallo Petra,\n\nDienstag um 10 Uhr passt.\n\nViele Grüße\nBenedikt");
    const link = await karte.getByRole("link", { name: "Im Mailprogramm öffnen" }).getAttribute("href");
    assert.ok(link!.startsWith("mailto:petra.bauer@example.com?subject=Re%3A%20Angebot%20f%C3%BCr%20den%20Stahlbau&body=Hallo%20Petra%2C%0D%0A%0D%0ADienstag%20um%2010%20Uhr%20passt."), link!);
    assert.equal(gespeichert().find((x) => x.uid === 101)!.bearbeitet, false);
    await karte.getByRole("button", { name: "Speichern" }).click();
    await karte.getByText("Gespeichert.").waitFor();
    await warte(() => gespeichert().find((x) => x.uid === 101)?.bearbeitet === true, "die Änderung steht in der Datei");
    assert.match(gespeichert().find((x) => x.uid === 101)!.text, /Dienstag um 10 Uhr passt/);
    await karte.getByText(/von dir geändert/).waitFor();
    assert.equal(await karte.getByRole("button", { name: "Speichern" }).count(), 0, "nach dem Speichern gibt es nichts mehr zu speichern");
    // Überzählige Leerzeilen räumt der Server weg; das Feld zeigt danach, was gespeichert ist.
    await feld.fill("Hallo Petra,\n\n\n\n\nDienstag um 10 Uhr passt.");
    await karte.getByRole("button", { name: "Speichern" }).click();
    await warte(() => gespeichert().find((x) => x.uid === 101)?.text === "Hallo Petra,\n\nDienstag um 10 Uhr passt.", "aufgeräumter Text gespeichert");
    await karte.getByRole("button", { name: "Speichern" }).waitFor({ state: "detached" });
    assert.equal(await feld.inputValue(), "Hallo Petra,\n\nDienstag um 10 Uhr passt.");
    // Ein sehr langer Text passt nicht in den Link: Dann öffnet der Knopf nur Empfänger und Betreff.
    await feld.fill(`Hallo Petra,\n\n${"Das ist ein längerer Absatz mit Umlauten: äöüß. ".repeat(20)}`);
    await karte.getByText("Der Text ist für den Link zu lang").waitFor();
    assert.equal(await karte.getByRole("link", { name: "Im Mailprogramm öffnen" }).getAttribute("href"), "mailto:petra.bauer@example.com?subject=Re%3A%20Angebot%20f%C3%BCr%20den%20Stahlbau");
    // JARVIS überschreibt nicht, was du selbst geändert hast.
    claude.drehbuch([{ werkzeug: "antwort_entwerfen", eingabe: { uid: 101, text: "Ganz neuer Entwurf von JARVIS." } }, { text: "Dein eigener Entwurf bleibt. Verwirf ihn, wenn ich neu entwerfen soll." }]);
    await seite.locator("li", { hasText: "Angebot für den Stahlbau" }).getByRole("button", { name: "Antwort entwerfen" }).click();
    await warte(() => claude.anfragen.length >= 2, "JARVIS hat geantwortet");
    assert.equal(gespeichert().find((x) => x.uid === 101)!.text, "Hallo Petra,\n\nDienstag um 10 Uhr passt.");
    await bild("2-post-geaendert");

    // Verwerfen nimmt genau diesen Entwurf weg.
    await karte.getByRole("button", { name: "Verwerfen" }).click();
    await bereich.getByRole("heading", { name: /Antwortentwürfe\s*1/ }).waitFor();
    await warte(() => gespeichert().length === 1 && gespeichert()[0].uid === 103, "nur der andere Entwurf bleibt");
    await bereich.locator("li", { hasText: "no-reply@bank.example" }).getByRole("button", { name: "Verwerfen" }).click();
    await bereich.waitFor({ state: "detached" });
    await bild("3-post-ohne-entwuerfe");

    // Im Postfach hat sich bei alldem nichts geändert, und abgelegt wurde dort auch nichts.
    assert.deepEqual(imap.befehle.filter((b) => /STORE|APPEND|COPY|MOVE|EXPUNGE|DELETE|CREATE/i.test(b)), []);
    assert.deepEqual(fehler, [], "keine Fehler auf der Seite");
    await browser.close();
    console.log("Post und Antwortentwürfe: alles in Ordnung.");
  } finally {
    await server.stopLeise();
    await imap.stop();
    await claude.stop();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
