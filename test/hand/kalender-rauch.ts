// Handprüfung: der Raum Kalender, im echten Browser gegen den gebauten Server und einen nachgebauten Mac-Kalender
// (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/kalender-rauch.ts [Ordner für Bilder]
// Geprüft wird die ganze Strecke Seite → Schnittstelle → Aufruf am Mac: Zugriff erlauben, Termine der nächsten
// zwei Wochen, eintragen mit und ohne Uhrzeit, der Kalender für neue Termine, ein Mac, der nicht speichert, und
// der Schutz der Schnittstelle. Die Kalender-App selbst läuft nicht: An der Stelle von osascript und open stehen
// kleine Programme, die den Kalender als Datei führen und jeden Aufruf festhalten (test/mocks/osascript-mock.mjs).
// Outlook im selben Raum prüft microsoft-rauch.ts.
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { mittagsZone } from "../helfer/uhrzeiten";

const PORT = 3123;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("kalender-rauch");
const MAC = testOrdner("kalender-rauch-mac");
const STORE = path.join(MAC, "kalender.json");
const LOG = path.join(MAC, "aufrufe.log");
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

// „Läuft gerade“, „vorbei“ und „kommt noch“ hängen an der Uhrzeit. Damit die Prüfung zu jeder Tageszeit dasselbe
// sieht (und nie über Mitternacht läuft), bekommen diese Prüfung, der Server und der Browser eine Zeitzone, in
// der es gerade zwischen 12 und 13 Uhr ist.
const ZONE = mittagsZone();
process.env.TZ = ZONE;

type Termin = { id: string; title: string; start: number; end: number; allDay: boolean; location: string; calendar: string };
type Stand = { zugriff: string; kalender: { name: string; writable: boolean }[]; standard: string; events: Termin[]; speichern?: string };
const lies = () => JSON.parse(readFileSync(STORE, "utf8")) as Stand;
const aendere = (teil: Partial<Stand>) => writeFileSync(STORE, JSON.stringify({ ...lies(), ...teil }));
const aufrufe = () =>
  (existsSync(LOG) ? readFileSync(LOG, "utf8") : "")
    .split("\n")
    .filter(Boolean)
    .map((z) => JSON.parse(z) as { programm: string; args: string[] });
// Was „open“ öffnen sollte, und an welchen Tagen die Kalender-App aufgehen sollte (Jahr, Monat, Tag).
const geoeffnet = () => aufrufe().filter((a) => a.programm === "open").map((a) => a.args);
const gezeigt = () => aufrufe().filter((a) => a.args[0] === "-e" && a.args[1]?.includes("view calendar at")).map((a) => a.args.slice(2));
const modi = () => aufrufe().filter((a) => a.args[0] === "-l").map((a) => a.args[4]);
const gespeichert = () => JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as { calendar?: { target?: string } };

async function main() {
  assert.equal(new Date().getHours(), 12, "die Zeitzone der Prüfung steht auf Mittag");
  // Erst jetzt laden: Die Datumsfunktionen sollen von Anfang an in der Zeitzone der Prüfung rechnen.
  const { addDays, isoDate } = await import("../../src/lib/dates");
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  const jetzt = new Date();
  const heute = isoDate(jetzt);
  const um = (tage: number, stunde: number, minute = 0) => new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + tage, stunde, minute).getTime();
  const termin = (id: string, title: string, start: number, minuten: number, calendar = "Privat", location = ""): Termin => ({ id, title, start, end: start + minuten * 60_000, allDay: false, location, calendar });
  const ganztags = (id: string, title: string, tage: number, calendar = "Privat"): Termin => ({ id, title, start: um(tage, 0), end: um(tage, 23, 59), allDay: true, location: "", calendar });
  const lang = (tage: number) => new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date(um(tage, 12)));
  // Noch nie gefragt: So steht ein Mac da, auf dem JARVIS zum ersten Mal läuft.
  writeFileSync(
    STORE,
    JSON.stringify({
      zugriff: "offen",
      kalender: [
        { name: "Privat", writable: true },
        { name: "Arbeit", writable: true },
        { name: "Feiertage", writable: false },
      ],
      standard: "Privat",
      events: [
        termin("a", "Frühbesprechung", um(0, 8), 60, "Arbeit"),
        termin("b", "Baustellentermin Halle", um(0, 11, 30), 120, "Arbeit", "Rosenheim"),
        termin("c", "Steuerberater", um(0, 16), 60),
        ganztags("d", "Geburtstag Anna", 1),
        termin("e", "Zahnarzt", um(3, 10), 60),
        termin("f", "Bankgespräch", um(9, 14), 60, "Arbeit"),
        termin("g", "Messe München", um(20, 9), 480, "Arbeit"),
        // Ein Eintrag ohne Titel (gibt es in echten Kalendern): Er wird nicht gezeigt.
        termin("h", "", um(2, 10), 60),
      ],
    } satisfies Stand),
  );
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt" });

  const server = await starteNext(PORT, { TZ: ZONE, JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"), JARVIS_MAC_LOG: LOG, JARVIS_MAC_STORE: STORE });
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const stelle = async (body: object, headers: Record<string, string> = kopf) => {
    const r = await fetch(`${BASIS}/api/kalender`, { method: "POST", headers, body: JSON.stringify(body) });
    return { status: r.status, daten: (await r.json().catch(() => ({}))) as { error?: string } };
  };
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);

    // Der Schutz der Schnittstelle: ohne den eigenen Header und von fremden Seiten trägt niemand etwas ein,
    // und fremde Seiten lesen keine Termine.
    const neu = { action: "neu", event: { title: "Eingeschleust", date: addDays(heute, 1) } };
    assert.equal((await stelle(neu, { "content-type": "application/json" })).status, 403);
    assert.equal((await stelle(neu, { ...kopf, origin: "https://boese.example" })).status, 403);
    assert.equal((await fetch(`${BASIS}/api/kalender`, { headers: { "sec-fetch-site": "cross-site" } })).status, 403);
    assert.deepEqual(aufrufe(), [], "nichts davon hat den Mac erreicht");
    schritt("ohne Header und von fremder Seite wird nichts eingetragen und nichts gelesen");

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1700 }, locale: "de-DE", timezoneId: ZONE });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    // Die Scheibe „Auf einen Blick“ als { Zeile: Wert }.
    const scheibe = seite.locator("section.glas").filter({ has: seite.getByRole("heading", { name: "Auf einen Blick" }) });
    const blick = async () => {
      const zeilen = await scheibe.locator("li").allInnerTexts();
      return Object.fromEntries(zeilen.map((z) => z.split("\n").map((s) => s.trim()).filter(Boolean)));
    };
    // Ein Tag mit Terminen ist der Abschnitt mit seiner Überschrift; seine Zeilen als „Zeit Titel“.
    const tag = (tage: number) => seite.locator("main section").filter({ has: seite.getByRole("heading", { name: new RegExp(`${lang(tage)}$`) }) });
    const zeilen = async (tage: number) => (await tag(tage).locator("li").allInnerTexts()).map((z) => z.replace(/\s+/g, " ").trim());
    const formular = seite.locator("main section").filter({ has: seite.getByLabel("Neuer Termin") });
    // Erst auf die Antwort der Schnittstelle warten, dann weiter: Der Aufruf am Mac kommt nicht sofort an.
    const klick = async (knopf: ReturnType<typeof seite.getByRole>) => {
      const antwort = seite.waitForResponse((r) => r.url().includes("/api/kalender") && r.request().method() === "POST");
      await knopf.click();
      return (await antwort).status();
    };

    // Noch nie gefragt: Der Raum bietet das Verbinden an und zeigt keine Termine.
    await seite.goto(`${BASIS}/kalender`);
    await seite.getByRole("heading", { name: "Mit dem Kalender verbinden" }).waitFor({ timeout: 30_000 });
    const verbinden = seite.getByRole("button", { name: "Kalender verbinden" });
    await verbinden.waitFor();
    assert.equal(await scheibe.count(), 0);
    assert.equal(await seite.getByLabel("Neuer Termin").count(), 0, "ohne Zugriff gibt es nichts einzutragen");
    assert.equal(await seite.getByText("Baustellentermin Halle").count(), 0);
    await bild("0-noch-nicht-verbunden");
    // Du tippst auf „Kalender verbinden“ und sagst am Mac Nein: JARVIS sagt, wo du es doch erlaubst.
    aendere({ zugriff: "verweigert" });
    assert.equal(await klick(verbinden), 200);
    await seite.getByText("macOS lässt mich nicht in deinen Kalender sehen.", { exact: false }).waitFor();
    assert.equal(modi().at(-1), "fragen", "nur dieser Klick lässt macOS nachfragen");
    assert.equal(modi().filter((m) => m === "fragen").length, 1);
    assert.equal(await klick(seite.getByRole("button", { name: "Systemeinstellungen öffnen" })), 200);
    assert.deepEqual(geoeffnet(), [["x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars"]]);
    await bild("1-verweigert");
    // In den Systemeinstellungen erlaubt, dann „Neu laden“: Die Termine sind da.
    aendere({ zugriff: "ok" });
    await seite.locator("main section").filter({ has: seite.getByRole("heading", { name: "Mit dem Kalender verbinden" }) }).getByRole("button", { name: "Neu laden" }).click();
    await scheibe.waitFor();
    assert.equal(await seite.getByRole("heading", { name: "Mit dem Kalender verbinden" }).count(), 0);
    schritt("erst verbinden, bei Nein der Weg in die Systemeinstellungen, nach dem Erlauben stehen die Termine da");

    // Die nächsten zwei Wochen: heute mit vergangenem, laufendem und kommendem Termin, freie Tage als „frei“.
    await seite.getByText("3 Kalender aus der Kalender-App auf deinem Mac").waitFor();
    assert.deepEqual(await blick(), { "Heute noch": "2", "Nächste 7 Tage": "5", "Läuft seit": "11:30" });
    await scheibe.getByText("heute: Baustellentermin Halle").waitFor();
    // („läuft“ ist ein Schildchen direkt hinter dem Titel, deshalb ohne Leerzeichen.)
    assert.deepEqual(await zeilen(0), ["08:00–09:00 Frühbesprechung Arbeit", "11:30–13:30 Baustellentermin Halleläuft Rosenheim Arbeit", "16:00–17:00 Steuerberater Privat"]);
    assert.match(await tag(0).getByRole("heading").innerText(), new RegExp(`^Heute · ${lang(0)}$`));
    assert.deepEqual(await zeilen(1), ["ganztägig Geburtstag Anna Privat"]);
    assert.deepEqual(await zeilen(3), ["10:00–11:00 Zahnarzt Privat"]);
    assert.deepEqual(await zeilen(9), ["14:00–15:00 Bankgespräch Arbeit"]);
    assert.equal(await seite.getByText("frei", { exact: true }).count(), 10, "die übrigen zehn Tage sind frei");
    assert.equal(await seite.getByText("Messe München").count(), 0, "was weiter als zwei Wochen voraus liegt, steht nicht hier");
    assert.equal(await tag(2).count(), 0, "ein Eintrag ohne Titel macht keinen Tag voll");
    await bild("2-zwei-wochen");
    schritt("die nächsten zwei Wochen stehen da: vorbei, läuft, kommt noch, ganztägig, freie Tage, die Zahlen stimmen");

    // Eintragen mit Uhrzeit: morgen um 9, eine halbe Stunde. Der Termin steht beim Mac und sofort in der Liste.
    await formular.getByText("landet in Privat").waitFor();
    await seite.getByLabel("Neuer Termin").fill("Abnahme Dach");
    await formular.getByRole("button", { name: "Morgen", exact: true }).click();
    await seite.getByLabel("Uhrzeit, leer für ganztägig").fill("09:00");
    await formular.getByRole("button", { name: "30 Min" }).click();
    assert.equal(await klick(formular.getByRole("button", { name: "Eintragen" })), 200);
    await formular.getByText("Eingetragen im Kalender Privat: Abnahme Dach, morgen um 9 Uhr.").waitFor();
    const dach = lies().events.at(-1)!;
    assert.deepEqual({ ...dach, id: "" }, { id: "", title: "Abnahme Dach", start: um(1, 9), end: um(1, 9, 30), allDay: false, location: "", calendar: "Privat" });
    assert.deepEqual(await zeilen(1), ["ganztägig Geburtstag Anna Privat", "09:00–09:30 Abnahme Dach Privat"]);
    assert.equal(await seite.getByLabel("Neuer Termin").inputValue(), "", "das Feld ist wieder leer");
    assert.equal((await blick())["Nächste 7 Tage"], "6");
    // Ohne Uhrzeit: ganztägig, an einem Tag, der bisher frei war.
    await seite.getByLabel("Neuer Termin").fill("Betriebsausflug");
    await seite.getByLabel("Tag", { exact: true }).fill(addDays(heute, 5));
    await formular.getByText("ohne Uhrzeit ganztägig").waitFor();
    assert.equal(await klick(formular.getByRole("button", { name: "Eintragen" })), 200);
    await formular.getByText(`Eingetragen im Kalender Privat: Betriebsausflug, am ${lang(5)}, ganztägig.`).waitFor();
    const ausflug = lies().events.at(-1)!;
    assert.deepEqual([ausflug.title, ausflug.start, ausflug.allDay], ["Betriebsausflug", um(5, 0), true]);
    assert.deepEqual(await zeilen(5), ["ganztägig Betriebsausflug Privat"]);
    assert.equal(await seite.getByText("frei", { exact: true }).count(), 9);
    await bild("3-eingetragen");
    schritt("eingetragen mit Uhrzeit und ganztägig: Beides steht beim Mac und in der Liste, mit dem richtigen Satz");

    // In welchen Kalender: In den Einstellungen wählbar sind nur Kalender, in die sich eintragen lässt.
    await seite.goto(`${BASIS}/einstellungen`);
    const wahl = seite.getByLabel("Kalender für neue Termine");
    await wahl.waitFor({ timeout: 30_000 });
    assert.deepEqual(await wahl.locator("option").allInnerTexts(), ["Privat", "Arbeit"]);
    const gewaehlt = seite.waitForResponse((r) => r.url().includes("/api/kalender") && r.request().method() === "POST");
    await wahl.selectOption("Arbeit");
    assert.equal((await gewaehlt).status(), 200);
    assert.equal(gespeichert().calendar?.target, "Arbeit");
    const fremd = await stelle({ action: "ziel", calendar: "Feiertage" });
    assert.equal(fremd.status, 400);
    assert.match(fremd.daten.error ?? "", /In den Kalender „Feiertage“ darf ich nicht eintragen\./);
    assert.equal(gespeichert().calendar?.target, "Arbeit");
    await seite.goto(`${BASIS}/kalender`);
    await formular.getByText("landet in Arbeit").waitFor({ timeout: 30_000 });
    await seite.getByLabel("Neuer Termin").fill("Jour fixe");
    await formular.getByRole("button", { name: "Übermorgen" }).click();
    await seite.getByLabel("Uhrzeit, leer für ganztägig").fill("15:00");
    assert.equal(await klick(formular.getByRole("button", { name: "Eintragen" })), 200);
    await formular.getByText("Eingetragen im Kalender Arbeit: Jour fixe, übermorgen um 15 Uhr.").waitFor();
    assert.deepEqual([lies().events.at(-1)!.calendar, lies().events.at(-1)!.end - lies().events.at(-1)!.start], ["Arbeit", 3_600_000], "ohne Angabe dauert ein Termin eine Stunde");
    schritt("der Kalender für neue Termine lässt sich wählen, aber kein schreibgeschützter; der nächste Termin landet dort");

    // Der gewählte Kalender ist am Mac inzwischen schreibgeschützt: Die Seite nennt den, in dem der Termin wirklich landet.
    aendere({ kalender: [{ name: "Privat", writable: true }, { name: "Arbeit", writable: false }, { name: "Feiertage", writable: false }] });
    await seite.getByRole("button", { name: "Neu laden" }).click();
    await formular.getByText("landet in Privat").waitFor();
    await seite.getByLabel("Neuer Termin").fill("Angebot nachfassen");
    await formular.getByRole("button", { name: "Morgen", exact: true }).click();
    assert.equal(await klick(formular.getByRole("button", { name: "Eintragen" })), 200);
    await formular.getByText("Eingetragen im Kalender Privat: Angebot nachfassen, morgen, ganztägig.").waitFor();
    assert.equal(lies().events.at(-1)!.calendar, "Privat");
    // Ein ausdrücklich genannter Kalender (so nennt ihn das Gespräch) wird dagegen nie still ersetzt.
    const vorher = lies().events.length;
    const fest = await stelle({ action: "neu", event: { title: "Feiertag", date: addDays(heute, 1), calendar: "Feiertage" } });
    assert.equal(fest.status, 400);
    assert.match(fest.daten.error ?? "", /Den Kalender „Feiertage“ gibt es nicht oder er ist schreibgeschützt\./);
    assert.equal(lies().events.length, vorher);
    schritt("ist der gewählte Kalender schreibgeschützt, landet der Termin im Standardkalender und die Seite sagt es; ein ausdrücklich genannter wird abgelehnt");

    // Der Mac speichert nicht (Kalender-App lehnt ab, Zugriff wieder entzogen): Die Seite meldet es, statt „Eingetragen“.
    aendere({ speichern: "abgelehnt" });
    await seite.getByLabel("Neuer Termin").fill("Geht nicht");
    assert.equal(await klick(formular.getByRole("button", { name: "Eintragen" })), 400);
    await formular.getByText("Der Kalender hat den Termin nicht gespeichert.", { exact: false }).waitFor();
    assert.equal(await formular.getByText(/^Eingetragen/).count(), 0);
    assert.equal(await seite.getByLabel("Neuer Termin").inputValue(), "Geht nicht", "der Text bleibt stehen, nichts geht verloren");
    aendere({ speichern: undefined, zugriff: "verweigert" });
    assert.equal(await klick(formular.getByRole("button", { name: "Eintragen" })), 400);
    await formular.getByText("macOS lässt mich nicht in deinen Kalender sehen.", { exact: false }).waitFor();
    assert.equal(lies().events.length, vorher, "nichts davon steht im Kalender");
    await bild("4-nicht-gespeichert");
    aendere({ zugriff: "ok" });
    schritt("speichert der Mac nicht oder ist der Zugriff weg, steht der Grund da und nichts gilt als eingetragen");

    // Zeigen: Die Kalender-App bekommt nur drei Zahlen für den Tag.
    const tagZahlen = (tage: number) => addDays(heute, tage).split("-").map((z) => String(Number(z)));
    assert.equal(await klick(tag(3).getByRole("button", { name: "Zeigen" })), 200);
    assert.equal(await klick(seite.getByRole("button", { name: "In Kalender-App öffnen" })), 200);
    assert.equal(await klick(seite.getByRole("button", { name: "Kalender-App", exact: true })), 200);
    assert.deepEqual(gezeigt(), [tagZahlen(3), tagZahlen(0), tagZahlen(14)]);
    assert.equal((await stelle({ action: "oeffnen", date: '1"; do shell script "id' })).status, 200);
    assert.deepEqual(gezeigt().at(-1), tagZahlen(0), "ein Datum, das keines ist, wird zu heute, nie zu Programmtext");
    schritt("„Zeigen“ und „In Kalender-App öffnen“ übergeben dem Mac nur Jahr, Monat und Tag");

    // Was die Schnittstelle nicht annimmt, und was es gar nicht gibt: ändern und löschen.
    const stand = readFileSync(STORE, "utf8");
    for (const [event, grund] of [
      [{ title: "  ", date: addDays(heute, 1) }, /Wie soll der Termin heißen\?/],
      [{ title: "Gestern", date: addDays(heute, -2) }, /liegt in der Vergangenheit/],
      [{ title: "Falsch", date: "morgen" }, /Datum bitte als JJJJ-MM-TT/],
      [{ title: "Falsch", date: addDays(heute, 1), time: "25:00" }, /Uhrzeit bitte als HH:MM/],
      [{ title: "Endlos", date: addDays(heute, 1), time: "09:00", minutes: 5000 }, /zwischen 5 Minuten und 24 Stunden/],
    ] as const) {
      const r = await stelle({ action: "neu", event });
      assert.equal(r.status, 400, JSON.stringify(event));
      assert.match(r.daten.error ?? "", grund);
    }
    for (const action of ["loeschen", "aendern", "delete"]) {
      const r = await stelle({ action, id: "c", event: { id: "c", title: "Geändert" } });
      assert.equal(r.status, 400);
      assert.match(r.daten.error ?? "", /Unbekannte Aktion\./);
    }
    assert.equal(readFileSync(STORE, "utf8"), stand, "am Kalender hat sich dabei nichts geändert");
    schritt("ungültige Termine werden abgelehnt; ändern und löschen kennt die Schnittstelle nicht");

    await browser.close();
    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Handprüfung Kalender: alle Schritte in Ordnung.");
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
