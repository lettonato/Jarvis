// Die Marktlage (src/lib/marktlage.ts, Schritt E4.1): Krypto, Edelmetalle, Spielgeld-Desk und die Warnung von
// Intel auf einen Blick, und was davon auffällt. Reine Regeln ohne Netz und ohne KI: Dieselben Daten ergeben
// immer dieselbe Übersicht. Nichts wird geschätzt; was fehlt oder nur Beispiel ist, steht als Lücke da.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { decide, type CommandContext } from "../../src/lib/commands";
import { enthaeltFremdes } from "../../src/lib/herkunft";
import type { IntelSnapshot } from "../../src/lib/intel";
import type { MarketSnapshot } from "../../src/lib/market";
import { MARKT_REGELN, marktAbsatz, marktHinweis, marktlage, marktSatz, type MarktDaten } from "../../src/lib/marktlage";
import { abschlussNachricht, tagesabschluss } from "../../src/lib/routinen";
import { briefingMessage } from "../../src/lib/telegram";
import type { MetallLage, MetalleSnapshot } from "../../src/lib/metalle";
import type { DeskSnapshot } from "../../src/lib/paper";

const JETZT = new Date(2026, 10, 13, 10, 0);
const HEUTE = "2026-11-13";
const nichts: MarktDaten = { market: null, metalle: null, desk: null, intel: null };

const markt = (aenderungen: [number, number, number], source: "live" | "demo" = "live"): MarketSnapshot => ({
  fetchedAt: new Date(JETZT.getTime() - 60_000).toISOString(),
  majors: {
    source,
    quotes: [
      { id: "bitcoin", symbol: "BTC", name: "Bitcoin", eur: 61234, change24h: aenderungen[0] },
      { id: "ethereum", symbol: "ETH", name: "Ethereum", eur: 2345.5, change24h: aenderungen[1] },
      { id: "solana", symbol: "SOL", name: "Solana", eur: 151.2, change24h: aenderungen[2] },
    ],
  },
  scan: { source, scanned: 0, candidates: [] },
});

const metall = (mehr: Partial<MetallLage> = {}): MetallLage => ({
  id: "gold",
  name: "Gold",
  art: "spot",
  bezeichnung: "Gold",
  einheit: "Feinunze",
  symbol: "XAU/USD",
  kurs: 2650,
  kursVom: "2026-11-13",
  aenderung: { tag: 0.4, woche: 1.1, monat: 2.5 },
  hoch: 2800,
  tief: 2500,
  abstandHochPct: (2650 / 2800 - 1) * 100,
  schwankungPct: 1.2,
  trend: "aufwaerts",
  ...mehr,
});
const silberFonds = (mehr: Partial<MetallLage> = {}) => metall({ id: "silber", name: "Silber", art: "fonds", bezeichnung: "Silber-Fonds SLV", einheit: "Anteil", symbol: "SLV", kurs: 28.1, hoch: 30, tief: 26, abstandHochPct: (28.1 / 30 - 1) * 100, trend: "seitwaerts", ...mehr });
const metalle = (liste: MetallLage[], mehr: Partial<MetalleSnapshot> = {}): MetalleSnapshot => ({
  eingerichtet: true,
  auto: true,
  zeiten: ["07:30", "17:30"],
  laeuft: false,
  bericht: { erstelltAm: "2026-11-13T07:30:00.000Z", quelle: "Twelve Data, Tageskurse in US-Dollar", metalle: liste, verhaeltnis: null, fehlend: [] },
  fakten: [],
  einordnung: [],
  hinweis: "",
  veraltet: false,
  letzterVersuch: "2026-11-13T07:30:00.000Z",
  fehler: null,
  naechsterLauf: null,
  ...mehr,
});
const desk = (mehr: Partial<DeskSnapshot> = {}): DeskSnapshot => ({ status: "laeuft", equity: 10_250, pnlUsd: 250, pnlPct: 2.5, dayPnlPct: 0.8, positions: [{}, {}], commodities: { enabled: false, quotes: [], positions: [], note: null }, intelWarning: null, approvals: [], testDay: 1, stats: { killed: 0, rugsStopped: 0 }, ...mehr }) as unknown as DeskSnapshot;
const intel = (mehr: Partial<IntelSnapshot> = {}): IntelSnapshot => ({ configured: true, report: null, search: null, running: null, error: null, spentTodayUsd: 0, budgetUsd: 1, topics: [], auto: true, warning: null, nextAt: null, ...mehr });

describe("Marktlage: was dasteht", () => {
  test("ohne Daten gibt es keine Gruppen, nichts Auffälliges und einen ehrlichen Satz", () => {
    const lage = marktlage(nichts);
    assert.deepEqual(lage, { auffaellig: [], krypto: null, metalle: null, desk: null });
    assert.equal(marktSatz(lage), "Ich habe gerade keine Marktdaten.");
  });

  test("Krypto: die drei Kurse mit Wert und Veränderung in 24 Stunden", () => {
    const lage = marktlage({ ...nichts, market: markt([1.8, -0.7, 3.2]) });
    assert.equal(lage.krypto?.beispiel, false);
    assert.deepEqual(lage.krypto?.zeilen.map((z) => [z.name, z.aenderung, z.zusatz]), [["Bitcoin", 1.8, "in 24 Stunden"], ["Ethereum", -0.7, "in 24 Stunden"], ["Solana", 3.2, "in 24 Stunden"]]);
    assert.match(lage.krypto!.zeilen[0].wert, /^61\.234,00\s€$/);
  });

  test("Edelmetalle: Kurs, Veränderung zum Vortag und worauf sich der Kurs bezieht; ein Fonds heißt Fonds", () => {
    const lage = marktlage({ ...nichts, metalle: metalle([metall(), silberFonds({ aenderung: { tag: null, woche: null, monat: null } })]) });
    assert.deepEqual(lage.metalle?.zeilen.map((z) => [z.name, z.wert, z.aenderung, z.zusatz]), [
      ["Gold", "2.650,00 $", 0.4, "je Feinunze, zum Vortag"],
      ["Silber-Fonds SLV", "28,10 $", null, "je Anteil"],
    ]);
    assert.equal(lage.metalle?.standVom, "2026-11-13");
    assert.equal(lage.metalle?.veraltet, false);
    assert.equal(lage.metalle?.fuss, "Kurse vom 13.11.2026.");
  });

  test("jede Zeile bringt ihre Veränderung als Text mit, so geschrieben wie im eigenen Raum", () => {
    const lage = marktlage({ market: markt([1.8, -0.7, 3.2]), metalle: metalle([metall({ aenderung: { tag: -3.26, woche: 0, monat: 0 } }), silberFonds({ aenderung: { tag: null, woche: null, monat: null } })]), desk: desk(), intel: null });
    assert.deepEqual(lage.krypto?.zeilen.map((z) => z.aenderungText), ["+1,8 %", "−0,7 %", "+3,2 %"]);
    assert.deepEqual(lage.metalle?.zeilen.map((z) => z.aenderungText), ["−3,3 %", ""], "wie in der Ansicht der Edelmetalle und im Auffälligen");
    assert.deepEqual(lage.desk?.zeilen.map((z) => z.aenderungText), ["+0,8 %", "+2,5 %", ""]);
  });

  test("Edelmetalle fehlen als Gruppe, solange es keinen Bericht gibt oder er kein Metall enthält", () => {
    assert.equal(marktlage({ ...nichts, metalle: metalle([], { eingerichtet: false, bericht: null }) }).metalle, null);
    assert.equal(marktlage({ ...nichts, metalle: metalle([], { bericht: null }) }).metalle, null);
    assert.equal(marktlage({ ...nichts, metalle: metalle([]) }).metalle, null);
  });

  test("der Stand der Edelmetalle ist der Tag des jüngsten Kurses", () => {
    const lage = marktlage({ ...nichts, metalle: metalle([metall({ kursVom: "2026-11-12" }), silberFonds({ kursVom: "2026-11-13" }), metall({ id: "silber", kursVom: "2026-11-11" })]) });
    assert.equal(lage.metalle?.standVom, "2026-11-13");
  });

  test("Spielgeld-Desk: Kontostand, heute und seit dem Start, offene Positionen; ein nicht gestarteter Desk fehlt", () => {
    const lage = marktlage({ ...nichts, desk: desk() });
    assert.deepEqual(lage.desk?.zeilen.map((z) => [z.name, z.wert, z.aenderung, z.zusatz]), [
      ["Spielgeld-Konto", "10.250,00 $", 0.8, "heute"],
      ["Seit dem Start", "+250,00 $", 2.5, ""],
      ["Offene Positionen", "2", null, ""],
    ]);
    assert.equal(lage.desk?.status, "laeuft");
    assert.equal(marktlage({ ...nichts, desk: desk({ status: "aus" }) }).desk, null);
  });

  test("offene Positionen zählen Coins und Rohstoffe zusammen", () => {
    const lage = marktlage({ ...nichts, desk: desk({ commodities: { enabled: true, quotes: [], positions: [{}], note: null } as unknown as DeskSnapshot["commodities"] }) });
    assert.equal(lage.desk?.zeilen[2].wert, "3");
  });

  test("dieselben Daten ergeben dieselbe Übersicht", () => {
    const d = { market: markt([6, -7, 1]), metalle: metalle([metall(), silberFonds()]), desk: desk(), intel: intel() };
    assert.deepEqual(marktlage(d), marktlage(d));
  });
});

describe("Marktlage: was auffällt", () => {
  const texte = (d: Partial<MarktDaten>) => marktlage({ ...nichts, ...d }).auffaellig.map((a) => a.text);

  test("ein ruhiger Tag: nichts Auffälliges", () => {
    assert.deepEqual(texte({ market: markt([1.8, -0.7, 3.2]), metalle: metalle([metall(), silberFonds()]), desk: desk(), intel: intel() }), []);
  });

  test("Krypto: ab 5 Prozent in 24 Stunden, nach oben wie nach unten; knapp darunter nicht", () => {
    assert.equal(MARKT_REGELN.kryptoPct, 5);
    assert.deepEqual(texte({ market: markt([5, -6.25, 4.9]) }), ["Bitcoin: +5 % in 24 Stunden", "Ethereum: −6,3 % in 24 Stunden"]);
    assert.deepEqual(texte({ market: markt([4.99, -4.99, 0]) }), []);
  });

  test("Beispielkurse sind keine Bewegung: Dann steht nur da, dass es Beispieldaten sind", () => {
    const lage = marktlage({ ...nichts, market: markt([12, -9, 0], "demo") });
    assert.equal(lage.krypto?.beispiel, true);
    assert.deepEqual(lage.auffaellig, [{ art: "daten", gruppe: "krypto", text: "Kryptokurse: Beispieldaten, gerade keine Verbindung.", href: "/trading" }]);
  });

  test("Edelmetalle: ab 2 Prozent zum Vortag", () => {
    assert.equal(MARKT_REGELN.metallPct, 2);
    assert.deepEqual(texte({ metalle: metalle([metall({ aenderung: { tag: 2, woche: 0, monat: 0 } }), silberFonds({ aenderung: { tag: -3.14, woche: 0, monat: 0 } })]) }), ["Gold: +2,0 % zum Vortag", "Silber-Fonds SLV: −3,1 % zum Vortag"]);
    assert.deepEqual(texte({ metalle: metalle([metall({ aenderung: { tag: 1.99, woche: 0, monat: 0 } }), silberFonds({ aenderung: { tag: null, woche: null, monat: null } })]) }), []);
  });

  test("Edelmetalle: am Hoch oder am Tief der letzten 21 Handelstage (höchstens 1 Prozent entfernt)", () => {
    assert.deepEqual(texte({ metalle: metalle([metall({ kurs: 2780, abstandHochPct: (2780 / 2800 - 1) * 100 })]) }), ["Gold steht am Hoch der letzten 21 Handelstage."]);
    assert.deepEqual(texte({ metalle: metalle([metall({ kurs: 2520, abstandHochPct: (2520 / 2800 - 1) * 100 })]) }), ["Gold steht am Tief der letzten 21 Handelstage."]);
    assert.deepEqual(texte({ metalle: metalle([metall({ kurs: 2760, abstandHochPct: (2760 / 2800 - 1) * 100 })]) }), [], "1,4 Prozent unter dem Hoch zählt nicht");
    assert.deepEqual(texte({ metalle: metalle([metall({ kurs: 2530, abstandHochPct: (2530 / 2800 - 1) * 100 })]) }), [], "1,2 Prozent über dem Tief zählt nicht");
  });

  test("Edelmetalle: keine Marke, wenn es noch keine 21 Handelstage gibt oder Hoch und Tief zu dicht beieinander liegen", () => {
    const jung = { tag: 0.4, woche: null, monat: null };
    assert.deepEqual(texte({ metalle: metalle([metall({ kurs: 2800, abstandHochPct: 0, aenderung: jung })]) }), [], "zu wenige Kurse für „21 Handelstage“");
    assert.deepEqual(texte({ metalle: metalle([metall({ kurs: 2500, aenderung: jung })]) }), [], "auch am Tief nicht");
    assert.deepEqual(texte({ metalle: metalle([metall({ kurs: 2795, hoch: 2800, tief: 2790, abstandHochPct: (2795 / 2800 - 1) * 100 })]) }), [], "zugleich am Hoch und am Tief sagt nichts");
  });

  test("kam für ein Metall gar kein Kurs, steht das da", () => {
    const b = metalle([metall()]);
    b.bericht!.fehlend = ["Silber"];
    assert.deepEqual(marktlage({ ...nichts, metalle: b }).auffaellig, [{ art: "daten", gruppe: "metalle", text: "Edelmetalle: Für Silber kam kein Kurs.", href: "/intel#edelmetalle" }]);
    const beide = metalle([metall()]);
    beide.bericht!.fehlend = ["Gold", "Silber"];
    assert.deepEqual(texte({ metalle: beide }), ["Edelmetalle: Für Gold und Silber kam kein Kurs."]);
  });

  test("scheitert der Abruf, bevor es je Kurse gab, steht das da statt „keine Marktdaten“", () => {
    for (const ohne of [metalle([], { bericht: null, fehler: "HTTP 401: apikey=abc" }), metalle([], { fehler: "HTTP 401: apikey=abc" })]) {
      const lage = marktlage({ ...nichts, metalle: ohne });
      assert.equal(lage.metalle, null);
      assert.deepEqual(lage.auffaellig, [{ art: "daten", gruppe: "metalle", text: "Edelmetalle: Der Abruf ist gescheitert, es gibt noch keine Kurse.", href: "/intel#edelmetalle" }]);
      assert.equal(marktSatz(lage), "Auffällig: Edelmetalle: Der Abruf ist gescheitert, es gibt noch keine Kurse.");
    }
    assert.deepEqual(texte({ metalle: metalle([], { bericht: null }) }), [], "ohne Störung und ohne Bericht fehlt einfach die Gruppe");
  });

  test("veraltete Edelmetallkurse sind keine Bewegung und keine Marke: Dann steht nur da, von wann sie sind", () => {
    const alt = metalle([metall({ kursVom: "2026-11-06", aenderung: { tag: 4, woche: 0, monat: 0 }, kurs: 2800, abstandHochPct: 0 })], { veraltet: true });
    const lage = marktlage({ ...nichts, metalle: alt });
    assert.equal(lage.metalle?.veraltet, true);
    assert.deepEqual(lage.auffaellig, [{ art: "daten", gruppe: "metalle", text: "Die Edelmetallkurse sind veraltet (Stand 06.11.2026).", href: "/intel#edelmetalle" }]);
    assert.equal(lage.metalle?.fuss, "Veraltet: Kurse vom 06.11.2026.");
  });

  test("scheitert der letzte Abruf der Edelmetalle, steht das da, ohne den Wortlaut der Störung", () => {
    const lage = marktlage({ ...nichts, metalle: metalle([metall()], { fehler: "HTTP 429 von api.twelvedata.com: apikey=abc" }) });
    assert.deepEqual(lage.auffaellig.map((a) => a.text), ["Edelmetalle: Der letzte Abruf ist gescheitert, die Kurse sind vom 13.11.2026."]);
  });

  test("Spielgeld-Desk: ab 3 Prozent Minus am Tag, und wenn er nicht läuft", () => {
    assert.equal(MARKT_REGELN.deskTagPct, 3);
    assert.deepEqual(texte({ desk: desk({ dayPnlPct: -3 }) }), ["Der Spielgeld-Desk liegt heute bei −3 %."]);
    assert.deepEqual(texte({ desk: desk({ dayPnlPct: -2.9 }) }), []);
    assert.deepEqual(texte({ desk: desk({ dayPnlPct: 9 }) }), [], "ein Plus ist keine Warnung");
    assert.deepEqual(texte({ desk: desk({ status: "pausiert" }) }), ["Der Spielgeld-Desk ist pausiert."]);
    assert.deepEqual(texte({ desk: desk({ status: "tageslimit" }) }), ["Der Spielgeld-Desk hat sein Tageslimit erreicht und kauft heute nichts mehr."]);
    assert.deepEqual(texte({ desk: desk({ status: "notaus" }) }), ["Der Not-Aus steht: Der Spielgeld-Desk ist angehalten."]);
  });

  test("Spielgeld-Desk: Das Tageslimit meldet sich einmal, nicht noch als Minus des Tages", () => {
    assert.deepEqual(texte({ desk: desk({ status: "tageslimit", dayPnlPct: -8 }) }), ["Der Spielgeld-Desk hat sein Tageslimit erreicht und kauft heute nichts mehr."]);
    assert.deepEqual(texte({ desk: desk({ status: "pausiert", dayPnlPct: -4 }) }), ["Der Spielgeld-Desk ist pausiert.", "Der Spielgeld-Desk liegt heute bei −4 %."]);
  });

  test("die Warnung von Intel steht ganz vorn", () => {
    const lage = marktlage({ market: markt([8, 0, 0]), metalle: null, desk: desk({ dayPnlPct: -4 }), intel: intel({ warning: { text: "Börse X setzt Auszahlungen aus", at: "", until: "" } }) });
    assert.deepEqual(lage.auffaellig.map((a) => [a.art, a.text, a.href]), [
      ["warnung", "Intel bremst den Desk: Börse X setzt Auszahlungen aus", "/intel"],
      ["desk", "Der Spielgeld-Desk liegt heute bei −4 %.", "/trading"],
      ["bewegung", "Bitcoin: +8 % in 24 Stunden", "/trading"],
    ]);
  });
});

describe("Marktlage als gesprochener Satz und als Zuruf", () => {
  const voll: MarktDaten = { market: markt([1.8, -6.2, 3.2]), metalle: metalle([metall(), silberFonds()]), desk: desk(), intel: intel() };

  test("der Satz nennt Krypto, Edelmetalle, den Desk als Spielgeld und das Auffällige", () => {
    assert.equal(
      marktSatz(marktlage(voll)),
      "Krypto in 24 Stunden: Bitcoin +1,8 %, Ethereum −6,2 %, Solana +3,2 %. Edelmetalle: Gold 2.650,00 $ (+0,4 % zum Vortag), Silber-Fonds SLV 28,10 $ (+0,4 % zum Vortag). Das Spielgeld-Konto steht heute bei +0,8 %, seit dem Start bei +2,5 %. Auffällig: Ethereum: −6,2 % in 24 Stunden.",
    );
  });

  test("ohne Auffälliges sagt er das; Beispieldaten und veraltete Kurse nennt er beim Namen", () => {
    assert.match(marktSatz(marktlage({ ...voll, market: markt([1, 1, 1]) })), /Nichts Auffälliges\.$/);
    const satz = marktSatz(marktlage({ ...nichts, market: markt([1, 1, 1], "demo") }));
    assert.equal(satz, "Krypto, nur Beispieldaten ohne echte Kurse: Bitcoin +1 %, Ethereum +1 %, Solana +1 %.", "gleich am Anfang, nicht erst am Ende");
    const alt = marktSatz(marktlage({ ...nichts, metalle: metalle([metall({ kursVom: "2026-11-06" })], { veraltet: true }) }));
    assert.equal(alt, "Edelmetalle, veraltet mit Stand vom 06.11.2026: Gold 2.650,00 $ (+0,4 % zum Vortag).");
    const beides = marktSatz(marktlage({ ...nichts, market: markt([1, 1, 1], "demo"), desk: desk({ status: "pausiert" }) }));
    assert.match(beides, /^Krypto, nur Beispieldaten ohne echte Kurse: .* Auffällig: Der Spielgeld-Desk ist pausiert\.$/, "was schon vorn gesagt ist, steht hinten nicht noch einmal");
    const luecke = marktSatz(marktlage({ ...nichts, market: markt([1, 1, 1], "demo"), metalle: metalle([metall()], { fehler: "HTTP 500" }) }));
    assert.match(luecke, /Auffällig: Edelmetalle: Der letzte Abruf ist gescheitert, die Kurse sind vom 13\.11\.2026\.$/, "eine andere Lücke bleibt stehen");
  });

  test("der Zuruf „Marktübersicht“ antwortet ohne KI und öffnet den Raum Intel", () => {
    const ctx: CommandContext = { name: "Benedikt", market: markt([1.8, -6.2, 3.2]), weather: null, tasks: null, mail: null, desk: voll.desk, calendar: null, intel: voll.intel, metalle: voll.metalle, now: JETZT, session: null };
    for (const zuruf of ["Marktübersicht", "Wie stehen die Märkte?", "Marktlage", "Finanzübersicht"]) {
      const d = decide(zuruf, ctx, true);
      assert.equal(d?.navigate, "/intel", zuruf);
      assert.equal(d?.reply, marktSatz(marktlage(voll)), zuruf);
    }
    const warnt = intel({ warning: { text: "Börse X setzt Auszahlungen aus", at: "", until: "" } });
    assert.match(decide("Marktlage", { ...ctx, intel: warnt }, true)?.reply ?? "", /^Intel bremst den Desk: Börse X setzt Auszahlungen aus\. Krypto in 24 Stunden: .* Auffällig: Ethereum: −6,2 % in 24 Stunden\.$/);
    // Ein ganzer Satz geht mit KI-Gehirn wie überall an Claude, ohne KI-Gehirn antwortet die Regel.
    assert.equal(decide("Wie ist die Marktlage heute bei den Edelmetallen", ctx, true), null);
    assert.equal(decide("Wie ist die Marktlage heute bei den Edelmetallen", ctx, false)?.navigate, "/intel");
    assert.equal(decide("Marktübersicht", { ...ctx, market: null, metalle: null, desk: null, intel: null }, false)?.reply, "Ich habe gerade keine Marktdaten.");
  });

  test("andere Zurufe bleiben, wie sie waren", () => {
    const ctx: CommandContext = { name: "Benedikt", market: markt([1.8, -6.2, 3.2]), weather: null, tasks: null, mail: null, desk: voll.desk, calendar: null, intel: null, now: JETZT, session: null };
    assert.match(decide("Wie steht Bitcoin?", ctx, false)?.reply ?? "", /^Bitcoin steht bei/);
    assert.match(decide("Wie läuft der Handel?", ctx, false)?.reply ?? "", /Spielgeld-Konto/);
    assert.notEqual(decide("Kryptomarkt scannen", ctx, false)?.navigate, "/intel");
  });

  test("die Marktlage greift nur beim eigenen Wort, nicht mitten in einem anderen oder bei Nachrichten", () => {
    const ctx: CommandContext = { name: "Benedikt", market: markt([1.8, -6.2, 3.2]), weather: null, tasks: null, mail: null, desk: voll.desk, calendar: null, intel: voll.intel, metalle: voll.metalle, now: JETZT, session: null };
    const satz = marktSatz(marktlage(voll));
    for (const zuruf of ["Nachrichten zur Marktlage", "News zur Marktlage", "Aktualisiere das Lagebild zur Marktlage", "Kryptomarktlage", "Arbeitsmarktlage", "Wohnungsmarktübersicht", "Meine Finanzlage", "Suche Marktüberblick Stahl"]) {
      assert.notEqual(decide(zuruf, ctx, false)?.reply, satz, zuruf);
      assert.notEqual(decide(zuruf, ctx, true)?.reply, satz, `${zuruf} (mit KI-Gehirn)`);
    }
    for (const zuruf of ["Zeig mir die Marktlage", "Marktüberblick bitte", "Finanzüberblick"]) assert.equal(decide(zuruf, ctx, false)?.reply, satz, zuruf);
  });

  test("steht die Warnung von Intel im Satz, gilt die Antwort als Text von Dritten", () => {
    const quellen = { mail: null, desk: null, market: null, intel: intel({ warning: { text: "Börse X setzt Auszahlungen aus", at: "", until: "" } }) };
    const satz = marktSatz(marktlage({ ...nichts, intel: quellen.intel }));
    assert.equal(satz, "Intel bremst den Desk: Börse X setzt Auszahlungen aus.");
    assert.equal(enthaeltFremdes(satz, quellen), true);
  });

  test("auch eine kurze Warnung steht wörtlich im Satz, mit ihrem Punkt, und wird als Text von Dritten erkannt", () => {
    const kurz = intel({ warning: { text: "ETF gestoppt.", at: "", until: "" } });
    const satz = marktSatz(marktlage({ ...nichts, market: markt([8, 0, 0]), intel: kurz }));
    assert.equal(satz, "Intel bremst den Desk: ETF gestoppt. Krypto in 24 Stunden: Bitcoin +8 %, Ethereum +0 %, Solana +0 %. Auffällig: Bitcoin: +8 % in 24 Stunden.");
    assert.equal(enthaeltFremdes(satz, { mail: null, desk: null, market: null, intel: kurz }), true);
  });
});

describe("Marktlage im Morgenbriefing und im Tagesabschluss", () => {
  const bewegt: MarktDaten = { market: markt([6, -0.7, 3.2]), metalle: metalle([metall({ kurs: 2790, abstandHochPct: (2790 / 2800 - 1) * 100 }), silberFonds({ aenderung: { tag: -3.26, woche: 0, monat: 0 } })]), desk: null, intel: null };
  const absatz = "Märkte:\n• Bitcoin: +6 % in 24 Stunden\n• Silber-Fonds SLV: −3,3 % zum Vortag\n• Gold steht am Hoch der letzten 21 Handelstage";

  test("der Absatz fürs Handy nennt nur starke Bewegungen und Marken, als Liste", () => {
    assert.equal(marktAbsatz(marktlage(bewegt), HEUTE), absatz);
    assert.equal(marktHinweis(marktlage(bewegt), HEUTE), "An den Märkten fällt auf: Bitcoin: +6 % in 24 Stunden; Silber-Fonds SLV: −3,3 % zum Vortag; Gold steht am Hoch der letzten 21 Handelstage.");
  });

  test("an einem ruhigen Tag steht nichts da", () => {
    const ruhig = marktlage({ market: markt([1.8, -0.7, 3.2]), metalle: metalle([metall(), silberFonds()]), desk: desk(), intel: intel() });
    assert.equal(marktAbsatz(ruhig, HEUTE), "");
    assert.equal(marktHinweis(ruhig, HEUTE), "");
    assert.equal(marktAbsatz(marktlage(nichts), HEUTE), "");
  });

  test("Desk, Warnung von Intel und Lücken in den Daten gehören nicht hinein: Die stehen im Briefing an eigener Stelle oder im Raum Intel", () => {
    const lage = marktlage({
      market: markt([12, -9, 0], "demo"),
      metalle: metalle([metall({ kursVom: "2026-11-06", aenderung: { tag: 4, woche: 0, monat: 0 } })], { veraltet: true }),
      desk: desk({ status: "pausiert", dayPnlPct: -6 }),
      intel: intel({ warning: { text: "Börse X setzt Auszahlungen aus", at: "", until: "" } }),
    });
    assert.equal(lage.auffaellig.length, 5);
    assert.equal(marktAbsatz(lage, HEUTE), "Märkte:\n• Kryptokurse: gerade keine Verbindung", "nur dass die Kryptokurse fehlen, damit Schweigen nicht nach einem ruhigen Tag aussieht");
    assert.equal(marktHinweis(lage, HEUTE), "", "gesprochen am Mac nicht: Dort steht „Beispieldaten“ ohnehin im Bild");
    const mitGold = marktlage({ ...nichts, market: markt([12, -9, 0], "demo"), metalle: metalle([metall({ aenderung: { tag: 2.4, woche: 0, monat: 0 } })]) });
    assert.equal(marktAbsatz(mitGold, HEUTE), "Märkte:\n• Gold: +2,4 % zum Vortag\n• Kryptokurse: gerade keine Verbindung");
    assert.equal(marktHinweis(mitGold, HEUTE), "An den Märkten fällt auf: Gold: +2,4 % zum Vortag.");
  });

  test("Edelmetalle zählen nur mit einem Kurs von heute: Die Bewegung vom Freitag steht nicht am Wochenende noch einmal da", () => {
    const gestern = marktlage({ ...nichts, metalle: metalle([metall({ kursVom: "2026-11-12", kurs: 2790, abstandHochPct: (2790 / 2800 - 1) * 100, aenderung: { tag: 2.4, woche: 0, monat: 0 } })]) });
    assert.equal(gestern.auffaellig.length, 2, "im Raum Intel steht beides weiter da, mit dem Datum der Kurse");
    assert.equal(marktAbsatz(gestern, HEUTE), "");
    assert.equal(marktHinweis(gestern, HEUTE), "");
    assert.equal(marktAbsatz(gestern, "2026-11-12"), "Märkte:\n• Gold: +2,4 % zum Vortag\n• Gold steht am Hoch der letzten 21 Handelstage");
    const gemischt = marktlage({ ...nichts, metalle: metalle([metall({ aenderung: { tag: 2.4, woche: 0, monat: 0 } }), silberFonds({ kursVom: "2026-11-12", aenderung: { tag: -3, woche: 0, monat: 0 } })]) });
    assert.equal(marktAbsatz(gemischt, HEUTE), "Märkte:\n• Gold: +2,4 % zum Vortag", "je Metall, nicht nach dem jüngsten Kurs von allen");
  });

  test("höchstens fünf Zeilen, der Rest als Zahl", () => {
    const viel = marktlage({ ...nichts, market: markt([6, -7, 8]), metalle: metalle([metall({ kurs: 2790, abstandHochPct: (2790 / 2800 - 1) * 100, aenderung: { tag: 2.5, woche: 0, monat: 0 } }), silberFonds({ kurs: 26.1, aenderung: { tag: -3, woche: 0, monat: 0 } })]) });
    assert.equal(viel.auffaellig.length, 7);
    assert.deepEqual(marktAbsatz(viel, HEUTE).split("\n").slice(-2), ["• Silber-Fonds SLV: −3,0 % zum Vortag", "• und 2 weitere"]);
    assert.equal(marktAbsatz(viel, HEUTE).split("\n").length, 7);
    const sechs = marktlage({ ...nichts, market: markt([6, -7, 8]), metalle: metalle([metall({ kurs: 2790, abstandHochPct: (2790 / 2800 - 1) * 100, aenderung: { tag: 2.5, woche: 0, monat: 0 } }), silberFonds({ aenderung: { tag: -3, woche: 0, monat: 0 } })]) });
    assert.equal(marktAbsatz(sechs, HEUTE).split("\n").at(-1), "• und eines mehr");
    assert.equal(marktHinweis(viel, HEUTE), "An den Märkten fällt auf: Bitcoin: +6 % in 24 Stunden; Ethereum: −7 % in 24 Stunden; Solana: +8 % in 24 Stunden; und 4 weitere.", "gesprochen höchstens drei");
    assert.match(marktHinweis(marktlage({ ...nichts, market: markt([6, -7, 8]), metalle: metalle([metall({ aenderung: { tag: 2.5, woche: 0, monat: 0 } })]) }), HEUTE), /Solana: \+8 % in 24 Stunden; und eines mehr\.$/);
  });

  test("das Morgenbriefing fürs Handy bekommt den Absatz vor den Nachrichten; den Desk nennt es wie bisher selbst", () => {
    const basis = { name: "Benedikt", now: JETZT, weather: null, calendar: null, mail: null, tasks: null, intel: null, desk: null };
    assert.equal(briefingMessage({ ...basis, market: bewegt.market, metalle: bewegt.metalle }), `Guten Morgen, Benedikt. Heute ist Freitag, 13. November.\n\n${absatz}`);
    assert.doesNotMatch(briefingMessage({ ...basis, market: markt([1, 1, 1]), metalle: null }), /Märkte/);
    assert.doesNotMatch(briefingMessage(basis), /Märkte/, "ohne Kurse wie bisher");
    const mitDesk = briefingMessage({ ...basis, market: bewegt.market, metalle: null, desk: desk({ status: "pausiert", dayPnlPct: -6 }) });
    assert.match(mitDesk, /Märkte:\n• Bitcoin: \+6 % in 24 Stunden\n\n/);
    assert.doesNotMatch(mitDesk, /Der Spielgeld-Desk ist pausiert\./, "kein zweiter Satz zum Desk aus der Marktlage");
  });

  test("der Tagesabschluss fürs Handy bekommt den Absatz vor dem Satz zum Spielgeld-Handel", () => {
    const a = tagesabschluss({ calendar: null, tasks: null, mail: null, projekte: null, desk: null, intel: null, documents: null, freigabenOffen: 0, notaus: false }, JETZT);
    const text = abschlussNachricht(a, { name: "Benedikt", namen: false, maerkte: absatz, handel: "Der Spielgeld-Handel steht bei plus 2 Prozent." });
    assert.ok(text.endsWith(`\n\n${absatz}\n\nDer Spielgeld-Handel steht bei plus 2 Prozent.`), text);
    assert.doesNotMatch(abschlussNachricht(a, { name: "Benedikt", namen: false, maerkte: "" }), /Märkte/);
  });

  test("gesprochen am Mac: Briefing und Tagesabschluss sagen es in einem Satz, an einem ruhigen Tag gar nicht", () => {
    const ctx: CommandContext = { name: "Benedikt", market: markt([6, -0.7, 3.2]), weather: null, tasks: null, mail: null, desk: null, calendar: null, intel: null, metalle: bewegt.metalle, now: JETZT, session: null };
    const satz = "An den Märkten fällt auf: Bitcoin: +6 % in 24 Stunden; Silber-Fonds SLV: −3,3 % zum Vortag; Gold steht am Hoch der letzten 21 Handelstage.";
    assert.ok(decide("Briefing", ctx, false)?.reply.includes(` ${satz} `), decide("Briefing", ctx, false)?.reply);
    assert.ok(decide("Tagesabschluss", ctx, false)?.reply.endsWith(` ${satz}`), decide("Tagesabschluss", ctx, false)?.reply);
    const ruhig = { ...ctx, market: markt([1, 1, 1]), metalle: null };
    assert.doesNotMatch(decide("Briefing", ruhig, false)?.reply ?? "", /Märkten/);
    assert.doesNotMatch(decide("Tagesabschluss", ruhig, false)?.reply ?? "", /Märkten/);
    // Hat der Mac die Kryptokurse länger nicht neu geholt (Deckel zu, keine Verbindung), nennt er sie nicht als Neuigkeit.
    const alt = { ...ctx, market: { ...markt([6, -0.7, 3.2]), fetchedAt: new Date(JETZT.getTime() - 16 * 60_000).toISOString() } };
    assert.doesNotMatch(decide("Briefing", alt, false)?.reply ?? "", /Bitcoin/);
    assert.match(decide("Briefing", alt, false)?.reply ?? "", /An den Märkten fällt auf: Silber-Fonds SLV: −3,3 % zum Vortag; Gold steht am Hoch/);
    const frisch = { ...ctx, market: { ...markt([6, -0.7, 3.2]), fetchedAt: new Date(JETZT.getTime() - 14 * 60_000).toISOString() } };
    assert.match(decide("Briefing", frisch, false)?.reply ?? "", /An den Märkten fällt auf: Bitcoin: \+6 %/);
  });
});
