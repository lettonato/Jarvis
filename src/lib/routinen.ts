import { accessProblem, clock, eventsOn, outlookLuecke, outlookSatz, verdecktAm, type CalendarEvent } from "./calendar";
import { addDays, isoDate } from "./dates";
import { tageslage, type ProjektHinweis, type TagesDaten, type Tageslage } from "./heute";
import { fristText } from "./projekte";
import { dateOf, type Task } from "./tasks";

// Was JARVIS von selbst meldet: die Projekte im Morgenbriefing und der Tagesabschluss am Abend.
// Wie die Tagesübersicht (src/lib/heute.ts) entsteht alles ohne KI aus Daten, die JARVIS ohnehin hat.
//
// Zwei Regeln gelten für jeden Text aus dieser Datei:
// 1. Ein vertrauliches Projekt wird nie beim Namen genannt, nur gezählt. Was JARVIS im Gespräch sagt,
//    steht danach im Verlauf und ginge mit der nächsten Frage an das KI-Gehirn; was über Telegram geht,
//    läuft über einen Dienst außer Haus.
// 2. Über Telegram stehen Projektnamen und -inhalte nur, wenn du es eingeschaltet hast (namen: true).
//    Sonst nennt JARVIS dort nur Zahlen und verweist auf den Mac.

const MAX_ZEILEN = 5;
const zahl = (n: number, eins: string, viele: string) => (n === 1 ? eins : `${n} ${viele}`);
const gross = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const teile = (hinweise: ProjektHinweis[]) => ({ offen: hinweise.filter((h) => !h.vertraulich), geheim: hinweise.filter((h) => h.vertraulich).length });

// Der Absatz „Projekte“ für Nachrichten aufs Handy. Leer, wenn kein Projekt Aufmerksamkeit braucht.
export function projekteAbsatz(lage: Tageslage, vorschlaege: number, namen: boolean): string {
  const { offen, geheim } = teile(lage.projekte);
  const zeilen: string[] = [];
  if (lage.projekte.length > 0) {
    if (namen) {
      const liste = offen.slice(0, MAX_ZEILEN).map((h) => `• ${h.name}: ${h.grund}`);
      if (offen.length > MAX_ZEILEN) liste.push(`• und ${zahl(offen.length - MAX_ZEILEN, "ein weiteres", "weitere")}`);
      if (geheim > 0) liste.push(`• ${zahl(geheim, "ein vertrauliches Projekt", "vertrauliche Projekte")}: Einzelheiten nur am Mac`);
      zeilen.push(`Projekte, die dich brauchen:\n${liste.join("\n")}`);
    } else {
      const dringend = lage.projekte.filter((h) => h.dringend).length;
      const davon = dringend === 0 ? "" : dringend === lage.projekte.length ? (dringend === 1 ? ", es ist dringend" : ", alle dringend") : `, ${dringend === 1 ? "eines" : dringend} davon dringend`;
      zeilen.push(`Projekte: ${zahl(lage.projekte.length, "Eines braucht", "brauchen")} dich${davon}. Einzelheiten am Mac unter „Heute“.`);
    }
  }
  if (vorschlaege > 0) zeilen.push(`${zahl(vorschlaege, "Ein Vorschlag fürs Projektgedächtnis wartet", "Vorschläge fürs Projektgedächtnis warten")} am Mac auf deine Bestätigung.`);
  return zeilen.join("\n");
}

// Dasselbe als gesprochener Satz am Mac: höchstens zwei Projekte beim Namen, der Rest gezählt.
export function projektSatz(lage: Tageslage, vorschlaege: number): string {
  return projektSaetze(lage.projekte, vorschlaege).join(" ");
}

function projektSaetze(hinweise: ProjektHinweis[], vorschlaege: number): string[] {
  const { offen, geheim } = teile(hinweise);
  const saetze = offen.slice(0, 2).map((h) => `Im Projekt ${h.name}: ${h.grund}.`);
  const rest = offen.length - saetze.length + geheim;
  if (rest > 0) saetze.push(saetze.length ? `${zahl(rest, "Ein weiteres Projekt braucht", "weitere Projekte brauchen")} dich, das steht unter Heute.` : `${zahl(rest, "Ein Projekt braucht", "Projekte brauchen")} dich, das steht unter Heute.`);
  if (vorschlaege > 0) saetze.push(`${zahl(vorschlaege, "Ein Vorschlag fürs Projektgedächtnis wartet", "Vorschläge fürs Projektgedächtnis warten")} auf deine Bestätigung.`);
  return saetze;
}

// Was am Abend zählt: was heute liegen blieb, was morgen kommt und was noch auf ein Ja oder Nein wartet.
export type Abschluss = {
  datum: string;
  erledigt: number;
  offenHeute: Task[];
  ueberfaellig: number;
  // null: Der Kalender ist nicht lesbar; dann steht der Grund in kalenderProblem (oder nichts, wenn er nie verbunden war).
  termineMorgen: CalendarEvent[] | null;
  // Outlook-Termine morgen, die nicht fürs Gespräch und fürs Handy freigegeben sind: nur ihre Zahl.
  outlookMorgen: number;
  // Fehlen gerade Termine aus Outlook, steht hier der Satz dazu, sonst nichts.
  outlookLuecke: string;
  kalenderProblem: string | null;
  aufgabenMorgen: Task[];
  // Projekte, bei denen morgen etwas fällig ist.
  fristenMorgen: ProjektHinweis[];
  // Projekte mit Überfälligem oder einer Frist heute.
  projekteOffen: ProjektHinweis[];
  vorschlaege: number;
  // Not-Aus, Freigaben, Rückfragen des Desks, Warnung von Intel: Texte ohne Projektinhalt.
  wartet: string[];
};

export function tagesabschluss(d: TagesDaten, now: Date): Abschluss {
  const lage = tageslage(d, now);
  const morgen = addDays(lage.datum, 1);
  const lesbar = d.calendar?.access === "ok";
  const stumm = !d.calendar || d.calendar.access === "offen" || d.calendar.access === "kein-mac";
  const offen = d.tasks?.configured ? d.tasks.tasks : [];
  // Je Projekt eine Zeile: die Aufgabe von morgen, sonst das Risiko, dessen Frist morgen abläuft. Ein Projekt,
  // das schon mit etwas Dringendem dasteht (projekteOffen), kommt nicht ein zweites Mal.
  const projekteOffen = lage.projekte.filter((h) => h.dringend);
  const schonDa = new Set(projekteOffen.map((h) => h.id));
  const fristenMorgen = (d.projekte?.projekte ?? [])
    .filter((p) => p.status === "aktiv" && !schonDa.has(p.id))
    .flatMap((p): ProjektHinweis[] => {
      const grund = p.naechsteFrist?.faellig === morgen ? p.naechsteFrist.text : p.risikoFrist?.faellig === morgen ? `Risiko: ${p.risikoFrist.text}` : null;
      return grund === null ? [] : [{ id: p.id, name: p.name, grund: `${grund}, ${fristText(morgen, lage.datum)}`, dringend: false, vertraulich: p.vertraulich }];
    });
  return {
    datum: lage.datum,
    erledigt: d.tasks?.configured ? d.tasks.doneToday : 0,
    offenHeute: lage.aufgaben.heute,
    ueberfaellig: lage.aufgaben.ueberfaellig.length,
    termineMorgen: lesbar ? eventsOn(d.calendar!.events, morgen) : null,
    outlookMorgen: lesbar ? verdecktAm(d.calendar, morgen) : 0,
    outlookLuecke: lesbar ? outlookLuecke(d.calendar) : "",
    kalenderProblem: lesbar || stumm ? null : accessProblem(d.calendar),
    aufgabenMorgen: offen.filter((t) => dateOf(t) === morgen),
    fristenMorgen,
    projekteOffen,
    vorschlaege: d.projekte?.vorschlaege.length ?? 0,
    wartet: lage.brauchtDich.filter((h) => h.art === "notaus" || h.art === "freigabe" || h.art === "rueckfrage" || h.art === "warnung").map((h) => h.text),
  };
}

const terminZeile = (e: CalendarEvent) => `• ${e.allDay ? "ganztägig" : clock(e.start)} ${e.title}${e.location ? `, ${e.location}` : ""}`;

function liste<T>(dinge: T[], zeile: (x: T) => string): string {
  const zeilen = dinge.slice(0, MAX_ZEILEN).map(zeile);
  if (dinge.length > MAX_ZEILEN) zeilen.push(`• und ${dinge.length - MAX_ZEILEN} weitere`);
  return zeilen.join("\n");
}

// Der Tagesabschluss als Nachricht aufs Handy. handel: der Satz zum Spielgeld-Desk, falls er läuft.
// maerkte: der Absatz zu starken Bewegungen am Markt (src/lib/marktlage.ts), leer an einem ruhigen Tag.
export function abschlussNachricht(a: Abschluss, o: { name: string; namen: boolean; handel?: string; maerkte?: string }): string {
  const teileDerNachricht: string[] = [`Feierabend, ${o.name}. Dein Tag in Kürze:`];

  const erledigt = a.erledigt > 0 ? `${zahl(a.erledigt, "eine Aufgabe", "Aufgaben")} erledigt` : "";
  const liegt = a.ueberfaellig > 0 ? `${zahl(a.ueberfaellig, "eine Aufgabe ist", "Aufgaben sind")} überfällig` : "";
  if (a.offenHeute.length > 0) {
    const kopf = [erledigt, `${zahl(a.offenHeute.length, "eine von heute ist", "von heute sind")} offen geblieben`, liegt].filter(Boolean).join(", ");
    teileDerNachricht.push(`Heute: ${kopf}.\n${liste(a.offenHeute, (t) => `• ${t.text}`)}`);
  } else {
    const kopf = [erledigt, liegt].filter(Boolean).join(", ");
    teileDerNachricht.push(kopf ? `Heute: ${kopf}. Von heute ist nichts offen geblieben.` : "Heute: Von den Aufgaben ist nichts offen geblieben.");
  }

  if (a.kalenderProblem) teileDerNachricht.push(`Kalender: ${a.kalenderProblem}`);
  else if (a.termineMorgen) {
    if (a.termineMorgen.length) teileDerNachricht.push(`Morgen im Kalender:\n${liste(a.termineMorgen, terminZeile)}${a.outlookMorgen > 0 ? `\n• ${outlookSatz(a.outlookMorgen)}` : ""}`);
    else teileDerNachricht.push(a.outlookMorgen > 0 ? `Morgen steht nur Outlook im Kalender: ${outlookSatz(a.outlookMorgen, true)}.` : "Morgen ist dein Kalender frei.");
    if (a.outlookLuecke) teileDerNachricht[teileDerNachricht.length - 1] += `\n${a.outlookLuecke}`;
  }
  if (a.aufgabenMorgen.length > 0) teileDerNachricht.push(`Morgen fällig:\n${liste(a.aufgabenMorgen, (t) => `• ${t.text}`)}`);

  const projekte = [...a.projekteOffen, ...a.fristenMorgen];
  if (projekte.length > 0 || a.vorschlaege > 0) {
    const zeilen: string[] = [];
    if (projekte.length > 0) {
      const { offen, geheim } = teile(projekte);
      if (o.namen) {
        const l = offen.slice(0, MAX_ZEILEN).map((h) => `• ${h.name}: ${h.grund}`);
        if (offen.length > MAX_ZEILEN) l.push(`• und ${zahl(offen.length - MAX_ZEILEN, "ein weiteres", "weitere")}`);
        if (geheim > 0) l.push(`• ${zahl(geheim, "ein vertrauliches Projekt", "vertrauliche Projekte")}: Einzelheiten nur am Mac`);
        zeilen.push(`Projekte:\n${l.join("\n")}`);
      } else {
        const heute = a.projekteOffen.length;
        const dann = a.fristenMorgen.length;
        const stuecke = [heute > 0 ? `${zahl(heute, "eines hat", "haben")} Überfälliges oder eine Frist von heute` : "", dann > 0 ? `bei ${dann === 1 ? "einem" : dann} ist morgen etwas fällig` : ""].filter(Boolean);
        zeilen.push(`Projekte: ${gross(stuecke.join(", "))}. Einzelheiten am Mac unter „Heute“.`);
      }
    }
    if (a.vorschlaege > 0) zeilen.push(`${zahl(a.vorschlaege, "Ein Vorschlag fürs Projektgedächtnis wartet", "Vorschläge fürs Projektgedächtnis warten")} am Mac auf deine Bestätigung.`);
    teileDerNachricht.push(zeilen.join("\n"));
  }

  if (a.wartet.length > 0) teileDerNachricht.push(`Wartet noch auf dich:\n${a.wartet.map((t) => `• ${t}`).join("\n")}`);
  if (o.maerkte) teileDerNachricht.push(o.maerkte);
  if (o.handel) teileDerNachricht.push(o.handel);
  return teileDerNachricht.join("\n\n");
}

// Der Tagesabschluss als gesprochener Text am Mac: kurz, ohne Listen.
export function abschlussSatz(a: Abschluss, name: string): string {
  const saetze: string[] = [`Feierabend, ${name}.`];
  const heute = [
    a.erledigt > 0 ? `${zahl(a.erledigt, "eine Aufgabe", "Aufgaben")} erledigt` : "",
    a.offenHeute.length > 0 ? `${zahl(a.offenHeute.length, "eine von heute ist", "von heute sind")} offen geblieben` : "",
    a.ueberfaellig > 0 ? `${zahl(a.ueberfaellig, "eine ist", "sind")} überfällig` : "",
  ].filter(Boolean);
  saetze.push(heute.length ? `Heute: ${heute.join(", ")}.` : "Von den Aufgaben ist heute nichts offen geblieben.");

  if (a.kalenderProblem) saetze.push(a.kalenderProblem);
  else if (a.termineMorgen) {
    const mitZeit = a.termineMorgen.find((e) => !e.allDay);
    if (a.termineMorgen.length === 0) saetze.push(a.outlookMorgen > 0 ? `Morgen steht nur Outlook im Kalender: ${outlookSatz(a.outlookMorgen, true)}.` : "Morgen ist dein Kalender frei.");
    else saetze.push(`Morgen hast du ${zahl(a.termineMorgen.length, "einen Termin", "Termine")}${mitZeit ? `, ${a.termineMorgen.length === 1 ? "" : "der erste "}um ${clock(mitZeit.start)} Uhr: ${mitZeit.title}` : `: ${a.termineMorgen[0].title}`}.${a.outlookMorgen > 0 ? ` ${outlookSatz(a.outlookMorgen)}` : ""}`);
    if (a.outlookLuecke) saetze.push(a.outlookLuecke);
  }
  if (a.aufgabenMorgen.length > 0) saetze.push(`${zahl(a.aufgabenMorgen.length, "Eine Aufgabe ist", "Aufgaben sind")} morgen fällig.`);

  saetze.push(...projektSaetze([...a.projekteOffen, ...a.fristenMorgen], a.vorschlaege));
  saetze.push(...a.wartet);
  return saetze.join(" ");
}

// Ist eine tägliche Meldung jetzt dran? Sie kommt auch, wenn der Mac zur eingestellten Zeit kurz geschlafen hat,
// aber nur am selben Tag und höchstens fensterMs später.
export function istFaellig(uhrzeit: string | null, now: Date, zuletztAm: string | null, fensterMs: number): boolean {
  if (!uhrzeit || zuletztAm === isoDate(now)) return false;
  const [h, m] = uhrzeit.split(":").map(Number);
  const soll = new Date(now);
  soll.setHours(h, m, 0, 0);
  const spaet = now.getTime() - soll.getTime();
  return spaet >= 0 && spaet < fensterMs;
}
