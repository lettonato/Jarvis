// Datumsangaben, wie man sie spricht: „morgen“, „bis Freitag“, „in drei Tagen“, „am 5. November“.
// Alle Daten sind Kalendertage in Ortszeit im Format JJJJ-MM-TT, so wie Obsidian sie speichert.

const WEEKDAYS = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
const MONTHS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
const NUMBERS: Record<string, number> = {
  ein: 1, eine: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
};

export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((fromIso(to).getTime() - fromIso(from).getTime()) / 86_400_000);
}

// Der nächste Wochentag nach heute (1 bis 7 Tage später).
function nextWeekday(today: string, weekday: number): string {
  const diff = (weekday - fromIso(today).getDay() + 7) % 7 || 7;
  return addDays(today, diff);
}

const amount = (word: string) => NUMBERS[word] ?? Number(word);

type Pattern = { re: RegExp; date: (m: RegExpMatchArray, today: string) => string | null };

// Wortgrenzen, die auch Umlaute kennen (\b in JavaScript sieht „ü“ nicht als Buchstaben).
const word = (src: string) => new RegExp(`(?<![\\p{L}\\d])(?:${src})(?![\\p{L}\\d])`, "u");

const PATTERNS: Pattern[] = [
  { re: word("übermorgen"), date: (_, t) => addDays(t, 2) },
  { re: word("(?<!guten )morgen"), date: (_, t) => addDays(t, 1) },
  { re: word("heute"), date: (_, t) => t },
  { re: word("übernächste[nr]? woche"), date: (_, t) => addDays(nextWeekday(t, 1), 7) },
  { re: word("nächste[nr]? woche"), date: (_, t) => nextWeekday(t, 1) },
  { re: word("ende (?:der|dieser) woche"), date: (_, t) => (fromIso(t).getDay() === 5 ? t : nextWeekday(t, 5)) },
  { re: word("wochenende"), date: (_, t) => nextWeekday(t, 6) },
  {
    re: word(`in (\\d+|${Object.keys(NUMBERS).join("|")}) (tag|tagen|woche|wochen|monat|monaten)`),
    date: (m, t) => {
      const n = amount(m[1]);
      if (m[2].startsWith("tag")) return addDays(t, n);
      if (m[2].startsWith("woche")) return addDays(t, 7 * n);
      const d = fromIso(t);
      d.setMonth(d.getMonth() + n);
      return isoDate(d);
    },
  },
  {
    re: word(`(\\d{1,2})\\.? (${MONTHS.join("|")})(?: (\\d{4}))?`),
    date: (m, t) => dayMonth(Number(m[1]), MONTHS.indexOf(m[2]) + 1, m[3] ? Number(m[3]) : undefined, t),
  },
  {
    re: word("(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}|\\d{2})?"),
    date: (m, t) => dayMonth(Number(m[1]), Number(m[2]), m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : undefined, t),
  },
  {
    re: word(`(?:nächsten |kommenden )?(${WEEKDAYS.join("|")})`),
    date: (m, t) => nextWeekday(t, WEEKDAYS.indexOf(m[1])),
  },
];

// Tag und Monat ohne Jahr: liegt das Datum schon hinter uns, ist das nächste Jahr gemeint.
function dayMonth(day: number, month: number, year: number | undefined, today: string): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const t = fromIso(today);
  const d = new Date(year ?? t.getFullYear(), month - 1, day);
  if (d.getMonth() !== month - 1) return null;
  if (year === undefined && isoDate(d) < today) d.setFullYear(d.getFullYear() + 1);
  return isoDate(d);
}

// Sucht eine Datumsangabe im Satz. `match` ist der gefundene Teil samt „bis“, „am“ oder „auf“,
// damit er aus dem Aufgabentext entfernt werden kann.
export function findDate(text: string, today: string): { iso: string; match: string } | null {
  const lower = text.toLowerCase();
  for (const p of PATTERNS) {
    const m = lower.match(p.re);
    if (!m || m.index === undefined) continue;
    const iso = p.date(m, today);
    if (!iso) continue;
    const before = lower.slice(0, m.index);
    const prep = before.match(/(?:^|\s)(?:bis zum|bis spätestens|bis|am|zum|für|auf|ab|spätestens)\s*$/);
    const start = prep ? m.index - prep[0].trimStart().length : m.index;
    return { iso, match: text.slice(start, m.index + m[0].length) };
  }
  return null;
}

const LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });
const SHORT = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

// So spricht JARVIS ein Fälligkeitsdatum aus.
export function spokenDue(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff < -1) return `seit ${-diff} Tagen überfällig`;
  if (diff === -1) return "seit gestern überfällig";
  if (diff === 0) return "fällig heute";
  if (diff === 1) return "fällig morgen";
  if (diff < 7) return `fällig am ${LONG.format(fromIso(iso)).split(",")[0]}`;
  return `fällig am ${LONG.format(fromIso(iso))}`;
}

// Kurzform für die Listen: „heute“, „morgen“, „Fr., 30.10.“
export function shortDue(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "heute";
  if (diff === 1) return "morgen";
  if (diff === -1) return "gestern";
  return SHORT.format(fromIso(iso));
}

// „morgen“, „übermorgen“ oder „Montag, 26. Oktober“, passend nach „auf“ oder „bis“.
export function spokenDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "heute";
  if (diff === 1) return "morgen";
  if (diff === 2) return "übermorgen";
  return LONG.format(fromIso(iso));
}
