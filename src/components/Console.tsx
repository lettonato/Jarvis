"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "./icons";
import { useConversation, useJarvis, type Turn } from "./JarvisProvider";
import type { AvatarState } from "@/lib/avatar";
import type { Session } from "@/lib/commands";
import type { Source } from "@/lib/brain";
import { eingabeText, leerText } from "@/lib/voiceText";

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
      className={`grid ${size} shrink-0 place-items-center rounded-full transition-colors ${
        voice.listening ? "animate-pulse bg-sonne text-schiefer" : "bg-white/10 text-kalk hover:bg-white/20"
      }`}
    >
      <Icon name="mic" className="h-5 w-5" />
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
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        on ? "border-schiefer/30 text-schiefer hover:border-schiefer/70" : "border-schiefer/20 text-quiet hover:border-schiefer/60 hover:text-schiefer"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on && voice.waiting ? "animate-pulse bg-sonne" : on ? "bg-sonne/60" : "bg-schiefer/30"}`} />
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
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-schiefer/20 px-3 py-1 text-xs font-medium text-quiet transition-colors hover:border-schiefer/60 hover:text-schiefer"
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
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            session ? "border-schiefer bg-schiefer text-kalk hover:bg-stein" : "border-schiefer/20 text-stein hover:border-schiefer/70 hover:text-schiefer"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function useDraft() {
  const [draft, setzeDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Was zuletzt getippt (oder eingesetzt) wurde. Wechselt JARVIS nach einer Antwort den Raum und tippst du genau
  // in dem Augenblick weiter, in dem der neue Raum fertig wird, kommt der Buchstabe bei React nicht an, und das
  // nächste Zeichnen stellt das Feld auf den Stand davor zurück: Der Buchstabe war weg (gemessen in Schritt J11:
  // in 6 von 12 Versuchen). Deshalb meldet der Browser jeden Buchstaben auch an React vorbei (Composer), und nach
  // jedem Zeichnen steht im Feld wieder, was zuletzt getippt wurde.
  const zuletzt = useRef("");
  const setDraft = useCallback((text: string) => {
    zuletzt.current = text;
    setzeDraft(text);
  }, []);
  useLayoutEffect(() => {
    const field = inputRef.current;
    if (field && field.value !== zuletzt.current) field.value = zuletzt.current;
  });
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
// `vorn` steht links im Feld, etwa der Lichtpunkt von JARVIS in der Leiste.
export function Composer({ inputRef, draft, setDraft, big = false, vorn }: { inputRef: RefObject<HTMLTextAreaElement | null>; draft: string; setDraft: (v: string) => void; big?: boolean; vorn?: ReactNode }) {
  const { ask, stop, voice } = useJarvis();
  const busy = useBusy();

  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    // Leer ist das Feld eine Zeile hoch, auch wenn der Platzhalter länger ist.
    field.style.height = "auto";
    if (draft) field.style.height = `${Math.min(field.scrollHeight, 168)}px`;
  }, [draft, inputRef]);

  const send = () => {
    // Abgeschickt wird, was im Feld steht: Der Stand von React kann einen Augenblick dahinter sein.
    const text = (inputRef.current?.value ?? draft).trim();
    if (!text) return;
    ask(text);
    setDraft("");
  };
  const abschicken = useRef(send);
  useLayoutEffect(() => {
    abschicken.current = send;
  });

  // Getippte Buchstaben und die Eingabetaste nimmt das Feld vom Browser selbst entgegen, nicht über React: In dem
  // Augenblick, in dem ein neuer Raum fertig wird (JARVIS wechselt ihn nach einer Antwort), kommen Tasten bei React
  // nicht an (gemessen in Schritt J11). Ein Buchstabe wäre dann weg, und die Eingabetaste machte eine neue Zeile,
  // statt abzuschicken.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    const getippt = () => setDraft(field.value);
    const taste = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      abschicken.current();
    };
    field.addEventListener("input", getippt);
    field.addEventListener("keydown", taste);
    return () => {
      field.removeEventListener("input", getippt);
      field.removeEventListener("keydown", taste);
    };
  }, [inputRef, setDraft]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      // Das Feld selbst zeigt keinen Rand; ist es mit der Tastatur markiert, zeigt ihn der ganze Rahmen.
      data-fokusrahmen
      className="flex min-w-0 flex-1 items-end gap-1.5 rounded-[1.75rem] bg-schiefer p-1.5 text-kalk has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-gletscher"
    >
      {vorn}
      <MicButton big={big} />
      <textarea
        ref={inputRef}
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={eingabeText({ canListen: voice.canListen, handsFree: voice.handsFree, gesperrt: Boolean(voice.error) })}
        aria-label="Nachricht an JARVIS"
        className={`min-w-0 flex-1 resize-none bg-transparent px-2.5 text-[0.95rem] leading-5 text-kalk placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap placeholder:text-[#9fb0b5] focus:outline-none ${big ? "py-3" : "py-2.5"}`}
      />
      {busy && !draft.trim() ? (
        <button
          type="button"
          onClick={stop}
          aria-label="Anhalten"
          title="Anhalten (Esc)"
          className={`grid ${big ? "h-11 w-11" : "h-10 w-10"} shrink-0 place-items-center rounded-full bg-white/15 text-kalk transition-colors hover:bg-white/25`}
        >
          <Icon name="stopp" className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="submit"
          aria-label="Senden"
          disabled={!draft.trim()}
          className={`grid ${big ? "h-11 w-11" : "h-10 w-10"} shrink-0 place-items-center rounded-full bg-sonne text-schiefer transition-colors hover:bg-[#ffc468] disabled:bg-white/10 disabled:text-white/35`}
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
          className="inline-flex max-w-[16rem] items-center gap-1 rounded-full border border-schiefer/20 px-2.5 py-0.5 text-xs font-medium text-see transition-colors hover:border-schiefer/60 hover:text-schiefer"
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
        <span key={i} className="h-1.5 w-1.5 animate-[jarvis-dot_1.2s_ease-in-out_infinite] rounded-full bg-sonne" style={{ animationDelay: `${i * 0.16}s` }} />
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
        <p className="max-w-[85%] whitespace-pre-line break-words rounded-[1.1rem] rounded-br-[3px] bg-schiefer px-4 py-2 text-[0.95rem] leading-relaxed text-kalk">{turn.text}</p>
      </div>
    );
  }
  const empty = !turn.text.trim();
  // Eine angehaltene Antwort, von der noch nichts dastand: keine leere Zeile mit Lichtpunkt (auch nicht nur mit dem
  // Hinweis auf Inhalte von Dritten, der zu einem Text gehört). Hat sie Quellen, bleibt sie stehen.
  if (empty && !turn.live && !turn.sources?.length) return null;
  return (
    <div className="flex animate-[jarvis-in_220ms_ease-out] gap-3">
      <span
        aria-hidden
        className={`mt-[0.45rem] h-2.5 w-2.5 shrink-0 rounded-full bg-sonne ${turn.live ? "animate-pulse" : ""}`}
      />
      <div className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-schiefer">
        <span className="sr-only">JARVIS: </span>
        {!empty && (
          <p className="whitespace-pre-line break-words">
            {turn.text}
            {turn.live && <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-[jarvis-caret_1s_steps(2)_infinite] bg-schiefer" />}
          </p>
        )}
        {turn.live && (empty || turn.status) && (
          <p className="flex items-center gap-2 py-1 text-xs font-medium text-quiet" role="status">
            <Dots />
            {turn.status && <span>{turn.status} …</span>}
          </p>
        )}
        {turn.sources && <Sources sources={turn.sources} />}
        {turn.fremd && !turn.live && (
          <p className="mt-1.5 text-xs text-quiet" title="In diese Antwort ist Text von Dritten eingeflossen (Mail, Webseite, Termin oder Nachrichten). Solange sie im Gespräch steht, fragt JARVIS vor Änderungen und Aufträgen nach.">
            Enthält Inhalte von Dritten. Änderungen danach nur mit deinem Ja.
          </p>
        )}
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
        className="h-full overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_14px)] [scrollbar-color:rgba(31,42,46,0.25)_transparent] [scrollbar-width:thin]"
      >
        <div className="space-y-4 px-1 py-2" aria-live="polite">
          {shown.length === 0 && !interim && <p className="text-sm leading-relaxed text-quiet">{leerText({ canListen: voice.canListen, handsFree: voice.handsFree, gesperrt: Boolean(voice.error) })}</p>}
          {shown.map((t) => (
            <Message key={t.id} turn={t} />
          ))}
          {state === "listening" && (
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-[1.1rem] rounded-br-[3px] border border-dashed border-schiefer/40 px-4 py-2 text-[0.95rem] italic text-stein">{interim || "…"}</p>
            </div>
          )}
          {voice.hint && <p className="text-sm text-ocker">{voice.hint}</p>}
          {voice.error && <p className="text-sm text-down">{voice.error}</p>}
        </div>
      </div>
      {away && (
        <button
          type="button"
          onClick={() => toBottom()}
          aria-label="Zur neuesten Nachricht"
          className="absolute bottom-2 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-schiefer/25 bg-white text-schiefer shadow-lg hover:border-schiefer"
        >
          <Icon name="runter" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
