"use client";

import { useState, type FormEvent } from "react";
import { useJarvis } from "./JarvisProvider";
import { Button, inputClass, Notice } from "./ui";
import { postJson } from "@/lib/api";
import { EIGENE_HOECHSTENS, zielImSatz, zielName, type DesktopZiel } from "@/lib/desktop";
import type { Settings } from "@/lib/settings";

// Welche Programme und Ordner JARVIS am Mac auf Zuruf öffnen darf (src/lib/desktop.ts). Jede Zeile hat ihren
// Schalter und einen Knopf zur Probe: Ob der Mac ein Programm unter diesem Namen findet, zeigt sich erst beim Öffnen.
export function ProgrammeSetup() {
  const { settings, setSettings } = useJarvis();
  const d = settings?.desktop;
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Jede Änderung und jede Probe: eine nach der anderen, und die Meldung gehört immer zum letzten Klick.
  async function tue(lauf: () => Promise<string | null>): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const text = await lauf();
      setMessage(text ? { tone: "ok", text } : null);
      return true;
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const aendere = (body: object) =>
    tue(async () => {
      const next = await postJson<Settings & { message?: string }>("/api/einstellungen", body);
      setSettings(next);
      return next.message ?? null;
    });
  const oeffne = (z: DesktopZiel) =>
    tue(async () => {
      await postJson("/api/desktop", { id: z.id });
      return `Der Mac öffnet ${zielImSatz(z)}.`;
    });
  const neu = async (e: FormEvent) => {
    e.preventDefault();
    if (await aendere({ action: "desktopNeu", name })) setName("");
  };

  if (!d) return null;
  const programme = d.ziele.filter((z) => z.art === "programm");
  const ordner = d.ziele.filter((z) => z.art === "ordner");
  const eigene = programme.filter((z) => z.eigen).length;

  const zeile = (z: DesktopZiel) => (
    <li key={z.id} className="flex items-center justify-between gap-3" data-ziel={z.id}>
      <label className="flex min-w-0 items-center gap-3 text-schiefer/85">
        <input type="checkbox" className="h-4 w-4 shrink-0 accent-gletscher" checked={z.an} disabled={busy} onChange={(e) => aendere({ action: "desktopSchalter", id: z.id, an: e.target.checked })} />
        <span className="truncate">{z.name}</span>
      </label>
      <span className="flex shrink-0 gap-2">
        <Button small disabled={busy || !z.an || !d.moeglich} onClick={() => oeffne(z)}>
          Öffnen<span className="sr-only"> {zielName(z)}</span>
        </Button>
        {z.eigen && (
          <Button small tone="danger" disabled={busy} onClick={() => aendere({ action: "desktopWeg", id: z.id })}>
            Entfernen<span className="sr-only"> {z.name}</span>
          </Button>
        )}
      </span>
    </li>
  );

  return (
    <div className="space-y-4 text-sm">
      {!d.moeglich && <Notice tone="error">Programme und Ordner öffnen kann JARVIS nur auf dem Mac. Er läuft gerade auf einem anderen Rechner.</Notice>}
      <div>
        <h3 className="mb-2 text-xs font-semibold text-quiet">Programme</h3>
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2" data-liste="programme">
          {programme.map(zeile)}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold text-quiet">Ordner</h3>
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2" data-liste="ordner">
          {ordner.map(zeile)}
        </ul>
      </div>
      <form onSubmit={neu} className="space-y-2 border-t border-schiefer/10 pt-4">
        <label className="block text-xs text-quiet" htmlFor="programm-neu">
          Eigenes Programm, so wie es im Ordner „Programme“ heißt ({eigene} von {EIGENE_HOECHSTENS})
        </label>
        <div className="flex gap-2">
          <input id="programm-neu" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="zum Beispiel Notion" className={`${inputClass} sm:max-w-xs`} />
          <Button type="submit" tone="primary" fest disabled={busy || !name.trim() || eigene >= EIGENE_HOECHSTENS}>
            Hinzufügen
          </Button>
        </div>
      </form>
      {message && <Notice meldung tone={message.tone}>{message.text}</Notice>}
      <ul className="space-y-1 text-xs text-schiefer/85">
        <li>· JARVIS öffnet nur. In den Programmen tippt, klickt und liest er nichts, und er schließt nichts.</li>
        <li>· Es geht nur am Mac selbst, nicht über Telegram. Jedes Öffnen steht im Audit-Log unter Sicherheit.</li>
        <li>
          · Wörter, die in JARVIS schon etwas heißen, bleiben: „Dokumente“ meint weiter den Raum Dokumente in JARVIS; den Ordner am Mac öffnest du mit „Öffne den Ordner
          Dokumente“. Genauso bei Bildern. Die Programme Mail und Notizen von Apple heißen hier „Apple Mail“ und „Apple Notizen“.
        </li>
      </ul>
    </div>
  );
}
