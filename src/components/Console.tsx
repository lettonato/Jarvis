"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { Icon } from "./icons";
import { useJarvis, type Turn } from "./JarvisProvider";
import type { AvatarState } from "./ParticleHead";
import type { Session } from "@/lib/commands";

// Das Gespräch mit JARVIS: Verlauf, Mikrofon, Textfeld und Vorschläge zum Antippen.
// Während einer Besprechung zeigen die Vorschläge die passenden Antworten (Erledigt, Weiter …).

export const STATE_LABEL: Record<AvatarState, string> = {
  idle: "Bereit",
  listening: "Ich höre zu …",
  thinking: "Denke nach …",
  speaking: "Spreche …",
};

type Chip = { label: string; text?: string; fill?: string };

const IDLE: Chip[] = [
  { label: "Briefing", text: "Briefing" },
  { label: "Meine Mails", text: "Meine Mails" },
  { label: "Meine Aufgaben", text: "Meine Aufgaben" },
  { label: "Notiere …", fill: "Notiere " },
  { label: "Wetter", text: "Wie ist das Wetter?" },
  { label: "Bitcoin-Kurs", text: "Bitcoin-Kurs" },
];

const IN_SESSION: Record<Session["kind"], Chip[]> = {
  aufgaben: [
    { label: "Erledigt", text: "Erledigt" },
    { label: "Auf morgen", text: "Verschieben auf morgen" },
    { label: "Nächste Woche", text: "Verschieben auf nächste Woche" },
    { label: "Weiter", text: "Weiter" },
    { label: "Zurück", text: "Zurück" },
    { label: "Beenden", text: "Beenden" },
  ],
  post: [
    { label: "Vorlesen", text: "Vorlesen" },
    { label: "Als Aufgabe", text: "Aufgabe daraus machen" },
    { label: "Gelesen", text: "Als gelesen markieren" },
    { label: "Weiter", text: "Weiter" },
    { label: "Beenden", text: "Beenden" },
  ],
};

export function sessionLabel(session: Session | null): string | null {
  if (!session) return null;
  const what = session.kind === "aufgaben" ? "Aufgaben" : "Mails";
  return `Besprechung ${what} · ${session.index + 1} von ${session.ids.length}`;
}

export function MicButton({ big = false }: { big?: boolean }) {
  const { voice } = useJarvis();
  if (!voice.canListen) return null;
  const size = big ? "h-16 w-16" : "h-11 w-11";
  return (
    <button
      type="button"
      onClick={voice.toggle}
      aria-label={voice.listening ? "Zuhören beenden" : "Sprechen"}
      title="Sprechen (Leertaste)"
      className={`grid ${size} shrink-0 place-items-center rounded-full border transition ${
        voice.listening
          ? "animate-pulse border-sky-300 bg-sky-400/30 shadow-[0_0_24px_rgba(56,189,248,0.85)]"
          : "border-sky-300/50 bg-sky-400/10 hover:bg-sky-400/20 hover:shadow-[0_0_16px_rgba(56,189,248,0.5)]"
      }`}
    >
      <Icon name="mic" className={big ? "h-7 w-7 text-sky-100" : "h-5 w-5 text-sky-100"} />
    </button>
  );
}

export function Chips({ onFill, scroll = false }: { onFill: (text: string) => void; scroll?: boolean }) {
  const { session, ask } = useJarvis();
  const chips = session ? IN_SESSION[session.kind] : IDLE;
  return (
    <div className={`flex gap-1.5 ${scroll ? "flex-nowrap overflow-x-auto [scrollbar-width:none] lg:flex-wrap" : "flex-wrap"}`}>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => (c.fill ? onFill(c.fill) : ask(c.text ?? c.label))}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition ${
            session
              ? "border-sky-300/50 bg-sky-400/10 text-sky-100 hover:bg-sky-400/25"
              : "border-sky-300/20 text-sky-200/80 hover:border-sky-300/50 hover:text-sky-100"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function AskForm({ inputRef, draft, setDraft }: { inputRef: RefObject<HTMLInputElement | null>; draft: string; setDraft: (v: string) => void }) {
  const { ask } = useJarvis();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    ask(draft.trim());
    setDraft("");
  };
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2">
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Frag JARVIS oder sag, was er notieren soll …"
        aria-label="Nachricht an JARVIS"
        className="min-w-0 flex-1 rounded-lg border border-line bg-desk/80 px-3 py-2.5 text-sm text-ink placeholder:text-quiet focus:border-sky-300/60 focus:outline-none"
      />
      <button type="submit" aria-label="Senden" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-500/80 text-white hover:bg-sky-500">
        <Icon name="senden" className="h-4 w-4" />
      </button>
    </form>
  );
}

function TurnLine({ turn }: { turn: Turn }) {
  const jarvis = turn.who === "jarvis";
  return (
    <p className={jarvis ? "text-sky-100" : "text-quiet"}>
      <span className={`mr-2 text-[10px] font-bold tracking-widest ${jarvis ? "text-sky-300" : "text-frame"}`}>{jarvis ? "JARVIS" : "DU"}</span>
      {turn.text}
    </p>
  );
}

export function useDraft() {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fill = (text: string) => {
    setDraft(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  return { draft, setDraft, inputRef, fill };
}

// Das Gespräch unter dem Kopf in Übersicht und Fokus. `large` zeigt mehr Verlauf.
export function Console({ large = false }: { large?: boolean }) {
  const { turns, voice, session } = useJarvis();
  const { draft, setDraft, inputRef, fill } = useDraft();
  const scroller = useRef<HTMLDivElement>(null);
  const shown = turns.slice(large ? -12 : -4);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  return (
    <div className={`w-full rounded-xl border border-sky-300/20 bg-panel/70 p-3 backdrop-blur-sm ${large ? "max-w-[760px]" : "max-w-[640px]"}`}>
      {session && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">{sessionLabel(session)}</p>}
      <div ref={scroller} className={`space-y-1.5 overflow-y-auto text-sm ${large ? "max-h-[24vh] min-h-20" : "max-h-40 min-h-16"}`}>
        {shown.length === 0 && (
          <p className="text-quiet">
            {voice.canListen
              ? "Tippe aufs Mikrofon oder drück die Leertaste und sprich mit mir. Sag zum Beispiel: Briefing."
              : "Schreib mir unten. Sprechen geht in Chrome oder Edge."}
          </p>
        )}
        {shown.map((t) => (
          <TurnLine key={t.id} turn={t} />
        ))}
        {voice.error && <p className="text-down">{voice.error}</p>}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <MicButton big={large} />
        <AskForm inputRef={inputRef} draft={draft} setDraft={setDraft} />
      </div>
      <div className="mt-2">
        <Chips onFill={fill} />
      </div>
    </div>
  );
}
