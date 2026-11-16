import { eventsOn, outlookLuecke, type CalendarEvent, type CalendarSnapshot } from "./calendar";
import { addDays, isoDate } from "./dates";
import type { DocsSnapshot } from "./documents";
import { ohnePunkt } from "./format";
import type { IntelSnapshot } from "./intel";
import { ladestand } from "./ladestand";
import { importantMails, type MailItem, type MailSnapshot } from "./mail";
import type { DeskSnapshot } from "./paper";
import { fristText, projekteImText, RISIKO_REGELN, type ProjektKarte, type ProjekteSnapshot } from "./projekte";
import { aufgabenUnlesbar, dateOf, sortTasks, TRESOR_UNLESBAR, type Task, type TasksSnapshot } from "./tasks";

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
  // Der Tresor ist verbunden, lässt sich aber nicht lesen: Die Aufgaben oben sind dann leer, weil unbekannt.
  aufgabenUnlesbar: boolean;
  projekte: ProjektHinweis[];
  post: MailItem[];
  // Wie viele neue wichtige Mails es sind (post zeigt höchstens fünf davon).
  postNeu: number;
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

export const mehrzahl = (n: number, eins: string, viele: string) => `${n === 1 ? eins : `${n} ${viele}`}`;

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
  if (aufgabenUnlesbar(d.tasks)) brauchtDich.push({ art: "aufgaben", text: TRESOR_UNLESBAR, href: "/aufgaben", dringend: true });
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
    aufgabenUnlesbar: aufgabenUnlesbar(d.tasks),
    projekte: projektHinweise,
    post: post.slice(0, 5),
    postNeu: post.length,
  };
}

// ---------- Was JARVIS gerade nicht weiß ----------

// Eine Quelle, die noch lädt, nicht verbunden ist oder gerade nicht antwortet, ist unbekannt, nicht leer. Die
// Übersicht sagt dann das, statt „kein Termin“, „nichts fällig“ oder „nichts wartet“ zu behaupten.
// art: laedt (gleich ist es da), fehlt (nicht eingerichtet; dort kann auch nichts warten), gestoert (eingerichtet,
// aber nicht lesbar). Was die Seite daraus folgert, hängt an der Art, nicht am Wortlaut.
export type Luecke = { art: "laedt" | "fehlt" | "gestoert"; text: string };
// Je Quelle, warum sie gerade fehlt, oder null, wenn sie gelesen ist.
export type Luecken = { kalender: Luecke | null; outlook: Luecke | null; aufgaben: Luecke | null; post: Luecke | null; projekte: Luecke | null };

const fehlt = (text: string): Luecke => ({ art: "fehlt", text });
const gestoert = (text: string): Luecke => ({ art: "gestoert", text });

// Welche eigenen Abfragen von Anfang an scheitern (JARVIS selbst antwortet dort nicht): Das ist nicht „lädt noch“.
// Eine Liste für alle: JarvisProvider füllt sie, „Heute“ liest sie.
export type Ausfall = Record<"calendar" | "tasks" | "mail" | "projekte" | "desk" | "intel" | "documents" | "market" | "metalle" | "weather" | "settings" | "memory", boolean>;
export type Ausfaelle = Partial<Ausfall>;

function kalenderLuecke(k: CalendarSnapshot | null, aus: boolean): Luecke | null {
  if (!k) return ladestand("kalender", aus);
  if (k.access === "ok") return null;
  if (k.access === "offen") return fehlt("Der Kalender ist noch nicht verbunden.");
  if (k.access === "kein-mac") return fehlt("Den Kalender gibt es nur auf dem Mac.");
  // Eine fehlende Erlaubnis geht nicht von selbst vorbei; wie sie zu geben ist, steht im Raum Kalender.
  if (k.access === "verweigert" || k.access === "nur-schreiben") return gestoert("JARVIS darf den Kalender nicht lesen.");
  return gestoert("Der Kalender lässt sich gerade nicht lesen.");
}

export function luecken(d: Pick<TagesDaten, "calendar" | "tasks" | "mail" | "projekte">, aus: Ausfaelle = {}): Luecken {
  const k = d.calendar;
  // Outlook: derselbe Satz wie im Raum Kalender und im Gespräch, auch wenn nur ein Teil der Termine fehlt.
  const outlook = k?.access === "ok" ? outlookLuecke(k) : "";
  return {
    kalender: kalenderLuecke(k, aus.calendar === true),
    outlook: outlook ? gestoert(outlook) : null,
    aufgaben: !d.tasks ? ladestand("aufgaben", aus.tasks === true) : !d.tasks.configured ? fehlt("Obsidian ist noch nicht verbunden.") : aufgabenUnlesbar(d.tasks) ? gestoert(TRESOR_UNLESBAR) : null,
    post: !d.mail ? ladestand("post", aus.mail === true) : !d.mail.configured ? fehlt("Das Postfach ist noch nicht verbunden.") : d.mail.error ? gestoert("Das Postfach antwortet nicht.") : null,
    projekte: !d.projekte ? ladestand("projekte", aus.projekte === true) : null,
  };
}

// Der Termin, der im Kopf der Übersicht steht: der laufende, sonst der nächste.
export function terminImKopf(lage: Tageslage): { termin: TagesTermin; laeuft: boolean } | null {
  const laeuft = lage.termine.find((t) => t.laeuft && !t.ganztags);
  const termin = laeuft ?? lage.naechster;
  return termin ? { termin, laeuft: Boolean(laeuft) } : null;
}

// Der Satz unter der großen Uhrzeit: der Termin; ohne Termin, was über den Kalender bekannt ist.
export function kopfSatz(lage: Tageslage, l: Luecken): string {
  const dran = terminImKopf(lage);
  if (dran) return dran.termin.titel;
  const luecke = l.kalender ?? l.outlook;
  if (luecke) return ohnePunkt(luecke.text);
  return lage.termine.length ? "Für heute ist kein Termin mehr offen" : "Heute steht kein Termin an";
}

// Der Rest des Tages in einem Satz, aus denselben Daten wie die Listen darunter.
export function tagesSatz(lage: Tageslage, l: Luecken): string {
  const teile: string[] = [];
  const ueberfaellig = lage.aufgaben.ueberfaellig.length;
  const faellig = lage.aufgaben.heute.length;
  if (faellig) teile.push(`${mehrzahl(faellig, "Eine Aufgabe ist", "Aufgaben sind")} heute fällig`);
  if (ueberfaellig) teile.push(`${mehrzahl(ueberfaellig, "eine ist", "sind")} überfällig`);
  if (lage.postNeu) teile.push(mehrzahl(lage.postNeu, "eine wichtige Mail ist neu", "wichtige Mails sind neu"));
  if (l.aufgaben?.art === "gestoert") teile.push("die Aufgaben lassen sich gerade nicht lesen");
  if (l.post?.art === "gestoert") teile.push("das Postfach antwortet nicht");
  if (teile.length) {
    const satz = teile.join(", ");
    return `${satz[0].toUpperCase()}${satz.slice(1)}.`;
  }
  if (l.aufgaben?.art === "laedt" || l.post?.art === "laedt") return "Der Rest des Tages lädt noch.";
  if (l.aufgaben?.art === "fehlt" && l.post?.art === "fehlt") return "Aufgaben und Post sind noch nicht verbunden.";
  return "Sonst liegt heute nichts an.";
}

// Was unter „Wartet auf dich“ steht, wenn die Liste leer ist. rest: der Stand des Übrigen, aus dem die Liste
// entsteht (Freigaben und Not-Aus, Spielgeld-Desk, Intel, Dokumente): gelesen, lädt noch oder antwortet nicht.
// Termine stehen dort nicht, der Kalender zählt hier also nicht.
export type RestStand = "da" | "laedt" | "gestoert";

// Der Stand des Übrigen aus den einzelnen Abfragen: [gelesen, von Anfang an gescheitert] je Abfrage.
export function restStand(abfragen: [da: boolean, gescheitert: boolean][]): RestStand {
  const offen = abfragen.filter(([da]) => !da);
  if (offen.length === 0) return "da";
  return offen.every(([, aus]) => aus) ? "gestoert" : "laedt";
}

export function wartetLeer(l: Luecken, rest: RestStand): string {
  const quellen = [l.aufgaben, l.post, l.projekte];
  if (rest === "laedt" || quellen.some((q) => q?.art === "laedt")) return "Lädt noch, was auf dich wartet.";
  if (rest === "gestoert" || quellen.some((q) => q?.art === "gestoert")) return "Soweit JARVIS es gerade lesen kann, wartet nichts auf dich.";
  return "Nichts wartet auf dich.";
}
