// Zugangsdaten im macOS-Schlüsselbund (Schritt 2.3, R-07), gegen ein nachgebautes `security`
// (test/mocks/security-mock.mjs). Geprüft wird: Umzug nur durch einen Menschen am Mac, danach kein
// Klartext mehr in config.json, kein Schlüssel in einer Befehlszeile, Rücknahme bei Fehlern, Rückweg in
// die Datei, und dass ein gesperrter Schlüsselbund nie zum Löschen eines Eintrags führt.

import assert from "node:assert/strict";
import { chmodSync, promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import { before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";

const dir = sichereUmgebung("zugangsdaten");
const ablage = testOrdner("schluesselbund");
const STORE = path.join(ablage, "store.json");
const LOG = path.join(ablage, "aufrufe.log");
const MOCK = path.resolve("test/mocks/security-mock.mjs");
chmodSync(MOCK, 0o755);
Object.assign(process.env, { JARVIS_SECURITY_BIN: MOCK, JARVIS_SECURITY_STORE: STORE, JARVIS_SECURITY_LOG: LOG });

let config: typeof import("../../src/lib/server/config");
let z: typeof import("../../src/lib/server/zugangsdaten");
let audit: typeof import("../../src/lib/server/gateway/audit");

// Werte, die wie echte aussehen, aber keine sind. Zusammengesetzt, damit gitleaks sie nicht meldet.
const CLAUDE = ["sk-ant-api03", "test", "nur", "fuer", "den", "schluesselbund", "ABCDEFGH"].join("-");
const TELEGRAM = ["123456789", "AAHtest_nur_fuer_den_schluesselbund_xyz"].join(":");
const MAILPW = 'Pässwört "mit" Leer zeichen & $onder€';

const datei = () => readFileSync(path.join(dir, "config.json"), "utf8");
// Was im nachgebauten Schlüsselbund steht, so wie JARVIS es ablegt („b64:“ plus Base64), entschlüsselt.
const ablageInhalt = (): Record<string, string> => {
  try {
    const roh = JSON.parse(readFileSync(STORE, "utf8")) as Record<string, string>;
    return Object.fromEntries(Object.entries(roh).map(([k, v]) => [k, v.startsWith("b64:") ? Buffer.from(v.slice(4), "base64").toString("utf8") : `ROH:${v}`]));
  } catch {
    return {};
  }
};

before(async () => {
  config = await import("../../src/lib/server/config");
  z = await import("../../src/lib/server/zugangsdaten");
  audit = await import("../../src/lib/server/gateway/audit");
});

beforeEach(async () => {
  delete process.env.JARVIS_SECURITY_KAPUTT;
  await fs.rm(STORE, { force: true });
  await fs.rm(LOG, { force: true });
  config.vergissGeheimnisse();
  await config.writeConfig({
    name: "Benedikt",
    claude: { apiKey: CLAUDE },
    mail: { provider: "other" as never, host: "imap.example.com", port: 993, user: "b@example.com", password: MAILPW },
    telegram: { token: TELEGRAM, bot: "jarvis_test_bot", chatId: 42 },
  });
});

describe("Zugangsdaten: Umzug in den Schlüsselbund", () => {
  test("vorher stehen sie im Klartext, der Status zeigt das an", async () => {
    assert.ok(datei().includes(CLAUDE));
    const s = await z.zugangsdatenStatus();
    assert.equal(s.modus, "datei");
    assert.equal(s.verfuegbar, true);
    assert.equal(s.eintraege.find((e) => e.name === "claude.apiKey")?.ort, "datei");
    assert.equal(s.eintraege.find((e) => e.name === "xai.apiKey")?.ort, null);
  });

  test("nach dem Umzug: kein Klartext mehr in der Datei, JARVIS liest dieselben Werte", async () => {
    const meldung = await z.inSchluesselbund("mac");
    assert.match(meldung, /3 Einträge/);
    const roh = datei();
    for (const geheim of [CLAUDE, TELEGRAM, MAILPW]) assert.ok(!roh.includes(geheim), "Klartext in config.json");
    assert.match(roh, /@schluesselbund/);
    config.vergissGeheimnisse();
    const c = await config.readConfig();
    assert.equal(c.claude?.apiKey, CLAUDE);
    assert.equal(c.mail?.password, MAILPW);
    assert.equal(c.telegram?.token, TELEGRAM);
    assert.equal(c.mail?.host, "imap.example.com", "alles andere bleibt unverändert");
    assert.deepEqual(Object.keys(ablageInhalt()).sort(), ["JARVIS/claude.apiKey", "JARVIS/mail.password", "JARVIS/telegram.token"]);
    assert.equal((await z.zugangsdatenStatus()).eintraege.find((e) => e.name === "telegram.token")?.ort, "schluesselbund");
  });

  test("kein Schlüssel steht je in einer Befehlszeile", async () => {
    await z.inSchluesselbund("mac");
    config.vergissGeheimnisse();
    await config.readConfig();
    const aufrufe = readFileSync(LOG, "utf8");
    for (const geheim of [CLAUDE, TELEGRAM, MAILPW]) assert.ok(!aufrufe.includes(geheim), aufrufe);
  });

  test("nur ein Mensch am Mac startet den Umzug", async () => {
    await assert.rejects(z.inSchluesselbund("telegram"), z.ZugangsdatenFehler);
    await assert.rejects(z.inSchluesselbund("system"), z.ZugangsdatenFehler);
    assert.ok(datei().includes(CLAUDE), "nichts geändert");
  });

  test("scheitert das Speichern, bleibt alles, wie es war", async () => {
    process.env.JARVIS_SECURITY_KAPUTT = "schreiben";
    await assert.rejects(z.inSchluesselbund("mac"), z.ZugangsdatenFehler);
    assert.ok(datei().includes(CLAUDE) && !datei().includes("@schluesselbund"));
    assert.deepEqual(ablageInhalt(), {});
  });

  test("neue oder geänderte Schlüssel landen im Schlüsselbund, entfernte werden dort gelöscht", async () => {
    await z.inSchluesselbund("mac");
    const c = await config.readConfig();
    const neu = ["sk-ant-api03", "neu", "ZYXWVUT"].join("-");
    c.claude = { apiKey: neu };
    delete c.telegram;
    await config.writeConfig(c);
    assert.ok(!datei().includes(neu));
    assert.equal(ablageInhalt()["JARVIS/claude.apiKey"], neu);
    assert.equal(ablageInhalt()["JARVIS/telegram.token"], undefined);
    config.vergissGeheimnisse();
    assert.equal((await config.readConfig()).claude?.apiKey, neu);
  });

  test("gesperrter Schlüsselbund: Dienst gilt als nicht eingerichtet, beim Speichern wird nichts gelöscht", async () => {
    await z.inSchluesselbund("mac");
    config.vergissGeheimnisse();
    process.env.JARVIS_SECURITY_KAPUTT = "lesen";
    const c = await config.readConfig();
    assert.equal(c.claude?.apiKey, "");
    const s = await z.zugangsdatenStatus();
    assert.ok(s.eintraege.find((e) => e.name === "claude.apiKey")?.fehler);
    c.name = "Benedikt S.";
    await config.writeConfig(c);
    delete process.env.JARVIS_SECURITY_KAPUTT;
    assert.equal(ablageInhalt()["JARVIS/claude.apiKey"], CLAUDE, "Eintrag noch da");
    assert.match(datei(), /"apiKey": "@schluesselbund"/);
    await assert.rejects(
      (async () => {
        process.env.JARVIS_SECURITY_KAPUTT = "lesen";
        config.vergissGeheimnisse();
        await z.zurueckInDatei("mac");
      })(),
      z.ZugangsdatenFehler,
      "Rückweg verweigert, solange nicht alles lesbar ist",
    );
  });

  test("wird der Schlüsselbund zwischen Lesen und Speichern wieder lesbar, überschreibt der alte, leere Stand keinen Schlüssel", async () => {
    await z.inSchluesselbund("mac");
    config.vergissGeheimnisse();
    // Anfrage A liest, während der Schlüsselbund gesperrt ist: Die Werte sind leer.
    process.env.JARVIS_SECURITY_KAPUTT = "lesen";
    const alt = await config.readConfig();
    assert.equal(alt.claude?.apiKey, "");
    assert.equal(alt.telegram?.token, "");
    // Der Schlüsselbund geht wieder auf, Anfrage B liest alles richtig.
    delete process.env.JARVIS_SECURITY_KAPUTT;
    assert.equal((await config.readConfig()).claude?.apiKey, CLAUDE);
    // Jetzt speichert A ihren alten Stand (sie wollte nur den Namen ändern).
    alt.name = "Benedikt S.";
    await config.writeConfig(alt);
    assert.equal(ablageInhalt()["JARVIS/claude.apiKey"], CLAUDE, "Claude-Schlüssel unverändert");
    assert.equal(ablageInhalt()["JARVIS/telegram.token"], TELEGRAM, "Telegram-Schlüssel unverändert");
    assert.equal(ablageInhalt()["JARVIS/mail.password"], MAILPW, "Mail-Passwort unverändert");
    config.vergissGeheimnisse();
    const danach = await config.readConfig();
    assert.equal(danach.name, "Benedikt S.");
    assert.equal(danach.claude?.apiKey, CLAUDE, "JARVIS liest weiter den echten Schlüssel");
    assert.equal(danach.telegram?.token, TELEGRAM);
  });

  test("Rückweg in die Datei stellt den alten Zustand her und leert den Schlüsselbund", async () => {
    await z.inSchluesselbund("mac");
    await assert.rejects(z.zurueckInDatei("telegram"), z.ZugangsdatenFehler);
    await z.zurueckInDatei("mac");
    assert.ok(datei().includes(CLAUDE) && !datei().includes("@schluesselbund"));
    assert.deepEqual(ablageInhalt(), {});
    config.vergissGeheimnisse();
    assert.equal((await config.readConfig()).telegram?.token, TELEGRAM);
  });

  test("das Audit-Log nennt die Einträge, nie die Werte", async () => {
    await z.inSchluesselbund("mac");
    const e = (await audit.leseAudit(5)).find((x) => x.was === "Zugangsdaten in den Schlüsselbund")!;
    assert.equal(e.ergebnis, "umgezogen");
    const roh = JSON.stringify(e);
    assert.match(roh, /claude\.apiKey/);
    for (const geheim of [CLAUDE, TELEGRAM, MAILPW]) assert.ok(!roh.includes(geheim));
    assert.equal((await audit.pruefeAudit()).ok, true);
  });
});
