import type { MicrosoftStatus } from "../microsoft";
import { vergissKalender } from "./calendar";
import { brichMicrosoftAnmeldungAb, microsoftStatus, pruefeMicrosoftAnmeldung, richteMicrosoftEin, setzeMicrosoftExtern, starteMicrosoftAnmeldung, trenneMicrosoft } from "./microsoft";

// Was die Einstellungen mit Microsoft 365 tun können (Schnittstelle /api/microsoft). Nach jeder Änderung wird
// der Kalender neu gelesen, damit Outlook-Termine sofort erscheinen oder verschwinden.

export type MicrosoftAktion =
  | { action: "einrichten"; tenantId?: unknown; clientId?: unknown }
  | { action: "anmelden" }
  | { action: "pruefen" }
  // Die laufende Anmeldung abbrechen; eine frühere bleibt.
  | { action: "abbrechen" }
  | { action: "extern"; an?: unknown }
  // ganz: auch Verzeichnis und Anwendung vergessen.
  | { action: "trennen"; ganz?: unknown };

export class UnbekannteAktion extends Error {}

export async function microsoftAktion(body: MicrosoftAktion, now = new Date()): Promise<MicrosoftStatus> {
  const vorher = (await microsoftStatus(now)).verbunden;
  let angekommen = false;
  if (body.action === "einrichten") await richteMicrosoftEin(body);
  else if (body.action === "anmelden") await starteMicrosoftAnmeldung(now);
  else if (body.action === "pruefen") angekommen = await pruefeMicrosoftAnmeldung(now);
  else if (body.action === "abbrechen") brichMicrosoftAnmeldungAb();
  else if (body.action === "extern") await setzeMicrosoftExtern(body.an);
  else if (body.action === "trennen") await trenneMicrosoft(body.ganz === true);
  else throw new UnbekannteAktion();
  const status = await microsoftStatus(now);
  // Auch eine neue Anmeldung bei schon verbundenem Konto (etwa nach „abgelaufen“) liest den Kalender neu.
  if (body.action !== "pruefen" || angekommen || status.verbunden !== vorher) vergissKalender();
  return status;
}

// Der Stand für die Seite. Läuft gerade eine Anmeldung, fragt JARVIS dabei bei Microsoft nach, ob du den Code
// schon eingegeben hast (die Seite fragt alle paar Sekunden; öfter, als Microsoft es wünscht, geht nichts hinaus).
// Ist Microsoft dabei nicht erreichbar, bleibt die Anmeldung offen, und der nächste Blick versucht es wieder.
export async function microsoftStand(now = new Date()): Promise<MicrosoftStatus> {
  return microsoftAktion({ action: "pruefen" }, now).catch(() => microsoftStatus(now));
}
