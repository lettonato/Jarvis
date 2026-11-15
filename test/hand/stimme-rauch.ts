// Handprüfung: die ElevenLabs-Stimme im echten Browser gegen den gebauten Server und einen nachgebauten
// ElevenLabs-Dienst (nicht Teil von npm test). Es geht kein Zeichen an das echte ElevenLabs.
// Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/stimme-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung } from "../helfer/umgebung";
import { MOCK_SCHLUESSEL, starteElevenMock } from "../mocks/elevenlabs-mock";

const PORT = 3120;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("stimme-rauch");
const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function bis(was: string, f: () => boolean | Promise<boolean>, ms = 15_000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    if (await f()) return;
    await warte(100);
  }
  throw new Error(`Zeit abgelaufen: ${was}`);
}

async function main() {
  const el = await starteElevenMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt" });
  const gespeichert = () => (JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as { elevenlabs?: { enabled?: boolean; voiceId?: string; tagesZeichen?: number } }).elevenlabs;

  const server = await starteNext(PORT, { ELEVENLABS_BASE_URL: el.url });
  try {
    await server.bereit(`${BASIS}/api/stimme`);
    // Vorlesen nur mit dem JARVIS-Kopf und nicht von fremden Seiten.
    const kopf = { "content-type": "application/json" };
    assert.equal((await fetch(`${BASIS}/api/stimme`, { method: "POST", headers: kopf, body: '{"text":"Hallo."}' })).status, 403);
    assert.equal((await fetch(`${BASIS}/api/stimme`, { method: "POST", headers: { ...kopf, "x-jarvis": "1", origin: "https://boese.example" }, body: '{"text":"Hallo."}' })).status, 403);
    // Ohne Schlüssel: klare Absage, nichts geht hinaus.
    const ohne = await fetch(`${BASIS}/api/stimme`, { method: "POST", headers: { ...kopf, "x-jarvis": "1" }, body: '{"text":"Hallo."}' });
    assert.equal(ohne.status, 409);
    assert.equal(el.anfragen.length, 0);

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1500 } });
    // Zählt mit, wie viele Clips der Browser wirklich bis zum Ende abgespielt hat.
    await seite.addInitScript(() => {
      const w = window as unknown as { __gespielt: number; Audio: typeof Audio };
      w.__gespielt = 0;
      const Echt = w.Audio;
      w.Audio = function (...args: ConstructorParameters<typeof Audio>) {
        const a = new Echt(...args);
        a.addEventListener("ended", () => {
          if (a.currentSrc.startsWith("blob:")) w.__gespielt++;
        });
        return a;
      } as unknown as typeof Audio;
    });
    const gespielt = () => seite.evaluate(() => (window as unknown as { __gespielt: number }).__gespielt);
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.locator("#stimme").screenshot({ path: path.join(bilder, `${name}.png`) });
    };
    const bereich = seite.locator("#stimme");

    // 1. Schlüssel eintragen: erst ein falscher, dann der richtige.
    await seite.goto(`${BASIS}/einstellungen`);
    await bereich.getByLabel("ElevenLabs-Schlüssel").waitFor({ timeout: 30_000 });
    assert.equal(await bereich.locator("[data-stimme]").getAttribute("data-stimme"), "aus");
    await bild("0-ohne-schluessel");
    await bereich.getByLabel("ElevenLabs-Schlüssel").fill("sk_falsch_aber_lang_genug_0123456789");
    await bereich.getByRole("button", { name: "Prüfen und speichern" }).click();
    await bereich.getByText(/lehnt den Schlüssel ab/).waitFor();
    assert.equal(gespeichert(), undefined, "ein abgelehnter Schlüssel wird nicht gespeichert");
    await bereich.getByLabel("ElevenLabs-Schlüssel").fill(MOCK_SCHLUESSEL);
    await bereich.getByRole("button", { name: "Prüfen und speichern" }).click();
    await bereich.getByText(/In deinem Konto sind 3 Stimmen/).waitFor();
    assert.equal(gespeichert()?.enabled, undefined, "der Schlüssel allein schaltet nichts ein");
    assert.ok(!(await seite.content()).includes(MOCK_SCHLUESSEL), "der Schlüssel steht nirgends in der Seite");
    await bild("1-verbunden");

    // 2. Stimme wählen, Probe hören, einschalten. Der Schalter folgt der Antwort des Servers.
    const schalter = bereich.getByLabel("Mit der ElevenLabs-Stimme sprechen");
    assert.equal(await schalter.isDisabled(), true, "ohne Stimme lässt sich nichts einschalten");
    await bis("Stimmenliste", async () => (await bereich.getByLabel("ElevenLabs-Stimme", { exact: true }).locator("option").count()) === 4);
    await bereich.getByLabel("ElevenLabs-Stimme", { exact: true }).selectOption("DeutscheStimme00001");
    await bis("Stimme gespeichert", () => gespeichert()?.voiceId === "DeutscheStimme00001");
    await bereich.getByText(/Dein ElevenLabs-Konto \(Tarif starter\)/).waitFor();
    el.leeren();
    await bereich.getByRole("button", { name: "Probe hören" }).click();
    await bis("Probe bei ElevenLabs", () => el.gesprochen().length === 1);
    await bis("Probe zu Ende gespielt", async () => (await gespielt()) === 1);
    assert.match(el.gesprochen()[0], /^Hallo Benedikt, so klinge ich jetzt/);
    assert.equal(gespeichert()?.enabled, undefined, "die Probe schaltet nichts ein");
    await bis("Schalter frei", async () => !(await schalter.isDisabled()));
    await schalter.click();
    await bereich.locator('[data-stimme="an"]').waitFor();
    assert.equal(gespeichert()?.enabled, true);
    await bild("2-eingeschaltet");

    // 3. Eine Antwort von JARVIS: Satz für Satz über ElevenLabs, in der richtigen Reihenfolge, nichts doppelt.
    el.leeren();
    const frage = seite.getByPlaceholder(/Schreib hier, was du brauchst|Sag „Jarvis“ oder tippe/).first();
    const vorher = await gespielt();
    await frage.fill("Briefing");
    await frage.press("Enter");
    await bis("erster Satz bei ElevenLabs", () => el.gesprochen().length >= 1);
    // Zu Ende ist die Antwort, wenn der Browser jedes geholte Stück auch wirklich abgespielt hat.
    await bis("Antwort zu Ende gesprochen", async () => el.gesprochen().length >= 2 && (await gespielt()) - vorher === el.gesprochen().length, 90_000);
    await warte(1500);
    const saetze = el.gesprochen();
    console.log(`Antwort in ${saetze.length} Stücken:`, saetze.map((s) => s.length));
    assert.ok(saetze.length >= 2, "eine längere Antwort kommt in mehreren Stücken");
    assert.equal((await gespielt()) - vorher, saetze.length, "jedes Stück wurde im Browser bis zum Ende abgespielt");
    assert.equal(new Set(saetze).size, saetze.length, "kein Satz doppelt");
    assert.ok(saetze.every((s) => s.length <= 600));
    assert.ok(saetze.some((s) => /Benedikt/.test(s)), "gesprochen wird die Antwort von JARVIS");

    // 4. Unterbrechen mit Escape: Danach holt die Seite keinen weiteren Satz.
    el.leeren();
    await frage.fill("Briefing");
    await frage.press("Enter");
    await bis("spricht wieder", () => el.gesprochen().length >= 1);
    const vorStopp = await gespielt();
    await seite.keyboard.press("Escape");
    await warte(4000);
    assert.equal(await gespielt(), vorStopp, "nach dem Unterbrechen spielt der Browser keinen Satz mehr zu Ende");
    assert.ok(el.gesprochen().length <= 2, "und holt keinen weiteren");

    // 5. ElevenLabs fällt aus: JARVIS antwortet trotzdem (Mac-Stimme oder still), ohne Fehler in der Seite.
    el.leeren();
    el.fehler([500, 500, 500, 500]);
    await frage.fill("Hilfe");
    await frage.press("Enter");
    await bis("Versuch bei ElevenLabs", () => el.anfragen.some((a) => a.pfad.includes("/text-to-speech/")));
    await warte(2000);
    const nachAusfall = el.anfragen.filter((a) => a.pfad.includes("/text-to-speech/")).length;
    assert.ok(nachAusfall <= 2, `nach dem Ausfall fragt die Seite nicht Satz für Satz weiter (${nachAusfall} Versuche)`);

    // 6. Tageslimit: ist es erreicht, lehnt der Server ab, und die Einstellungen zeigen es.
    el.fehler([]);
    const limit = await fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: { ...kopf, "x-jarvis": "1" }, body: JSON.stringify({ action: "elevenlabsPrefs", tagesZeichen: 500 }) });
    assert.equal(limit.status, 200);
    const voll = await fetch(`${BASIS}/api/stimme`, { method: "POST", headers: { ...kopf, "x-jarvis": "1" }, body: JSON.stringify({ text: "x".repeat(450) }) });
    assert.ok([200, 429].includes(voll.status));
    const dann = await fetch(`${BASIS}/api/stimme`, { method: "POST", headers: { ...kopf, "x-jarvis": "1" }, body: JSON.stringify({ text: "y".repeat(450) }) });
    assert.equal(dann.status, 429);
    const lage = await (await fetch(`${BASIS}/api/stimme?liste=1`)).text();
    assert.ok(!lage.includes(MOCK_SCHLUESSEL), "der Zustand enthält den Schlüssel nicht");
    await seite.reload();
    await bereich.locator('[data-stimme="aus"]').waitFor({ timeout: 30_000 });
    await bereich.getByText(/Das Tageslimit für ElevenLabs ist erreicht/).waitFor();
    await bild("3-limit");

    // 7. Ausschalten und Schlüssel entfernen.
    await bereich.getByRole("button", { name: "Schlüssel entfernen" }).click();
    await bis("Schlüssel entfernt", () => gespeichert() === undefined);
    await bereich.getByText(/Unter „Developers“/).waitFor();

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    await browser.close();
    console.log("ElevenLabs-Stimme: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
    await Promise.race([el.stop(), warte(2000)]);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
