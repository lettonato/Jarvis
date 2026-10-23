"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Sprache über die Web Speech API des Browsers: kostenlos und ohne Schlüssel.
// Spracherkennung können Chrome und Edge; Safari und Firefox können nur vorlesen, dort bleibt das Textfeld.

type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const subscribe = () => () => {};

export const VOICE_KEY = "jarvis-stimme";

// Bevorzugte deutsche Stimmen: zuerst die in den Einstellungen gewählte, dann gute Standardstimmen.
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
  let chosen: string | null = null;
  try {
    chosen = localStorage.getItem(VOICE_KEY);
  } catch {
    // Ohne Speicher die Standardstimme.
  }
  return (
    voices.find((v) => v.name === chosen) ??
    voices.find((v) => /Google Deutsch/.test(v.name)) ??
    voices.find((v) => /Markus|Yannick|Anna|Helena/.test(v.name)) ??
    voices[0]
  );
}

// Lange Texte in Sätze teilen: Chrome bricht sonst nach etwa 15 Sekunden mitten im Satz ab.
function sentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["“”]?\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  for (const p of parts.map((s) => s.trim()).filter(Boolean)) {
    const last = chunks[chunks.length - 1];
    if (last && last.length + p.length < 180) chunks[chunks.length - 1] = `${last} ${p}`;
    else chunks.push(p);
  }
  return chunks;
}

export function useVoice(onHeard: (text: string) => void) {
  const canListen = useSyncExternalStore(subscribe, () => recognitionCtor() !== undefined, () => false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const speechRun = useRef(0);

  const listen = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    window.speechSynthesis?.cancel();
    speechRun.current++;
    setSpeaking(false);
    recognition.current?.stop();
    const r = new Ctor();
    r.lang = "de-DE";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) onHeard(text);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(e.error === "not-allowed" ? "Bitte das Mikrofon im Browser erlauben." : `Spracherkennung: ${e.error}`);
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [onHeard]);

  const stopListening = useCallback(() => recognition.current?.stop(), []);

  const stopSpeaking = useCallback(() => {
    speechRun.current++;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  // Spricht den Text Satz für Satz und meldet sich, wenn alles gesagt ist.
  const speak = useCallback((text: string, onDone?: () => void) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || !text.trim()) {
      onDone?.();
      return;
    }
    synth.cancel();
    const run = ++speechRun.current;
    const voice = pickVoice(synth);
    const chunks = sentences(text);
    let started = false;
    setSpeaking(true);
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = "de-DE";
      if (voice) u.voice = voice;
      u.rate = 1.03;
      u.onstart = () => {
        started = true;
      };
      const finish = () => {
        if (run !== speechRun.current) return;
        if (i === chunks.length - 1) {
          setSpeaking(false);
          onDone?.();
        }
      };
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    });
    // Hat der Browser keine Stimme, beginnt er nie zu sprechen: dann nicht ewig „Spreche …“ anzeigen.
    setTimeout(() => {
      if (started || run !== speechRun.current) return;
      speechRun.current++;
      setSpeaking(false);
      onDone?.();
    }, 3000);
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return { canListen, listening, speaking, error, listen, stopListening, speak, stopSpeaking };
}
