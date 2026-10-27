import { addDays, findDate, isoDate, spokenDay, spokenDue } from "./dates";
import { formatEur, formatPct } from "./format";
import { importantMails, type MailItem, type MailSnapshot } from "./mail";
import type { MarketSnapshot } from "./market";
import { SAFETY, type DeskSnapshot } from "./paper";
import { dateOf, dueSoon, type Task, type TasksSnapshot } from "./tasks";
import type { WeatherSnapshot } from "./weather";

// Feste Regeln für Befehle, die JARVIS sofort und ohne Internet versteht. Was keine Regel versteht,
// beantwortet das KI-Gehirn (src/lib/server/brain.ts), sobald ein Claude-Schlüssel eingetragen ist.
// Jeder Befehl ist eine Regel: passende Wörter -> Antwort, und optional eine Ansicht, die sich öffnet,
// eine Änderung (Aufgabe abhaken, Mail als gelesen markieren) und eine Besprechung, die weiterläuft.

// Eine Besprechung: JARVIS geht Mails oder Aufgaben Punkt für Punkt mit dir durch.
export type Session =
  | { kind: "post"; ids: number[]; index: number; then?: "aufgaben"; done: number }
  | { kind: "aufgaben"; ids: string[]; index: number; done: number };

export type Effect =
  | { type: "completeTask"; task: Task }
  | { type: "rescheduleTask"; task: Task; date: string }
  | { type: "addTask"; text: string; due?: string; important?: boolean }
  | { type: "addNote"; text: string }
  | { type: "markSeen"; uid: number }
  | { type: "readMail"; uid: number }
  | { type: "desk"; action: "start" | "pause" | "weiter" | "notaus" };

export type Decision = {
  // Gesprochen, nachdem die Änderung geklappt hat. Bei „Mail vorlesen“ folgt direkt der Text der Mail.
  reply: string;
  // Danach als eigener Satz, zum Beispiel der nächste Punkt der Besprechung.
  after?: string;
  effect?: Effect;
  navigate?: string;
  // undefined: Besprechung bleibt wie sie ist; null: Besprechung endet.
  session?: Session | null;
};

export type CommandContext = {
  name: string;
  now: Date;
  market: MarketSnapshot | null;
  weather: WeatherSnapshot | null;
  tasks: TasksSnapshot | null;
  mail: MailSnapshot | null;
  desk: DeskSnapshot | null;
  session: Session | null;
};

const has = (text: string, re: RegExp) => re.test(text);
const today = (ctx: CommandContext) => isoDate(ctx.now);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Sätze ----------

const dollars = (n: number) => `${Math.round(n).toLocaleString("de-DE")} Dollar`;
const spokenPct = (n: number) => `${n >= 0 ? "plus" : "minus"} ${Math.abs(n).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Prozent`;

// Wie der Spielgeld-Handel steht. `short` ist die Fassung fürs Briefing.
const count = (n: number, one: string, many: string) => (n === 1 ? `einen ${one}` : `${n} ${many}`);

export function deskSentence(desk: DeskSnapshot | null, short = false): string {
  if (!desk) return short ? "" : "Die Daten vom Trading-Desk laden noch.";
  if (desk.status === "aus") return short ? "" : "Der Spielgeld-Handel ist noch nicht gestartet. Sag: starte den Handel, oder drück auf dem Trading-Desk auf Start.";
  const day = `Tag ${Math.min(desk.testDay, SAFETY.testDays)} von ${SAFETY.testDays}`;
  const state = desk.status === "laeuft" ? "" : desk.status === "notaus" ? " Achtung, der Not-Aus ist aktiv." : desk.status === "pausiert" ? " Er ist pausiert." : " Das Tageslimit ist erreicht, heute kauft er nichts mehr.";
  if (short) return `Der Spielgeld-Handel steht bei ${spokenPct(desk.pnlPct)}, ${day}.${state}`;
  const open = desk.positions.length === 0 ? "Gerade ist nichts gekauft." : desk.positions.length === 1 ? "Eine Position ist offen." : `${desk.positions.length} Positionen sind offen.`;
  return `Das Spielgeld-Konto steht bei ${dollars(desk.equity)}, ${spokenPct(desk.pnlPct)} seit dem Start, ${day}. ${open} Der Crawler hat ${count(desk.stats.killed, "Coin", "Coins")} aussortiert und ${count(desk.stats.rugsStopped, "Rug", "Rugs")} gestoppt.${state}`;
}

function timeSentence(now: Date): string {
  return `Es ist ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.`;
}

function weatherSentence(w: WeatherSnapshot | null): string {
  if (!w) return "Die Wetterdaten laden noch.";
  const demo = w.source === "demo" ? " Achtung, das sind Beispieldaten, ich habe gerade keine Verbindung." : "";
  const tomorrow = w.days[1] ? ` Morgen ${Math.round(w.days[1].min)} bis ${Math.round(w.days[1].max)} Grad, ${w.days[1].description}.` : "";
  return `In ${w.place} hat es ${Math.round(w.temperature)} Grad, gefühlt ${Math.round(w.feelsLike)}, ${w.description}.${tomorrow}${demo}`;
}

const COINS = [
  { symbol: "BTC", words: /bitcoin|btc/ },
  { symbol: "ETH", words: /ethereum|eth\b|ether\b/ },
  { symbol: "SOL", words: /solana|sol\b/ },
];

function priceSentence(market: MarketSnapshot | null, symbols: string[]): string {
  if (!market) return "Die Kurse laden noch.";
  const parts = market.majors.quotes
    .filter((q) => symbols.includes(q.symbol))
    .map((q) => `${q.name} steht bei ${formatEur(q.eur)}, ${formatPct(q.change24h)} in 24 Stunden`);
  const demo = market.majors.source === "demo" ? " Das sind Beispieldaten, ich habe gerade keine Verbindung." : "";
  return `${parts.join(". ")}.${demo}`;
}

function scanSentence(market: MarketSnapshot | null): string {
  if (!market) return "Der Scanner lädt noch.";
  const passed = market.scan.candidates.filter((c) => c.passed);
  const best = passed[0] ? ` Am stärksten gehandelt wird gerade ${passed[0].symbol}.` : "";
  return `Ich habe ${market.scan.scanned} neue Solana-Coins gescannt. ${passed.length} bestehen die harten Filter.${best}`;
}

function mailSentence(mail: MailSnapshot | null): string {
  if (!mail) return "Dein Postfach lädt noch.";
  if (!mail.configured) return "Dein Postfach ist noch nicht verbunden.";
  if (mail.error) return `Ich komme gerade nicht an dein Postfach. ${mail.error}`;
  const n = mail.importantUnread;
  const main = n === 0 ? "Du hast keine neuen wichtigen Mails" : n === 1 ? "Du hast eine neue wichtige Mail" : `Du hast ${n} neue wichtige Mails`;
  const bulk = mail.bulkUnread > 0 ? `, dazu ${mail.bulkUnread} Newsletter und Benachrichtigungen, die ich erst mal beiseitelege` : "";
  return `${main}${bulk}.`;
}

function taskSentence(tasks: TasksSnapshot | null, day: string): string {
  if (!tasks) return "Deine Aufgaben laden noch.";
  if (!tasks.configured) return "Obsidian ist noch nicht verbunden.";
  if (tasks.error) return tasks.error;
  const soon = dueSoon(tasks.tasks, day);
  if (soon.length === 0) return "Bis nächste Woche ist keine Aufgabe fällig.";
  const overdue = soon.filter((t) => dateOf(t)! < day).length;
  const main = soon.length === 1 ? "Bis nächste Woche muss noch ein Punkt erledigt werden" : `Bis nächste Woche müssen noch ${soon.length} Punkte erledigt werden`;
  const late = overdue === 0 ? "" : overdue === 1 ? ", einer davon ist überfällig" : `, ${overdue} davon sind überfällig`;
  return `${main}${late}.`;
}

function sender(m: MailItem): string {
  if (m.from && m.from !== m.fromAddress) return m.from;
  return m.fromAddress.split("@")[1] ?? m.fromAddress;
}

// ---------- Besprechung ----------

const findTask = (ctx: CommandContext, id: string) => ctx.tasks?.tasks.find((t) => t.id === id);
const findMail = (ctx: CommandContext, uid: number) => ctx.mail?.items.find((m) => m.uid === uid);

function taskPrompt(ctx: CommandContext, s: Extract<Session, { kind: "aufgaben" }>): string {
  const task = findTask(ctx, s.ids[s.index]);
  if (!task) return "";
  const d = dateOf(task);
  const when = d ? `, ${spokenDue(d, today(ctx))}` : "";
  const flag = task.important ? " Das ist als wichtig markiert." : "";
  const options = s.index === 0 ? " Sag erledigt, verschieben auf einen Tag, oder weiter." : " Erledigt, verschieben oder weiter?";
  const which = s.ids.length === 1 ? "Ein Punkt" : `Punkt ${s.index + 1} von ${s.ids.length}`;
  return `${which}: ${task.text}${when}.${flag}${options}`;
}

function mailPrompt(ctx: CommandContext, s: Extract<Session, { kind: "post" }>): string {
  const m = findMail(ctx, s.ids[s.index]);
  if (!m) return "";
  const options =
    s.index === 0 ? " Ich kann sie vorlesen, eine Aufgabe daraus machen oder sie als gelesen markieren. Oder wir gehen weiter." : " Vorlesen, Aufgabe, gelesen oder weiter?";
  const which = s.ids.length === 1 ? "Die Mail ist" : `Mail ${s.index + 1} von ${s.ids.length},`;
  const subject = /[.!?]$/.test(m.subject) ? m.subject : `${m.subject}.`;
  return `${which} von ${sender(m)}. Betreff: ${subject}${options}`;
}

function prompt(ctx: CommandContext, s: Session): string {
  return s.kind === "aufgaben" ? taskPrompt(ctx, s) : mailPrompt(ctx, s);
}

function startTasks(ctx: CommandContext, intro: string): Decision {
  const soon = dueSoon(ctx.tasks?.tasks ?? [], today(ctx));
  if (soon.length === 0) return { reply: `${intro} Bis nächste Woche ist nichts fällig.`.trim(), navigate: "/aufgaben", session: null };
  const session: Session = { kind: "aufgaben", ids: soon.map((t) => t.id), index: 0, done: 0 };
  return { reply: intro, after: taskPrompt({ ...ctx, session }, session), navigate: "/aufgaben", session };
}

function startMail(ctx: CommandContext, intro: string, then?: "aufgaben"): Decision {
  const mails = importantMails(ctx.mail).filter((m) => m.unread);
  if (mails.length === 0) return { reply: intro, navigate: "/post", session: null };
  const session: Session = { kind: "post", ids: mails.map((m) => m.uid), index: 0, then, done: 0 };
  return { reply: intro, after: mailPrompt({ ...ctx, session }, session), navigate: "/post", session };
}

// Zum nächsten Punkt, der noch da ist. Am Ende: abschließen oder von den Mails zu den Aufgaben wechseln.
function advance(ctx: CommandContext, s: Session, prefix: string, step = 1): Decision {
  let index = s.index + step;
  const exists = (i: number) => (s.kind === "aufgaben" ? Boolean(findTask(ctx, s.ids[i])) : Boolean(findMail(ctx, s.ids[i])));
  while (index >= 0 && index < s.ids.length && !exists(index)) index += step < 0 ? -1 : 1;
  if (index < 0) return { reply: `${prefix} Das ist schon der erste Punkt.`.trim(), after: prompt(ctx, s) };
  if (index < s.ids.length) {
    const next = { ...s, index } as Session;
    return { reply: prefix, after: prompt(ctx, next), session: next };
  }
  if (s.kind === "post") {
    const done = "Das waren alle wichtigen Mails.";
    if (s.then === "aufgaben" && dueSoon(ctx.tasks?.tasks ?? [], today(ctx)).length > 0) return startTasks(ctx, `${prefix} ${done} Jetzt zu deinen Aufgaben.`.trim());
    return { reply: `${prefix} ${done}`.trim(), session: null };
  }
  const tally = s.done === 0 ? "" : s.done === 1 ? " Einen Punkt hast du abgehakt." : ` ${s.done} Punkte hast du abgehakt.`;
  return { reply: `${prefix} Das waren alle Punkte.${tally} Gute Arbeit, ${ctx.name}.`.trim(), session: null };
}

const END = /\b(stopp?|beenden|beende|abbrechen|schluss|genug|pause)\b|das war'?s|später weiter|hör auf/;
const NEXT = /\b(weiter|nächste[rns]?|überspring\w*|skip|lass(en)? wir)\b/;
const BACK = /\b(zurück|vorherige[rns]?|davor)\b/;
const REPEAT = /\b(wiederhol\w*|nochmal|noch mal|wie bitte)\b/;

function sessionCommand(ctx: CommandContext, s: Session, text: string): Decision | null {
  if (has(text, END)) return { reply: "Gut, wir machen später weiter. Sag einfach Briefing, wenn du wieder magst.", session: null };
  if (has(text, REPEAT)) return { reply: prompt(ctx, s) };
  if (has(text, BACK)) return advance(ctx, s, "", -1);

  if (s.kind === "aufgaben") {
    const task = findTask(ctx, s.ids[s.index]);
    if (!task) return advance(ctx, s, "");
    if (has(text, /erledigt|abhaken|abgehakt|gemacht|haken dran|ist durch|\bdone\b|geschafft/)) {
      if (task.recurring) return { reply: "Das ist eine wiederkehrende Aufgabe. Die hakst du bitte in Obsidian ab, damit der nächste Termin entsteht.", after: prompt(ctx, s) };
      const decision = advance(ctx, { ...s, done: s.done + 1 }, "Erledigt, abgehakt.");
      return { ...decision, effect: { type: "completeTask", task } };
    }
    if (has(text, /verschieb|vertag|später|auf (morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|nächste)/)) {
      const date = findDate(text, today(ctx))?.iso ?? addDays(today(ctx), 1);
      const decision = advance(ctx, s, `Verschoben auf ${spokenDay(date, today(ctx))}.`);
      return { ...decision, effect: { type: "rescheduleTask", task, date } };
    }
    if (has(text, NEXT)) return advance(ctx, s, "");
    return null;
  }

  const mail = findMail(ctx, s.ids[s.index]);
  if (!mail) return advance(ctx, s, "");
  if (has(text, /vorles|\blies\b|lesen|was schreibt|worum geht|inhalt/)) {
    return { reply: `${sender(mail)} schreibt:`, effect: { type: "readMail", uid: mail.uid }, after: "Soll ich daraus eine Aufgabe machen, oder gehen wir weiter?" };
  }
  if (has(text, /aufgabe\b|notier|to-?do|erinner|antworten|beantworten|^ja\b|mach das|gerne/)) {
    const date = findDate(text, today(ctx))?.iso ?? addDays(today(ctx), 1);
    const decision = advance(ctx, { ...s, done: s.done + 1 }, `Notiert: ${sender(mail)} antworten, bis ${spokenDay(date, today(ctx))}.`);
    return { ...decision, effect: { type: "addTask", text: `${sender(mail)} antworten: ${mail.subject}`, due: date } };
  }
  if (has(text, /gelesen|erledigt|ignorier|unwichtig|weg damit/)) {
    const decision = advance(ctx, s, "Als gelesen markiert.");
    return { ...decision, effect: { type: "markSeen", uid: mail.uid } };
  }
  if (has(text, NEXT)) return advance(ctx, s, "");
  return null;
}

// ---------- Aufgaben und Notizen per Zuruf ----------

const ADD_TASK = /^(bitte )?(notiere? dir|notiere?|schreibe? (mir )?auf|neue aufgabe|aufgabe|to-?do|erinnere? mich)\b[:,]?\s*/i;
const ADD_NOTE = /^(bitte )?(merke? dir|notiz)\b[:,]?\s*/i;

function taskFromSpeech(input: string, day: string): { text: string; due?: string; important: boolean } {
  let text = input.replace(ADD_TASK, "");
  const important = /\b(wichtig|dringend)\b/i.test(text);
  text = text.replace(/\b(ist )?(wichtig|dringend)\b/gi, "");
  const date = findDate(text, day);
  if (date) text = text.replace(date.match, " ");
  text = text
    .replace(/^\s*(daran,?\s*)?(dass |zu |an (den |die |das |dem |der )?)?/i, "")
    .replace(/\s+/g, " ")
    .replace(/[\s,.;:!-]+$/, "")
    .trim();
  return { text: capitalize(text), due: date?.iso, important };
}

// ---------- Regeln ----------

type Rule = { match: RegExp; run: (ctx: CommandContext, text: string, original: string) => Decision };

// Der Not-Aus gilt immer sofort, egal wie lang der Satz ist.
const EMERGENCY: Rule = {
  match: /not-?aus|stopp? alles|alles stoppen/,
  run: (ctx) => {
    if (ctx.desk?.status === "aus") return { reply: "Der Spielgeld-Handel läuft gar nicht, es gibt nichts zu stoppen." };
    if (ctx.desk?.status === "notaus") return { reply: "Der Not-Aus ist schon aktiv. Alle Agenten stehen.", navigate: "/trading" };
    return { reply: "Not-Aus. Alle Agenten stehen.", effect: { type: "desk", action: "notaus" }, navigate: "/trading" };
  },
};

const RULES: Rule[] = [
  {
    match: ADD_TASK,
    run: (ctx, _text, original) => {
      if (!ctx.tasks?.configured) return { reply: "Dafür brauche ich zuerst deinen Obsidian-Tresor. Ich öffne die Einstellungen.", navigate: "/einstellungen" };
      const task = taskFromSpeech(original, today(ctx));
      if (!task.text) return { reply: "Was soll ich notieren? Sag zum Beispiel: Notiere Rechnung an Max schicken bis Freitag." };
      const when = task.due ? `, ${spokenDue(task.due, today(ctx))}` : "";
      return { reply: `Notiert: ${task.text}${when}.`, effect: { type: "addTask", ...task } };
    },
  },
  {
    match: ADD_NOTE,
    run: (ctx, _text, original) => {
      if (!ctx.tasks?.configured) return { reply: "Dafür brauche ich zuerst deinen Obsidian-Tresor. Ich öffne die Einstellungen.", navigate: "/einstellungen" };
      const note = original.replace(ADD_NOTE, "").trim();
      if (!note) return { reply: "Was soll ich mir merken?" };
      return { reply: "Gemerkt. Es steht in deinen JARVIS-Notizen in Obsidian.", effect: { type: "addNote", text: capitalize(note) } };
    },
  },
  {
    match: /\b(fokus|nur (dich|jarvis)|zeig dich)\b/,
    run: () => ({ reply: "Ich bin ganz bei dir.", navigate: "/fokus" }),
  },
  {
    match: /übersicht|alle module|zeig (mir )?alle|alles zeigen|kommandozentrale|startseite/,
    run: () => ({ reply: "Hier ist die Übersicht mit allen Modulen.", navigate: "/" }),
  },
  {
    match: /einstellung/,
    run: () => ({ reply: "Ich öffne die Einstellungen.", navigate: "/einstellungen" }),
  },
  {
    match: /\bagenten\b|\bmodule\b/,
    run: () => ({ reply: "Hier sind alle meine Agenten und was sie können.", navigate: "/agenten" }),
  },
  {
    match: /guten morgen|guten tag|guten abend|\bhallo\b|\bhey\b|\bservus\b|briefing|was steht an|was gibt.{0,3} neues|\blage\b|lagebericht/,
    run: (ctx) => {
      const hour = ctx.now.getHours();
      const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
      const w = ctx.weather ? `Draußen hat es ${Math.round(ctx.weather.temperature)} Grad, ${ctx.weather.description}.` : "";
      const intro = [`${greeting}, ${ctx.name}.`, w, mailSentence(ctx.mail), taskSentence(ctx.tasks, today(ctx)), deskSentence(ctx.desk, true)].filter(Boolean).join(" ");
      const mails = ctx.mail?.configured && !ctx.mail.error ? ctx.mail.importantUnread : 0;
      const tasks = ctx.tasks?.configured ? dueSoon(ctx.tasks.tasks, today(ctx)).length : 0;
      if (mails > 0) return startMail(ctx, `${intro} Fangen wir mit den Mails an.`, "aufgaben");
      if (tasks > 0) return startTasks(ctx, `${intro} Gehen wir die Punkte durch.`);
      const setup = !ctx.mail?.configured || !ctx.tasks?.configured ? " In den Einstellungen verbindest du dein Postfach und Obsidian, dann sage ich dir hier jeden Morgen, was ansteht." : " Es liegt nichts Dringendes an.";
      return { reply: `${intro}${setup}` };
    },
  },
  {
    match: /\b(e-?)?mails?\b|\bpost\b|posteingang|nachrichten/,
    run: (ctx) => {
      if (!ctx.mail?.configured) return { reply: "Dein Postfach ist noch nicht verbunden. In der Post-Ansicht geht das in einer Minute.", navigate: "/post" };
      if (ctx.mail.error) return { reply: mailSentence(ctx.mail), navigate: "/post" };
      return startMail(ctx, mailSentence(ctx.mail));
    },
  },
  {
    match: /aufgaben|to-?dos?|was muss ich|erledigen|fällig|fristen/,
    run: (ctx) => {
      if (!ctx.tasks?.configured) return { reply: "Obsidian ist noch nicht verbunden. In der Aufgaben-Ansicht geht das mit einem Klick.", navigate: "/aufgaben" };
      return startTasks(ctx, taskSentence(ctx.tasks, today(ctx)));
    },
  },
  {
    match: /(start|beginn).{0,20}(handel|trading|spielgeld)|(handel|trading).{0,12}(starten|beginnen)/,
    run: (ctx) =>
      ctx.desk && ctx.desk.status !== "aus"
        ? { reply: `Der Handel ist schon gestartet. ${deskSentence(ctx.desk)}`, navigate: "/trading" }
        : { reply: `Gestartet. Die Agenten handeln jetzt mit ${dollars(SAFETY.startCapitalUsd)} Spielgeld, die Testzeit läuft ${SAFETY.testDays} Tage.`, effect: { type: "desk", action: "start" }, navigate: "/trading" },
  },
  {
    match: /(pausier|anhalten|pause|stopp?e?\b).{0,20}(handel|trading)|(handel|trading).{0,12}(pausieren|anhalten|stoppen)/,
    run: () => ({ reply: "Pausiert. Ich kaufe nichts Neues, passe aber weiter auf die offenen Positionen auf.", effect: { type: "desk", action: "pause" } }),
  },
  {
    match: /(handel|trading).{0,12}(fortsetzen|weiter)|weiter handeln/,
    run: () => ({ reply: "Die Agenten laufen wieder.", effect: { type: "desk", action: "weiter" } }),
  },
  {
    match: /(wie (läuft|steht|geht)).{0,20}(handel|trading|desk|spielgeld|konto)|spielgeld|handelsbericht|kontostand/,
    run: (ctx) => ({ reply: deskSentence(ctx.desk), navigate: "/trading" }),
  },
  {
    match: /trading|desk|handel/,
    run: () => ({ reply: "Ich öffne den Trading-Desk.", navigate: "/trading" }),
  },
  {
    match: /meme|scan|\bcoins?\b|krypto-?markt/,
    run: (ctx) => ({ reply: scanSentence(ctx.market) }),
  },
  {
    match: /bitcoin|btc|ethereum|eth\b|solana|sol\b|kurs|preis/,
    run: (ctx, text) => {
      const asked = COINS.filter((c) => c.words.test(text)).map((c) => c.symbol);
      return { reply: priceSentence(ctx.market, asked.length ? asked : ["BTC", "ETH", "SOL"]) };
    },
  },
  {
    match: /wetter|temperatur|regen|grad\b/,
    run: (ctx) => ({ reply: weatherSentence(ctx.weather) }),
  },
  {
    match: /\buhr\b|uhrzeit|wie spät/,
    run: (ctx) => ({ reply: timeSentence(ctx.now) }),
  },
  {
    match: /anruf|telefon|ruf .* an/,
    run: () => ({ reply: "Telefonieren lerne ich in einer späteren Phase. Dafür bekomme ich eine eigene Telefonnummer.", navigate: "/agenten#telefon" }),
  },
  {
    match: /kalender|termin/,
    run: () => ({ reply: "Den Kalender verbinde ich in Phase 4. Fristen kannst du schon jetzt als Aufgaben mit Datum notieren.", navigate: "/agenten#kalender" }),
  },
  {
    match: /such|recherch|finde/,
    run: () => ({ reply: "Selbstständig im Web suchen kann ich, sobald der Browser-Agent fertig ist.", navigate: "/agenten#browser" }),
  },
];

// Mit KI-Gehirn (brain) greifen die Regeln nur bei kurzen Befehlen bis vier Wörter und bei den Antworten
// in einer Besprechung; längere Sätze versteht Claude besser. null heißt: frag das KI-Gehirn.
export function decide(input: string, ctx: CommandContext, brain = false): Decision | null {
  const original = input.trim().replace(/[.!?]+$/, "");
  const text = original.toLowerCase();
  // Der Not-Aus geht vor, auch mitten in einer Besprechung; die endet dann.
  if (EMERGENCY.match.test(text)) return { ...EMERGENCY.run(ctx, text, original), ...(ctx.session ? { session: null } : {}) };
  if (ctx.session) {
    const inSession = sessionCommand(ctx, ctx.session, text);
    if (inSession) return inSession;
  }
  const short = original.split(/\s+/).length <= 4;
  const rule = RULES.find((r) => r.match.test(text));
  if (rule && (!brain || short)) return rule.run(ctx, text, original);
  if (brain) return null;
  if (ctx.session) {
    const hint = ctx.session.kind === "aufgaben" ? "Sag erledigt, verschieben auf einen Tag, weiter oder beenden." : "Sag vorlesen, Aufgabe, gelesen, weiter oder beenden.";
    return { reply: `Das habe ich nicht verstanden. ${hint}` };
  }
  return {
    reply:
      "Das verstehe ich noch nicht. Sag zum Beispiel Briefing, meine Mails, meine Aufgaben, notiere etwas bis Freitag, oder frag nach Wetter und Kursen. Freie Sätze verstehe ich, sobald in den Einstellungen das KI-Gehirn eingerichtet ist.",
  };
}

// Was nur die Seite weiß (Wetter, Kurse), als Lagezeilen für das KI-Gehirn.
export function situation(ctx: CommandContext): string[] {
  return [`Wetter: ${weatherSentence(ctx.weather)}`, `Kurse: ${priceSentence(ctx.market, ["BTC", "ETH", "SOL"])}`];
}

// Startet eine Besprechung, wenn das KI-Gehirn sie vorschlägt. Seine Antwort ist die Einleitung.
export function startSession(ctx: CommandContext, kind: Session["kind"], intro: string): Decision {
  return kind === "post" ? startMail(ctx, intro) : startTasks(ctx, intro);
}

// Für die Besprechung einer einzelnen Aufgabe oder Mail, die du in der Liste anklickst.
export function discuss(ctx: CommandContext, kind: Session["kind"], id: string | number): Decision {
  if (kind === "aufgaben") {
    const soon = dueSoon(ctx.tasks?.tasks ?? [], today(ctx)).map((t) => t.id);
    const ids = soon.includes(String(id)) ? soon : [String(id)];
    const session: Session = { kind, ids, index: ids.indexOf(String(id)), done: 0 };
    return { reply: "", after: prompt(ctx, session), session };
  }
  const all = importantMails(ctx.mail).filter((m) => m.unread).map((m) => m.uid);
  const ids = all.includes(Number(id)) ? all : [Number(id)];
  const session: Session = { kind, ids, index: ids.indexOf(Number(id)), done: 0 };
  return { reply: "", after: prompt(ctx, session), session };
}

// Was in der Übersicht und im Fokus unter JARVIS steht.
export function headline(ctx: CommandContext): string[] {
  return [mailSentence(ctx.mail), taskSentence(ctx.tasks, today(ctx))];
}
