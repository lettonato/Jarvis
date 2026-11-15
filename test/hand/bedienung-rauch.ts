// Handprüfung: JARVIS ohne Maus und im schmalen Fenster, im echten Browser gegen den gebauten Server
// (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/bedienung-rauch.ts [Ordner für Bilder]
// Geprüft wird: Mit der Tab-Taste kommt man überall hin, und was markiert ist, ist zu sehen (nicht hinter der
// Leiste unten); die Leertaste bedient, was markiert ist, statt das Mikrofon zu starten; das Menü der Räume geht
// mit Pfeiltasten und Escape; in Handybreite läuft kein Raum seitlich über, und im Feld für JARVIS ist Platz zum
// Tippen; an den Scheiben in „Heute“ ist kein Name abgeschnitten; wer tippt, während JARVIS den Raum wechselt,
// verliert keinen Buchstaben.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page, type Route } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { mittagsZone } from "../helfer/uhrzeiten";

const PORT = 3128;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("bedienung-rauch");
const MAC = testOrdner("bedienung-rauch-mac");
const TRESOR = testOrdner("bedienung-rauch-tresor");
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

// „Kommt noch“ hängt an der Uhrzeit: Prüfung, Server und Browser bekommen eine Zeitzone, in der es Mittag ist.
const ZONE = mittagsZone();
process.env.TZ = ZONE;

const TERMINE = [
  "Besprechung Hallenneubau mit dem Architekten",
  "Jahresgespräch Steuerberatung und Abschluss",
  "Baustellenbegehung Gewerbepark Nord",
  "Abstimmung Finanzierung mit der Sparkasse",
  "Telefonat Versicherung Betriebshaftpflicht",
  "Gesellschafterversammlung im großen Besprechungsraum",
];
const RAEUME = ["heute", "aufgaben", "kalender", "post", "projekte", "trading", "intel", "agenten", "dokumente", "browser", "einstellungen"];

// Was gerade markiert ist: sein Name, ob ein Rand es zeigt und ob etwas anderes darüberliegt.
type Marke = { name: string; rand: boolean; verdeckt: boolean; imBild: boolean };
const markiert = (seite: Page): Promise<Marke | null> =>
  seite.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e || e === document.body) return null;
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
    const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const oben = document.elementFromPoint(x, y);
    // (Keine benannte Hilfsfunktion hier drin: tsx hängt ihr einen Aufruf an, den es im Browser nicht gibt.)
    const rahmen = e.tagName === "TEXTAREA" ? e.closest("[data-fokusrahmen]") : null;
    const [eigener, aussen] = [s, rahmen ? getComputedStyle(rahmen) : null].map((st) => Boolean(st && st.outlineStyle !== "none" && parseFloat(st.outlineWidth) >= 2));
    return {
      name: `${e.tagName.toLowerCase()} „${(e.innerText || e.getAttribute("aria-label") || e.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 40)}“`,
      // Das Feld für JARVIS zeigt den Rand an seinem ganzen dunklen Rahmen und dafür nicht noch einmal am Feld selbst.
      rand: rahmen ? aussen && !eigener : eigener,
      verdeckt: !(oben && (e.contains(oben) || oben.contains(e))),
      imBild: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    };
  });

// Geht mit der Tab-Taste einmal durch die ganze Seite: vom Anfang des Dokuments, bis die Markierung die Seite
// verlässt oder wieder bei einer Stelle ankommt, an der sie schon war. (Nach Namen lässt sich das nicht entscheiden:
// „Besprechen“ steht an jeder Aufgabe. Und nach einem Wechsel des Raums über das Menü stünde der Anfang sonst am
// Ende der Seite, in der Leiste; dann wäre nach drei Stellen Schluss, und die Prüfung prüfte nichts.)
async function einmalDurch(seite: Page): Promise<Marke[]> {
  await seite.evaluate(() => {
    (window as unknown as { __weg: Element[] }).__weg = [];
    const anfang = document.createElement("span");
    anfang.tabIndex = -1;
    document.body.prepend(anfang);
    anfang.focus({ preventScroll: true });
    anfang.remove();
  });
  const weg: Marke[] = [];
  let ende = "";
  for (let i = 0; i < 220 && !ende; i++) {
    await seite.keyboard.press("Tab");
    // Die Seite rollt weich zum markierten Element; erst danach steht fest, ob es zu sehen ist.
    await seite.waitForTimeout(120);
    const stand = await seite.evaluate(() => {
      const bisher = (window as unknown as { __weg: Element[] }).__weg;
      const e = document.activeElement;
      if (!e || e === document.body) return "raus";
      if (bisher.at(-1) === e) return "selbe";
      if (bisher.includes(e)) return "runde";
      bisher.push(e);
      return "neu";
    });
    if (stand === "raus" || stand === "runde") {
      if (weg.length > 0) ende = stand;
      continue;
    }
    const m = (await markiert(seite))!;
    // Ein Datumsfeld hat mehrere Haltepunkte (Tag, Monat, Jahr, der Knopf für den Kalender); am letzten zeichnet
    // der Browser den Rand im Inneren des Feldes. Sie zählen als eine Stelle: Der Rand muss an einer davon stehen.
    const davor = weg.at(-1);
    if (stand === "selbe" && davor) {
      davor.rand ||= m.rand;
      davor.verdeckt ||= m.verdeckt;
      davor.imBild &&= m.imBild;
      continue;
    }
    weg.push(m);
  }
  assert.ok(ende, `die Tab-Taste kommt einmal ganz herum (${weg.length} Stellen)`);
  return weg;
}

async function main() {
  assert.equal(new Date().getHours(), 12, "die Zeitzone der Prüfung steht auf Mittag");
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  const jetzt = new Date();
  const um = (stunde: number) => new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate(), stunde).getTime();
  const { isoDate } = await import("../../src/lib/dates");
  const heute = isoDate(jetzt);
  writeFileSync(
    path.join(MAC, "kalender.json"),
    JSON.stringify({
      zugriff: "ok",
      kalender: [{ name: "Privat", writable: true }],
      standard: "Privat",
      // Ein voller Tag mit langen Namen: der ungünstigste Fall für die schmale Scheibe „Termine heute“.
      events: TERMINE.map((title, i) => ({ id: `t${i}`, title, start: um(15 + i), end: um(16 + i), allDay: false, location: "", calendar: "Privat" })),
    }),
  );
  // Genug Aufgaben, dass der Raum Aufgaben weit über den Bildschirm hinausreicht.
  mkdirSync(path.join(TRESOR, "Aufgaben"), { recursive: true });
  writeFileSync(path.join(TRESOR, "Aufgaben", "Haus.md"), Array.from({ length: 14 }, (_, i) => `- [ ] Aufgabe Nummer ${i + 1} 📅 ${heute}`).join("\n"));
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", vaultPath: TRESOR });

  const server = await starteNext(PORT, {
    TZ: ZONE,
    JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"),
    JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"),
    JARVIS_MAC_STORE: path.join(MAC, "kalender.json"),
    JARVIS_MAC_LOG: path.join(MAC, "aufrufe.log"),
  });
  const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);
    const fehler: string[] = [];
    const neueSeite = async (breite: number, hoehe: number) => {
      const seite = await browser.newPage({ viewport: { width: breite, height: hoehe }, locale: "de-DE", timezoneId: ZONE });
      seite.on("pageerror", (e) => fehler.push(e.message));
      // Merkt sich jeden Zustand, den die Leiste anzeigt („Bereit“, „Höre zu“, „Denke nach“ …): Daran ist zu sehen,
      // ob die Sprechtaste gegriffen hat. Die Aufrufe des Mikrofons taugen dazu nicht, denn auf „Jarvis“ lauschen
      // will die Seite bei jedem Tastendruck neu, solange es (wie hier, ohne Mikrofon) nicht läuft.
      // (Als Text und nicht als Funktion: siehe markiert.)
      await seite.addInitScript({
        content: `window.__lagen = [];
          new MutationObserver(() => {
            const e = document.querySelector("form[data-fokusrahmen] [role=status]");
            const t = e ? e.textContent.trim() : "";
            if (t && window.__lagen[window.__lagen.length - 1] !== t) window.__lagen.push(t);
          }).observe(document, { subtree: true, childList: true, characterData: true });`,
      });
      return seite;
    };
    const bild = async (seite: Page, name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`) });
    };

    // 1. Mit der Tab-Taste durch „Heute“ und durch die lange Liste im Raum Aufgaben, auf einem niedrigen Bildschirm:
    //    Alles Bedienbare wird erreicht, hat einen sichtbaren Rand und liegt nicht hinter der Leiste unten oder
    //    hinter der Zeile, in der JARVIS antwortet.
    const breit = await neueSeite(1280, 700);
    for (const raum of ["heute", "aufgaben"]) {
      await breit.goto(`${BASIS}/${raum}`);
      await breit.locator("main:visible").getByText(raum === "heute" ? "Wartet auf dich" : "Aufgabe Nummer 14").first().waitFor({ timeout: 30_000 });
      // Die Zeile über der Leiste steht da (hier mit dem Hinweis zum Mikrofon): der ungünstigste Fall.
      await breit.getByRole("button", { name: "Ganzes Gespräch zeigen" }).waitFor({ timeout: 30_000 });
      const weg = await einmalDurch(breit);
      assert.ok(weg.length >= 12, `${raum}: die Tab-Taste erreicht die Seite (${weg.length} Stellen)`);
      assert.deepEqual(weg.filter((m) => !m.rand).map((m) => m.name), [], `${raum}: jede markierte Stelle hat einen sichtbaren Rand`);
      assert.deepEqual(weg.filter((m) => m.verdeckt).map((m) => m.name), [], `${raum}: keine markierte Stelle liegt hinter etwas anderem`);
      assert.deepEqual(weg.filter((m) => !m.imBild).map((m) => m.name), [], `${raum}: jede markierte Stelle steht im Bild`);
      const namen = weg.map((m) => m.name);
      assert.ok(namen.includes("textarea „Nachricht an JARVIS“"), `${raum}: das Feld für JARVIS ist mit der Tab-Taste erreichbar`);
      assert.ok(namen.some((n) => n.startsWith("a „Kalender")), `${raum}: die Räume in der Leiste auch`);
      if (raum === "aufgaben") assert.ok(namen.filter((n) => n === "button „Besprechen“").length >= 14, "jede Aufgabe der langen Liste wird erreicht");
    }
    await bild(breit, "0-tab");
    schritt("Tab-Taste: In „Heute“ und in einer langen Aufgabenliste ist jede markierte Stelle zu sehen, mit Rand, nichts liegt hinter der Leiste");

    // 2. Die Leertaste bedient, was markiert ist. Sie startet nur dann das Mikrofon, wenn nichts markiert ist.
    await breit.goto(`${BASIS}/agenten`);
    const grenzen = breit.locator("main:visible summary", { hasText: "Feste Grenzen" }).first();
    await grenzen.waitFor({ timeout: 30_000 });
    await grenzen.focus();
    const zugehoert = () => breit.evaluate(() => (window as unknown as { __lagen: string[] }).__lagen.filter((t) => t.includes("höre zu")).length);
    const vorher = await zugehoert();
    await breit.keyboard.press("Space");
    await breit.waitForTimeout(400);
    assert.equal(await grenzen.evaluate((s) => (s.parentElement as HTMLDetailsElement).open), true, "die Leertaste klappt „Feste Grenzen“ auf");
    assert.equal(await zugehoert(), vorher, "und schaltet dabei nicht auf Zuhören");
    await breit.keyboard.press("Space");
    await breit.waitForTimeout(300);
    assert.equal(await grenzen.evaluate((s) => (s.parentElement as HTMLDetailsElement).open), false, "noch einmal: wieder zu");
    // Gegenstück: Ist nichts markiert, schaltet die Leertaste auf Zuhören (sonst bewiese die Zählung oben nichts).
    await breit.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    await breit.keyboard.press("Space");
    await breit.waitForFunction((n) => (window as unknown as { __lagen: string[] }).__lagen.filter((t) => t.includes("höre zu")).length > n, vorher, { timeout: 5000 });
    await breit.keyboard.press("Space");
    schritt("Leertaste: Sie klappt auf, was markiert ist, und startet dabei nicht das Mikrofon");

    // 3. Das Menü „Mehr“: auf mit Eingabe oder Pfeil, mit den Pfeiltasten hindurch, Escape schließt es und setzt die
    //    Markierung zurück auf den Knopf, Eingabe geht in den Raum.
    const mehr = breit.getByRole("button", { name: "Mehr" });
    await mehr.focus();
    await breit.keyboard.press("Enter");
    const menue = breit.getByRole("menu");
    await menue.waitFor();
    const eintraege = await menue.getByRole("menuitem").filter({ visible: true }).allInnerTexts();
    assert.ok(eintraege.length >= 2, `im Menü stehen die übrigen Räume (${eintraege.join(", ")})`);
    await breit.keyboard.press("ArrowDown");
    assert.equal((await markiert(breit))?.name, `a „${eintraege[0]}“`, "Pfeil nach unten: der erste Eintrag");
    await breit.keyboard.press("ArrowDown");
    assert.equal((await markiert(breit))?.name, `a „${eintraege[1]}“`);
    await breit.keyboard.press("ArrowUp");
    assert.equal((await markiert(breit))?.name, `a „${eintraege[0]}“`);
    await breit.keyboard.press("End");
    assert.equal((await markiert(breit))?.name, `a „${eintraege.at(-1)}“`, "Ende: der letzte Eintrag");
    await breit.keyboard.press("Escape");
    await menue.waitFor({ state: "detached" });
    assert.equal((await markiert(breit))?.name, "button „Mehr“", "Escape schließt das Menü, die Markierung steht wieder auf dem Knopf");
    await breit.keyboard.press("ArrowUp");
    await menue.waitFor();
    assert.equal((await markiert(breit))?.name, `a „${eintraege.at(-1)}“`, "Pfeil nach oben öffnet das Menü am letzten Eintrag");
    await breit.keyboard.press("Home");
    await breit.keyboard.press("Enter");
    await breit.waitForURL((u) => !u.pathname.endsWith("/agenten"), { timeout: 30_000 });
    await bild(breit, "1-menue");
    await breit.close();
    schritt("Menü „Mehr“: Pfeiltasten, Anfang und Ende, Escape schließt und markiert wieder den Knopf, Eingabe öffnet den Raum");

    // 4. Handybreite: Kein Raum läuft seitlich über, im Feld für JARVIS ist Platz, und alles geht ohne Maus.
    const schmal = await neueSeite(390, 844);
    for (const raum of RAEUME) {
      await schmal.goto(`${BASIS}/${raum}`);
      await schmal.locator("main:visible").first().waitFor({ timeout: 30_000 });
      await schmal.waitForTimeout(600);
      const [inhalt, fenster] = await schmal.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      assert.ok(inhalt <= fenster + 1, `${raum}: die Seite ist nicht breiter als das Fenster (${inhalt} zu ${fenster})`);
    }
    await schmal.goto(`${BASIS}/heute`);
    const feld = schmal.getByRole("textbox", { name: "Nachricht an JARVIS" });
    await feld.waitFor({ timeout: 30_000 });
    const feldBreite = (await feld.boundingBox())!.width;
    assert.ok(feldBreite >= 110, `im Feld für JARVIS ist Platz zum Tippen (${Math.round(feldBreite)} Pixel)`);
    await feld.focus();
    await schmal.keyboard.type("Meine Termine");
    assert.equal(await feld.inputValue(), "Meine Termine");
    await schmal.keyboard.press("Enter");
    // Die Antwort steht im Gespräch; auch das klappt mit der Tastatur auf. (Die Zeile über der Leiste zeigt im
    // Browser ohne Mikrofon den Hinweis zum Mikrofon.)
    const zeigen = schmal.getByRole("button", { name: "Ganzes Gespräch zeigen" });
    await zeigen.focus();
    await schmal.keyboard.press("Enter");
    const gespraech = schmal.getByRole("region", { name: "Gespräch" });
    await gespraech.getByText(/Besprechung Hallenneubau mit dem Architekten/).first().waitFor({ timeout: 30_000 });
    const [rechts, fensterBreite] = [(await gespraech.boundingBox())!, 390];
    assert.ok(rechts.x >= 0 && rechts.x + rechts.width <= fensterBreite, "das aufgeklappte Gespräch passt ins schmale Fenster");
    const titel = gespraech.getByRole("heading", { name: "Gespräch" });
    assert.equal(await titel.evaluate((h) => h.scrollWidth <= h.clientWidth + 1), true, "die Überschrift „Gespräch“ ist nicht abgeschnitten");
    assert.equal(await gespraech.evaluate((g) => g.contains(document.activeElement)), true, "die Markierung steht im aufgeklappten Gespräch, nicht irgendwo auf der Seite");
    // Escape klappt es wieder zu, und die Markierung steht wieder auf der Zeile, von der man kam.
    await schmal.keyboard.press("Escape");
    await gespraech.waitFor({ state: "detached" });
    await schmal.waitForFunction(() => document.activeElement?.hasAttribute("data-antwortzeile") === true, null, { timeout: 5000 }).catch(() => {});
    assert.equal(await zeigen.evaluate((b) => b === document.activeElement), true, "nach dem Zuklappen ist wieder die Zeile über der Leiste markiert");
    // Arbeitet JARVIS gerade, gilt Escape ihm: Es unterbricht ihn, und das Gespräch bleibt stehen (man liest ja
    // gerade darin). Erst das nächste Escape klappt zu.
    const langsam = async (route: Route) => {
      if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    };
    await schmal.route("**/api/aufgaben", langsam);
    await feld.focus();
    await schmal.keyboard.type("Notiere Dübel besorgen");
    await schmal.keyboard.press("Enter");
    await zeigen.focus();
    await schmal.keyboard.press("Enter");
    await gespraech.waitFor();
    const lage = schmal.locator("form[data-fokusrahmen] [role=status]");
    await schmal.waitForFunction(() => document.querySelector("form[data-fokusrahmen] [role=status]")?.textContent?.trim() !== "Bereit", null, { timeout: 5000 });
    assert.equal(await gespraech.evaluate((g) => g.contains(document.activeElement)), true);
    await schmal.keyboard.press("Escape");
    await schmal.waitForTimeout(500);
    assert.equal(await gespraech.count(), 1, `Escape, während JARVIS arbeitet (${await lage.innerText()}): das Gespräch bleibt aufgeklappt`);
    await schmal.waitForFunction(() => document.querySelector("form[data-fokusrahmen] [role=status]")?.textContent?.trim() === "Bereit", null, { timeout: 10_000 });
    await schmal.unroute("**/api/aufgaben", langsam);
    await schmal.keyboard.press("Escape");
    await gespraech.waitFor({ state: "detached" });
    // Die Markierung kehrt erst mit dem nächsten Bild auf die Zeile zurück. Darauf warten; sonst nähme sie dem
    // Knopf „Räume“ gleich die Markierung wieder weg, und der Pfeil nach unten ginge ins Leere.
    await schmal.waitForFunction(() => document.activeElement?.hasAttribute("data-antwortzeile") === true, null, { timeout: 5000 });
    // Das Menü der Räume heißt hier „Räume“ und geht genauso mit der Tastatur.
    const raeume = schmal.getByRole("button", { name: "Räume" });
    await raeume.focus();
    await schmal.keyboard.press("ArrowDown");
    await schmal.getByRole("menu").waitFor();
    assert.equal((await markiert(schmal))?.name, "a „Heute“");
    const zeile = (await markiert(schmal))!;
    assert.ok(!zeile.verdeckt && zeile.imBild, "das Menü steht ganz im Bild");
    await schmal.keyboard.press("ArrowDown");
    await schmal.keyboard.press("Enter");
    await schmal.waitForURL(/\/aufgaben$/, { timeout: 30_000 });
    await bild(schmal, "2-schmal");
    // Auch hier: Mit der Tab-Taste durch die lange Liste, nichts liegt hinter der Leiste.
    await schmal.locator("main:visible").getByText("Aufgabe Nummer 14").first().waitFor({ timeout: 30_000 });
    const wegSchmal = await einmalDurch(schmal);
    assert.ok(wegSchmal.filter((m) => m.name === "button „Besprechen“").length >= 14, `schmal: jede Aufgabe der langen Liste wird erreicht (${wegSchmal.length} Stellen)`);
    assert.deepEqual(wegSchmal.filter((m) => !m.rand).map((m) => m.name), [], "schmal: jede markierte Stelle hat einen sichtbaren Rand");
    assert.deepEqual(wegSchmal.filter((m) => m.verdeckt || !m.imBild).map((m) => m.name), [], "schmal: keine markierte Stelle liegt hinter der Leiste oder außerhalb");
    assert.ok(wegSchmal.some((m) => m.name === "textarea „Nachricht an JARVIS“") && wegSchmal.some((m) => m.name === "button „Räume“"), "schmal: Feld und Menü in der Leiste werden erreicht");
    // Ein Raum ohne Scheiben (unter dem Text steht dann nichts mehr): Auch sein letztes Bedienbares rollt über die Leiste.
    await schmal.goto(`${BASIS}/agenten`);
    await schmal.locator("main:visible summary", { hasText: "Feste Grenzen" }).first().waitFor({ timeout: 30_000 });
    assert.equal(await schmal.locator(".raum-scheiben > *").count(), 0, "der Raum Agenten hat keine Scheiben");
    const wegOhne = await einmalDurch(schmal);
    assert.ok(wegOhne.length >= 10, `schmal, Agenten: die Tab-Taste erreicht die Seite (${wegOhne.length} Stellen)`);
    assert.deepEqual(wegOhne.filter((m) => m.verdeckt || !m.imBild).map((m) => m.name), [], "schmal, Raum ohne Scheiben: keine markierte Stelle liegt hinter der Leiste oder außerhalb");
    await schmal.close();
    schritt("Handybreite: Kein Raum läuft seitlich über, im Feld für JARVIS ist Platz zum Tippen, Menü und Liste gehen mit der Tastatur");

    // 5. Die Scheiben in „Heute“: Kein Name ist abgeschnitten, auch nicht neben einem langen Zustand.
    for (const [breite, hoehe] of [[1280, 700], [1280, 900], [1440, 900]] as const) {
      const seite = await neueSeite(breite, hoehe);
      await seite.goto(`${BASIS}/heute`);
      const agenten = seite.locator("section.glas").filter({ has: seite.getByRole("heading", { name: "Agenten" }) });
      await agenten.getByText("Intel").first().waitFor({ timeout: 30_000 });
      const termine = seite.locator("section.glas").filter({ has: seite.getByRole("heading", { name: "Termine heute" }) });
      await termine.getByText("Gesellschafterversammlung").first().waitFor({ timeout: 30_000 });
      const abgeschnitten = await seite.locator("section.glas li span").evaluateAll((spans) =>
        spans.filter((s) => s.children.length === 0 && (s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 2)).map((s) => (s as HTMLElement).innerText),
      );
      if (hoehe === 700) await bild(seite, "3-scheiben");
      assert.deepEqual(abgeschnitten, [], `${breite}: an den Scheiben ist kein Text abgeschnitten`);
      const texte = (await seite.locator("section.glas").allInnerTexts()).join("\n");
      for (const name of [...TERMINE, "Gespräch (Claude)", "Browser-Agent", "Spielgeld-Desk", "Intel", "nicht eingerichtet"]) assert.ok(texte.includes(name), `${breite}: „${name}“ steht ganz da`);
      // Die Scheiben bleiben im Fenster: Keine ragt über den Boden oder die Leiste.
      const unten = await seite.locator("section.glas").evaluateAll((s) => Math.max(...s.map((x) => x.getBoundingClientRect().bottom)));
      const leiste = (await seite.locator("nav[aria-label=Räume]").boundingBox())!.y;
      assert.ok(unten < leiste, `${breite}×${hoehe}: die Scheiben enden über der Leiste (${Math.round(unten)} zu ${Math.round(leiste)})`);
      // Sechs Termine mit langen Namen: Keine Scheibe ragt unter den Boden. Passt sie nicht, rollt sie in sich,
      // und auch der letzte Termin ist zu erreichen.
      const [boden, enden] = await seite.evaluate(() => {
        const ort = document.querySelector(".raum-scheiben")!;
        return [ort.getBoundingClientRect().bottom, [...ort.children].map((s) => s.getBoundingClientRect().bottom)] as const;
      });
      assert.ok(enden.every((e) => e <= boden + 1), `${breite}×${hoehe}: keine Scheibe ragt unter den Boden (${enden.map(Math.round).join(", ")} zu ${Math.round(boden)})`);
      const letzter = termine.getByText("Gesellschafterversammlung").first();
      await letzter.scrollIntoViewIfNeeded();
      const [zeile, scheibe] = [(await letzter.boundingBox())!, (await termine.boundingBox())!];
      assert.ok(zeile.y >= scheibe.y && zeile.y + zeile.height <= scheibe.y + scheibe.height + 1 && zeile.y + zeile.height <= boden + 1, `${breite}×${hoehe}: der letzte Termin ist in der Scheibe zu erreichen`);
      // In der schmalen Scheibe läuft der Name hinter der Uhrzeit weiter und unter ihr durch: „Besprechung
      // Hallenneubau mit dem Architekten“ braucht höchstens vier Zeilen (in einer Spalte neben der Uhrzeit: fünf).
      const zeilen = await termine.locator("li").first().evaluate((li) => li.getBoundingClientRect().height / parseFloat(getComputedStyle(li).lineHeight));
      assert.ok(zeilen <= 4.4, `${breite}×${hoehe}: der erste Termin steht in höchstens vier Zeilen (${zeilen.toFixed(1)})`);
      await seite.close();
    }
    schritt("Scheiben in „Heute“: Kein Name ist abgeschnitten, auch nicht „Intel“ neben „nicht eingerichtet“");

    // 6. Tippen, während JARVIS den Raum wechselt: Nach „Meine Termine“ geht es in den Raum Kalender. Wer genau in
    //    dem Augenblick weitertippt, in dem der neue Raum fertig wird, verliert keinen Buchstaben. (Vor Schritt J11
    //    ging in etwa jedem zweiten Versuch der erste verloren; deshalb fünf Versuche mit verschieden schnellem Tippen.)
    const tipp = await neueSeite(1280, 800);
    // Zwei Zeichen dafür, dass der Raumwechsel gerade beginnt: Der Browser meldet ihn, und JARVIS setzt gleich
    // danach zum Sprechen an (hier stumm; gezählt wird nur der Aufruf).
    await tipp.addInitScript({
      content: `window.__fahrten = 0; window.__ansaetze = 0;
        if (window.navigation) window.navigation.addEventListener("navigate", () => { window.__fahrten++; });
        if (window.speechSynthesis) { const echt = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = (u) => { window.__ansaetze++; echt(u); }; }`,
    });
    const getippt: string[] = [];
    for (const pause of [25, 40, 60, 80, 120]) {
      await tipp.goto(`${BASIS}/heute`);
      const feld = tipp.getByRole("textbox", { name: "Nachricht an JARVIS" });
      await feld.waitFor({ timeout: 30_000 });
      await tipp.locator("section.glas").filter({ has: tipp.getByRole("heading", { name: "Termine heute" }) }).getByText("Gesellschafterversammlung").first().waitFor({ timeout: 30_000 });
      assert.equal(await tipp.evaluate(() => "navigation" in window), true, "der Browser der Prüfung meldet Raumwechsel");
      await feld.fill("Meine Termine");
      await feld.press("Enter");
      await tipp.waitForFunction(() => (window as unknown as { __fahrten: number }).__fahrten > 0, null, { timeout: 15_000 });
      await tipp.keyboard.type("Wie wird das Wetter", { delay: pause });
      await tipp.waitForURL(/\/kalender$/, { timeout: 15_000 });
      await tipp.waitForTimeout(600);
      getippt.push(await feld.inputValue());
    }
    assert.deepEqual(getippt, Array.from({ length: 5 }, () => "Wie wird das Wetter"), "beim Raumwechsel geht kein getippter Buchstabe verloren");
    // Dasselbe mit der Eingabetaste: Sie schickt ab. (Vorher stand in etwa zwei von drei Versuchen stattdessen
    // eine neue Zeile im Feld, und nichts ging los.)
    const danach: string[] = [];
    for (let versuch = 0; versuch < 5; versuch++) {
      await tipp.goto(`${BASIS}/heute`);
      const feld = tipp.getByRole("textbox", { name: "Nachricht an JARVIS" });
      await feld.waitFor({ timeout: 30_000 });
      await tipp.locator("section.glas").filter({ has: tipp.getByRole("heading", { name: "Termine heute" }) }).getByText("Gesellschafterversammlung").first().waitFor({ timeout: 30_000 });
      await feld.fill("Meine Termine");
      await feld.press("Enter");
      await tipp.waitForFunction(() => (window as unknown as { __ansaetze: number }).__ansaetze > 0, null, { timeout: 15_000 });
      await feld.fill("Wie spät ist es");
      await feld.press("Enter");
      await tipp.waitForURL(/\/kalender$/, { timeout: 15_000 });
      await tipp.waitForTimeout(600);
      danach.push(await feld.inputValue());
    }
    assert.deepEqual(danach, Array.from({ length: 5 }, () => ""), "beim Raumwechsel schickt die Eingabetaste ab und macht keine neue Zeile");
    await tipp.close();
    schritt("Tippen beim Raumwechsel: Kein Buchstabe geht verloren, und die Eingabetaste schickt ab");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Handprüfung Bedienung: alle Schritte in Ordnung.");
  } finally {
    await browser.close().catch(() => {});
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
