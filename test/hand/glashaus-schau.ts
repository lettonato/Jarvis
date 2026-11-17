// Handprüfung: JARVIS mit Beispieldaten starten, um die Oberfläche anzusehen (nicht Teil von npm test).
// Alles läuft gegen nachgebaute Dienste auf diesem Rechner: Postfach, Markt, Kalender, Claude.
//   npx tsx test/hand/glashaus-schau.ts [Port] [dev|start]
// Der Server läuft, bis das Skript beendet wird. Mit „start“ vorher einmal `npx next build`.
import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MODELLE } from "../../src/lib/modelle";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";
import { beispielPost, MOCK_POST_ADRESSE, MOCK_POST_PASSWORT, starteImapMock } from "../mocks/imap-mock";
import { guterCoin, starteMarktMock } from "../mocks/markt-mock";
import { starteTwelveMock, tagesreihe } from "../mocks/twelve-mock";

const PORT = Number(process.argv[2] ?? 3210);
const MODUS = process.argv[3] === "start" ? "start" : "dev";

async function main() {
  const ordner = sichereUmgebung("glashaus");
  const mac = testOrdner("glashaus-mac");
  const tresor = testOrdner("glashaus-tresor");
  const jetzt = new Date();
  const tag = (plus: number) => new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + plus);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const um = (plus: number, stunde: number, minute = 0) => new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + plus, stunde, minute).getTime();
  const termin = (id: string, title: string, start: number, location = "") => ({ id, title, start, end: start + 3_600_000, allDay: false, location, calendar: "Firma" });

  for (const f of ["test/mocks/osascript-mock.mjs", "test/mocks/open-mock.mjs"]) chmodSync(f, 0o755);
  writeFileSync(
    path.join(mac, "kalender.json"),
    JSON.stringify({
      zugriff: "ok",
      kalender: [{ name: "Privat", writable: true }, { name: "Firma", writable: true }],
      standard: "Firma",
      events: [termin("a", "Bauleitung", um(0, 9)), termin("b", "Besprechung Hallenneubau", um(0, 23, 30), "Besprechungsraum 2"), termin("c", "Steuerberater", um(1, 16, 30)), termin("d", "Jour fixe Vertrieb", um(2, 10))],
    }),
  );
  mkdirSync(path.join(tresor, "Aufgaben"), { recursive: true });
  writeFileSync(
    path.join(tresor, "Aufgaben", "Firma.md"),
    [
      `- [ ] Angebot Stahlbau nachfassen 📅 ${iso(tag(-1))}`,
      `- [ ] Statik freigeben 📅 ${iso(tag(0))}`,
      `- [ ] Mietvertrag Lager prüfen 📅 ${iso(tag(2))}`,
      `- [ ] Unterlagen für den Steuerberater zusammenstellen 📅 ${iso(tag(4))}`,
      `- [ ] Weihnachtsfeier planen 📅 ${iso(tag(12))}`,
      `- [x] Bauantrag einreichen 📅 ${iso(tag(-3))}`,
    ].join("\n"),
  );

  const [claude, post, markt, twelve] = await Promise.all([starteClaudeMock(), starteImapMock(beispielPost(jetzt.getTime())), starteMarktMock(), starteTwelveMock()]);
  // Erfundene Tageskurse für den Edelmetall-Agenten, so wie der kostenlose Plan von Twelve Data sie liefert:
  // Gold je Feinunze, Silber nur über den Fonds SLV. Gold steigt mit kleinen Wellen, der Fonds läuft seitwärts.
  const heute = iso(jetzt);
  twelve.reihen = {
    "XAU/USD": tagesreihe(Array.from({ length: 90 }, (_, i) => 3650 + i * 5.2 + Math.sin(i / 3) * 28), heute),
    "XAG/USD": { code: 403, message: "nicht im Plan" },
    SLV: tagesreihe(Array.from({ length: 90 }, (_, i) => 43.5 + Math.sin(i / 6) * 1.5 - (i > 80 ? (i - 80) * 0.11 : 0)), heute),
  };
  const hund = guterCoin("GOODDOG");
  const welle = guterCoin("WELLE", { aenderung: { m5: 2, h1: 9, h6: 14, h24: 22 } });
  markt.coins.push(hund, welle);
  // Startet jemand in der Schau den Spielgeld-Handel, bewertet der nachgebaute Chief die beiden Coins: einen Kauf
  // und eine Absage mit langer Begründung. So zeigt der Raum Trading auch Positionen, Trades und Urteile.
  claude.immer(MODELLE.chief.id, {
    text: JSON.stringify({
      coins: [
        { address: hund.address, momentum_already_spent: 0.2, account_is_the_project: 0.9, recycled_account: 0.1, begruendung: "Frisches Geld, und die Konten gehören erkennbar zum Projekt." },
        {
          address: welle.address,
          momentum_already_spent: 0.9,
          account_is_the_project: 0.8,
          recycled_account: 0.1,
          begruendung: "Der Anstieg der letzten Stunden ist schon gelaufen. Wer jetzt kauft, kauft die Spitze; die Konten passen zum Projekt, aber frisches Geld kommt kaum noch nach.",
        },
      ],
    }),
  });
  Object.assign(process.env, {
    ANTHROPIC_BASE_URL: claude.url,
    DEXSCREENER_URL: markt.url,
    COINGECKO_URL: markt.url,
    GECKOTERMINAL_URL: markt.url,
    RUGCHECK_URL: markt.url,
    TWELVEDATA_URL: twelve.url,
    JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"),
    JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"),
    JARVIS_MAC_STORE: path.join(mac, "kalender.json"),
    JARVIS_MAC_LOG: path.join(mac, "aufrufe.log"),
  });

  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", vaultPath: tresor, claude: { apiKey: "sk-test-nur-fuer-den-mock" }, twelvedata: { apiKey: "twelve-test-nur-fuer-den-mock" }, mail: { provider: "andere", host: post.host, port: post.port, user: MOCK_POST_ADRESSE, password: MOCK_POST_PASSWORT } });
  const p = await import("../../src/lib/server/projekte/projekte");
  const halle = await p.legeProjektAn({ name: "Hallenneubau", beschreibung: "Neue Produktionshalle am Standort Süd", verantwortliche: "Thomas", fortschritt: 35 }, "mac");
  await p.trageEin(halle.id, { art: "aufgabe", text: "Angebot Stahlbau nachfassen", zustaendig: "Thomas", faellig: iso(tag(3)) }, "mac");
  await p.trageEin(halle.id, { art: "entscheidung", text: "Stahlbau statt Holz", datum: iso(tag(-8)) }, "mac");
  await p.trageEin(halle.id, { art: "naechster_schritt", text: "Statik freigeben" }, "mac");
  await p.trageEin(halle.id, { art: "risiko", text: "Lieferzeit Stahl über zwölf Wochen" }, "mac");
  const dash = await p.legeProjektAn({ name: "KI-Dashboard", beschreibung: "Übersicht für die Geschäftsführung" }, "mac");
  await p.trageEin(dash.id, { art: "naechster_schritt", text: "Testdaten aus dem Controlling anfordern" }, "mac");
  await p.legeProjektAn({ name: "Lagerumbau", status: "pausiert" }, "mac");
  await p.schlageVor({ projekt: "Hallenneubau", quelle_art: "mail", quelle_hinweis: "Mail vom Architekten", eintraege: [{ art: "aufgabe", text: "Brandschutzgutachten beauftragen", faellig: iso(tag(9)) }] }, { kanal: "mac", fremd: true });

  // Ein paar Buchungen im Kostenbuch, damit die Agentensteuerung Beträge zeigt (erfundener Verbrauch, kein echter).
  const k = await import("../../src/lib/server/kosten");
  for (let i = 0; i < 6; i++) await k.bucheClaude("gehirn", "gespraech", { model: "claude-opus-5-5", usage: { input_tokens: 4_200, output_tokens: 380, server_tool_use: { web_search_requests: i % 3 === 0 ? 1 : 0 } } }, jetzt);
  for (let i = 0; i < 9; i++) await k.bucheClaude("browser", "browser", { model: "claude-opus-5-5", usage: { input_tokens: 6_500, output_tokens: 240 } }, jetzt);
  for (let i = 0; i < 4; i++) await k.bucheClaude("desk", "chief", { model: "claude-haiku-5-5", usage: { input_tokens: 5_000, output_tokens: 600 } }, jetzt);
  if (jetzt.getDate() > 2) await k.bucheBetrag("analyst", "claude", 1.8, tag(-2));
  await k.kostenGeschrieben();

  const server = spawn("npx", ["next", MODUS, "-p", String(PORT)], { env: { ...process.env, PORT: String(PORT) }, stdio: "inherit" });
  console.log(`Einstellungen: ${ordner}\nJARVIS mit Beispieldaten: http://127.0.0.1:${PORT}`);
  const ende = () => {
    server.kill("SIGTERM");
    void Promise.all([claude.stop(), post.stop(), markt.stop(), twelve.stop()]).finally(() => process.exit(0));
  };
  process.on("SIGTERM", ende);
  process.on("SIGINT", ende);
}

void main();
