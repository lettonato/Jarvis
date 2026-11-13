// Spielgeld-Desk, der ganze Kaufpfad gegen einen nachgebauten Markt: Scan, harte Filter, Blockchain-Prüfung,
// Chief (Claude nachgestellt), Einsatzgröße, Kauf, Rückfrage, Stop-Loss, Gewinnmitnahme, Rug-Schutz, Obergrenzen.
// Kein echter Dienst wird gefragt, und es bleibt Spielgeld: Der Desk rechnet Käufe nur aus, er führt nichts aus.

import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { after, before, describe, mock as uhr, test } from "node:test";
import { starteClaudeMock, type ClaudeMock } from "../mocks/claude-mock";
import { guterCoin, starteMarktMock, type MarktMock, type MockCoin } from "../mocks/markt-mock";
import { sichereUmgebung } from "../helfer/umgebung";

let markt: MarktMock;
let claude: ClaudeMock;
let dir: string;
let desk: typeof import("../../src/lib/server/desk/engine");
let konfig: typeof import("../../src/lib/server/config");
let regeln: typeof import("../../src/lib/paper");
let rueckfrage: typeof import("../../src/lib/approval");

// Die Uhr des Tests: Der Desk merkt sich Kurse 15 Sekunden, deshalb springt jede Runde 20 Sekunden weiter.
let jetzt = new Date().setHours(10, 0, 0, 0);
const vor = (sekunden: number) => {
  jetzt += sekunden * 1000;
  uhr.timers.setTime(jetzt);
};

// So antwortet der nachgestellte Chief: gute Noten für alle genannten Coins, einzelne Werte lassen sich ändern.
const urteil = (coins: MockCoin[], anders: Record<string, Partial<{ momentum_already_spent: number; account_is_the_project: number; recycled_account: number }>> = {}) => ({
  text: JSON.stringify({
    coins: coins.map((c) => ({ address: c.address, momentum_already_spent: 0.2, account_is_the_project: 0.9, recycled_account: 0.1, begruendung: `Frisches Geld bei ${c.symbol}, Konten passen.`, ...(anders[c.symbol] ?? {}) })),
  }),
});

type Einstellungen = Partial<import("../../src/lib/server/config").JarvisConfig>;

// Frischer Desk mit 10.000 $ Spielgeld. Der Start stößt nach einer Sekunde selbst eine Runde an; die läuft
// hier ins Leere, weil der Markt da noch leer ist. Erst danach kommen die Coins des Tests auf den Markt.
async function neuerDesk(coins: MockCoin[], einstellungen: Einstellungen = {}) {
  await desk.huntDone();
  const s = await desk.deskSnapshot();
  if (s.status === "laeuft" || s.status === "tageslimit") await desk.control({ action: "pause" });
  if (s.status !== "aus") await desk.control({ action: "zuruecksetzen" });
  markt.coins.length = 0;
  markt.leeren();
  claude.drehbuch([]);
  await konfig.writeConfig({ name: "Benedikt", claude: { apiKey: "sk-test-nur-fuer-den-mock" }, approval: { limitUsd: null }, ...einstellungen });
  vor(20);
  await desk.control({ action: "start" });
  await new Promise((r) => setTimeout(r, 1200));
  await desk.huntDone();
  markt.coins.push(...coins);
  markt.leeren();
  claude.anfragen.length = 0;
}

async function runde() {
  vor(20);
  await desk.tick(new Date());
  await desk.huntDone();
  return desk.deskSnapshot();
}

const stufe = (s: Awaited<ReturnType<typeof runde>>, c: MockCoin) => s.verdicts[c.address]?.stage;
const grund = (s: Awaited<ReturnType<typeof runde>>, c: MockCoin) => s.verdicts[c.address]?.text ?? "";

before(async () => {
  markt = await starteMarktMock();
  claude = await starteClaudeMock();
  dir = sichereUmgebung("desk-kauf");
  Object.assign(process.env, { DEXSCREENER_URL: markt.url, COINGECKO_URL: markt.url, GECKOTERMINAL_URL: markt.url, RUGCHECK_URL: markt.url, ANTHROPIC_BASE_URL: claude.url, JARVIS_HUNT_MS: "1" });
  uhr.timers.enable({ apis: ["Date"], now: jetzt });
  desk = await import("../../src/lib/server/desk/engine");
  konfig = await import("../../src/lib/server/config");
  regeln = await import("../../src/lib/paper");
  rueckfrage = await import("../../src/lib/approval");
});

after(async () => {
  await desk.huntDone();
  const s = await desk.deskSnapshot();
  if (s.status === "laeuft" || s.status === "tageslimit") await desk.control({ action: "pause" });
  uhr.timers.reset();
  await markt.stop();
  await claude.stop();
});

describe("Desk: Kauf eines guten Coins", () => {
  const hund = guterCoin("GOODDOG");

  test("kauft mit 2 bis 5 % des Kontos, rechnet Gebühren und Slippage ein und schreibt den Trade mit", async () => {
    await neuerDesk([hund]);
    claude.drehbuch([urteil([hund])]);
    const s = await runde();
    assert.equal(s.positions.length, 1);
    const p = s.positions[0];
    assert.equal(p.symbol, "GOODDOG");
    const einsatz = 10_000 - s.cash;
    assert.ok(einsatz >= 200 && einsatz <= 500, `Einsatz ${einsatz}`);
    const kauf = s.trades[0];
    assert.deepEqual([kauf.side, kauf.symbol, kauf.agent], ["kauf", "GOODDOG", "Fills"]);
    assert.ok(Math.abs(kauf.usd - einsatz) < 1e-6, "der Trade nennt genau den Betrag, der vom Konto abging");
    assert.ok(Math.abs(kauf.feesUsd - (einsatz * regeln.COSTS.dexFee + regeln.COSTS.networkFeeUsd)) < 1e-9, "Börsengebühr plus Netzwerkgebühr");
    assert.ok(kauf.fillPrice > hund.preis && kauf.fillPrice < hund.preis * 1.02, "etwas teurer als der Kurs (Slippage)");
    assert.ok(Math.abs(p.qty - (einsatz - kauf.feesUsd) / kauf.fillPrice) < 1e-6);
    assert.ok(s.equity < 10_000 && s.equity > 9_950, `der Kauf kostet nur die Gebühren: ${s.equity}`);
    assert.equal(stufe(s, hund), "gekauft");
    assert.equal(s.chief, "claude");
    assert.ok(Math.abs(p.stopPrice - p.entryPrice * (1 - regeln.SAFETY.stopLoss)) < 1e-12, "Stop-Loss 15 % unter dem Einstieg");
    const zeilen = (await fs.readFile(path.join(dir, "spielgeld-trades.jsonl"), "utf8")).trim().split("\n");
    assert.equal(zeilen.length, 1);
    assert.equal(JSON.parse(zeilen[0]).symbol, "GOODDOG");
  });

  test("vorher wurde genau dieser Coin auf der Blockchain geprüft und dem Chief vorgelegt", () => {
    assert.deepEqual(markt.kettenAbfragen(), [hund.address]);
    assert.equal(claude.anfragen.length, 1);
    const frage = JSON.stringify(claude.anfragen[0]);
    assert.ok(frage.includes(hund.address) && frage.includes("top10_prozent"));
    assert.equal(claude.anfragen[0].model, "claude-haiku-5-5");
  });

  test("kauft denselben Coin nicht noch einmal", async () => {
    claude.drehbuch([urteil([hund])]);
    const s = await runde();
    assert.equal(s.positions.length, 1);
    assert.equal(s.trades.length, 1);
    // Das Drehbuch setzt den Zähler zurück: Seitdem darf keine Anfrage mehr an den Chief gegangen sein.
    assert.equal(claude.anfragen.length, 0, "der Chief wird nicht noch einmal gefragt");
  });

  test("Stop-Loss: fällt der Kurs um 20 %, verkauft Risk sofort, und der Coin ist 12 Stunden gesperrt", async () => {
    hund.preis *= 0.8;
    let s = await runde();
    assert.equal(s.positions.length, 0);
    const verkauf = s.trades[0];
    assert.deepEqual([verkauf.side, verkauf.agent], ["verkauf", "Risk"]);
    assert.match(verkauf.why, /Stop-Loss/);
    assert.ok(verkauf.pnlUsd! < 0 && verkauf.pnlPct! < -19 && verkauf.pnlPct! > -30, `Verlust ${verkauf.pnlPct}`);
    assert.ok(Math.abs(s.cash - (10_000 + verkauf.pnlUsd!)) < 1e-6, "Konto = Start minus Verlust");
    assert.equal(s.stats.losses, 1);
    // Der Kurs erholt sich, der Coin sieht wieder gut aus: trotzdem kein neuer Kauf.
    hund.preis /= 0.8;
    claude.drehbuch([urteil([hund])]);
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.equal(claude.anfragen.length, 0, "ein gesperrter Coin kostet keine Chief-Anfrage");
    vor(11 * 3600);
    s = await runde();
    assert.equal(s.positions.length, 0, "nach 11 Stunden noch gesperrt");
  });
});

describe("Desk: Gewinne sichern und Rugs erkennen", () => {
  test("bei +100 % verkauft Risk die Hälfte, der Rest läuft mit Nachlauf-Stop weiter", async () => {
    const c = guterCoin("MOON");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    let s = await runde();
    const menge = s.positions[0].qty;
    c.preis *= 2.1;
    s = await runde();
    assert.equal(s.positions.length, 1);
    assert.equal(s.positions[0].halfSold, true);
    assert.ok(Math.abs(s.positions[0].qty - menge / 2) < 1e-6);
    assert.match(s.trades[0].why, /Hälfte verkauft/);
    assert.ok(s.trades[0].pnlUsd! > 0);
    assert.equal(s.positions[0].targetPrice, null);
    // 35 % unter dem Höchststand: Der Rest geht raus, unterm Strich bleibt Gewinn.
    c.preis *= 0.65;
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.match(s.trades[0].why, /Nachlauf-Stop/);
    assert.ok(s.cash > 10_000, `Konto ${s.cash}`);
    assert.equal(s.stats.wins, 2);
  });

  test("Nachlauf-Stop: nach +50 % hält er bei 15 % Rückgang und verkauft bei 22 % unter dem Höchststand mit Gewinn", async () => {
    const c = guterCoin("WELLE");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    let s = await runde();
    const hoch = c.preis * 1.5;
    c.preis = hoch;
    s = await runde();
    assert.equal(s.positions.length, 1);
    assert.ok(!s.positions[0].halfSold && s.trades.length === 1, "bei +50 % wird noch nichts verkauft");
    c.preis = hoch * 0.85;
    s = await runde();
    assert.equal(s.positions.length, 1, "15 % unter dem Höchststand reicht nicht für den Nachlauf-Stop");
    c.preis = hoch * 0.78;
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.match(s.trades[0].why, /Nachlauf-Stop/);
    assert.ok(s.trades[0].pnlUsd! > 0, "der Kurs steht noch über dem Einstieg");
    assert.equal(s.stats.wins, 1);
  });

  test("wer nach 12 Stunden keine +20 % geschafft hat, macht Platz", async () => {
    const c = guterCoin("LAHM");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    let s = await runde();
    c.preis *= 1.1;
    vor(11 * 3600);
    s = await runde();
    assert.equal(s.positions.length, 1, "nach 11 Stunden bleibt er noch");
    vor(3600);
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.match(s.trades[0].why, /nach 12 Stunden keine \+20 %/);
  });

  test("zieht jemand die Liquidität ab, verkauft Risk sofort, auch wenn der Kurs noch steht", async () => {
    const c = guterCoin("RUGPULL");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    await runde();
    c.liquiditaet *= 0.4;
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.match(s.trades[0].why, /Liquidität .* gefallen/);
    assert.equal(s.stats.rugsStopped, 1);
  });

  test("verschwindet das Handelspaar ganz, verkauft Risk nach zwölf Durchläufen", async () => {
    const c = guterCoin("WEG");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    await runde();
    c.verschwunden = true;
    c.gelistet = false;
    let s = await runde();
    for (let i = 0; i < 10; i++) s = await runde();
    assert.equal(s.positions.length, 1, "nach elf Durchläufen noch da");
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.match(s.trades[0].why, /Kein Handelspaar/);
  });

  test("taucht nach dem Kauf ein Rug-Zeichen auf der Blockchain auf, verkauft der Crawler", async () => {
    const c = guterCoin("SPAETMINT");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    await runde();
    c.kette.mint = true;
    let s = await runde();
    assert.equal(s.positions.length, 1, "die Blockchain wird nur alle fünf Minuten neu gelesen");
    vor(5 * 60);
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.deepEqual([s.trades[0].agent, /Mint Authority/.test(s.trades[0].why)], ["Crawler", true]);
  });
});

describe("Desk: was nicht gekauft wird", () => {
  test("harte Filter, Rug-Zeichen und fehlendes Projekt sortieren aus, bevor der Chief gefragt wird", async () => {
    const zuJung = guterCoin("ZUJUNG", { alterMinuten: 5 });
    const duenn = guterCoin("DUENN", { liquiditaet: 5_000 });
    const kalt = guterCoin("KALT", { handel: { h24: [600, 900], h1: [100, 300], m5: [5, 20] }, volumen1h: 10_000, aenderung: { m5: -1, h1: 0, h6: 0, h24: 0 } });
    const mint = guterCoin("MINT", { kette: { halter: [3, 3, 3], mint: true } });
    const wal = guterCoin("WAL", { kette: { halter: [9, 3, 3, 3] } });
    const gefahr = guterCoin("GEFAHR", { kette: { halter: [3, 3, 3], gefahr: ["Creator sold everything"] } });
    const niemand = guterCoin("NIEMAND", { konten: [], webseiten: [] });
    await neuerDesk([zuJung, duenn, kalt, mint, wal, gefahr, niemand]);
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.equal(s.cash, 10_000);
    assert.equal(claude.anfragen.length, 0, "der Chief kostet Geld und wird für diese Coins nie gefragt");
    assert.deepEqual(markt.kettenAbfragen().sort(), [gefahr, mint, niemand, wal].map((c) => c.address).sort(), "nur wer die harten Filter besteht und Schwung hat, wird gelesen");
    assert.deepEqual([stufe(s, mint), /Mint Authority/.test(grund(s, mint))], ["chain_kill", true]);
    assert.deepEqual([stufe(s, wal), /Eine Wallet hält 9/.test(grund(s, wal))], ["chain_kill", true]);
    assert.deepEqual([stufe(s, gefahr), /Creator sold everything/.test(grund(s, gefahr))], ["chain_kill", true]);
    assert.deepEqual([stufe(s, niemand), /kein Projekt/.test(grund(s, niemand))], ["skin_kill", true]);
    assert.equal(s.stats.killed, 4);
  });

  test("der Chief kann die gemessenen Grenzen nicht überstimmen, und ein Nein von ihm gilt", async () => {
    const gut = guterCoin("GUT");
    // 50 % bei den zehn größten Wallets: unter der harten Grenze, aber für den Chief zu riskant.
    const klumpen = guterCoin("KLUMPEN", { kette: { halter: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5] } });
    const zuSpaet = guterCoin("ZUSPAET");
    const vergessen = guterCoin("VERGESSEN");
    await neuerDesk([gut, klumpen, zuSpaet, vergessen]);
    // Der nachgestellte Chief findet KLUMPEN großartig, hält ZUSPAET für gelaufen und lässt VERGESSEN weg.
    claude.drehbuch([urteil([gut, klumpen, zuSpaet], { KLUMPEN: { momentum_already_spent: 0, account_is_the_project: 1, recycled_account: 0 }, ZUSPAET: { momentum_already_spent: 0.9 } })]);
    const s = await runde();
    assert.deepEqual(s.positions.map((p) => p.symbol), ["GUT"]);
    assert.deepEqual([stufe(s, klumpen), /zu wenige Wallets halten zu viel/.test(grund(s, klumpen))], ["chief_nein", true]);
    assert.deepEqual([stufe(s, zuSpaet), /der Anstieg ist schon gelaufen/.test(grund(s, zuSpaet))], ["chief_nein", true]);
    assert.deepEqual([stufe(s, vergessen), /nicht bewertet/.test(grund(s, vergessen))], ["chief_nein", true]);
    assert.equal(claude.anfragen.length, 1, "eine einzige Anfrage für alle vier");
  });

  test("antwortet der Chief unbrauchbar, wird in dieser Runde nichts gekauft", async () => {
    const c = guterCoin("STUMM");
    await neuerDesk([c]);
    claude.drehbuch([{ text: "Dazu kann ich nichts sagen." }]);
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.ok(s.log.some((l) => l.agent === "Chief" && /Ich kaufe in dieser Runde nichts/.test(l.text)));
  });

  test("ohne KI-Gehirn und ohne lesbare Projektseite reichen die Faustregeln nicht für einen Kauf", async () => {
    const c = guterCoin("NURKONTEN");
    await neuerDesk([c], { claude: undefined });
    const s = await runde();
    assert.equal(s.chief, "regeln");
    assert.equal(s.positions.length, 0);
    assert.deepEqual([stufe(s, c), /Seite und Konten passen nicht sicher/.test(grund(s, c))], ["chief_nein", true]);
    assert.equal(claude.anfragen.length, 0);
  });

  test("ist die Blockchain-Prüfung nicht erreichbar, gilt der Coin als nicht geprüft und wird nicht gekauft", async () => {
    const c = guterCoin("UNGEPRUEFT");
    await neuerDesk([c]);
    markt.aus.rugcheck = true;
    claude.drehbuch([urteil([c])]);
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.equal(stufe(s, c), "nicht_geprueft");
    assert.equal(claude.anfragen.length, 0);
  });

  test("ist der Kurs seit der Prüfung um mehr als 5 % gestiegen, läuft der Desk nicht hinterher", async () => {
    const c = guterCoin("RENNT");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    // Die erste Kursabfrage ist der Scan, die zweite der frische Kurs kurz vor dem Kauf.
    markt.vorKursen = (_adressen, n) => {
      if (n === 2) c.preis *= 1.08;
    };
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.deepEqual([stufe(s, c), /ich laufe nicht hinterher/.test(grund(s, c))], ["nicht_gekauft", true]);
    assert.equal(s.cash, 10_000);
  });

  test("besteht der Coin beim Kauf die harten Filter nicht mehr, wird nicht gekauft", async () => {
    const c = guterCoin("KIPPT");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    markt.vorKursen = (_adressen, n) => {
      if (n === 2) c.liquiditaet = 5_000;
    };
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.deepEqual([stufe(s, c), /harten Filter nicht mehr/.test(grund(s, c))], ["nicht_gekauft", true]);
  });

  test("ohne Live-Daten von DexScreener kauft der Desk nichts", async () => {
    const c = guterCoin("OFFLINE");
    await neuerDesk([c]);
    markt.aus.dexscreener = true;
    claude.drehbuch([urteil([c])]);
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.equal(claude.anfragen.length, 0);
    assert.ok(s.log.some((l) => /Mit Beispieldaten kaufe ich nichts/.test(l.text)));
  });
});

describe("Desk: Rückfrage vor dem Kauf", () => {
  const frag = guterCoin("FRAGMICH");

  test("ab der Grenze fragt der Desk und kauft nicht selbst", async () => {
    await neuerDesk([frag], { approval: { limitUsd: 100 } });
    claude.drehbuch([urteil([frag])]);
    const s = await runde();
    assert.equal(s.positions.length, 0);
    assert.equal(s.cash, 10_000);
    assert.equal(s.approvals.length, 1);
    assert.deepEqual([s.approvals[0].state, s.approvals[0].symbol], ["offen", "FRAGMICH"]);
    assert.ok(s.approvals[0].usd >= 200 && s.approvals[0].usd <= 500);
    assert.equal(stufe(s, frag), "frage");
  });

  test("solange die Frage offen ist, fragt er nicht doppelt", async () => {
    claude.drehbuch([urteil([frag])]);
    const s = await runde();
    assert.equal(s.approvals.filter((a) => a.state === "offen").length, 1);
    assert.equal(claude.anfragen.length, 0, "für die offene Frage wird der Chief nicht noch einmal bemüht");
  });

  test("nach dem Ja kauft er zum frischen Kurs, höchstens für den gefragten Betrag, und nur einmal", async () => {
    const offen = (await desk.deskSnapshot()).approvals[0];
    // Neun Minuten später gilt die Frage noch (sie verfällt nach zehn).
    vor(9 * 60);
    const antwort = await desk.answerApproval(offen.id, true, "app", new Date());
    assert.match(antwort, /^Gekauft: \$FRAGMICH/);
    const s = await desk.deskSnapshot();
    assert.equal(s.positions.length, 1);
    assert.ok(10_000 - s.cash <= offen.usd + 1e-9);
    assert.equal(s.approvals[0].state, "ja");
    await assert.rejects(desk.answerApproval(offen.id, true, "telegram", new Date()), desk.DeskError);
    assert.equal((await desk.deskSnapshot()).positions.length, 1);
  });

  test("nach einem Nein wird nicht gekauft und so bald nicht wieder gefragt", async () => {
    const c = guterCoin("LIEBERNICHT");
    await neuerDesk([c], { approval: { limitUsd: 100 } });
    claude.drehbuch([urteil([c])]);
    let s = await runde();
    assert.match(await desk.answerApproval(s.approvals[0].id, false, "app", new Date()), /kaufe ich nicht/);
    claude.drehbuch([urteil([c])]);
    vor(2 * 3600);
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.equal(s.approvals.filter((a) => a.state === "offen").length, 0);
    assert.equal(s.cash, 10_000);
  });

  test("ist der Kurs seit der Frage davongelaufen, kauft er trotz Ja nicht", async () => {
    const c = guterCoin("ZUTEUER");
    await neuerDesk([c], { approval: { limitUsd: 100 } });
    claude.drehbuch([urteil([c])]);
    let s = await runde();
    c.preis *= 1.1;
    assert.match(await desk.answerApproval(s.approvals[0].id, true, "app", new Date()), /Nicht gekauft: .*ich laufe nicht hinterher/);
    s = await desk.deskSnapshot();
    assert.equal(s.positions.length, 0);
    assert.equal(s.approvals[0].state, "verworfen");
  });

  test("eine verfallene Frage kauft nichts mehr, auch nicht mit Ja", async () => {
    const c = guterCoin("ZUSPAETJA");
    await neuerDesk([c], { approval: { limitUsd: 100 } });
    claude.drehbuch([urteil([c])]);
    const s = await runde();
    assert.equal(rueckfrage.APPROVAL.timeoutMinutes, 10);
    vor(10 * 60 + 1);
    await assert.rejects(desk.answerApproval(s.approvals[0].id, true, "app", new Date()), /verfallen/);
    assert.equal((await desk.deskSnapshot()).positions.length, 0);
  });
});

describe("Desk: Obergrenzen", () => {
  const viele = Array.from({ length: 10 }, (_, i) => guterCoin(`COIN${String.fromCharCode(65 + i)}`));

  test("höchstens acht Coins gleichzeitig, auch wenn zehn gut aussehen", async () => {
    await neuerDesk(viele);
    claude.drehbuch([urteil(viele), urteil(viele), urteil(viele), urteil(viele)]);
    let s = await runde();
    assert.equal(s.positions.length, 4, "pro Runde prüft der Crawler höchstens vier");
    s = await runde();
    assert.equal(s.positions.length, 8);
    s = await runde();
    s = await runde();
    assert.equal(s.positions.length, regeln.SAFETY.maxOpenPositions);
    assert.equal(claude.anfragen.length, 2, "mit vollen Plätzen wird niemand mehr geprüft");
    const investiert = 10_000 - s.cash;
    assert.ok(investiert <= 10_000 * regeln.SAFETY.maxTradeShare * 8 + 1e-6, `zusammen höchstens 40 % des Kontos: ${investiert}`);
  });

  test("Pause: es wird nichts Neues gekauft, der Stop-Loss arbeitet weiter", async () => {
    await desk.control({ action: "pause" });
    viele[0].preis *= 0.8;
    const s = await runde();
    assert.equal(s.status, "pausiert");
    assert.equal(s.positions.length, 7);
    assert.match(s.trades[0].why, /Stop-Loss/);
    assert.equal(claude.anfragen.length, 2, "kein Nachkauf auf den freien Platz");
    await desk.control({ action: "weiter" });
    await new Promise((r) => setTimeout(r, 1200));
    await desk.huntDone();
  });

  test("Tageslimit: nach 8 % Verlust an einem Tag kauft der Desk bis morgen nichts mehr", async () => {
    for (const c of viele) c.preis *= 0.5;
    let s = await runde();
    assert.equal(s.status, "tageslimit");
    assert.ok(s.dayPnlPct <= -8, `Tagesverlust ${s.dayPnlPct}`);
    assert.equal(s.positions.length, 0, "alle Stops haben gegriffen");
    const neu = guterCoin("NEUERTAG");
    markt.coins.push(neu);
    claude.drehbuch([urteil([neu])]);
    s = await runde();
    assert.equal(s.positions.length, 0);
    assert.equal(claude.anfragen.length, 0, "im Tageslimit wird kein Coin mehr geprüft");
  });

  test("Not-Aus: alle Agenten stehen, auch die Wache", async () => {
    const c = guterCoin("HALT");
    await neuerDesk([c]);
    claude.drehbuch([urteil([c])]);
    await runde();
    await desk.control({ action: "notaus" });
    c.preis *= 0.5;
    const s = await runde();
    assert.equal(s.status, "notaus");
    assert.equal(s.positions.length, 1, "nichts wird verkauft oder gekauft, bis ein Mensch weitermacht");
    assert.equal(s.trades.length, 1);
  });
});
