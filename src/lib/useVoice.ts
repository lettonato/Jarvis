"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { GRUND_TEXT, stuecke } from "./stimme";
import { afterWake, forSpeech, isStop, looksLikeEcho, sentences, stopsSpeech } from "./voiceText";

// Sprache über die Web Speech API des Browsers: kostenlos und ohne Schlüssel.
// Freihändig läuft das Mikrofon durchgehend und wartet auf „Jarvis“; was danach kommt, ist der Befehl.
// Nach seiner Antwort hört JARVIS ein paar Sekunden weiter zu, ohne dass du wieder „Jarvis“ sagen musst.
// Chrome erkennt die Sprache auf dem Mac selbst, wenn das deutsche Sprachpaket da ist, sonst über Google; Safari über Apple.
// Gesprochen wird mit einer Stimme des Macs. Ist in den Einstellungen die ElevenLabs-Stimme eingeschaltet, holt
// die Seite den Ton Satz für Satz vom JARVIS-Server; geht dort etwas nicht, spricht sofort wieder der Mac.

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
  // Beim Sprechen ist wirklich etwas zu hören: Der Mac hat einen Satz begonnen, oder ein Clip der Wolkenstimme läuft.
  // (speaking allein heißt nur, dass JARVIS sprechen will; ein Browser ohne Stimme bleibt dabei stumm.)
  hoerbar: boolean;
  // Die Spracherkennung läuft auf dem Mac selbst, nichts geht dafür ins Netz.
  local: boolean;
  error: string | null;
  hint: string | null;
};

export type SpeechStream = {
  push: (text: string) => void;
  end: (onDone?: () => void) => void;
  cancelled: () => boolean;
};

const NO_SOUND_HINT = "Klick einmal irgendwo auf die Seite, dann darf ich dir auch laut antworten.";
// Ein leerer Ton: Mit ihm bekommt der Spieler beim ersten Klick die Erlaubnis des Browsers, später von selbst zu sprechen.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

type ClipFail = { status: number; text: string | null };

// Ein Satz als Ton vom JARVIS-Server: die Adresse des Clips, oder womit es scheiterte (Status 0: kein Netz).
// Der Fehlertext ist ein Satz des JARVIS-Servers, nie der Text von ElevenLabs.
async function fetchClip(text: string, signal: AbortSignal): Promise<string | ClipFail> {
  try {
    const res = await fetch("/api/stimme", { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1" }, body: JSON.stringify({ text }), signal });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      return { status: res.status, text: typeof body?.error === "string" ? body.error : null };
    }
    return URL.createObjectURL(await res.blob());
  } catch {
    return { status: 0, text: null };
  }
}

// Für die Wolkenstimme: Sätze wie beim Mac, zu lange noch einmal geteilt, damit jeder in eine Anfrage passt.
const pieces = (said: string) => sentences(said).flatMap((chunk) => stuecke(chunk));

type CloudQueue = { add: (text: string) => void; stop: () => void };

const QUIET: VoiceState = { listening: false, waiting: false, interim: "", speaking: false, hoerbar: false, local: false, error: null, hint: null };

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
  let audible = false;
  let lastSpoken = "";
  let spokeUntil = 0;
  let utterances: SpeechSynthesisUtterance[] = [];
  let hinted = false;
  // Wolkenstimme (ElevenLabs über den JARVIS-Server)
  let cloud = false;
  let cloudPausedUntil = 0;
  // Der Browser hat den Ton abgelehnt: bis zum nächsten erfolgreichen Klick nichts mehr bei ElevenLabs holen.
  let soundBlocked = false;
  let told = "";
  let onCloudOff: () => void = () => {};
  let clipEl: HTMLAudioElement | null = null;
  let clipDone: (() => void) | null = null;
  let unlocked = false;
  let stopCloud: (() => void) | null = null;

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
    // „Stopp“ allein, während er spricht: sofort still, ohne dass du erst „Jarvis“ sagen musst.
    // Nur bei einem fertig gehörten Satz: „Stopp mal kurz …“ oder „das ist halt so“ sollen ihn nicht abwürgen.
    if (rest === null && final && speakingText && stopsSpeech(final, speakingText)) {
      stopSpeaking(false);
      return;
    }
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
    if (cloud && !unlocked) unlock();
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

  // Jetzt ist JARVIS wirklich zu hören (ein Satz hat begonnen). Zählt nur, solange er noch spricht.
  function laut() {
    if (!speakingText || audible) return;
    audible = true;
    emit({ hoerbar: true });
  }

  function ended(freshMic: boolean) {
    lastSpoken = speakingText;
    spokeUntil = Date.now();
    speakingText = "";
    utterances = [];
    audible = false;
    emit({ speaking: false, hoerbar: false });
    // Damit JARVIS seine eigene Stimme nicht als Befehl nimmt, hört das Mikrofon danach neu an.
    if (freshMic && rec) fresh();
  }

  function stopSpeaking(freshMic = true) {
    speechRun++;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    stopCloud?.();
    stopCloud = null;
    if (speakingText) ended(freshMic);
  }

  const cloudOn = () => cloud && !soundBlocked && Date.now() >= cloudPausedUntil;

  // Bei einem Klick: Der Spieler darf ab jetzt von selbst Ton abspielen (Safari verlangt das). Erst wenn das
  // wirklich geklappt hat, gilt er als frei; sonst versucht es der nächste Klick wieder.
  function unlock() {
    try {
      const el = (clipEl ??= new Audio());
      const free = () => {
        unlocked = true;
        soundBlocked = false;
      };
      // Läuft schon ein Satz, ist die Erlaubnis da. Wird gerade einer geholt, bleibt der Spieler unberührt.
      if (!el.paused) return free();
      // stopCloud steht nur, solange eine Schlange wirklich arbeitet; danach und nach einem Fehler ist es leer,
      // damit genau der Klick, um den JARVIS nach einer Blockade bittet, den Ton freigibt.
      if (stopCloud) return;
      el.src = SILENCE;
      // Nicht anhalten, wenn es losgeht: Bis dahin kann schon ein echter Satz laufen. Der leere Ton endet von selbst.
      void el.play().then(free, () => {});
    } catch {
      // Dann meldet sich der Browser beim ersten Satz, und der Mac spricht.
    }
  }

  function playClip(url: string): Promise<"ok" | "blocked" | "error"> {
    return new Promise((resolve) => {
      const el = (clipEl ??= new Audio());
      const finish = (r: "ok" | "blocked" | "error") => {
        clearTimeout(stuck);
        el.onended = null;
        el.onerror = null;
        clipDone = null;
        resolve(r);
      };
      // Kommt der Ton nie zum Ende (Ausgabegerät weg, Browser hält an), geht es nach einer Minute mit dem Mac weiter.
      const stuck = setTimeout(() => finish("error"), 60_000);
      // Ein verspätetes „zu Ende“ vom vorigen Ton zählt nicht: Erst wenn dieser Clip wirklich durch ist.
      el.onended = () => {
        if (el.ended) finish("ok");
      };
      el.onerror = () => finish("error");
      clipDone = () => finish("error");
      el.src = url;
      el.play().then(laut, (e: unknown) => finish((e as { name?: string } | null)?.name === "NotAllowedError" ? "blocked" : "error"));
    });
  }

  // Holt Satz für Satz den Ton und spielt ihn nacheinander ab; der nächste Satz wird schon geholt, während der
  // aktuelle läuft. Scheitert etwas, bekommt onFail die Sätze, die noch nicht zu hören waren, und den Grund
  // (Statuscode des Servers, 0 ohne Netz, -1 wenn der Browser keinen Ton erlaubt, -2 wenn der Clip nicht spielt).
  function cloudQueue(live: () => boolean, onEnd: () => void, onFail: (rest: string[], why: ClipFail) => void): CloudQueue {
    const texts: string[] = [];
    const clips: Promise<string | ClipFail>[] = [];
    const urls: string[] = [];
    const ctrl = new AbortController();
    let next = 0;
    let busy = false;
    let dead = false;
    const load = (i: number) =>
      (clips[i] ??= fetchClip(texts[i], ctrl.signal).then((r) => {
        if (typeof r === "string") urls.push(r);
        return r;
      }));
    const close = () => {
      dead = true;
      ctrl.abort();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    const fail = (i: number, why: ClipFail) => {
      close();
      onFail(texts.slice(i), why);
    };
    async function pump() {
      if (busy || dead) return;
      busy = true;
      while (!dead && live() && next < texts.length) {
        const i = next;
        const clip = await load(i);
        if (dead || !live()) break;
        if (typeof clip !== "string") return fail(i, clip);
        if (i + 1 < texts.length) void load(i + 1);
        const played = await playClip(clip);
        if (dead || !live()) break;
        if (played !== "ok") return fail(i, { status: played === "blocked" ? -1 : -2, text: null });
        next = i + 1;
        onEnd();
      }
      busy = false;
    }
    return {
      add(text: string) {
        if (dead) return;
        texts.push(text);
        if (busy && texts.length - 1 === next + 1) void load(next + 1);
        void pump();
      },
      stop() {
        if (dead) return;
        close();
        clipEl?.pause();
        clipDone?.();
      },
    };
  }

  // Die Wolkenstimme konnte nicht; der Mac spricht weiter. Je nach Grund wird erst nach einem Klick, nach einer
  // Minute oder nach zehn Minuten wieder bei ElevenLabs gefragt. Den Grund erfährst du einmal, nicht bei jedem Satz.
  function cloudFailed(why: ClipFail) {
    const tell = (text: string) => {
      if (told === text) return;
      told = text;
      hinted = true;
      emit({ hint: text });
    };
    if (why.status === -1) {
      soundBlocked = true;
      unlocked = false;
      tell(NO_SOUND_HINT);
      return;
    }
    if (why.status === -2) return;
    if (why.status === 409 || why.status === 429 || why.status === 403) {
      // Ausgeschaltet, Tageslimit erreicht oder Not-Aus: Der Server sagt Nein. Die Seite lädt den Zustand neu;
      // bleibt er „an“ (ein Satz passte nur nicht mehr ganz ins Limit), wird später wieder gefragt.
      cloudPausedUntil = Date.now() + 10 * 60_000;
      if (why.status === 429) tell(GRUND_TEXT.limit);
      onCloudOff();
      return;
    }
    cloudPausedUntil = Date.now() + 60_000;
    if (why.text) tell(`${why.text} Solange spreche ich mit der Stimme des Macs.`);
    onCloudOff();
  }

  // Spricht den Text Satz für Satz und meldet sich, wenn alles gesagt ist.
  function speak(text: string, onDone?: () => void) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    const said = forSpeech(text);
    const viaCloud = typeof window !== "undefined" && cloudOn();
    if ((!synth && !viaCloud) || !said) {
      onDone?.();
      return;
    }
    synth?.cancel();
    stopCloud?.();
    stopCloud = null;
    const run = ++speechRun;
    const done = () => {
      if (run !== speechRun) return;
      speechRun++;
      ended(true);
      onDone?.();
    };
    speakingText = said;
    // Ein neuer Satz setzt an: Zu hören ist er erst, wenn er wirklich beginnt (auch wenn eben noch der vorige lief).
    audible = false;
    emit({ speaking: true, hoerbar: false });
    if (viaCloud) {
      const parts = pieces(said);
      let open = parts.length;
      const queue = cloudQueue(
        () => run === speechRun,
        () => {
          if (--open === 0) {
            // Die Schlange ist leer: Ein Klick darf den Ton jetzt wieder freigeben (siehe unlock).
            if (stopCloud === queue.stop) stopCloud = null;
            done();
          }
        },
        (rest, why) => {
          if (stopCloud === queue.stop) stopCloud = null;
          cloudFailed(why);
          if (synth && run === speechRun) speakLocal(synth, rest, run, done);
          else done();
        },
      );
      stopCloud = queue.stop;
      parts.forEach(queue.add);
      return;
    }
    speakLocal(synth!, sentences(said), run, done);
  }

  // Die Sätze mit der Stimme des Macs.
  function speakLocal(synth: SpeechSynthesis, chunks: string[], run: number, done: () => void) {
    const voice = pickVoice(synth);
    let started = false;
    // Die Sätze festhalten: Sonst räumt Chrome sie weg, bevor sie fertig sind, und das Ende kommt nie an.
    utterances = chunks.map((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = LANG;
      if (voice) u.voice = voice;
      u.rate = 1.03;
      u.onstart = () => {
        started = true;
        if (run === speechRun) laut();
      };
      u.onend = () => {
        if (i === chunks.length - 1) done();
      };
      u.onerror = (e) => {
        if (e.error === "not-allowed" && run === speechRun) {
          hinted = true;
          emit({ hint: NO_SOUND_HINT });
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

  // Spricht eine Antwort, die noch entsteht: Jeder fertige Satz kommt mit push in die Schlange, end sagt,
  // dass nichts mehr kommt. Unterbrichst du JARVIS, ist der Strom vorbei (cancelled) und push tut nichts mehr.
  function speakStream(): SpeechStream {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    synth?.cancel();
    stopCloud?.();
    stopCloud = null;
    if (speakingText) ended(false);
    const run = ++speechRun;
    const voice = synth ? pickVoice(synth) : undefined;
    let viaCloud = typeof window !== "undefined" && cloudOn();
    let queue: CloudQueue | null = null;
    let open = 0;
    let finished = false;
    let started = false;
    let mute = !synth && !viaCloud;
    let onDone: (() => void) | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const live = () => run === speechRun;
    const done = () => {
      clearTimeout(watchdog);
      if (!live()) return;
      speechRun++;
      if (speakingText) ended(true);
      onDone?.();
    };
    const settle = () => {
      if (finished && open === 0) done();
    };
    // Ein Satz mit der Stimme des Macs.
    const sayLocal = (chunk: string) => {
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = LANG;
      if (voice) u.voice = voice;
      u.rate = 1.03;
      u.onstart = () => {
        started = true;
        if (live()) laut();
      };
      u.onend = () => {
        open = Math.max(0, open - 1);
        settle();
      };
      u.onerror = (e) => {
        open = Math.max(0, open - 1);
        if (e.error === "not-allowed" && live()) {
          hinted = true;
          mute = true;
          emit({ hint: NO_SOUND_HINT });
        }
        settle();
      };
      open++;
      utterances.push(u);
      synth.speak(u);
      // Hat der Browser keine Stimme, beginnt er nie zu sprechen: dann still weiter, nur auf dem Bildschirm.
      if (!started && !watchdog)
        watchdog = setTimeout(() => {
          if (started || !live()) return;
          mute = true;
          open = 0;
          synth.cancel();
          settle();
        }, 3000);
    };
    // Ein Satz mit der Wolkenstimme. Scheitert sie, sagt der Mac den Rest, und die Antwort geht bei ihm weiter.
    const sayCloud = (piece: string) => {
      queue ??= cloudQueue(
        live,
        () => {
          open = Math.max(0, open - 1);
          if (open === 0 && queue && stopCloud === queue.stop) stopCloud = null;
          settle();
        },
        (rest, why) => {
          viaCloud = false;
          if (queue && stopCloud === queue.stop) stopCloud = null;
          cloudFailed(why);
          open = Math.max(0, open - rest.length);
          if (!synth) mute = true;
          else rest.forEach(sayLocal);
          settle();
        },
      );
      stopCloud = queue.stop;
      open++;
      queue.add(piece);
    };
    return {
      push(text: string) {
        const said = forSpeech(text);
        if (!live() || mute || !said) return;
        if (!speakingText) emit({ speaking: true });
        speakingText = `${speakingText} ${said}`.trim();
        if (viaCloud) pieces(said).forEach(sayCloud);
        else sentences(said).forEach(sayLocal);
      },
      end(callback?: () => void) {
        onDone = callback;
        finished = true;
        if (!live()) return;
        settle();
      },
      cancelled: () => !live(),
    };
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
    setCloud: (on: boolean, off: () => void) => {
      if (on !== cloud) {
        // Neu ein- oder ausgeschaltet: frisch anfangen, auch mit den Hinweisen.
        cloudPausedUntil = 0;
        told = "";
      }
      cloud = on;
      onCloudOff = off;
    },
    listen,
    stopListening: () => command(false),
    speak,
    speakStream,
    stopSpeaking: () => stopSpeaking(true),
    gesture,
    visible,
    dispose,
  };
}

// cloud: Die ElevenLabs-Stimme ist eingeschaltet und darf gerade sprechen. onCloudOff: Der Server hat sie abgelehnt
// (Tageslimit, ausgeschaltet, Not-Aus); die Seite kann dann die Einstellungen neu laden.
export function useVoice(onHeard: (text: string) => void, cloud = false, onCloudOff?: () => void) {
  const canListen = useSyncExternalStore(subscribe, () => recognitionCtor() !== undefined, () => false);
  const handsFree = useSyncExternalStore(subscribeHandsFree, readHandsFree, () => false);
  const [state, setState] = useState<VoiceState>(QUIET);
  const [voice] = useState(() => createVoice((patch) => setState((s) => ({ ...s, ...patch }))));

  useEffect(() => voice.setOnHeard(onHeard), [voice, onHeard]);

  useEffect(() => {
    voice.setHandsFree(canListen && handsFree);
  }, [voice, canListen, handsFree]);

  useEffect(() => {
    voice.setCloud(cloud, onCloudOff ?? (() => {}));
  }, [voice, cloud, onCloudOff]);

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
    speakStream: voice.speakStream,
    stopSpeaking: voice.stopSpeaking,
  };
}
