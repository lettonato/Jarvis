// Die Handprüfungen im Browser (test/hand/*-rauch.ts) als Liste, und wie ein Sammellauf sie auswertet
// (test/hand/alle.ts, Schritt J4). Hier steht nur die Auswertung, ohne Prozesse und ohne Browser, damit sie
// bei npm test mitläuft (test/regeln/handpruefungen.test.ts).
//
// Drei Regeln:
// 1. Bestanden ist nur, was gelaufen ist und in Ordnung war. Ausgelassen ist nicht bestanden.
// 2. Zwei ältere Prüfungen (Netzschleuse, Browser-Agent) enden immer mit Code 0 und geben ihr Ergebnis nur aus.
//    Für sie zählt, was in der Ausgabe steht.
// 3. Eine neue Datei test/hand/*-rauch.ts muss hier eingetragen werden; der Test bemerkt es sonst.

import path from "node:path";

export type Vorhanden = { chrome: boolean; postgres: boolean };

export type Handpruefung = {
  name: string;
  // Dateiname in test/hand.
  datei: string;
  // "bau": Die Prüfung startet den gebauten Server (`next start`); vorher muss `next build` gelaufen sein.
  braucht: ("chrome" | "postgres" | "bau")[];
  // bilder: Ordner für Bildschirmfotos oder null. profil: ein leerer Ordner für ein Chrome-Profil.
  argumente: (o: { bilder: string | null; profil: string }) => string[];
  // Nur für Prüfungen, die immer mit Code 0 enden: null, wenn die Ausgabe in Ordnung ist, sonst der Grund.
  erwartet?: (ergebnis: Record<string, unknown>) => string | null;
};

export type Ergebnis = { name: string; zustand: "bestanden" | "fehlgeschlagen" | "ausgelassen"; grund?: string; sekunden?: number };

const mitBildern = (name: string, mehr: string[] = []) => (o: { bilder: string | null }) => [...(o.bilder ? [path.join(o.bilder, name)] : []), ...mehr];
const ohne = () => [];

function internErreicht(e: Record<string, unknown>): string | null {
  if (typeof e.internHits !== "number") return "in der Ausgabe fehlt, wie oft der interne Dienst erreicht wurde";
  return e.internHits === 0 ? null : `der interne Dienst wurde ${e.internHits}-mal erreicht`;
}

const imBrowser = (name: string): Handpruefung => ({ name, datei: `${name}-rauch.ts`, braucht: ["chrome", "bau"], argumente: mitBildern(name) });

export const HANDPRUEFUNGEN: Handpruefung[] = [
  {
    name: "schleuse",
    datei: "schleuse-rauch.ts",
    braucht: ["chrome"],
    argumente: (o) => [o.profil],
    erwartet: (e) => internErreicht(e) ?? (e.textNachNavigation === false ? null : "die interne Seite war nach der Navigation zu lesen"),
  },
  {
    name: "browser",
    datei: "browser-rauch.ts",
    braucht: ["chrome"],
    argumente: ohne,
    erwartet: (e) =>
      internErreicht(e) ??
      (e.seiteGelesen !== true ? "der Agent hat die erlaubte Seite nicht gelesen" : e.interneSeiteAbgelehnt !== true ? "die interne Seite wurde nicht abgelehnt" : e.auditKette !== true ? "die Kette des Audit-Logs ist nicht in Ordnung" : null),
  },
  { name: "pdf", datei: "pdf-rauch.ts", braucht: ["chrome"], argumente: ohne },
  imBrowser("projekte"),
  imBrowser("routinen"),
  imBrowser("agenten"),
  imBrowser("stimme"),
  imBrowser("metalle"),
  imBrowser("post"),
  imBrowser("microsoft"),
  imBrowser("einstellungen"),
  imBrowser("mitteilung"),
  imBrowser("gedaechtnis"),
  imBrowser("risiken"),
  imBrowser("marktlage"),
  imBrowser("trading"),
  imBrowser("aufgaben"),
  imBrowser("dokumente"),
  imBrowser("kalender"),
  imBrowser("gespraech"),
  imBrowser("intel"),
  imBrowser("postfach"),
  imBrowser("heute"),
  imBrowser("bedienung"),
  imBrowser("vorlesen"),
  imBrowser("ausfall"),
  imBrowser("zuhoeren"),
  imBrowser("desktop"),
  { name: "postgres", datei: "postgres-rauch.ts", braucht: ["postgres"], argumente: ohne },
  { name: "projekte-postgres", datei: "projekte-rauch.ts", braucht: ["chrome", "postgres", "bau"], argumente: mitBildern("projekte-postgres", ["--postgres"]) },
];

// Warum eine Prüfung auf diesem Rechner nicht laufen kann, oder null.
export function ausgelassenWeil(p: Handpruefung, da: Vorhanden): string | null {
  if (p.braucht.includes("chrome") && !da.chrome) return "kein Chrome gefunden (JARVIS_CHROME)";
  if (p.braucht.includes("postgres") && !da.postgres) return "PostgreSQL ist auf diesem Rechner nicht installiert";
  return null;
}

// Muss vor dem Lauf gebaut werden? Nur, wenn eine Prüfung wirklich läuft, die den gebauten Server startet.
export function brauchtBau(auswahl: Handpruefung[], da: Vorhanden): boolean {
  return auswahl.some((p) => p.braucht.includes("bau") && ausgelassenWeil(p, da) === null);
}

// Wo Chrome liegt, sagt JARVIS_CHROME. Fehlt die Angabe, fallen die Prüfungen im Browser aus (mit Grund). Zeigt
// sie ins Leere, ist das ein Tippfehler und ein Fehler: Sonst fiele still fast alles aus.
export function pruefeChrome(pfad: string | undefined, gibtEs: (p: string) => boolean): { chrome: boolean } | { fehler: string } {
  if (!pfad) return { chrome: false };
  return gibtEs(pfad) ? { chrome: true } : { fehler: `JARVIS_CHROME zeigt auf ${pfad}; dort liegt keine Datei.` };
}

// Das Ergebnis, das eine Prüfung am Ende als JSON ausgibt: der letzte Block, der mit „{“ und „}“ am
// Zeilenanfang steht (so schreibt JSON.stringify mit Einrückung), auch wenn davor anderes steht.
function ergebnisAus(ausgabe: string): Record<string, unknown> | null {
  const zeilen = ausgabe.split("\n").map((z) => z.trimEnd());
  const ende = zeilen.lastIndexOf("}");
  for (let i = ende - 1; i >= 0; i--) {
    if (zeilen[i] !== "{") continue;
    try {
      const wert: unknown = JSON.parse(zeilen.slice(i, ende + 1).join("\n"));
      if (wert && typeof wert === "object" && !Array.isArray(wert)) return wert as Record<string, unknown>;
    } catch {}
  }
  return null;
}

// code: der Exit-Code, null bei Abbruch wegen der Zeit.
export function bewerte(p: Handpruefung, code: number | null, ausgabe: string): Pick<Ergebnis, "zustand" | "grund"> {
  if (code === null) return { zustand: "fehlgeschlagen", grund: "nicht in der Zeit fertig geworden und abgebrochen" };
  if (code !== 0) return { zustand: "fehlgeschlagen", grund: `beendet mit Code ${code}` };
  if (!p.erwartet) return { zustand: "bestanden" };
  const ergebnis = ergebnisAus(ausgabe);
  if (!ergebnis) return { zustand: "fehlgeschlagen", grund: "kein Ergebnis in der Ausgabe gefunden" };
  const grund = p.erwartet(ergebnis);
  return grund ? { zustand: "fehlgeschlagen", grund } : { zustand: "bestanden" };
}

// gesamt: wie viele Prüfungen es gibt (bei einer Auswahl mehr als gelaufen sind).
// code: 0 nur, wenn alle gelaufen sind und bestanden haben; 1 bei einem Fehlschlag; 2, wenn etwas nicht geprüft ist.
export function zusammenfassung(ergebnisse: Ergebnis[], gesamt: number): { text: string; code: number } {
  const bestanden = ergebnisse.filter((e) => e.zustand === "bestanden");
  const kaputt = ergebnisse.filter((e) => e.zustand === "fehlgeschlagen");
  const aus = ergebnisse.filter((e) => e.zustand === "ausgelassen");
  const mitGrund = (e: Ergebnis) => `${e.name} (${e.grund ?? "ohne Angabe"})`;
  const nichtGewaehlt = gesamt - ergebnisse.length;
  const fehlt = [...aus.map(mitGrund), ...(nichtGewaehlt > 0 ? [`${nichtGewaehlt} nicht ausgewählte`] : [])];
  const nichtGeprueft = fehlt.length > 0 ? ` Nicht geprüft: ${fehlt.join(", ")}.` : "";
  if (kaputt.length > 0) return { code: 1, text: `${kaputt.length} von ${gesamt} Handprüfungen FEHLGESCHLAGEN: ${kaputt.map(mitGrund).join(", ")}. Bestanden: ${bestanden.length}.${nichtGeprueft}` };
  if (fehlt.length > 0) return { code: 2, text: `${bestanden.length} von ${gesamt} Handprüfungen bestanden, keine fehlgeschlagen.${nichtGeprueft}` };
  return { code: 0, text: `Alle ${gesamt} Handprüfungen bestanden.` };
}

// Die Angaben des Aufrufs. Ein Tippfehler ist ein Fehler: Sonst liefe still alles oder nur ein Teil.
export function leseArgumente(args: string[]): { ziel: string | null; nur: string[] | null; ohneBauen: boolean } | { fehler: string } {
  let nur: string[] | null = null;
  let ohneBauen = false;
  const ordner: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--ohne-bauen") ohneBauen = true;
    else if (a === "--nur") {
      const namen = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i].split(",").filter(Boolean) : [];
      if (namen.length === 0) return { fehler: "Nach --nur fehlen die Namen der Prüfungen." };
      const unbekannt = namen.filter((n) => !HANDPRUEFUNGEN.some((p) => p.name === n));
      if (unbekannt.length > 0) return { fehler: `Unbekannte Prüfung: ${unbekannt.join(", ")}. Es gibt: ${HANDPRUEFUNGEN.map((p) => p.name).join(", ")}.` };
      nur = namen;
    } else if (a.startsWith("--")) return { fehler: `Unbekannte Angabe: ${a}. Erlaubt sind --ohne-bauen und --nur name,name.` };
    else ordner.push(a);
  }
  if (ordner.length > 1) return { fehler: `Nur ein Ordner für Bilder und Protokolle ist erlaubt: ${ordner.join(", ")}.` };
  return { ziel: ordner[0] ?? null, nur, ohneBauen };
}
