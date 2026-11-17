// Handprüfung: Was die Räume zeigen, solange JARVIS dort nichts laden kann, im echten Browser gegen den gebauten
// Server (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/ausfall-rauch.ts [Ordner für Bilder]
// Zwei Fälle, die verschieden aussehen müssen: Eine Abfrage ist noch unterwegs („… lädt noch“), oder JARVIS
// antwortet dort gar nicht („… lässt sich gerade nicht laden“). In keinem der beiden Fälle darf ein Raum etwas
// behaupten, das er nicht weiß: keine Null, kein „verbinden“, kein ewiges „Lade …“. „Heute“ prüft heute-rauch.ts.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { mittagsZone } from "../helfer/uhrzeiten";

const PORT = 3130;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("ausfall-rauch");
const MAC = testOrdner("ausfall-rauch-mac");
const STORE = path.join(MAC, "kalender.json");
const TRESOR = path.join(testOrdner("ausfall-rauch-tresor"), "Mein Tresor");
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);
const ZONE = mittagsZone();
process.env.TZ = ZONE;

// Je Raum: die Sätze, die bei einem Ausfall dastehen müssen, und was dann nicht dastehen darf.
const RAEUME: { pfad: string; name: string; aus: string[]; nie?: RegExp }[] = [
  { pfad: "/aufgaben", name: "Aufgaben", aus: ["Die Aufgaben lassen sich gerade nicht laden."], nie: /Mit Obsidian verbinden|Notieren/ },
  { pfad: "/kalender", name: "Kalender", aus: ["Der Kalender lässt sich gerade nicht laden."], nie: /Mit dem Kalender verbinden|Kein Termin/ },
  { pfad: "/post", name: "Post", aus: ["Das Postfach lässt sich gerade nicht laden."], nie: /Postfach verbinden|Wichtig|Schön ruhig/ },
  { pfad: "/projekte", name: "Projekte", aus: ["Die Projekte lassen sich gerade nicht laden."], nie: /Noch kein Projekt/ },
  { pfad: "/trading", name: "Trading", aus: ["Der Trading-Desk lässt sich gerade nicht laden.", "Die Krypto-Kurse lassen sich gerade nicht laden."] },
  { pfad: "/intel", name: "Intel", aus: ["Das Lagebild lässt sich gerade nicht laden.", "Die Krypto-Kurse lassen sich gerade nicht laden.", "Die Kurse für Gold und Silber lassen sich gerade nicht laden."], nie: /Noch keine Kurse/ },
  { pfad: "/agenten", name: "Agenten", aus: ["Die Agenten lassen sich gerade nicht laden.", "Der Zeitplan lässt sich gerade nicht laden."] },
  { pfad: "/browser", name: "Browser", aus: ["Der Browser lässt sich gerade nicht laden."] },
  { pfad: "/dokumente", name: "Dokumente", aus: ["Die Dokumente lassen sich gerade nicht laden."] },
  { pfad: "/einstellungen", name: "Einstellungen", aus: ["Die Einstellungen lassen sich gerade nicht laden."] },
];
// Ein von Hand geschriebener Ladesatz; steht er irgendwo, weiß die Stelle nichts von einem Ausfall.
const SELBST = /Lade [^\n]*…|lädt …|melden sich …/;

async function main() {
  assert.ok([12, 13].includes(new Date().getHours()), "die Zeitzone der Prüfung steht auf Mittag");
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  if (bilder) mkdirSync(bilder, { recursive: true });
  const jetzt = new Date();
  const um = (stunde: number) => new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate(), stunde).getTime();
  const { isoDate } = await import("../../src/lib/dates");
  writeFileSync(
    STORE,
    JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [{ id: "a", title: "Besprechung Hallenneubau", start: um(15), end: um(16), allDay: false, location: "", calendar: "Privat" }] }),
  );
  mkdirSync(path.join(TRESOR, "Aufgaben"), { recursive: true });
  writeFileSync(path.join(TRESOR, "Aufgaben", "Haus.md"), ["Angebot prüfen", "Statiker anrufen", "Bauantrag unterschreiben"].map((a) => `- [ ] ${a} 📅 ${isoDate(jetzt)}`).join("\n"));
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", vaultPath: TRESOR });

  const server = await starteNext(PORT, {
    TZ: ZONE,
    JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"),
    JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"),
    JARVIS_MAC_STORE: STORE,
    JARVIS_MAC_LOG: path.join(MAC, "aufrufe.log"),
  });
  let browser: Browser | null = null;
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);
    const angelegt = await fetch(`${BASIS}/api/projekte`, { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1" }, body: JSON.stringify({ aktion: "projekt_anlegen", name: "Hallenneubau" }) });
    assert.equal(angelegt.status, 200, "das Projekt für die Prüfung ist angelegt");

    browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME });
    // Eine frische Seite je Fall: Der Stand einer Abfrage gilt für die ganze Seite, auch über Raumwechsel hinweg.
    const neueSeite = async (): Promise<Page> => {
      const kontext = await browser!.newContext({ viewport: { width: 1280, height: 800 }, locale: "de-DE", timezoneId: ZONE });
      return kontext.newPage();
    };
    const lesen = /\/api\//;
    const istLesen = (methode: string) => methode === "GET";
    const text = async (seite: Page) => `${await seite.locator("main:visible").first().innerText()}\n${await seite.locator("aside.raum-scheiben").innerText().catch(() => "")}`;
    const arten = (seite: Page) => seite.locator("[data-ladestand]").evaluateAll((alle) => alle.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => `${e.getAttribute("data-ladestand")}: ${(e as HTMLElement).innerText.trim()}`));
    // Zahlen in den Scheiben („Auf einen Blick“): Eine Null wäre eine Behauptung.
    const scheibenZahlen = (seite: Page) => seite.locator("aside.raum-scheiben").innerText().then((t) => t.split("\n").map((z) => z.trim()).filter((z) => /^\d+$/.test(z)), () => [] as string[]);

    // 1. Alle Abfragen hängen: Jeder Raum sagt, dass er lädt, und behauptet nichts.
    for (const raum of RAEUME) {
      const seite = await neueSeite();
      await seite.route(lesen, (r) => (istLesen(r.request().method()) ? undefined : r.continue()));
      await seite.goto(BASIS + raum.pfad, { waitUntil: "domcontentloaded" });
      await seite.locator('[data-ladestand="laedt"]').first().waitFor({ timeout: 15_000 });
      await seite.waitForTimeout(1500);
      const da = await arten(seite);
      const alles = await text(seite);
      assert.ok(da.length > 0 && da.every((a) => a.startsWith("laedt: ")), `${raum.name}: nur „lädt noch“, kein Ausfall: ${da.join(" | ")}`);
      for (const satz of raum.aus) assert.ok(da.includes(`laedt: ${satz.replace(/ (lässt|lassen) sich gerade nicht laden\.$/, (_, v) => (v === "lassen" ? " laden noch." : " lädt noch."))}`), `${raum.name}: der Ladesatz zu „${satz}“ fehlt: ${da.join(" | ")}`);
      assert.doesNotMatch(alles, SELBST, `${raum.name}: kein von Hand geschriebener Ladesatz`);
      if (raum.nie) assert.doesNotMatch(alles, raum.nie, `${raum.name}: behauptet nichts, solange er lädt`);
      assert.deepEqual(await scheibenZahlen(seite), [], `${raum.name}: keine Zahl in den Scheiben, solange nichts gelesen ist`);
      await seite.context().close();
    }
    schritt("hängen alle Abfragen, sagt jeder der zehn Räume „… lädt noch“ und zeigt keine Null, kein „verbinden“ und kein „Lade …“");

    // 2. JARVIS antwortet nirgends: Jeder Raum sagt, was sich nicht laden lässt, und nicht mehr „lädt“.
    for (const raum of RAEUME) {
      const seite = await neueSeite();
      await seite.route(lesen, (r) => (istLesen(r.request().method()) ? r.abort() : r.continue()));
      await seite.goto(BASIS + raum.pfad, { waitUntil: "domcontentloaded" });
      for (const satz of raum.aus) await seite.locator('[data-ladestand="gestoert"]', { hasText: satz }).first().waitFor({ timeout: 20_000 }).catch(async () => assert.fail(`${raum.name}: „${satz}“ steht nicht da. Da steht: ${(await arten(seite)).join(" | ")}`));
      const da = await arten(seite);
      const alles = await text(seite);
      assert.ok(da.every((a) => a.startsWith("gestoert: ")), `${raum.name}: nichts „lädt noch“, wenn alles ausgefallen ist: ${da.join(" | ")}`);
      assert.doesNotMatch(alles, SELBST, `${raum.name}: kein von Hand geschriebener Ladesatz`);
      assert.doesNotMatch(alles, /laden noch|lädt noch/, `${raum.name}: nichts lädt noch`);
      if (raum.nie) assert.doesNotMatch(alles, raum.nie, `${raum.name}: behauptet nichts über einen Ausfall hinweg`);
      assert.deepEqual(await scheibenZahlen(seite), [], `${raum.name}: keine Zahl in den Scheiben bei einem Ausfall`);
      // Was schon so ist, wenn der Raum aufgeht, ist gewöhnlicher Text und unterbricht kein Vorleseprogramm.
      assert.equal(await seite.locator('main:visible [role="alert"], main:visible [role="status"]').count(), 0, `${raum.name}: der Satz ist keine Meldung`);
      // Der Not-Aus des Desks sagt nicht „greift, sobald der Handel läuft“, wenn JARVIS den Desk gar nicht kennt.
      if (raum.pfad === "/trading") assert.equal(await seite.locator("main:visible footer").getByRole("button", { name: "Not-Aus" }).getAttribute("title"), "Der Zustand des Trading-Desks ist gerade nicht bekannt.");
      if (bilder) await seite.screenshot({ path: path.join(bilder, `aus-${raum.pfad.slice(1)}.png`) });
      await seite.context().close();
    }
    schritt("antwortet JARVIS nirgends, steht in jedem der zehn Räume, was sich gerade nicht laden lässt; nichts „lädt“ ewig, und nirgends steht eine Null");

    // 3. Das Gespräch: Was nicht zu lesen ist, steht bei dem, was ansteht.
    {
      const seite = await neueSeite();
      await seite.route(lesen, (r) => (istLesen(r.request().method()) ? r.abort() : r.continue()));
      await seite.goto(`${BASIS}/fokus`, { waitUntil: "domcontentloaded" });
      const main = seite.locator("main:visible");
      for (const satz of ["Der Kalender lässt sich gerade nicht laden", "Das Postfach lässt sich gerade nicht laden", "Die Aufgaben lassen sich gerade nicht laden"]) await main.getByText(satz, { exact: true }).waitFor({ timeout: 20_000 });
      await seite.context().close();
    }
    schritt("im Raum Gespräch steht bei „Was gerade ansteht“, dass Kalender, Postfach und Aufgaben sich nicht laden lassen");

    // 4. Nur ein Teil fällt aus: Der Rest des Raums steht da wie immer.
    {
      const seite = await neueSeite();
      await seite.route(/\/api\/(zeitplan|metalle|sicherheit|microsoft|weather)(\?|$)/, (r) => (istLesen(r.request().method()) ? r.abort() : r.continue()));
      await seite.goto(`${BASIS}/agenten`, { waitUntil: "domcontentloaded" });
      const main = seite.locator("main:visible");
      await main.locator('[data-ladestand="gestoert"]', { hasText: "Der Zeitplan lässt sich gerade nicht laden." }).waitFor({ timeout: 20_000 });
      await main.getByText("Geschätzt nach Listenpreis").waitFor({ timeout: 20_000 });
      assert.deepEqual(await arten(seite), ["gestoert: Der Zeitplan lässt sich gerade nicht laden.", "gestoert: Das Wetter lässt sich gerade nicht laden."], "Agenten: nur der Zeitplan und das Wetter fehlen");

      await seite.goto(`${BASIS}/intel`, { waitUntil: "domcontentloaded" });
      await seite.locator("main:visible").locator('[data-ladestand="gestoert"]', { hasText: "Die Kurse für Gold und Silber lassen sich gerade nicht laden." }).waitFor({ timeout: 20_000 });
      await seite.locator("main:visible").getByText("Mit Grok verbinden").first().waitFor({ timeout: 20_000 });
      assert.deepEqual(await arten(seite), ["gestoert: Die Kurse für Gold und Silber lassen sich gerade nicht laden."], "Intel: nur Gold und Silber fehlen");

      await seite.goto(`${BASIS}/einstellungen`, { waitUntil: "domcontentloaded" });
      // Das Gedächtnis steht nur mit Claude-Schlüssel in den Einstellungen und kommt hier deshalb nicht vor.
      for (const satz of ["Die Sicherheitslage lässt sich gerade nicht laden.", "Die Verbindung zu Microsoft lässt sich gerade nicht laden."])
        await seite.locator("main:visible").locator('[data-ladestand="gestoert"]', { hasText: satz }).first().waitFor({ timeout: 20_000 }).catch(async () => assert.fail(`Einstellungen: „${satz}“ steht nicht da. Da steht: ${(await arten(seite)).join(" | ")}`));
      assert.doesNotMatch(await text(seite), SELBST, "Einstellungen: kein von Hand geschriebener Ladesatz");
      // Einzelne Stellen scheitern immer wieder, aber JARVIS antwortet sonst: Oben steht kein Hinweis, er antworte nicht.
      await seite.waitForTimeout(22_000);
      assert.equal(await seite.locator('[data-verbindung="aus"]').count(), 0, "obwohl JARVIS sonst antwortet, steht oben, er antworte nicht");
      assert.equal(await seite.locator('[data-verbindung="da"]').count(), 1);
      await seite.context().close();

      // Nur die Kurse fehlen: Der Desk steht da, aber keine leere Scan-Tabelle und keine Kachel, die ewig „…“ zeigt.
      const handel = await neueSeite();
      await handel.route(/\/api\/market(\?|$)/, (r) => r.abort());
      await handel.goto(`${BASIS}/trading`, { waitUntil: "domcontentloaded" });
      await handel.locator("main:visible").locator('[data-ladestand="gestoert"]', { hasText: "Die Krypto-Kurse lassen sich gerade nicht laden." }).waitFor({ timeout: 20_000 });
      await handel.locator("main:visible").getByText("Spielgeld-Konto").waitFor({ timeout: 20_000 });
      assert.deepEqual(await arten(handel), ["gestoert: Die Krypto-Kurse lassen sich gerade nicht laden."], "Trading: nur die Kurse fehlen");
      const zeilen = (await handel.locator("main:visible").innerText()).split("\n").map((z) => z.trim());
      assert.ok(!zeilen.includes("…"), "Trading: keine Kachel zeigt „…“, wenn die Kurse ausgefallen sind");
      assert.ok(!zeilen.includes("Scan: Solana-Memecoins"), "Trading: keine leere Scan-Tabelle ohne Kurse");
      await handel.context().close();
    }
    schritt("fällt nur ein Teil aus (Zeitplan, Wetter, Gold und Silber, Sicherheitslage, Microsoft, die Krypto-Kurse im Trading-Raum), steht nur dort der Satz; der Rest des Raums ist da, und oben steht kein Hinweis, JARVIS antworte nicht");

    // 5. Eine einzelne Akte lässt sich nicht laden; kommt JARVIS zurück, steht sie nach Sekunden da.
    {
      const seite = await neueSeite();
      const akte = /\/api\/projekte\?projekt=/;
      await seite.route(akte, (r) => r.abort());
      await seite.goto(`${BASIS}/projekte`, { waitUntil: "domcontentloaded" });
      const main = seite.locator("main:visible");
      await main.getByRole("region", { name: "Projekte" }).getByText("Hallenneubau").first().click();
      await main.locator('[data-ladestand="gestoert"]', { hasText: "Die Akte lässt sich gerade nicht laden." }).waitFor({ timeout: 20_000 });
      assert.doesNotMatch(await text(seite), SELBST);
      await seite.unroute(akte);
      await main.getByText("Projektakte").waitFor({ timeout: 20_000 });
      assert.deepEqual(await arten(seite), [], "die Akte ist da, kein Satz mehr");
      await seite.context().close();

      // Gibt es das Projekt nicht mehr (JARVIS antwortet, aber ohne Akte), klappt die Kachel zu; nichts „lädt“ ewig.
      const weg = await neueSeite();
      await weg.route(akte, async (r) => {
        const antwort = await r.fetch();
        await r.fulfill({ response: antwort, json: { ...((await antwort.json()) as object), akte: null } });
      });
      await weg.goto(`${BASIS}/projekte`, { waitUntil: "domcontentloaded" });
      await weg.locator("main:visible").getByRole("region", { name: "Projekte" }).getByText("Hallenneubau").first().click();
      await weg.waitForTimeout(2500);
      assert.deepEqual(await arten(weg), [], "Projekte: ohne Akte steht kein Ladesatz da");
      await weg.context().close();
    }
    schritt("lässt sich eine einzelne Akte nicht laden, steht das da; kommt JARVIS zurück, steht sie nach Sekunden von selbst da; gibt es das Projekt nicht mehr, lädt nichts ewig");

    // 6. JARVIS kommt zurück: Die Räume füllen sich von selbst, mit echten Zahlen.
    {
      const seite = await neueSeite();
      const aus = (r: Parameters<Parameters<Page["route"]>[1]>[0]) => (istLesen(r.request().method()) ? r.abort() : r.continue());
      await seite.route(lesen, aus);
      await seite.goto(`${BASIS}/aufgaben`, { waitUntil: "domcontentloaded" });
      await seite.locator('[data-ladestand="gestoert"]', { hasText: "Die Aufgaben lassen sich gerade nicht laden." }).waitFor({ timeout: 20_000 });
      await seite.unroute(lesen, aus);
      await seite.locator("main:visible").getByText("Statiker anrufen").first().waitFor({ timeout: 25_000 });
      assert.deepEqual(await arten(seite), [], "Aufgaben: kein Satz mehr, wenn die Aufgaben da sind");
      assert.deepEqual(await scheibenZahlen(seite), ["3", "0", "0"], "Aufgaben: die Scheibe zeigt jetzt echte Zahlen");
      await seite.context().close();
    }
    schritt("kommt JARVIS zurück, füllt sich der Raum Aufgaben nach Sekunden von selbst, und die Scheibe zeigt echte Zahlen (3, 0, 0)");

    // 7. Eine Abfrage, die nie beantwortet wird: Nach ihrer Frist (hier 30 Sekunden) gibt JARVIS sie auf, sagt, was
    //    sich nicht laden lässt, und beendet sie. Vorher stand für immer „lädt noch“ da, und alle zehn Sekunden kam
    //    eine weitere hängende Abfrage dazu.
    {
      const seite = await neueSeite();
      const beendet: number[] = [];
      const start = Date.now();
      seite.on("requestfailed", (r) => {
        if (new URL(r.url()).pathname === "/api/agenten") beendet.push(Date.now() - start);
      });
      const agenten = /\/api\/agenten(\?|$)/;
      const haengt = () => undefined;
      await seite.route(agenten, haengt);
      await seite.goto(`${BASIS}/agenten`, { waitUntil: "domcontentloaded" });
      const main = seite.locator("main:visible");
      await main.locator('[data-ladestand="laedt"]', { hasText: "Die Agenten laden noch." }).waitFor({ timeout: 15_000 });
      await seite.waitForTimeout(20_000);
      assert.ok((await arten(seite)).includes("laedt: Die Agenten laden noch."), `nach 20 Sekunden lädt es noch (die Frist ist nicht zu knapp): ${(await arten(seite)).join(" | ")}`);
      await main
        .locator('[data-ladestand="gestoert"]', { hasText: "Die Agenten lassen sich gerade nicht laden." })
        .waitFor({ timeout: 25_000 })
        .catch(async () => assert.fail(`nach 45 Sekunden ohne Antwort steht immer noch nicht da, dass die Agenten sich nicht laden lassen. Da steht: ${(await arten(seite)).join(" | ")}`));
      assert.ok(!(await arten(seite)).includes("laedt: Die Agenten laden noch."), "„lädt noch“ steht dann nicht mehr da");
      assert.ok(beendet.length >= 1 && beendet[0] >= 28_000, `die hängende Abfrage ist nach ihrer Frist beendet, nicht früher (beendet nach ${beendet.join(", ")} ms)`);
      // Antwortet JARVIS wieder, steht der Raum nach Sekunden von selbst da.
      await seite.unroute(agenten, haengt);
      await main.getByText("Geschätzt nach Listenpreis").waitFor({ timeout: 25_000 });
      assert.ok(!(await arten(seite)).some((a) => a.includes("Die Agenten")), `Agenten: kein Satz mehr, wenn die Agenten da sind: ${(await arten(seite)).join(" | ")}`);
      await seite.context().close();
    }
    schritt("wird eine Abfrage nie beantwortet, gibt JARVIS sie nach 30 Sekunden auf, sagt, was sich nicht laden lässt, und beendet sie; antwortet er wieder, steht der Raum von selbst da");

    // 8. JARVIS fällt aus, nachdem der Raum schon gelesen war: Der Raum zeigt weiter seinen letzten Stand, und oben
    //    steht, seit wann JARVIS nicht antwortet. Vorher stand der alte Stand ohne ein Wort da, und jede Änderung
    //    meldete auf Englisch „Failed to fetch“.
    {
      const seite = await neueSeite();
      // Für die freie Frage weiter unten: Die Seite soll glauben, das KI-Gehirn sei eingerichtet. Gefragt wird es
      // nie, denn dann antwortet JARVIS schon nicht mehr.
      await seite.route(/\/api\/einstellungen(\?|$)/, async (r) => {
        if (!istLesen(r.request().method())) return r.continue();
        const antwort = await r.fetch();
        const stand = (await antwort.json()) as { brain: object };
        await r.fulfill({ response: antwort, json: { ...stand, brain: { ...stand.brain, configured: true } } });
      });
      await seite.goto(`${BASIS}/aufgaben`, { waitUntil: "domcontentloaded" });
      const main = seite.locator("main:visible");
      await main.getByText("Statiker anrufen").first().waitFor({ timeout: 25_000 });
      const hinweis = seite.locator("[data-verbindung]");
      assert.equal(await seite.locator('[data-verbindung="da"]').count(), 1, "die Stelle für den Hinweis gibt es von Anfang an (sonst sagte ein Vorleseprogramm ihn nicht an)");
      assert.equal(await hinweis.getAttribute("role"), "status");
      assert.equal((await hinweis.innerText()).trim(), "", "solange JARVIS antwortet, steht dort nichts");
      assert.equal(await seite.locator("main [data-verbindung]").count(), 0, "der Hinweis gehört nicht zum Raum");
      const aus = (r: Parameters<Parameters<Page["route"]>[1]>[0]) => r.abort();
      await seite.route(lesen, aus);
      await seite
        .locator('[data-verbindung="aus"]')
        .waitFor({ timeout: 40_000 })
        .catch(() => assert.fail("40 Sekunden nach dem Ausfall steht oben immer noch kein Hinweis"));
      const satz = (await hinweis.innerText()).trim();
      assert.match(satz, /^JARVIS antwortet seit \d\d:\d\d Uhr nicht\. Du siehst den Stand von davor, und Änderungen kommen gerade nicht an\.$/, `der Hinweis nennt die Zeit der letzten Antwort (${satz})`);
      await main.getByText("Statiker anrufen").first().waitFor({ timeout: 5_000 });
      assert.deepEqual(await arten(seite), [], "der Raum zeigt weiter seinen Stand und behauptet nicht, er lasse sich nicht laden");
      assert.deepEqual(await scheibenZahlen(seite), ["3", "0", "0"]);
      if (bilder) await seite.screenshot({ path: path.join(bilder, "aus-spaeter.png") });
      // Eine Änderung sagt in einem Satz, woran es liegt.
      await main.getByRole("button", { name: "Angebot prüfen erledigt" }).click();
      await main.getByText("JARVIS antwortet gerade nicht. Versuch es gleich noch einmal.").first().waitFor({ timeout: 10_000 }).catch(async () => assert.fail(`nach „erledigt“ steht nicht da, dass JARVIS nicht antwortet. Da steht: ${(await text(seite)).replace(/\n+/g, " | ").slice(0, 400)}`));
      // „Neu laden“ lässt alles stehen; der Hinweis oben erklärt es.
      await main.getByRole("button", { name: "Neu laden" }).click();
      await seite.waitForTimeout(1500);
      await main.getByText("Statiker anrufen").first().waitFor({ timeout: 5_000 });
      // Im Gespräch sagt JARVIS denselben Satz (vorher las er „Failed to fetch“ vor).
      const feld = seite.getByRole("textbox", { name: "Nachricht an JARVIS" });
      await feld.fill("Notiere Probe im Ausfall");
      await feld.press("Enter");
      await seite.waitForTimeout(1500);
      await seite.locator("[data-antwortzeile]").click();
      const gespraech = seite.getByRole("region", { name: "Gespräch" });
      await gespraech.getByText("JARVIS antwortet gerade nicht. Versuch es gleich noch einmal.").first().waitFor({ timeout: 10_000 }).catch(async () => assert.fail(`im Gespräch steht nicht, dass JARVIS nicht antwortet. Da steht: ${(await gespraech.innerText()).replace(/\n+/g, " | ").slice(-300)}`));
      // Eine freie Frage geht einen anderen Weg (die Antwort käme Stück für Stück): derselbe Satz, ein zweites Mal.
      const frei = seite.getByRole("textbox", { name: "Nachricht an JARVIS" });
      await frei.fill("Warum ist der Himmel blau?");
      await frei.press("Enter");
      await gespraech
        .getByText("JARVIS antwortet gerade nicht. Versuch es gleich noch einmal.")
        .nth(1)
        .waitFor({ timeout: 10_000 })
        .catch(async () => assert.fail(`nach der freien Frage steht im Gespräch nicht, dass JARVIS nicht antwortet. Da steht: ${(await gespraech.innerText()).replace(/\n+/g, " | ").slice(-300)}`));
      assert.doesNotMatch(await seite.locator("body").innerText(), /Failed to fetch|Load failed/, "nirgends steht der Fehler des Browsers");
      // JARVIS kommt zurück: Der Hinweis verschwindet von selbst.
      await seite.unroute(lesen, aus);
      await seite
        .locator('[data-verbindung="da"]')
        .waitFor({ state: "attached", timeout: 40_000 })
        .catch(() => assert.fail("40 Sekunden, nachdem JARVIS wieder antwortet, steht der Hinweis immer noch da"));
      assert.equal((await hinweis.innerText()).trim(), "");
      await seite.context().close();
    }
    schritt("fällt JARVIS aus, nachdem der Raum gelesen war, steht oben, seit wann er nicht antwortet; der Raum zeigt weiter seinen Stand; eine Änderung, ein Befehl und eine freie Frage im Gespräch sagen „JARVIS antwortet gerade nicht“ statt „Failed to fetch“; kommt er zurück, verschwindet der Hinweis");

    // 9. Auch eine einzelne Abfrage gibt nach ihrer Frist auf (30 Sekunden): eine Akte und der Raum Browser. Vorher
    //    stand dort für immer „lädt noch“, und der Raum Browser schickte alle zweieinhalb Sekunden eine weitere
    //    Abfrage hinterher, die auch hängen blieb. Wird der Raum verlassen, endet, was noch unterwegs ist.
    {
      // Hält lesende Abfragen fest, bis die Prüfung sie freigibt; dann gehen sie durch, auch die schon wartenden
      // (sonst hinge eine, die kurz vor dem Freigeben losging, noch ihre ganze Frist lang).
      type Abfrage = Parameters<Parameters<Page["route"]>[1]>[0];
      const halte = () => {
        const wartend: Abfrage[] = [];
        let frei = false;
        return {
          griff: (r: Abfrage) => {
            if (frei || !istLesen(r.request().method())) return r.continue();
            wartend.push(r);
          },
          gibFrei: async () => {
            frei = true;
            for (const r of wartend.splice(0)) await r.continue().catch(() => {});
          },
        };
      };
      const seite = await neueSeite();
      const akte = /\/api\/projekte\?projekt=/;
      const beendet: number[] = [];
      let start = 0;
      seite.on("requestfailed", (r) => {
        if (akte.test(r.url())) beendet.push(Date.now() - start);
      });
      const akteHalt = halte();
      await seite.route(akte, akteHalt.griff);
      await seite.goto(`${BASIS}/projekte`, { waitUntil: "domcontentloaded" });
      const main = seite.locator("main:visible");
      await main.getByRole("region", { name: "Projekte" }).getByText("Hallenneubau").first().click();
      start = Date.now();
      await main.locator('[data-ladestand="laedt"]', { hasText: "Die Akte lädt noch." }).waitFor({ timeout: 10_000 });

      // Währenddessen der Raum Browser, in einem eigenen Fenster.
      const zweite = await neueSeite();
      const status = /\/api\/browser(\?|$)/;
      let fragen = 0;
      let abgebrochen = 0;
      zweite.on("request", (r) => {
        if (status.test(r.url()) && istLesen(r.method())) fragen++;
      });
      zweite.on("requestfailed", (r) => {
        if (status.test(r.url())) abgebrochen++;
      });
      const statusHalt = halte();
      await zweite.route(status, statusHalt.griff);
      await zweite.goto(`${BASIS}/browser`, { waitUntil: "domcontentloaded" });
      const raum = zweite.locator("main:visible");
      await raum.locator('[data-ladestand="laedt"]', { hasText: "Der Browser lädt noch." }).waitFor({ timeout: 15_000 });
      await zweite.waitForTimeout(12_000);
      assert.equal(fragen, 1, `solange eine Abfrage unterwegs ist, schickt der Raum Browser keine weitere hinterher (${fragen} in zwölf Sekunden)`);
      assert.ok((await arten(zweite)).includes("laedt: Der Browser lädt noch."), "nach zwölf Sekunden lädt es noch (die Frist ist nicht zu knapp)");
      assert.equal(abgebrochen, 0);
      // Raum verlassen: Die hängende Abfrage endet sofort, nicht erst nach ihrer Frist.
      await zweite.getByRole("navigation", { name: "Räume" }).getByRole("link", { name: /^Aufgaben/ }).click();
      await zweite.locator("main:visible").getByText("Statiker anrufen").first().waitFor({ timeout: 15_000 });
      await zweite.waitForTimeout(1_000);
      assert.equal(abgebrochen, 1, `wird der Raum Browser verlassen, endet seine hängende Abfrage sofort (beendet: ${abgebrochen})`);
      // Zurück im Raum: Nach der Frist steht da, dass er sich nicht laden lässt.
      await zweite.goBack();
      await zweite
        .locator("main:visible")
        .locator('[data-ladestand="gestoert"]', { hasText: "Der Browser lässt sich gerade nicht laden." })
        .waitFor({ timeout: 45_000 })
        .catch(async () => assert.fail(`nach 45 Sekunden ohne Antwort steht im Raum Browser immer noch nicht, dass er sich nicht laden lässt. Da steht: ${(await arten(zweite)).join(" | ")}`));

      await main
        .locator('[data-ladestand="gestoert"]', { hasText: "Die Akte lässt sich gerade nicht laden." })
        .waitFor({ timeout: 15_000 })
        .catch(async () => assert.fail(`nach 45 Sekunden ohne Antwort steht immer noch nicht da, dass die Akte sich nicht laden lässt. Da steht: ${(await arten(seite)).join(" | ")}`));
      assert.ok(beendet.length >= 1 && beendet[0] >= 28_000, `die hängende Abfrage nach der Akte ist nach ihrer Frist beendet, nicht früher (beendet nach ${beendet.join(", ")} ms)`);
      // Antwortet JARVIS wieder, stehen beide von selbst da.
      await akteHalt.gibFrei();
      await main.getByText("Projektakte").waitFor({ timeout: 25_000 });
      assert.deepEqual(await arten(seite), [], "die Akte ist da, kein Satz mehr");
      await statusHalt.gibFrei();
      await zweite.locator("main:visible").locator("[data-ladestand]").first().waitFor({ state: "detached", timeout: 25_000 });
      await seite.context().close();
      await zweite.context().close();
    }
    schritt("auch eine einzelne Abfrage gibt nach 30 Sekunden auf: Die Akte und der Raum Browser sagen dann, dass sie sich nicht laden lassen; der Raum Browser schickt keine Abfragen hinterher und beendet seine, wenn er verlassen wird; antwortet JARVIS wieder, stehen beide von selbst da");

    // 10. JARVIS hängt ganz: Nichts wird mehr beantwortet, auch keine Änderung (in Schritt 8 war er weg, und jede
    //     Anfrage scheiterte sofort). Dann laufen erst die Fristen der Abfragen ab; danach steht oben derselbe
    //     Hinweis. Eine Änderung, die gerade unterwegs ist, wird nicht abgebrochen: Kommt JARVIS zurück, kommt sie
    //     an, genau einmal.
    {
      type Abfrage = Parameters<Parameters<Page["route"]>[1]>[0];
      const wartend: Abfrage[] = [];
      let haengt = false;
      const seite = await neueSeite();
      await seite.route(lesen, (r) => {
        if (!haengt) return r.continue();
        wartend.push(r);
      });
      await seite.goto(`${BASIS}/aufgaben`, { waitUntil: "domcontentloaded" });
      const main = seite.locator("main:visible");
      await main.getByText("Statiker anrufen").first().waitFor({ timeout: 25_000 });
      assert.deepEqual(await scheibenZahlen(seite), ["3", "0", "0"]);
      haengt = true;
      const seit = Date.now();
      await main.getByRole("button", { name: "Statiker anrufen erledigt" }).click();
      await seite
        .locator('[data-verbindung="aus"]')
        .waitFor({ timeout: 70_000 })
        .catch(() => assert.fail("70 Sekunden, nachdem JARVIS hängt, steht oben immer noch kein Hinweis"));
      const dauer = Date.now() - seit;
      assert.ok(dauer >= 30_000, `der Hinweis kommt erst, wenn Fristen abgelaufen sind, nicht nach ${dauer} ms`);
      assert.match((await seite.locator("[data-verbindung]").innerText()).trim(), /^JARVIS antwortet seit \d\d:\d\d Uhr nicht\. Du siehst den Stand von davor, und Änderungen kommen gerade nicht an\.$/);
      // Die Änderung ist noch unterwegs: Sie wird nicht von selbst abgebrochen (sonst käme sie nach einem zweiten
      // Klick womöglich doppelt an), und es steht auch kein Fehler dazu da.
      assert.doesNotMatch(await text(seite), /JARVIS antwortet gerade nicht\. Versuch es|Das dauert gerade zu lange|Failed to fetch/);
      assert.ok(wartend.some((r) => r.request().method() === "POST"), "die Änderung wartet noch");
      // JARVIS antwortet wieder: Die Änderung kommt an, der Hinweis verschwindet, und die Aufgabe ist einmal erledigt.
      haengt = false;
      for (const r of wartend.splice(0)) await r.continue().catch(() => {});
      await seite
        .locator('[data-verbindung="da"]')
        .waitFor({ state: "attached", timeout: 40_000 })
        .catch(() => assert.fail("40 Sekunden, nachdem JARVIS wieder antwortet, steht der Hinweis immer noch da"));
      for (let i = 0; i < 40 && (await scheibenZahlen(seite)).join() !== "2,0,1"; i++) await seite.waitForTimeout(500);
      assert.deepEqual(await scheibenZahlen(seite), ["2", "0", "1"], "die Änderung ist angekommen, genau einmal");
      await seite.context().close();
    }
    schritt("hängt JARVIS ganz, steht nach Ablauf der Fristen oben derselbe Hinweis; eine Änderung, die unterwegs ist, wird nicht abgebrochen und kommt genau einmal an, wenn JARVIS wieder antwortet");
  } finally {
    await browser?.close();
    await server.stopLeise();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
