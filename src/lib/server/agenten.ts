import { agentenLage, type AgentenSnapshot, type AgentSpur } from "../agenten";
import { isAgent, type AgentName } from "../sicherheit";
import { brainKey } from "./brain";
import { browserStatus } from "./browser";
import { readConfig } from "./config";
import { deskSnapshot } from "./desk/engine";
import { documentsSnapshot } from "./documents";
import { leseAudit } from "./gateway/audit";
import { leseZustand } from "./gateway/zustand";
import { intelSnapshot } from "./intel";
import { kostenUebersicht } from "./kosten";

// Die Agentensteuerung liest nur: Sie fragt jeden Agenten nach seinem Stand und stellt das zusammen
// (src/lib/agenten.ts). Starten, Pausieren und Sperren laufen über die Wege, die es schon gibt, mit deren
// Prüfungen. Fällt die Auskunft eines Agenten aus, zeigt die Übersicht die übrigen trotzdem.

const AUDIT_ZEILEN = 300;

export async function agentenSnapshot(now = new Date()): Promise<AgentenSnapshot> {
  const config = await readConfig();
  const apiKey = brainKey(config);
  const [sicherheit, intel, documents, browser, desk, audit, kosten] = await Promise.all([
    leseZustand(),
    intelSnapshot(now).catch(() => null),
    documentsSnapshot().catch(() => null),
    browserStatus(apiKey ?? undefined).catch(() => null),
    deskSnapshot(now).catch(() => null),
    leseAudit(AUDIT_ZEILEN).catch(() => []),
    kostenUebersicht(now).catch(() => null),
  ]);
  // Die jüngste Werkzeugnutzung je Agent. Das Audit-Log liefert die neuesten Einträge zuerst oder zuletzt; deshalb zählt die Zeit.
  const spuren: Partial<Record<AgentName, AgentSpur>> = {};
  for (const e of audit) {
    if (e.art !== "werkzeug" || !isAgent(e.agent)) continue;
    const bisher = spuren[e.agent];
    if (!bisher || e.zeit > bisher.zeit) spuren[e.agent] = { zeit: e.zeit };
  }
  const agenten = agentenLage({ gehirnBereit: Boolean(apiKey), sicherheit, intel, documents, browser, desk, spuren, kosten }, now);
  // Heute zusammen ist die Summe dessen, was bei den Agenten steht. Der Monat kommt aus dem Kostenbuch und ist
  // nie kleiner als der Tag (am ersten Tag der Zählung kennen Intel und Desk schon Ausgaben, die das Buch noch nicht hat).
  const heuteUsd = agenten.reduce((summe, a) => summe + (a.kosten?.heuteUsd ?? 0), 0);
  const monatUsd = kosten ? Math.max(kosten.monatUsd, heuteUsd) : null;
  return { agenten, notaus: sicherheit.notaus.an, stand: now.toISOString(), kosten: { heuteUsd, monatUsd, seit: kosten?.seit ?? null } };
}
