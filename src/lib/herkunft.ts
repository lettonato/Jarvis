import type { CalendarSnapshot } from "./calendar";
import type { IntelReport, IntelSnapshot } from "./intel";
import type { MailSnapshot } from "./mail";
import type { MarketSnapshot } from "./market";
import type { DeskSnapshot } from "./paper";
import type { ProjekteSnapshot } from "./projekte";

// Herkunft von Text in Antworten, die JARVIS selbst zusammensetzt, ohne das KI-Gehirn (Briefing, Besprechung
// der Post, Erinnerung an einen Termin, Nachrichten). Solche Antworten stehen im Gesprächsverlauf und gehen
// mit der nächsten freien Frage an Claude. Steht darin Text von Dritten, muss das Gespräch als „fremd
// beeinflusst“ gelten, genau wie nach einem Werkzeug, das eine Mail oder Webseite gelesen hat (R-24).
// Hier wird nichts gefiltert oder verändert, nur erkannt.

export type FremdQuellen = {
  mail: MailSnapshot | null;
  calendar?: CalendarSnapshot | null;
  intel?: IntelSnapshot | null;
  projekte?: ProjekteSnapshot | null;
  desk: DeskSnapshot | null;
  market: MarketSnapshot | null;
};

// Kürzere Texte („Re“, „Al“) kommen in jedem Satz vor und sagen nichts.
const MIN = 4;
// Antworten kürzen lange Texte ab; dann reicht der Anfang.
const ANFANG = 20;

const ausBericht = (b: IntelReport | null | undefined): (string | null | undefined)[] => (b ? [b.summary, b.deskWarning, ...b.items.flatMap((i) => [i.title, i.summary])] : []);

// Alles, was in den geladenen Daten von Dritten stammt oder stammen kann. Termine zählen dazu, weil
// Einladungen von außen kommen; Aufgaben aus Obsidian nicht, die schreibt nur der Mensch selbst.
export function fremdeTexte(q: FremdQuellen): string[] {
  const roh: (string | null | undefined)[] = [
    ...(q.mail?.items ?? []).flatMap((m) => [m.from, m.subject]),
    ...(q.calendar?.events ?? []).flatMap((e) => [e.title, e.location]),
    ...ausBericht(q.intel?.report),
    ...ausBericht(q.intel?.search),
    q.intel?.warning?.text,
    ...(q.projekte?.projekte ?? []).filter((p) => p.textVonDritten).flatMap((p) => [p.name, p.naechsteFrist?.text, p.naechsterSchritt, p.letzteEntscheidung?.text]),
    ...(q.desk?.positions ?? []).flatMap((p) => [p.symbol, p.name]),
    ...(q.market?.scan?.candidates ?? []).flatMap((c) => [c.symbol, c.name]),
  ];
  return roh.map((t) => (t ?? "").replace(/\s+/g, " ").trim().toLowerCase()).filter((t) => t.length >= MIN);
}

export function enthaeltFremdes(text: string, q: FremdQuellen): boolean {
  const satz = text.replace(/\s+/g, " ").toLowerCase();
  if (!satz.trim()) return false;
  return fremdeTexte(q).some((t) => satz.includes(t) || (t.length > ANFANG && satz.includes(t.slice(0, ANFANG))));
}
