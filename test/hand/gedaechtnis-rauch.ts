// Handprüfung: das persönliche Gedächtnis im echten Browser gegen den gebauten Server (nicht Teil von npm test).
// Geprüft wird die ganze Strecke Seite → Schnittstelle → Datei: viele Einträge zur selben Zeit, und vor allem die
// beschädigte Datei. Sie darf nie stillschweigend durch eine leere ersetzt werden; die Seite sagt, was los ist,
// das Gespräch geht weiter, und „beiseitelegen“ zerstört nichts. Claude ist nachgebaut; es geht nichts an echte
// Dienste. Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/gedaechtnis-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";

const PORT = 3116;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("gedaechtnis-rauch");
const DATEI = path.join(ordner, "gedaechtnis.json");
const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Sieht aus wie ein echter Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const CLAUDE = ["sk-ant-api03", "test", "nur", "fuer", "die", "handpruefung"].join("-");
// Was in der beschädigten Datei steht. Es darf nirgends auftauchen: nicht auf der Seite, nicht beim Modell.
const GEHEIM = "Kontonummer 4711 der beschädigten Datei";
const KAPUTT = `{ "facts": [ { "id": "g1", "text": "${GEHEIM}", "at": "2026-01-02T08:00:00.000Z" }, `;

type Fakt = { id: string; text: string; at: string };
const gespeichert = () => (JSON.parse(readFileSync(DATEI, "utf8")) as { facts: Fakt[] }).facts;
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

async function main() {
  const claude = await starteClaudeMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", claude: { apiKey: CLAUDE } });

  let server: ChildProcess | null = null;
  const stop = () => {
    try {
      if (server?.pid) process.kill(-server.pid, "SIGTERM");
    } catch {}
    server = null;
  };
  // Der Server hält das Gedächtnis im Speicher. Eine von außen veränderte Datei sieht er erst nach einem Neustart,
  // genau wie am Mac.
  const start = async () => {
    stop();
    await warte(1500);
    server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, PORT: String(PORT), ANTHROPIC_BASE_URL: claude.url }, stdio: "ignore", detached: true });
    for (let i = 0; ; i++) {
      if (await fetch(`${BASIS}/api/einstellungen`).then((r) => r.ok, () => false)) break;
      if (i > 120) throw new Error("Der Server ist nicht gestartet.");
      await warte(500);
    }
  };
  const kopf = { "content-type": "application/json", "x-jarvis": "1" };
  const stelle = async (body: object) => {
    const r = await fetch(`${BASIS}/api/gedaechtnis`, { method: "POST", headers: kopf, body: JSON.stringify(body) });
    return { status: r.status, daten: (await r.json()) as { error?: string; fehler?: string; facts?: Fakt[] } };
  };
  try {
    await start();
    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.locator("#gedaechtnis").screenshot({ path: path.join(bilder, name) });
    };
    await seite.goto(`${BASIS}/einstellungen`);
    const abschnitt = seite.locator("#gedaechtnis");
    await abschnitt.getByText("Noch nichts.").waitFor();
    schritt("leeres Gedächtnis: Die Seite sagt „Noch nichts“");

    // 1. Zwanzig Einträge im selben Augenblick, aus der Seite heraus abgeschickt. Keiner darf verloren gehen.
    //    (Als Text übergeben: tsx hängt an benannte Funktionen einen Helfer, den es in der Seite nicht gibt.)
    const saetze = Array.from({ length: 20 }, (_, i) => `Merksatz Nummer ${i + 1}`);
    const antworten = (await seite.evaluate(
      `Promise.all(${JSON.stringify(saetze)}.map((text) => fetch("/api/gedaechtnis", { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1" }, body: JSON.stringify({ action: "merken", text }) }).then((r) => r.status)))`,
    )) as number[];
    assert.deepEqual(antworten, saetze.map(() => 200));
    assert.deepEqual(gespeichert().map((f) => f.text).sort(), [...saetze].sort());
    assert.equal(statSync(DATEI).mode & 0o777, 0o600);
    schritt("zwanzig Einträge zur selben Zeit: alle zwanzig stehen in der Datei, die Datei ist nur für dich lesbar");

    // 2. Über die Seite: selbst etwas eintragen, einen Eintrag vergessen.
    await seite.reload();
    await abschnitt.getByText("Merksatz Nummer 20").waitFor();
    await abschnitt.getByLabel("Neuer Eintrag").fill("Ich trinke meinen <b>Kaffee</b> schwarz.");
    await abschnitt.getByRole("button", { name: "Merken", exact: true }).click();
    await abschnitt.getByText("Ich trinke meinen").waitFor();
    const kaffee = gespeichert().find((f) => f.text.includes("Kaffee"));
    assert.ok(kaffee && !/[<>]/.test(kaffee.text), "spitze Klammern fallen beim Merken weg");
    await abschnitt.locator("li", { hasText: "Merksatz Nummer 7" }).first().getByRole("button", { name: "Vergessen" }).click();
    await abschnitt.locator("li", { hasText: /Merksatz Nummer 7\b/ }).waitFor({ state: "detached" });
    assert.equal(gespeichert().length, 20);
    assert.ok(!gespeichert().some((f) => f.text === "Merksatz Nummer 7"));
    await bild("gedaechtnis-gefuellt.png");
    schritt("über die Seite: Eintrag angelegt (ohne spitze Klammern) und einen Eintrag vergessen; beides steht in der Datei");

    // 3. Die Datei wird von außen beschädigt (halb geschrieben), JARVIS startet neu.
    writeFileSync(DATEI, KAPUTT);
    await start();
    await seite.reload();
    await abschnitt.getByText("Die Datei des Gedächtnisses ist beschädigt.").waitFor();
    const text = await abschnitt.innerText();
    assert.ok(text.includes(DATEI), "die Seite nennt die Datei");
    assert.match(text, /Daraus lässt sich nichts mehr lesen/);
    assert.ok(!(await seite.locator("body").innerText()).includes("4711"), "was in der Datei steht, erscheint nicht auf der Seite");
    assert.equal(await abschnitt.getByLabel("Neuer Eintrag").count(), 0, "solange die Datei beschädigt ist, gibt es kein Feld zum Eintragen");
    await bild("gedaechtnis-beschaedigt.png");
    schritt("beschädigte Datei nach Neustart: Die Seite sagt es, nennt die Datei und zeigt nichts von ihrem Inhalt");

    // 4. Merken und Vergessen werden abgelehnt; die Datei bleibt Byte für Byte, wie sie ist.
    const merken = await stelle({ action: "merken", text: "Das darf die Datei nicht überschreiben." });
    assert.equal(merken.status, 500);
    assert.match(merken.daten.error ?? "", /beschädigt/);
    assert.ok(!(merken.daten.error ?? "").includes("4711") && !(merken.daten.error ?? "").includes(ordner), "der Satz nennt weder Inhalt noch Ort der Datei");
    assert.equal((await stelle({ action: "vergessen", id: "g1" })).status, 500);
    assert.equal(readFileSync(DATEI, "utf8"), KAPUTT);
    schritt("Merken und Vergessen werden mit einem festen Satz abgelehnt; die beschädigte Datei ist unverändert");

    // 5. Das Gespräch geht weiter. Das Modell erfährt, dass das Gedächtnis nicht lesbar ist, aber nichts aus der Datei.
    claude.drehbuch([{ text: "Guten Morgen, Benedikt." }]);
    const vorher = claude.anfragen.length;
    const antwort = await fetch(`${BASIS}/api/gehirn`, { method: "POST", headers: kopf, body: JSON.stringify({ text: "Was weißt du über mich?", history: [], view: "/", focus: null, extra: [] }) });
    const zeilen = (await antwort.text()).split("\n").filter(Boolean).map((z) => JSON.parse(z) as { type: string; error?: string; reply?: { reply?: string } });
    assert.ok(!zeilen.some((z) => z.type === "error"), `das Gespräch meldet keinen Fehler: ${JSON.stringify(zeilen.find((z) => z.type === "error"))}`);
    assert.match(zeilen.find((z) => z.type === "done")?.reply?.reply ?? "", /Guten Morgen/);
    const gesendet = JSON.stringify(claude.anfragen.slice(vorher));
    assert.ok(gesendet.includes("Das Gedächtnis lässt sich gerade nicht lesen"), "das Modell erfährt, dass das Gedächtnis nicht lesbar ist");
    assert.ok(!gesendet.includes("4711"), "nichts aus der beschädigten Datei geht ans Modell");
    assert.equal(readFileSync(DATEI, "utf8"), KAPUTT);
    schritt("das Gespräch antwortet weiter; das Modell weiß, dass das Gedächtnis fehlt, und bekommt nichts aus der Datei");

    // 6. „Beiseitelegen“ über die Seite: Die beschädigte Datei bleibt unter neuem Namen erhalten, JARVIS fängt leer an.
    await abschnitt.getByRole("button", { name: "Datei beiseitelegen und leer anfangen" }).click();
    await abschnitt.getByText("Noch nichts.").waitFor();
    const beiseite = readdirSync(ordner).filter((n) => n.startsWith("gedaechtnis.json.beschaedigt-"));
    assert.equal(beiseite.length, 1, "genau eine beiseitegelegte Datei");
    assert.equal(readFileSync(path.join(ordner, beiseite[0]), "utf8"), KAPUTT, "die beiseitegelegte Datei hat den alten Inhalt, Byte für Byte");
    assert.deepEqual(gespeichert(), []);
    schritt(`beiseitegelegt: ${beiseite[0].replace(/\d+$/, "…")} hat den alten Inhalt, das Gedächtnis ist leer`);

    // 7. Danach geht alles wieder, auch nach einem weiteren Neustart.
    await abschnitt.getByLabel("Neuer Eintrag").fill("Meine Frau heißt Anna.");
    await abschnitt.getByRole("button", { name: "Merken", exact: true }).click();
    await abschnitt.getByText("Meine Frau heißt Anna.").waitFor();
    await start();
    await seite.reload();
    await abschnitt.getByText("Meine Frau heißt Anna.").waitFor();
    assert.deepEqual(gespeichert().map((f) => f.text), ["Meine Frau heißt Anna."]);
    schritt("danach: neuer Eintrag über die Seite, steht in der Datei und ist nach einem Neustart noch da");

    // 8. Eine Datei, in der nur einzelne Einträge kaputt sind: Die Seite nennt die Zahl der lesbaren, und beim
    //    Beiseitelegen bleiben genau die erhalten.
    const gut = [...gespeichert(), { id: "g9", text: "Fährt montags nach München.", at: "2026-10-05T07:00:00.000Z" }];
    const halb = JSON.stringify({ facts: [gut[0], { id: "g8", text: `${GEHEIM} ohne Zeit` }, gut[1], { id: "g7", text: "Zeit unlesbar", at: "gestern" }] }, null, 2);
    writeFileSync(DATEI, halb);
    await start();
    await seite.reload();
    await abschnitt.getByText("2 Einträge lassen sich daraus noch lesen.").waitFor();
    assert.ok(!(await seite.locator("body").innerText()).includes("München"), "bis zum Beiseitelegen gilt auch von den lesbaren Einträgen nichts");
    await bild("gedaechtnis-teils-lesbar.png");
    await abschnitt.getByRole("button", { name: "Datei beiseitelegen und Lesbares behalten" }).click();
    await abschnitt.getByText("Fährt montags nach München.").waitFor();
    await abschnitt.getByText("Meine Frau heißt Anna.").waitFor();
    assert.deepEqual(gespeichert(), gut);
    const zwei = readdirSync(ordner).filter((n) => n.startsWith("gedaechtnis.json.beschaedigt-"));
    assert.equal(zwei.length, 2);
    assert.ok(zwei.some((n) => readFileSync(path.join(ordner, n), "utf8") === halb), "auch diese Datei liegt Byte für Byte daneben");
    assert.ok(zwei.every((n) => (statSync(path.join(ordner, n)).mode & 0o777) === 0o600), "die beiseitegelegten Dateien sind nur für dich lesbar");
    await bild("gedaechtnis-danach.png");
    schritt("teils lesbare Datei: Die Seite nennt „2 Einträge“, nach dem Beiseitelegen sind genau die zwei da, die Datei liegt daneben");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    assert.deepEqual(readdirSync(ordner).filter((n) => n.endsWith(".tmp")), [], "keine Nebendatei bleibt liegen");
    schritt("keine Fehler in der Seite, keine liegen gebliebene Nebendatei");
    await browser.close();
    console.log("Handprüfung Gedächtnis: alle Schritte in Ordnung.");
  } finally {
    stop();
    await claude.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
