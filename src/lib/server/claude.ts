import Anthropic from "@anthropic-ai/sdk";
import type { ModellRolle } from "../modelle";

// Die eine Stelle, an der JARVIS die Verbindung zu Claude aufbaut. Welches Modell eine Rolle benutzt, steht in
// src/lib/modelle.ts; hier steht, über welchen Zugang die Anfrage geht und wie geduldig sie ist.
//
// Heute gibt es genau einen Zugang: direkt zu Anthropic, mit dem Schlüssel aus den Einstellungen. Soll Claude
// später über Microsoft Foundry in eurem Azure laufen, wird die Verbindung hier anders gebaut; Gespräch,
// Browser-Agent, Analyst und Chief ändern sich dafür nicht. Was dabei zu beachten ist (einige Funktionen gibt
// es dort nicht), steht in docs/jarvis-2.0/09-azure-vorbereitung.md. Gebaut und geprüft ist das nicht.

// Wie lange eine Anfrage höchstens wartet und wie oft sie bei einer Störung wiederholt wird.
export const CLAUDE_GEDULD: Record<ModellRolle, { timeout: number; maxRetries: number }> = {
  gespraech: { timeout: 60_000, maxRetries: 1 },
  browser: { timeout: 90_000, maxRetries: 1 },
  // Eine Recherche für ein Dokument läuft lange an einem Stück.
  analyst: { timeout: 15 * 60_000, maxRetries: 2 },
  chief: { timeout: 60_000, maxRetries: 1 },
};

export const claudeFuer = (rolle: ModellRolle, apiKey: string): Anthropic => new Anthropic({ apiKey, ...CLAUDE_GEDULD[rolle] });
