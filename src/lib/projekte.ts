// Das Projektgedächtnis: was JARVIS dauerhaft über Projekte weiß. Hier stehen die Datenformen und Regeln, die
// Seite und Server teilen. Gespeichert wird über src/lib/server/projekte/speicher.ts (heute eine Datei auf dem
// Mac, später PostgreSQL), die Abläufe stehen in src/lib/server/projekte/projekte.ts.
//
// Grundregel: Nichts wird dauerhaft als wahr gespeichert, was ein Mensch nicht bestätigt hat. JARVIS kann nur
// vorschlagen. Jeder Eintrag trägt seine Quelle und Zeitstempel, jede Korrektur bleibt im Verlauf sichtbar,
// und zurückgezogene Einträge werden nicht gelöscht, sondern als zurückgezogen geführt.

export type ProjektStatus = "aktiv" | "pausiert" | "abgeschlossen";
export const STATUS_LABEL: Record<ProjektStatus, string> = { aktiv: "Aktiv", pausiert: "Pausiert", abgeschlossen: "Abgeschlossen" };

export type EintragArt = "aufgabe" | "entscheidung" | "notiz" | "risiko" | "naechster_schritt";
export const EINTRAG_ARTEN: EintragArt[] = ["aufgabe", "entscheidung", "notiz", "risiko", "naechster_schritt"];
export const ART_LABEL: Record<EintragArt, string> = { aufgabe: "Aufgabe", entscheidung: "Entscheidung", notiz: "Besprechungsnotiz", risiko: "Risiko", naechster_schritt: "Nächster Schritt" };
export const ART_MEHRZAHL: Record<EintragArt, string> = { aufgabe: "Aufgaben", entscheidung: "Entscheidungen", notiz: "Besprechungsnotizen", risiko: "Risiken", naechster_schritt: "Nächste Schritte" };

// Woher eine Information stammt. fremd: Als JARVIS sie vorschlug, war Text von Dritten im Gespräch (Mail,
// Webseite, Termin). Das setzt der Server, nicht das Modell.
export type QuellenArt = "eingabe" | "gespraech" | "mail" | "termin" | "dokument" | "web";
export const QUELLE_LABEL: Record<QuellenArt, string> = { eingabe: "von dir eingetragen", gespraech: "aus dem Gespräch", mail: "aus einer Mail", termin: "aus einem Termin", dokument: "aus einem Dokument", web: "aus dem Web" };
export type Quelle = { art: QuellenArt; hinweis: string; kanal: "mac" | "telegram"; fremd: boolean; von: "mensch" | "jarvis" };

export type Projekt = {
  id: string;
  name: string;
  beschreibung: string;
  status: ProjektStatus;
  verantwortliche: string[];
  // 0 bis 100, oder null, wenn niemand eine Zahl genannt hat. JARVIS schätzt hier nichts.
  fortschritt: number | null;
  // Weitere Namen, unter denen das Projekt in Terminen oder Mails auftaucht.
  stichworte: string[];
  // Vertraulich: Der Inhalt bleibt auf dem Mac. Das KI-Gehirn bekommt ihn nicht zu lesen (er ginge sonst zu
  // Anthropic), und per Telegram wird nichts daraus verschickt. Sichtbar ist er nur in der Ansicht Projekte.
  vertraulich: boolean;
  quelle: Quelle;
  erstelltAm: string;
  geaendertAm: string;
};

export type EintragFelder = { art: EintragArt; text: string; zustaendig: string; faellig: string | null; datum: string | null; erledigt: boolean };

// Eine Korrektur: wann, von wo, und was vorher dastand.
export type Aenderung = { am: string; von: "mac" | "telegram"; grund: string; vorher: Partial<EintragFelder> };

export type Eintrag = EintragFelder & {
  id: string;
  projektId: string;
  quelle: Quelle;
  erstelltAm: string;
  // Wann ein Mensch den Eintrag bestätigt hat. Ohne Bestätigung gibt es keinen Eintrag.
  bestaetigtAm: string;
  geaendertAm: string | null;
  verlauf: Aenderung[];
  zurueckgezogen: { am: string; grund: string } | null;
};

export type VorschlagInhalt = Partial<EintragFelder> & { beschreibung?: string; verantwortliche?: string[] };

// Was JARVIS vorschlägt und ein Mensch noch nicht entschieden hat. Vorschläge sind keine Tatsachen.
export type Vorschlag = {
  id: string;
  // projekt: ein neues Projekt. eintrag: ein neuer Eintrag. korrektur: ein bestehender Eintrag soll geändert werden.
  art: "projekt" | "eintrag" | "korrektur";
  projektId: string | null;
  projektName: string;
  eintragId: string | null;
  inhalt: VorschlagInhalt;
  quelle: Quelle;
  erstelltAm: string;
  zustand: "offen" | "uebernommen" | "abgelehnt";
  entschiedenAm: string | null;
};

// Für die Anzeige: Bei einer Korrektur steht dabei, wie der Eintrag bisher lautet. Wird nicht gespeichert.
export type VorschlagAnzeige = Vorschlag & { bisher: EintragFelder | null };

export type ProjektKarte = Projekt & {
  offeneAufgaben: number;
  ueberfaellig: number;
  naechsteFrist: { text: string; faellig: string } | null;
  risiken: number;
  letzteEntscheidung: { text: string; datum: string } | null;
  naechsterSchritt: string | null;
  eintraege: number;
  // Stammt einer der Texte auf dieser Karte (Projekt selbst, nächste Frist, letzte Entscheidung, nächster
  // Schritt) von Dritten? Dann gilt ein Gespräch, das die Karte liest, als fremd beeinflusst.
  textVonDritten: boolean;
};

export type ProjekteSnapshot = { projekte: ProjektKarte[]; vorschlaege: VorschlagAnzeige[]; ablage: string };
export type ProjektAkte = { projekt: ProjektKarte; eintraege: Eintrag[]; zurueckgezogen: Eintrag[]; vorschlaege: VorschlagAnzeige[] };
// Was /api/projekte antwortet: die Übersicht und, wenn ein Projekt offen ist, seine Akte.
export type ProjekteAntwort = ProjekteSnapshot & { akte: ProjektAkte | null; message?: string };

export const GRENZEN = { name: 80, beschreibung: 600, text: 600, person: 60, personen: 10, stichworte: 8, hinweis: 160, grund: 200, offeneVorschlaege: 100, eintraegeJeProjekt: 2000, projekte: 200 };

// Spitze Klammern fallen weg, damit ein Eintrag im Prompt nie wie ein Abschnitt oder Befehl aussehen kann.
export const sauber = (wert: unknown, max: number): string => (typeof wert === "string" ? wert.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

export const istDatum = (wert: unknown): wert is string => typeof wert === "string" && /^\d{4}-\d{2}-\d{2}$/.test(wert) && !Number.isNaN(Date.parse(`${wert}T00:00:00`));
export const datumOderNull = (wert: unknown): string | null => (istDatum(wert) ? wert : null);

export function fortschrittOderNull(wert: unknown): number | null {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n) : null;
}

export const namensliste = (wert: unknown, max: number, laenge: number): string[] => {
  const liste = Array.isArray(wert) ? wert : typeof wert === "string" ? wert.split(/[,;\n]/) : [];
  return [...new Set(liste.map((p) => sauber(p, laenge)).filter(Boolean))].slice(0, max);
};

const schluessel = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Findet ein Projekt über seine Nummer, seinen genauen Namen oder einen eindeutigen Teil des Namens.
export function findeProjekt<P extends Pick<Projekt, "id" | "name" | "stichworte">>(projekte: P[], gesucht: string): P | null {
  const g = schluessel(gesucht ?? "");
  if (!g) return null;
  const genau = projekte.find((p) => p.id === gesucht || schluessel(p.name) === g || p.stichworte.some((s) => schluessel(s) === g));
  if (genau) return genau;
  const teil = projekte.filter((p) => schluessel(p.name).includes(g) || (g.length >= 4 && g.includes(schluessel(p.name))));
  return teil.length === 1 ? teil[0] : null;
}

// Welche Projekte in einem Text vorkommen (Titel eines Termins, Betreff einer Mail). Verglichen wird im Code,
// als ganze Wörter; der Text selbst wird dabei nie als Anweisung gelesen.
export function projekteImText<P extends Pick<Projekt, "name" | "stichworte">>(projekte: P[], text: string): P[] {
  const t = ` ${schluessel(text ?? "")} `;
  return projekte.filter((p) => [p.name, ...p.stichworte].some((n) => schluessel(n).length >= 3 && t.includes(` ${schluessel(n)} `)));
}

const tage = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00`) - Date.parse(`${b}T00:00:00`)) / 86_400_000);

export function karteVon(projekt: Projekt, eintraege: Eintrag[], heute: string): ProjektKarte {
  const gueltig = eintraege.filter((e) => e.projektId === projekt.id && !e.zurueckgezogen);
  const offen = gueltig.filter((e) => e.art === "aufgabe" && !e.erledigt);
  const mitFrist = offen.filter((e) => e.faellig).sort((a, b) => a.faellig!.localeCompare(b.faellig!));
  const entscheidungen = gueltig.filter((e) => e.art === "entscheidung").sort((a, b) => (b.datum ?? b.erstelltAm).localeCompare(a.datum ?? a.erstelltAm));
  const schritte = gueltig.filter((e) => e.art === "naechster_schritt" && !e.erledigt).sort((a, b) => b.erstelltAm.localeCompare(a.erstelltAm));
  return {
    ...projekt,
    textVonDritten: projekt.quelle.fremd || [mitFrist[0], entscheidungen[0], schritte[0]].some((e) => e?.quelle.fremd === true),
    offeneAufgaben: offen.length,
    ueberfaellig: mitFrist.filter((e) => e.faellig! < heute).length,
    naechsteFrist: mitFrist[0] ? { text: mitFrist[0].text, faellig: mitFrist[0].faellig! } : null,
    risiken: gueltig.filter((e) => e.art === "risiko" && !e.erledigt).length,
    letzteEntscheidung: entscheidungen[0] ? { text: entscheidungen[0].text, datum: entscheidungen[0].datum ?? entscheidungen[0].erstelltAm.slice(0, 10) } : null,
    naechsterSchritt: schritte[0]?.text ?? null,
    eintraege: gueltig.length,
  };
}

const tag = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long" });

export function fristText(faellig: string, heute: string): string {
  const d = tage(faellig, heute);
  if (d < -1) return `seit ${-d} Tagen überfällig`;
  if (d === -1) return "seit gestern überfällig";
  if (d === 0) return "heute fällig";
  if (d === 1) return "morgen fällig";
  return `fällig am ${tag(faellig)}`;
}

// Die Vorbereitung auf einen Termin zu einem Projekt: was zuletzt entschieden wurde und was offen ist.
// Nur bestätigte Einträge, jeder mit Datum; kurz genug für eine Erinnerung aufs Handy.
export function vorbereitung(akte: Pick<ProjektAkte, "projekt" | "eintraege">, heute: string): string {
  const e = akte.eintraege.filter((x) => !x.zurueckgezogen);
  const neueste = (art: EintragArt, n: number) =>
    e
      .filter((x) => x.art === art && (art === "entscheidung" || art === "notiz" || !x.erledigt))
      .sort((a, b) => (b.datum ?? b.erstelltAm).localeCompare(a.datum ?? a.erstelltAm))
      .slice(0, n);
  const zeilen: string[] = [`Projekt ${akte.projekt.name}${akte.projekt.fortschritt === null ? "" : ` (${akte.projekt.fortschritt} %)`}`];
  const notiz = neueste("notiz", 1)[0];
  if (notiz) zeilen.push(`Letzte Besprechung (${tag(notiz.datum ?? notiz.erstelltAm)}): ${notiz.text}`);
  const entscheidungen = neueste("entscheidung", 3);
  if (entscheidungen.length) zeilen.push("Entschieden:", ...entscheidungen.map((x) => `• ${x.text} (${tag(x.datum ?? x.erstelltAm)})`));
  const aufgaben = e.filter((x) => x.art === "aufgabe" && !x.erledigt).sort((a, b) => (a.faellig ?? "9999").localeCompare(b.faellig ?? "9999")).slice(0, 5);
  if (aufgaben.length) zeilen.push("Offen:", ...aufgaben.map((x) => `• ${x.text}${x.zustaendig ? ` (${x.zustaendig})` : ""}${x.faellig ? `, ${fristText(x.faellig, heute)}` : ""}`));
  const risiken = neueste("risiko", 3);
  if (risiken.length) zeilen.push("Risiken:", ...risiken.map((x) => `• ${x.text}`));
  const schritt = neueste("naechster_schritt", 1)[0];
  if (schritt) zeilen.push(`Nächster Schritt: ${schritt.text}`);
  if (zeilen.length === 1) zeilen.push("Dazu ist noch nichts festgehalten.");
  return zeilen.join("\n");
}

export const quelleText = (q: Quelle): string => `${QUELLE_LABEL[q.art]}${q.hinweis ? `: ${q.hinweis}` : ""}${q.von === "jarvis" ? " (von JARVIS vorgeschlagen, von dir bestätigt)" : ""}`;
