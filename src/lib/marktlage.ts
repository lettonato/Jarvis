import { formatEur, formatPct, formatSignedUsd, formatUsd, ohnePunkt } from "./format";
import type { IntelSnapshot } from "./intel";
import type { MarketSnapshot } from "./market";
import { datum, metallSatz, prozent, type MetalleSnapshot } from "./metalle";
import type { DeskSnapshot, DeskStatus } from "./paper";

// Die Marktlage: Krypto, Edelmetalle und der Spielgeld-Desk auf einen Blick, und was davon auffällt. Wie die
// Tagesübersicht (src/lib/heute.ts) wird hier nur zusammengestellt, ohne KI und ohne neue Abfragen: alles stammt
// aus Daten, die JARVIS ohnehin schon hat. Dieselben Daten ergeben immer dieselbe Übersicht.
//
// Drei Regeln:
// 1. Nichts wird geschätzt oder vorhergesagt. Was fehlt, fehlt; Beispieldaten und veraltete Kurse stehen als
//    solche da (im gesprochenen Satz gleich am Anfang) und gelten nie als Bewegung oder Marke.
// 2. Der Desk handelt nur mit Spielgeld, und so heißt er hier überall.
// 3. Die Warnung von Intel ist Text von Dritten (Nachrichten, X). Sie steht wörtlich da; src/lib/herkunft.ts
//    erkennt sie, wenn sie in einer Antwort von JARVIS vorkommt.

// Ab wann etwas auffällt. kryptoPct: Veränderung in 24 Stunden. metallPct: Veränderung zum Vortag.
// markePct: so nah am Hoch oder Tief der letzten 21 Handelstage (nur wenn es so viele Kurse gibt und der Kurs
// nicht beiden zugleich so nah ist). deskTagPct: Minus des Spielgeld-Kontos am Tag.
export const MARKT_REGELN = { kryptoPct: 5, metallPct: 2, markePct: 1, deskTagPct: 3 };

// market: Gebraucht werden nur die drei großen Kurse, nicht der Scanner.

export type MarktDaten = { market: Pick<MarketSnapshot, "majors"> | null; metalle: MetalleSnapshot | null; desk: DeskSnapshot | null; intel: IntelSnapshot | null };

// Eine Zeile der Übersicht. aenderung in Prozent (null: keine Angabe), aenderungText dasselbe so geschrieben
// wie im eigenen Raum ("" ohne Angabe); zusatz sagt, worauf sie sich bezieht.
export type MarktZeile = { id: string; name: string; wert: string; aenderung: number | null; aenderungText: string; zusatz: string };

// warnung: Intel bremst den Desk. desk: der Spielgeld-Desk selbst. bewegung: ein Kurs hat sich stark bewegt.
// marke: ein Kurs steht am Hoch oder Tief. daten: Kurse sind nur Beispiel, veraltet oder kamen nicht.
// gruppe: wozu es gehört. vom: bei Edelmetallen der Tag des Kurses, auf dem die Bewegung oder Marke beruht.
export type Auffaellig = { art: "warnung" | "desk" | "bewegung" | "marke" | "daten"; gruppe: "intel" | "desk" | "krypto" | "metalle"; text: string; href: string; vom?: string };

export type Marktlage = {
  auffaellig: Auffaellig[];
  // null: noch keine Kurse geladen.
  krypto: { zeilen: MarktZeile[]; beispiel: boolean } | null;
  // null: Der Edelmetall-Agent hat noch keinen Bericht (oder ist nicht eingerichtet).
  // fuss: von wann die Kurse sind, und ob sie veraltet sind.
  metalle: { zeilen: MarktZeile[]; standVom: string | null; veraltet: boolean; fuss: string; satz: string } | null;
  // null: Der Spielgeld-Desk ist nicht gestartet. heutePct und seitStartPct: das Spielgeld-Konto in Prozent.
  desk: { zeilen: MarktZeile[]; status: DeskStatus; heutePct: number; seitStartPct: number } | null;
};

const DESK_STEHT: Partial<Record<DeskStatus, string>> = {
  pausiert: "Der Spielgeld-Desk ist pausiert.",
  tageslimit: "Der Spielgeld-Desk hat sein Tageslimit erreicht und kauft heute nichts mehr.",
  notaus: "Der Not-Aus steht: Der Spielgeld-Desk ist angehalten.",
};

export function marktlage(d: MarktDaten): Marktlage {
  const warnung: Auffaellig[] = [];
  const amDesk: Auffaellig[] = [];
  const bewegung: Auffaellig[] = [];
  const marke: Auffaellig[] = [];
  const daten: Auffaellig[] = [];

  if (d.intel?.warning) warnung.push({ art: "warnung", gruppe: "intel", text: `Intel bremst den Desk: ${d.intel.warning.text}`, href: "/intel" });

  let krypto: Marktlage["krypto"] = null;
  if (d.market && d.market.majors.quotes.length > 0) {
    const beispiel = d.market.majors.source === "demo";
    krypto = { beispiel, zeilen: d.market.majors.quotes.map((q) => ({ id: q.symbol, name: q.name, wert: formatEur(q.eur), aenderung: q.change24h, aenderungText: formatPct(q.change24h), zusatz: "in 24 Stunden" })) };
    if (beispiel) daten.push({ art: "daten", gruppe: "krypto", text: "Kryptokurse: Beispieldaten, gerade keine Verbindung.", href: "/trading" });
    else for (const q of d.market.majors.quotes) if (Math.abs(q.change24h) >= MARKT_REGELN.kryptoPct) bewegung.push({ art: "bewegung", gruppe: "krypto", text: `${q.name}: ${formatPct(q.change24h)} in 24 Stunden`, href: "/trading" });
  }

  let metalle: Marktlage["metalle"] = null;
  const bericht = d.metalle?.bericht ?? null;
  const zuMetallen = { gruppe: "metalle", href: "/intel#edelmetalle" } as const;
  if (d.metalle && bericht && bericht.metalle.length > 0) {
    const standVom = bericht.metalle.map((m) => m.kursVom).sort().at(-1) ?? null;
    const stand = standVom ? datum(standVom) : "unbekannt";
    metalle = {
      veraltet: d.metalle.veraltet,
      standVom,
      fuss: `${d.metalle.veraltet ? "Veraltet: " : ""}Kurse vom ${stand}.`,
      satz: metallSatz(bericht),
      zeilen: bericht.metalle.map((m) => ({
        id: m.id,
        name: m.bezeichnung,
        wert: formatUsd(m.kurs),
        aenderung: m.aenderung.tag,
        aenderungText: m.aenderung.tag === null ? "" : prozent(m.aenderung.tag),
        zusatz: `je ${m.einheit}${m.aenderung.tag === null ? "" : ", zum Vortag"}`,
      })),
    };
    if (d.metalle.veraltet) daten.push({ art: "daten", ...zuMetallen, text: `Die Edelmetallkurse sind veraltet (Stand ${stand}).` });
    else {
      // Der Wortlaut der Störung bleibt in der Ansicht der Edelmetalle; hier steht nur, dass es eine gab.
      if (d.metalle.fehler) daten.push({ art: "daten", ...zuMetallen, text: `Edelmetalle: Der letzte Abruf ist gescheitert, die Kurse sind vom ${stand}.` });
      if (bericht.fehlend.length > 0) daten.push({ art: "daten", ...zuMetallen, text: `Edelmetalle: Für ${bericht.fehlend.join(" und ")} kam kein Kurs.` });
      for (const m of bericht.metalle) {
        if (m.aenderung.tag !== null && Math.abs(m.aenderung.tag) >= MARKT_REGELN.metallPct) bewegung.push({ art: "bewegung", ...zuMetallen, vom: m.kursVom, text: `${m.bezeichnung}: ${prozent(m.aenderung.tag)} zum Vortag` });
        // Ohne Vergleich über 21 Handelstage gibt es so viele Kurse noch nicht; dann wäre „Hoch der letzten 21“ falsch.
        if (m.aenderung.monat === null) continue;
        const amHoch = m.abstandHochPct >= -MARKT_REGELN.markePct;
        const amTief = m.tief > 0 && (m.kurs / m.tief - 1) * 100 <= MARKT_REGELN.markePct;
        // Beides zugleich heißt nur, dass sich der Kurs kaum bewegt hat.
        if (amHoch !== amTief) marke.push({ art: "marke", ...zuMetallen, vom: m.kursVom, text: `${m.bezeichnung} steht am ${amHoch ? "Hoch" : "Tief"} der letzten 21 Handelstage.` });
      }
    }
  } else if (d.metalle?.fehler) {
    daten.push({ art: "daten", ...zuMetallen, text: "Edelmetalle: Der Abruf ist gescheitert, es gibt noch keine Kurse." });
  }

  let desk: Marktlage["desk"] = null;
  if (d.desk && d.desk.status !== "aus") {
    const offen = d.desk.positions.length + d.desk.commodities.positions.length;
    desk = {
      status: d.desk.status,
      heutePct: d.desk.dayPnlPct,
      seitStartPct: d.desk.pnlPct,
      zeilen: [
        { id: "konto", name: "Spielgeld-Konto", wert: formatUsd(d.desk.equity), aenderung: d.desk.dayPnlPct, aenderungText: formatPct(d.desk.dayPnlPct), zusatz: "heute" },
        { id: "start", name: "Seit dem Start", wert: formatSignedUsd(d.desk.pnlUsd), aenderung: d.desk.pnlPct, aenderungText: formatPct(d.desk.pnlPct), zusatz: "" },
        { id: "offen", name: "Offene Positionen", wert: String(offen), aenderung: null, aenderungText: "", zusatz: "" },
      ],
    };
    const steht = DESK_STEHT[d.desk.status];
    if (steht) amDesk.push({ art: "desk", gruppe: "desk", text: steht, href: "/trading" });
    // Das Tageslimit sagt schon, dass der Tag im Minus liegt.
    if (d.desk.status !== "tageslimit" && d.desk.dayPnlPct <= -MARKT_REGELN.deskTagPct) amDesk.push({ art: "desk", gruppe: "desk", text: `Der Spielgeld-Desk liegt heute bei ${formatPct(d.desk.dayPnlPct)}.`, href: "/trading" });
  }

  // Das Wichtigste zuerst: erst was den Desk bremst, dann der Desk selbst, dann Kurse, zuletzt Lücken in den Daten.
  return { auffaellig: [...warnung, ...amDesk, ...bewegung, ...marke, ...daten], krypto, metalle, desk };
}


// Die Marktlage als gesprochene Antwort: kurz, ohne Listen. Auch sie nennt den Desk beim Namen „Spielgeld“.
// Die Warnung von Intel steht vorn und wörtlich, damit src/lib/herkunft.ts sie wiedererkennt. Beispieldaten und
// veraltete Kurse heißen gleich am Anfang ihres Satzes so und stehen dann hinten nicht noch einmal.
export function marktSatz(lage: Marktlage): string {
  const saetze: string[] = [];
  for (const a of lage.auffaellig) if (a.art === "warnung") saetze.push(/[.!?]$/.test(a.text) ? a.text : `${a.text}.`);
  if (lage.krypto) saetze.push(`${lage.krypto.beispiel ? "Krypto, nur Beispieldaten ohne echte Kurse" : "Krypto in 24 Stunden"}: ${lage.krypto.zeilen.map((z) => [z.name, z.aenderungText].filter(Boolean).join(" ")).join(", ")}.`);
  if (lage.metalle) saetze.push(`${lage.metalle.veraltet ? `Edelmetalle, veraltet mit Stand vom ${lage.metalle.standVom ? datum(lage.metalle.standVom) : "unbekannt"}` : "Edelmetalle"}: ${lage.metalle.satz}`);
  if (lage.desk) saetze.push(`Das Spielgeld-Konto steht heute bei ${formatPct(lage.desk.heutePct)}, seit dem Start bei ${formatPct(lage.desk.seitStartPct)}.`);
  if (saetze.length === 0 && lage.auffaellig.length === 0) return "Ich habe gerade keine Marktdaten.";
  const schonGesagt = (a: Auffaellig) => a.art === "warnung" || (a.art === "daten" && ((a.gruppe === "krypto" && lage.krypto?.beispiel === true) || (a.gruppe === "metalle" && lage.metalle?.veraltet === true)));
  const rest = lage.auffaellig.filter((a) => !schonGesagt(a));
  if (rest.length > 0) saetze.push(`Auffällig: ${rest.map((a) => ohnePunkt(a.text)).join("; ")}.`);
  else if (lage.auffaellig.length === 0) saetze.push("Nichts Auffälliges.");
  return saetze.join(" ");
}

// Für Morgenbriefing und Tagesabschluss: nur Kurse, die sich stark bewegt haben oder an einer Marke stehen.
// Der Desk und die Warnung von Intel stehen dort an eigener Stelle. An einem ruhigen Tag steht nichts da.
// Edelmetalle zählen nur mit einem Kurs von heute: Sonst stünde die Bewegung vom Freitag das ganze Wochenende
// morgens und abends wieder da. Die Texte sind eigene (feste Namen und Zahlen), nichts von Dritten.
const MAX_ZEILEN = 5;
const MAX_GESPROCHEN = 3;
const kurse = (lage: Marktlage, heute: string) =>
  lage.auffaellig.filter((a) => (a.art === "bewegung" || a.art === "marke") && (a.vom === undefined || a.vom === heute)).map((a) => ohnePunkt(a.text));
const mehr = (n: number) => (n === 1 ? "und eines mehr" : `und ${n} weitere`);

// Die Marktlage nur aus Kursen, ohne Desk und Intel: So fragen Briefing und Tagesabschluss.
export const kursLage = (market: MarktDaten["market"], metalle: MetalleSnapshot | null) => marktlage({ market, metalle, desk: null, intel: null });

// Als Absatz fürs Handy: eine Liste, höchstens fünf Zeilen. heute: der Tag als JJJJ-MM-TT. Fehlen die
// Kryptokurse, steht das als Zeile da, damit Schweigen nicht nach einem ruhigen Tag aussieht.
export function marktAbsatz(lage: Marktlage, heute: string): string {
  const texte = kurse(lage, heute);
  const zeilen = texte.slice(0, MAX_ZEILEN).map((t) => `• ${t}`);
  if (texte.length > MAX_ZEILEN) zeilen.push(`• ${mehr(texte.length - MAX_ZEILEN)}`);
  if (lage.krypto?.beispiel) zeilen.push("• Kryptokurse: gerade keine Verbindung");
  return zeilen.length > 0 ? `Märkte:\n${zeilen.join("\n")}` : "";
}

// Gesprochen am Mac: ein Satz, höchstens drei Dinge. Fehlende Kurse nennt er nicht; am Mac steht
// „Beispieldaten“ ohnehin im Bild.
export function marktHinweis(lage: Marktlage, heute: string): string {
  const texte = kurse(lage, heute);
  if (texte.length === 0) return "";
  const genannt = texte.slice(0, MAX_GESPROCHEN);
  if (texte.length > MAX_GESPROCHEN) genannt.push(mehr(texte.length - MAX_GESPROCHEN));
  return `An den Märkten fällt auf: ${genannt.join("; ")}.`;
}
