// Handprüfung: das Gespräch mit JARVIS, getippt im echten Browser gegen den gebauten Server, einen nachgebauten
// Claude, einen nachgebauten Mac-Kalender und einen Obsidian-Tresor, der nur ein Testordner ist (nicht Teil von
// npm test). Vorher einmal `npx next build`. Es geht nichts an Anthropic.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/gespraech-rauch.ts [Ordner für Bilder]
// Geprüft wird die ganze Strecke Eingabefeld → feste Befehle oder KI-Gehirn → Kalender, Tresor und Bildschirm:
// feste Befehle ohne Schlüssel, ein Mac, der nicht speichert, das Gespräch nach dem Neuladen, freie Fragen an
// Claude, Anhalten, eine Änderung, die erst nach deinem Ja geschieht, ein Fehler bei Claude und „Neues Gespräch“.
// Gesprochen wird hier nicht (das prüft stimme-rauch.ts); der Browser der Prüfung hat kein Mikrofon.
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";

const PORT = 3124;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("gespraech-rauch");
const MAC = testOrdner("gespraech-rauch-mac");
const STORE = path.join(MAC, "kalender.json");
const LOG = path.join(MAC, "aufrufe.log");
const TRESOR = path.join(testOrdner("gespraech-rauch-tresor"), "Mein Tresor");
const EINGANG = path.join(TRESOR, "JARVIS", "Eingang.md");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

// Was JARVIS zum Kalender sagt, hängt an der Uhrzeit („heute noch“). Wie in kalender-rauch.ts bekommen Prüfung,
// Server und Browser eine Zeitzone, in der es gerade zwischen 12 und 13 Uhr ist.
const versatz = 12 - new Date().getUTCHours();
const ZONE = `Etc/GMT${versatz >= 0 ? "-" : "+"}${Math.abs(versatz)}`;
process.env.TZ = ZONE;

type Termin = { title: string; start: number; end: number; allDay: boolean; location: string; calendar: string };
type Stand = { zugriff: string; kalender: { name: string; writable: boolean }[]; standard: string; events: Termin[]; speichern?: string };
const lies = () => JSON.parse(readFileSync(STORE, "utf8")) as Stand;
const aendere = (teil: Partial<Stand>) => writeFileSync(STORE, JSON.stringify({ ...lies(), ...teil }));
const termine = () => lies().events.map((e) => e.title);
// An welchen Tagen die Kalender-App aufgehen sollte (Jahr, Monat, Tag).
const gezeigt = () =>
  (existsSync(LOG) ? readFileSync(LOG, "utf8") : "")
    .split("\n")
    .filter(Boolean)
    .map((z) => (JSON.parse(z) as { args: string[] }).args)
    .filter((a) => a[0] === "-e" && a[1]?.includes("view calendar at"))
    .map((a) => a.slice(2).join("-"));
async function warte(bedingung: () => boolean | Promise<boolean>, was: string, ms = 20_000) {
  for (const ende = Date.now() + ms; !(await bedingung()); ) {
    if (Date.now() > ende) throw new Error(`Zeit abgelaufen: ${was}`);
    await pause(100);
  }
}

async function main() {
  assert.equal(new Date().getHours(), 12, "die Zeitzone der Prüfung steht auf Mittag");
  const { addDays, isoDate } = await import("../../src/lib/dates");
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  const jetzt = new Date();
  const heute = isoDate(jetzt);
  const um = (tage: number, stunde: number, minute = 0) => new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + tage, stunde, minute).getTime();
  const tagZahlen = (tage: number) => addDays(heute, tage).split("-").map(Number).join("-");
  writeFileSync(
    STORE,
    JSON.stringify({
      zugriff: "ok",
      kalender: [
        { name: "Privat", writable: true },
        { name: "Arbeit", writable: true },
        { name: "Feiertage", writable: false },
      ],
      standard: "Privat",
      events: [{ title: "Steuerberater", start: um(0, 16), end: um(0, 17), allDay: false, location: "", calendar: "Privat" }],
    } satisfies Stand),
  );
  mkdirSync(path.join(TRESOR, "Projekte"), { recursive: true });
  writeFileSync(path.join(TRESOR, "Projekte", "Haus.md"), `# Haus\n\n- [ ] Bauamt anrufen 📅 ${heute}\n`);
  const claude = await starteClaudeMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", vaultPath: TRESOR });

  const server = await starteNext(PORT, { TZ: ZONE, ANTHROPIC_BASE_URL: claude.url, JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"), JARVIS_MAC_LOG: LOG, JARVIS_MAC_STORE: STORE });
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const frage = (text: string) => ({ text, history: [], view: "/", focus: null, extra: [] });
  const stelle = async (body: object, headers: Record<string, string> = kopf) => {
    const r = await fetch(`${BASIS}/api/gehirn`, { method: "POST", headers, body: JSON.stringify(body) });
    return { status: r.status, text: await r.text() };
  };
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);

    // Der Schutz der Schnittstelle: ohne den eigenen Header und von fremden Seiten spricht niemand mit dem Gehirn.
    // Ohne Claude-Schlüssel sagt die Schnittstelle das, und es wird niemand gefragt.
    assert.equal((await stelle(frage("Eingeschleust"), { "content-type": "application/json" })).status, 403);
    assert.equal((await stelle(frage("Eingeschleust"), { ...kopf, origin: "https://boese.example" })).status, 403);
    assert.equal((await stelle(frage("   "))).status, 400);
    const ohne = await stelle(frage("Hallo"));
    assert.equal(ohne.status, 409);
    assert.match(ohne.text, /Das KI-Gehirn ist noch nicht eingerichtet/);
    assert.equal(claude.anfragen.length, 0);
    schritt("ohne Header, von fremder Seite und ohne Schlüssel erreicht nichts das KI-Gehirn");

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    // Ein eigener Rahmen, damit ein zweites Fenster dasselbe gespeicherte Gespräch sieht.
    const rahmen = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "de-DE", timezoneId: ZONE });
    const seite = await rahmen.newPage();
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    // Jede Anfrage der Seite an das KI-Gehirn, um zu sehen, wann sie Claude fragt und wann nicht.
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
    // Der ganze Verlauf steht im aufgeklappten Gespräch. (Die zwei Zeilen über der Leiste zeigen in dieser Prüfung
    // nur den Hinweis, dass der Browser kein Mikrofon hat.)
    const klappeAuf = async () => {
      if (await gespraech.count()) return;
      await seite.getByRole("button", { name: "Ganzes Gespräch zeigen" }).click();
      await gespraech.waitFor();
    };
    type Zeile = { wer: "du" | "jarvis"; text: string; fremd: boolean };
    const verlauf = async (): Promise<Zeile[]> => {
      await klappeAuf();
      return gespraech.locator("[aria-live=polite] > div").evaluateAll((zeilen) =>
        zeilen.map((z) => ({
          wer: z.querySelector(".sr-only") ? ("jarvis" as const) : ("du" as const),
          text: (z.querySelector("p.whitespace-pre-line") as HTMLElement | null)?.innerText.trim() ?? "",
          fremd: (z.textContent ?? "").includes("Enthält Inhalte von Dritten"),
        })),
      );
    };
    const sage = async (text: string) => {
      await feld.fill(text);
      await feld.press("Enter");
      assert.equal(await feld.inputValue(), "", "nach dem Abschicken ist das Feld leer");
    };
    // Wartet auf die fertige Antwort von JARVIS auf den letzten Satz und gibt sie zurück.
    const antwort = async (): Promise<Zeile> => {
      await klappeAuf();
      let letzte: Zeile | undefined;
      await warte(async () => {
        letzte = (await verlauf()).at(-1);
        return letzte?.wer === "jarvis" && letzte.text !== "" && (await zustand.innerText()) === "Bereit" && (await seite.getByRole("button", { name: "Anhalten" }).count()) === 0;
      }, "JARVIS antwortet");
      return letzte!;
    };

    // ---------- Ohne Claude-Schlüssel: die festen Befehle ----------
    await seite.goto(`${BASIS}/`);
    await feld.waitFor({ timeout: 30_000 });
    // Erst wenn die Seite den Kalender kennt, kann sie nach Terminen gefragt werden.
    await seite.waitForResponse((r) => r.url().endsWith("/api/kalender") && r.ok(), { timeout: 30_000 }).catch(() => undefined);
    await sage("Meine Termine");
    assert.equal((await antwort()).text, "Heute hast du einen Termin: um 16 Uhr Steuerberater.");
    await seite.waitForURL(`${BASIS}/kalender`);
    assert.deepEqual((await verlauf()).map((z) => [z.wer, z.text]), [
      ["du", "Meine Termine"],
      ["jarvis", "Heute hast du einen Termin: um 16 Uhr Steuerberater."],
    ]);
    await bild("0-meine-termine");
    await sage("Wie hoch ist der Watzmann?");
    assert.match((await antwort()).text, /^Das verstehe ich noch nicht\..*sobald in den Einstellungen das KI-Gehirn eingerichtet ist\.$/);
    assert.equal(anGehirn, 0, "ohne Schlüssel fragt die Seite das KI-Gehirn gar nicht erst");
    assert.equal(claude.anfragen.length, 0);
    schritt("ohne Schlüssel: Feste Befehle antworten, ein freier Satz bekommt eine ehrliche Auskunft, Claude wird nicht gefragt");

    // Ein Vorschlag füllt das Feld vor; der Termin steht danach beim Mac, im Raum Kalender und die Kalender-App zeigt den Tag.
    await gespraech.getByRole("button", { name: "Termin …" }).click();
    // Der Vorschlag steht im Feld, und die Schreibmarke steht dahinter (das Feld holt sie sich einen Augenblick später).
    await warte(() => feld.evaluate((f) => f === document.activeElement && (f as HTMLTextAreaElement).value === "Neuer Termin morgen um 9 Uhr: " && (f as HTMLTextAreaElement).selectionStart === (f as HTMLTextAreaElement).value.length), "der Vorschlag steht im Feld, die Schreibmarke dahinter");
    await feld.pressSequentially("Zahnarzt");
    await feld.press("Enter");
    assert.equal((await antwort()).text, "Eingetragen im Kalender Privat: Zahnarzt, morgen um 9 Uhr.");
    const zahnarzt = lies().events.at(-1)!;
    assert.deepEqual(zahnarzt, { ...zahnarzt, title: "Zahnarzt", start: um(1, 9), end: um(1, 10), allDay: false, calendar: "Privat" });
    await warte(() => gezeigt().includes(tagZahlen(1)), "die Kalender-App zeigt morgen");
    await seite.locator("main li").filter({ hasText: "Zahnarzt" }).getByText("09:00–10:00").waitFor();
    // Eine Aufgabe landet im Tresor.
    await sage("Notiere Angebot Müller prüfen bis morgen");
    assert.equal((await antwort()).text, "Notiert: Angebot Müller prüfen, fällig morgen.");
    assert.ok(readFileSync(EINGANG, "utf8").split("\n").includes(`- [ ] Angebot Müller prüfen 📅 ${addDays(heute, 1)} ➕ ${heute}`), readFileSync(EINGANG, "utf8"));
    schritt("„Termin …“ füllt das Feld vor; Termin und Aufgabe stehen danach im Kalender und im Tresor, die Kalender-App zeigt den Tag");

    // Der Mac speichert nicht: JARVIS sagt das, statt „Eingetragen“.
    aendere({ speichern: "abgelehnt" });
    await sage("Trag übermorgen um 10 Uhr Notar ein");
    const abgelehnt = await antwort();
    assert.match(abgelehnt.text, /^Der Kalender hat den Termin nicht gespeichert\./);
    assert.ok(!(await verlauf()).some((z) => /Eingetragen.*Notar/.test(z.text)), "nichts davon gilt als eingetragen");
    assert.deepEqual(termine(), ["Steuerberater", "Zahnarzt"]);
    aendere({ speichern: undefined });
    // Ein genannter Kalender gilt fest: In „Arbeit“ landet der Termin dort, und der Name steht nicht im Titel. In
    // „Feiertage“ darf niemand eintragen; dann wird nichts eingetragen, auch nicht woanders.
    await sage("Trag übermorgen um 11 Uhr Abnahme in den Kalender Arbeit ein");
    assert.equal((await antwort()).text, "Eingetragen im Kalender Arbeit: Abnahme, übermorgen um 11 Uhr.");
    const abnahme = lies().events.at(-1)!;
    assert.deepEqual(abnahme, { ...abnahme, title: "Abnahme", start: um(2, 11), calendar: "Arbeit" });
    await sage("Trag übermorgen um 12 Uhr Brotzeit in den Kalender Feiertage ein");
    assert.match((await antwort()).text, /Den Kalender „Feiertage“ gibt es nicht oder er ist schreibgeschützt\./);
    assert.ok(!(await verlauf()).some((z) => /Eingetragen.*Brotzeit/.test(z.text)), "nichts davon gilt als eingetragen");
    assert.deepEqual(termine(), ["Steuerberater", "Zahnarzt", "Abnahme"]);
    await bild("1-feste-befehle");
    schritt("speichert der Mac nicht, steht der Grund im Gespräch; ein genannter Kalender gilt fest, in einen schreibgeschützten wird nichts eingetragen");

    // Das Gespräch übersteht das Neuladen der Seite.
    const vorher = (await verlauf()).map((z) => [z.wer, z.text]);
    assert.equal(vorher.length, 14);
    await seite.reload();
    await feld.waitFor({ timeout: 30_000 });
    assert.deepEqual((await verlauf()).map((z) => [z.wer, z.text]), vorher);
    // JARVIS frisch geöffnet (ein neues Fenster): Über der Leiste steht der Hinweis, einmal zu klicken, vorher darf
    // der Browser nicht zuhören. Schon dieser erste Klick, genau auf diese Zeile, klappt das Gespräch auf.
    const frisch = await rahmen.newPage();
    frisch.on("pageerror", (e) => fehler.push(e.message));
    // Ob der Browser der Prüfung ein neues Fenster schon als „angeklickt“ führt, wechselt von Lauf zu Lauf. Hier gilt
    // fest, was am Mac nach dem Öffnen gilt: Es wurde noch nicht geklickt.
    await frisch.addInitScript(() => Object.defineProperty(navigator, "userActivation", { value: { hasBeenActive: false, isActive: false }, configurable: true }));
    await frisch.goto(`${BASIS}/kalender`);
    const antwortzeile = frisch.getByRole("button", { name: "Ganzes Gespräch zeigen" });
    await antwortzeile.getByText("Klick einmal irgendwo auf die Seite, dann höre ich zu.").waitFor({ timeout: 30_000 });
    await antwortzeile.click();
    await frisch.getByRole("region", { name: "Gespräch" }).getByText("Notiert: Angebot Müller prüfen, fällig morgen.").waitFor({ timeout: 5000 });
    await frisch.close();
    schritt("nach dem Neuladen und in einem neuen Fenster steht das Gespräch wieder da; schon der erste Klick auf die Zeile über der Leiste klappt es auf");

    // ---------- Mit Claude-Schlüssel (nachgebauter Claude) ----------
    await config.writeConfig({ name: "Benedikt", vaultPath: TRESOR, claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
    const eingerichtet = seite.waitForResponse((r) => r.url().includes("/api/einstellungen") && r.ok(), { timeout: 30_000 });
    await seite.reload();
    await eingerichtet;
    await feld.waitFor();
    // Ein kurzer fester Befehl bleibt am Mac: Dafür wird Claude nicht gefragt.
    await sage("Meine Termine");
    assert.match((await antwort()).text, /^Heute hast du einen Termin: um 16 Uhr Steuerberater\./);
    assert.equal(claude.anfragen.length, 0, "ein kurzer fester Befehl geht nicht an Claude");
    // Ein freier Satz geht an Claude. Solange er nachdenkt, steht das da, und aus „Senden“ wird „Anhalten“.
    claude.bedenkzeit(2500);
    claude.drehbuch([{ text: "Der Watzmann ist 2713 Meter hoch. Damit ist er der dritthöchste Berg Deutschlands." }]);
    await sage("Wie hoch ist der Watzmann?");
    await seite.getByRole("button", { name: "Anhalten" }).waitFor();
    await warte(async () => (await zustand.innerText()) === "Denke nach …", "die Seite zeigt, dass JARVIS nachdenkt");
    assert.equal(await seite.getByRole("button", { name: "Senden" }).count(), 0);
    await bild("2-denkt-nach");
    const berg = await antwort();
    assert.equal(berg.text, "Der Watzmann ist 2713 Meter hoch. Damit ist er der dritthöchste Berg Deutschlands.");
    assert.equal(claude.anfragen.length, 1);
    const gesendet = JSON.stringify(claude.anfragen[0].messages);
    assert.ok(gesendet.includes("Wie hoch ist der Watzmann?"), "die Frage geht an Claude");
    assert.ok(gesendet.includes("Notiert: Angebot Müller prüfen, fällig morgen."), "und was vorher im Gespräch stand, geht mit");
    assert.ok(!JSON.stringify(claude.anfragen[0]).includes("sk-test-nur-fuer-den-mock"), "der Schlüssel steht nie im Text an das Modell");
    schritt("mit Schlüssel: Kurze feste Befehle bleiben am Mac, ein freier Satz geht mit dem bisherigen Gespräch an Claude, die Antwort steht da");

    // Anhalten, sofort nach dem Abschicken (die Frage ist noch gar nicht unterwegs): Sie geht auch nicht mehr los.
    claude.drehbuch([{ text: "Diese Antwort darf nie erscheinen." }]);
    const vorSofort = anGehirn;
    await sage("Erzähl mir bitte ausführlich die Geschichte der Stadt Rosenheim");
    await seite.getByRole("button", { name: "Anhalten" }).click();
    await seite.getByRole("button", { name: "Senden" }).waitFor();
    await warte(async () => (await zustand.innerText()) === "Bereit", "JARVIS ist wieder bereit");
    await pause(1500);
    assert.equal(anGehirn, vorSofort, "eine sofort angehaltene Frage geht nicht mehr an das KI-Gehirn");
    assert.equal(claude.anfragen.length, 0);
    // Anhalten, während Claude nachdenkt: Die Antwort, die er erst später gegeben hätte, erscheint nie.
    const unterwegs = seite.waitForRequest((r) => r.url().includes("/api/gehirn"));
    await sage("Dann erzähl mir bitte ausführlich die Geschichte der Stadt Traunstein");
    await unterwegs;
    await seite.getByRole("button", { name: "Anhalten" }).click();
    await seite.getByRole("button", { name: "Senden" }).waitFor();
    await warte(async () => (await zustand.innerText()) === "Bereit", "JARVIS ist wieder bereit");
    await pause(3500);
    assert.equal(await seite.getByText("Diese Antwort darf nie erscheinen.").count(), 0);
    assert.equal((await verlauf()).at(-1)!.text, "Dann erzähl mir bitte ausführlich die Geschichte der Stadt Traunstein", "von der angehaltenen Antwort bleibt auch keine leere Zeile stehen");
    claude.bedenkzeit(0);
    schritt("„Anhalten“ gilt sofort: Eine Frage, die noch nicht unterwegs ist, geht nicht mehr los; denkt Claude schon nach, erscheint seine Antwort nicht mehr");

    // Eine Änderung, die das Modell will, geschieht erst nach deinem Ja. Erst Nein, dann Ja.
    const notar = { werkzeug: "termin_eintragen", eingabe: { titel: "Notartermin", datum: addDays(heute, 2), uhrzeit: "10:00", dauer_minuten: 60, ort: "Rosenheim", kalender: "" } };
    const freigabe = seite.getByRole("status").filter({ hasText: "Freigabe" });
    const bitte = async () => {
      claude.drehbuch([notar, { text: "Der Termin wartet oben auf dein Ja." }]);
      await sage("Trag bitte den Notartermin übermorgen um zehn in Rosenheim ein, wenn das so für dich passt");
      assert.equal((await antwort()).text, "Der Termin wartet oben auf dein Ja.");
      await freigabe.getByText(`Termin eintragen: „Notartermin“ am ${addDays(heute, 2)} um 10:00, Rosenheim`).waitFor();
      // (Das Drehbuch zählt die Anfragen neu: Die erste trägt den Wunsch des Modells, die zweite das Ergebnis.)
      assert.equal(claude.anfragen.length, 2);
      assert.match(JSON.stringify(claude.anfragen[1].messages), /wartet auf die Freigabe/, "das Modell erfährt, dass noch nichts geschehen ist");
      assert.deepEqual(termine(), ["Steuerberater", "Zahnarzt", "Abnahme"], "ohne dein Ja ist nichts eingetragen");
    };
    await bitte();
    await bild("3-freigabe");
    await freigabe.getByRole("button", { name: "Nein" }).click();
    await freigabe.waitFor({ state: "detached" });
    assert.deepEqual(termine(), ["Steuerberater", "Zahnarzt", "Abnahme"], "ein Nein trägt nichts ein");
    await bitte();
    await freigabe.getByRole("button", { name: "Ja, ausführen" }).click();
    await freigabe.waitFor({ state: "detached" });
    await warte(() => termine().includes("Notartermin"), "der Termin steht nach dem Ja im Kalender");
    const eingetragen = lies().events.at(-1)!;
    assert.deepEqual(eingetragen, { ...eingetragen, title: "Notartermin", start: um(2, 10), end: um(2, 11), location: "Rosenheim", calendar: "Privat" });
    await warte(() => gezeigt().includes(tagZahlen(2)), "die Kalender-App zeigt den Tag des neuen Termins");
    // Oben steht, was geschehen ist, und der Raum Kalender zeigt den Termin sofort, nicht erst nach Minuten.
    await seite.getByText(`Eingetragen im Kalender Privat: Notartermin, ${addDays(heute, 2)} um 10:00.`).waitFor();
    await seite.locator("main li").filter({ hasText: "Notartermin" }).getByText("10:00–11:00").waitFor({ timeout: 5000 });
    await bild("4-nach-dem-ja");
    schritt("ein Termin, den das Modell eintragen will, wartet auf dein Ja: Nein trägt nichts ein, Ja genau diesen Termin, und der Raum zeigt ihn sofort");

    // Claude fällt mitten in der Antwort aus: Das steht verständlich da, und das Gespräch geht danach weiter.
    claude.drehbuch([{ abbruch: true }]);
    await sage("Was hältst du von einem zweiten Standort in Traunstein?");
    const ausfall = await antwort();
    await bild("5-claude-faellt-aus");
    assert.equal(ausfall.text, "Die Verbindung zu Claude ist abgerissen. Frag mich bitte noch einmal.");
    claude.drehbuch([{ text: "Jetzt bin ich wieder da." }]);
    await sage("Bist du noch da und kannst du mich gerade hören?");
    assert.equal((await antwort()).text, "Jetzt bin ich wieder da.");
    schritt("fällt Claude mitten in der Antwort aus, steht das verständlich da, und die nächste Frage wird wieder beantwortet");

    // Neues Gespräch: Der Verlauf ist weg, auch nach dem Neuladen, und Claude bekommt ihn nicht mehr.
    await gespraech.getByRole("button", { name: "Neues Gespräch" }).click();
    assert.deepEqual(await verlauf(), []);
    await seite.reload();
    await feld.waitFor({ timeout: 30_000 });
    claude.drehbuch([{ text: "Guten Tag, Benedikt." }]);
    await sage("Sag mir bitte einfach kurz und freundlich Guten Tag");
    const gruss = await antwort();
    assert.equal(gruss.text, "Guten Tag, Benedikt.");
    assert.equal(gruss.fremd, false, "im neuen Gespräch steht nichts von Dritten, also auch kein Hinweis darauf");
    assert.deepEqual((await verlauf()).map((z) => z.wer), ["du", "jarvis"]);
    assert.ok(!JSON.stringify(claude.anfragen.at(-1)!.messages).includes("Watzmann"), "vom alten Gespräch geht nichts mehr an Claude");
    schritt("„Neues Gespräch“ leert den Verlauf, auch über das Neuladen hinweg und für Claude");

    await browser.close();
    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Handprüfung Gespräch: alle Schritte in Ordnung.");
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
