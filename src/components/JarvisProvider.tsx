"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Ausfall } from "@/lib/heute";
import type { AvatarState } from "@/lib/avatar";
import { ApiError, getJson, postJson, postStream } from "@/lib/api";
import { alsSatz } from "@/lib/format";
import { fahrtArten } from "@/lib/raeume";
import { VIEWS, type BrainEvent, type BrainReply, type BrainRequest, type BrainTurn, type MemoryFact, type MemoryStand, type Source } from "@/lib/brain";
import { erinnerungsSatz, fuerGespraech, type CalendarSnapshot } from "@/lib/calendar";
import { decide, discuss as discussDecision, situation, startSession, type CommandContext, type Decision, type Effect, type Session } from "@/lib/commands";
import { intelSentence, searchSentence, type IntelSnapshot } from "@/lib/intel";
import type { MetalleSnapshot } from "@/lib/metalle";
import { docDoneSentence, type DocsSnapshot } from "@/lib/documents";
import type { MailMessage, MailSnapshot } from "@/lib/mail";
import type { MarketSnapshot } from "@/lib/market";
import type { DeskSnapshot } from "@/lib/paper";
import type { ProjekteSnapshot } from "@/lib/projekte";
import { enthaeltFremdes } from "@/lib/herkunft";
import type { Settings } from "@/lib/settings";
import type { TasksSnapshot } from "@/lib/tasks";
import { setze } from "@/lib/geteilt";
import { usePolling } from "@/lib/usePolling";
import { setHandsFree, useVoice } from "@/lib/useVoice";
import { takeSentences } from "@/lib/voiceText";
import type { WeatherSnapshot } from "@/lib/weather";

// JARVIS ist in jeder Ansicht derselbe: Gespräch, Stimme, Besprechung und Daten leben hier,
// über allen Seiten. Wechselst du die Ansicht, redet er einfach weiter.

// live: Claude schreibt noch; status: was JARVIS gerade tut, etwa „Ich suche im Web“.
// fremd: Für diese Antwort hat JARVIS Text von Dritten gelesen; der Server fragt danach bei Änderungen nach.
// alt: aus dem gespeicherten Gespräch zurückgeholt (wird nicht mitgespeichert und nicht noch einmal angesagt).
export type Turn = { id: number; who: "du" | "jarvis"; text: string; live?: boolean; status?: string; sources?: Source[]; fremd?: boolean; alt?: boolean };

// Alles, was die Leertaste selbst bedient, wenn es markiert ist.
const BEDIENBAR = 'input, textarea, select, button, a, summary, label, [contenteditable=true], [role=button], [role=menuitem], [role=checkbox], [role=switch], [role=tab], [tabindex]:not([tabindex="-1"])';


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
  // Welche Abfragen an JARVIS selbst von Anfang an scheitern: Dort steht dann nicht „lädt noch“.
  ausfall: Ausfall;
  // Der Apple-Kalender auf dem Mac.
  calendar: CalendarSnapshot | null;
  setCalendar: (c: CalendarSnapshot) => void;
  reloadCalendar: () => Promise<void>;
  // Intel: das Lagebild aus Nachrichten und X.
  intel: IntelSnapshot | null;
  setIntel: (i: IntelSnapshot) => void;
  // Edelmetalle: derselbe Stand wie in der Ansicht der Edelmetalle (eine geteilte Abfrage).
  metalle: MetalleSnapshot | null;
  // Dokumente, die der Analyst schreibt oder geschrieben hat.
  documents: DocsSnapshot | null;
  setDocuments: (d: DocsSnapshot) => void;
  // Das Projektgedächtnis: bestätigte Projekte und Vorschläge, die auf dein Ja warten.
  projekte: ProjekteSnapshot | null;
  setProjekte: (p: ProjekteSnapshot) => void;
  mailText: Record<number, MailMessage>;
  // Die Mails, die Claude zuletzt geöffnet hat; n zählt mit, damit dieselbe Mail wieder aufklappt.
  spotlight: { uids: number[]; n: number };
  // Was JARVIS sich über dich gemerkt hat.
  memory: MemoryFact[] | null;
  // Lässt sich das Gedächtnis nicht lesen: der feste Satz dazu und, bei einer beschädigten Datei, was die Seite
  // zum Beiseitelegen braucht. Sonst null.
  memoryError: Pick<MemoryStand, "fehler" | "beschaedigt"> | null;
  setMemory: (stand: MemoryStand) => void;
  reloadMemory: () => void;
  state: AvatarState;
  session: Session | null;
  ask: (text: string) => void;
  discuss: (kind: Session["kind"], id: string | number) => void;
  run: (effect: Effect) => Promise<string | undefined>;
  voice: {
    canListen: boolean;
    // Hört von selbst auf „Jarvis“.
    handsFree: boolean;
    // Wartet auf deinen Befehl.
    listening: boolean;
    waiting: boolean;
    // Die Erkennung läuft auf dem Mac selbst.
    local: boolean;
    // JARVIS will gerade sprechen (auch während das Mikrofon offen ist) …
    spricht: boolean;
    // … und ist dabei wirklich zu hören (nicht nur „Spreche …“).
    hoerbar: boolean;
    error: string | null;
    hint: string | null;
    toggle: () => void;
    stopSpeaking: () => void;
    setHandsFree: (on: boolean) => void;
  };
  // Hält JARVIS an: Er hört auf zu sprechen, und Claude hört auf zu schreiben.
  stop: () => void;
};

const JarvisContext = createContext<Jarvis | null>(null);

export function useJarvis(): Jarvis {
  const value = useContext(JarvisContext);
  if (!value) throw new Error("useJarvis braucht den JarvisProvider.");
  return value;
}

// Das Gespräch hat einen eigenen Kontext: Während Claude schreibt, ändert es sich viele Male in der
// Sekunde, und dann sollen nur Verlauf und Leiste neu zeichnen, nicht die ganze Ansicht.
type Conversation = {
  turns: Turn[];
  // Was das Mikrofon gerade versteht, noch bevor du fertig bist.
  interim: string;
  // Fängt ein neues Gespräch an; das Gedächtnis bleibt.
  clearTurns: () => void;
};

const ConversationContext = createContext<Conversation | null>(null);

export function useConversation(): Conversation {
  const value = useContext(ConversationContext);
  if (!value) throw new Error("useConversation braucht den JarvisProvider.");
  return value;
}

let turnId = 0;

// Das Gespräch übersteht ein Neuladen der Seite; gespeichert wird nur in diesem Browser.
const TURNS_KEY = "jarvis-gespraech";
const KEEP_TURNS = 40;

function storedTurns(): Turn[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TURNS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((t): t is Turn => (t?.who === "du" || t?.who === "jarvis") && typeof t?.text === "string" && t.text.trim() !== "")
      .slice(-KEEP_TURNS)
      .map((t) => ({ id: turnId++, who: t.who, text: t.text, alt: true, sources: Array.isArray(t.sources) ? t.sources : undefined, ...(t.fremd === true ? { fremd: true } : {}) }));
  } catch {
    return [];
  }
}

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
  const { data: market, failed: marketAus } = usePolling<MarketSnapshot>("/api/market", 30_000);
  const { data: weather } = usePolling<WeatherSnapshot>("/api/weather", 10 * 60_000);
  const { data: tasks, failed: tasksAus, reload: reloadTasks, set: setTasks } = usePolling<TasksSnapshot>("/api/aufgaben", 60_000);
  const { data: mail, failed: mailAus, reload: loadMail, set: setMail } = usePolling<MailSnapshot>("/api/post", 2 * 60_000);
  const { data: settings, reload: reloadSettings, set: setSettings } = usePolling<Settings>("/api/einstellungen", 30 * 60_000);
  const { data: desk, failed: deskAus, set: setDesk } = usePolling<DeskSnapshot>("/api/handel", 10_000);
  const { data: calendar, failed: calendarAus, reload: loadCalendar, set: setCalendar } = usePolling<CalendarSnapshot>("/api/kalender", 5 * 60_000);
  const { data: intel, failed: intelAus, reload: loadIntel, set: setIntel } = usePolling<IntelSnapshot>("/api/intel", 60_000);
  const { data: metalle } = usePolling<MetalleSnapshot>("/api/metalle", 300_000);
  const { data: documents, failed: documentsAus, reload: loadDocuments, set: setDocuments } = usePolling<DocsSnapshot>("/api/dokumente", 60_000);
  const { data: projekte, failed: projekteAus, set: setProjekte } = usePolling<ProjekteSnapshot>("/api/projekte", 60_000);
  // Je Abfrage: Sie hat noch nie geantwortet, und der letzte Versuch ist gescheitert (usePolling, failed).
  const ausfall = useMemo<Ausfall>(
    () => ({ calendar: calendarAus, tasks: tasksAus, mail: mailAus, projekte: projekteAus, desk: deskAus, intel: intelAus, documents: documentsAus, market: marketAus }),
    [calendarAus, tasksAus, mailAus, projekteAus, deskAus, intelAus, documentsAus, marketAus],
  );
  const { data: memoryData, reload: loadMemory, set: setMemoryData } = usePolling<MemoryStand>("/api/gedaechtnis", 10 * 60_000);
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
  // Die laufende Antwort von Claude; eine neue Frage oder „Stopp“ bricht sie ab.
  const brainAbort = useRef<AbortController | null>(null);

  // Die ElevenLabs-Stimme spricht nur, wenn der Server sie als aktiv meldet; lehnt er ab, lädt die Seite den Zustand neu.
  const cloudOff = useCallback(() => void reloadSettings(), [reloadSettings]);
  const { canListen, handsFree, listening, waiting, interim, local, speaking, hoerbar, error, hint, listen, stopListening, speak, speakStream, stopSpeaking } = useVoice(
    useCallback((text: string) => heard.current(text), []),
    settings?.stimme?.aktiv === true,
    cloudOff,
  );
  const name = settings?.name ?? "Benedikt";

  useEffect(() => {
    // Ins Gespräch gehen Outlook-Termine nur, wenn du es eingeschaltet hast: Was JARVIS hier antwortet, liest
    // das KI-Modell beim nächsten Satz mit. Die Räume zeigen weiter den ganzen Kalender.
    latest.current = { name, market, weather, tasks, mail, desk, calendar: fuerGespraech(calendar), intel, projekte, metalle };
    place.current = pathname;
    history.current = turns;
    brain.current = Boolean(settings?.brain.configured);
  });

  const setSession = useCallback((s: Session | null) => {
    sessionRef.current = s;
    setSessionState(s);
  }, []);

  const addTurn = useCallback((who: Turn["who"], text: string, extra: Partial<Turn> = {}) => {
    const id = turnId++;
    // Was JARVIS selbst zusammensetzt (Briefing, Besprechung, Erinnerung) und dabei Text von Dritten nennt,
    // gilt als fremd, damit der Server danach bei Änderungen nachfragt. Antworten des KI-Gehirns (live) kennzeichnet der Server.
    const fremd = who === "jarvis" && !extra.live && !extra.fremd && enthaeltFremdes(text, latest.current);
    setTurns((prev) => [...prev, { id, who, text, ...extra, ...(fremd ? { fremd: true } : {}) }].slice(-KEEP_TURNS));
    return id;
  }, []);

  const updateTurn = useCallback((id: number, patch: Partial<Turn>) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const clearTurns = useCallback(() => {
    brainAbort.current?.abort();
    setTurns([]);
  }, []);

  // Beim Laden das letzte Gespräch zurückholen, danach jede Änderung sichern.
  const restored = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      restored.current = true;
      const earlier = storedTurns();
      if (earlier.length) setTurns((prev) => [...earlier, ...prev].slice(-KEEP_TURNS));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      const keep = turns.filter((t) => !t.live && t.text.trim()).map(({ who, text, sources, fremd }) => ({ who, text, sources, ...(fremd ? { fremd: true } : {}) }));
      localStorage.setItem(TURNS_KEY, JSON.stringify(keep.slice(-KEEP_TURNS)));
    } catch {
      // Ohne Speicher hält das Gespräch bis zum Neuladen.
    }
  }, [turns]);

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

  // still: Der Befehl wurde von einem neueren Satz überholt (siehe handle). Er wird ausgeführt und steht im
  // Gespräch, aber er spricht nicht, hört nicht zu und nimmt „Denke nach …“ nicht weg: Das alles gehört schon
  // dem neueren Satz, und wer jetzt spräche, bräche dessen Antwort ab.
  const execute = useCallback(
    async (d: Decision, still = false) => {
      const sag = (text: string) => {
        if (!still) speakThenMaybeListen(text);
      };
      let said = "";
      if (d.effect) {
        try {
          said = (await run(d.effect)) ?? "";
        } catch (e) {
          if (!still) setThinking(false);
          const message = e instanceof Error ? e.message : String(e);
          addTurn("jarvis", message);
          sag(message);
          return;
        }
      }
      if (!still) setThinking(false);
      if (d.session !== undefined) setSession(d.session);
      if (d.navigate && d.navigate !== place.current) router.push(d.navigate, { transitionTypes: fahrtArten(place.current, d.navigate) });
      const first = [d.reply, said].filter(Boolean).join(" ");
      // Der vorgelesene Text einer Mail stammt immer von Dritten.
      if (first) addTurn("jarvis", first, said && d.effect?.type === "readMail" ? { fremd: true } : {});
      if (d.after) addTurn("jarvis", d.after);
      sag([first, d.after].filter(Boolean).join(" "));
    },
    [run, addTurn, setSession, router, speakThenMaybeListen],
  );

  const context = useCallback((): CommandContext => ({ ...latest.current, now: new Date(), session: sessionRef.current }), []);

  // Freie Sätze beantwortet Claude auf dem Server. Die Antwort kommt Stück für Stück: Was fertig ist,
  // steht sofort da und wird Satz für Satz gesprochen. Was Claude geändert hat, kommt am Ende frisch zurück.
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
      brainAbort.current?.abort();
      const abort = new AbortController();
      brainAbort.current = abort;
      const speech = speakStream();
      const id = addTurn("jarvis", "", { live: true });
      let written = "";
      let pending = "";
      let result: BrainReply | null = null;
      // Neuer Text höchstens einmal pro Bild auf den Schirm, sonst kommt die Seite beim Schreiben ins Stocken.
      let frame = 0;
      const show = () => {
        frame = 0;
        updateTurn(id, { text: written.replace(/[*#`]+/g, ""), status: undefined });
      };
      // Im Gespräch per Stimme hört JARVIS nach seiner Antwort gleich wieder zu, ohne „Jarvis“.
      const listenAfter = () => {
        if (byVoice.current && !abort.signal.aborted) listen();
      };
      // „Jarvis, stopp“ oder das Mikrofon unterbricht ihn: Claude hört sofort auf, auch mitten in einer Websuche.
      const watch = setInterval(() => {
        if (speech.cancelled()) abort.abort();
      }, 250);
      try {
        for await (const event of postStream<BrainEvent>("/api/gehirn", request, abort.signal)) {
          // Hast du JARVIS unterbrochen, braucht Claude nicht weiterzuschreiben.
          if (speech.cancelled()) {
            abort.abort();
            break;
          }
          if (event.type === "status") updateTurn(id, { status: event.text });
          else if (event.type === "text") {
            written += event.text;
            pending += event.text;
            setThinking(false);
            frame ||= requestAnimationFrame(show);
            const { ready, rest } = takeSentences(pending);
            pending = rest;
            ready.forEach((sentence) => speech.push(sentence));
          } else if (event.type === "navigate") {
            if (event.href !== place.current) router.push(event.href, { transitionTypes: fahrtArten(place.current, event.href) });
          } else if (event.type === "herkunft") updateTurn(id, { fremd: true });
          else if (event.type === "error") throw new Error(event.error);
          else result = event.reply;
        }
      } catch (e) {
        setThinking(false);
        if (abort.signal.aborted) {
          updateTurn(id, { live: false, status: undefined, text: written.trim() ? `${written.trim()} …` : "" });
          return;
        }
        const message = e instanceof Error ? e.message : String(e);
        updateTurn(id, { live: false, status: undefined, text: written.trim() ? `${written.trim()} … ${message}` : message });
        speech.push(message);
        speech.end(listenAfter);
        return;
      } finally {
        clearInterval(watch);
        cancelAnimationFrame(frame);
        if (brainAbort.current === abort) brainAbort.current = null;
      }
      setThinking(false);
      if (!result) {
        // Unterbrochen: Was schon dasteht, bleibt stehen.
        updateTurn(id, { live: false, status: undefined, text: written.trim() ? `${written.trim()} …` : "" });
        return;
      }
      speech.push(takeSentences(pending, true).ready.join(" "));
      updateTurn(id, { live: false, status: undefined, text: result.reply, sources: result.sources, ...(result.fremd ? { fremd: true } : {}) });

      if (result.tasks) setTasks(result.tasks);
      if (result.mail) setMail(result.mail);
      if (result.desk) setDesk(result.desk);
      if (result.calendar) setCalendar(result.calendar);
      if (result.intel) setIntel(result.intel);
      if (result.memory) setMemoryData({ facts: result.memory });
      if (result.documents) setDocuments(result.documents);
      if (result.projekte) setProjekte(result.projekte);
      // Die Post-Ansicht zeigt einen neuen Antwortentwurf sofort (sie fragt /api/entwuerfe selbst ab).
      if (result.entwuerfe) setze("/api/entwuerfe", result.entwuerfe);
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
        calendar: result.calendar ? fuerGespraech(result.calendar) : ctx.calendar,
        intel: result.intel ?? ctx.intel,
      };
      // Führt Claude dich während einer Besprechung in eine andere Ansicht, endet die Besprechung.
      const leaves = Boolean(s && result.navigate && result.navigate !== VIEWS[s.kind]);
      const d: Decision = result.session
        ? startSession(fresh, result.session, result.reply)
        : { reply: result.reply, navigate: result.navigate, ...(leaves ? { session: null } : {}) };
      if (d.session !== undefined) setSession(d.session);
      if (d.navigate && d.navigate !== place.current) router.push(d.navigate, { transitionTypes: fahrtArten(place.current, d.navigate) });
      // Was die Besprechung noch anhängt, kommt dazu, etwa „Bis nächste Woche ist nichts fällig“ oder der erste Punkt.
      const more = d.reply.startsWith(result.reply) ? d.reply.slice(result.reply.length).trim() : "";
      if (more) {
        // Der Anhang der Besprechung (etwa die erste Mail) kann Text von Dritten nennen, auch wenn Claudes Antwort es nicht tat.
        updateTurn(id, { text: `${result.reply} ${more}`, ...(enthaeltFremdes(more, latest.current) ? { fremd: true } : {}) });
        speech.push(more);
      }
      if (d.after) {
        addTurn("jarvis", d.after);
        speech.push(d.after);
      }
      speech.end(listenAfter);
    },
    [context, addTurn, updateTurn, speakStream, listen, router, setSession, setTasks, setMail, setDesk, setCalendar, setIntel, setMemoryData, setDocuments, setProjekte],
  );

  // Sätze, die abgeschickt, aber noch nicht in Arbeit sind: die Uhr, die sie startet, und der Satz dazu.
  const pending = useRef(new Map<ReturnType<typeof setTimeout>, string>());
  const handle = useCallback(
    (text: string, fromVoice: boolean) => {
      const clean = text.trim();
      if (!clean) return;
      // Kommt ein Satz, während der davor noch wartet (ein doppelter Klick, zwei Sätze der Spracheingabe):
      // Derselbe Satz noch einmal zählt nicht. Sonst geht der wartende nicht verloren und nicht doppelt los: Ein
      // fester Befehl wird jetzt gleich ausgeführt (still: Er steht im Gespräch, gesprochen wird die Antwort auf den
      // neuen Satz), eine Frage an das KI-Gehirn entfällt, die neue löst sie ab.
      const wartende = [...pending.current];
      if (wartende.some(([, satz]) => satz === clean)) return;
      pending.current.clear();
      for (const [uhr, satz] of wartende) {
        clearTimeout(uhr);
        const vorher = decide(satz, context(), brain.current);
        if (vorher) void execute(vorher, true);
      }
      byVoice.current = fromVoice;
      // Eine neue Frage beendet die alte Antwort.
      brainAbort.current?.abort();
      const earlier = history.current
        .filter((t) => !t.live && t.text.trim())
        .slice(-24)
        .map(({ who, text, fremd }) => ({ who, text, ...(fremd ? { fremd: true } : {}) }));
      addTurn("du", clean);
      setThinking(true);
      // Einen Augenblick später geht es los. Nach „Anhalten“ in diesem Augenblick geht der Satz nicht mehr los
      // (siehe stop); im Gespräch bleibt er stehen, wie eine Frage, die beim Nachdenken angehalten wurde.
      const wartet = setTimeout(() => {
        pending.current.delete(wartet);
        const decision = decide(clean, context(), brain.current);
        if (decision) execute(decision);
        else askBrain(clean, earlier);
      }, 350);
      pending.current.set(wartet, clean);
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

  const stop = useCallback(() => {
    // Auch was gerade erst abgeschickt wurde und noch nicht unterwegs ist: Es geht nicht mehr los.
    if (pending.current.size) {
      for (const uhr of pending.current.keys()) clearTimeout(uhr);
      pending.current.clear();
      setThinking(false);
    }
    brainAbort.current?.abort();
    stopSpeaking();
  }, [stopSpeaking]);

  const toggle = useCallback(() => {
    if (listening) stopListening();
    else listen();
  }, [listening, listen, stopListening]);

  // Leertaste: sprechen, solange gerade kein Eingabefeld aktiv ist. Escape: JARVIS unterbrechen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Die Leertaste gehört dem, was markiert ist (Feld, Knopf, Verweis, Aufklapper). Nur wenn nichts markiert
      // ist, schaltet sie das Mikrofon.
      const bedient = target?.closest(BEDIENBAR);
      if (e.key === "Escape") stop();
      if (e.code !== "Space" || bedient || e.repeat || !canListen) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, stop, canListen]);

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
      const { text, mitTitel } = erinnerungsSatz(due, minutes, calendar.outlook?.extern === true);
      addTurn("jarvis", text);
      speak(text);
      if (!mitTitel) return;
      // Gehört der Termin zu einem Projekt, blendet JARVIS ein, was dazu festgehalten ist.
      void getJson<{ vorbereitung: { projekt: string; text: string; fremd: boolean }[] }>(`/api/projekte?termin=${encodeURIComponent(due.title)}`)
        .then(({ vorbereitung }) => {
          for (const v of vorbereitung) addTurn("jarvis", v.text, v.fremd ? { fremd: true } : {});
        })
        .catch(() => {});
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
    const text = done ? (asked.focus ? searchSentence(result) : intelSentence(intel, new Date())) : `Das hat nicht geklappt. ${alsSatz(intel.error ?? "Grok hat nicht geantwortet.")}`;
    addTurn("jarvis", text);
    speak(text);
  }, [intel, addTurn, speak]);

  // Schreibt der Analyst, alle drei Sekunden nachsehen, sonst reicht jede Minute.
  useEffect(() => {
    if (!documents?.running) return;
    const timer = setTimeout(() => void loadDocuments(), 3000);
    return () => clearTimeout(timer);
  }, [documents, loadDocuments]);

  // Wird ein Dokument fertig, das du am Mac bestellt hast, sagt JARVIS es dir. Bestellungen vom Handy
  // kommen dorthin zurück; der Mac bleibt dann still.
  const writing = useRef(new Set<string>());
  useEffect(() => {
    if (!documents) return;
    if (documents.running?.from === "mac") writing.current.add(documents.running.id);
    for (const job of documents.jobs) {
      if (job.state === "laeuft" || !writing.current.has(job.id)) continue;
      writing.current.delete(job.id);
      const text = docDoneSentence(job, true);
      addTurn("jarvis", text);
      speak(text);
    }
  }, [documents, addTurn, speak]);

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
      ausfall,
      calendar,
      setCalendar,
      reloadCalendar: () => loadCalendar("?force=1"),
      intel,
      setIntel,
      metalle,
      documents,
      setDocuments,
      projekte,
      setProjekte,
      mailText,
      spotlight,
      memory: memoryData?.facts ?? null,
      memoryError: memoryData?.fehler ? { fehler: memoryData.fehler, beschaedigt: memoryData.beschaedigt } : null,
      setMemory: setMemoryData,
      reloadMemory: () => void loadMemory(),
      state,
      session,
      ask,
      discuss,
      run,
      voice: { canListen, handsFree, listening, waiting, local, spricht: speaking, hoerbar, error, hint, toggle, stopSpeaking, setHandsFree },
      stop,
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
      ausfall,
      calendar,
      setCalendar,
      loadCalendar,
      intel,
      setIntel,
      metalle,
      documents,
      setDocuments,
      projekte,
      setProjekte,
      mailText,
      spotlight,
      memoryData,
      setMemoryData,
      loadMemory,
      state,
      session,
      ask,
      discuss,
      run,
      canListen,
      handsFree,
      listening,
      waiting,
      local,
      speaking,
      hoerbar,
      error,
      hint,
      toggle,
      stopSpeaking,
      stop,
    ],
  );

  const conversation = useMemo<Conversation>(() => ({ turns, interim, clearTurns }), [turns, interim, clearTurns]);

  return (
    <JarvisContext.Provider value={value}>
      <ConversationContext.Provider value={conversation}>{children}</ConversationContext.Provider>
    </JarvisContext.Provider>
  );
}
