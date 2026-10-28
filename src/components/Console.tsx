"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Icon } from "./icons";
import { useConversation, useJarvis, type Turn } from "./JarvisProvider";
import type { AvatarState } from "@/lib/avatar";
import type { Session } from "@/lib/commands";
import type { Source } from "@/lib/brain";

// Das Gespräch mit JARVIS: Verlauf, Mikrofon, Eingabefeld und Vorschläge zum Antippen.
// Während einer Besprechung zeigen die Vorschläge die passenden Antworten (Erledigt, Weiter …).

export const STATE_LABEL: Record<AvatarState, string> = {
  idle: "Bereit",
  listening: "Ich höre zu …",
  thinking: "Denke nach …",
  speaking: "Spreche …",
};

// Wartet das Mikrofon auf „Jarvis“, sagt die Anzeige das statt „Bereit“.
export function useStateLabel(): string {
  const { state, voice } = useJarvis();
  return state === "idle" && voice.waiting ? "Sag „Jarvis“" : STATE_LABEL[state];
}

type Chip = { label: string; text?: string; fill?: string };

const IDLE: Chip[] = [
  { label: "Briefing", text: "Briefing" },
  { label: "Meine Mails", text: "Meine Mails" },
  { label: "Meine Aufgaben", text: "Meine Aufgaben" },
  { label: "Meine Termine", text: "Meine Termine" },
  { label: "Notiere …", fill: "Notiere " },
  { label: "Termin …", fill: "Neuer Termin morgen um 9 Uhr: " },
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
  const size = big ? "h-11 w-11" : "h-10 w-10";
  return (
    <button
      type="button"
      onClick={voice.toggle}
      aria-label={voice.listening ? "Zuhören beenden" : "Sprechen"}
      title="Sprechen (Leertaste)"
      className={`grid ${size} shrink-0 place-items-center rounded-full border transition-colors ${
        voice.listening
          ? "animate-pulse border-sky-300 bg-sky-400/30 shadow-[0_0_24px_rgba(56,189,248,0.85)]"
          : "border-sky-300/40 bg-sky-400/10 hover:bg-sky-400/25"
      }`}
    >
      <Icon name="mic" className="h-5 w-5 text-sky-100" />
    </button>
  );
}

// Freihändig an oder aus. Läuft die Erkennung auf dem Mac selbst, steht das dabei.
export function HandsFreeSwitch() {
  const { voice } = useJarvis();
  if (!voice.canListen) return null;
  const on = voice.handsFree;
  return (
    <button
      type="button"
      onClick={() => voice.setHandsFree(!on)}
      aria-pressed={on}
      title={on ? "JARVIS hört auf „Jarvis“. Antippen zum Ausschalten." : "Antippen, dann hört JARVIS von selbst auf „Jarvis“."}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        on ? "border-sky-300/50 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20" : "border-line text-quiet hover:border-sky-300/40 hover:text-sky-100"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on && voice.waiting ? "animate-pulse bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.9)]" : on ? "bg-sky-300/60" : "bg-frame"}`} />
      {on ? `Hört auf „Jarvis“${voice.local ? " · nur auf dem Mac" : ""}` : "Freihändig aus"}
    </button>
  );
}

// Fängt ein neues Gespräch an. Was JARVIS sich über dich gemerkt hat, bleibt.
export function NewConversation() {
  const { turns, clearTurns } = useConversation();
  const { stop } = useJarvis();
  if (!turns.length) return null;
  return (
    <button
      type="button"
      onClick={() => {
        stop();
        clearTurns();
      }}
      title="Neues Gespräch. Was JARVIS sich über dich gemerkt hat, bleibt."
      className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-quiet transition-colors hover:border-sky-300/40 hover:text-sky-100"
    >
      <Icon name="neu" className="h-3.5 w-3.5" /> Neues Gespräch
    </button>
  );
}

export function Chips({ onFill, scroll = false, idle = true }: { onFill: (text: string) => void; scroll?: boolean; idle?: boolean }) {
  const { session, ask } = useJarvis();
  const chips = session ? IN_SESSION[session.kind] : idle ? IDLE : [];
  if (!chips.length) return null;
  return (
    <div className={`flex gap-1.5 ${scroll ? "flex-nowrap overflow-x-auto [scrollbar-width:none]" : "flex-wrap"}`}>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => (c.fill ? onFill(c.fill) : ask(c.text ?? c.label))}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
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

export function useDraft() {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fill = (text: string) => {
    setDraft(text);
    setTimeout(() => {
      const field = inputRef.current;
      field?.focus();
      field?.setSelectionRange(text.length, text.length);
    }, 0);
  };
  return { draft, setDraft, inputRef, fill };
}

// Schreibt Claude noch oder spricht JARVIS, wird aus dem Senden-Knopf ein Stopp-Knopf.
function useBusy(): boolean {
  const { turns } = useConversation();
  const { state } = useJarvis();
  return state === "speaking" || state === "thinking" || turns.some((t) => t.live);
}

// Das Eingabefeld wie bei Claude: Enter schickt ab, Umschalt+Enter macht eine neue Zeile,
// das Feld wächst mit bis etwa sechs Zeilen.
export function Composer({ inputRef, draft, setDraft, big = false }: { inputRef: RefObject<HTMLTextAreaElement | null>; draft: string; setDraft: (v: string) => void; big?: boolean }) {
  const { ask, stop } = useJarvis();
  const busy = useBusy();

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    // Leer ist das Feld eine Zeile hoch, auch wenn der Platzhalter länger ist.
    field.style.height = "auto";
    if (draft) field.style.height = `${Math.min(field.scrollHeight, 168)}px`;
  }, [draft, inputRef]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    ask(text);
    setDraft("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex min-w-0 flex-1 items-end gap-2 rounded-2xl border border-sky-300/25 bg-panel-2 p-1.5 transition-colors focus-within:border-sky-300/60"
    >
      <MicButton big={big} />
      <textarea
        ref={inputRef}
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Frag JARVIS etwas …"
        aria-label="Nachricht an JARVIS"
        className={`min-w-0 flex-1 resize-none bg-transparent px-2 text-sm leading-5 text-ink placeholder:text-quiet focus:outline-none ${big ? "py-3" : "py-2.5"}`}
      />
      {busy && !draft.trim() ? (
        <button
          type="button"
          onClick={stop}
          aria-label="Anhalten"
          title="Anhalten (Esc)"
          className={`grid ${big ? "h-11 w-11" : "h-10 w-10"} shrink-0 place-items-center rounded-xl border border-sky-300/50 bg-sky-400/15 text-sky-100 transition-colors hover:bg-sky-400/30`}
        >
          <Icon name="stopp" className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="submit"
          aria-label="Senden"
          disabled={!draft.trim()}
          className={`grid ${big ? "h-11 w-11" : "h-10 w-10"} shrink-0 place-items-center rounded-xl bg-sky-500 text-white transition-colors hover:bg-sky-400 disabled:bg-sky-500/25 disabled:text-sky-100/50`}
        >
          <Icon name="senden" className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

function Sources({ sources }: { sources: Source[] }) {
  const links = sources.map((s) => ({ ...s, host: hostOf(s.url) })).filter((s) => s.host);
  if (!links.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {links.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer noopener"
          title={s.title}
          className="inline-flex max-w-[16rem] items-center gap-1 rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[11px] text-sky-200/90 transition-colors hover:border-sky-300/50 hover:text-sky-50"
        >
          <Icon name="extern" className="h-3 w-3 shrink-0" />
          <span className="truncate">{s.host}</span>
        </a>
      ))}
    </div>
  );
}

// Drei Punkte, solange Claude noch nichts geschrieben hat.
function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-[jarvis-dot_1.2s_ease-in-out_infinite] rounded-full bg-sky-300" style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  );
}

// Eine Nachricht. Deine stehen rechts in einer Blase, die von JARVIS links mit seinem Lichtpunkt.
// memo: Schreibt Claude, zeichnet nur die laufende Antwort neu, nicht der ganze Verlauf.
const Message = memo(function Message({ turn }: { turn: Turn }) {
  if (turn.who === "du") {
    return (
      <div className="flex animate-[jarvis-in_220ms_ease-out] justify-end">
        <p className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md border border-sky-300/20 bg-sky-400/15 px-3.5 py-2 text-sm text-sky-50">{turn.text}</p>
      </div>
    );
  }
  const empty = !turn.text.trim();
  return (
    <div className="flex animate-[jarvis-in_220ms_ease-out] gap-3">
      <span
        aria-hidden
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.9)] ${turn.live ? "animate-pulse" : ""}`}
      />
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
        <span className="sr-only">JARVIS: </span>
        {!empty && (
          <p className="whitespace-pre-line break-words">
            {turn.text}
            {turn.live && <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-[jarvis-caret_1s_steps(2)_infinite] bg-sky-300" />}
          </p>
        )}
        {turn.live && (empty || turn.status) && (
          <p className="flex items-center gap-2 py-1 text-xs text-sky-300/90" role="status">
            <Dots />
            {turn.status && <span>{turn.status} …</span>}
          </p>
        )}
        {turn.sources && <Sources sources={turn.sources} />}
      </div>
    </div>
  );
});

// Bleibt unten kleben, solange du unten bist. Scrollst du hoch zum Nachlesen, springt nichts weg;
// ein Knopf bringt dich zurück zur neuesten Nachricht.
function useStickToBottom() {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      stick.current = near;
      setAway(!near);
    };
    const follow = () => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    };
    const observer = new ResizeObserver(follow);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener("scroll", onScroll, { passive: true });
    follow();
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, []);
  const toBottom = useCallback((smooth = true) => {
    const el = ref.current;
    if (!el) return;
    stick.current = true;
    setAway(false);
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);
  return { ref, away, toBottom };
}

function emptyText(handsFree: boolean, canListen: boolean): string {
  if (handsFree) return "Sag „Jarvis“ und dann, was du brauchst. Oder schreib mir unten. Ich kann dir alles beantworten, im Web nachsehen und mir Dinge über dich merken.";
  if (canListen) return "Tippe aufs Mikrofon, drück die Leertaste oder schreib mir. Ich kann dir alles beantworten, im Web nachsehen und mir Dinge über dich merken.";
  return "Schreib mir unten. Sprechen geht in Chrome und Safari.";
}

// Der Verlauf. `limit` zeigt nur die letzten Nachrichten, etwa in der Übersicht.
export function Messages({ limit, className = "" }: { limit?: number; className?: string }) {
  const { turns, interim } = useConversation();
  const { voice, state } = useJarvis();
  const { ref, away, toBottom } = useStickToBottom();
  const shown = limit ? turns.slice(-limit) : turns;
  const last = turns[turns.length - 1];

  // Schickst du etwas ab, geht es nach unten, auch wenn du gerade weiter oben gelesen hast.
  const lastMine = last?.who === "du" ? last.id : null;
  useEffect(() => {
    if (lastMine !== null) toBottom(false);
  }, [lastMine, toBottom]);

  return (
    <div className={`relative min-h-0 ${className}`}>
      <div
        ref={ref}
        className="h-full overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_14px)] [scrollbar-color:rgba(125,211,252,0.25)_transparent] [scrollbar-width:thin]"
      >
        <div className="space-y-4 px-1 py-2" aria-live="polite">
          {shown.length === 0 && !interim && <p className="text-sm leading-relaxed text-quiet">{emptyText(voice.handsFree, voice.canListen)}</p>}
          {shown.map((t) => (
            <Message key={t.id} turn={t} />
          ))}
          {state === "listening" && (
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md border border-dashed border-sky-300/40 px-3.5 py-2 text-sm italic text-sky-100/80">{interim || "…"}</p>
            </div>
          )}
          {voice.hint && <p className="text-sm text-amber-200">{voice.hint}</p>}
          {voice.error && <p className="text-sm text-down">{voice.error}</p>}
        </div>
      </div>
      {away && (
        <button
          type="button"
          onClick={() => toBottom()}
          aria-label="Zur neuesten Nachricht"
          className="absolute bottom-2 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-sky-300/40 bg-panel-2 text-sky-100 shadow-[0_4px_16px_rgba(9,11,24,0.8)] hover:bg-sky-400/20"
        >
          <Icon name="runter" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Das Gespräch unter dem Kopf in der Übersicht: die letzten Nachrichten, Eingabe und Vorschläge.
export function Console() {
  const { session, voice, state } = useJarvis();
  const { turns, interim } = useConversation();
  const { draft, setDraft, inputRef, fill } = useDraft();
  // Solange ihr nicht redet, bleibt die Konsole flach und lässt der Landschaft Platz.
  const talking = turns.length > 0 || Boolean(interim) || state === "listening";
  return (
    <div className="w-full max-w-[640px] rounded-2xl border border-sky-300/25 bg-panel/80 p-3 shadow-[0_0_40px_rgba(9,11,24,0.6)]">
      {(session || voice.canListen || turns.length > 0) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">{sessionLabel(session)}</p>
          <div className="flex items-center gap-1.5">
            <NewConversation />
            <HandsFreeSwitch />
          </div>
        </div>
      )}
      {(talking || voice.error || voice.hint) && <Messages limit={6} className={talking ? "h-32 animate-[jarvis-sheet_260ms_cubic-bezier(0.16,1,0.3,1)] sm:h-44" : "h-auto"} />}
      <div className="mt-2">
        <Composer inputRef={inputRef} draft={draft} setDraft={setDraft} />
      </div>
      <div className="mt-2">
        <Chips onFill={fill} scroll />
      </div>
    </div>
  );
}
