import { accessProblem, clock, outlookLuecke, outlookSatz, type CalendarEvent } from "./calendar";
import { addDays, fromIso, isoDate, shortDue } from "./dates";
import { tageslage, type ProjektHinweis, type TagesDaten } from "./heute";
import { fristText } from "./projekte";
import { gross, liste, projektListe, projektSaetze, vorschlagSatz, zahl } from "./routinen";
import { aufgabenUnlesbar, dateOf, TRESOR_UNLESBAR, type Task } from "./tasks";

// Der Wochenbericht: was diese Woche erledigt wurde, was liegt und was in den nächsten sieben Tagen kommt.
// Wie der Tagesabschluss (src/lib/routinen.ts) entsteht er ohne KI aus Daten, die JARVIS ohnehin hat, und es
// gelten dieselben zwei Regeln: Ein vertrauliches Projekt wird nie beim Namen genannt, und über Telegram stehen
// Projektnamen nur, wenn du es eingeschaltet hast (namen: true).
//
// „Diese Woche“ ist Montag bis heute, die Vorwoche Montag bis Sonntag davor. Der Ausblick reicht von morgen bis
// in sieben Tagen: Am Freitag deckt er damit die ganze nächste Arbeitswoche.

export const AUSBLICK_TAGE = 7;

// Ein Tag im Ausblick. Ein Termin steht nur an seinem ersten Tag im Ausblick, auch wenn er über mehrere Tage
// geht: Sonst zählte ein Urlaub von fünf Tagen als fünf Termine. outlook: Outlook-Termine ohne Freigabe, gezählt.
export type WochenTag = { tag: string; termine: CalendarEvent[]; outlook: number };

export type Wochenbericht = {
  datum: string;
  montag: string;
  // Der letzte Tag des Ausblicks.
  bis: string;
  // null: Es ist kein Tresor eingerichtet oder er ist noch nicht gelesen; dann steht zu Aufgaben nichts da.
  aufgaben: {
    erledigt: number;
    erledigtVorwoche: number;
    // Was diese Woche erledigt wurde, das Neueste zuerst.
    erledigtTexte: string[];
    ueberfaellig: Task[];
    kommend: Task[];
  } | null;
  // Der Tresor lässt sich nicht lesen: Dann steht dieser Satz da, nicht „nichts erledigt“.
  aufgabenProblem: string | null;
  // Tage im Ausblick, an denen etwas im Kalender steht. null: Der Kalender ist nicht lesbar.
  tage: WochenTag[] | null;
  kalenderProblem: string | null;
  outlookLuecke: string;
  // Projekte mit Überfälligem oder einer Frist heute.
  projekteOffen: ProjektHinweis[];
  // Projekte, bei denen im Ausblick etwas fällig wird.
  fristen: ProjektHinweis[];
  vorschlaege: number;
};

// Der letzte Tag, an dem der Termin noch läuft. Das Ende selbst gehört nicht mehr dazu: Ein ganztägiger Termin
// endet um Mitternacht des Folgetags. Ein Termin ohne Dauer zählt an seinem Starttag.
const letzterTag = (e: { start: number; end: number }) => isoDate(new Date(Math.max(e.end, e.start + 1) - 1));

// Der Montag der Woche, in der dieser Tag liegt (der Sonntag gehört zur Woche davor).
const montagVon = (iso: string) => addDays(iso, -((fromIso(iso).getDay() + 6) % 7));

export function wochenbericht(d: TagesDaten, now: Date): Wochenbericht {
  const lage = tageslage(d, now);
  const heute = lage.datum;
  const montag = montagVon(heute);
  const bis = addDays(heute, AUSBLICK_TAGE);
  const imAusblick = (iso: string | undefined | null): iso is string => Boolean(iso && iso > heute && iso <= bis);

  const unlesbar = aufgabenUnlesbar(d.tasks);
  let aufgaben: Wochenbericht["aufgaben"] = null;
  if (d.tasks?.configured && !unlesbar) {
    const fertig = [...(d.tasks.erledigt ?? [])].sort((a, b) => b.am.localeCompare(a.am));
    const dieseWoche = fertig.filter((e) => e.am >= montag && e.am <= heute);
    const vorMontag = addDays(montag, -7);
    const mitDatum = d.tasks.tasks.filter((t) => dateOf(t)).sort((a, b) => dateOf(a)!.localeCompare(dateOf(b)!));
    aufgaben = {
      erledigt: dieseWoche.length,
      erledigtVorwoche: fertig.filter((e) => e.am >= vorMontag && e.am < montag).length,
      erledigtTexte: dieseWoche.map((e) => e.text),
      ueberfaellig: mitDatum.filter((t) => dateOf(t)! < heute),
      kommend: mitDatum.filter((t) => imAusblick(dateOf(t))),
    };
  }

  const lesbar = d.calendar?.access === "ok";
  const stumm = !d.calendar || d.calendar.access === "offen" || d.calendar.access === "kein-mac";
  const tage: WochenTag[] = [];
  if (lesbar) {
    const morgen = addDays(heute, 1);
    // Der Tag, unter dem der Termin steht: sein erster Tag im Ausblick. null: Er liegt nicht im Ausblick.
    const ersterTag = (e: { start: number; end: number }) => {
      const tag = [isoDate(new Date(e.start)), morgen].sort()[1];
      return tag <= bis && letzterTag(e) >= tag ? tag : null;
    };
    const verdeckt = (d.calendar!.outlook?.verdeckt ?? []).map(ersterTag);
    for (let i = 1; i <= AUSBLICK_TAGE; i++) {
      const tag = addDays(heute, i);
      const termine = d.calendar!.events.filter((e) => ersterTag(e) === tag).sort((a, b) => (a.allDay !== b.allDay ? (a.allDay ? -1 : 1) : a.start - b.start));
      const outlook = verdeckt.filter((t) => t === tag).length;
      if (termine.length > 0 || outlook > 0) tage.push({ tag, termine, outlook });
    }
  }

  // Je Projekt eine Zeile, wie im Tagesabschluss: Was schon mit etwas Dringendem dasteht, kommt nicht noch einmal.
  const projekteOffen = lage.projekte.filter((h) => h.dringend);
  const schonDa = new Set(projekteOffen.map((h) => h.id));
  const fristen = (d.projekte?.projekte ?? [])
    .filter((p) => p.status === "aktiv" && !schonDa.has(p.id))
    .flatMap((p): { am: string; hinweis: ProjektHinweis }[] => {
      const aufgabe = imAusblick(p.naechsteFrist?.faellig) ? { am: p.naechsteFrist!.faellig, text: p.naechsteFrist!.text } : null;
      const risiko = imAusblick(p.risikoFrist?.faellig) ? { am: p.risikoFrist!.faellig, text: `Risiko: ${p.risikoFrist!.text}` } : null;
      // Die frühere von beiden; bei Gleichstand die Aufgabe.
      const frist = aufgabe && risiko ? (risiko.am < aufgabe.am ? risiko : aufgabe) : (aufgabe ?? risiko);
      return frist ? [{ am: frist.am, hinweis: { id: p.id, name: p.name, grund: `${frist.text}, ${fristText(frist.am, heute)}`, dringend: false, vertraulich: p.vertraulich } }] : [];
    })
    .sort((a, b) => a.am.localeCompare(b.am))
    .map((f) => f.hinweis);

  return {
    datum: heute,
    montag,
    bis,
    aufgaben,
    aufgabenProblem: unlesbar ? TRESOR_UNLESBAR : null,
    tage: lesbar ? tage : null,
    kalenderProblem: lesbar || stumm ? null : accessProblem(d.calendar),
    outlookLuecke: lesbar ? outlookLuecke(d.calendar) : "",
    projekteOffen,
    fristen,
    vorschlaege: d.projekte?.vorschlaege.length ?? 0,
  };
}

// Nichts eingerichtet oder noch nichts geladen: Beides sieht von hier gleich aus, deshalb sagt der Satz beides.
const NICHTS = "Dazu habe ich gerade nichts: Aufgaben, Kalender und Projekte sind nicht eingerichtet oder noch nicht geladen.";
const istLeer = (w: Wochenbericht) => !w.aufgaben && !w.aufgabenProblem && !w.tage && !w.kalenderProblem && w.projekteOffen.length + w.fristen.length + w.vorschlaege === 0;

const TAG_LANG = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" });
const TAG_OHNE_MONAT = new Intl.DateTimeFormat("de-DE", { day: "numeric" });
const WOCHENTAG = new Intl.DateTimeFormat("de-DE", { weekday: "long" });

// „9. bis 13. November“, über den Monatswechsel „30. November bis 4. Dezember“, am Montag nur „16. November“.
function zeitraum(von: string, bis: string): string {
  if (von === bis) return TAG_LANG.format(fromIso(bis));
  const a = fromIso(von);
  const b = fromIso(bis);
  return `${a.getMonth() === b.getMonth() ? `${TAG_OHNE_MONAT.format(a)}.` : TAG_LANG.format(a)} bis ${TAG_LANG.format(b)}`;
}

const anzahlTermine = (tage: WochenTag[]) => tage.reduce((n, t) => n + t.termine.length + t.outlook, 0);

// Ein Termin an dem Tag, unter dem er steht: „09:00 Jour fixe“, „ganztägig Urlaub (bis Fr., 20.11.)“. Hat er
// schon an einem früheren Tag begonnen, steht keine Anfangszeit da (sie wäre die eines anderen Tages), sondern
// sein Ende. ab: Davor steht „2 Termine, “, dann heißt es „ab 09:00“.
function terminText(e: CalendarEvent, tag: string, heute: string, ab = false): string {
  const ende = letzterTag(e);
  const bis = ende > tag ? ` (bis ${shortDue(ende, heute)})` : "";
  if (e.allDay) return `ganztägig ${e.title}${bis}`;
  if (isoDate(new Date(e.start)) === tag) return `${ab ? "ab " : ""}${clock(e.start)} ${e.title}${bis}`;
  return bis ? `läuft weiter: ${e.title}${bis}` : `bis ${clock(e.end)} ${e.title}`;
}

function tagZeile(t: WochenTag, heute: string): string {
  const wann = shortDue(t.tag, heute);
  if (t.termine.length === 0) return `• ${wann}: ${outlookSatz(t.outlook, true)}`;
  const kopf = t.termine.length === 1 ? terminText(t.termine[0], t.tag, heute) : `${t.termine.length} Termine, ${terminText(t.termine[0], t.tag, heute, true)}`;
  const outlook = t.outlook > 0 ? `, dazu ${outlookSatz(t.outlook, true)}` : "";
  return `• ${wann}: ${kopf}${outlook}`;
}

// Der Wochenbericht als Nachricht aufs Handy.
export function wocheNachricht(w: Wochenbericht, o: { name: string; namen: boolean }): string {
  const teile: string[] = [`Deine Woche, ${o.name} (${zeitraum(w.montag, w.datum)}):`];
  if (istLeer(w)) return `${teile[0]}\n\n${NICHTS}`;

  if (w.aufgabenProblem) teile.push(`Aufgaben: ${w.aufgabenProblem}`);
  else if (w.aufgaben) {
    const a = w.aufgaben;
    const vorwoche = `(Vorwoche: ${a.erledigtVorwoche})`;
    teile.push(a.erledigt > 0 ? `Erledigt: ${zahl(a.erledigt, "eine Aufgabe", "Aufgaben")} ${vorwoche}.\n${liste(a.erledigtTexte, (t) => `• ${t}`)}` : `Erledigt: diese Woche noch keine Aufgabe ${vorwoche}.`);
    if (a.ueberfaellig.length > 0) teile.push(`Liegt noch: ${zahl(a.ueberfaellig.length, "Eine Aufgabe ist", "Aufgaben sind")} überfällig.\n${liste(a.ueberfaellig, (t) => `• ${t.text} (${fristText(dateOf(t)!, w.datum)})`)}`);
  }

  if (w.kalenderProblem) teile.push(`Kalender: ${w.kalenderProblem}`);
  else if (w.tage) {
    const kalender = w.tage.length > 0 ? `Die nächsten sieben Tage im Kalender: ${zahl(anzahlTermine(w.tage), "ein Termin", "Termine")}.\n${w.tage.map((t) => tagZeile(t, w.datum)).join("\n")}` : w.outlookLuecke ? "" : "In den nächsten sieben Tagen ist dein Kalender frei.";
    const mitLuecke = [kalender, w.outlookLuecke].filter(Boolean).join("\n");
    if (mitLuecke) teile.push(mitLuecke);
  }

  if (w.aufgaben && w.aufgaben.kommend.length > 0) teile.push(`Fällig in den nächsten sieben Tagen:\n${liste(w.aufgaben.kommend, (t) => `• ${shortDue(dateOf(t)!, w.datum)}: ${t.text}`)}`);

  const projekte = [...w.projekteOffen, ...w.fristen];
  if (projekte.length > 0 || w.vorschlaege > 0) {
    const zeilen: string[] = [];
    if (projekte.length > 0) {
      if (o.namen) zeilen.push(`Projekte:\n${projektListe(projekte)}`);
      else {
        const heute = w.projekteOffen.length;
        const dann = w.fristen.length;
        const stuecke = [heute > 0 ? `${zahl(heute, "eines hat", "haben")} Überfälliges oder eine Frist von heute` : "", dann > 0 ? `bei ${dann === 1 ? "einem" : dann} ist in den nächsten sieben Tagen etwas fällig` : ""].filter(Boolean);
        zeilen.push(`Projekte: ${gross(stuecke.join(", "))}. Einzelheiten am Mac unter „Heute“.`);
      }
    }
    if (w.vorschlaege > 0) zeilen.push(vorschlagSatz(w.vorschlaege, true));
    teile.push(zeilen.join("\n"));
  }
  return teile.join("\n\n");
}

// Der Wochenbericht als gesprochener Text am Mac: kurz, ohne Listen.
export function wocheSatz(w: Wochenbericht, name: string): string {
  const saetze: string[] = [`Deine Woche, ${name}.`];
  if (istLeer(w)) return `${saetze[0]} ${NICHTS}`;

  if (w.aufgabenProblem) saetze.push(w.aufgabenProblem);
  else if (w.aufgaben) {
    const a = w.aufgaben;
    // Die Vorwoche steht als Zahl daneben, ohne „mehr“ oder „weniger“: Mitten in der Woche stünden sonst
    // zwei Tage gegen sieben.
    const davor = a.erledigtVorwoche === 0 ? "keine" : a.erledigtVorwoche === 1 ? "war es eine" : `waren es ${a.erledigtVorwoche}`;
    if (a.erledigt === 0) saetze.push(`Erledigt ist diese Woche noch keine Aufgabe${a.erledigtVorwoche > 0 ? `, in der Vorwoche ${davor}` : ""}.`);
    else saetze.push(`Du hast ${zahl(a.erledigt, "eine Aufgabe", "Aufgaben")} erledigt, in der Vorwoche ${davor}.`);
    if (a.ueberfaellig.length > 0) saetze.push(`${zahl(a.ueberfaellig.length, "Eine ist", "sind")} überfällig.`);
  }

  if (w.kalenderProblem) saetze.push(w.kalenderProblem);
  else if (w.tage) {
    const n = anzahlTermine(w.tage);
    if (n === 0) {
      if (!w.outlookLuecke) saetze.push("In den nächsten sieben Tagen ist dein Kalender frei.");
    } else {
      // Der vollste Tag, bei Gleichstand der frühere. Nur genannt, wenn er wirklich heraussticht.
      const voll = [...w.tage].sort((a, b) => b.termine.length + b.outlook - (a.termine.length + a.outlook))[0];
      const sticht = w.tage.length > 1 && voll.termine.length + voll.outlook > 1 && w.tage.filter((t) => t.termine.length + t.outlook === voll.termine.length + voll.outlook).length === 1;
      saetze.push(`In den nächsten sieben Tagen hast du ${zahl(n, "einen Termin", "Termine")}${sticht ? `, die meisten am ${WOCHENTAG.format(fromIso(voll.tag))}` : ""}.`);
    }
    if (w.outlookLuecke) saetze.push(w.outlookLuecke);
  }
  if (w.aufgaben && w.aufgaben.kommend.length > 0) saetze.push(`${zahl(w.aufgaben.kommend.length, "Eine Aufgabe wird", "Aufgaben werden")} fällig.`);

  saetze.push(...projektSaetze([...w.projekteOffen, ...w.fristen], w.vorschlaege, "eine Frist"));
  return saetze.join(" ");
}

// Wann der Wochenbericht von selbst kommt: an einem Wochentag (1 Montag bis 7 Sonntag) zu einer Uhrzeit.
export type WochenPlan = { tag: number; zeit: string };
export const WOCHE_VORSCHLAG: WochenPlan = { tag: 5, zeit: "16:00" };
export const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const ZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;

// Liest den Plan aus den Einstellungen. Alles, was kein gültiger Plan ist, heißt „ausgeschaltet“.
export function wochenPlan(roh: unknown): WochenPlan | null {
  if (!roh || typeof roh !== "object") return null;
  const { tag, zeit } = roh as { tag?: unknown; zeit?: unknown };
  if (typeof tag !== "number" || !Number.isInteger(tag) || tag < 1 || tag > 7) return null;
  if (typeof zeit !== "string" || !ZEIT.test(zeit)) return null;
  return { tag, zeit };
}

const wochentagVon = (d: Date) => ((d.getDay() + 6) % 7) + 1;
const zurZeit = (tag: Date, zeit: string) => {
  const [h, m] = zeit.split(":").map(Number);
  const d = new Date(tag);
  d.setHours(h, m, 0, 0);
  return d;
};

// Ist der Wochenbericht jetzt dran? Am eingestellten Wochentag ab der Uhrzeit, einmal, und höchstens fensterMs
// später (der Mac hat kurz geschlafen). Was länger her ist, wird nicht nachgeholt. Das Fenster reicht über
// Mitternacht: Ein Bericht für Freitag 22:30 darf noch am Samstag um 00:10 kommen.
export function wocheFaellig(plan: WochenPlan | null, now: Date, zuletztAm: string | null, fensterMs: number): boolean {
  if (!plan) return false;
  const gestern = new Date(now);
  gestern.setDate(gestern.getDate() - 1);
  const termin = [now, gestern].filter((tag) => wochentagVon(tag) === plan.tag).map((tag) => zurZeit(tag, plan.zeit))[0];
  if (!termin) return false;
  const spaet = now.getTime() - termin.getTime();
  // Geschickt ist er, wenn seit dem Tag des Termins schon einer hinausging (auch kurz nach Mitternacht).
  return spaet >= 0 && spaet < fensterMs && !(zuletztAm && zuletztAm >= isoDate(termin));
}

// Der nächste Termin nach jetzt.
export function naechsteWoche(plan: WochenPlan | null, now: Date): Date | null {
  if (!plan) return null;
  for (let i = 0; i <= 7; i++) {
    const tag = new Date(now);
    tag.setDate(tag.getDate() + i);
    const d = zurZeit(tag, plan.zeit);
    if (wochentagVon(d) === plan.tag && d.getTime() > now.getTime()) return d;
  }
  return null;
}

export const wochenTakt = (plan: WochenPlan) => `${WOCHENTAGE[plan.tag - 1].toLowerCase()}s um ${plan.zeit} Uhr`;
