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
    schritt("fällt nur ein Teil aus (Zeitplan, Wetter, Gold und Silber, Sicherheitslage, Microsoft, die Krypto-Kurse im Trading-Raum), steht nur dort der Satz; der Rest des Raums ist da");

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
