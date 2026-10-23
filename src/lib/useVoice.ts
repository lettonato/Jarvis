"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

// Sprache über die Web Speech API des Browsers: kostenlos und ohne Schlüssel.
// Spracherkennung können Chrome und Edge; Firefox kann nur vorlesen, dort bleibt das Textfeld.

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

export function useVoice(onHeard: (text: string) => void) {
  const canListen = useSyncExternalStore(subscribe, () => recognitionCtor() !== undefined, () => false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);

  const listen = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    window.speechSynthesis?.cancel();
    const r = new Ctor();
    r.lang = "de-DE";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) onHeard(text);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Bitte das Mikrofon im Browser erlauben." : e.error);
    r.onend = () => setListening(false);
    recognition.current = r;
    setError(null);
    setListening(true);
    r.start();
  }, [onHeard]);

  const stopListening = useCallback(() => recognition.current?.stop(), []);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    const voice = synth.getVoices().find((v) => v.lang.startsWith("de"));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }, []);

  return { canListen, listening, speaking, error, listen, stopListening, speak };
}
