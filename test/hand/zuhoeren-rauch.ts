// Handprüfung: JARVIS hört zu. Im echten Browser gegen den gebauten Server, mit einem nachgebauten Mikrofon und
// einer nachgebauten Stimme (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/zuhoeren-rauch.ts [Ordner für Bilder]
// Der Browser der Prüfung hat weder Mikrofon noch Lautsprecher. Die Prüfung ersetzt deshalb die Spracherkennung
// und die Sprachausgabe des Browsers durch zwei Nachbauten: Was „das Mikrofon hört“, sagt die Prüfung an, und was
// JARVIS „spricht“, schreibt der Nachbau mit. Geprüft wird alles dahinter, so wie die Seite es wirklich tut: das
// Weckwort, der Befehl per Stimme bis in den Tresor, das Zuhören nach der Antwort, „Stopp“ und „Jarvis, stopp“,
// das eigene Echo, Fehler des Mikrofons und das Abschalten. Ob ein echtes Mikrofon „Jarvis“ richtig versteht,
// prüft das nicht: Das geht nur am Mac.
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { mittagsZone } from "../helfer/uhrzeiten";
import { starteClaudeMock } from "../mocks/claude-mock";

const PORT = 3131;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("zuhoeren-rauch");
const MAC = testOrdner("zuhoeren-rauch-mac");
const STORE = path.join(MAC, "kalender.json");
const TRESOR = path.join(testOrdner("zuhoeren-rauch-tresor"), "Mein Tresor");
const EINGANG = path.join(TRESOR, "JARVIS", "Eingang.md");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

const ZONE = mittagsZone();
process.env.TZ = ZONE;

// So lange wartet JARVIS nach „Jarvis“ oder nach seiner Antwort auf deinen Satz (COMMAND_MS in useVoice.ts).
const WARTET_MS = 8000;

// Mikrofon und Stimme für den Browser der Prüfung. Als Text und nicht als Funktion: tsx hängt benannten Funktionen
// einen Aufruf an, den es im Browser nicht gibt.
// Das Mikrofon verhält sich wie die Erkennung in Chrome: Ein Lauf sammelt seine Ergebnisse, ein Satz kommt erst
// vorläufig und dann fertig, nach einem Fehler oder einem Abbruch meldet sich der Lauf mit „Ende“.
// Die Stimme spricht Satz für Satz nacheinander; jeder Satz dauert __stimme.dauer Millisekunden.
const NACHBAU = `(() => {
  const ohr = { gestartet: 0, zugleich: 0, fehlerBeimStart: null, sofortEnde: false, einstellung: null, toene: 0 };
  const laeufe = [];
  const laufend = () => laeufe.filter((l) => l.laeuft);
  class Erkennung {
    constructor() {
      this.lang = ""; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1;
      this.onstart = null; this.onresult = null; this.onerror = null; this.onend = null;
      this.laeuft = false; this.ergebnisse = [];
      laeufe.push(this);
    }
    start() {
      if (this.laeuft) throw new DOMException("Die Erkennung läuft schon.", "InvalidStateError");
      ohr.gestartet++;
      ohr.einstellung = { lang: this.lang, continuous: this.continuous, interimResults: this.interimResults };
      this.laeuft = true;
      ohr.zugleich = Math.max(ohr.zugleich, laufend().length);
      const fehler = ohr.fehlerBeimStart;
      setTimeout(() => {
        if (!this.laeuft) return;
        if (fehler) { this.onerror && this.onerror({ error: fehler }); this.ende(); return; }
        this.onstart && this.onstart(new Event("start"));
        if (ohr.sofortEnde) this.ende();
      }, 5);
    }
    ende() {
      if (!this.laeuft) return;
      this.laeuft = false;
      setTimeout(() => this.onend && this.onend(new Event("end")), 5);
    }
    abort() { this.ende(); }
    stop() { this.ende(); }
  }
  ohr.laufend = () => laufend().length;
  ohr.hoert = (text, fertig) => {
    const l = laufend().at(-1);
    if (!l || !l.onresult) return false;
    const letzter = l.ergebnisse.at(-1);
    const eintrag = Object.assign([{ transcript: text, confidence: 0.9 }], { isFinal: fertig });
    if (letzter && !letzter.isFinal) l.ergebnisse[l.ergebnisse.length - 1] = eintrag;
    else l.ergebnisse.push(eintrag);
    l.onresult({ resultIndex: l.ergebnisse.length - 1, results: l.ergebnisse });
    return true;
  };
  ohr.fehler = (art) => {
    const l = laufend().at(-1);
    if (!l) return false;
    l.onerror && l.onerror({ error: art });
    l.ende();
    return true;
  };
  ohr.endet = () => laufend().forEach((l) => l.ende());
  window.__ohr = ohr;
  window.SpeechRecognition = Erkennung;
  window.webkitSpeechRecognition = Erkennung;

  // Der Doppelton nach „Jarvis“: zwei Töne je Mal.
  const Ton = window.AudioContext;
  if (Ton) {
    const echt = Ton.prototype.createOscillator;
    Ton.prototype.createOscillator = function () { ohr.toene++; return echt.call(this); };
  }

  const stimme = { saetze: [], jetzt: "", abgebrochen: 0, fertig: 0, dauer: 1200 };
  let schlange = [];
  let uhr = [];
  const weiter = () => {
    const u = schlange[0];
    if (!u) { stimme.jetzt = ""; return; }
    stimme.jetzt = u.text;
    stimme.saetze.push(u.text);
    uhr = [
      setTimeout(() => u.onstart && u.onstart(new Event("start")), 30),
      setTimeout(() => { schlange.shift(); stimme.fertig++; u.onend && u.onend(new Event("end")); weiter(); }, stimme.dauer),
    ];
  };
  const synth = {
    get speaking() { return schlange.length > 0; }, pending: false, paused: false, onvoiceschanged: null,
    getVoices: () => [],
    pause: () => {}, resume: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    cancel: () => {
      uhr.forEach(clearTimeout);
      const offen = schlange;
      schlange = [];
      stimme.jetzt = "";
      if (offen.length) stimme.abgebrochen++;
      offen.forEach((u) => setTimeout(() => u.onerror && u.onerror({ error: "interrupted" }), 0));
    },
    speak: (u) => { schlange.push(u); if (schlange.length === 1) weiter(); },
  };
  window.__stimme = stimme;
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
})()`;

type Ohr = { gestartet: number; zugleich: number; laufend: number; toene: number; einstellung: { lang: string; continuous: boolean; interimResults: boolean } | null };
type Stimme = { saetze: string[]; jetzt: string; abgebrochen: number; fertig: number };

async function warte(bedingung: () => boolean | Promise<boolean>, was: string, ms = 20_000) {
  for (const ende = Date.now() + ms; !(await bedingung()); ) {
    if (Date.now() > ende) throw new Error(`Zeit abgelaufen: ${was}`);
    await pause(50);
  }
}

async function main() {
  assert.equal(new Date().getHours(), 12, "die Zeitzone der Prüfung steht auf Mittag");
  const { isoDate } = await import("../../src/lib/dates");
  for (const mock of ["osascript-mock.mjs", "open-mock.mjs"]) chmodSync(path.join("test/mocks", mock), 0o755);
  const heute = isoDate(new Date());
  writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [] }));
  mkdirSync(path.join(TRESOR, "Projekte"), { recursive: true });
  writeFileSync(path.join(TRESOR, "Projekte", "Haus.md"), `# Haus\n\n- [ ] Bauamt anrufen 📅 ${heute}\n- [ ] Angebot Dach prüfen 📅 ${heute}\n- [ ] Rechnung Zimmerer bezahlen 📅 ${heute}\n`);
  const claude = await starteClaudeMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", vaultPath: TRESOR });

  const server = await starteNext(PORT, {
    TZ: ZONE,
    ANTHROPIC_BASE_URL: claude.url,
    JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"),
    JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"),
    JARVIS_MAC_LOG: path.join(MAC, "aufrufe.log"),
    JARVIS_MAC_STORE: STORE,
  });
  const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);
    const fehler: string[] = [];
    const neueSeite = async (vorher?: string) => {
      const rahmen = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "de-DE", timezoneId: ZONE });
      const s = await rahmen.newPage();
      await s.addInitScript(NACHBAU);
      if (vorher) await s.addInitScript(vorher);
      s.on("pageerror", (e) => fehler.push(e.message));
      return s;
    };
    let seite: Page = await neueSeite();
    let anGehirn = 0;
    seite.on("request", (r) => {
      if (r.url().includes("/api/gehirn")) anGehirn++;
    });
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`) });
    };
    const feld = () => seite.getByLabel("Nachricht an JARVIS");
    const zustand = () => seite.locator("form").getByRole("status").innerText();
    const ist = (soll: string, ms = 5000) => warte(async () => (await zustand()) === soll, `die Anzeige steht auf „${soll}“ (sie zeigt „${"?"}“)`, ms).catch(async (e) => Promise.reject(new Error(`${(e as Error).message.replace("„?“", `„${await zustand()}“`)}`)));
    const ohr = () =>
      seite.evaluate(() => {
        const o = (window as unknown as { __ohr: Omit<Ohr, "laufend"> & { laufend: () => number } }).__ohr;
        return { gestartet: o.gestartet, zugleich: o.zugleich, laufend: o.laufend(), toene: o.toene, einstellung: o.einstellung };
      }) as Promise<Ohr>;
    const stimme = () =>
      seite.evaluate(() => {
        const s = (window as unknown as { __stimme: Stimme }).__stimme;
        return { saetze: [...s.saetze], jetzt: s.jetzt, abgebrochen: s.abgebrochen, fertig: s.fertig };
      }) as Promise<Stimme>;
    // Das Mikrofon hört einen Satz: erst vorläufig (fertig = false), dann fertig.
    const hoert = async (text: string, fertig = true) => {
      const kam = await seite.evaluate(([t, f]) => (window as unknown as { __ohr: { hoert: (t: string, f: boolean) => boolean } }).__ohr.hoert(t as string, f as boolean), [text, fertig]);
      assert.equal(kam, true, `das Mikrofon ist an, als „${text}“ fällt`);
    };
    const setze = (was: string) => seite.evaluate(was);
    const gespraech = () => seite.getByRole("region", { name: "Gespräch" });
    const klappeAuf = async () => {
      if (await gespraech().count()) return;
      await seite.getByRole("button", { name: /Ganzes Gespräch zeigen/ }).click();
      await gespraech().waitFor();
    };
    type Zeile = { wer: "du" | "jarvis"; text: string };
    const verlauf = async (): Promise<Zeile[]> => {
      await klappeAuf();
      return gespraech()
        .locator("[aria-live=polite] > div")
        .evaluateAll((zeilen) =>
          zeilen
            .filter((z) => z.querySelector("p.whitespace-pre-line"))
            .map((z) => ({ wer: z.querySelector(".sr-only") ? ("jarvis" as const) : ("du" as const), text: (z.querySelector("p.whitespace-pre-line") as HTMLElement | null)?.innerText.trim() ?? "" })),
        );
    };
    const meine = async () => (await verlauf()).filter((z) => z.wer === "du").map((z) => z.text);
    // Wartet, bis JARVIS auf einen neuen Satz von dir geantwortet und zu Ende gesprochen hat. Neu heißt: Seit dem
    // letzten Aufruf ist ein Satz von dir dazugekommen (sonst gälte die Antwort von vorhin, solange die Seite den
    // neuen Satz noch nicht gezeichnet hat).
    let beantwortet = 0;
    const antwort = async (ms = 30_000): Promise<string> => {
      let alle: Zeile[] = [];
      await warte(
        async () => {
          alle = await verlauf();
          const z = await zustand();
          return alle.filter((e) => e.wer === "du").length > beantwortet && alle.at(-1)?.wer === "jarvis" && alle.at(-1)?.text !== "" && z !== "Denke nach …" && z !== "Spreche …";
        },
        "JARVIS antwortet und spricht zu Ende",
        ms,
      ).catch(async (e) => {
        // Für die Fehlersuche: was stattdessen dasteht.
        throw new Error(`${(e as Error).message}. Anzeige: „${await zustand()}“, zuletzt im Gespräch: ${JSON.stringify(alle.slice(-3))}, er spricht gerade: „${(await stimme()).jetzt}“`);
      });
      beantwortet = alle.filter((e) => e.wer === "du").length;
      return alle.at(-1)!.text;
    };
    // Sätze von dir, auf deren Antwort die Prüfung nicht gewartet hat (er wurde unterbrochen), gelten als erledigt.
    const abgehakt = async () => {
      beantwortet = (await verlauf()).filter((e) => e.wer === "du").length;
    };
    // Ein neues Gespräch: Die Seite behält nur die letzten 40 Zeilen, und die Prüfung zählt deine Sätze. Damit vorn
    // nichts herausfällt, fängt sie zwischendurch neu an.
    const neuesGespraech = async () => {
      await klappeAuf();
      await gespraech().getByRole("button", { name: "Neues Gespräch" }).click();
      await warte(async () => (await gespraech().locator("p.whitespace-pre-line").count()) === 0, "das Gespräch ist leer");
      beantwortet = 0;
    };
    // Nie laufen zwei Mikrofone zugleich. Der Nachbau zählt je geladener Seite; die Prüfung fragt deshalb am Ende
    // mehrerer Schritte und vor jedem Neuladen.
    const einMikrofon = async (wann: string) => assert.equal((await ohr()).zugleich, 1, `nie laufen zwei Mikrofone zugleich (${wann})`);
    // Die Anzeige über eine Zeit hinweg, um zu sehen, was in dieser Zeit nie dort stand.
    const beobachte = async (ms: number): Promise<Set<string>> => {
      const gesehen = new Set<string>();
      for (const ende = Date.now() + ms; Date.now() < ende; await pause(60)) gesehen.add(await zustand());
      return gesehen;
    };

    // ---------- 1. Die Seite geht auf: JARVIS wartet auf „Jarvis“ ----------
    await seite.goto(`${BASIS}/`);
    await feld().waitFor({ timeout: 30_000 });
    await seite.waitForResponse((r) => r.url().endsWith("/api/aufgaben") && r.ok(), { timeout: 30_000 }).catch(() => undefined);
    await ist("Sag „Jarvis“", 15_000);
    const anfang = await ohr();
    assert.deepEqual(anfang.einstellung, { lang: "de-DE", continuous: true, interimResults: true }, "die Erkennung hört auf Deutsch, ohne Pause und mit vorläufigen Sätzen");
    assert.equal(anfang.laufend, 1, "genau ein Mikrofon läuft");
    assert.equal(await feld().getAttribute("placeholder"), "Sag „Jarvis“ oder tippe");
    await bild("1-wartet-auf-jarvis");
    schritt("die Seite geht auf, das Mikrofon läuft einmal, die Anzeige sagt „Sag Jarvis“");

    // ---------- 2. Ohne „Jarvis“ geschieht nichts ----------
    await hoert("Wie spät ist es eigentlich", false);
    await hoert("Wie spät ist es eigentlich");
    await hoert("Meine Aufgaben");
    await hoert("Stopp");
    await pause(900);
    assert.equal(await zustand(), "Sag „Jarvis“");
    assert.equal(await seite.getByRole("button", { name: /Ganzes Gespräch zeigen/ }).count(), 0, "es gibt kein Gespräch");
    assert.equal((await stimme()).saetze.length, 0, "JARVIS sagt nichts");
    assert.equal((await ohr()).toene, 0, "kein Ton");
    schritt("was im Raum ohne „Jarvis“ gesagt wird, löst nichts aus");

    // ---------- 3. „Jarvis, notiere …“: der Befehl per Stimme bis in den Tresor ----------
    await hoert("Jarvis", false);
    await ist("Ich höre zu …");
    assert.equal((await ohr()).toene, 2, "ein Doppelton sagt, dass er „Jarvis“ gehört hat");
    await hoert("Jarvis notiere Milch", false);
    await seite.locator("[data-antwortzeile]").getByText("notiere Milch", { exact: true }).waitFor({ timeout: 5000 });
    assert.equal((await ohr()).toene, 2, "der Ton kommt einmal, nicht bei jedem Wort");
    await bild("2-hoert-zu");
    await hoert("Jarvis, notiere Milch kaufen.");
    assert.equal(await antwort(), "Notiert: Milch kaufen.");
    assert.deepEqual(await meine(), ["notiere Milch kaufen."], "im Gespräch steht der Befehl ohne das Weckwort");
    await warte(() => existsSync(EINGANG) && readFileSync(EINGANG, "utf8").includes("- [ ] Milch kaufen"), "die Aufgabe steht im Tresor");
    assert.deepEqual((await stimme()).saetze, ["Notiert: Milch kaufen."], "JARVIS spricht die Antwort");
    assert.equal(await gespraech().getByRole("button", { name: /Hört auf „Jarvis“/ }).getAttribute("aria-pressed"), "true", "der Schalter im Gespräch zeigt, dass er freihändig zuhört");
    schritt("„Jarvis, notiere Milch kaufen“: Ton, mitlaufender Text, die Aufgabe steht im Tresor, die Antwort wird gesprochen");

    // ---------- 4. Nach seiner Antwort hört er gleich weiter zu, ohne „Jarvis“ ----------
    await ist("Ich höre zu …");
    const nachAntwort = Date.now();
    assert.equal((await ohr()).laufend, 1);
    // Der Rest seines eigenen Satzes und sein eigener Satz kommen noch aus dem Lautsprecher: kein Befehl.
    await hoert("Milch kaufen");
    await hoert("notiert Milch kaufen");
    await pause(600);
    assert.equal(await zustand(), "Ich höre zu …", "sein eigenes Echo beendet das Zuhören nicht");
    assert.deepEqual(await meine(), ["notiere Milch kaufen."], "und ist kein Befehl");
    // Du fängst kurz vor Ablauf der acht Sekunden an zu sprechen: Er wartet, bis du fertig bist.
    await pause(Math.max(0, WARTET_MS - 900 - (Date.now() - nachAntwort)));
    await hoert("meine", false);
    await pause(1400);
    assert.equal(await zustand(), "Ich höre zu …", "wer noch spricht, wird nicht abgeschnitten");
    await hoert("Meine Aufgaben");
    const aufgaben = await antwort();
    assert.match(aufgaben, /Bauamt anrufen/);
    assert.deepEqual(await meine(), ["notiere Milch kaufen.", "Meine Aufgaben"]);
    // Jetzt sagst du nichts mehr: Nach acht Sekunden wartet er wieder auf „Jarvis“.
    await ist("Ich höre zu …");
    const still = Date.now();
    await ist("Sag „Jarvis“", WARTET_MS + 3000);
    const dauer = Date.now() - still;
    assert.ok(dauer > WARTET_MS - 1500, `er hört etwa acht Sekunden lang zu (${dauer} ms)`);
    await hoert("Meine Termine");
    await pause(700);
    assert.equal((await meine()).length, 2, "danach braucht es wieder „Jarvis“");
    schritt("nach der Antwort hört er acht Sekunden ohne „Jarvis“ zu, sein Echo zählt nicht, wer noch spricht, wird nicht abgeschnitten");

    // ---------- 5. Nur „Jarvis“, dann der Befehl; „Stopp“ unterbricht ihn ----------
    await setze("window.__stimme.dauer = 2500");
    const toeneVorher = (await ohr()).toene;
    await hoert("Jarvis.");
    await ist("Ich höre zu …");
    assert.equal((await ohr()).toene, toeneVorher + 2);
    assert.equal((await ohr()).laufend, 1, "er hört mit demselben Mikrofon weiter, nicht mit einem zweiten");
    await hoert("Briefing");
    await ist("Spreche …", 10_000);
    await warte(async () => (await stimme()).jetzt !== "", "JARVIS spricht das Briefing");
    const vorStopp = await stimme();
    // Was das Mikrofon dabei von ihm selbst und aus dem Raum aufschnappt, unterbricht ihn nicht.
    await hoert(vorStopp.jetzt.split(/\s+/).slice(0, 6).join(" "));
    await hoert("das ist ja interessant");
    await hoert("Stopp", false);
    await hoert("Stopp mal kurz die Musik");
    await pause(500);
    assert.equal(await zustand(), "Spreche …");
    assert.equal((await stimme()).abgebrochen, 0);
    await hoert("Stopp.");
    await ist("Sag „Jarvis“", 2000);
    const nachStopp = await stimme();
    assert.equal(nachStopp.abgebrochen, 1, "die Stimme bricht ab");
    await pause(3200);
    assert.equal((await stimme()).saetze.length, nachStopp.saetze.length, "und sagt keinen weiteren Satz");
    assert.equal(await zustand(), "Sag „Jarvis“", "nach „Stopp“ hört er nicht von selbst weiter zu");
    assert.deepEqual((await meine()).slice(2), ["Briefing"], "„Stopp“ steht nicht im Gespräch");
    await abgehakt();
    schritt("nur „Jarvis“ und dann der Befehl; beim Sprechen stört ihn weder sein Echo noch ein Satz im Raum, „Stopp“ bringt ihn sofort zum Schweigen");

    // ---------- 6. „Jarvis, …“ mitten in seine Antwort; Dank und höfliche Haltewörter ----------
    await feld().fill("Briefing");
    await feld().press("Enter");
    await ist("Spreche …", 10_000);
    await warte(async () => (await stimme()).jetzt !== "", "JARVIS spricht");
    const vorWechsel = (await stimme()).abgebrochen;
    await abgehakt();
    await hoert("Jarvis, Jarvis, meine Aufgaben");
    await warte(async () => (await stimme()).abgebrochen > vorWechsel, "er hört auf zu sprechen");
    assert.match(await antwort(), /Bauamt anrufen/);
    assert.equal((await meine()).at(-1), "meine Aufgaben", "zweimal „Jarvis“ ist ein Weckwort, kein Teil des Befehls");
    // Im Fenster nach der Antwort: „Okay, danke“ beendet das Zuhören und ist keine neue Frage.
    await ist("Ich höre zu …");
    const vorDank = (await verlauf()).length;
    await hoert("Okay, danke.");
    await ist("Sag „Jarvis“", 1500);
    await pause(700);
    assert.equal((await verlauf()).length, vorDank, "der Dank steht nicht im Gespräch und bekommt keine Antwort");
    // Dasselbe mit seinem Namen dahinter.
    await setze("window.__stimme.dauer = 800");
    await hoert("Jarvis, meine Aufgaben");
    await antwort();
    await ist("Ich höre zu …");
    await hoert("Danke, Dschawis.");
    await ist("Sag „Jarvis“", 1500);
    // Und wenn er gar nicht zuhört: „Danke, Jarvis“ weckt ihn nicht, auch nicht für einen Augenblick mit Ton.
    await pause(3000);
    const vorDank2 = { zeilen: (await verlauf()).length, toene: (await ohr()).toene };
    await hoert("Danke Jarvis", false);
    const beimDank = await beobachte(500);
    await hoert("Danke, Jarvis.");
    await pause(800);
    assert.deepEqual([...beimDank], ["Sag „Jarvis“"], "„Danke, Jarvis“ ist kein Weckruf");
    assert.equal(await zustand(), "Sag „Jarvis“");
    assert.deepEqual({ zeilen: (await verlauf()).length, toene: (await ohr()).toene }, vorDank2);
    schritt("„Jarvis, …“ mitten in seine Antwort löst sie ab; „Okay, danke“ und „Danke, Jarvis“ beenden das Zuhören, sind keine Frage und kein Weckruf");

    // ---------- 7. Getippt: Danach hört er nicht von selbst zu ----------
    await setze("window.__stimme.dauer = 600");
    await feld().fill("Meine Aufgaben");
    await feld().press("Enter");
    await ist("Spreche …", 10_000);
    const nachGetippt = await beobachte(4000);
    assert.ok(!nachGetippt.has("Ich höre zu …"), `nach einer getippten Frage hört er nicht von selbst zu (${[...nachGetippt].join(", ")})`);
    assert.equal(await zustand(), "Sag „Jarvis“");
    await abgehakt();
    await einMikrofon("bis hierher");
    schritt("nach einer getippten Frage bleibt das Mikrofon beim Weckwort");

    // ---------- 8. Das Mikrofon fällt aus und kommt wieder ----------
    // Der Browser beendet die Erkennung von selbst (Stille, nach einer Minute): gleich wieder an.
    const vorEnde = (await ohr()).gestartet;
    await setze("window.__ohr.endet()");
    await warte(async () => (await ohr()).laufend === 1 && (await ohr()).gestartet === vorEnde + 1, "die Erkennung läuft wieder", 3000);
    // Mitten im Satz: „Jarvis, wie“ ist gehört, dann bricht die Erkennung ab. Die Anzeige bleibt nicht auf „Ich höre zu“ hängen.
    await hoert("Jarvis wie", false);
    await ist("Ich höre zu …");
    await setze("window.__ohr.endet()");
    await ist("Sag „Jarvis“", 3000);
    // Endet sie jedes Mal sofort, läuft nichts im Kreis: höchstens ein paar Versuche, dann mit wachsender Pause.
    const vorKreis = (await ohr()).gestartet;
    await setze("window.__ohr.sofortEnde = true; window.__ohr.endet()");
    await pause(6000);
    const versuche = (await ohr()).gestartet - vorKreis;
    assert.ok(versuche >= 3 && versuche <= 7, `in sechs Sekunden wenige Versuche statt eines Kreisels (${versuche})`);
    await setze("window.__ohr.sofortEnde = false");
    await warte(async () => (await ohr()).laufend === 1, "sobald die Erkennung wieder hält, läuft sie", 12_000);
    await ist("Sag „Jarvis“");
    // Kein Netz für die Erkennung: ein Satz dazu, und er versucht es weiter.
    await setze("window.__ohr.sofortEnde = true; window.__ohr.fehler('network')");
    await klappeAuf();
    await gespraech().getByText("Für die Spracherkennung braucht der Browser gerade Internet. Ich versuche es weiter.").waitFor({ timeout: 5000 });
    await setze("window.__ohr.sofortEnde = false");
    await warte(async () => (await ohr()).laufend === 1, "die Erkennung läuft wieder", 12_000);
    await warte(async () => (await gespraech().getByText(/braucht der Browser gerade Internet/).count()) === 0, "der Satz zum Netz verschwindet, sobald es wieder geht");
    // Das Mikrofon ist verboten: ein klarer Satz, kein neuer Versuch im Kreis. Ein Klick versucht es noch einmal.
    // (Vorher läuft die Erkennung gut zwei Sekunden ungestört: Sonst gälte noch die wachsende Pause von eben, und
    // ein Versuch im Kreis fiele in den nächsten Sekunden gar nicht auf.)
    await pause(2300);
    const vorVerbot = (await ohr()).gestartet;
    await setze("window.__ohr.fehlerBeimStart = 'not-allowed'; window.__ohr.fehler('not-allowed')");
    await gespraech().getByText(/Ich darf das Mikrofon nicht benutzen/).waitFor({ timeout: 5000 });
    await pause(2500);
    assert.equal((await ohr()).gestartet, vorVerbot, "nach dem Verbot versucht er es nicht von selbst weiter");
    assert.equal(await zustand(), "Bereit", "und behauptet nicht, er höre zu");
    assert.equal(await feld().getAttribute("placeholder"), "Schreib hier, was du brauchst", "das Eingabefeld fordert nicht zum Sprechen auf, solange das Mikrofon gesperrt ist");
    await bild("3-mikrofon-verboten");
    await setze("window.__ohr.fehlerBeimStart = null");
    await seite.locator("h1").first().click();
    await warte(async () => (await ohr()).laufend === 1, "nach einem Klick läuft das Mikrofon wieder", 5000);
    await warte(async () => (await gespraech().getByText(/Ich darf das Mikrofon nicht benutzen/).count()) === 0, "der Satz zum Verbot verschwindet");
    await ist("Sag „Jarvis“");
    assert.equal(await feld().getAttribute("placeholder"), "Sag „Jarvis“ oder tippe", "geht das Mikrofon wieder, lädt das Feld wieder zum Sprechen ein");
    await einMikrofon("mit allen Ausfällen");
    schritt("endet die Erkennung, geht sie wieder an; sie kreiselt nicht; kein Netz und ein verbotenes Mikrofon stehen als Satz da, das Eingabefeld sagt dann „Schreib hier“, ein Klick versucht es neu");

    // ---------- 9. Mit KI-Gehirn: Antwort Satz für Satz, sein eigener Name, „Jarvis, stopp“ beim Nachdenken ----------
    await neuesGespraech();
    await config.writeConfig({ name: "Benedikt", vaultPath: TRESOR, claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
    const eingerichtet = seite.waitForResponse((r) => r.url().includes("/api/einstellungen") && r.ok(), { timeout: 30_000 });
    await seite.reload();
    await eingerichtet;
    await feld().waitFor();
    await ist("Sag „Jarvis“", 15_000);
    await setze("window.__stimme.dauer = 1800");
    claude.bedenkzeit(0);
    claude.drehbuch([{ text: "Ich bin Jarvis, dein Assistent im Büro. Ich zeige dir Termine, Aufgaben und Mails. Sag einfach, was du brauchst." }]);
    await hoert("Jarvis, wer bist du eigentlich und was kannst du alles für mich tun?");
    await ist("Spreche …", 10_000);
    await warte(async () => (await stimme()).jetzt.includes("Jarvis"), "er spricht den Satz mit seinem Namen");
    // Sein eigenes „Jarvis“ aus dem Lautsprecher ist kein Weckwort.
    const vorEcho = (await stimme()).abgebrochen;
    await hoert("Jarvis dein Assistent im Büro");
    await pause(500);
    assert.equal((await stimme()).abgebrochen, vorEcho, "sein eigener Name unterbricht ihn nicht");
    assert.equal(await antwort(), "Ich bin Jarvis, dein Assistent im Büro. Ich zeige dir Termine, Aufgaben und Mails. Sag einfach, was du brauchst.");
    assert.equal((await verlauf()).length, 2, "und ist keine neue Frage");
    assert.deepEqual((await stimme()).saetze, ["Ich bin Jarvis, dein Assistent im Büro.", "Ich zeige dir Termine, Aufgaben und Mails.", "Sag einfach, was du brauchst."], "die Antwort wird Satz für Satz gesprochen");
    assert.equal(anGehirn, 1);
    await ist("Ich höre zu …");
    await hoert("Danke.");
    await ist("Sag „Jarvis“", 1500);
    // Hat er etwas gefragt, ist „Okay, danke“ eine Antwort: Sie geht an das KI-Gehirn und beendet das Zuhören nicht einfach.
    await pause(2600);
    await setze("window.__stimme.dauer = 700");
    claude.drehbuch([{ text: "Der Termin wäre am Freitag um neun. Soll ich das so eintragen?" }, { text: "Gut, dann trage ich nichts ein." }]);
    await hoert("Jarvis, wann wäre denn ein guter Termin für das Gespräch mit dem Zimmerer?");
    assert.equal(await antwort(), "Der Termin wäre am Freitag um neun. Soll ich das so eintragen?");
    await ist("Ich höre zu …");
    await hoert("Okay, danke.");
    assert.equal(await antwort(), "Gut, dann trage ich nichts ein.");
    assert.equal((await meine()).at(-1), "Okay, danke.");
    assert.equal(claude.anfragen.length, 2, "die Antwort auf seine Rückfrage geht an das KI-Gehirn");
    await ist("Ich höre zu …");
    await hoert("Danke.");
    await ist("Sag „Jarvis“", 1500);
    await setze("window.__stimme.dauer = 1800");
    // Spricht er gerade von sich („Jarvis“), hört er auf „Jarvis, stopp“ trotzdem.
    claude.drehbuch([{ text: "Ich bin Jarvis, dein Assistent im Büro. Ich zeige dir Termine, Aufgaben und Mails. Sag einfach, was du brauchst." }]);
    await pause(2600);
    await hoert("Jarvis, wer bist du eigentlich und was kannst du alles für mich tun?");
    await ist("Spreche …", 10_000);
    await warte(async () => (await stimme()).jetzt.includes("Jarvis"), "er spricht wieder den Satz mit seinem Namen");
    const vorHalt = await stimme();
    await hoert("Jarvis, stopp.");
    await ist("Sag „Jarvis“", 2000);
    assert.equal((await stimme()).abgebrochen, vorHalt.abgebrochen + 1, "„Jarvis, stopp“ gilt auch, wenn er gerade selbst „Jarvis“ sagt");
    // „Jarvis, stopp“, während er noch nachdenkt: Die Frage ist vom Tisch, es kommt keine Antwort mehr.
    await pause(2600);
    claude.bedenkzeit(4000);
    claude.drehbuch([{ text: "Diese Antwort darf nie erscheinen." }]);
    const vorDenken = { saetze: (await stimme()).saetze.length, zeilen: (await verlauf()).length };
    await hoert("Jarvis, wie hoch ist der Großglockner und wann wurde er zum ersten Mal bestiegen?");
    await ist("Denke nach …");
    await pause(800);
    await hoert("Jarvis, stopp.");
    await ist("Sag „Jarvis“", 2000);
    await pause(5000);
    assert.equal((await stimme()).saetze.length, vorDenken.saetze, "nach „Jarvis, stopp“ beim Nachdenken spricht er nichts mehr");
    assert.ok(!(await verlauf()).some((z) => z.text.includes("darf nie erscheinen")), "und die Antwort erscheint nicht");
    assert.equal(await zustand(), "Sag „Jarvis“");
    claude.bedenkzeit(0);
    // „Jarvis, stopp“ gleich hinterher, die Frage ist noch gar nicht unterwegs: Sie geht auch nicht mehr los.
    claude.drehbuch([{ text: "Auch diese Antwort darf nie erscheinen." }]);
    await hoert("Jarvis, wie viele Einwohner hat Rosenheim und wie viele waren es vor zehn Jahren?");
    await hoert("Jarvis, stopp.");
    await pause(2500);
    assert.equal(claude.anfragen.length, 0, "eine Frage, die sofort angehalten wird, geht gar nicht erst an das KI-Gehirn");
    assert.equal(await zustand(), "Sag „Jarvis“");
    await abgehakt();
    await einMikrofon("mit KI-Gehirn");
    await bild("4-angehalten");
    schritt("mit KI-Gehirn: Satz für Satz gesprochen, sein eigenes „Jarvis“ weckt ihn nicht, nach seiner Rückfrage ist „Okay, danke“ eine Antwort, „Jarvis, stopp“ gilt beim Sprechen und beim Nachdenken");

    // ---------- 10. Freihändig aus: nur noch Knopf und Leertaste ----------
    await neuesGespraech();
    await setze("window.__stimme.dauer = 600");
    await hoert("Jarvis, hör nicht mehr zu.");
    await antwort();
    await gespraech().getByRole("button", { name: "Freihändig aus" }).waitFor({ timeout: 5000 });
    // Nach der Antwort auf einen Befehl per Stimme hört er noch einmal acht Sekunden zu; „Danke“ beendet das.
    await ist("Ich höre zu …");
    await hoert("Danke");
    await ist("Bereit", 1500);
    await warte(async () => (await ohr()).laufend === 0, "das Mikrofon ist aus", 2000);
    assert.equal(await feld().getAttribute("placeholder"), "Schreib hier, was du brauchst");
    // Der Knopf: Er hört einen Satz lang zu, ohne „Jarvis“, und schaltet das Mikrofon danach wieder ab.
    await seite.getByRole("button", { name: "Sprechen", exact: true }).first().click();
    await ist("Ich höre zu …");
    assert.equal((await ohr()).laufend, 1);
    await hoert("Meine Aufgaben");
    await warte(async () => (await ohr()).laufend === 0, "nach dem Satz ist das Mikrofon aus", 2000);
    assert.match(await antwort(), /Bauamt anrufen/);
    await ist("Ich höre zu …");
    // Der Knopf beendet das Zuhören auch wieder.
    await seite.getByRole("button", { name: "Zuhören beenden" }).first().click();
    await ist("Bereit", 1500);
    await warte(async () => (await ohr()).laufend === 0, "das Mikrofon ist aus", 2000);
    // Der Knopf gilt noch, während eine getippte Frage beantwortet wird. Bricht die Erkennung dann mitten in
    // „Jarvis, wie …“ ab, zeigt die Seite weiter, dass er zuhört, denn das tut er: Der nächste Satz gilt ohne „Jarvis“.
    await setze("window.__stimme.dauer = 2500");
    await seite.getByRole("button", { name: "Sprechen", exact: true }).first().click();
    await ist("Ich höre zu …");
    await feld().fill("Briefing");
    await feld().press("Enter");
    await warte(async () => (await stimme()).jetzt !== "", "er spricht das Briefing", 10_000);
    await hoert("Jarvis wie", false);
    await setze("window.__ohr.endet()");
    await warte(async () => (await ohr()).laufend === 1, "die Erkennung läuft wieder", 3000);
    assert.deepEqual([...(await beobachte(400))], ["Ich höre zu …"], "die Anzeige bleibt beim Zuhören");
    await abgehakt();
    await hoert("Meine Aufgaben");
    assert.match(await antwort(), /Bauamt anrufen/);
    await ist("Ich höre zu …");
    await hoert("Danke");
    await ist("Bereit", 1500);
    await setze("window.__stimme.dauer = 600");
    // Die Leertaste, wenn nichts markiert ist; im Eingabefeld ist sie ein Leerzeichen.
    await seite.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await seite.keyboard.press("Space");
    await ist("Ich höre zu …");
    await seite.keyboard.press("Space");
    await ist("Bereit", 1500);
    await feld().click();
    await seite.keyboard.type("a b");
    assert.equal(await feld().inputValue(), "a b");
    assert.equal(await zustand(), "Bereit", "im Eingabefeld schaltet die Leertaste kein Mikrofon");
    await feld().fill("");
    // Die Wahl gilt auch nach dem Neuladen: Das Mikrofon geht nicht von selbst an.
    await einMikrofon("freihändig aus");
    await seite.reload();
    await feld().waitFor();
    await klappeAuf();
    await gespraech().getByRole("button", { name: "Freihändig aus" }).waitFor({ timeout: 15_000 });
    await pause(1500);
    assert.deepEqual({ gestartet: (await ohr()).gestartet, zustand: await zustand() }, { gestartet: 0, zustand: "Bereit" });
    // Wieder einschalten, getippt.
    await feld().fill("Hör wieder zu");
    await feld().press("Enter");
    await gespraech().getByRole("button", { name: /Hört auf „Jarvis“/ }).waitFor({ timeout: 10_000 });
    await warte(async () => (await ohr()).laufend === 1, "das Mikrofon läuft wieder", 5000);
    await antwort();
    await ist("Sag „Jarvis“");
    schritt("freihändig aus: kein Mikrofon von selbst, auch nach dem Neuladen; Knopf und Leertaste hören einen Satz lang zu, und die Anzeige stimmt dabei; „Hör wieder zu“ schaltet es ein");

    await einMikrofon("nach dem Wiedereinschalten");

    // ---------- 11. Ein frisches Fenster, in dem der Browser das Mikrofon erst nach einem Klick erlaubt ----------
    // (Die Prüfung stellt auch, ob in dieses Fenster schon geklickt wurde: Der Browser der Prüfung zählt sonst jeden
    // ihrer Handgriffe als Klick.)
    const alt = seite;
    seite = await neueSeite("window.__ohr.fehlerBeimStart = 'not-allowed'; Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: false, isActive: false }, configurable: true });");
    await seite.goto(`${BASIS}/`);
    await feld().waitFor({ timeout: 30_000 });
    await seite.locator("[data-antwortzeile]").getByText("Klick einmal irgendwo auf die Seite, dann höre ich zu.").waitFor({ timeout: 15_000 });
    assert.equal(await zustand(), "Bereit");
    await bild("5-erst-klicken");
    await setze("window.__ohr.fehlerBeimStart = null");
    await seite.locator("h1").first().click();
    await ist("Sag „Jarvis“");
    assert.equal(await seite.getByText("Klick einmal irgendwo auf die Seite, dann höre ich zu.").count(), 0, "der Hinweis ist weg");
    assert.equal((await ohr()).zugleich, 1);
    await alt.context().close();
    schritt("erlaubt der Browser das Mikrofon erst nach einem Klick, bittet JARVIS darum und hört nach dem Klick zu");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log("Zuhören: alle Schritte in Ordnung.");
  } finally {
    await browser.close().catch(() => undefined);
    await server.stopLeise();
    await Promise.race([claude.stop(), pause(2000)]);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
