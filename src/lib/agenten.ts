import type { BrowserStatus } from "./browser";
import { isoDate } from "./dates";
import { DOC_LIMITS, PHASE_LABEL, type DocsSnapshot } from "./documents";
import { formatSignedUsd } from "./format";
import { AUTO_HOURS, TYPICAL_INTEL_COST_USD, type IntelSnapshot } from "./intel";
import type { KostenPosten, KostenUebersicht } from "./kosten";
import { metallSatz, METALLE_ZEITEN, type MetalleSnapshot } from "./metalle";
import { MODELLE } from "./modelle";
import { SAFETY, type DeskSnapshot } from "./paper";
import { AGENTEN, type AgentName, type SicherheitsZustand } from "./sicherheit";
import { taktText } from "./zeitplan";

// Die Agentensteuerung: alle Agenten an einer Stelle, mit Zustand, letztem und nächstem Lauf, Ergebnis,
// Fehler, Kosten und festen Grenzen. Hier wird nur zusammengestellt, was die Agenten selbst melden, ohne KI.
// Gestartet, pausiert und gesperrt wird weiter über die Wege, die es schon gibt (Intel, Desk, Sicherheit);
// die Steuerung bekommt keine eigenen Rechte.

// angehalten: Der Not-Aus steht. gesperrt: Dieser eine Agent ist gesperrt. wartet: läuft nach Zeitplan und ist gerade nicht dran.
export type AgentZustand = "laeuft" | "bereit" | "wartet" | "pausiert" | "gesperrt" | "angehalten" | "nicht-eingerichtet" | "fehler";

export const ZUSTAND_LABEL: Record<AgentZustand, string> = {
  laeuft: "läuft",
  bereit: "bereit",
  wartet: "wartet",
  pausiert: "pausiert",
  gesperrt: "gesperrt",
  angehalten: "angehalten",
  "nicht-eingerichtet": "nicht eingerichtet",
  fehler: "Fehler",
};

// Was die Steuerung für einen Agenten anbietet. Sperren und Entsperren gehen nur am Mac.
export type AgentAktion = "starten" | "pausieren" | "fortsetzen" | "sperren" | "entsperren";

export type AgentLage = {
  name: AgentName;
  label: string;
  aufgabe: string;
  // Die Ansicht, in der der Agent arbeitet.
  href: string;
  zustand: AgentZustand;
  // Ein Satz dazu, was er gerade tut oder warum er steht.
  satz: string;
  // Wie er anläuft: auf Zuruf, nach Zeitplan oder laufend.
  takt: string;
  letzterLauf: string | null;
  naechsterLauf: string | null;
  // Das Ergebnis des letzten Laufs in einem Satz.
  ergebnis: string | null;
  fehler: string | null;
  // Was er heute bei bezahlten Diensten verbraucht hat, nach Listenpreis. null: Er ist nicht eingerichtet und kostet nichts.
  // Nutzt er mehrere Dienste, stehen sie einzeln unter posten, und heuteUsd ist die Summe.
  kosten: { heuteUsd: number; budgetUsd: number | null; was: string; posten?: { was: string; usd: number; budgetUsd: number | null }[] } | null;
  // Feste Grenzen, die im Programm stehen und nicht vom KI-Modell abhängen.
  grenzen: string[];
  aktionen: AgentAktion[];
};

// Wann der Agent zuletzt etwas getan hat, laut Audit-Log.
export type AgentSpur = { zeit: string };

export type AgentenDaten = {
  gehirnBereit: boolean;
  sicherheit: SicherheitsZustand;
  intel: IntelSnapshot | null;
  metalle: MetalleSnapshot | null;
  documents: DocsSnapshot | null;
  browser: BrowserStatus | null;
  desk: DeskSnapshot | null;
  spuren: Partial<Record<AgentName, AgentSpur>>;
  // Das Kostenbuch. null: Es ließ sich nicht lesen; dann zeigt die Übersicht dort keine Zahl statt einer falschen.
  kosten: KostenUebersicht | null;
};

// kosten: heute zusammen (die Summe der Agenten), der laufende Monat laut Kostenbuch und seit wann es zählt.
export type AgentenSnapshot = { agenten: AgentLage[]; notaus: boolean; stand: string; kosten: { heuteUsd: number; monatUsd: number | null; seit: string | null } };

const HREF: Record<AgentName, string> = { gehirn: "/fokus", browser: "/browser", analyst: "/dokumente", intel: "/intel", metalle: "/intel#edelmetalle", desk: "/trading" };

const kurz = (text: string, max = 140) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const dollar = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

type Roh = Omit<AgentLage, "name" | "label" | "aufgabe" | "href" | "aktionen"> & { aktionen: AgentAktion[] };

const anfragen = (p: KostenPosten | undefined) => (!p || p.anfragen === 0 ? "heute noch keine Anfrage" : p.anfragen === 1 ? "eine Anfrage heute" : `${p.anfragen.toLocaleString("de-DE")} Anfragen heute`);

// Was ein Agent heute bei Claude verbraucht hat, laut Kostenbuch.
function claudeKosten(d: AgentenDaten, agent: AgentName, modell: string): AgentLage["kosten"] {
  if (!d.kosten) return null;
  const p = d.kosten.heute[agent]?.claude;
  return { heuteUsd: p?.usd ?? 0, budgetUsd: null, was: `${modell}, ${anfragen(p)}` };
}

function gehirn(d: AgentenDaten): Roh {
  const spur = d.spuren.gehirn ?? null;
  return {
    zustand: d.gehirnBereit ? "bereit" : "nicht-eingerichtet",
    satz: d.gehirnBereit ? "Antwortet, sobald du fragst." : "Es fehlt der Claude-Schlüssel. Den trägst du in den Einstellungen ein.",
    takt: "auf Zuruf",
    letzterLauf: spur?.zeit ?? null,
    naechsterLauf: null,
    ergebnis: null,
    fehler: null,
    kosten: d.gehirnBereit ? claudeKosten(d, "gehirn", MODELLE.gespraech.name) : null,
    grenzen: ["Jedes Werkzeug läuft durch das Security Gateway", "Änderungen an Daten nur nach deinem Ja", "Den Not-Aus kann es nicht lösen"],
    aktionen: [],
  };
}

function browser(d: AgentenDaten): Roh {
  const b = d.browser;
  const task = b?.task ?? null;
  const laeuft = task?.state === "laeuft";
  const fehler = b?.error ?? (task?.state === "fehler" ? task.result : null);
  return {
    zustand: !b ? "bereit" : !b.ready ? "nicht-eingerichtet" : laeuft ? "laeuft" : fehler ? "fehler" : "bereit",
    satz: !b ? "Lädt noch." : !b.ready ? "Ohne Claude-Schlüssel kann er den Browser nicht bedienen." : laeuft ? `Arbeitet an: ${kurz(task!.auftrag, 90)}` : "Wartet auf einen Auftrag.",
    takt: "auf Zuruf",
    letzterLauf: task ? (task.endedAt ?? task.startedAt) : (d.spuren.browser?.zeit ?? null),
    naechsterLauf: null,
    ergebnis: task && !laeuft && task.state !== "fehler" && task.result ? kurz(task.result) : null,
    fehler: fehler ? kurz(fehler) : null,
    kosten: b?.ready ? claudeKosten(d, "browser", MODELLE.browser.name) : null,
    grenzen: ["Kauft nichts, sendet nichts ab, meldet sich nirgends an", "Kommt nur über die prüfende Netzschleuse ins Netz", "Keine Seiten im Heimnetz"],
    aktionen: [],
  };
}

function analyst(d: AgentenDaten, heute: string): Roh {
  const s = d.documents;
  const letzter = s?.jobs.find((j) => j.state !== "laeuft") ?? null;
  const laeuft = s?.running ?? null;
  const heuteUsd = (s?.jobs ?? []).filter((j) => isoDate(new Date(j.startedAt)) === heute).reduce((summe, j) => summe + j.costUsd, 0);
  return {
    zustand: !s ? "bereit" : !s.configured ? "nicht-eingerichtet" : laeuft ? "laeuft" : letzter?.state === "fehler" ? "fehler" : "bereit",
    satz: !s ? "Lädt noch." : !s.configured ? "Ohne Claude-Schlüssel schreibt er keine Dokumente." : laeuft ? `Schreibt: ${kurz(laeuft.thema, 80)}${laeuft.phase ? ` (${PHASE_LABEL[laeuft.phase]})` : ""}` : "Wartet auf einen Auftrag.",
    takt: "auf Zuruf",
    letzterLauf: letzter ? (letzter.endedAt ?? letzter.startedAt) : null,
    naechsterLauf: null,
    ergebnis: letzter?.state === "fertig" ? `Dokument fertig: ${kurz(letzter.title ?? letzter.thema, 100)}` : letzter?.state === "abgebrochen" ? `Abgebrochen: ${kurz(letzter.thema, 100)}` : null,
    fehler: letzter?.state === "fehler" ? kurz(letzter.error ?? "Das letzte Dokument ist nicht fertig geworden.") : null,
    kosten: s?.configured ? { heuteUsd, budgetUsd: null, was: `Claude, höchstens ${dollar(DOC_LIMITS.maxUsd)} je Dokument` } : null,
    grenzen: [`Höchstens ${DOC_LIMITS.searches} Suchen und ${DOC_LIMITS.fetches} Seiten je Dokument`, `Höchstens ${DOC_LIMITS.minutes} Minuten`, "Ein Dokument zur selben Zeit"],
    aktionen: [],
  };
}

function intel(d: AgentenDaten): Roh {
  const s = d.intel;
  const rest = s ? s.budgetUsd - s.spentTodayUsd : 0;
  const kannStarten = Boolean(s?.configured && !s.running && rest >= TYPICAL_INTEL_COST_USD);
  return {
    zustand: !s ? "bereit" : !s.configured ? "nicht-eingerichtet" : s.running ? "laeuft" : s.error ? "fehler" : s.auto ? "wartet" : "bereit",
    satz: !s
      ? "Lädt noch."
      : !s.configured
        ? "Es fehlt der xAI-Schlüssel. Den trägst du in den Einstellungen ein."
        : s.running
          ? s.running.focus
            ? `Sucht gerade zu ${s.running.focus}.`
            : "Liest gerade die Nachrichten."
          : rest < TYPICAL_INTEL_COST_USD
            ? "Das Tagesbudget ist aufgebraucht. Morgen liest er weiter."
            : s.auto
              ? "Wartet auf den nächsten Lauf."
              : "Liest nur auf Zuruf.",
    takt: s?.auto === false ? "nur auf Zuruf" : `alle ${AUTO_HOURS} Stunden, tagsüber`,
    letzterLauf: s?.report?.at ?? null,
    naechsterLauf: s?.configured && !s.running ? s.nextAt : null,
    ergebnis: s?.report ? kurz(s.report.summary) : null,
    fehler: s?.error ? kurz(s.error) : null,
    kosten: s?.configured ? { heuteUsd: s.spentTodayUsd, budgetUsd: s.budgetUsd, was: "Grok (xAI)" } : null,
    grenzen: ["Tagesbudget, danach liest er bis morgen nicht mehr", "Kann den Desk nur bremsen, nie kaufen lassen"],
    aktionen: kannStarten ? ["starten"] : [],
  };
}

// Der Edelmetall-Agent rechnet nur: Kurse von Twelve Data, kein KI-Modell, kein Handel.
function metalle(d: AgentenDaten): Roh {
  const s = d.metalle;
  return {
    zustand: !s ? "bereit" : !s.eingerichtet ? "nicht-eingerichtet" : s.laeuft ? "laeuft" : s.fehler ? "fehler" : s.auto ? "wartet" : "bereit",
    satz: !s
      ? "Lädt noch."
      : !s.eingerichtet
        ? "Es fehlt der Twelve-Data-Schlüssel. Den trägst du in den Einstellungen unter Rohstoffe ein."
        : s.laeuft
          ? "Holt gerade die Kurse."
          : s.auto
            ? "Wartet auf den nächsten Lauf."
            : "Liest nur auf Zuruf.",
    takt: s?.auto === false ? "nur auf Zuruf" : taktText(s?.zeiten ?? METALLE_ZEITEN),
    letzterLauf: s?.bericht?.erstelltAm ?? null,
    naechsterLauf: s?.eingerichtet && !s.laeuft ? s.naechsterLauf : null,
    ergebnis: s?.bericht ? `${s.veraltet ? "Veraltet: " : ""}${metallSatz(s.bericht)}` : null,
    fehler: s?.fehler ?? null,
    // Twelve Data rechnet nicht je Abfrage ab; ein Lauf ist eine Abfrage aus dem Kontingent des Plans.
    kosten: s?.eingerichtet ? { heuteUsd: 0, budgetUsd: null, was: "Twelve Data, je Lauf zwei bis drei Abrufe aus dem Kontingent deines Plans (einer je Kursreihe)" } : null,
    grenzen: ["Liest nur Kurse und handelt nicht", "Kein KI-Modell, nur Zahlen und feste Regeln", "Keine Prognose und keine Anlageberatung"],
    aktionen: s?.eingerichtet && !s.laeuft ? ["starten"] : [],
  };
}

// Der Desk bezahlt bis zu zwei Dienste: Grok liest X vor Käufen (mit Tagesbudget), und Claude bewertet als Chief
// die Coins. Das Budget gilt nur für Grok; deshalb steht es beim Posten und nicht bei der Summe.
function deskKosten(d: AgentenDaten): AgentLage["kosten"] {
  const s = d.desk;
  const posten: NonNullable<NonNullable<AgentLage["kosten"]>["posten"]> = [];
  if (s?.x.enabled) posten.push({ was: "Grok liest X vor Käufen", usd: s.x.spentTodayUsd, budgetUsd: s.x.budgetUsd });
  const chief = d.kosten?.heute.desk?.claude;
  // Claude steht da, wenn der Desk heute schon bewertet hat oder gestartet ist und einen Schlüssel hat.
  // Was gebucht ist, bleibt sichtbar, auch wenn der Schlüssel danach entfernt wurde.
  const mitClaude = Boolean(chief && chief.usd > 0) || Boolean(d.kosten && d.gehirnBereit && s && s.status !== "aus");
  if (mitClaude) posten.push({ was: `${MODELLE.chief.name} bewertet die Coins, ${anfragen(chief)}`, usd: chief?.usd ?? 0, budgetUsd: null });
  if (posten.length === 0) return null;
  if (posten.length === 1) return { heuteUsd: posten[0].usd, budgetUsd: posten[0].budgetUsd, was: posten[0].was };
  return { heuteUsd: posten.reduce((summe, p) => summe + p.usd, 0), budgetUsd: null, was: "Grok und Claude", posten };
}

function desk(d: AgentenDaten): Roh {
  const s = d.desk;
  const stand = s && s.status !== "aus" ? `${formatSignedUsd(s.pnlUsd)} Spielgeld, Tag ${Math.min(s.testDay, SAFETY.testDays)} von ${SAFETY.testDays}` : null;
  const zustand: AgentZustand = !s ? "bereit" : s.status === "laeuft" ? "laeuft" : s.status === "pausiert" || s.status === "tageslimit" ? "pausiert" : s.status === "notaus" ? "angehalten" : "bereit";
  return {
    zustand,
    satz: !s
      ? "Lädt noch."
      : s.status === "aus"
        ? "Noch nicht gestartet. Starten kannst du ihn auf dem Trading-Desk."
        : s.status === "laeuft"
          ? "Sucht und handelt mit Spielgeld."
          : s.status === "pausiert"
            ? "Pausiert: Er kauft nichts Neues, der Stop-Loss passt weiter auf."
            : s.status === "tageslimit"
              ? "Das Tageslimit ist erreicht, heute kauft er nichts mehr."
              : (s.statusReason ?? "Der Not-Aus des Desks steht."),
    takt: "laufend, solange er gestartet ist",
    letzterLauf: s?.lastTickAt ?? null,
    naechsterLauf: null,
    ergebnis: stand,
    fehler: null,
    kosten: deskKosten(d),
    grenzen: ["Nur Spielgeld, kein Echtgeld und keine Börsenanbindung", `Stop-Loss ${Math.round(SAFETY.stopLoss * 100)} % unter dem Einstieg`, `Höchstens ${Math.round(SAFETY.dailyLossLimit * 100)} % Verlust am Tag`, `Höchstens ${SAFETY.maxOpenPositions} Positionen`],
    aktionen: s?.status === "laeuft" ? ["pausieren"] : s?.status === "pausiert" ? ["fortsetzen"] : [],
  };
}

export function agentenLage(d: AgentenDaten, now: Date): AgentLage[] {
  const heute = isoDate(now);
  const roh: Record<AgentName, Roh> = { gehirn: gehirn(d), browser: browser(d), analyst: analyst(d, heute), intel: intel(d), metalle: metalle(d), desk: desk(d) };
  return AGENTEN.map((a) => {
    const r = roh[a.name];
    const sperre = d.sicherheit.sperren[a.name];
    const basis = { name: a.name, label: a.label, aufgabe: a.text, href: HREF[a.name] };
    // Der Not-Aus und eine Sperre gehen vor: Dann zählt nicht, was der Agent sonst täte, und starten lässt er sich nicht.
    if (d.sicherheit.notaus.an) {
      return { ...basis, ...r, zustand: "angehalten", satz: "Der Not-Aus steht. Lösen kannst du ihn am Mac unter Einstellungen, Sicherheit.", naechsterLauf: null, aktionen: [] };
    }
    if (sperre) {
      return { ...basis, ...r, zustand: "gesperrt", satz: `Gesperrt${sperre.grund ? `: ${kurz(sperre.grund, 80)}` : ""}.`, naechsterLauf: null, aktionen: ["entsperren"] };
    }
    return { ...basis, ...r, aktionen: [...r.aktionen, "sperren"] };
  });
}

const aufzaehlung = (namen: string[]) => (namen.length <= 1 ? (namen[0] ?? "") : `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]}`);

// Die Lage der Agenten in zwei, drei gesprochenen Sätzen: erst was nicht stimmt, dann was läuft.
export function agentenSatz(agenten: AgentLage[]): string {
  if (agenten.length > 0 && agenten.every((a) => a.zustand === "angehalten")) return "Der Not-Aus steht, alle Agenten sind angehalten.";
  const bei = (z: AgentZustand) => agenten.filter((a) => a.zustand === z).map((a) => a.label);
  const saetze: string[] = [];
  for (const a of agenten.filter((x) => x.zustand === "fehler")) saetze.push(`${a.label} meldet einen Fehler: ${a.fehler ?? "ohne nähere Angabe"}.`.replace(/\.\.$/, "."));
  const gesperrt = bei("gesperrt");
  if (gesperrt.length) saetze.push(`${aufzaehlung(gesperrt)} ${gesperrt.length === 1 ? "ist" : "sind"} gesperrt.`);
  const fehlt = bei("nicht-eingerichtet");
  if (fehlt.length) saetze.push(`${aufzaehlung(fehlt)} ${fehlt.length === 1 ? "ist" : "sind"} noch nicht eingerichtet.`);
  const pausiert = bei("pausiert");
  if (pausiert.length) saetze.push(`${aufzaehlung(pausiert)} ${pausiert.length === 1 ? "ist" : "sind"} pausiert.`);
  const laeuft = agenten.filter((a) => a.zustand === "laeuft");
  for (const a of laeuft) saetze.push(`${a.label}: ${a.satz}`);
  const ruhig = agenten.filter((a) => a.zustand === "bereit" || a.zustand === "wartet").length;
  if (ruhig === agenten.length) return "Alle Agenten sind bereit, gerade arbeitet keiner.";
  if (ruhig > 0 && saetze.length > 0) saetze.push(ruhig === 1 ? "Der übrige Agent ist bereit." : "Die übrigen sind bereit.");
  return saetze.join(" ");
}
