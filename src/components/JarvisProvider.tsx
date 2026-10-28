"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AvatarState } from "./ParticleHead";
import { ApiError, getJson, postJson } from "@/lib/api";
import { holoTypes } from "@/lib/holo";
import { VIEWS, type BrainReply, type BrainRequest, type BrainTurn } from "@/lib/brain";
import type { CalendarSnapshot } from "@/lib/calendar";
import { decide, discuss as discussDecision, situation, startSession, type CommandContext, type Decision, type Effect, type Session } from "@/lib/commands";
import { intelSentence, searchSentence, type IntelSnapshot } from "@/lib/intel";
import type { MailMessage, MailSnapshot } from "@/lib/mail";
import type { MarketSnapshot } from "@/lib/market";
import type { DeskSnapshot } from "@/lib/paper";
import type { Settings } from "@/lib/settings";
import type { TasksSnapshot } from "@/lib/tasks";
import { usePolling } from "@/lib/usePolling";
import { setHandsFree, useVoice } from "@/lib/useVoice";
import type { WeatherSnapshot } from "@/lib/weather";

// JARVIS ist in jeder Ansicht derselbe: Gespräch, Stimme, Besprechung und Daten leben hier,
// über allen Seiten. Wechselst du die Ansicht, redet er einfach weiter.

export type Turn = { id: number; who: "du" | "jarvis"; text: string };

type Jarvis = {
  name: string;
  market: MarketSnapshot | null;
  weather: WeatherSnapshot | null;
  tasks: TasksSnapshot | null;
  mail: MailSnapshot | null;
  settings: Settings | null;
  reloadTasks: () => Promise<void>;
  reloadMail: (force?: boolean) => Promise<void>;
  reloadSettings: () => Promise<void>;
  setTasks: (t: TasksSnapshot) => void;
  setMail: (m: MailSnapshot) => void;
  setSettings: (s: Settings) => void;
  // Der Spielgeld-Desk: Kontostand, Positionen, Protokoll.
  desk: DeskSnapshot | null;
  setDesk: (d: DeskSnapshot) => void;
  // Der Apple-Kalender auf dem Mac.
  calendar: CalendarSnapshot | null;
  setCalendar: (c: CalendarSnapshot) => void;
  reloadCalendar: () => Promise<void>;
  // Intel: das Lagebild aus Nachrichten und X.
  intel: IntelSnapshot | null;
  setIntel: (i: IntelSnapshot) => void;
  mailText: Record<number, MailMessage>;
  // Die Mails, die Claude zuletzt geöffnet hat; n zählt mit, damit dieselbe Mail wieder aufklappt.
  spotlight: { uids: number[]; n: number };
  turns: Turn[];
  state: AvatarState;
  session: Session | null;
  ask: (text: string) => void;
  discuss: (kind: Session["kind"], id: string | number) => void;
  run: (effect: Effect) => Promise<string | undefined>;
  voice: {
    canListen: boolean;
    // Hört von selbst auf „Jarvis“.
    handsFree: boolean;
    // Wartet auf deinen Befehl; interim ist, was gerade ankommt.
    listening: boolean;
    waiting: boolean;
    interim: string;
    // Die Erkennung läuft auf dem Mac selbst.
    local: boolean;
    error: string | null;
    hint: string | null;
    toggle: () => void;
    stopSpeaking: () => void;
    setHandsFree: (on: boolean) => void;
  };
};

const JarvisContext = createContext<Jarvis | null>(null);

export function useJarvis(): Jarvis {
  const value = useContext(JarvisContext);
  if (!value) throw new Error("useJarvis braucht den JarvisProvider.");
  return value;
}

let turnId = 0;

// So lange vor einem Termin erinnert JARVIS daran.
const REMIND_MS = 15 * 60_000;

// Höchstens etwa fünf Sätze vorlesen, der Rest steht auf dem Bildschirm.
function speakable(text: string): string {
  const clean = text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (!clean) return "Die Mail hat keinen lesbaren Text.";
  if (clean.length <= 480) return clean;
  const cut = clean.slice(0, 480);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return `${end > 120 ? cut.slice(0, end + 1) : `${cut} …`} Den Rest siehst du auf dem Bildschirm.`;
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: market } = usePolling<MarketSnapshot>("/api/market", 30_000);
  const { data: weather } = usePolling<WeatherSnapshot>("/api/weather", 10 * 60_000);
  const { data: tasks, reload: reloadTasks, set: setTasks } = usePolling<TasksSnapshot>("/api/aufgaben", 60_000);
  const { data: mail, reload: loadMail, set: setMail } = usePolling<MailSnapshot>("/api/post", 2 * 60_000);
  const { data: settings, reload: reloadSettings, set: setSettings } = usePolling<Settings>("/api/einstellungen", 30 * 60_000);
  const { data: desk, set: setDesk } = usePolling<DeskSnapshot>("/api/handel", 15_000);
  const { data: calendar, reload: loadCalendar, set: setCalendar } = usePolling<CalendarSnapshot>("/api/kalender", 5 * 60_000);
  const { data: intel, reload: loadIntel, set: setIntel } = usePolling<IntelSnapshot>("/api/intel", 60_000);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [session, setSessionState] = useState<Session | null>(null);
  const [mailText, setMailText] = useState<Record<number, MailMessage>>({});
  const [spotlight, setSpotlight] = useState<{ uids: number[]; n: number }>({ uids: [], n: 0 });

  const sessionRef = useRef<Session | null>(null);
  // Kam der letzte Satz per Stimme, hört JARVIS nach seiner Antwort gleich weiter zu.
  const byVoice = useRef(false);
  const heard = useRef<(text: string) => void>(() => {});
  const latest = useRef<Omit<CommandContext, "now" | "session">>({ name: "Benedikt", market: null, weather: null, tasks: null, mail: null, desk: null, calendar: null, intel: null });
  // Hast du nach den Nachrichten gefragt, sagt JARVIS Bescheid, sobald Grok fertig ist.
  const announce = useRef<{ focus: string | null; since: string } | null>(null);
  const place = useRef(pathname);
  const history = useRef<Turn[]>([]);
  const brain = useRef(false);

  const { canListen, handsFree, listening, waiting, interim, local, speaking, error, hint, listen, stopListening, speak, stopSpeaking } = useVoice(
    useCallback((text: string) => heard.current(text), []),
  );
  const name = settings?.name ?? "Benedikt";

  useEffect(() => {
    latest.current = { name, market, weather, tasks, mail, desk, calendar, intel };
    place.current = pathname;
    history.current = turns;
    brain.current = Boolean(settings?.brain.configured);
  });

  const setSession = useCallback((s: Session | null) => {
    sessionRef.current = s;
    setSessionState(s);
  }, []);

  const addTurn = useCallback((who: Turn["who"], text: string) => {
    setTurns((prev) => [...prev, { id: turnId++, who, text }].slice(-30));
  }, []);

  const run = useCallback(
    async (effect: Effect): Promise<string | undefined> => {
      try {
        switch (effect.type) {
          case "completeTask": {
            const { file, line, raw } = effect.task;
            setTasks(await postJson<TasksSnapshot>("/api/aufgaben", { action: "done", file, line, raw }));
            return;
          }
          case "rescheduleTask": {
            const { file, line, raw } = effect.task;
            setTasks(await postJson<TasksSnapshot>("/api/aufgaben", { action: "due", file, line, raw, date: effect.date }));
            return;
          }
          case "addTask":
            setTasks(await postJson<TasksSnapshot>("/api/aufgaben", { action: "add", text: effect.text, due: effect.due, important: effect.important }));
            return;
          case "addNote":
            await postJson("/api/aufgaben", { action: "note", text: effect.text });
            return;
          case "markSeen":
            setMail(await postJson<MailSnapshot>("/api/post", { action: "seen", uid: effect.uid }));
            return;
          case "readMail": {
            const message = await getJson<MailMessage>(`/api/post?uid=${effect.uid}`);
            setMailText((prev) => ({ ...prev, [effect.uid]: message }));
            return speakable(message.text);
          }
          case "desk":
            setDesk(await postJson<DeskSnapshot>("/api/handel", { action: effect.action }));
            return;
          case "voice":
            if (effect.on && !canListen) throw new Error("Dieser Browser kann nicht zuhören. Nimm Chrome oder Safari.");
            setHandsFree(effect.on);
            return;
          // Nach dem Eintragen zeigt die Kalender-App gleich den Tag mit dem neuen Termin.
          case "addEvent": {
            const result = await postJson<CalendarSnapshot & { note?: string }>("/api/kalender", { action: "neu", event: effect.event, open: true });
            setCalendar(result);
            return result.note;
          }
          case "openCalendar": {
            const result = await postJson<CalendarSnapshot & { note?: string }>("/api/kalender", { action: "oeffnen", date: effect.date });
            setCalendar(result);
            return result.note;
          }
          case "openObsidian":
            await postJson("/api/aufgaben", { action: "open", what: effect.what });
            return;
          // Grok braucht eine halbe Minute oder mehr; die Antwort kommt, sobald das Lagebild da ist.
          case "intel": {
            const result = await postJson<IntelSnapshot>("/api/intel", { action: "aktualisieren", thema: effect.topic });
            setIntel(result);
            if (result.running) announce.current = { focus: result.running.focus, since: result.running.since };
            return;
          }
        }
      } catch (e) {
        // Hat jemand die Aufgabe in Obsidian geändert, frisch laden, damit die Liste wieder stimmt.
        if (e instanceof ApiError && e.status === 409) await reloadTasks();
        throw e;
      }
    },
    [setTasks, setMail, setDesk, setCalendar, setIntel, reloadTasks, canListen],
  );

  const speakThenMaybeListen = useCallback(
    (text: string) => {
      speak(text, () => {
        // Im Gespräch per Stimme hört JARVIS nach seiner Antwort gleich wieder zu, ohne „Jarvis“.
        if (byVoice.current) listen();
      });
    },
    [speak, listen],
  );

  const execute = useCallback(
    async (d: Decision) => {
      let said = "";
      if (d.effect) {
        try {
          said = (await run(d.effect)) ?? "";
        } catch (e) {
          setThinking(false);
          const message = e instanceof Error ? e.message : String(e);
          addTurn("jarvis", message);
          speakThenMaybeListen(message);
          return;
        }
      }
      setThinking(false);
      if (d.session !== undefined) setSession(d.session);
      if (d.navigate && d.navigate !== place.current) router.push(d.navigate, { transitionTypes: holoTypes(place.current, d.navigate) });
      const first = [d.reply, said].filter(Boolean).join(" ");
      if (first) addTurn("jarvis", first);
      if (d.after) addTurn("jarvis", d.after);
      speakThenMaybeListen([first, d.after].filter(Boolean).join(" "));
    },
    [run, addTurn, setSession, router, speakThenMaybeListen],
  );

  const context = useCallback((): CommandContext => ({ ...latest.current, now: new Date(), session: sessionRef.current }), []);

  // Freie Sätze beantwortet Claude auf dem Server. Was er geändert hat, kommt frisch zurück.
  const askBrain = useCallback(
    async (text: string, earlier: BrainTurn[]) => {
      const ctx = context();
      const s = ctx.session;
      const request: BrainRequest = {
        text,
        history: earlier,
        view: place.current,
        focus: s ? { kind: s.kind, id: s.ids[s.index] } : null,
        extra: situation(ctx),
      };
      try {
        const result = await postJson<BrainReply>("/api/gehirn", request);
        if (result.tasks) setTasks(result.tasks);
        if (result.mail) setMail(result.mail);
        if (result.desk) setDesk(result.desk);
        if (result.calendar) setCalendar(result.calendar);
        if (result.intel) setIntel(result.intel);
        if (result.opened) {
          const opened = result.opened;
          setMailText((prev) => ({ ...prev, ...Object.fromEntries(opened.map((m) => [m.uid, m])) }));
          setSpotlight((prev) => ({ uids: opened.map((m) => m.uid), n: prev.n + 1 }));
        }
        const fresh = {
          ...ctx,
          tasks: result.tasks ?? ctx.tasks,
          mail: result.mail ?? ctx.mail,
          desk: result.desk ?? ctx.desk,
          calendar: result.calendar ?? ctx.calendar,
          intel: result.intel ?? ctx.intel,
        };
        // Führt Claude dich während einer Besprechung in eine andere Ansicht, endet die Besprechung.
        const leaves = Boolean(s && result.navigate && result.navigate !== VIEWS[s.kind]);
        await execute(
          result.session
            ? startSession(fresh, result.session, result.reply)
            : { reply: result.reply, navigate: result.navigate, ...(leaves ? { session: null } : {}) },
        );
      } catch (e) {
        await execute({ reply: e instanceof Error ? e.message : String(e) });
      }
    },
    [context, execute, setTasks, setMail, setDesk, setCalendar, setIntel],
  );

  const handle = useCallback(
    (text: string, fromVoice: boolean) => {
      const clean = text.trim();
      if (!clean) return;
      byVoice.current = fromVoice;
      const earlier = history.current.slice(-12).map(({ who, text }) => ({ who, text }));
      addTurn("du", clean);
      setThinking(true);
      setTimeout(() => {
        const decision = decide(clean, context(), brain.current);
        if (decision) execute(decision);
        else askBrain(clean, earlier);
      }, 350);
    },
    [addTurn, execute, context, askBrain],
  );

  useEffect(() => {
    heard.current = (text) => handle(text, true);
  }, [handle]);

  const ask = useCallback((text: string) => handle(text, false), [handle]);

  const discuss = useCallback(
    (kind: Session["kind"], id: string | number) => {
      byVoice.current = false;
      execute(discussDecision(context(), kind, id));
    },
    [execute, context],
  );

  const toggle = useCallback(() => {
    if (listening) stopListening();
    else listen();
  }, [listening, listen, stopListening]);

  // Leertaste: sprechen, solange gerade kein Eingabefeld aktiv ist. Escape: JARVIS unterbrechen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, button, a, [contenteditable=true]");
      if (e.key === "Escape") stopSpeaking();
      if (e.code !== "Space" || typing || e.repeat || !canListen) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, stopSpeaking, canListen]);

  // Erinnert einmal, kurz bevor ein Termin beginnt. Redet JARVIS gerade oder hört zu, wartet er damit.
  const reminded = useRef(new Set<string>());
  const busy = useRef(false);
  useEffect(() => {
    busy.current = listening || thinking || speaking;
  });
  useEffect(() => {
    if (calendar?.access !== "ok") return;
    const check = () => {
      if (busy.current) return;
      const now = Date.now();
      const due = calendar.events.find((e) => !e.allDay && !reminded.current.has(e.id) && e.start >= now - 60_000 && e.start - now <= REMIND_MS);
      if (!due) return;
      reminded.current.add(due.id);
      const minutes = Math.round((due.start - now) / 60_000);
      const text = minutes <= 1 ? `Jetzt beginnt ${due.title}.` : `In ${minutes} Minuten: ${due.title}.`;
      addTurn("jarvis", text);
      speak(text);
    };
    const first = setTimeout(check, 2000);
    const timer = setInterval(check, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [calendar, addTurn, speak]);

  // Während Grok liest, alle drei Sekunden nachsehen, sonst reicht jede Minute.
  useEffect(() => {
    if (!intel?.running) return;
    const timer = setTimeout(() => void loadIntel(), 3000);
    return () => clearTimeout(timer);
  }, [intel, loadIntel]);

  // Ist das Lagebild fertig, das du angefordert hast, sagt JARVIS es dir.
  useEffect(() => {
    const asked = announce.current;
    if (!asked || !intel || intel.running) return;
    announce.current = null;
    const result = asked.focus ? intel.search : intel.report;
    const done = result && Date.parse(result.at) >= Date.parse(asked.since) - 1000;
    const text = done ? (asked.focus ? searchSentence(result) : intelSentence(intel, new Date())) : `Das hat nicht geklappt. ${intel.error ?? "Grok hat nicht geantwortet."}`;
    addTurn("jarvis", text);
    speak(text);
  }, [intel, addTurn, speak]);

  const state: AvatarState = listening ? "listening" : thinking ? "thinking" : speaking ? "speaking" : "idle";

  const value = useMemo<Jarvis>(
    () => ({
      name,
      market,
      weather,
      tasks,
      mail,
      settings,
      reloadTasks: () => reloadTasks(),
      reloadMail: (force = false) => loadMail(force ? "?force=1" : ""),
      reloadSettings: () => reloadSettings(),
      setTasks,
      setMail,
      setSettings,
      desk,
      setDesk,
      calendar,
      setCalendar,
      reloadCalendar: () => loadCalendar("?force=1"),
      intel,
      setIntel,
      mailText,
      spotlight,
      turns,
      state,
      session,
      ask,
      discuss,
      run,
      voice: { canListen, handsFree, listening, waiting, interim, local, error, hint, toggle, stopSpeaking, setHandsFree },
    }),
    [
      name,
      market,
      weather,
      tasks,
      mail,
      settings,
      reloadTasks,
      loadMail,
      reloadSettings,
      setTasks,
      setMail,
      setSettings,
      desk,
      setDesk,
      calendar,
      setCalendar,
      loadCalendar,
      intel,
      setIntel,
      mailText,
      spotlight,
      turns,
      state,
      session,
      ask,
      discuss,
      run,
      canListen,
      handsFree,
      listening,
      waiting,
      interim,
      local,
      error,
      hint,
      toggle,
      stopSpeaking,
    ],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}
