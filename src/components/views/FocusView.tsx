"use client";

import { Chips, Composer, HandsFreeSwitch, Messages, NewConversation, sessionLabel, useDraft, useStateLabel } from "../Console";
import { HoloLink } from "../HoloLink";
import { Holo } from "../HoloView";
import { Icon, type IconName } from "../icons";
import { useConversation, useJarvis } from "../JarvisProvider";
import { Orb } from "../Orb";
import { useWorldStatus, worldAnchor } from "../world/anchor";
import { clock, eventsOn, nextEvent } from "@/lib/calendar";
import { isoDate } from "@/lib/dates";
import { dateOf, dueSoon } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

// Fokus: nur JARVIS, groß, und das Gespräch mit ihm. Oben steht, was gerade ansteht;
// ein Klick darauf, und er geht es mit dir durch. Sobald ihr redet, rückt der Kopf nach oben,
// das Gespräch füllt den Platz darunter, und das Eingabefeld bleibt unten stehen.

const DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

type Item = { icon: IconName; text: string; ask?: string; href?: string; alert?: boolean };

export function FocusView() {
  const { name, tasks, mail, calendar, weather, state, session, ask, voice } = useJarvis();
  const { turns, interim } = useConversation();
  const { draft, setDraft, inputRef, fill } = useDraft();
  const label = useStateLabel();
  const world = useWorldStatus();
  // Sobald ihr redet, rückt der Kopf nach oben und macht dem Gespräch Platz.
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

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 sm:px-6 [--head:max(240px,38vh)] sm:[--head:max(300px,46vh)]">
      {/* Die Begrüßung klappt weg, sobald ihr redet. */}
      <div className={`grid w-full max-w-[900px] shrink-0 text-center transition-[grid-template-rows,opacity] duration-500 ${talking ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"}`}>
        <div className="overflow-hidden">
          <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-quiet">{now ? DATE.format(now) : " "}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[0.12em] text-sky-100 sm:text-3xl">{now ? `${greeting}, ${name}.` : `Hallo, ${name}.`}</h1>
        </div>
      </div>

      {/* Der Kopf schwebt in der 3D-Welt hinter der Seite; dieser Platz sagt der Kamera, wohin sie ihn rahmt.
          Sobald ihr redet, wird der Platz kleiner und der Kopf gleitet mit nach oben. */}
      <div
        ref={worldAnchor}
        className={`relative w-full max-w-[980px] shrink-0 transition-[height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${talking ? "h-[calc(var(--head)*0.42)]" : "h-[var(--head)]"}`}
      >
        <Holo name="jarvis-kopf">
          <button
            type="button"
            onClick={voice.canListen ? voice.toggle : () => ask("Briefing")}
            aria-label={voice.canListen ? "Mit JARVIS sprechen" : "Briefing starten"}
            className="absolute inset-y-0 left-1/2 block aspect-square max-w-full -translate-x-1/2 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
          >
            {world === "aus" && <Orb state={state} className="h-full w-full p-[12%]" />}
          </button>
        </Holo>
      </div>

      <p className={`relative mb-3 shrink-0 rounded-full border border-sky-300/30 bg-desk px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-sky-200 ${talking ? "-mt-2" : "-mt-8"}`}>
        {label}
      </p>

      {talking ? (
        <section className="flex min-h-0 w-full max-w-[760px] flex-1 flex-col" aria-label="Gespräch">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line pb-2">
            <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">{sessionLabel(session) ?? "Gespräch"}</p>
            <div className="flex items-center gap-1.5">
              <NewConversation />
              <HandsFreeSwitch />
            </div>
          </div>
          <Messages className="min-h-24 flex-1" />
        </section>
      ) : (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => ask("Briefing")}
            className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-500/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_20px_rgba(56,189,248,0.45)] transition-colors hover:bg-sky-500"
          >
            <Icon name="fokus" className="h-4 w-4" /> Briefing starten
          </button>
          {items.map((item) =>
            item.href ? (
              <HoloLink key={item.text} href={item.href} className={chipClass(item.alert)}>
                <Icon name={item.icon} className="h-4 w-4" /> {item.text}
              </HoloLink>
            ) : (
              <button key={item.text} type="button" onClick={() => ask(item.ask!)} className={chipClass(item.alert)}>
                <Icon name={item.icon} className="h-4 w-4" /> {item.text}
              </button>
            ),
          )}
        </div>
      )}

      <div className="sticky bottom-0 w-full max-w-[760px] shrink-0 bg-gradient-to-t from-desk/85 from-55% to-transparent pb-4 pt-2">
        <Chips onFill={fill} scroll idle={!talking} />
        <div className={talking && !session ? "" : "mt-2"}>
          <Composer inputRef={inputRef} draft={draft} setDraft={setDraft} big />
        </div>
        <div className={`mt-2 items-center justify-between gap-3 text-[10px] text-quiet ${talking ? "hidden sm:flex" : "flex"}`}>
          <span className="hidden sm:inline">Enter sendet · Umschalt+Enter neue Zeile · Esc hält ihn an</span>
          {!talking && (
            <>
              <HoloLink href="/" className="inline-flex items-center gap-1.5 uppercase tracking-[0.25em] text-sky-200/70 hover:text-sky-100">
                <Icon name="uebersicht" className="h-3.5 w-3.5" /> Alle Module
              </HoloLink>
              <HandsFreeSwitch />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function chipClass(alert?: boolean) {
  return `inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition ${
    alert ? "border-frame/60 bg-frame/10 text-pink-100 hover:bg-frame/20" : "border-sky-300/30 bg-sky-400/5 text-sky-100 hover:border-sky-300/60 hover:bg-sky-400/15"
  }`;
}
