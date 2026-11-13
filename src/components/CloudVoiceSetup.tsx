"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useJarvis } from "./JarvisProvider";
import { Button, inputClass, Notice } from "./ui";
import { getJson, postJson } from "@/lib/api";
import type { Settings } from "@/lib/settings";
import { GRUND_TEXT, STIMME_LIMIT_MAX, STIMME_LIMIT_MIN, STIMME_MODELLE, type StimmeKonto, type StimmeStatus, type StimmeWahl } from "@/lib/stimme";

// Die ElevenLabs-Stimme einrichten: Schlüssel, Stimme, Schalter, Tageslimit. Der Schlüssel geht nur an den
// JARVIS-Server auf diesem Mac und kommt von dort nie zurück. Eingeschaltet wird nichts von selbst.

type Lage = { status: StimmeStatus; stimmen?: StimmeWahl[]; konto?: StimmeKonto | null; fehler?: string | null };

const zahl = (n: number) => n.toLocaleString("de-DE");

export function CloudVoiceSetup() {
  const { settings, setSettings } = useJarvis();
  const stimme = settings?.stimme;
  const [key, setKey] = useState("");
  const [limit, setLimit] = useState(String(stimme?.tagesZeichen ?? ""));
  const [lage, setLage] = useState<Lage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const configured = stimme?.configured === true;

  const laden = useCallback(async () => {
    try {
      setLage(await getJson<Lage>("/api/stimme?liste=1"));
    } catch {
      // Die Liste kommt beim nächsten Versuch; der Zustand steht schon in den Einstellungen.
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    const t = setTimeout(() => void laden(), 0);
    return () => clearTimeout(t);
  }, [configured, laden]);

  async function send(body: object, done?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await postJson<Settings & { message?: string }>("/api/einstellungen", body);
      setSettings(next);
      setKey("");
      setLimit(String(next.stimme.tagesZeichen));
      const text = next.message ?? done;
      setMessage(text ? { tone: "ok", text } : null);
      if (next.stimme.configured) void laden();
      else setLage(null);
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  // Die Probe liest immer denselben festen Satz, auch wenn die Stimme noch ausgeschaltet ist.
  async function probe() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stimme", { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1" }, body: JSON.stringify({ probe: true }) });
      if (!res.ok) {
        const fehler = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(fehler.error ?? `Der Server antwortet mit ${res.status}.`);
      }
      const url = URL.createObjectURL(await res.blob());
      const el = (player.current ??= new Audio());
      el.onended = () => URL.revokeObjectURL(url);
      el.src = url;
      await el.play();
      void laden();
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send({ action: "elevenlabs", apiKey: key });
  };
  const saveLimit = (e: FormEvent) => {
    e.preventDefault();
    void send({ action: "elevenlabsPrefs", tagesZeichen: Number(limit.replace(/\./g, "")) }, "Tageslimit gespeichert.");
  };

  const stimmen = lage?.stimmen ?? [];
  const konto = lage?.konto ?? null;
  const heute = lage?.status.heuteZeichen ?? stimme?.heuteZeichen ?? 0;
  const bremse = stimme?.enabled && stimme.grund && stimme.grund !== "aus" ? GRUND_TEXT[stimme.grund] : null;

  return (
    <div className="space-y-3 text-sm" data-stimme={stimme?.aktiv ? "an" : "aus"}>
      <h3 className="text-xs font-bold text-stein">Natürlichere Stimme mit ElevenLabs</h3>
      <p className="text-schiefer/85">
        Mit einem Schlüssel von ElevenLabs klingt JARVIS wie ein Mensch. Das ist ein Zusatz: Ohne Schlüssel, ausgeschaltet oder über dem Tageslimit spricht er mit
        der Stimme deines Macs weiter.
      </p>
      {configured && (
        <Notice tone={stimme.aktiv ? "ok" : "info"}>
          Verbunden mit dem Schlüssel {stimme.hint}. {stimme.aktiv ? `JARVIS spricht mit „${stimme.voiceName ?? "deiner Stimme"}“.` : stimme.enabled ? "" : "Die ElevenLabs-Stimme ist aus, es spricht der Mac."}{" "}
          Heute vorgelesen: {zahl(heute)} von {zahl(stimme.tagesZeichen)} Zeichen.
          {konto && ` Dein ElevenLabs-Konto${konto.tarif ? ` (Tarif ${konto.tarif})` : ""} hat diesen Monat ${zahl(konto.verbraucht)} von ${zahl(konto.limit)} Zeichen verbraucht.`}
        </Notice>
      )}
      {bremse && <Notice tone="error">{bremse}</Notice>}
      {configured && stimme.fehler && <Notice tone="error">Zuletzt hat es nicht geklappt: {stimme.fehler} Solange spricht der Mac.</Notice>}
      {lage?.fehler && <Notice tone="error">{lage.fehler}</Notice>}
      <form onSubmit={submit} className="space-y-3">
        {!configured && (
          <ol className="list-decimal space-y-1 pl-5 text-schiefer/85">
            <li>
              Auf{" "}
              <a href="https://elevenlabs.io" target="_blank" rel="noreferrer" className="text-see underline hover:text-schiefer">
                elevenlabs.io
              </a>{" "}
              anmelden und dort die Stimme, die dir gefällt, zu „Meine Stimmen“ hinzufügen.
            </li>
            <li>Unter „Developers“ → „API Keys“ einen Schlüssel erstellen und hier einfügen. Er braucht die Rechte für Text zu Sprache und zum Lesen der Stimmen.</li>
            <li>Danach hier die Stimme auswählen, Probe hören und einschalten.</li>
          </ol>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={stimme?.hint ? `gespeichert (${stimme.hint}), zum Ändern neuen einfügen` : "sk_…"}
            aria-label="ElevenLabs-Schlüssel"
            className={inputClass}
          />
          <Button type="submit" tone="primary" fest disabled={busy || !key.trim()}>
            {busy ? "Prüfe …" : "Prüfen und speichern"}
          </Button>
        </div>
      </form>
      {configured && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-quiet">
              Stimme
              <select
                value={stimme.voiceId ?? ""}
                disabled={busy || stimmen.length === 0}
                onChange={(e) => e.target.value && void send({ action: "elevenlabsPrefs", voiceId: e.target.value })}
                className={inputClass}
                aria-label="ElevenLabs-Stimme"
              >
                <option value="">{stimmen.length === 0 ? "Stimmen laden …" : "Bitte wählen"}</option>
                {stimmen.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.deutsch ? " (Deutsch)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-quiet">
              Qualität und Tempo
              <select value={stimme.model} disabled={busy} onChange={(e) => void send({ action: "elevenlabsPrefs", model: e.target.value })} className={inputClass} aria-label="ElevenLabs-Modell">
                {STIMME_MODELLE.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-quiet">{STIMME_MODELLE.find((m) => m.id === stimme.model)?.text} Fehlt deine Wunschstimme, füge sie bei ElevenLabs zu „Meine Stimmen“ hinzu.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-3 text-sm text-schiefer/85">
              <input
                type="checkbox"
                checked={stimme.enabled}
                disabled={busy || !stimme.voiceId}
                onChange={(e) => void send({ action: "elevenlabsPrefs", enabled: e.target.checked }, e.target.checked ? "Eingeschaltet. Ab jetzt spreche ich mit dieser Stimme." : "Ausgeschaltet. Es spricht wieder der Mac.")}
                className="h-4 w-4 accent-gletscher"
                aria-label="Mit der ElevenLabs-Stimme sprechen"
              />
              Mit dieser Stimme sprechen
            </label>
            <Button small disabled={busy || !stimme.voiceId} onClick={() => void probe()}>
              Probe hören
            </Button>
          </div>
          <form onSubmit={saveLimit} className="flex flex-wrap items-center gap-2">
            <label htmlFor="stimme-limit" className="text-xs text-quiet">
              Höchstens so viele Zeichen am Tag an ElevenLabs
            </label>
            <input id="stimme-limit" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} className={inputClass} style={{ width: "7rem" }} />
            <Button type="submit" disabled={busy}>
              Speichern
            </Button>
          </form>
          <p className="text-xs text-quiet">
            Zwischen {zahl(STIMME_LIMIT_MIN)} und {zahl(STIMME_LIMIT_MAX)}. Eine Antwort von JARVIS hat meist 200 bis 400 Zeichen. Ist das Limit erreicht, spricht bis zum
            nächsten Tag der Mac. ElevenLabs berechnet jedes vorgelesene Zeichen aus deinem Tarif dort, auch die Probe.
          </p>
        </>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <p className="text-xs text-quiet">
        Wichtig: Ist die Stimme eingeschaltet, geht jeder Satz, den JARVIS laut vorliest, an die Server von ElevenLabs. Das kann auch Inhalt aus Mails, Terminen und
        Aufgaben sein. Was er nur auf dem Bildschirm zeigt, bleibt hier. Beim Not-Aus geht nichts hinaus.
      </p>
      {configured && (
        <Button tone="danger" disabled={busy} onClick={() => void send({ action: "removeElevenlabs" })}>
          Schlüssel entfernen
        </Button>
      )}
    </div>
  );
}
