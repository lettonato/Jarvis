// Handprüfung: JARVIS so, wie ein Vorleseprogramm ihn liest, im echten Browser gegen den gebauten Server
// (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/vorlesen-rauch.ts [Ordner für Bilder]
// Geprüft wird, was sich ohne ein Vorleseprogramm prüfen lässt: Jeder Raum hat einen Namen im Titel, genau eine
// Hauptüberschrift, keine Sprünge in den Überschriften und benannte Bereiche; ein Wechsel des Raums wird angesagt;
// was JARVIS antwortet, steht im Namen der Zeile über der Leiste und wird angesagt; Meldungen nach einem Klick
// sind als Meldung ausgezeichnet; das aufgeklappte Gespräch verdeckt nichts, was markiert ist; was man anklickt,
// ist mindestens 24 Pixel hoch. Ein Vorleseprogramm selbst (VoiceOver) läuft hier nicht mit.
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { mittagsZone } from "../helfer/uhrzeiten";
import { ANSAGE_WARTET_MS } from "../../src/lib/ansage";

const PORT = 3129;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("vorlesen-rauch");
const MAC = testOrdner("vorlesen-rauch-mac");
const TRESOR = testOrdner("vorlesen-rauch-tresor");
const STORE = path.join(MAC, "kalender.json");
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

const ZONE = mittagsZone();
process.env.TZ = ZONE;

const RAEUME = ["heute", "aufgaben", "kalender", "post", "projekte", "trading", "intel", "agenten", "dokumente", "browser", "einstellungen", "fokus"];

// Was im Browser gemessen wird, steht als Text hier und nicht als Funktion: tsx hängt benannten Funktionen einen
// Aufruf an, den es im Browser nicht gibt.
const AUFBAU = `(() => {
  const sichtbar = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const stufen = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(sichtbar).map((h) => Number(h.tagName[1]));
  const scheiben = document.querySelector(".raum-scheiben");
  return {
    titel: document.title,
    sprache: document.documentElement.lang,
    h1: stufen.filter((s) => s === 1).length,
    spruenge: stufen.filter((s, i) => i > 0 && s > stufen[i - 1] + 1).length,
    hauptbereiche: [...document.querySelectorAll("main")].filter(sichtbar).length,
    scheiben: scheiben && scheiben.children.length > 0 ? scheiben.tagName.toLowerCase() + ":" + (scheiben.getAttribute("aria-label") || "") : "",
    ausserhalb: [...document.querySelectorAll("h1,h2,h3,button,a,input,textarea,select")].filter(sichtbar).filter((e) => !e.closest("main,nav,aside,header,footer,form,[role=region],section[aria-label],[role=status],[role=alert]")).map((e) => e.tagName.toLowerCase() + " " + (e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 30)),
    felderOhneNamen: [...document.querySelectorAll("input,select,textarea")].filter(sichtbar).filter((f) => !(f.getAttribute("aria-label") || f.getAttribute("aria-labelledby") || (f.id && document.querySelector('label[for="' + f.id + '"]')) || f.closest("label"))).length,
    knoepfeOhneNamen: [...document.querySelectorAll("button,a,summary")].filter(sichtbar).filter((b) => !((b.innerText || "").trim() || b.getAttribute("aria-label") || b.getAttribute("title"))).length,
    bilderOhneNamen: [...document.querySelectorAll("img")].filter(sichtbar).filter((b) => !b.hasAttribute("alt")).length,
  };
})()`;

// Alles Anklickbare, das niedriger als 24 Pixel ist. Ausgenommen ist nur ein Verweis mitten in einem Satz
// (neben ihm steht im selben Absatz weiterer Text): Dort gilt die Zeilenhöhe.
const KLEIN = `(() => {
  const sichtbar = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  return [...document.querySelectorAll("a,button,summary,input[type=checkbox],input[type=radio],select,[role=button],[role=menuitem]")].filter(sichtbar).filter((e) => {
    const r = e.getBoundingClientRect();
    if (r.height >= 23.5) return false;
    if (e.matches("input") && e.closest("label") && e.closest("label").getBoundingClientRect().height >= 23.5) return false;
    const absatz = e.closest("p,li,td,dd,span.satz");
    const imSatz = e.tagName === "A" && absatz && (absatz.innerText || "").replace((e.innerText || ""), "").trim().length > 12 && getComputedStyle(e).display.startsWith("inline");
    return !imSatz;
  }).map((e) => e.tagName.toLowerCase() + " „" + (e.innerText || e.getAttribute("aria-label") || "").trim().replace(/\\s+/g, " ").slice(0, 28) + "“ " + Math.round(e.getBoundingClientRect().height));
})()`;

// Eine Stimme für den Browser der Prüfung, die nur so tut, als spräche sie.
const STIMME = `(() => {
  window.__saetze = [];
  window.__fertig = 0;
  const stimme = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    getVoices: () => [],
    cancel: () => {},
    pause: () => {}, resume: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    speak: (u) => {
      window.__saetze.push(u.text);
      setTimeout(() => u.onstart && u.onstart(new Event("start")), 50);
      setTimeout(() => { window.__fertig++; u.onend && u.onend(new Event("end")); }, 4000);
    },
  };
  Object.defineProperty(window, "speechSynthesis", { value: stimme, configurable: true });
})()`;

type Aufbau = { titel: string; sprache: string; h1: number; spruenge: number; hauptbereiche: number; scheiben: string; ausserhalb: string[]; felderOhneNamen: number; knoepfeOhneNamen: number; bilderOhneNamen: number };

async function main() {
  assert.equal(new Date().getHours(), 12, "die Zeitzone der Prüfung steht auf Mittag");
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  const jetzt = new Date();
  const um = (stunde: number) => new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate(), stunde).getTime();
  const { isoDate } = await import("../../src/lib/dates");
  const kalender = (mehr: object = {}) =>
    writeFileSync(
      STORE,
      JSON.stringify({
        zugriff: "ok",
        kalender: [{ name: "Privat", writable: true }],
        standard: "Privat",
        events: [{ id: "a", title: "Besprechung Hallenneubau", start: um(15), end: um(16), allDay: false, location: "", calendar: "Privat" }],
        ...mehr,
      }),
    );
  kalender();
  mkdirSync(path.join(TRESOR, "Aufgaben"), { recursive: true });
  writeFileSync(path.join(TRESOR, "Aufgaben", "Haus.md"), Array.from({ length: 14 }, (_, i) => `- [ ] Aufgabe Nummer ${i + 1} 📅 ${isoDate(jetzt)}`).join("\n"));
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", vaultPath: TRESOR });

  const server = await starteNext(PORT, {
    TZ: ZONE,
    JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"),
    JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"),
    JARVIS_MAC_STORE: STORE,
    JARVIS_MAC_LOG: path.join(MAC, "aufrufe.log"),
  });
  const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);
    const fehler: string[] = [];
    const seite = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "de-DE", timezoneId: ZONE });
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`) });
    };
    const messe = <T>(skript: string, s: Page = seite) => s.evaluate(skript) as Promise<T>;

    // 1. Der Aufbau jedes Raums.
    for (const raum of RAEUME) {
      await seite.goto(`${BASIS}/${raum}`);
      await seite.locator("main:visible").first().waitFor({ timeout: 30_000 });
      await seite.waitForTimeout(700);
      const a = await messe<Aufbau>(AUFBAU);
      assert.match(a.titel, /^JARVIS · \S/, `${raum}: der Titel nennt den Raum (${a.titel})`);
      assert.equal(a.sprache, "de", `${raum}: die Sprache der Seite ist Deutsch`);
      assert.equal(a.h1, 1, `${raum}: genau eine Hauptüberschrift`);
      assert.equal(a.spruenge, 0, `${raum}: die Überschriften überspringen keine Stufe`);
      assert.equal(a.hauptbereiche, 1, `${raum}: genau ein Hauptbereich`);
      if (a.scheiben) assert.equal(a.scheiben, "aside:Auf einen Blick", `${raum}: die Scheiben sind ein eigener Bereich mit Namen`);
      assert.deepEqual(a.ausserhalb, [], `${raum}: nichts Bedienbares und keine Überschrift steht außerhalb eines Bereichs`);
      assert.deepEqual([a.felderOhneNamen, a.knoepfeOhneNamen, a.bilderOhneNamen], [0, 0, 0], `${raum}: kein Feld, kein Knopf und kein Bild ohne Namen`);
    }
    // Ein Wechsel des Raums (ohne Neuladen) wird angesagt.
    await seite.goto(`${BASIS}/heute`);
    await seite.locator("main:visible").getByText("Wartet auf dich").first().waitFor({ timeout: 30_000 });
    await seite.getByRole("navigation", { name: "Räume" }).getByRole("link", { name: /^Aufgaben/ }).click();
    await seite.waitForURL(/\/aufgaben$/);
    await seite.waitForFunction(() => /Aufgaben/.test(document.querySelector("next-route-announcer")?.shadowRoot?.textContent ?? ""), null, { timeout: 10_000 });
    schritt("Aufbau: Jeder der zwölf Räume hat Titel, eine Hauptüberschrift, benannte Bereiche und keine namenlosen Felder; ein Wechsel des Raums wird angesagt");

    // 2. Was JARVIS antwortet: Es steht im Namen der Zeile über der Leiste, und es wird angesagt (hier spricht
    //    JARVIS nicht hörbar selbst: Der Browser der Prüfung hat keine Stimme).
    await seite.goto(`${BASIS}/heute`);
    const feld = seite.getByRole("textbox", { name: "Nachricht an JARVIS" });
    await feld.waitFor({ timeout: 30_000 });
    const ansage = seite.locator("[data-ansage]");
    assert.equal(await ansage.count(), 1, "es gibt genau eine Stelle für Ansagen an der Leiste");
    assert.equal(await ansage.getAttribute("aria-live"), "polite");
    const zeile = seite.locator("[data-antwortzeile]");
    await zeile.waitFor({ timeout: 30_000 });
    const hinweis = (await zeile.innerText()).replace(/\s+/g, " ").trim().replace(/\s*Ganzes Gespräch zeigen$/, "");
    assert.ok(hinweis.length > 20, `in der Zeile steht ein Hinweis (${hinweis})`);
    // Der Name des Knopfes ist sein Inhalt und sagt, was der Knopf tut. (Mit einem festen Namen läse ein
    // Vorleseprogramm nur „Ganzes Gespräch zeigen“ und nie, was JARVIS geantwortet hat.)
    assert.equal(await zeile.getAttribute("aria-label"), null, "kein fester Name, der den Inhalt verdeckt");
    // Und kein Titel, der dasselbe noch einmal als Beschreibung anhängt (es würde zweimal vorgelesen).
    assert.equal(await zeile.getAttribute("title"), null, "kein Titel, der den Namen wiederholt");
    const name = (await zeile.ariaSnapshot()).replace(/\s+/g, " ");
    assert.ok(name.startsWith('- button "') && name.includes(hinweis.slice(-30)) && name.includes('Ganzes Gespräch zeigen"'), `der Name der Zeile enthält den Hinweis (${hinweis}) und „Ganzes Gespräch zeigen“ (${name})`);
    // Der Browser der Prüfung hat kein Mikrofon. Erst bittet JARVIS um einen Klick (ohne den fragt mancher Browser
    // gar nicht), nach dem Klick meldet er, dass er das Mikrofon nicht benutzen darf.
    const zeileJetzt = async () => (await zeile.innerText()).replace(/\s+/g, " ").trim();
    await seite.locator("main:visible h1").click();
    await zeile.getByText("Ich darf das Mikrofon nicht benutzen.", { exact: false }).waitFor({ timeout: 15_000 }).catch(async () => assert.fail(`nach dem ersten Klick steht die Meldung zum Mikrofon nicht in der Zeile (${await zeileJetzt()})`));
    await feld.fill("Meine Termine");
    await feld.press("Enter");
    // Der Browser der Prüfung hat keine Stimme: JARVIS will drei Sekunden lang sprechen, gibt auf, und die Antwort
    // wird angesagt.
    await seite
      .waitForFunction(() => /Besprechung Hallenneubau/.test(document.querySelector("[data-ansage]")?.textContent ?? ""), null, { timeout: 15_000 })
      .catch(async () => assert.fail(`die Antwort wird nicht angesagt; angesagt: „${await ansage.innerText()}“, in der Zeile: „${(await zeile.innerText()).replace(/\s+/g, " ")}“`));
    const angesagt = (await ansage.innerText()).trim();
    assert.match(angesagt, /15 Uhr|15:00/, `die Antwort wird ganz angesagt (${angesagt})`);
    await bild("0-antwort");
    // Die Zeile selbst zeigt jetzt die Antwort. Die Meldung zum Mikrofon steht nicht mehr davor: Vorher blieb sie
    // für immer stehen, und wer tippte, sah die Antwort nur im aufgeklappten Gespräch. Die Überschrift der Zeile
    // verweist auf die Meldung.
    const mitAntwort = await zeileJetzt();
    assert.ok(mitAntwort.includes("Besprechung Hallenneubau"), `nach der Antwort zeigt die Zeile die Antwort (${mitAntwort})`);
    assert.ok(!mitAntwort.includes("Mikrofon nicht benutzen"), `die Meldung zum Mikrofon verdeckt die Antwort nicht mehr (${mitAntwort})`);
    assert.ok(mitAntwort.includes("Hinweis im Gespräch"), `die Überschrift der Zeile verweist auf die Meldung (${mitAntwort})`);
    // Bei gesperrtem Mikrofon fragt der Browser bei jedem Tastendruck neu und meldet dasselbe noch einmal. Das
    // holt die Meldung nicht wieder nach vorn.
    await feld.pressSequentially("Und morgen", { delay: 40 });
    await seite.waitForTimeout(800);
    const beimTippen = await zeileJetzt();
    assert.ok(beimTippen.includes("Besprechung Hallenneubau") && !beimTippen.includes("Mikrofon nicht benutzen"), `beim Weitertippen bleibt die Antwort stehen (${beimTippen})`);
    // Der Verweis stimmt: Im aufgeklappten Gespräch steht die Meldung. Und nach dem Zuklappen steht in der Zeile
    // wieder die Antwort (die Zeile entsteht dabei neu; die Meldung gilt deshalb nicht als neu).
    await zeile.click();
    await seite.getByRole("region", { name: "Gespräch" }).getByText("Ich darf das Mikrofon nicht benutzen.", { exact: false }).waitFor({ timeout: 5_000 });
    await seite.keyboard.press("Escape");
    await zeile.waitFor({ timeout: 5_000 });
    await seite.waitForTimeout(500);
    const nachZuklappen = await zeileJetzt();
    assert.ok(nachZuklappen.includes("Besprechung Hallenneubau") && !nachZuklappen.includes("Mikrofon nicht benutzen") && nachZuklappen.includes("Hinweis im Gespräch"), `nach dem Auf- und Zuklappen steht wieder die Antwort in der Zeile (${nachZuklappen})`);
    // Dieselbe Antwort noch einmal (etwa zweimal „Notiert.“) wird wieder angesagt: Es kommt ein neuer Absatz,
    // nicht derselbe Text an derselben Stelle (den überginge ein Vorleseprogramm).
    await seite.evaluate(`(() => {
      window.__neu = 0;
      new MutationObserver((ms) => { for (const m of ms) for (const k of m.addedNodes) if (k.nodeName === "P" && /Besprechung/.test(k.textContent || "")) window.__neu++; }).observe(document.querySelector("[data-ansage]"), { childList: true });
    })()`);
    await feld.fill("Meine Termine");
    await feld.press("Enter");
    await seite
      .waitForFunction(() => (window as unknown as { __neu: number }).__neu > 0, null, { timeout: 15_000 })
      .catch(() => assert.fail("dieselbe Antwort ein zweites Mal wird nicht wieder angesagt"));
    // Nach dem Neuladen ist das Gespräch wieder da, wird aber nicht noch einmal angesagt.
    await seite.reload();
    await feld.waitFor({ timeout: 30_000 });
    // Das Gespräch von vorhin zählt nicht als „weitergegangen“: Nach dem Neuladen steht wieder vorn, was JARVIS
    // zum Mikrofon meldet (zuerst die Bitte um einen Klick), nicht die Antwort von vorhin.
    await zeile.getByText("Klick einmal irgendwo auf die Seite, dann höre ich zu.").waitFor({ timeout: 15_000 }).catch(async () => assert.fail(`nach dem Neuladen steht die Bitte um einen Klick nicht in der Zeile (${await zeileJetzt()})`));
    assert.ok(!(await zeileJetzt()).includes("Hinweis im Gespräch"), "steht die Meldung in der Zeile, verweist die Überschrift nicht auf sie");
    await zeile.click();
    await seite.getByRole("region", { name: "Gespräch" }).getByText("Besprechung Hallenneubau").first().waitFor({ timeout: 15_000 });
    // Der Verweis stimmt: Im aufgeklappten Gespräch steht die Meldung.
    await seite.getByRole("region", { name: "Gespräch" }).getByText("Ich darf das Mikrofon nicht benutzen.", { exact: false }).waitFor({ timeout: 5_000 });
    await seite.keyboard.press("Escape");
    await seite.waitForTimeout(ANSAGE_WARTET_MS + 2500);
    const alt = (await ansage.innerText()).trim();
    assert.ok(!alt.includes("Besprechung"), `das Gespräch von vorhin wird nach dem Neuladen nicht wieder angesagt (${alt})`);
    // Ist JARVIS mit der Antwort selbst zu hören, wird sie nicht auch noch angesagt. Der Browser der Prüfung
    // bekommt dafür eine Stimme, die nur so tut: Sie meldet „beginnt“ und nach vier Sekunden „fertig“.
    const laut = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "de-DE", timezoneId: ZONE });
    laut.on("pageerror", (e) => fehler.push(e.message));
    await laut.addInitScript({ content: STIMME });
    await laut.goto(`${BASIS}/heute`);
    const feldLaut = laut.getByRole("textbox", { name: "Nachricht an JARVIS" });
    await feldLaut.waitFor({ timeout: 30_000 });
    await laut.waitForResponse((r) => r.url().endsWith("/api/kalender") && r.ok(), { timeout: 30_000 }).catch(() => undefined);
    await feldLaut.fill("Meine Termine");
    await feldLaut.press("Enter");
    const gesagt = () => laut.evaluate(() => JSON.stringify({ saetze: (window as unknown as { __saetze: string[] }).__saetze, ort: location.pathname, feld: (document.querySelector("textarea") as HTMLTextAreaElement | null)?.value, zeile: (document.querySelector("[data-antwortzeile]") as HTMLElement | null)?.innerText }));
    await laut
      .waitForFunction(() => (window as unknown as { __saetze: string[] }).__saetze.some((t) => t.includes("Besprechung Hallenneubau")), null, { timeout: 15_000 })
      .catch(async () => assert.fail(`die Stimme der Prüfung spricht die Antwort nicht: ${await gesagt()}`));
    // Gleich noch einmal gefragt, während JARVIS noch spricht: Er setzt neu an, und auch die zweite Antwort gilt
    // als gehört (und nicht als „kam dazu, während er etwas anderes sprach“).
    await feldLaut.fill("Meine Termine");
    await feldLaut.press("Enter");
    await laut
      .waitForFunction(() => (window as unknown as { __saetze: string[] }).__saetze.filter((t) => t.includes("Besprechung Hallenneubau")).length === 2, null, { timeout: 15_000 })
      .catch(async () => assert.fail(`die Stimme der Prüfung spricht die zweite Antwort nicht: ${await gesagt()}`));
    // Länger warten, als die Stimme der Prüfung spricht (vier Sekunden) und die Ansage danach wartet (zwei).
    await laut.waitForTimeout(4000 + ANSAGE_WARTET_MS + 2500);
    assert.equal(await laut.evaluate(() => (window as unknown as { __fertig: number }).__fertig > 0), true, "die Stimme der Prüfung hat zu Ende gesprochen");
    const doppelt = (await laut.locator("[data-ansage]").innerText()).trim();
    assert.ok(!doppelt.includes("Besprechung"), `was JARVIS selbst spricht, wird nicht auch noch angesagt (${doppelt})`);
    await laut.close();
    schritt("Antwort: Sie steht in der Zeile über der Leiste (die Meldung zum Mikrofon verdeckt sie nicht mehr, auch nicht beim Weitertippen; nach dem Neuladen steht die Meldung wieder vorn) und wird angesagt, außer JARVIS ist selbst zu hören");

    // 3. Meldungen nach einem Klick sind als Meldung ausgezeichnet: gelungen als Hinweis, gescheitert als Warnung.
    await seite.goto(`${BASIS}/kalender`);
    const formular = seite.locator("main section").filter({ has: seite.getByLabel("Neuer Termin") });
    await formular.getByText("landet in Privat").waitFor({ timeout: 30_000 });
    await seite.getByLabel("Neuer Termin").fill("Abnahme Dach");
    await formular.getByRole("button", { name: "Morgen", exact: true }).click();
    await formular.getByRole("button", { name: "Eintragen" }).click();
    await formular.getByRole("status").filter({ hasText: "Eingetragen im Kalender Privat: Abnahme Dach" }).waitFor({ timeout: 15_000 });
    assert.equal(await formular.getByRole("alert").count(), 0);
    const stand = JSON.parse(readFileSync(STORE, "utf8"));
    writeFileSync(STORE, JSON.stringify({ ...stand, speichern: "abgelehnt" }));
    await seite.getByLabel("Neuer Termin").fill("Geht nicht");
    await formular.getByRole("button", { name: "Eintragen" }).click();
    await formular.getByRole("alert").filter({ hasText: "Der Kalender hat den Termin nicht gespeichert." }).waitFor({ timeout: 15_000 });
    kalender();
    schritt("Meldungen: „Eingetragen …“ ist ein Hinweis, „nicht gespeichert“ eine Warnung");

    // 4. Das aufgeklappte Gespräch verdeckt nichts, was markiert ist: Geht die Markierung mit der Tab-Taste aus
    //    Gespräch und Leiste hinaus auf die Seite, klappt es zu.
    await seite.goto(`${BASIS}/aufgaben`);
    await seite.locator("main:visible").getByText("Aufgabe Nummer 14").first().waitFor({ timeout: 30_000 });
    await zeile.waitFor({ timeout: 30_000 });
    await zeile.focus();
    await seite.keyboard.press("Enter");
    const gespraech = seite.getByRole("region", { name: "Gespräch" });
    await gespraech.waitFor();
    let draussen = false;
    for (let i = 0; i < 60 && !draussen; i++) {
      await seite.keyboard.press("Tab");
      await seite.waitForTimeout(120);
      draussen = await seite.evaluate(() => Boolean(document.activeElement && document.activeElement !== document.body && document.activeElement.closest("main")));
    }
    assert.ok(draussen, "die Tab-Taste kommt aus Gespräch und Leiste wieder auf die Seite");
    await gespraech.waitFor({ state: "detached", timeout: 5000 });
    await seite.waitForTimeout(300);
    const frei = await seite.evaluate(() => {
      const e = document.activeElement as HTMLElement;
      const r = e.getBoundingClientRect();
      const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return Boolean(oben && (e.contains(oben) || oben.contains(e))) && r.top >= 0 && r.bottom <= innerHeight;
    });
    assert.ok(frei, "was auf der Seite markiert ist, ist zu sehen");
    // Mit der Maus bleibt es offen: Wer neben das Gespräch klickt, will es nicht verlieren.
    await zeile.click();
    await gespraech.waitFor();
    // Vorher einmal die Tab-Taste im Gespräch: Der Klick danach zählt trotzdem als Klick.
    await seite.keyboard.press("Tab");
    await seite.waitForTimeout(150);
    assert.equal(await gespraech.count(), 1, "die Tab-Taste im Gespräch selbst lässt es offen");
    // Geklickt wird in ein Feld zum Tippen: Dorthin wandert die Markierung auch mit der Maus wirklich.
    await seite.getByPlaceholder(/^Neue Aufgabe/).click();
    await seite.waitForTimeout(400);
    assert.equal(await seite.evaluate(() => document.activeElement?.tagName), "INPUT", "die Markierung steht im angeklickten Feld");
    assert.equal(await gespraech.count(), 1, "ein Klick auf die Seite klappt das Gespräch nicht zu");
    // Auch nicht, wenn man dort tippt und die Markierung danach wieder in dasselbe Feld kommt (wie nach einem
    // kurzen Wechsel in ein anderes Fenster).
    await seite.keyboard.type("x");
    await seite.evaluate(() => {
      const e = document.activeElement as HTMLElement;
      e.blur();
      e.focus();
    });
    await seite.waitForTimeout(400);
    assert.equal(await gespraech.count(), 1, "kommt die Markierung wieder in dasselbe Feld, bleibt das Gespräch offen");
    // Erst die Tab-Taste von dort weiter klappt es zu.
    await seite.keyboard.press("Tab");
    await gespraech.waitFor({ state: "detached", timeout: 5000 });
    await seite.getByPlaceholder(/^Neue Aufgabe/).fill("");
    schritt("Aufgeklapptes Gespräch: Wandert die Markierung auf die Seite, klappt es zu; nach einem Mausklick bleibt es offen");

    // 5. Was man anklickt, ist mindestens 24 Pixel hoch (außer einem Verweis mitten im Satz).
    const zuKlein: string[] = [];
    for (const raum of RAEUME) {
      await seite.goto(`${BASIS}/${raum}`);
      await seite.locator("main:visible").first().waitFor({ timeout: 30_000 });
      await seite.waitForTimeout(900);
      zuKlein.push(...(await messe<string[]>(KLEIN)).map((k) => `${raum}: ${k}`));
    }
    assert.deepEqual(zuKlein, [], "nichts Anklickbares ist niedriger als 24 Pixel");
    await bild("1-klickflaechen");
    schritt("Klickflächen: In allen zwölf Räumen ist nichts Anklickbares niedriger als 24 Pixel");

    // 6. Was schon so ist, wenn der Raum aufgeht (hier: Der Tresor lässt sich nicht lesen), ist gewöhnlicher Text
    //    und keine Warnung: Eine Warnung unterbricht das Vorlesen sofort; das soll nur, was auf einen Klick hin scheitert.
    renameSync(TRESOR, `${TRESOR} weg`);
    try {
      await seite.goto(`${BASIS}/aufgaben`);
      const lage = seite.locator("main:visible p").filter({ hasText: /Den Ordner .* gibt es nicht/ }).first();
      await lage.waitFor({ timeout: 30_000 });
      assert.equal(await lage.getAttribute("role"), null, "was schon so ist, ist gewöhnlicher Text und keine Meldung");
      assert.equal(await seite.locator("main:visible [role=alert]").count(), 0, "beim Betreten des Raums steht keine Warnung da");
    } finally {
      renameSync(`${TRESOR} weg`, TRESOR);
    }
    schritt("Lage: Was beim Betreten eines Raums schon nicht geht, ist gewöhnlicher Text und keine Warnung");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Handprüfung Vorlesen: alle Schritte in Ordnung.");
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
