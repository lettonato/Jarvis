"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ParticleHead, type AvatarState } from "./ParticleHead";
import { ModuleCard, type Telemetry } from "./ModuleCard";
import { runCommand } from "@/lib/commands";
import { formatClock, formatEur, formatPct } from "@/lib/format";
import type { MarketSnapshot } from "@/lib/market";
import { CURRENT_PHASE, MODULES, type ModuleId } from "@/lib/modules";
import { usePolling } from "@/lib/usePolling";
import { useVoice } from "@/lib/useVoice";
import type { WeatherSnapshot } from "@/lib/weather";

type Turn = { who: "du" | "jarvis"; text: string };

const SUGGESTIONS = ["Guten Morgen", "Wie ist das Wetter?", "Bitcoin-Kurs", "Was machen die Memecoins?", "Öffne den Trading-Desk"];

const STATE_LABEL: Record<AvatarState, string> = {
  idle: "Bereit",
  listening: "Ich höre zu …",
  thinking: "Denke nach …",
  speaking: "Spreche …",
};

function telemetryFor(market: MarketSnapshot | null, weather: WeatherSnapshot | null): Partial<Record<ModuleId, Telemetry>> {
  const btc = market?.majors.quotes.find((q) => q.symbol === "BTC");
  const passed = market?.scan.candidates.filter((c) => c.passed).length ?? 0;
  return {
    trading: market ? { value: `${passed}/${market.scan.candidates.length}`, detail: "Coins bestehen die Filter" } : undefined,
    markt: btc ? { value: formatEur(btc.eur), detail: `BTC ${formatPct(btc.change24h)} in 24 Std` } : undefined,
    wetter: weather ? { value: `${Math.round(weather.temperature)} °C`, detail: `${weather.place}, ${weather.description}` } : undefined,
  };
}

export function CommandCenter() {
  const router = useRouter();
  const market = usePolling<MarketSnapshot>("/api/market", 30_000);
  const weather = usePolling<WeatherSnapshot>("/api/weather", 10 * 60_000);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const heard = useRef<(text: string) => void>(() => {});

  const voice = useVoice(useCallback((text: string) => heard.current(text), []));

  const handle = useCallback(
    (text: string) => {
      setTurns((prev) => [...prev, { who: "du" as const, text }].slice(-4));
      setThinking(true);
      setTimeout(() => {
        const result = runCommand(text, { market, weather, now: new Date() });
        setThinking(false);
        setTurns((prev) => [...prev, { who: "jarvis" as const, text: result.reply }].slice(-4));
        voice.speak(result.reply);
        if (result.navigate) {
          const target = result.navigate;
          setTimeout(() => router.push(target), 1800);
        }
      }, 450);
    },
    [market, weather, voice, router],
  );

  useEffect(() => {
    heard.current = handle;
  }, [handle]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const clock = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(clock);
    };
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    handle(draft.trim());
    setDraft("");
  };

  const state: AvatarState = voice.listening ? "listening" : thinking ? "thinking" : voice.speaking ? "speaking" : "idle";
  const telemetry = telemetryFor(market, weather);
  const left = MODULES.slice(0, 4);
  const right = MODULES.slice(4);
  const demo = market?.majors.source === "demo" || weather?.source === "demo";

  return (
    <main className="relative flex min-h-full flex-1 flex-col bg-[radial-gradient(ellipse_at_center,_#16204a_0%,_#090b18_65%)]">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-sky-400/70 bg-sky-500/10 shadow-[0_0_18px_rgba(56,189,248,0.45)]">
            <span className="text-lg font-bold text-sky-300">J</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-[0.35em] text-sky-100">JARVIS</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-quiet">Kommandozentrale</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] tracking-widest">
          <span className="rounded border border-up/40 px-2 py-1 text-up">● SYSTEM ONLINE</span>
          {demo && <span className="rounded bg-amber-500/15 px-2 py-1 text-amber-300">BEISPIELDATEN</span>}
          <span className="rounded border border-line px-2 py-1 text-quiet">PHASE {CURRENT_PHASE}</span>
          <span className="rounded bg-panel-2 px-2 py-1 font-bold text-sky-100">{now ? formatClock(now) : "--:--:--"}</span>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 sm:px-6 lg:grid-cols-[minmax(230px,290px)_1fr_minmax(230px,290px)] lg:[perspective:1400px]">
        <div className="order-2 grid grid-cols-2 gap-3 lg:order-none lg:grid-cols-1 lg:content-center lg:[transform-style:preserve-3d]">
          {left.map((m) => (
            <ModuleCard key={m.id} module={m} telemetry={telemetry[m.id]} tilt="left" />
          ))}
        </div>

        <section className="order-1 flex min-w-0 flex-col items-center lg:order-none">
          <div className="relative h-[46vh] min-h-[300px] w-full max-w-[760px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)]">
            <ParticleHead state={state} />
          </div>
          <p className="-mt-6 mb-3 rounded-full border border-sky-300/30 bg-desk/70 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-sky-200">
            {STATE_LABEL[state]}
          </p>
          <VoiceConsole
            turns={turns}
            canListen={voice.canListen}
            listening={voice.listening}
            error={voice.error}
            onMic={voice.listening ? voice.stopListening : voice.listen}
            draft={draft}
            setDraft={setDraft}
            submit={submit}
            suggest={handle}
          />
        </section>

        <div className="order-3 grid grid-cols-2 gap-3 lg:order-none lg:grid-cols-1 lg:content-center lg:[transform-style:preserve-3d]">
          {right.map((m) => (
            <ModuleCard key={m.id} module={m} telemetry={telemetry[m.id]} tilt="right" />
          ))}
        </div>
      </div>
    </main>
  );
}

function VoiceConsole(props: {
  turns: Turn[];
  canListen: boolean;
  listening: boolean;
  error: string | null;
  onMic: () => void;
  draft: string;
  setDraft: (v: string) => void;
  submit: (e: FormEvent) => void;
  suggest: (text: string) => void;
}) {
  const { turns, canListen, listening, error, onMic, draft, setDraft, submit, suggest } = props;
  return (
    <div className="w-full max-w-[640px] rounded-xl border border-sky-300/20 bg-panel/70 p-3 backdrop-blur-sm">
      <div className="min-h-16 space-y-1 text-sm">
        {turns.length === 0 && (
          <p className="text-quiet">
            {canListen ? "Tippe aufs Mikrofon und sprich mit mir, oder schreib unten." : "Schreib mir unten. Sprechen geht in Chrome oder Edge."}
          </p>
        )}
        {turns.map((t, i) => (
          <p key={i} className={t.who === "jarvis" ? "text-sky-100" : "text-quiet"}>
            <span className={`mr-2 text-[10px] font-bold tracking-widest ${t.who === "jarvis" ? "text-sky-300" : "text-frame"}`}>
              {t.who === "jarvis" ? "JARVIS" : "DU"}
            </span>
            {t.text}
          </p>
        ))}
        {error && <p className="text-down">{error}</p>}
      </div>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        {canListen && (
          <button
            type="button"
            onClick={onMic}
            aria-label={listening ? "Zuhören beenden" : "Sprechen"}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${
              listening
                ? "animate-pulse border-sky-300 bg-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.8)]"
                : "border-sky-300/50 bg-sky-400/10 hover:bg-sky-400/20"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-100" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Frag JARVIS …"
          className="min-w-0 flex-1 rounded-lg border border-line bg-desk/80 px-3 py-2.5 text-sm text-ink placeholder:text-quiet focus:border-sky-300/60 focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-sky-500/80 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500">
          Senden
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => suggest(s)}
            className="rounded-full border border-sky-300/20 px-2.5 py-1 text-[11px] text-sky-200/80 hover:border-sky-300/50 hover:text-sky-100"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
