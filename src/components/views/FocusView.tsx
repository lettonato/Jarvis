"use client";

import Link from "next/link";
import { Console, STATE_LABEL } from "../Console";
import { Icon, type IconName } from "../icons";
import { useJarvis } from "../JarvisProvider";
import { ParticleHead } from "../ParticleHead";
import { isoDate } from "@/lib/dates";
import { dateOf, dueSoon } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

// Fokus: nur JARVIS, groß, und das Gespräch mit ihm. Oben steht, was gerade ansteht;
// ein Klick darauf, und er geht es mit dir durch.

const DATE = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

type Item = { icon: IconName; text: string; ask?: string; href?: string; alert?: boolean };

export function FocusView() {
  const { name, tasks, mail, weather, state, ask, voice } = useJarvis();
  const now = useNow();
  const today = now ? isoDate(now) : null;
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  const items: Item[] = [];
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
    <main className="view-enter relative flex flex-1 flex-col items-center px-4 pb-6 sm:px-6">
      <div className="mt-4 w-full max-w-[900px] text-center">
        <p className="text-[11px] uppercase tracking-[0.35em] text-quiet">{now ? DATE.format(now) : " "}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[0.12em] text-sky-100 sm:text-3xl">
          {now ? `${greeting}, ${name}.` : `Hallo, ${name}.`}
        </h1>
      </div>

      <button
        type="button"
        onClick={voice.canListen ? voice.toggle : () => ask("Briefing")}
        aria-label={voice.canListen ? "Mit JARVIS sprechen" : "Briefing starten"}
        className="relative h-[48vh] min-h-[300px] w-full max-w-[980px] cursor-pointer [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)]"
      >
        <ParticleHead state={state} />
      </button>

      <p className="-mt-8 mb-3 rounded-full border border-sky-300/30 bg-desk/70 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-sky-200">
        {STATE_LABEL[state]}
      </p>

      <div className="mb-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => ask("Briefing")}
          className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-500/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_20px_rgba(56,189,248,0.45)] hover:bg-sky-500"
        >
          <Icon name="fokus" className="h-4 w-4" /> Briefing starten
        </button>
        {items.map((item) =>
          item.href ? (
            <Link key={item.text} href={item.href} className={chipClass(item.alert)}>
              <Icon name={item.icon} className="h-4 w-4" /> {item.text}
            </Link>
          ) : (
            <button key={item.text} type="button" onClick={() => ask(item.ask!)} className={chipClass(item.alert)}>
              <Icon name={item.icon} className="h-4 w-4" /> {item.text}
            </button>
          ),
        )}
      </div>

      <Console large />

      <Link href="/" className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-sky-200/70 hover:text-sky-100">
        <Icon name="uebersicht" className="h-4 w-4" /> Alle Module zeigen
      </Link>
    </main>
  );
}

function chipClass(alert?: boolean) {
  return `inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition ${
    alert ? "border-frame/60 bg-frame/10 text-pink-100 hover:bg-frame/20" : "border-sky-300/30 bg-sky-400/5 text-sky-100 hover:border-sky-300/60 hover:bg-sky-400/15"
  }`;
}
