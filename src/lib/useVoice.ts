"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { afterWake, forSpeech, isStop, looksLikeEcho, sentences } from "./voiceText";

// Sprache über die Web Speech API des Browsers: kostenlos und ohne Schlüssel.
// Freihändig läuft das Mikrofon durchgehend und wartet auf „Jarvis“; was danach kommt, ist der Befehl.
// Nach seiner Antwort hört JARVIS ein paar Sekunden weiter zu, ohne dass du wieder „Jarvis“ sagen musst.
// Chrome erkennt die Sprache auf dem Mac selbst, wenn das deutsche Sprachpaket da ist, sonst über Google; Safari über Apple.

type Result = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type RecognitionResultEvent = { resultIndex: number; results: ArrayLike<Result> };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onstart: (() => void) | null;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type LocalOptions = { langs: string[]; processLocally: boolean };

type RecognitionCtor = (new () => Recognition) & {
  available?: (o: LocalOptions) => Promise<string>;
  install?: (o: LocalOptions) => Promise<boolean>;
};

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const LANG = "de-DE";
const LOCAL: LocalOptions = { langs: [LANG], processLocally: true };
// So lange wartet JARVIS nach „Jarvis“, nach dem Mikrofon-Knopf oder nach seiner Antwort auf deinen Satz.
const COMMAND_MS = 8000;

const subscribe = () => () => {};

export const VOICE_KEY = "jarvis-stimme";
const HANDS_FREE_KEY = "jarvis-freihand";

// Freihändig ist an, bis du es ausschaltest. Die Wahl gilt für diesen Browser.
let handsFreeFallback = true;
const handsFreeListeners = new Set<() => void>();

function readHandsFree(): boolean {
  try {
    const stored = localStorage.getItem(HANDS_FREE_KEY);
    return stored === null ? handsFreeFallback : stored !== "aus";
  } catch {
    return handsFreeFallback;
  }
}

export function setHandsFree(on: boolean) {
  handsFreeFallback = on;
  try {
    localStorage.setItem(HANDS_FREE_KEY, on ? "an" : "aus");
  } catch {
    // Dann gilt die Wahl bis zum Neuladen.
  }
  handsFreeListeners.forEach((f) => f());
}

function subscribeHandsFree(f: () => void) {
  handsFreeListeners.add(f);
  window.addEventListener("storage", f);
  return () => {
    handsFreeListeners.delete(f);
    window.removeEventListener("storage", f);
  };
}

// Die in den Einstellungen gewählte Stimme, sonst eine gute deutsche, am liebsten eine männliche wie im Film.
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("de"));
  let chosen: string | null = null;
  try {
    chosen = localStorage.getItem(VOICE_KEY);
  } catch {
    // Ohne Speicher die Standardstimme.
  }
  const male = /Yannick|Markus|Viktor|Martin|Conrad|Killian/;
  const fine = /Premium|Erweitert|Enhanced|Natural/;
  return (
    voices.find((v) => v.name === chosen) ??
    voices.find((v) => male.test(v.name) && fine.test(v.name)) ??
    voices.find((v) => fine.test(v.name)) ??
    voices.find((v) => /Google Deutsch/.test(v.name)) ??
    voices.find((v) => male.test(v.name)) ??
    voices[0]
  );
}

// Ein kurzer Doppelton, wenn JARVIS „Jarvis“ gehört hat und auf deinen Befehl wartet.
let audio: AudioContext | null = null;
function chime() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const ctx = audio;
    const t = ctx.currentTime;
    [880, 1320].forEach((hz, i) => {
      const at = t + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.06, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.1);
    });
  } catch {
    // Ohne Ton geht es auch, der Kopf zeigt das Zuhören.
  }
}

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Ich darf das Mikrofon nicht benutzen. Klick in der Adresszeile links auf das Symbol, erlaube das Mikrofon und lade die Seite neu.",
  "service-not-allowed": "Der Browser lässt keine Spracherkennung zu. In Safari muss dafür unter Systemeinstellungen → Tastatur das Diktat eingeschaltet sein.",
  "audio-capture": "Ich finde kein Mikrofon. Schau in den Systemeinstellungen unter Ton → Eingang, ob eins gewählt ist.",
};

export type VoiceState = {
  // Wartet auf deinen Befehl (nach „Jarvis“ oder dem Mikrofon-Knopf).
  listening: boolean;
  // Das Mikrofon läuft und wartet auf „Jarvis“.
  waiting: boolean;
  // Was gerade ankommt, noch bevor du fertig bist.
  interim: string;
  speaking: boolean;
  // Die Spracherkennung läuft auf dem Mac selbst, nichts geht dafür ins Netz.
  local: boolean;
  error: string | null;
  hint: string | null;
};

const QUIET: VoiceState = { listening: false, waiting: false, interim: "", speaking: false, local: false, error: null, hint: null };

// Mikrofon und Stimme als kleine Maschine außerhalb von React; die Seite bekommt nur den Zustand.
function createVoice(emit: (patch: Partial<VoiceState>) => void) {
  let onHeard: (text: string) => void = () => {};
  let handsFree = false;
  let commanding = false;
  let rec: Recognition | null = null;
  let gen = 0;
  let startedAt = 0;
  let quickEnds = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let commandTimer: ReturnType<typeof setTimeout> | undefined;
  let lastVoiceAt = 0;
  let blocked = false;
  let chimed = false;
  let local = false;
  let localChecked = false;
  let localInstallable = false;
  // Sprachausgabe
  let speechRun = 0;
  let speakingText = "";
  let lastSpoken = "";
  let spokeUntil = 0;
  let utterances: SpeechSynthesisUtterance[] = [];
  let hinted = false;

  const wanted = () => handsFree || commanding;

  function start() {
    clearTimeout(restartTimer);
    const Ctor = recognitionCtor();
    if (!Ctor || rec || blocked || !wanted()) return;
    const r = new Ctor();
    r.lang = LANG;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    if (local) r.processLocally = true;
    const mine = ++gen;
    r.onstart = () => {
      if (mine === gen) emit({ waiting: handsFree, error: null });
    };
    r.onresult = (e) => {
      if (mine === gen) heard(e);
    };
    r.onerror = (e) => {
      if (mine === gen) failed(e.error);
    };
    r.onend = () => {
      if (mine !== gen) return;
      rec = null;
      again();
    };
    rec = r;
    startedAt = Date.now();
    try {
      r.start();
    } catch {
      rec = null;
      again();
    }
  }

  // Der Browser beendet die Erkennung immer wieder (Stille, Netz, nach einer Minute). Dann gleich wieder an;
  // endet sie jedes Mal sofort, mit wachsender Pause, damit nichts im Kreis läuft.
  function again() {
    if (!wanted() || blocked) {
      emit({ waiting: false });
      return;
    }
    quickEnds = Date.now() - startedAt < 2000 ? quickEnds + 1 : 0;
    const delay = quickEnds > 3 ? Math.min(30_000, 1000 * 2 ** (quickEnds - 3)) : 200;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(start, delay);
  }

  // Neue Runde: Was noch vom Lautsprecher im Erkenner steckt, fällt weg.
  function fresh() {
    const r = rec;
    gen++;
    rec = null;
    try {
      r?.abort();
    } catch {
      // Schon beendet.
    }
    clearTimeout(restartTimer);
    restartTimer = setTimeout(start, 150);
  }

  function stopMic() {
    clearTimeout(restartTimer);
    const r = rec;
    gen++;
    rec = null;
    try {
      r?.abort();
    } catch {
      // Schon beendet.
    }
    emit({ waiting: false });
  }

  function command(on: boolean) {
    commanding = on;
    chimed = false;
    clearTimeout(commandTimer);
    emit({ listening: on, interim: "" });
    if (on) {
      lastVoiceAt = 0;
      commandTimer = setTimeout(expire, COMMAND_MS);
      start();
    } else if (!handsFree) stopMic();
  }

  // Kommt nichts, hört er wieder nur auf „Jarvis“. Sprichst du noch, wartet er, bis du fertig bist.
  function expire() {
    if (Date.now() - lastVoiceAt < 1500) {
      commandTimer = setTimeout(expire, 1500);
      return;
    }
    command(false);
  }

  function heard(e: RecognitionResultEvent) {
    let final = "";
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const text = res[0]?.transcript ?? "";
      if (res.isFinal) final += text;
      else interim += text;
    }
    final = final.trim();
    interim = interim.trim();
    const said = final || interim;
    if (!said) return;
    const now = Date.now();
    const recent = speakingText || (now - spokeUntil < 2500 ? lastSpoken : "");

    if (commanding && !speakingText) {
      lastVoiceAt = now;
      const text = (afterWake(said) ?? said).trim();
      if (!final) {
        emit({ interim: text });
        return;
      }
      // Der Rest seines eigenen Satzes, kurz nachdem er fertig ist, zählt nicht als Befehl.
      const tail = now - spokeUntil < 1200 && recent.toLowerCase().includes(text.toLowerCase());
      if (!text || tail || looksLikeEcho(text, recent)) return;
      command(false);
      if (!isStop(text)) onHeard(text);
      return;
    }

    // Wartet auf „Jarvis“. Sagt JARVIS selbst gerade „Jarvis“, ist das kein Weckwort.
    const rest = afterWake(said);
    if (rest === null || /jarvis/i.test(recent)) {
      if (final && chimed) {
        chimed = false;
        emit({ listening: false, interim: "" });
      }
      return;
    }
    // „Jarvis …“, während er spricht: Er hört auf und dir zu.
    if (speakingText) stopSpeaking(false);
    if (!final) {
      if (!chimed) {
        chimed = true;
        chime();
      }
      emit({ listening: true, interim: rest });
      return;
    }
    if (!rest) {
      if (!chimed) chime();
      command(true);
      return;
    }
    chimed = false;
    emit({ listening: false, interim: "" });
    if (!isStop(rest)) onHeard(rest);
  }

  function failed(error: string) {
    if (error === "no-speech" || error === "aborted") return;
    if (error === "network") {
      emit({ error: "Für die Spracherkennung braucht der Browser gerade Internet. Ich versuche es weiter." });
      return;
    }
    if (error === "language-not-supported" && local) {
      // Das Sprachpaket auf dem Mac taugt nicht: dann wie bisher über den Browser.
      local = false;
      emit({ local: false });
      return;
    }
    if (MIC_ERRORS[error]) {
      blocked = true;
      commanding = false;
      clearTimeout(commandTimer);
      // Im Hintergrund darf der Browser manchmal nicht ans Mikrofon; sobald du zurück bist, geht es weiter.
      if (document.hidden) {
        emit({ listening: false, waiting: false, interim: "" });
        return;
      }
      // Manche Browser (Safari) lassen das Mikrofon erst nach einem Klick zu: dann erst darum bitten, beim Klick neu versuchen.
      if (error === "not-allowed" && navigator.userActivation && !navigator.userActivation.hasBeenActive) {
        hinted = true;
        emit({ listening: false, waiting: false, interim: "", hint: "Klick einmal irgendwo auf die Seite, dann höre ich zu." });
        return;
      }
      emit({ listening: false, waiting: false, interim: "", error: MIC_ERRORS[error] });
      return;
    }
    emit({ error: `Spracherkennung: ${error}` });
  }

  // Kann Chrome Deutsch auf dem Mac selbst erkennen, nimmt er das, dann geht kein Ton ins Netz.
  async function checkLocal() {
    if (localChecked) return;
    localChecked = true;
    const Ctor = recognitionCtor();
    if (!Ctor?.available) return;
    try {
      const status = await Ctor.available(LOCAL);
      if (status === "available") goLocal();
      else if (status === "downloadable" || status === "downloading") localInstallable = true;
    } catch {
      // Dann eben über den Browser.
    }
  }

  function goLocal() {
    local = true;
    emit({ local: true });
    if (rec) fresh();
  }

  async function installLocal() {
    localInstallable = false;
    try {
      if (await recognitionCtor()?.install?.(LOCAL)) goLocal();
    } catch {
      // Dann eben über den Browser.
    }
  }

  // Ein Klick oder Tastendruck: Jetzt darf der Browser sprechen, das Sprachpaket laden und das Mikrofon neu fragen.
  function gesture() {
    if (hinted) {
      hinted = false;
      emit({ hint: null });
    }
    if (localInstallable) void installLocal();
    if (blocked && handsFree) {
      blocked = false;
      start();
    }
  }

  function visible() {
    if (document.hidden || !handsFree) return;
    blocked = false;
    start();
  }

  function setHandsFreeMode(on: boolean) {
    if (on === handsFree) return;
    handsFree = on;
    if (on) {
      blocked = false;
      void checkLocal().finally(start);
    } else if (!commanding) stopMic();
  }

  // Mikrofon-Knopf, Leertaste oder die Nachfrage nach einer Antwort.
  function listen() {
    if (!recognitionCtor()) return;
    blocked = false;
    stopSpeaking(false);
    command(true);
  }

  function ended(freshMic: boolean) {
    lastSpoken = speakingText;
    spokeUntil = Date.now();
    speakingText = "";
    utterances = [];
    emit({ speaking: false });
    // Damit JARVIS seine eigene Stimme nicht als Befehl nimmt, hört das Mikrofon danach neu an.
    if (freshMic && rec) fresh();
  }

  function stopSpeaking(freshMic = true) {
    speechRun++;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (speakingText) ended(freshMic);
  }

  // Spricht den Text Satz für Satz und meldet sich, wenn alles gesagt ist.
  function speak(text: string, onDone?: () => void) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    const said = forSpeech(text);
    if (!synth || !said) {
      onDone?.();
      return;
    }
    synth.cancel();
    const run = ++speechRun;
    const voice = pickVoice(synth);
    const chunks = sentences(said);
    let started = false;
    const done = () => {
      if (run !== speechRun) return;
      speechRun++;
      ended(true);
      onDone?.();
    };
    speakingText = said;
    emit({ speaking: true });
    // Die Sätze festhalten: Sonst räumt Chrome sie weg, bevor sie fertig sind, und das Ende kommt nie an.
    utterances = chunks.map((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = LANG;
      if (voice) u.voice = voice;
      u.rate = 1.03;
      u.onstart = () => {
        started = true;
      };
      u.onend = () => {
        if (i === chunks.length - 1) done();
      };
      u.onerror = (e) => {
        if (e.error === "not-allowed" && run === speechRun) {
          hinted = true;
          emit({ hint: "Klick einmal irgendwo auf die Seite, dann darf ich dir auch laut antworten." });
          done();
          return;
        }
        if (i === chunks.length - 1) done();
      };
      return u;
    });
    utterances.forEach((u) => synth.speak(u));
    // Hat der Browser keine Stimme, beginnt er nie zu sprechen: dann nicht ewig „Spreche …“ anzeigen.
    setTimeout(() => {
      if (!started) done();
    }, 3000);
  }

  function dispose() {
    handsFree = false;
    commanding = false;
    clearTimeout(commandTimer);
    stopMic();
    stopSpeaking(false);
  }

  return {
    setOnHeard: (f: (text: string) => void) => {
      onHeard = f;
    },
    setHandsFree: setHandsFreeMode,
    listen,
    stopListening: () => command(false),
    speak,
    stopSpeaking: () => stopSpeaking(true),
    gesture,
    visible,
    dispose,
  };
}

export function useVoice(onHeard: (text: string) => void) {
  const canListen = useSyncExternalStore(subscribe, () => recognitionCtor() !== undefined, () => false);
  const handsFree = useSyncExternalStore(subscribeHandsFree, readHandsFree, () => false);
  const [state, setState] = useState<VoiceState>(QUIET);
  const [voice] = useState(() => createVoice((patch) => setState((s) => ({ ...s, ...patch }))));

  useEffect(() => voice.setOnHeard(onHeard), [voice, onHeard]);

  useEffect(() => {
    voice.setHandsFree(canListen && handsFree);
  }, [voice, canListen, handsFree]);

  useEffect(() => {
    const gesture = () => voice.gesture();
    const visible = () => voice.visible();
    window.addEventListener("pointerdown", gesture, true);
    window.addEventListener("keydown", gesture, true);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("pointerdown", gesture, true);
      window.removeEventListener("keydown", gesture, true);
      document.removeEventListener("visibilitychange", visible);
      voice.dispose();
    };
  }, [voice]);

  return {
    canListen,
    handsFree: canListen && handsFree,
    ...state,
    listen: voice.listen,
    stopListening: voice.stopListening,
    speak: voice.speak,
    stopSpeaking: voice.stopSpeaking,
  };
}
