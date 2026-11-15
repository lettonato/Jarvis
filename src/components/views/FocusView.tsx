"use client";

import { Chips, HandsFreeSwitch, Messages, NewConversation, sessionLabel, useStateLabel } from "../Console";
import { Icon, type IconName } from "../icons";
import { useConversation, useJarvis } from "../JarvisProvider";
import { Orb } from "../Orb";
import { Scheibe, Scheiben } from "../Raum";
import { RaumLink } from "../RaumLink";
import { PageHeader } from "../ui";
import { clock, eventsOn, nextEvent } from "@/lib/calendar";
import { isoDate } from "@/lib/dates";
import { aufgabenUnlesbar, dateOf, dueSoon } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

// Gespräch: der Raum, in dem du mit JARVIS allein bist. An der Wand steht das ganze Gespräch; solange ihr noch
// nicht redet, steht dort, was gerade ansteht, und ein Klick darauf lässt ihn es mit dir durchgehen.
// Geschrieben wird wie überall unten im Feld der Leiste.

const DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

// tun: das Wort rechts in der Zeile, wenn „Einrichten“ oder „Durchgehen“ nicht passt.
type Item = { icon: IconName; text: string; ask?: string; href?: string; tun?: string; alert?: boolean };

export function FocusView() {
  const { name, tasks, mail, calendar, weather, state, session, ask, voice } = useJarvis();
  const { turns, interim } = useConversation();
  const label = useStateLabel();
  const talking = turns.length > 0 || Boolean(interim) || session !== null;
  const now = useNow();
  const today = now ? isoDate(now) : null;
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  const items: Item[] = [];
  if (calendar?.access === "offen") items.push({ icon: "kalender", text: "Kalender verbinden", href: "/kalender" });
  else if (calendar && calendar.access !== "ok" && calendar.access !== "kein-mac") items.push({ icon: "kalender", text: "Kein Zugriff auf den Kalender", href: "/kalender", alert: true });
  else if (calendar?.access === "ok" && now && today) {
    const rest = eventsOn(calendar.events, today).filter((e) => e.allDay || e.end > now.getTime());
    const next = nextEvent(calendar.events, now.getTime());
    const soon = next && isoDate(new Date(next.start)) === today ? `, als Nächstes ${clock(next.start)} ${next.title}` : "";
    items.push({ icon: "kalender", text: rest.length ? `${rest.length} ${rest.length === 1 ? "Termin" : "Termine"} heute${soon}` : "Heute keine Termine mehr", ask: "Meine Termine" });
  }
  if (mail && !mail.configured) items.push({ icon: "post", text: "Postfach verbinden", href: "/post" });
  else if (mail?.error) items.push({ icon: "post", text: "Postfach antwortet nicht", href: "/post", alert: true });
  else if (mail) {
    const n = mail.importantUnread;
    items.push({ icon: "post", text: n === 1 ? "1 neue wichtige Mail" : `${n} neue wichtige Mails`, ask: "Meine Mails", alert: n > 0 });
  }
  if (tasks && !tasks.configured) items.push({ icon: "aufgaben", text: "Obsidian verbinden", href: "/aufgaben" });
  // Ein Tresor, der sich nicht lesen lässt, ist nicht dasselbe wie „0 Punkte“.
  else if (aufgabenUnlesbar(tasks)) items.push({ icon: "aufgaben", text: "Aufgaben gerade nicht lesbar", href: "/aufgaben", tun: "Ansehen", alert: true });
  else if (tasks && today) {
    const soon = dueSoon(tasks.tasks, today);
    const overdue = soon.filter((t) => dateOf(t)! < today).length;
    items.push({
      icon: "aufgaben",
      text: `${soon.length} ${soon.length === 1 ? "Punkt" : "Punkte"} bis nächste Woche${overdue ? `, ${overdue} überfällig` : ""}`,
      ask: "Meine Aufgaben",
      alert: overdue > 0,
    });
  }
  if (weather) items.push({ icon: "wetter", text: `${Math.round(weather.temperature)} °C, ${weather.description}`, ask: "Wie ist das Wetter?" });

  const zeile = (item: Item) => (
    <>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.alert ? "bg-rot" : "bg-sonne"}`} aria-hidden />
      <span className="min-w-0 flex-1">{item.text}</span>
      <span className="shrink-0 text-sm font-bold text-see group-hover:text-schiefer">{item.tun ?? (item.href ? "Einrichten" : "Durchgehen")}</span>
    </>
  );

  return (
    <main className="flex h-full max-w-[52rem] flex-col">
      {talking ? (
        <section className="flex min-h-0 flex-1 flex-col" aria-label="Gespräch">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b-[3px] border-schiefer pb-3">
            <h1 className="min-w-0 flex-1 truncate text-[1.6rem] font-extrabold leading-none [font-stretch:66%]">{sessionLabel(session) ?? "Gespräch"}</h1>
            <NewConversation />
            <HandsFreeSwitch />
          </div>
          <Messages className="min-h-24 flex-1" />
          <div className="shrink-0 pt-2">
            <Chips onFill={(text) => ask(text)} scroll idle={false} />
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-8">
          <PageHeader title="Gespräch" subtitle={now ? `${DATE.format(now)}.` : " "} gross={now ? greeting : "Hallo"} satz={`Was brauchst du, ${name}?`} />
          <section className="border-t-[3px] border-schiefer pt-4">
            <h2 className="text-base font-bold">Was gerade ansteht</h2>
            <ul className="mt-1">
              <li className="border-b border-schiefer/15">
                <button type="button" onClick={() => ask("Briefing")} className="group flex w-full items-center gap-4 py-2.5 text-left text-[1.1rem] font-medium leading-snug">
                  <Icon name="fokus" className="h-4 w-4 shrink-0 text-see" />
                  <span className="min-w-0 flex-1">Der ganze Tag in einem Briefing</span>
                  <span className="shrink-0 text-sm font-bold text-see group-hover:text-schiefer">Starten</span>
                </button>
              </li>
              {items.map((item) => (
                <li key={item.text} className="border-b border-schiefer/15">
                  {item.href ? (
                    <RaumLink href={item.href} className="group flex items-center gap-4 py-2.5 text-[1.1rem] font-medium leading-snug">
                      {zeile(item)}
                    </RaumLink>
                  ) : (
                    <button type="button" onClick={() => ask(item.ask!)} className="group flex w-full items-center gap-4 py-2.5 text-left text-[1.1rem] font-medium leading-snug">
                      {zeile(item)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <div className="flex flex-wrap items-center gap-3 text-sm text-quiet">
            <HandsFreeSwitch />
            <span>Enter sendet. Umschalt und Enter macht eine neue Zeile. Esc hält JARVIS an.</span>
          </div>
        </div>
      )}

      <Scheiben>
        <Scheibe titel="JARVIS">
          <button
            type="button"
            onClick={voice.canListen ? voice.toggle : () => ask("Briefing")}
            aria-label={voice.canListen ? "Mit JARVIS sprechen" : "Briefing starten"}
            className="flex w-full items-center gap-4 text-left"
          >
            <Orb state={state} className="h-16 w-16" />
            <span className="min-w-0">
              <span className="block text-[1.3rem] font-bold leading-tight">{label}</span>
              <span className="block text-sm opacity-75">{voice.canListen ? "Antippen und sprechen, oder die Leertaste drücken." : "Schreib unten in das Feld."}</span>
            </span>
          </button>
        </Scheibe>
      </Scheiben>
    </main>
  );
}
