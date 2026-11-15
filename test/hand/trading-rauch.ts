// Handprüfung: der Raum Trading mit dem Spielgeld-Desk, im echten Browser gegen den gebauten Server und einen
// nachgebauten Markt (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/trading-rauch.ts [Ordner für Bilder]
// Geprüft wird die ganze Strecke Seite → Schnittstelle → Desk: Start über den Knopf, Scan, Blockchain-Prüfung,
// Urteil des Chiefs (Claude nachgebaut), Rückfrage vor dem Kauf mit Ja und Nein, Kauf mit Spielgeld, Stop-Loss
// nach einem Kurssturz und der Not-Aus. Es bleibt Spielgeld: Der Desk hat keine Börsenanbindung, und alle
// Dienste dieser Prüfung sind Nachbauten auf diesem Rechner.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import type { DeskSnapshot } from "../../src/lib/paper";
import { starteNext } from "../helfer/server";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";
import { guterCoin, starteMarktMock } from "../mocks/markt-mock";

const PORT = 3119;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("trading-rauch");
// Sieht aus wie ein echter Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const CLAUDE = ["sk-ant-api03", "test", "nur", "fuer", "die", "handpruefung"].join("-");
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

async function main() {
  const [claude, markt] = await Promise.all([starteClaudeMock(), starteMarktMock()]);
  const { MODELLE } = await import("../../src/lib/modelle");
  const config = await import("../../src/lib/server/config");
  // Rückfrage ab 100 $: So muss jeder Kauf dieser Prüfung erst bestätigt werden.
  await config.writeConfig({ name: "Benedikt", claude: { apiKey: CLAUDE }, approval: { limitUsd: 100 } });

  // Drei Coins: einer, der alles besteht; einer, den der Chief ablehnt; einer, bei dem der Entwickler noch neue
  // Coins erzeugen kann (fliegt an der Blockchain-Prüfung raus, bevor der Chief gefragt wird).
  const hund = guterCoin("GOODDOG");
  const welle = guterCoin("WELLE", { aenderung: { m5: 2, h1: 9, h6: 14, h24: 22 } });
  const falle = guterCoin("FALLE", { kette: { halter: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], mint: true } });
  const spaeter = guterCoin("SPAETER");
  markt.coins.push(hund, welle, falle);
  const urteil = (address: string, gut: boolean, begruendung: string) => ({ address, momentum_already_spent: gut ? 0.2 : 0.9, account_is_the_project: 0.9, recycled_account: 0.1, begruendung });
  claude.immer(MODELLE.chief.id, {
    text: JSON.stringify({
      coins: [
        urteil(hund.address, true, "Frisches Geld, und die Konten gehören erkennbar zum Projekt."),
        urteil(welle.address, false, "Der Anstieg ist schon gelaufen."),
        urteil(falle.address, true, "Sieht gut aus."),
        urteil(spaeter.address, true, "Sieht gut aus."),
      ],
    }),
  });

  // Auch die Dienste, die ohne Schlüssel gar nicht gefragt werden (Rohstoffe, X), zeigen auf den Nachbau.
  const dienste = { ANTHROPIC_BASE_URL: claude.url, DEXSCREENER_URL: markt.url, COINGECKO_URL: markt.url, GECKOTERMINAL_URL: markt.url, RUGCHECK_URL: markt.url, TWELVEDATA_URL: markt.url, XAI_BASE_URL: markt.url };
  const server = await starteNext(PORT, { ...dienste, JARVIS_TICK_MS: "1000" });
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const stand = async () => (await (await fetch(`${BASIS}/api/handel`)).json()) as DeskSnapshot;
  const bis = async (bedingung: (s: DeskSnapshot) => boolean, was: string, ms = 60_000) => {
    const ende = Date.now() + ms;
    for (;;) {
      const s = await stand();
      if (bedingung(s)) return s;
      if (Date.now() > ende) throw new Error(`Nicht eingetreten: ${was}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  };
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);

    // Der Schutz der Schnittstelle: ohne den eigenen Header und von fremden Seiten startet niemand den Handel.
    const start = JSON.stringify({ action: "start" });
    assert.equal((await fetch(`${BASIS}/api/handel`, { method: "POST", headers: { "content-type": "application/json" }, body: start })).status, 403);
    assert.equal((await fetch(`${BASIS}/api/handel`, { method: "POST", headers: { ...kopf, origin: "https://boese.example" }, body: start })).status, 403);
    assert.equal((await stand()).status, "aus");
    schritt("ohne den eigenen Header und von einer fremden Seite lässt sich der Handel nicht starten");

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1400, height: 1800 }, locale: "de-DE" });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    const raum = seite.locator("main");

    // 1. Vor dem Start: nichts läuft, nichts ist gekauft, und es steht da, dass es Spielgeld ist.
    await seite.goto(`${BASIS}/trading`);
    await seite.getByRole("button", { name: "Spielgeld-Handel starten" }).waitFor({ timeout: 30_000 });
    const vorher = await raum.innerText();
    assert.match(vorher, /Spielgeld-Handel noch nicht gestartet/);
    assert.match(vorher, /Noch nichts passiert\./);
    assert.match(vorher, /Erfundenes Geld, echte Kurse, echte Kosten\. Kein echter Handel\./);
    assert.equal(await seite.getByRole("button", { name: "Not-Aus" }).isDisabled(), true, "vor dem Start gibt es nichts zu stoppen");
    assert.equal(claude.anfragen.length, 0);
    await bild("0-vor-dem-start");
    schritt("vor dem Start: nichts läuft, der Not-Aus ist grau, die Seite nennt das Spielgeld");

    // 2. Start über den Knopf. Der Desk scannt, prüft die Blockchain, fragt den Chief und fragt dann dich.
    await seite.getByRole("button", { name: "Spielgeld-Handel starten" }).click();
    await seite.getByRole("heading", { name: "JARVIS fragt vor einem Kauf" }).waitFor({ timeout: 60_000 });
    const frage = seite.locator("section", { has: seite.getByRole("heading", { name: "JARVIS fragt vor einem Kauf" }) });
    const fragetext = await frage.innerText();
    assert.match(fragetext, /\$GOODDOG für \d{3},\d{2} \$ kaufen\?\s*Spielgeld/);
    assert.match(fragetext, /ohne Antwort kaufe ich nicht\./);
    assert.match(fragetext, /Kein Handy gekoppelt, die Frage steht nur hier\./);
    assert.match(await raum.innerText(), /Echtes Geld erst, wenn der Desk nach 28 Tagen nach Kosten im Plus ist und du zustimmst\./);
    const offen = await stand();
    assert.equal(offen.status, "laeuft");
    assert.equal(offen.positions.length, 0, "vor deinem Ja ist nichts gekauft");
    assert.equal(offen.cash, 10_000);
    assert.equal(offen.trades.length, 0);
    await bild("1-rueckfrage");
    schritt("Start über den Knopf: Der Desk fragt vor dem Kauf von $GOODDOG; bis zur Antwort ist nichts gekauft");

    // 3. Die beiden anderen Coins: einer scheitert an der Blockchain, einen lehnt der Chief ab.
    const protokoll = await raum.innerText();
    assert.match(protokoll, /\$FALLE Der Entwickler kann noch neue Coins erzeugen \(Mint Authority\)/);
    assert.match(protokoll, /\$WELLE nein: [^\n]*Der Anstieg ist schon gelaufen\./);
    assert.match(protokoll, /\$GOODDOG ja: Frisches Geld, und die Konten gehören erkennbar zum Projekt\./);
    const gefragt = JSON.stringify(claude.anfragen);
    assert.ok(gefragt.includes(hund.address) && gefragt.includes(welle.address), "der Chief bewertet die beiden Coins mit sauberer Blockchain");
    assert.ok(!gefragt.includes(falle.address), "der Coin mit Mint Authority kommt gar nicht erst zum Chief");
    assert.ok(claude.anfragen.every((a) => a.model === MODELLE.chief.id), "gefragt wird nur das Modell des Chiefs");
    schritt("$FALLE fliegt an der Blockchain-Prüfung raus und kostet keine Anfrage an Claude; $WELLE lehnt der Chief ab");

    // 4. Nein: Es wird nicht gekauft, und die Frage ist weg.
    await frage.getByRole("button", { name: "Nein" }).click();
    const nein = await bis((s) => s.approvals.some((a) => a.symbol === "GOODDOG" && a.state === "nein"), "die Antwort Nein ist gespeichert");
    assert.equal(nein.positions.length, 0);
    assert.equal(nein.cash, 10_000);
    await seite.getByRole("button", { name: "Ja, kaufen" }).waitFor({ state: "detached" });
    schritt("Nein über die Seite: nichts gekauft, das Konto steht bei 10.000 $");

    // 5. Ein neuer Coin kommt auf den Markt; diesmal Ja. Gekauft wird mit Spielgeld, 2 bis 5 Prozent des Kontos.
    markt.coins.push(spaeter);
    const neuAb = Date.now();
    await seite.getByText(/\$SPAETER für \d{3},\d{2} \$ kaufen\?/).waitFor({ timeout: 90_000 });
    // So lange braucht der laufende Desk, bis er einen neuen Coin gefunden, geprüft und zur Frage gemacht hat.
    // Daran misst Schritt 7, wie lange nach dem Not-Aus nichts geschehen darf.
    const dauerNeu = Date.now() - neuAb;
    assert.equal((await stand()).positions.length, 0);
    await seite.getByRole("button", { name: "Ja, kaufen" }).first().click();
    const gekauft = await bis((s) => s.positions.length === 1, "die Position steht im Konto");
    const kauf = gekauft.trades.find((t) => t.side === "kauf");
    assert.ok(kauf && kauf.symbol === "SPAETER");
    assert.ok(kauf.usd >= 200 && kauf.usd <= 500, `Einsatz 2 bis 5 Prozent von 10.000 $: ${kauf.usd}`);
    assert.ok(Math.abs(gekauft.cash - (10_000 - kauf.usd)) < 0.01, "vom Konto geht genau der Einsatz ab");
    await seite.getByRole("heading", { name: /Offene Positionen\s*1/ }).waitFor({ timeout: 30_000 });
    await seite.getByText(/Kauf \$SPAETER für \d{3},\d{2} \$, davon \d,\d{2} \$ Gebühren/).first().waitFor({ timeout: 30_000 });
    assert.equal(gekauft.trades.filter((t) => t.symbol === "GOODDOG").length, 0, "der abgelehnte Coin wurde nicht gekauft");
    await bild("2-gekauft");
    schritt(`Ja über die Seite: $SPAETER für ${kauf.usd.toFixed(2)} $ Spielgeld gekauft, die Position steht auf der Seite`);

    // 6. Der Kurs stürzt um 40 Prozent: Der Stop-Loss verkauft von selbst, ohne Rückfrage.
    spaeter.preis *= 0.6;
    const raus = await bis((s) => s.positions.length === 0 && s.trades.some((t) => t.side === "verkauf"), "der Stop-Loss hat verkauft", 90_000);
    const verkauf = raus.trades.find((t) => t.side === "verkauf")!;
    assert.ok((verkauf.pnlUsd ?? 0) < 0, "der Verkauf steht mit Verlust im Buch");
    assert.ok(raus.equity < 10_000 && Math.abs(raus.equity - raus.cash) < 0.01, "das Konto zeigt den Verlust, alles ist wieder bar");
    await seite.getByText(/Verkauf \$SPAETER: Stop-Loss: −\d+,\d % seit dem Kauf\. Ergebnis −\d+,\d{2} \$/).first().waitFor({ timeout: 30_000 });
    // Ohne offene Position zeigt der Raum den Abschnitt gar nicht.
    await seite.getByRole("heading", { name: /Offene Positionen/ }).waitFor({ state: "detached", timeout: 30_000 });
    await bild("3-stop-loss");
    schritt(`Kurssturz: Der Stop-Loss verkauft von selbst, Ergebnis ${(verkauf.pnlUsd ?? 0).toFixed(2)} $ Spielgeld`);

    // 7. Not-Aus über die Seite: Alle Agenten stehen. Ein neuer guter Coin wird weder bewertet noch gekauft.
    await seite.getByRole("button", { name: "Not-Aus" }).click();
    await bis((s) => s.status === "notaus", "der Not-Aus steht");
    await seite.getByText(/Not-Aus: alle Agenten stehen/).first().waitFor({ timeout: 30_000 });
    const anfragenVorher = claude.anfragen.length;
    const tradesVorher = (await stand()).trades.length;
    markt.coins.push(guterCoin("NACHHER"));
    const stille = Math.max(8000, 2 * dauerNeu);
    await seite.waitForTimeout(stille);
    const still = await stand();
    assert.equal(still.status, "notaus");
    assert.equal(still.trades.length, tradesVorher, "nach dem Not-Aus wird nichts mehr gehandelt");
    assert.equal(still.approvals.filter((a) => a.state === "offen").length, 0, "und nichts mehr gefragt");
    assert.equal(claude.anfragen.length, anfragenVorher, "auch Claude wird nicht mehr gefragt");
    await bild("4-not-aus");
    schritt(`Not-Aus über die Seite: ${Math.round(stille / 1000)} Sekunden lang kein Handel, keine Rückfrage, keine Anfrage an Claude (laufend brauchte der Desk für einen neuen Coin ${(dauerNeu / 1000).toFixed(1)} s)`);

    await browser.close();
    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Handprüfung Trading: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
    await Promise.all([claude.stop(), markt.stop()]);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
