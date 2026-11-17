// Handprüfung: der Raum Dokumente, im echten Browser gegen den gebauten Server und einen nachgebauten Claude
// (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/dokumente-rauch.ts [Ordner für Bilder]
// Geprüft wird die ganze Strecke Seite → Schnittstelle → Analyst → Datei: ohne Claude-Schlüssel, bestellen von
// Hand, der Stand während der Arbeit, das fertige PDF (von einem echten Chrome gesetzt), öffnen und ansehen,
// abbrechen, ein Dokument, das nicht fertig wird, ein Neustart mitten in der Arbeit und der Schutz der
// Schnittstelle. Recherchiert wird nichts: Der nachgebaute Claude gibt ein festes Dokument ab. „Öffnen“ geht an
// ein nachgebautes /usr/bin/open, das nur festhält, was geöffnet werden sollte.
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import type { DocsSnapshot } from "../../src/lib/documents";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";

const PORT = 3122;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("dokumente-rauch");
const ABLAGE = process.env.JARVIS_DOCS_DIR!;
const LOG = path.join(testOrdner("dokumente-rauch-mac"), "aufrufe.log");
// Sieht aus wie ein echter Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const CLAUDE = ["sk-ant-api03", "test", "nur", "fuer", "die", "handpruefung"].join("-");
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

const keine = { art: "keine", titel: "", einheit: "", quelle: "", werte: [], stufen: [] };
const DOKUMENT = {
  titel: "Goldmarkt 2026",
  untertitel: "Kurzanalyse",
  kernaussagen: ["Gold bleibt gefragt.", "Notenbanken kaufen weiter.", "Die Zinsen bestimmen den Kurs."],
  abschnitte: [
    { ueberschrift: "Überblick", absaetze: ["Der Markt wächst [1]."], punkte: [], tabelle: { titel: "", spalten: [], zeilen: [], quelle: "" }, grafik: keine },
    { ueberschrift: "Käufer", absaetze: [], punkte: ["Notenbanken", "Schmuck", "Anleger"], tabelle: { titel: "Nachfrage", spalten: ["Gruppe", "Anteil"], zeilen: [["Schmuck", "45 %"], ["Anleger", "25 %"]], quelle: "World Gold Council" }, grafik: keine },
  ],
  quellen: [{ titel: "World Gold Council", url: "https://www.gold.org/bericht" }],
};
const geoeffnet = () =>
  (existsSync(LOG) ? readFileSync(LOG, "utf8") : "")
    .split("\n")
    .filter(Boolean)
    .map((z) => JSON.parse(z) as { programm: string; args: string[] })
    .filter((a) => a.programm === "open")
    .map((a) => a.args);
const dateien = () => (existsSync(ABLAGE) ? readdirSync(ABLAGE).sort() : []);

async function main() {
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  const claude = await starteClaudeMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt" });

  const umgebung = { ANTHROPIC_BASE_URL: claude.url, JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"), JARVIS_MAC_LOG: LOG };
  let server = await starteNext(PORT, umgebung);
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const stelle = async (body: object, headers: Record<string, string> = kopf) => {
    const r = await fetch(`${BASIS}/api/dokumente`, { method: "POST", headers, body: JSON.stringify(body) });
    return { status: r.status, daten: (await r.json().catch(() => ({}))) as { error?: string } };
  };
  const stand = async () => (await (await fetch(`${BASIS}/api/dokumente`)).json()) as DocsSnapshot;
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);

    // Der Schutz der Schnittstelle: ohne den eigenen Header und von fremden Seiten bestellt niemand ein Dokument,
    // und eine fremde Seite bekommt auch keine Datei zu sehen.
    const auftrag = { action: "erstellen", thema: "Eingeschleust" };
    assert.equal((await stelle(auftrag, { "content-type": "application/json" })).status, 403);
    assert.equal((await stelle(auftrag, { ...kopf, origin: "https://boese.example" })).status, 403);
    assert.equal((await fetch(`${BASIS}/api/dokumente/datei?id=abc&art=pdf`, { headers: { "sec-fetch-site": "cross-site" } })).status, 403);
    // Ohne Claude-Schlüssel gibt es kein Dokument, und es wird auch niemand gefragt.
    const ohne = await stelle(auftrag);
    assert.equal(ohne.status, 409);
    assert.match(ohne.daten.error ?? "", /braucht JARVIS das KI-Gehirn/);
    assert.equal(claude.anfragen.length, 0);
    schritt("ohne Header, von fremder Seite und ohne Claude-Schlüssel wird nichts bestellt");

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1500 }, locale: "de-DE" });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    // Ein Dokument in der Liste ist genau der Abschnitt mit seiner Überschrift.
    const eintrag = (titel: string) => seite.getByRole("region", { name: "Deine Dokumente" }).locator("section").filter({ has: seite.getByRole("heading", { name: titel, exact: true }) });
    const laeuft = (thema: string) => seite.locator("main section").filter({ has: seite.getByRole("button", { name: "Abbrechen" }) }).filter({ has: seite.getByRole("heading", { name: thema, exact: true }) });
    const bestelle = async (thema: string, wuensche = "") => {
      const formular = seite.locator("details").filter({ hasText: "Neues Dokument von Hand" });
      if ((await formular.getAttribute("open")) === null) await formular.locator("summary").click();
      await seite.getByLabel("Thema").fill(thema);
      await seite.getByLabel("Wünsche").fill(wuensche);
      await seite.getByRole("button", { name: "Dokument erstellen" }).click();
      await laeuft(thema).waitFor();
    };

    await seite.goto(`${BASIS}/dokumente`);
    await seite.getByRole("heading", { name: "Erst das KI-Gehirn verbinden" }).waitFor({ timeout: 30_000 });
    assert.equal(await seite.getByText("Neues Dokument von Hand").count(), 0, "ohne Schlüssel gibt es kein Bestellformular");
    await bild("0-ohne-schluessel");
    await config.writeConfig({ name: "Benedikt", claude: { apiKey: CLAUDE } });
    await seite.reload();
    await seite.getByText(/Noch keine Dokumente\./).waitFor({ timeout: 30_000 });
    schritt("ohne Schlüssel bietet der Raum nur das Verbinden an; mit Schlüssel ist er leer und bereit");

    // Bestellen von Hand: Während der Analyst arbeitet, steht das da, und ein zweites Dokument geht nicht.
    claude.bedenkzeit(5000);
    claude.drehbuch([{ werkzeug: "dokument_abgeben", eingabe: DOKUMENT }]);
    await bestelle("Goldmarkt", "Kurz, mit einer Tabelle zur Nachfrage.");
    assert.match(await laeuft("Goldmarkt").innerText(), /Der Analyst (plant die Recherche|recherchiert im Web|schreibt das Dokument)/);
    assert.equal(await seite.getByRole("button", { name: "Es läuft schon eins" }).isDisabled(), true);
    const zweites = await stelle({ action: "erstellen", thema: "Zweites" });
    assert.equal(zweites.status, 409);
    assert.match(zweites.daten.error ?? "", /Ich schreibe gerade an „Goldmarkt“/);
    await bild("1-analyst-arbeitet");
    schritt("bestellt: Die Seite zeigt den Analysten bei der Arbeit, ein zweites Dokument wird abgelehnt");

    // Fertig: Titel, Kernaussagen und Umfang stehen da; das PDF liegt im Ordner und ist am Mac von selbst aufgegangen.
    await eintrag("Goldmarkt 2026").waitFor({ timeout: 90_000 });
    const text = await eintrag("Goldmarkt 2026").innerText();
    assert.match(text, /fertig/);
    assert.match(text, /2 Abschnitte · 1 Quelle · 0 Suchen · PDF/);
    assert.match(text, /Gold bleibt gefragt\.[\s\S]*Notenbanken kaufen weiter\.[\s\S]*Die Zinsen bestimmen den Kurs\./);
    const job = (await stand()).jobs[0];
    assert.ok(job.pdf && job.html, "PDF und Webseite sind abgelegt");
    assert.equal(path.dirname(job.pdf!), ABLAGE);
    assert.equal(readFileSync(job.pdf!).subarray(0, 5).toString(), "%PDF-");
    assert.ok(readFileSync(job.pdf!).length > 10_000, "das PDF hat Inhalt");
    // Geöffnet wird erst, nachdem „fertig“ gespeichert ist; das nachgebaute open braucht dafür einen Augenblick.
    for (const ende = Date.now() + 10_000; geoeffnet().length === 0 && Date.now() < ende; ) await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(geoeffnet(), [[job.pdf]], "am Mac bestellt: Das PDF geht von selbst auf, genau einmal");
    // Dem Modell ging genau der Auftrag zu, und das Dokument der Seite stammt aus dessen Abgabe.
    assert.match(JSON.stringify(claude.anfragen[0].messages), /Thema: Goldmarkt\\nKurz, mit einer Tabelle zur Nachfrage\./);
    assert.match(readFileSync(job.html!, "utf8"), /Goldmarkt 2026[\s\S]*Nachfrage[\s\S]*World Gold Council/);
    await bild("2-fertig");
    schritt("fertig: Titel, Kernaussagen und Umfang stehen da, das PDF liegt im Ordner und wurde am Mac geöffnet");

    // Öffnen, im Finder zeigen, Ordner öffnen: Der Mac bekommt jeweils genau die Datei oder den Ordner.
    // Klick und Antwort der Schnittstelle gehören zusammen: erst auf die Antwort warten, dann klicken.
    const klick = async (knopf: ReturnType<typeof seite.getByRole>) => {
      const antwort = seite.waitForResponse((r) => r.url().endsWith("/api/dokumente") && r.request().method() === "POST");
      await knopf.click();
      assert.equal((await antwort).status(), 200);
    };
    await klick(eintrag("Goldmarkt 2026").getByRole("button", { name: "Öffnen", exact: true }));
    await klick(eintrag("Goldmarkt 2026").getByRole("button", { name: "Im Finder zeigen" }));
    await klick(seite.getByRole("button", { name: "Ordner öffnen" }));
    assert.deepEqual(geoeffnet().slice(1), [[job.pdf], ["-R", job.pdf], [ABLAGE]]);
    // „Im Browser ansehen“ liefert das PDF; die Webseite kommt abgeschottet, ohne Skripte.
    const link = await eintrag("Goldmarkt 2026").getByRole("link", { name: "Im Browser ansehen" }).getAttribute("href");
    assert.equal(link, `/api/dokumente/datei?id=${job.id}&art=pdf`);
    const pdf = await fetch(`${BASIS}${link}`);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    const html = await fetch(`${BASIS}/api/dokumente/datei?id=${job.id}&art=html`);
    assert.equal(html.status, 200);
    assert.match(html.headers.get("content-security-policy") ?? "", /default-src 'none'.*sandbox/);
    assert.equal((await fetch(`${BASIS}/api/dokumente/datei?id=gibtsnicht&art=pdf`)).status, 404);
    assert.equal((await fetch(`${BASIS}/api/dokumente/datei?id=${encodeURIComponent("../config")}&art=pdf`)).status, 404);
    schritt("öffnen, im Finder zeigen, Ordner öffnen und im Browser ansehen liefern genau dieses Dokument");

    // Abbrechen mitten in der Arbeit: Es bleibt ein Eintrag „abgebrochen“, aber keine Datei.
    const vorher = dateien();
    claude.bedenkzeit(30_000);
    claude.drehbuch([{ werkzeug: "dokument_abgeben", eingabe: { ...DOKUMENT, titel: "Silbermarkt 2026" } }]);
    await bestelle("Silbermarkt");
    await laeuft("Silbermarkt").getByRole("button", { name: "Abbrechen" }).click();
    await eintrag("Silbermarkt").waitFor();
    assert.match(await eintrag("Silbermarkt").innerText(), /abgebrochen/);
    assert.equal(await seite.getByRole("button", { name: "Abbrechen" }).count(), 0);
    assert.deepEqual(dateien(), vorher, "ein abgebrochenes Dokument hinterlässt keine Datei");
    schritt("abgebrochen: Der Eintrag sagt es, im Ordner liegt nichts Neues");

    // Der Analyst gibt nichts ab: Das Dokument heißt „nicht fertig geworden“, mit dem Grund.
    // Mit etwas Bedenkzeit je Antwort: Ohne sie ist der Auftrag nach rund 25 Millisekunden gescheitert (gemessen),
    // und die Seite zeigt den Analysten gar nicht erst bei der Arbeit.
    claude.bedenkzeit(1500);
    claude.drehbuch([]);
    await bestelle("Kupfermarkt");
    await eintrag("Kupfermarkt").waitFor({ timeout: 60_000 });
    const kupfer = await eintrag("Kupfermarkt").innerText();
    assert.match(kupfer, /nicht fertig geworden/);
    assert.match(kupfer, /Der Analyst hat kein Dokument abgegeben\. Versuch es bitte noch einmal\./);
    assert.equal(await eintrag("Kupfermarkt").getByRole("button", { name: "Öffnen", exact: true }).count(), 0, "was nicht fertig wurde, lässt sich nicht öffnen");
    assert.deepEqual(dateien(), vorher);
    await bild("3-abgebrochen-und-nicht-fertig");
    schritt("gibt der Analyst nichts ab, steht „nicht fertig geworden“ mit dem Grund da");

    // JARVIS wird mitten in der Arbeit beendet: Nach dem Neustart ist das Dokument als abgebrochen vermerkt,
    // nicht für immer „in Arbeit“. Das fertige Dokument ist noch da.
    claude.bedenkzeit(30_000);
    claude.drehbuch([{ werkzeug: "dokument_abgeben", eingabe: { ...DOKUMENT, titel: "Platinmarkt 2026" } }]);
    await bestelle("Platinmarkt");
    await server.stop();
    server = await starteNext(PORT, umgebung);
    await server.bereit(`${BASIS}/api/einstellungen`);
    await seite.reload();
    await eintrag("Platinmarkt").waitFor({ timeout: 30_000 });
    assert.match(await eintrag("Platinmarkt").innerText(), /abgebrochen[\s\S]*JARVIS wurde beendet, bevor das Dokument fertig war\./);
    assert.equal((await stand()).running, null);
    await eintrag("Goldmarkt 2026").getByRole("link", { name: "Im Browser ansehen" }).waitFor();
    assert.deepEqual(dateien(), vorher);
    await bild("4-nach-neustart");
    schritt("nach einem Neustart mitten in der Arbeit ist das Dokument als abgebrochen vermerkt, das fertige ist noch da");

    await browser.close();
    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Handprüfung Dokumente: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
    await claude.stop();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
