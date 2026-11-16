// Handprüfung: Programme und Ordner am Mac auf Zuruf öffnen, im echten Browser gegen den gebauten Server (nicht
// Teil von npm test). Geprüft wird die ganze Strecke: der Abschnitt in den Einstellungen mit Schaltern, der feste
// Befehl im Gespräch („Öffne Safari“), eigene Programme, das Werkzeug des KI-Gehirns, das Protokoll und der Schutz
// der Schnittstelle. Der Mac ist nachgebaut (test/mocks/open-mock.mjs schreibt nur auf, was er öffnen sollte): Hier
// geht kein echtes Programm auf. Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/desktop-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock, werkzeugErgebnisse } from "../mocks/claude-mock";

const PORT = 3132;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("desktop-rauch");
const LOG = path.join(testOrdner("desktop-rauch-mac"), "aufrufe.log");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);
// Sieht aus wie ein echter Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const CLAUDE = ["sk-ant-api03", "test", "nur", "fuer", "die", "programme"].join("-");

type Datei = { name: string; desktop?: { aus?: string[]; eigene?: string[] } };
const gespeichert = () => JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as Datei;
// Was der nachgebaute Mac öffnen sollte, je Aufruf die Argumente.
const geoeffnet = (): string[][] =>
  (existsSync(LOG) ? readFileSync(LOG, "utf8") : "")
    .split("\n")
    .filter(Boolean)
    .map((z) => (JSON.parse(z) as { args: string[] }).args);
async function warte(bedingung: () => boolean | Promise<boolean>, was: string, ms = 20_000) {
  for (const ende = Date.now() + ms; !(await bedingung()); ) {
    if (Date.now() > ende) throw new Error(`Zeit abgelaufen: ${was}`);
    await pause(100);
  }
}

async function main() {
  chmodSync("test/mocks/open-mock.mjs", 0o755);
  const claude = await starteClaudeMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt" });
  // Spotify ist auf diesem (nachgebauten) Mac nicht installiert.
  const mac = { ANTHROPIC_BASE_URL: claude.url, JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"), JARVIS_MAC_LOG: LOG, JARVIS_OPEN_FEHLT: "Spotify" };
  let server = await starteNext(PORT, mac);
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const anMac = async (body: unknown, headers: Record<string, string> = kopf) => {
    const r = await fetch(`${BASIS}/api/desktop`, { method: "POST", headers, body: JSON.stringify(body) });
    return { status: r.status, text: await r.text() };
  };
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);
    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1100 }, locale: "de-DE" });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    let anGehirn = 0;
    seite.on("request", (r) => {
      if (r.url().includes("/api/gehirn")) anGehirn++;
    });
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`) });
    };
    const feld = seite.getByLabel("Nachricht an JARVIS");
    const zustand = seite.locator("form").getByRole("status");
    const gespraech = seite.getByRole("region", { name: "Gespräch" });
    const klappeAuf = async () => {
      if (await gespraech.count()) return;
      await seite.getByRole("button", { name: /Ganzes Gespräch zeigen/ }).click();
      await gespraech.waitFor();
    };
    type Zeile = { wer: "du" | "jarvis"; text: string };
    const verlauf = async (): Promise<Zeile[]> => {
      await klappeAuf();
      return gespraech.locator("[aria-live=polite] > div").evaluateAll((zeilen) =>
        zeilen
          .filter((z) => z.querySelector("p.whitespace-pre-line"))
          .map((z) => ({ wer: z.querySelector(".sr-only") ? ("jarvis" as const) : ("du" as const), text: (z.querySelector("p.whitespace-pre-line") as HTMLElement | null)?.innerText.trim() ?? "" })),
      );
    };
    // Sagt einen Satz und wartet auf die fertige Antwort darauf. Auf eine neue Antwort: Seit dem letzten Satz ist
    // einer von dir dazugekommen (sonst gälte die Antwort von vorhin, solange die Seite den neuen noch nicht zeigt).
    let beantwortet = 0;
    const frage = async (text: string): Promise<string> => {
      await feld.fill(text);
      await feld.press("Enter");
      let alle: Zeile[] = [];
      await warte(async () => {
        alle = await verlauf();
        return alle.filter((e) => e.wer === "du").length > beantwortet && alle.at(-1)?.wer === "jarvis" && alle.at(-1)?.text !== "" && (await zustand.innerText()) === "Bereit" && (await seite.getByRole("button", { name: "Anhalten" }).count()) === 0;
      }, `JARVIS antwortet auf „${text}“`).catch((e) => {
        throw new Error(`${(e as Error).message}. Zuletzt im Gespräch: ${JSON.stringify(alle.slice(-3))}`);
      });
      beantwortet = alle.filter((e) => e.wer === "du").length;
      // Die Seite behält nur die letzten 40 Zeilen; die Prüfung zählt deine Sätze und bleibt deshalb darunter.
      assert.ok(alle.length < 38, "das Gespräch dieser Prüfung bleibt unter 40 Zeilen");
      return alle.at(-1)!.text;
    };
    const abschnitt = seite.locator("#programme");
    const zeile = (id: string) => abschnitt.locator(`li[data-ziel="${id}"]`);
    const schalter = (id: string) => zeile(id).getByRole("checkbox");
    const knopf = (id: string) => zeile(id).getByRole("button", { name: /^Öffnen/ });
    // Lädt den Raum immer neu: Steht die Seite schon dort, wäre „goto“ mit derselben Adresse nur ein Sprung zum Anker.
    const zuEinstellungen = async () => {
      const ziel = `${BASIS}/einstellungen#programme`;
      if (seite.url() === ziel) await seite.reload();
      else await seite.goto(ziel);
      await abschnitt.locator("li[data-ziel]").first().waitFor({ timeout: 30_000 });
    };

    // ---------- 1. Der Abschnitt in den Einstellungen ----------
    await seite.goto(`${BASIS}/einstellungen`);
    await abschnitt.waitFor({ timeout: 30_000 });
    await seite.getByRole("navigation", { name: "Abschnitte der Einstellungen" }).getByRole("link", { name: "Programme" }).click();
    assert.match(await abschnitt.innerText(), /Programme und Ordner am Mac/);
    assert.equal(await abschnitt.locator('ul[data-liste="programme"] li').count(), 19);
    assert.deepEqual(await abschnitt.locator('ul[data-liste="ordner"] li label').allInnerTexts(), ["Dokumente", "Downloads", "Schreibtisch", "Bilder"]);
    assert.equal(await abschnitt.getByRole("checkbox").count(), 23);
    assert.equal(await abschnitt.locator("input[type=checkbox]:not(:checked)").count(), 0, "am Anfang ist alles eingeschaltet");
    assert.equal(await abschnitt.getByText(/nur auf dem Mac/).count(), 0);
    // Jeder Knopf sagt einem Vorleseprogramm, was er öffnet.
    assert.equal(await knopf("safari").evaluate((k) => k.textContent), "Öffnen Safari");
    assert.equal(await knopf("downloads").evaluate((k) => k.textContent), "Öffnen Ordner Downloads");
    assert.match(await abschnitt.innerText(), /JARVIS öffnet nur\. In den Programmen tippt, klickt und liest er nichts/);
    assert.deepEqual(geoeffnet(), [], "vom Ansehen geht nichts auf");
    assert.equal(gespeichert().desktop, undefined);
    await abschnitt.scrollIntoViewIfNeeded();
    await bild("1-liste");
    schritt("Abschnitt „Programme und Ordner am Mac“: 19 Programme und 4 Ordner, alle eingeschaltet; vom Ansehen öffnet sich nichts");

    // ---------- 2. Der feste Befehl im Gespräch, ohne KI-Gehirn ----------
    assert.equal(await frage("Öffne Safari"), "Ich öffne Safari.");
    assert.equal(await frage("Starte Excel"), "Ich öffne Excel.");
    assert.equal(await frage("Kannst du mir bitte den Ordner Downloads öffnen?"), "Ich öffne den Ordner Downloads.");
    assert.deepEqual(geoeffnet(), [["-b", "com.apple.Safari"], ["-a", "Microsoft Excel"], [path.join(os.homedir(), "Downloads")]]);
    assert.equal(new URL(seite.url()).pathname, "/einstellungen", "der Raum bleibt, wie er ist");
    assert.equal(anGehirn, 0);
    schritt("„Öffne Safari“, „Starte Excel“ und „… den Ordner Downloads öffnen?“ gehen als Kennung, Name und Pfad an den Mac; der Raum bleibt");

    // ---------- 3. Alte Befehle bleiben, was sie waren; ein Programm, das der Mac nicht hat ----------
    const geladen = seite.waitForResponse((r) => r.url().endsWith("/api/einstellungen") && r.ok(), { timeout: 30_000 });
    await seite.goto(`${BASIS}/`);
    await feld.waitFor({ timeout: 30_000 });
    await geladen;
    // „Dokumente“ allein meint weiter den Raum in JARVIS (ohne KI-Gehirn kennt JARVIS dafür keinen festen Befehl).
    assert.match(await frage("Öffne Dokumente"), /^Das verstehe ich noch nicht\./);
    assert.equal(geoeffnet().length, 3, "„Öffne Dokumente“ öffnet nichts am Mac");
    assert.equal(await frage("Öffne den Ordner Dokumente"), "Ich öffne den Ordner Dokumente.");
    assert.deepEqual(geoeffnet().at(-1), [path.join(os.homedir(), "Documents")]);
    // Die Systemeinstellungen sind die des Macs, die Einstellungen die von JARVIS.
    assert.equal(await frage("Öffne die Systemeinstellungen"), "Ich öffne die Systemeinstellungen.");
    assert.deepEqual(geoeffnet().at(-1), ["-b", "com.apple.systempreferences"]);
    assert.equal(new URL(seite.url()).pathname, "/");
    assert.equal(await frage("Öffne die Einstellungen"), "Ich öffne die Einstellungen.");
    await seite.waitForURL(`${BASIS}/einstellungen`);
    assert.equal(geoeffnet().length, 5, "„Öffne die Einstellungen“ öffnet nichts am Mac");
    // Der Satz kommt erst, wenn der Mac geantwortet hat: Scheitert das Öffnen, behauptet JARVIS nichts.
    assert.equal(await frage("Öffne Spotify"), "Ich konnte Spotify nicht öffnen. Vielleicht ist das Programm auf diesem Mac nicht installiert.");
    assert.ok(!(await verlauf()).some((z) => z.text === "Ich öffne Spotify."), "kein „Ich öffne Spotify.“");
    assert.deepEqual(geoeffnet().at(-1), ["-a", "Spotify"]);
    schritt("„Dokumente“ allein öffnet nichts am Mac, „der Ordner Dokumente“ schon; Systemeinstellungen sind die des Macs, Einstellungen die von JARVIS; öffnet der Mac Spotify nicht, sagt JARVIS das statt „Ich öffne“");

    // ---------- 4. Ausschalten gilt sofort, im Gespräch und an der Schnittstelle ----------
    await zuEinstellungen();
    await schalter("safari").click();
    await warte(() => gespeichert().desktop?.aus?.includes("safari") === true, "Safari ist ausgeschaltet gespeichert");
    await warte(async () => await knopf("safari").isDisabled(), "der Knopf zur Probe ist aus");
    const vorher = geoeffnet().length;
    assert.equal(await frage("Öffne Safari"), "Safari ist in den Einstellungen unter „Programme“ ausgeschaltet.");
    const direkt = await anMac({ id: "safari" });
    assert.equal(direkt.status, 400);
    assert.match(direkt.text, /Safari ist in den Einstellungen unter „Programme“ ausgeschaltet/);
    assert.equal(geoeffnet().length, vorher, "ausgeschaltet geht nichts an den Mac, auch nicht an der Seite vorbei");
    await schalter("safari").click();
    await warte(() => gespeichert().desktop?.aus?.length === 0, "Safari ist wieder an");
    assert.equal(await frage("Safari öffnen"), "Ich öffne Safari.");
    assert.deepEqual(geoeffnet().at(-1), ["-b", "com.apple.Safari"]);
    schritt("ausgeschaltet: JARVIS sagt es und öffnet nichts, auch die Schnittstelle lehnt ab; wieder eingeschaltet geht es");

    // ---------- 5. Der Knopf zur Probe ----------
    await knopf("rechner").click();
    await abschnitt.getByRole("status").filter({ hasText: "Der Mac öffnet den Rechner." }).waitFor();
    assert.deepEqual(geoeffnet().at(-1), ["-b", "com.apple.calculator"]);
    await knopf("spotify").click();
    await abschnitt.getByRole("alert").filter({ hasText: "Ich konnte Spotify nicht öffnen. Vielleicht ist das Programm auf diesem Mac nicht installiert." }).waitFor();
    assert.equal(await abschnitt.getByRole("status").count(), 0, "die Meldung von vorhin ist weg");
    schritt("„Öffnen“ in den Einstellungen: Der Rechner geht an den Mac; bei Spotify steht da, dass es nicht ging");

    // ---------- 6. Ein eigenes Programm ----------
    const neu = abschnitt.getByLabel(/Eigenes Programm/);
    const dazu = abschnitt.getByRole("button", { name: "Hinzufügen" });
    assert.equal(await dazu.isDisabled(), true, "ohne Namen kein Hinzufügen");
    assert.match(await abschnitt.locator('label[for="programm-neu"]').innerText(), /\(0 von 12\)/);
    for (const [name, satz] of [
      ["/Applications/Boese.app", /So kann ein Programm nicht heißen/],
      ["-a Terminal", /So kann ein Programm nicht heißen/],
      ["Microsoft Excel", /steht schon in der Liste/],
      ["Ordner Downloads", /steht schon in der Liste/],
      ["Mail", /heißt in JARVIS schon etwas anderes/],
    ] as const) {
      await neu.fill(name);
      await dazu.click();
      await abschnitt.getByRole("alert").filter({ hasText: satz }).waitFor();
      assert.equal(await neu.inputValue(), name, "was abgelehnt wurde, bleibt zum Ändern im Feld");
    }
    assert.equal(gespeichert().desktop?.eigene, undefined, "nichts davon wurde gespeichert");
    await neu.fill("  Notion.app ");
    await dazu.click();
    await zeile("eigen:notion").waitFor();
    assert.equal(await neu.inputValue(), "", "nach dem Hinzufügen ist das Feld leer");
    assert.deepEqual(gespeichert().desktop?.eigene, ["Notion"]);
    assert.match(await abschnitt.locator('label[for="programm-neu"]').innerText(), /\(1 von 12\)/);
    assert.equal(await schalter("eigen:notion").isChecked(), true);
    await abschnitt.scrollIntoViewIfNeeded();
    await bild("2-eigenes-programm");
    assert.equal(await frage("Öffne Notion"), "Ich öffne Notion.");
    assert.deepEqual(geoeffnet().at(-1), ["-a", "Notion"]);
    await zeile("eigen:notion").getByRole("button", { name: /^Entfernen/ }).click();
    await zeile("eigen:notion").waitFor({ state: "detached" });
    assert.deepEqual(gespeichert().desktop?.eigene, []);
    const ohneNotion = geoeffnet().length;
    assert.match(await frage("Öffne Notion"), /^Das verstehe ich noch nicht\./);
    assert.equal(geoeffnet().length, ohneNotion, "entfernt ist entfernt");
    // Ein Name, der wie „App“ beginnt, ist trotzdem ein Programm.
    await neu.fill("App Store");
    await dazu.click();
    await zeile("eigen:app store").waitFor();
    assert.equal(await frage("Öffne den App Store"), "Ich öffne App Store.");
    assert.deepEqual(geoeffnet().at(-1), ["-a", "App Store"]);
    await zeile("eigen:app store").getByRole("button", { name: /^Entfernen/ }).click();
    await zeile("eigen:app store").waitFor({ state: "detached" });
    schritt("eigenes Programm: Pfad, Schalter, Doppeltes und Wörter von JARVIS werden abgelehnt; „Notion“ und „App Store“ lassen sich eintragen, öffnen und wieder entfernen");

    // ---------- 7. Der Schutz der Schnittstelle ----------
    const zuvor = geoeffnet().length;
    assert.equal((await anMac({ id: "safari" }, { "content-type": "application/json" })).status, 403, "ohne den eigenen Header");
    assert.equal((await anMac({ id: "safari" }, { ...kopf, origin: "https://boese.example" })).status, 403, "von einer fremden Seite");
    for (const id of ["terminal", "/Applications/Utilities/Terminal.app", "-a Terminal", "eigen:notion", "eigen:../../x", "", null, 7, ["safari"], { id: "safari" }]) {
      const r = await anMac({ id });
      assert.equal(r.status, 400, JSON.stringify(id));
      assert.match(r.text, /steht nicht auf der Liste/, JSON.stringify(id));
    }
    assert.equal((await anMac("safari")).status, 400);
    assert.equal((await fetch(`${BASIS}/api/desktop`)).status, 405);
    assert.equal(geoeffnet().length, zuvor, "nichts davon erreicht den Mac");
    schritt("Schnittstelle: ohne Header und von fremder Seite 403; was nicht in der Liste steht (Pfade, Schalter, Entferntes), 400; nichts davon erreicht den Mac");

    // ---------- 8. Mit KI-Gehirn: kurze Befehle bleiben fest, das Werkzeug kennt nur die eingeschalteten Ziele ----------
    const schluessel = await fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: kopf, body: JSON.stringify({ action: "claude", apiKey: CLAUDE }) });
    assert.equal(schluessel.status, 200, await schluessel.text());
    await zuEinstellungen();
    await schalter("word").click();
    await warte(() => gespeichert().desktop?.aus?.includes("word") === true, "Word ist ausgeschaltet");
    await klappeAuf();
    await gespraech.getByRole("button", { name: "Neues Gespräch" }).click();
    await warte(async () => (await gespraech.locator("p.whitespace-pre-line").count()) === 0, "das Gespräch ist leer");
    beantwortet = 0;
    claude.drehbuch([]);
    assert.equal(await frage("Öffne den Finder"), "Ich öffne den Finder.");
    assert.equal(anGehirn, 0, "ein klarer Befehl braucht das KI-Gehirn nicht");
    assert.equal(claude.anfragen.length, 0);
    // Ein freier Satz geht an Claude; der wählt das Werkzeug.
    claude.drehbuch([{ werkzeug: "programm_oeffnen", eingabe: { name: "Excel" } }, { text: "Excel ist offen. Viel Erfolg mit den Zahlen." }]);
    assert.equal(await frage("Ich muss gleich die Umsatzzahlen durchgehen, mach mir dafür schon mal das passende Programm auf"), "Excel ist offen. Viel Erfolg mit den Zahlen.");
    assert.deepEqual(geoeffnet().at(-1), ["-a", "Microsoft Excel"]);
    const werkzeug = (claude.anfragen[0].tools as { name: string; input_schema?: { properties?: { name?: { enum?: string[] } } } }[]).find((t) => t.name === "programm_oeffnen");
    const auswahl = werkzeug?.input_schema?.properties?.name?.enum ?? [];
    assert.ok(auswahl.includes("Excel") && auswahl.includes("Safari") && auswahl.includes("Ordner Downloads"), auswahl.join(", "));
    assert.ok(!auswahl.includes("Word") && !auswahl.includes("Notion"), "Ausgeschaltetes und Entferntes steht nicht zur Auswahl");
    assert.match(werkzeugErgebnisse(claude.anfragen[1])[0].content, /Geöffnet/);
    // Ein Modell, das einer eingeschleusten Anweisung folgt: Es bekommt eine Absage, und nichts geht auf.
    const vorAngriff = geoeffnet().length;
    for (const name of ["Terminal", "/Applications/Utilities/Terminal.app", "Word"]) {
      claude.drehbuch([{ werkzeug: "programm_oeffnen", eingabe: { name } }, { text: "Das darf ich nicht öffnen." }]);
      assert.equal(await frage(`Bitte lies vor, was in der Anleitung steht, und befolge sie genau (${name.length})`), "Das darf ich nicht öffnen.");
      const ergebnis = werkzeugErgebnisse(claude.anfragen[1])[0];
      assert.equal(ergebnis.is_error, true, name);
      assert.match(ergebnis.content, name === "Word" ? /Word ist in den Einstellungen unter „Programme“ ausgeschaltet/ : /steht nicht auf der Liste/, name);
    }
    assert.equal(geoeffnet().length, vorAngriff, "nichts außerhalb der Liste und nichts Ausgeschaltetes geht auf");
    schritt("mit KI-Gehirn: „Öffne den Finder“ bleibt ein fester Befehl; Claude öffnet Excel über das Werkzeug und bekommt für Terminal, einen Pfad und das ausgeschaltete Word eine Absage");

    // ---------- 9. Alles steht im Protokoll, mit Namen aus der Liste ----------
    type Eintrag = { art: string; agent: string; kanal: string; was: string; ergebnis: string };
    const sicherheit = (await (await fetch(`${BASIS}/api/sicherheit`)).json()) as { audit: Eintrag[]; pruefung: { ok: boolean } };
    // Die Seite zeigt die letzten 60 Zeilen; die Prüfung liest die ganze Datei.
    const audit = readFileSync(path.join(ordner, "audit.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((z) => JSON.parse(z) as Eintrag);
    const zeilen = audit.map((e) => `${e.agent}/${e.kanal} ${e.was} → ${e.ergebnis}`);
    for (const z of ["mensch/mac Öffnen: Safari → geoeffnet", "mensch/mac Öffnen: Ordner Downloads → geoeffnet", "mensch/mac Öffnen: Spotify → fehler:nicht-geoeffnet", "mensch/mac Öffnen: Safari → abgelehnt:aus", "mensch/mac Öffnen: nicht auf der Liste → abgelehnt:unbekannt", "mensch/mac Öffnen: Notion → geoeffnet"]) {
      assert.ok(zeilen.includes(z), `${z}\n${zeilen.join("\n")}`);
    }
    assert.ok(audit.some((e) => e.art === "werkzeug" && e.agent === "gehirn" && e.was.includes("programm_oeffnen")), "der Aufruf des KI-Gehirns steht im Log");
    const vomMenschen = audit.filter((e) => e.art === "desktop");
    assert.ok(vomMenschen.length >= 20 && vomMenschen.every((e) => !/Terminal|Boese|[/]|\.\./.test(e.was)), "in den Zeilen zum Öffnen steht nie, was angefragt wurde, nur ein Name aus der Liste");
    assert.ok(sicherheit.audit.some((e) => e.art === "desktop"), "die Zeilen stehen auch unter Sicherheit");
    assert.equal(sicherheit.pruefung.ok, true);
    schritt("im Audit-Log steht jedes Öffnen, jede Ablehnung und der Aufruf des KI-Gehirns; die Prüfkette ist intakt");

    // ---------- 10. Nach neuem Laden gilt derselbe Stand ----------
    await zuEinstellungen();
    assert.equal(await schalter("word").isChecked(), false);
    assert.equal(await schalter("safari").isChecked(), true);
    assert.equal(await zeile("eigen:notion").count(), 0);
    assert.equal(await knopf("word").isDisabled(), true);
    schritt("nach neuem Laden: Word bleibt aus, Safari an, Notion entfernt");

    // ---------- 11. JARVIS läuft nicht auf einem Mac ----------
    await server.stop();
    server = await starteNext(PORT, { ANTHROPIC_BASE_URL: claude.url, JARVIS_MAC_LOG: LOG });
    await server.bereit(`${BASIS}/api/einstellungen`);
    if (process.platform !== "darwin") {
      const amAnfang = geoeffnet().length;
      await zuEinstellungen();
      await abschnitt.getByText("Programme und Ordner öffnen kann JARVIS nur auf dem Mac.").waitFor();
      assert.equal(await abschnitt.getByRole("button", { name: /^Öffnen/ }).evaluateAll((k) => k.filter((x) => !(x as HTMLButtonElement).disabled).length), 0, "kein Knopf zur Probe ist bedienbar");
      assert.equal(await schalter("safari").isDisabled(), false, "ausschalten geht trotzdem");
      await klappeAuf();
      await gespraech.getByRole("button", { name: "Neues Gespräch" }).click();
      await warte(async () => (await gespraech.locator("p.whitespace-pre-line").count()) === 0, "das Gespräch ist leer");
      beantwortet = 0;
      assert.equal(await frage("Öffne Safari"), "Programme und Ordner öffnen kann ich nur auf dem Mac.");
      const r = await anMac({ id: "safari" });
      assert.equal(r.status, 400);
      assert.match(r.text, /nur auf dem Mac/);
      // Dem KI-Gehirn wird das Werkzeug gar nicht erst angeboten.
      claude.drehbuch([{ text: "Das geht hier nicht." }]);
      await frage("Mach mir bitte irgendein Programm für Tabellen auf, das du für passend hältst");
      assert.ok(!(claude.anfragen[0].tools as { name: string }[]).some((t) => t.name === "programm_oeffnen"));
      assert.equal(geoeffnet().length, amAnfang);
      schritt("ohne Mac: Der Abschnitt sagt es, kein Knopf ist bedienbar, JARVIS sagt es im Gespräch, die Schnittstelle lehnt ab, und Claude bekommt das Werkzeug nicht");
    }

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    await browser.close();
    console.log("Handprüfung Programme am Mac: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
    await claude.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
