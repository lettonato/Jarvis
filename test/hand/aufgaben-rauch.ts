// Handprüfung: der Raum Aufgaben, im echten Browser gegen den gebauten Server und einen Obsidian-Tresor, der nur
// ein Testordner ist (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/aufgaben-rauch.ts [Ordner für Bilder]
// Geprüft wird die ganze Strecke Seite → Schnittstelle → Dateien im Tresor: Tresor verbinden, Aufgaben nach
// Fälligkeit, notieren, abhaken, verschieben, eine inzwischen in Obsidian geänderte Aufgabe, ein Tresor, der
// verschwindet, und der Schutz der Schnittstelle. Obsidian selbst läuft nicht; „öffnen“ geht an ein nachgebautes
// /usr/bin/open, das nur festhält, was geöffnet werden sollte.
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { addDays, isoDate } from "../../src/lib/dates";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";

const PORT = 3121;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("aufgaben-rauch");
const TRESOR = path.join(testOrdner("aufgaben-rauch-tresor"), "Mein Tresor");
const LOG = path.join(testOrdner("aufgaben-rauch-mac"), "aufrufe.log");
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

const heute = isoDate(new Date());
const tag = (n: number) => addDays(heute, n);
const HAUS = path.join(TRESOR, "Projekte", "Haus.md");
const EINGANG = path.join(TRESOR, "JARVIS", "Eingang.md");
const zeilen = (datei: string) => readFileSync(datei, "utf8").split("\n");
const gespeichert = () => JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as { vaultPath?: string };
const geoeffnet = () =>
  (existsSync(LOG) ? readFileSync(LOG, "utf8") : "")
    .split("\n")
    .filter(Boolean)
    .map((z) => JSON.parse(z) as { programm: string; args: string[] })
    .filter((a) => a.programm === "open")
    .map((a) => a.args);

async function main() {
  // Die Daten oben gelten für heute. Kurz vor Mitternacht erst den Tageswechsel abwarten, sonst rechnet der
  // Server mitten in der Prüfung mit einem anderen Tag.
  const jetzt = new Date();
  if (jetzt.getHours() === 23 && jetzt.getMinutes() >= 58) throw new Error("Kurz vor Mitternacht: bitte in drei Minuten noch einmal starten.");
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  mkdirSync(path.dirname(HAUS), { recursive: true });
  writeFileSync(
    HAUS,
    [
      "# Haus",
      "",
      `- [ ] Angebot Dachdecker prüfen ⏫ 📅 ${tag(-1)}`,
      `- [ ] Bauamt anrufen 📅 ${heute}`,
      `- [ ] Küche planen 📅 ${tag(3)}`,
      `- [ ] Garten anlegen 📅 ${tag(30)}`,
      "- [ ] Ideen für den Keller sammeln",
      `- [ ] Müll rausbringen 🔁 every week 📅 ${heute}`,
      `- [x] Notar bestätigt ✅ ${heute}`,
      "",
    ].join("\n"),
  );
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt" });

  const server = await starteNext(PORT, { JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"), JARVIS_MAC_LOG: LOG });
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const stelle = async (body: object, headers: Record<string, string> = kopf) => {
    const r = await fetch(`${BASIS}/api/aufgaben`, { method: "POST", headers, body: JSON.stringify(body) });
    return { status: r.status, daten: (await r.json().catch(() => ({}))) as { error?: string } };
  };
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);

    // Der Schutz der Schnittstelle: ohne den eigenen Header und von fremden Seiten ändert niemand eine Aufgabe.
    const neu = { action: "add", text: "Eingeschleust" };
    assert.equal((await stelle(neu, { "content-type": "application/json" })).status, 403);
    assert.equal((await stelle(neu, { ...kopf, origin: "https://boese.example" })).status, 403);
    // Noch ist kein Tresor verbunden: Die Schnittstelle sagt es, statt irgendwohin zu schreiben.
    const ohne = await stelle(neu);
    assert.equal(ohne.status, 409);
    assert.match(ohne.daten.error ?? "", /Noch kein Obsidian-Tresor verbunden/);
    schritt("ohne Header, von fremder Seite und ohne Tresor wird nichts notiert");

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1500 }, locale: "de-DE" });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    // Die Scheibe „Auf einen Blick“ als { Zeile: Zahl }.
    const scheibe = seite.locator("section.glas").filter({ has: seite.getByRole("heading", { name: "Auf einen Blick" }) });
    const blick = async () => {
      const zeilen = await scheibe.locator("li").allInnerTexts();
      return Object.fromEntries(zeilen.map((z) => z.split("\n").map((s) => s.trim()).filter(Boolean)).map(([name, zahl]) => [name, Number(zahl)]));
    };
    // Eine Gruppe ist genau der Abschnitt mit ihrer Überschrift („Später 1“), nicht die ganze Seite.
    const gruppe = (titel: string) => seite.locator("main section").filter({ has: seite.getByRole("heading", { name: new RegExp(`^${titel} \\d+$`) }) });
    const zeile = (text: string) => seite.locator("li").filter({ has: seite.getByRole("button", { name: `${text} erledigt`, exact: true }) });

    // Ohne Tresor bietet der Raum das Verbinden an. Ein Ordner, den es nicht gibt, wird nicht angenommen.
    await seite.goto(`${BASIS}/aufgaben`);
    await seite.getByRole("heading", { name: "Mit Obsidian verbinden" }).waitFor({ timeout: 30_000 });
    await bild("0-ohne-tresor");
    const pfad = seite.getByLabel("Ordner des Obsidian-Tresors");
    await pfad.fill(path.join(TRESOR, "gibt-es-nicht"));
    await seite.getByRole("button", { name: "Verbinden" }).click();
    await seite.getByText(/Den Ordner .*gibt-es-nicht gibt es nicht\./).waitFor();
    assert.equal(gespeichert().vaultPath, undefined, "ein falscher Ordner wird nicht gespeichert");
    await pfad.fill(TRESOR);
    await seite.getByRole("button", { name: "Verbinden" }).click();
    await gruppe("Überfällig").waitFor();
    assert.equal(gespeichert().vaultPath, TRESOR);
    schritt("ein Ordner, den es nicht gibt, wird abgelehnt; der Tresor lässt sich über die Seite verbinden");

    // Die Aufgaben stehen nach Fälligkeit da, mit den Zahlen oben.
    await seite.getByText("aus deinem Obsidian-Tresor „Mein Tresor“").waitFor();
    assert.deepEqual(await blick(), { "Bis nächste Woche": 4, Überfällig: 1, "Heute erledigt": 1 });
    const titel = await seite.locator("h2").allInnerTexts().then((t) => t.map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => /\d$/.test(x)));
    assert.deepEqual(titel, ["Überfällig 1", "Heute 2", "Nächste 7 Tage 1", "Später 1", "Ohne Datum 1"]);
    assert.match(await gruppe("Überfällig").innerText(), /▲\s*Angebot Dachdecker prüfen/);
    assert.equal(await seite.getByRole("button", { name: "Müll rausbringen erledigt" }).isDisabled(), true, "wiederkehrende Aufgaben hakt JARVIS nicht ab");
    assert.equal(await seite.getByRole("link", { name: "In Obsidian öffnen", exact: true }).first().getAttribute("href"), `obsidian://open?path=${encodeURIComponent(TRESOR)}`);
    await bild("1-aufgaben");
    schritt("fünf Gruppen nach Fälligkeit, die Zahlen stimmen, die wiederkehrende Aufgabe ist nicht abhakbar");

    // Notieren: Die Aufgabe landet mit Datum und „wichtig“ in JARVIS/Eingang.md und steht sofort in der Liste.
    await seite.getByLabel("Neue Aufgabe").fill("Rechnung an Max schicken");
    await seite.getByRole("button", { name: "Morgen", exact: true }).first().click();
    await seite.getByLabel("wichtig").check();
    await seite.getByRole("button", { name: "Notieren" }).click();
    await zeile("Rechnung an Max schicken").waitFor();
    assert.ok(zeilen(EINGANG).includes(`- [ ] Rechnung an Max schicken ⏫ 📅 ${tag(1)} ➕ ${heute}`), zeilen(EINGANG).join(" | "));
    assert.match(await gruppe("Nächste 7 Tage").innerText(), /▲\s*Rechnung an Max schicken/);
    assert.equal(await seite.getByLabel("Neue Aufgabe").inputValue(), "", "das Feld ist wieder leer");
    assert.equal((await blick())["Bis nächste Woche"], 5);
    schritt("eine neue Aufgabe steht in JARVIS/Eingang.md und in der Liste");

    // Abhaken: In der Datei steht das Häkchen mit dem Datum von heute; sonst ändert sich an der Datei nichts.
    const vorher = zeilen(HAUS);
    await seite.getByRole("button", { name: "Bauamt anrufen erledigt" }).click();
    await zeile("Bauamt anrufen").waitFor({ state: "detached" });
    const nachher = zeilen(HAUS);
    assert.equal(nachher[3], `- [x] Bauamt anrufen 📅 ${heute} ✅ ${heute}`);
    assert.deepEqual(nachher.filter((_, i) => i !== 3), vorher.filter((_, i) => i !== 3), "die übrigen Zeilen sind unverändert");
    assert.equal((await blick())["Heute erledigt"], 2);
    schritt("abgehakt: Häkchen und Datum stehen in der Datei, der Rest der Datei ist unverändert");

    // Verschieben: auf morgen und um eine Woche.
    await zeile("Angebot Dachdecker prüfen").getByRole("button", { name: "Morgen", exact: true }).click();
    await gruppe("Überfällig").waitFor({ state: "detached" });
    assert.equal(zeilen(HAUS)[2], `- [ ] Angebot Dachdecker prüfen ⏫ 📅 ${tag(1)}`);
    assert.equal((await blick())["Überfällig"], 0);
    await zeile("Küche planen").getByRole("button", { name: "+1 Woche" }).click();
    await gruppe("Später").getByText("Küche planen").waitFor();
    assert.equal(zeilen(HAUS)[4], `- [ ] Küche planen 📅 ${tag(10)}`);
    await bild("2-notiert-abgehakt-verschoben");
    schritt("verschoben auf morgen und um eine Woche: Das neue Datum steht in der Datei");

    // Inzwischen in Obsidian geändert: JARVIS ändert die Zeile nicht blind, sagt es und lädt neu.
    // Frisch geladen: Die Seite fragt nur einmal in der Minute neu ab, das fällt so nicht zwischen Änderung und Klick.
    await seite.reload();
    await zeile("Garten anlegen").waitFor({ timeout: 30_000 });
    const geaendert = zeilen(HAUS);
    geaendert[5] = `- [ ] Garten anlegen und Rasen säen 📅 ${tag(30)}`;
    writeFileSync(HAUS, geaendert.join("\n"));
    await zeile("Garten anlegen").getByRole("button", { name: "Morgen", exact: true }).click();
    await seite.getByText("Die Aufgabe wurde inzwischen in Obsidian geändert. Ich lade sie neu.").waitFor();
    await zeile("Garten anlegen und Rasen säen").waitFor();
    assert.deepEqual(zeilen(HAUS), geaendert, "an der geänderten Datei hat JARVIS nichts verändert");
    await bild("3-inzwischen-geaendert");
    schritt("eine in Obsidian geänderte Aufgabe wird nicht überschrieben; die Seite sagt es und lädt neu");

    // Die Schnittstelle schreibt nur in Markdown-Dateien im Tresor.
    const draussen = path.join(path.dirname(TRESOR), "draussen.md");
    writeFileSync(draussen, "- [ ] Außerhalb\n");
    const raus = await stelle({ action: "done", file: "../draussen.md", line: 0, raw: "- [ ] Außerhalb" });
    assert.equal(raus.status, 400);
    assert.match(raus.daten.error ?? "", /außerhalb des Tresors/);
    assert.equal(readFileSync(draussen, "utf8"), "- [ ] Außerhalb\n");
    writeFileSync(path.join(TRESOR, "liste.txt"), "- [ ] Keine Notiz\n");
    assert.equal((await stelle({ action: "done", file: "liste.txt", line: 0, raw: "- [ ] Keine Notiz" })).status, 400);
    assert.equal(readFileSync(path.join(TRESOR, "liste.txt"), "utf8"), "- [ ] Keine Notiz\n");
    assert.equal((await stelle({ action: "due", file: "Projekte/Haus.md", line: 6, raw: zeilen(HAUS)[6], date: "morgen" })).status, 400);
    schritt("außerhalb des Tresors, in anderen Dateien und mit ungültigem Datum ändert die Schnittstelle nichts");

    // Öffnen (so, wie es der Zuruf „Öffne Obsidian“ auslöst): Der Mac bekommt nur einen Link auf den Tresor.
    assert.equal((await stelle({ action: "open", what: "eingang" })).status, 200);
    assert.deepEqual(geoeffnet(), [["obsidian://open?vault=Mein%20Tresor&file=JARVIS%2FEingang"]]);
    schritt("„öffnen“ übergibt dem Mac genau einen Link auf die Eingangsliste im Tresor");

    // Der Tresor ist weg (umbenannt, Platte abgezogen): Das sieht nicht aus wie „alles erledigt“.
    renameSync(TRESOR, `${TRESOR} alt`);
    await seite.getByRole("button", { name: "Neu laden" }).click();
    await seite.getByText(/Den Ordner .*Mein Tresor gibt es nicht\./).waitFor();
    await bild("4-tresor-fehlt");
    assert.equal(await seite.getByText("Keine offenen Aufgaben. Alles erledigt.").count(), 0, "ein fehlender Tresor heißt nicht „alles erledigt“");
    assert.equal(await scheibe.count(), 0, "und es stehen keine Nullen da, als wäre nichts offen");
    assert.equal(await seite.getByRole("button", { name: "Notieren" }).count(), 0, "in einen Tresor, den es nicht gibt, lässt sich nichts notieren");
    // Auch „Heute“ und „Fokus“ sagen dann nicht, es sei nichts fällig.
    await seite.goto(`${BASIS}/heute`);
    await seite.getByText("Der Obsidian-Tresor lässt sich gerade nicht lesen.").first().waitFor({ timeout: 30_000 });
    assert.equal(await seite.getByText("Heute ist nichts fällig.").count(), 0);
    assert.equal(await seite.getByText("Sonst liegt heute nichts an.").count(), 0);
    assert.equal(await seite.getByText("Nichts wartet auf dich.").count(), 0);
    await seite.getByText("Die Aufgaben lassen sich gerade nicht lesen.").waitFor();
    await bild("5-heute-tresor-fehlt");
    await seite.goto(`${BASIS}/fokus`);
    await seite.getByText("Aufgaben gerade nicht lesbar").waitFor({ timeout: 30_000 });
    assert.equal(await seite.getByText(/Punkte? bis nächste Woche/).count(), 0);
    await seite.goto(`${BASIS}/aufgaben`);
    await seite.getByText(/Den Ordner .*Mein Tresor gibt es nicht\./).waitFor({ timeout: 30_000 });
    renameSync(`${TRESOR} alt`, TRESOR);
    await seite.getByRole("button", { name: "Neu laden" }).click();
    await zeile("Garten anlegen und Rasen säen").waitFor();
    schritt("fehlt der Tresor, steht das in Aufgaben, Heute und Fokus da, nicht „alles erledigt“; ist er wieder da, auch die Aufgaben");

    await browser.close();
    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Handprüfung Aufgaben: alle Schritte in Ordnung.");
  } finally {
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
