"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useJarvis } from "./JarvisProvider";
import { Button, inputClass, Notice } from "./ui";
import { postJson } from "@/lib/api";
import { istClientId, istTenant, type MicrosoftStatus } from "@/lib/microsoft";
import { usePolling } from "@/lib/usePolling";

// Einstellungen → Microsoft 365: Verzeichnis und Anwendung eintragen, mit einem Code bei Microsoft anmelden,
// festlegen, ob Outlook-Termine ins Gespräch dürfen, und wieder trennen. Das Passwort gibst du nur auf der
// Seite von Microsoft ein; JARVIS sieht es nie.

type Meldung = { tone: "ok" | "error"; text: string } | null;

const UHR = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

export function MicrosoftSetup() {
  const { reloadCalendar } = useJarvis();
  const [wartet, setWartet] = useState(false);
  // Solange du den Code bei Microsoft eingibst, schaut die Seite alle paar Sekunden nach, ob es geklappt hat.
  const { data: status, set } = usePolling<MicrosoftStatus>("/api/microsoft", wartet ? 3_000 : 5 * 60_000);
  const [busy, setBusy] = useState(false);
  const [meldung, setMeldung] = useState<Meldung>(null);
  const [aendern, setAendern] = useState(false);

  if (status && Boolean(status.anmeldung) !== wartet) setWartet(Boolean(status.anmeldung));

  // Kommt die Anmeldung beim Nachsehen an (auch eine neue bei schon verbundenem Konto) oder endet sie anders,
  // liest die Seite den Kalender neu: Die Outlook-Termine erscheinen dann gleich.
  const merkmal = status ? `${status.verbunden}|${Boolean(status.anmeldung)}|${status.fehler ?? ""}` : undefined;
  const vorher = useRef(merkmal);
  useEffect(() => {
    if (vorher.current !== undefined && merkmal !== undefined && vorher.current !== merkmal) void reloadCalendar();
    vorher.current = merkmal;
  }, [merkmal, reloadCalendar]);

  async function sende(body: object, fertig?: string) {
    setBusy(true);
    setMeldung(null);
    try {
      const neu = await postJson<MicrosoftStatus>("/api/microsoft", body);
      set(neu);
      setMeldung(fertig ? { tone: "ok", text: fertig } : null);
      void reloadCalendar();
      return true;
    } catch (e) {
      setMeldung({ tone: "error", text: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!status) return <p className="text-sm text-quiet">Lade …</p>;
  return (
    <div className="space-y-3 text-sm">
      {!status.eingerichtet || aendern ? (
        <Nummern
          status={status}
          busy={busy}
          onSave={async (tenantId, clientId) => {
            const ok = await sende({ action: "einrichten", tenantId, clientId }, "Gespeichert. Jetzt kannst du dich bei Microsoft anmelden.");
            if (ok) setAendern(false);
            return ok;
          }}
          onCancel={status.eingerichtet ? () => setAendern(false) : undefined}
        />
      ) : status.anmeldung ? (
        <Anmeldung anmeldung={status.anmeldung} busy={busy} onNeu={() => sende({ action: "anmelden" })} onAbbrechen={() => sende({ action: "abbrechen" })} />
      ) : status.verbunden ? (
        <>
          {!status.fehler && <Notice tone="ok">Verbunden{status.konto ? ` mit ${status.konto}` : ""}. JARVIS liest deine Termine aus Outlook und zeigt sie im Raum Kalender.</Notice>}
          <label className="flex items-start gap-3 text-schiefer/85">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-gletscher" disabled={busy} checked={status.extern} onChange={(e) => sende({ action: "extern", an: e.target.checked }, "Gespeichert.")} />
            <span>
              Outlook-Termine auch im Gespräch und über Telegram
              <span className="block text-xs text-quiet">
                Aus, bis du es willst. Ohne den Haken stehen Outlook-Termine nur am Bildschirm dieses Macs: JARVIS nennt sie im Gespräch nicht beim Namen und schickt sie
                nicht aufs Handy. Mit dem Haken gehen Titel, Zeit und Ort an das KI-Modell (Anthropic) und über Telegram, so wie die Termine deines Mac-Kalenders.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => sende({ action: "anmelden" })}>
              Neu anmelden
            </Button>
            <Button tone="danger" disabled={busy} onClick={() => sende({ action: "trennen" }, "Abgemeldet. Die Outlook-Termine sind aus JARVIS verschwunden; in Outlook hat sich nichts geändert.")}>
              Abmelden
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-schiefer/85">
            Eingetragen ist die Anwendung <span className="font-mono text-xs">{status.clientId}</span> im Verzeichnis <span className="font-mono text-xs">{status.tenantId}</span>. Zum
            Anmelden zeigt JARVIS dir einen Code, den du auf der Seite von Microsoft eingibst. Dein Passwort bleibt bei Microsoft.
          </p>
          <Button tone="primary" icon="kalender" disabled={busy} onClick={() => sende({ action: "anmelden" })}>
            {busy ? "Frage Microsoft …" : "Bei Microsoft anmelden"}
          </Button>
        </>
      )}
      {status.fehler && <Notice tone="error">{status.fehler}</Notice>}
      {meldung && <Notice meldung tone={meldung.tone}>{meldung.text}</Notice>}
      {status.eingerichtet && !aendern && (
        <p className="text-xs text-quiet">
          <button type="button" disabled={busy} onClick={() => setAendern(true)} className="underline hover:text-schiefer disabled:opacity-40">
            Nummern ändern
          </button>
          {" oder "}
          <button
            type="button"
            disabled={busy}
            onClick={() => sende({ action: "trennen", ganz: true }, "Entfernt. Anmeldung und Nummern sind von diesem Mac gelöscht.")}
            className="text-down underline hover:text-down disabled:opacity-40"
          >
            Microsoft 365 ganz entfernen
          </button>
        </p>
      )}
      <p className="text-xs text-quiet">
        Stand heute ist dieser Teil nur gegen einen Nachbau von Microsoft getestet. Mit eurem echten Microsoft 365 läuft er zum ersten Mal, wenn du dich hier anmeldest.
      </p>
    </div>
  );
}

function Nummern({ status, busy, onSave, onCancel }: { status: MicrosoftStatus; busy: boolean; onSave: (tenantId: string, clientId: string) => Promise<boolean>; onCancel?: () => void }) {
  const [tenantId, setTenantId] = useState(status.tenantId ?? "");
  const [clientId, setClientId] = useState(status.clientId ?? "");
  const tenantOk = istTenant(tenantId.trim());
  const clientOk = istClientId(clientId.trim());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSave(tenantId, clientId);
  };
  const feld = { type: "text", autoComplete: "off", autoCapitalize: "off", autoCorrect: "off", spellCheck: false, className: `${inputClass} font-mono` } as const;
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-schiefer/85">Das richtet ihr einmal ein. Den ersten Schritt macht eure IT, die anderen du:</p>
      <ol className="list-decimal space-y-1 pl-5 text-schiefer/85">
        <li>
          Eure IT legt im Microsoft-Verzeichnis der Firma (Entra) eine Anwendung für JARVIS an: nur für euer Verzeichnis, mit erlaubter Anmeldung per Code („öffentlicher
          Client“) und genau zwei Rechten, beide nur lesend: <span className="font-mono text-xs">User.Read</span> und <span className="font-mono text-xs">Calendars.ReadBasic</span>.
          Ein Kennwort oder Geheimnis für die Anwendung braucht es nicht.
        </li>
        <li>Sie gibt dir zwei Nummern: die Verzeichnis-ID und die Anwendungs-ID. Trag beide hier ein.</li>
        <li>Danach meldest du dich mit einem Code auf der Seite von Microsoft an.</li>
      </ol>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-quiet">Verzeichnis-ID</span>
          <input {...feld} name="microsoft-verzeichnis" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-quiet">Anwendungs-ID</span>
          <input {...feld} name="microsoft-anwendung" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
        </label>
      </div>
      {tenantId.trim() && !tenantOk && <p className="text-xs text-ocker">Die Verzeichnis-ID hat die Form 8-4-4-4-12 Zeichen oder ist ein Name wie firma.onmicrosoft.com.</p>}
      {clientId.trim() && !clientOk && <p className="text-xs text-ocker">Die Anwendungs-ID hat die Form 8-4-4-4-12 Zeichen, nur Ziffern und die Buchstaben a bis f.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" tone="primary" disabled={busy || !tenantOk || !clientOk}>
          Speichern
        </Button>
        {onCancel && (
          <Button disabled={busy} onClick={onCancel}>
            Abbrechen
          </Button>
        )}
      </div>
      {status.verbunden && <p className="text-xs text-quiet">Trägst du andere Nummern ein, endet die jetzige Anmeldung.</p>}
    </form>
  );
}

function Anmeldung({ anmeldung, busy, onNeu, onAbbrechen }: { anmeldung: NonNullable<MicrosoftStatus["anmeldung"]>; busy: boolean; onNeu: () => void; onAbbrechen: () => void }) {
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1.5 pl-5 text-schiefer/85">
        <li>
          Öffne{" "}
          <a href={anmeldung.adresse} target="_blank" rel="noreferrer" className="text-see underline hover:text-schiefer">
            die Anmeldeseite von Microsoft
          </a>
          .
        </li>
        <li>
          Gib dort diesen Code ein: <span className="select-all font-mono text-lg font-bold tracking-wider text-schiefer">{anmeldung.code}</span>
        </li>
        <li>Melde dich mit deinem Firmenkonto an und bestätige, dass JARVIS deine Termine lesen darf.</li>
      </ol>
      <p className="flex flex-wrap items-center gap-2 text-xs text-quiet">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gletscher" aria-hidden />
        Warte auf deine Anmeldung. Der Code gilt bis {UHR.format(new Date(anmeldung.bis))} Uhr.
        <Button small disabled={busy} onClick={onNeu}>
          Neuer Code
        </Button>
        <Button small disabled={busy} onClick={onAbbrechen}>
          Abbrechen
        </Button>
      </p>
    </div>
  );
}
