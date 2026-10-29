"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "../icons";
import { Button, inputClass, LinkButton, Notice, PageHeader, Panel } from "../ui";
import { getJson, postJson } from "@/lib/api";
import { BROWSER_RULES, hostLabel, MAX_MINUTES, TASK_LABEL, type BrowserStatus } from "@/lib/browser";

// Browser: Hier gibst du JARVIS einen Auftrag fürs Web und siehst live mit, was er im Chrome-Fenster tut.
// Den Auftrag kannst du auch einfach sagen oder per Telegram schreiben.

const EXAMPLES = [
  "Such mir die drei günstigsten Winterreifen 205/55 R16 von Michelin und nenn Preis und Shop.",
  "Wann hat der Wertstoffhof in Deggendorf am Samstag offen?",
  "Öffne die Seite der Stadtwerke Deggendorf und such das Formular für den Zählerstand.",
];

const clock = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function BrowserView() {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = status?.task?.state === "laeuft";

  // Läuft ein Auftrag, schaut die Seite jede Sekunde nach, sonst alle paar Sekunden.
  useEffect(() => {
    let alive = true;
    const load = () =>
      getJson<BrowserStatus>("/api/browser")
        .then((next) => alive && setStatus(next))
        .catch(() => {});
    load();
    const timer = setInterval(load, running ? 1_000 : 5_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [running]);

  async function send(body: object) {
    setBusy(true);
    setError(null);
    try {
      setStatus(await postJson<BrowserStatus>("/api/browser", body));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await send({ action: "auftrag", text })) setText("");
  };

  const task = status?.task ?? null;
  const subtitle = running ? `arbeitet: ${task!.auftrag}` : status?.open ? "Chrome ist offen" : "sucht und erledigt im Web für dich";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="browser" holo="modul-browser" title="Browser" subtitle={subtitle}>
        {running && (
          <Button icon="stopp" tone="danger" disabled={busy} onClick={() => send({ action: "stopp" })}>
            Anhalten
          </Button>
        )}
        {status?.open && (
          <Button icon="extern" disabled={busy} onClick={() => send({ action: "zeigen" })}>
            Fenster zeigen
          </Button>
        )}
        {status?.open && !running && (
          <Button disabled={busy} onClick={() => send({ action: "schliessen" })}>
            Chrome schließen
          </Button>
        )}
      </PageHeader>

      {status && !status.ready && (
        <Panel className="max-w-2xl">
          <p className="mb-3 text-sm text-quiet">Den Browser bedient Claude, das KI-Gehirn von JARVIS. Dafür braucht es den Claude-Schlüssel.</p>
          <LinkButton href="/einstellungen#gehirn" icon="einstellungen">
            Claude-Schlüssel eintragen
          </LinkButton>
        </Panel>
      )}

      {status?.ready && (
        <Panel>
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Was soll ich im Web erledigen?"
              aria-label="Auftrag für den Browser"
              disabled={running}
              className={inputClass}
            />
            <Button type="submit" tone="primary" icon="browser" disabled={busy || running || !text.trim()}>
              {running ? "Läuft …" : "Los"}
            </Button>
          </form>
          {!running && !task && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="rounded-full border border-sky-300/25 bg-sky-400/5 px-3 py-1 text-left text-xs text-sky-100/80 transition hover:border-sky-300/60 hover:text-sky-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-quiet">
            Du kannst es auch sagen, etwa „Jarvis, such mir …“, oder per Telegram schreiben. Ein Auftrag dauert meist ein bis drei Minuten, höchstens {MAX_MINUTES}.
          </p>
        </Panel>
      )}

      {(error || status?.error) && <Notice tone="error">{error ?? status?.error}</Notice>}

      {task && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Panel glow={running}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-sky-100">Schritte</h2>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${running ? "text-sky-300" : task.state === "fertig" ? "text-green-300" : "text-red-300"}`}>
                {running && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-sky-300 align-middle" aria-hidden />}
                {TASK_LABEL[task.state]}
              </span>
            </div>
            <p className="mb-3 text-sm text-sky-50/90">„{task.auftrag}“</p>
            <ol className="max-h-[22rem] space-y-1.5 overflow-y-auto pr-1 text-xs" aria-live="polite">
              {task.steps.map((s, i) => (
                <li key={`${s.at}-${i}`} className={`flex gap-2 ${s.blocked ? "text-amber-200" : "text-sky-50/80"}`}>
                  <span className="shrink-0 font-mono text-quiet">{clock(s.at)}</span>
                  {s.blocked && <Icon name="schild" className="mt-px h-3.5 w-3.5 shrink-0" />}
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
            {task.result && (
              <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${task.state === "fertig" ? "border-up/40 bg-up/10 text-green-100" : "border-sky-300/30 bg-sky-400/10 text-sky-100"}`}>
                {task.result}
              </div>
            )}
          </Panel>
          <Panel>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-sky-100">Im Fenster</h2>
              {status?.url && <span className="truncate text-xs text-quiet">{status.title ? `${status.title} · ` : ""}{hostLabel(status.url)}</span>}
            </div>
            {status?.shotAt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/browser/bild?t=${encodeURIComponent(status.shotAt)}`} alt="Was gerade im Browser-Fenster zu sehen ist" className="w-full rounded-lg border border-sky-300/20" />
            ) : (
              <p className="text-sm text-quiet">Gleich siehst du hier, was JARVIS im Fenster sieht.</p>
            )}
          </Panel>
        </div>
      )}

      <Panel className="max-w-3xl">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-sky-100">Was JARVIS im Browser nie tut</h2>
        <ul className="space-y-1.5 text-sm text-sky-50/85">
          {BROWSER_RULES.map((r) => (
            <li key={r} className="flex gap-2">
              <Icon name="schild" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-quiet">
          Chrome läuft mit einem eigenen Profil, getrennt von deinem normalen Chrome. Meldest du dich dort irgendwo an, bleibt das gespeichert, damit JARVIS beim nächsten Mal
          weitermachen kann.
        </p>
      </Panel>
    </main>
  );
}
