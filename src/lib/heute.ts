import { eventsOn, type CalendarEvent, type CalendarSnapshot } from "./calendar";
import { addDays, isoDate } from "./dates";
import type { DocsSnapshot } from "./documents";
import type { IntelSnapshot } from "./intel";
import { importantMails, type MailItem, type MailSnapshot } from "./mail";
import type { DeskSnapshot } from "./paper";
import { fristText, projekteImText, RISIKO_REGELN, type ProjektKarte, type ProjekteSnapshot } from "./projekte";
import { dateOf, sortTasks, type Task, type TasksSnapshot } from "./tasks";

// Die Tagesübersicht: was heute ansteht und was auf dich wartet, aus allem, was JARVIS ohnehin schon kennt
// (Kalender, Aufgaben, Post, Projekte, Agenten). Hier wird nur zusammengestellt und sortiert, ohne KI:
// Dieselben Daten ergeben immer dieselbe Übersicht, und nichts davon verlässt dabei den Mac.

// Etwas, das auf dich wartet. dringend: sollte heute nicht liegen bleiben.
export type Hinweis = { art: "notaus" | "freigabe" | "rueckfrage" | "vorschlag" | "warnung" | "aufgaben" | "projekt" | "post" | "dokument"; text: string; href: string; dringend: boolean };

export type TagesTermin = {
  id: string;
  titel: string;
  start: number;
  ende: number;
  ganztags: boolean;
  ort: string;
  vorbei: boolean;
  laeuft: boolean;
  // Projekte, deren Name im Titel vorkommt; dazu gibt es eine Vorbereitung in der Akte.
  projekte: { id: string; name: string }[];
};

// Ein Projekt, das heute Aufmerksamkeit braucht, mit dem Grund in einem Satz.
// vertraulich: Der Name darf weder an das KI-Gehirn noch über Telegram gehen (src/lib/routinen.ts achtet darauf).
export type ProjektHinweis = { id: string; name: string; grund: string; dringend: boolean; vertraulich: boolean };

export type Tageslage = {
  datum: string;
  brauchtDich: Hinweis[];
  termine: TagesTermin[];
  naechster: TagesTermin | null;
  termineMorgen: number;
  aufgaben: { ueberfaellig: Task[]; heute: Task[]; dieseWoche: number };
  projekte: ProjektHinweis[];
  post: MailItem[];
};

export type TagesDaten = {
  calendar: CalendarSnapshot | null;
  tasks: TasksSnapshot | null;
  mail: MailSnapshot | null;
  projekte: ProjekteSnapshot | null;
  desk: DeskSnapshot | null;
  intel: IntelSnapshot | null;
  documents: DocsSnapshot | null;
  // Aus der Sicherheitszentrale: offene Freigaben und ob der Not-Aus steht.
  freigabenOffen: number;
  notaus: boolean;
};

const mehrzahl = (n: number, eins: string, viele: string) => `${n === 1 ? eins : `${n} ${viele}`}`;

function termin(e: CalendarEvent, jetzt: number, projekte: ProjektKarte[]): TagesTermin {
  return {
    id: e.id,
    titel: e.title,
    start: e.start,
    ende: e.end,
    ganztags: e.allDay,
    ort: e.location,
    vorbei: !e.allDay && e.end <= jetzt,
    laeuft: !e.allDay && e.start <= jetzt && e.end > jetzt,
    projekte: projekteImText(projekte, e.title).map((p) => ({ id: p.id, name: p.name })),
  };
}

// Warum ein Projekt heute auffällt. Überfälliges zuerst, dann was heute oder in den nächsten drei Tagen fällig ist.
// Offene Risiken mit Frist zählen wie Aufgaben mit Frist. Ein Projekt hat immer nur einen Grund; ist daneben
// noch etwas dringend (ein Risiko über der Frist, heute etwas fällig), steht es als Nachsatz dabei.
// risikoTag: An diesem Tag (Montag) kommen auch Risiken zur Sprache, die lange unverändert offen sind: als
// eigener Grund, wenn sonst nichts ansteht, sonst als Nachsatz. Sie machen ein Projekt nie dringend.
function projektHinweis(p: ProjektKarte, heute: string, risikoTag: boolean): ProjektHinweis | null {
  if (p.status !== "aktiv") return null;
  const alt = risikoTag ? p.risikenAlt : null;
  const dazuAlt = !alt ? "" : alt.anzahl === 1 ? `; außerdem ist ein Risiko seit ${alt.tage} Tagen unverändert offen` : `; außerdem sind ${alt.anzahl} Risiken seit mindestens ${RISIKO_REGELN.altTage} Tagen unverändert offen`;
  const aus = (grund: string, dringend: boolean): ProjektHinweis => ({ id: p.id, name: p.name, grund: `${grund}${dazuAlt}`, dringend, vertraulich: p.vertraulich });
  const dazuRisiko =
    p.risikenUeberfaellig > 0
      ? `; außerdem ${p.risikenUeberfaellig === 1 ? "ist ein Risiko" : `sind ${p.risikenUeberfaellig} Risiken`} über der Frist`
      : p.risikoFrist?.faellig === heute
        ? "; außerdem ist heute ein Risiko fällig"
        : "";
  if (p.ueberfaellig > 0) {
    const was = p.naechsteFrist && p.naechsteFrist.faellig < heute ? `: ${p.naechsteFrist.text}, ${fristText(p.naechsteFrist.faellig, heute)}` : "";
    return aus(`${mehrzahl(p.ueberfaellig, "Eine Aufgabe ist", "Aufgaben sind")} überfällig${was}${dazuRisiko}`, true);
  }
  if (p.risikenUeberfaellig > 0) {
    const was = p.risikoFrist && p.risikoFrist.faellig < heute ? `: ${p.risikoFrist.text}, ${fristText(p.risikoFrist.faellig, heute)}` : "";
    const dazuAufgabe = p.naechsteFrist?.faellig === heute ? "; außerdem ist heute eine Aufgabe fällig" : "";
    return aus(`${mehrzahl(p.risikenUeberfaellig, "Ein Risiko ist", "Risiken sind")} über der Frist${was}${dazuAufgabe}`, true);
  }
  const grenze = addDays(heute, 3);
  const aufgabe = p.naechsteFrist && p.naechsteFrist.faellig <= grenze ? p.naechsteFrist : null;
  const risiko = p.risikoFrist && p.risikoFrist.faellig <= grenze ? p.risikoFrist : null;
  // Bei gleicher Frist steht die Aufgabe da. Der Nachsatz kann hier nur „heute ein Risiko fällig“ sein, und
  // dann ist auch die Aufgabe von heute (ein früheres Risiko hätte den Vortritt).
  if (aufgabe && (!risiko || aufgabe.faellig <= risiko.faellig)) return aus(`${aufgabe.text}, ${fristText(aufgabe.faellig, heute)}${dazuRisiko}`, aufgabe.faellig === heute);
  if (risiko) return aus(`Risiko: ${risiko.text}, ${fristText(risiko.faellig, heute)}`, risiko.faellig === heute);
  if (alt) {
    const grund = alt.anzahl === 1 ? `Ein Risiko ist seit ${alt.tage} Tagen unverändert offen: ${alt.text}` : `${alt.anzahl} Risiken sind seit mindestens ${RISIKO_REGELN.altTage} Tagen unverändert offen, das älteste seit ${alt.tage} Tagen: ${alt.text}`;
    return { id: p.id, name: p.name, grund, dringend: false, vertraulich: p.vertraulich };
  }
  return null;
}

export function tageslage(d: TagesDaten, now: Date): Tageslage {
  const heute = isoDate(now);
  const jetzt = now.getTime();
  const projekte = d.projekte?.projekte ?? [];
  // Für die Erkennung im Termin zählen nur laufende Projekte.
  const laufend = projekte.filter((p) => p.status !== "abgeschlossen");

  const kalender = d.calendar?.access === "ok" ? d.calendar.events : [];
  const termine = eventsOn(kalender, heute)
    .map((e) => termin(e, jetzt, laufend))
    .sort((a, b) => Number(b.ganztags) - Number(a.ganztags) || a.start - b.start);
  const naechster = termine.find((t) => !t.ganztags && !t.vorbei && !t.laeuft) ?? null;

  const offen = d.tasks?.configured ? sortTasks(d.tasks.tasks) : [];
  const mitDatum = offen.filter((t) => dateOf(t));
  const ueberfaellig = mitDatum.filter((t) => dateOf(t)! < heute);
  const heuteFaellig = mitDatum.filter((t) => dateOf(t) === heute);
  const dieseWoche = mitDatum.filter((t) => dateOf(t)! > heute && dateOf(t)! <= addDays(heute, 7)).length;

  const projektHinweise = projekte
    .map((p) => projektHinweis(p, heute, now.getDay() === RISIKO_REGELN.wochentag))
    .filter((h): h is ProjektHinweis => h !== null)
    .sort((a, b) => Number(b.dringend) - Number(a.dringend) || a.name.localeCompare(b.name, "de"));

  const post = d.mail?.configured && !d.mail.error ? importantMails(d.mail).filter((m) => m.unread) : [];

  // Was auf dich wartet, das Wichtigste zuerst: erst was JARVIS anhält oder blockiert, dann was heute fällig ist.
  const brauchtDich: Hinweis[] = [];
  if (d.notaus) brauchtDich.push({ art: "notaus", text: "Der Not-Aus steht. JARVIS und alle Agenten sind angehalten.", href: "/einstellungen#sicherheit", dringend: true });
  if (d.freigabenOffen > 0) brauchtDich.push({ art: "freigabe", text: `${mehrzahl(d.freigabenOffen, "Eine Freigabe wartet", "Freigaben warten")} auf dein Ja oder Nein.`, href: "/einstellungen#sicherheit", dringend: true });
  const rueckfragen = d.desk?.approvals.filter((a) => a.state === "offen").length ?? 0;
  if (rueckfragen > 0) brauchtDich.push({ art: "rueckfrage", text: `Der Spielgeld-Desk fragt vor ${mehrzahl(rueckfragen, "einem Kauf", "Käufen")} nach.`, href: "/trading", dringend: true });
  if (d.intel?.warning) brauchtDich.push({ art: "warnung", text: `Intel bremst den Desk: ${d.intel.warning.text}`, href: "/intel", dringend: true });
  const vorschlaege = d.projekte?.vorschlaege.length ?? 0;
  if (vorschlaege > 0) brauchtDich.push({ art: "vorschlag", text: `${mehrzahl(vorschlaege, "Ein Vorschlag fürs Projektgedächtnis wartet", "Vorschläge fürs Projektgedächtnis warten")} auf deine Bestätigung.`, href: "/projekte", dringend: false });
  if (ueberfaellig.length > 0) brauchtDich.push({ art: "aufgaben", text: `${mehrzahl(ueberfaellig.length, "Eine Aufgabe ist", "Aufgaben sind")} überfällig.`, href: "/aufgaben", dringend: true });
  for (const h of projektHinweise.filter((x) => x.dringend)) brauchtDich.push({ art: "projekt", text: `${h.name}: ${h.grund}`, href: "/projekte", dringend: true });
  if (post.length > 0) brauchtDich.push({ art: "post", text: `${mehrzahl(post.length, "Eine neue wichtige Mail", "neue wichtige Mails")}.`, href: "/post", dringend: false });
  const fertig = d.documents?.jobs.find((j) => j.state === "fertig" && j.endedAt && isoDate(new Date(j.endedAt)) === heute);
  if (fertig) brauchtDich.push({ art: "dokument", text: `Dokument fertig: ${fertig.title ?? fertig.thema}`, href: "/dokumente", dringend: false });

  return {
    datum: heute,
    brauchtDich,
    termine,
    naechster,
    termineMorgen: eventsOn(kalender, addDays(heute, 1)).length,
    aufgaben: { ueberfaellig, heute: heuteFaellig, dieseWoche },
    projekte: projektHinweise,
    post: post.slice(0, 5),
  };
}
