// Handprüfung: Microsoft 365 (Termine aus Outlook lesen) im echten Browser gegen den gebauten Server und ein
// nachgebautes Microsoft (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/microsoft-rauch.ts [Ordner für Bilder]
// Nichts davon berührt das echte Microsoft: Anmeldeserver und Graph sind der Nachbau aus test/mocks.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung } from "../helfer/umgebung";
import { graphTermin, MOCK_CLIENT, MOCK_TENANT, starteMicrosoftMock } from "../mocks/microsoft-mock";

const PORT = 3113;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("microsoft-rauch");
const gespeichert = () => (JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as { microsoft?: Record<string, unknown> }).microsoft;

async function main() {
  const ms = await starteMicrosoftMock();
  const tag = (plus: number) => new Date(Date.now() + plus * 86_400_000).toISOString().slice(0, 10);
  ms.termine = [
    graphTermin("t1", "Baubesprechung Halle 3", `${tag(1)}T09:00:00`, `${tag(1)}T10:00:00`, { location: { displayName: "Besprechungsraum 2" } }),
    graphTermin("t2", "Gespräch mit dem Steuerberater", `${tag(1)}T13:00:00`, `${tag(1)}T14:00:00`, { sensitivity: "private", location: { displayName: "Kanzlei" } }),
    graphTermin("t3", "Abgesagte Runde", `${tag(2)}T09:00:00`, `${tag(2)}T10:00:00`, { isCancelled: true }),
  ];
  Object.assign(process.env, { MICROSOFT_LOGIN_URL: ms.loginUrl, MICROSOFT_GRAPH_URL: ms.graphUrl });
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt" });

  const server = await starteNext(PORT);
  try {
    await server.bereit(`${BASIS}/api/microsoft`);
    // Ändern darf nur die eigene Oberfläche: Ohne ihren Kopf nimmt die Schnittstelle nichts an.
    const fremd = await fetch(`${BASIS}/api/microsoft`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "einrichten", tenantId: MOCK_TENANT, clientId: MOCK_CLIENT }) });
    assert.ok(fremd.status >= 400, "ohne den Kopf der Oberfläche wird nichts eingetragen");
    assert.equal(gespeichert(), undefined);
    assert.equal(ms.anfragen.length, 0, "bis hierher ging nichts an Microsoft");

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1300 }, locale: "de-DE" });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.locator("#microsoft").scrollIntoViewIfNeeded().catch(() => {});
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };

    // Einstellungen: Der Abschnitt erklärt, was eure IT anlegt, und nimmt nur brauchbare Nummern.
    await seite.goto(`${BASIS}/einstellungen#microsoft`);
    const abschnitt = seite.locator("#microsoft");
    await abschnitt.getByText("Calendars.ReadBasic").waitFor({ timeout: 30_000 });
    assert.match(await abschnitt.innerText(), /nur gegen einen Nachbau von Microsoft getestet/);
    const verzeichnis = abschnitt.getByText("Verzeichnis-ID", { exact: true }).locator("xpath=..").locator("input");
    const anwendung = abschnitt.getByText("Anwendungs-ID", { exact: true }).locator("xpath=..").locator("input");
    await verzeichnis.fill("common");
    await anwendung.fill("meine-app");
    await abschnitt.getByText(/Die Verzeichnis-ID hat die Form/).waitFor();
    assert.ok(await abschnitt.getByRole("button", { name: "Speichern" }).isDisabled(), "Sammeladressen und Namen gelten nicht");
    await bild("0-nummern");
    await verzeichnis.fill(MOCK_TENANT);
    await anwendung.fill(MOCK_CLIENT);
    await abschnitt.getByRole("button", { name: "Speichern" }).click();
    await abschnitt.getByText("Gespeichert. Jetzt kannst du dich bei Microsoft anmelden.").waitFor();
    assert.deepEqual(gespeichert(), { tenantId: MOCK_TENANT, clientId: MOCK_CLIENT });
    assert.equal(ms.anfragen.length, 0, "eintragen allein fragt Microsoft nichts");

    // Anmelden: JARVIS zeigt den Code und die Seite von Microsoft; ein Passwortfeld gibt es in JARVIS nicht.
    await abschnitt.getByRole("button", { name: "Bei Microsoft anmelden" }).click();
    await abschnitt.getByText("ABCD-EFGH").waitFor();
    assert.equal(await abschnitt.getByRole("link", { name: "die Anmeldeseite von Microsoft" }).getAttribute("href"), `${ms.loginUrl}/geraet`);
    assert.equal(await abschnitt.locator("input[type=password]").count(), 0);
    assert.match(await abschnitt.innerText(), /Der Code gilt bis \d{2}:\d{2} Uhr/);
    await bild("1-code");

    // „Du“ bestätigst bei Microsoft: Die Seite merkt es von selbst.
    ms.anmeldung = "bestaetigt";
    await abschnitt.getByText("Verbunden mit benedikt@ds-test.example.", { exact: false }).waitFor({ timeout: 20_000 });
    assert.equal(gespeichert()!.refreshToken, "bleib-1");
    const html = await seite.content();
    assert.ok(!/zugang-1|bleib-1|geraetecode/.test(html), "kein Schlüssel von Microsoft steht in der Seite");
    assert.ok(!(await abschnitt.getByRole("checkbox").isChecked()), "Outlook im Gespräch ist aus, bis du es einschaltest");
    await bild("2-verbunden");

    // Raum Kalender: Outlook-Termine stehen da, Privates ohne Titel und Ort, Abgesagtes gar nicht.
    await seite.goto(`${BASIS}/kalender`);
    await seite.getByText("Baubesprechung Halle 3", { exact: true }).waitFor({ timeout: 30_000 });
    const kalender = await seite.locator("main").innerText();
    assert.match(kalender, /Besprechungsraum 2/);
    assert.match(kalender, /Privater Termin/);
    assert.ok(!/Steuerberater|Kanzlei|Abgesagte Runde/.test(kalender));
    assert.match(kalender, /Sie stehen nur hier am Bildschirm, nicht im Gespräch und nicht auf dem Handy\./);
    await bild("3-kalender");

    // Der Schalter: erst mit dem Haken dürfen Outlook-Termine ins Gespräch und aufs Handy.
    await seite.goto(`${BASIS}/einstellungen#microsoft`);
    await abschnitt.getByRole("checkbox").waitFor({ timeout: 30_000 });
    // Der Haken folgt dem, was gespeichert ist: Er sitzt erst, wenn der Mac es bestätigt hat.
    const haken = abschnitt.getByRole("checkbox");
    await haken.click();
    await abschnitt.locator("input[type=checkbox]:checked").waitFor();
    assert.equal(gespeichert()!.extern, true);
    await haken.click();
    await abschnitt.locator("input[type=checkbox]:not(:checked)").waitFor();
    assert.equal(gespeichert()!.extern, false);

    // Eine neue Anmeldung anfangen und abbrechen: Die alte bleibt.
    await abschnitt.getByRole("button", { name: "Neu anmelden" }).click();
    await abschnitt.getByText("ABCD-EFGH").waitFor();
    await abschnitt.getByRole("button", { name: "Abbrechen" }).click();
    await abschnitt.getByText("Verbunden mit benedikt@ds-test.example.", { exact: false }).waitFor();
    assert.equal(gespeichert()!.refreshToken, "bleib-1");

    // Fehlt JARVIS das Recht, steht ein fester Satz da, nie der Text von Microsoft.
    ms.graphStoerung = 403;
    await seite.goto(`${BASIS}/kalender`);
    await seite.getByRole("button", { name: "Neu laden" }).click();
    await seite.getByText(/Outlook: Microsoft erlaubt JARVIS diesen Zugriff nicht/).waitFor({ timeout: 30_000 });
    assert.ok(!(await seite.content()).includes("GEHEIMER-TEXT-VON-MICROSOFT"));
    await bild("4-kein-recht");

    // Abmelden: Die Outlook-Termine verschwinden aus JARVIS, die Nummern bleiben.
    await seite.goto(`${BASIS}/einstellungen#microsoft`);
    await abschnitt.getByRole("button", { name: "Abmelden" }).click();
    await abschnitt.getByText(/Abgemeldet\./).waitFor();
    assert.deepEqual(gespeichert(), { tenantId: MOCK_TENANT, clientId: MOCK_CLIENT });
    await abschnitt.getByRole("button", { name: "Bei Microsoft anmelden" }).waitFor();
    await abschnitt.getByRole("button", { name: "Microsoft 365 ganz entfernen" }).click();
    await abschnitt.getByText(/Entfernt\./).waitFor();
    assert.equal(gespeichert(), undefined);
    await bild("5-entfernt");

    // Was an Microsoft ging: an Graph nur Lesen, nur das eigene Konto und die Kalenderansicht.
    const graph = ms.anfragen.filter((a) => a.pfad.startsWith("/v1.0/"));
    assert.ok(graph.length >= 2);
    assert.ok(graph.every((a) => a.methode === "GET"), "an Graph geht nur Lesen");
    assert.ok(graph.every((a) => /^\/v1\.0\/me(\?|\/calendarView\?)/.test(a.pfad)), graph.map((a) => a.pfad).join("\n"));
    assert.ok(ms.anfragen.filter((a) => a.pfad.includes("/oauth2/")).every((a) => a.pfad.startsWith(`/${MOCK_TENANT}/`)), "angemeldet wird nur an eurem Verzeichnis");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    await browser.close();
    console.log("Microsoft 365: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
    await ms.stop();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
