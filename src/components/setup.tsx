"use client";

import { useState, type FormEvent } from "react";
import { useJarvis } from "./JarvisProvider";
import { Button, inputClass, Notice } from "./ui";
import { postJson } from "@/lib/api";
import { MAIL_PROVIDERS, providerById } from "@/lib/mailProviders";
import type { Settings } from "@/lib/settings";

// Einrichten von Obsidian und Postfach. Steht in den Einstellungen und dort, wo es fehlt
// (leere Aufgaben- oder Post-Ansicht), damit du nicht suchen musst.

export function VaultSetup() {
  const { settings, setSettings, reloadTasks } = useJarvis();
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: object) {
    setBusy(true);
    setError(null);
    try {
      setSettings(await postJson<Settings>("/api/einstellungen", body));
      await reloadTasks();
      setPath("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (path.trim()) send({ action: "vault", path });
  };

  const detected = (settings?.detectedVaults ?? []).filter((v) => v.path !== settings?.vaultPath);

  return (
    <div className="space-y-3 text-sm">
      {settings?.vaultPath && (
        <Notice tone="ok">
          Verbunden mit <b>{settings.vaultPath}</b>
        </Notice>
      )}
      {detected.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-quiet">Diese Tresore kennt Obsidian auf deinem Mac:</p>
          <div className="flex flex-wrap gap-2">
            {detected.map((v) => (
              <Button key={v.path} icon="aufgaben" disabled={busy} onClick={() => send({ action: "vault", path: v.path })} title={v.path}>
                {v.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Ordner des Tresors, z. B. ~/Documents/Obsidian"
          aria-label="Ordner des Obsidian-Tresors"
          className={inputClass}
        />
        <Button type="submit" tone="primary" disabled={busy || !path.trim()}>
          Verbinden
        </Button>
      </form>
      {!settings?.vaultPath && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-quiet">Noch kein Obsidian?</span>
          <Button icon="neu" disabled={busy} onClick={() => send({ action: "createVault" })}>
            Neuen Tresor in Dokumente anlegen
          </Button>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

export function MailSetup() {
  const { settings, setSettings, reloadMail } = useJarvis();
  const saved = settings?.mail ?? null;
  const [provider, setProvider] = useState<string>(saved?.provider ?? "t-online");
  const [user, setUser] = useState(saved?.user ?? "");
  const [password, setPassword] = useState("");
  const [host, setHost] = useState(saved?.provider === "andere" ? saved.host : "");
  const [port, setPort] = useState(String(saved?.port ?? 993));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const info = providerById(provider);

  async function send(body: object) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await postJson<Settings & { message?: string }>("/api/einstellungen", body);
      setSettings(next);
      setPassword("");
      setMessage(next.message ? { tone: "ok", text: next.message } : null);
      await reloadMail(true);
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send({ action: "mail", mail: { provider, user, password, host, port: Number(port) } });
  };

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      {saved && (
        <Notice tone="ok">
          Verbunden mit <b>{saved.user}</b> ({providerById(saved.provider).name})
        </Notice>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-quiet">Anbieter</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass}>
            {MAIL_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-quiet">E-Mail-Adresse</span>
          <input value={user} onChange={(e) => setUser(e.target.value)} type="email" autoComplete="username" placeholder="name@t-online.de" className={inputClass} />
        </label>
        {provider === "andere" && (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-quiet">IMAP-Server</span>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="imap.anbieter.de" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-quiet">Port</span>
              <input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" className={inputClass} />
            </label>
          </>
        )}
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-quiet">Passwort</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder={saved?.hasPassword ? "gespeichert, leer lassen zum Behalten" : "E-Mail- oder App-Passwort"}
            className={inputClass}
          />
        </label>
      </div>
      <p className="rounded-lg border border-sky-300/15 bg-desk/50 px-3 py-2 text-xs text-sky-100/80">{info.hint}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" tone="primary" disabled={busy || !user.trim()}>
          {busy ? "Prüfe Verbindung …" : saved ? "Speichern und prüfen" : "Verbinden"}
        </Button>
        {saved && (
          <Button tone="danger" disabled={busy} onClick={() => send({ action: "removeMail" })}>
            Postfach trennen
          </Button>
        )}
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <p className="text-[11px] text-quiet">Das Passwort bleibt auf deinem Mac in {settings?.configFile ?? "~/.jarvis/config.json"} und wird nie hochgeladen.</p>
    </form>
  );
}
