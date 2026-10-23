"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { MailSetup, VaultSetup } from "../setup";
import { Button, inputClass, Notice, PageHeader, Panel } from "../ui";
import { postJson } from "@/lib/api";
import type { Settings } from "@/lib/settings";
import { VOICE_KEY } from "@/lib/useVoice";

// Einstellungen: wie JARVIS dich nennt, welcher Obsidian-Tresor und welches Postfach, welche Stimme.

export function SettingsView() {
  const { settings } = useJarvis();
  return (
    <main className="view-enter mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="einstellungen" title="Einstellungen" subtitle="Alles bleibt auf deinem Mac." />
      {!settings ? (
        <p className="text-sm text-quiet">Lade Einstellungen …</p>
      ) : (
        <>
          <Section title="Du">
            <NameForm />
          </Section>
          <Section title="Obsidian" text="Aus diesem Tresor liest JARVIS deine Aufgaben. Neue Aufgaben landen in JARVIS/Eingang.md, Notizen in JARVIS/Notizen.md.">
            <VaultSetup />
          </Section>
          <Section title="E-Mail" text="JARVIS liest deinen Posteingang über IMAP. Er löscht nichts und verschickt nichts; markieren als gelesen geht nur auf deinen Zuruf.">
            <MailSetup />
          </Section>
          <Section title="Stimme">
            <VoicePicker />
          </Section>
          <Section title="Sicherheit">
            <ul className="space-y-1.5 text-sm text-sky-50/85">
              <li>JARVIS läuft nur auf diesem Mac (127.0.0.1). Andere Geräte im WLAN erreichen ihn nicht.</li>
              <li>Webseiten, die du im Browser offen hast, können JARVIS nicht fernsteuern und deine Daten nicht lesen.</li>
              <li>
                Deine Einstellungen samt Mail-Passwort liegen in <code className="text-sky-200">{settings.configFile}</code>, lesbar nur für deinen Benutzer.
              </li>
            </ul>
          </Section>
        </>
      )}
    </main>
  );
}

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <Panel>
      <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-sky-100">{title}</h2>
      {text && <p className="mt-1 text-xs text-quiet">{text}</p>}
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

function NameForm() {
  const { settings, setSettings } = useJarvis();
  const [name, setName] = useState(settings?.name ?? "");
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSettings(await postJson<Settings>("/api/einstellungen", { action: "name", name }));
      setState({ tone: "ok", text: "Gespeichert." });
    } catch (err) {
      setState({ tone: "error", text: err instanceof Error ? err.message : String(err) });
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-xs text-quiet" htmlFor="jarvis-name">
        So spricht JARVIS dich an
      </label>
      <div className="flex gap-2">
        <input id="jarvis-name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} sm:max-w-xs`} />
        <Button type="submit" tone="primary" disabled={!name.trim()}>
          Speichern
        </Button>
      </div>
      {state && <Notice tone={state.tone}>{state.text}</Notice>}
    </form>
  );
}

function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [chosen, setChosen] = useState("");

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => setVoices(synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de")));
    const first = setTimeout(() => {
      load();
      try {
        setChosen(localStorage.getItem(VOICE_KEY) ?? "");
      } catch {
        // Ohne Speicher bleibt die Standardstimme.
      }
    }, 0);
    synth.addEventListener("voiceschanged", load);
    return () => {
      clearTimeout(first);
      synth.removeEventListener("voiceschanged", load);
    };
  }, []);

  const choose = (name: string) => {
    setChosen(name);
    try {
      if (name) localStorage.setItem(VOICE_KEY, name);
      else localStorage.removeItem(VOICE_KEY);
    } catch {
      // Dann gilt die Wahl nur bis zum Neuladen.
    }
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find((v) => v.name === name);
    if (synth) {
      synth.cancel();
      const u = new SpeechSynthesisUtterance("Hallo, so klinge ich jetzt.");
      u.lang = "de-DE";
      if (voice) u.voice = voice;
      synth.speak(u);
    }
  };

  if (voices.length === 0) return <p className="text-sm text-quiet">Dieser Browser bietet keine deutschen Stimmen an. In Chrome und Safari auf dem Mac gibt es mehrere.</p>;
  return (
    <div className="space-y-2">
      <select value={chosen} onChange={(e) => choose(e.target.value)} className={`${inputClass} sm:max-w-sm`} aria-label="Stimme von JARVIS">
        <option value="">Automatisch</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-quiet">
        Mehr und bessere Stimmen bekommst du auf dem Mac unter Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte → Systemstimme → Stimmen verwalten.
      </p>
    </div>
  );
}
