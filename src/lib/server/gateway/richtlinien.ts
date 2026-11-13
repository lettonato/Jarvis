import type { AgentName, CStrenge, Kanal, Klasse } from "../../sicherheit";

// Die Richtlinientabelle des Security Gateways. Jedes Werkzeug, das eine KI aufrufen kann, steht hier mit
// Klasse, Ziel, Datenart, wer es aufrufen darf und wann ein Mensch zustimmen muss. Was hier nicht steht,
// lehnt das Gateway ab (Deny by Default). Neue Werkzeuge (Microsoft 365, Azure, Projektgedächtnis) kommen
// mit einer Zeile hierher, sonst laufen sie nicht.
//
// Klassen:
//   A Lesen: liest nur, ändert nichts.
//   B Vorbereiten: legt intern etwas an oder arbeitet begrenzt im Web. Mit Außenwirkung oder Kosten fragt
//     es nach, sobald im Gespräch fremde Inhalte (Mail, Webseite, Termin, Grok) gelesen wurden.
//   C Verändern: ändert Daten oder Zustände; braucht ein Ja außerhalb des Modells (Knopf am Mac oder in
//     Telegram). Einstellbar: immer (Standard) oder nur nach fremden Inhalten. Gedächtnis und
//     Handelsstart fragen immer.
//   D Kritisch: für die KI gesperrt. Heute: einen Not-Aus aufheben, Freigaben erteilen. Mails senden,
//     Termine löschen und echtes Geld gibt es als Werkzeug gar nicht.

export type Rolle = "geschaeftsfuehrung";

export type Freigabepflicht = "nie" | "bei-fremden-inhalten" | "klasse-c" | "immer";

export type Lage = { fremd: boolean; cStrenge: CStrenge };

// Was eine Regel für eine konkrete Eingabe sagt. dynamisch darf Klasse und Pflicht verschärfen oder sperren.
export type Bewertung = { klasse: Klasse; freigabe: Freigabepflicht; verboten?: string };

export type Regel = {
  // Der Agent, dessen Arbeit das ist. Ist er gesperrt, läuft das Werkzeug nicht.
  agent: AgentName;
  // Wer das Werkzeug aufrufen darf.
  aufrufer: AgentName[];
  klasse: Klasse;
  freigabe: Freigabepflicht;
  // Zielsystem und Datenart, für das Audit-Log und die Übersicht.
  ziel: string;
  daten: string;
  rollen: Rolle[];
  kanaele: Kanal[];
  // Liefert Text von Dritten (Mails, Webseiten, Termine, Grok). Danach gilt das Gespräch als „fremd“.
  liefertFremdes?: boolean;
  // Läuft bei Anthropic (web_search, web_fetch); JARVIS sieht den Aufruf nur und protokolliert ihn.
  server?: boolean;
  dynamisch?: (eingabe: Record<string, unknown>) => Promise<Partial<Bewertung> | null>;
  // Ein Satz für die Freigabe-Frage.
  was?: (eingabe: Record<string, unknown>) => string;
};

const GF: Rolle[] = ["geschaeftsfuehrung"];
const ALLE: Kanal[] = ["mac", "telegram"];
const MAC: Kanal[] = ["mac"];
const s = (x: unknown, max = 120) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");

const gehirn = (r: Omit<Regel, "aufrufer" | "rollen" | "kanaele"> & { kanaele?: Kanal[] }): Regel => ({ aufrufer: ["gehirn"], rollen: GF, kanaele: ALLE, ...r });
const browser = (r: Omit<Regel, "agent" | "aufrufer" | "rollen" | "kanaele" | "klasse" | "freigabe">): Regel => ({
  agent: "browser",
  aufrufer: ["browser"],
  rollen: GF,
  kanaele: [...ALLE, "intern"],
  klasse: "B",
  freigabe: "nie",
  liefertFremdes: true,
  ...r,
});

export const RICHTLINIEN: Record<string, Regel> = {
  // ---- Gehirn: Lesen (A) ----
  aufgaben_lesen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Obsidian", daten: "Aufgaben" }),
  termine_lesen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Apple-Kalender", daten: "Termine", liefertFremdes: true }),
  mails_lesen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Postfach (IMAP)", daten: "Absender, Betreffzeilen", liefertFremdes: true }),
  mail_oeffnen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Postfach (IMAP)", daten: "Mailtext", liefertFremdes: true }),
  handel_status: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Spielgeld-Desk", daten: "Kontostand, Positionen" }),
  nachrichten_lesen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Intel", daten: "Lagebild", liefertFremdes: true }),
  dokument_oeffnen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Dokumente/JARVIS", daten: "eigene PDFs" }),
  agenten_lesen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Agentensteuerung", daten: "Zustand, Zeiten und Kosten der Agenten" }),
  projekte_lesen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Projektgedächtnis", daten: "Projektübersicht (nur Bestätigtes)" }),
  projekt_lesen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Projektgedächtnis", daten: "Projektakte (nur Bestätigtes)" }),
  ansicht_oeffnen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Bildschirm", daten: "keine", kanaele: MAC }),
  besprechung_starten: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Bildschirm", daten: "keine", kanaele: MAC }),
  kalender_oeffnen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Kalender-App", daten: "keine", kanaele: MAC }),
  obsidian_oeffnen: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Obsidian-App", daten: "keine", kanaele: MAC }),
  web_search: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Websuche (Anthropic)", daten: "Suchbegriff", liefertFremdes: true, server: true }),
  web_fetch: gehirn({ agent: "gehirn", klasse: "A", freigabe: "nie", ziel: "Webseite (Anthropic)", daten: "Seitentext", liefertFremdes: true, server: true }),

  // ---- Gehirn: Vorbereiten (B) ----
  aufgabe_anlegen: gehirn({ agent: "gehirn", klasse: "B", freigabe: "nie", ziel: "Obsidian JARVIS/Eingang.md", daten: "neue Aufgabe" }),
  notiz_merken: gehirn({ agent: "gehirn", klasse: "B", freigabe: "nie", ziel: "Obsidian JARVIS/Notizen.md", daten: "neue Notiz" }),
  // Nur ein Vorschlag: Er landet im Eingang der Ansicht Projekte und gilt erst, wenn ein Mensch ihn am Mac
  // übernimmt. Die Bestätigung dort ist die Freigabe; die KI hat kein Werkzeug, das Einträge schreibt.
  projekt_vorschlagen: gehirn({ agent: "gehirn", klasse: "B", freigabe: "nie", ziel: "Projektgedächtnis (Eingang für Vorschläge)", daten: "Vorschlag, gilt erst nach Bestätigung am Mac" }),
  browser_auftrag: gehirn({
    agent: "browser",
    klasse: "B",
    freigabe: "bei-fremden-inhalten",
    ziel: "eigenes Chrome",
    daten: "Auftragstext, Webseiten",
    liefertFremdes: true,
    was: (e) => `Browser-Auftrag ausführen: „${s(e.auftrag, 200)}“`,
  }),
  dokument_erstellen: gehirn({
    agent: "analyst",
    klasse: "B",
    freigabe: "bei-fremden-inhalten",
    ziel: "Analyst (Anthropic, kostet ein paar Dollar)",
    daten: "Thema, Auftrag",
    was: (e) => `Dokument vom Analysten schreiben lassen: „${s(e.thema)}“ (kostet bei Anthropic ein paar Dollar)`,
  }),
  nachrichten_suchen: gehirn({
    agent: "intel",
    klasse: "B",
    freigabe: "bei-fremden-inhalten",
    ziel: "Grok (xAI, kostet etwa 25 Cent)",
    daten: "Suchthema",
    liefertFremdes: true,
    was: (e) => `Grok auf X suchen lassen: „${s(e.thema, 60)}“ (kostet etwa 25 Cent)`,
  }),

  // ---- Gehirn: Verändern (C) ----
  aufgabe_erledigen: gehirn({ agent: "gehirn", klasse: "C", freigabe: "klasse-c", ziel: "Obsidian", daten: "Aufgabe abhaken", was: (e) => `Aufgabe abhaken (id ${s(e.id, 40)})` }),
  aufgabe_verschieben: gehirn({
    agent: "gehirn",
    klasse: "C",
    freigabe: "klasse-c",
    ziel: "Obsidian",
    daten: "Fälligkeit",
    was: (e) => `Aufgabe (id ${s(e.id, 40)}) verschieben auf ${s(e.datum, 10)}`,
  }),
  mail_gelesen: gehirn({ agent: "gehirn", klasse: "C", freigabe: "klasse-c", ziel: "Postfach (IMAP)", daten: "Gelesen-Markierung", was: (e) => `Mail ${String(e.uid)} als gelesen markieren` }),
  termin_eintragen: gehirn({
    agent: "gehirn",
    klasse: "C",
    freigabe: "klasse-c",
    ziel: "Apple-Kalender",
    daten: "neuer Termin",
    was: (e) => `Termin eintragen: „${s(e.titel, 80)}“ am ${s(e.datum, 10)}${s(e.uhrzeit, 5) ? ` um ${s(e.uhrzeit, 5)}` : ", ganztägig"}${s(e.ort, 60) ? `, ${s(e.ort, 60)}` : ""}`,
  }),
  gedaechtnis_merken: gehirn({ agent: "gehirn", klasse: "C", freigabe: "immer", ziel: "Gedächtnis", daten: "dauerhafter Eintrag", was: (e) => `Dauerhaft merken: „${s(e.text, 200)}“` }),
  gedaechtnis_aendern: gehirn({
    agent: "gehirn",
    klasse: "C",
    freigabe: "immer",
    ziel: "Gedächtnis",
    daten: "Eintrag ändern",
    was: (e) => `Gedächtnis-Eintrag ${s(e.id, 30)} ändern in: „${s(e.text, 200)}“`,
  }),
  gedaechtnis_vergessen: gehirn({ agent: "gehirn", klasse: "C", freigabe: "immer", ziel: "Gedächtnis", daten: "Eintrag löschen", was: (e) => `Gedächtnis-Eintrag ${s(e.id, 30)} löschen` }),
  handel_steuern: gehirn({
    agent: "desk",
    klasse: "C",
    freigabe: "immer",
    ziel: "Spielgeld-Desk",
    daten: "Status des Handels",
    was: (e) => ({ start: "Spielgeld-Handel starten", weiter: "Spielgeld-Handel fortsetzen", pause: "Spielgeld-Handel pausieren", notaus: "Not-Aus des Desks" })[s(e.aktion, 10)] ?? "Spielgeld-Handel steuern",
    // Anhalten ist die sichere Richtung und geht sofort. Starten und Fortsetzen nur nach Ja. Nach einem
    // Not-Aus setzt nur ein Mensch den Handel fort, und zwar am Trading-Desk, nicht über die KI.
    dynamisch: async (e) => {
      const aktion = s(e.aktion, 10);
      if (aktion === "pause" || aktion === "notaus") return { klasse: "B", freigabe: "nie" };
      if (aktion !== "start" && aktion !== "weiter") return { klasse: "D", verboten: "Unbekannte Aktion für den Desk." };
      const { deskSnapshot } = await import("../desk/engine");
      const status = (await deskSnapshot()).status;
      if (status === "notaus") return { klasse: "D", verboten: "Nach einem Not-Aus setzt nur ein Mensch den Handel fort, am Trading-Desk. Das kann ich nicht." };
      return null;
    },
  }),

  // ---- Browser-Agent: jede Aktion im eigenen Chrome (B). Zusätzlich gelten die festen Regeln aus src/lib/browser.ts. ----
  im_web_suchen: browser({ ziel: "DuckDuckGo", daten: "Suchbegriff" }),
  seite_oeffnen: browser({ ziel: "Webseite", daten: "Adresse" }),
  klicken: browser({ ziel: "Webseite", daten: "Bedienelement" }),
  eintippen: browser({ ziel: "Webseite", daten: "Eingabetext" }),
  auswaehlen: browser({ ziel: "Webseite", daten: "Auswahl" }),
  scrollen: browser({ ziel: "Webseite", daten: "keine" }),
  zurueck: browser({ ziel: "Webseite", daten: "keine" }),

  // ---- Analyst: gibt das fertige Dokument ab (B). ----
  dokument_abgeben: { agent: "analyst", aufrufer: ["analyst"], rollen: GF, kanaele: [...ALLE, "intern"], klasse: "B", freigabe: "nie", ziel: "Dokumente/JARVIS", daten: "Dokument" },
};

// Die Bewertung für eine Eingabe. dynamisch darf lockern, wo die Tabelle es so festlegt (Anhalten des Desks),
// aber nie die Klasse D zurücknehmen.
export async function bewerte(regel: Regel, eingabe: Record<string, unknown>): Promise<Bewertung> {
  const basis: Bewertung = { klasse: regel.klasse, freigabe: regel.freigabe };
  const extra = regel.dynamisch ? await regel.dynamisch(eingabe) : null;
  if (!extra) return basis;
  const klasse = extra.klasse ?? basis.klasse;
  const freigabe = extra.freigabe ?? basis.freigabe;
  if (extra.verboten || klasse === "D") return { klasse: "D", freigabe: "immer", verboten: extra.verboten ?? "Für die KI gesperrt." };
  return { klasse, freigabe };
}

export const braucheFreigabe = (pflicht: Freigabepflicht, lage: Lage): boolean =>
  pflicht === "immer" || (pflicht === "klasse-c" && (lage.cStrenge === "immer" || lage.fremd)) || ((pflicht === "bei-fremden-inhalten" || pflicht === "klasse-c") && lage.fremd);

