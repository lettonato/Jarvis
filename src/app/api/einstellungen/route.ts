import path from "node:path";
import { connection } from "next/server";
import { CONFIG_DIR, grokKey, readConfig, twelveKey, xBudget, type JarvisConfig } from "@/lib/server/config";
import { brainKey } from "@/lib/server/brain";
import { desktopStatus } from "@/lib/server/desktop";
import { aendereEinstellung, type EinstellungAktion } from "@/lib/server/einstellungen";
import { protokolliere } from "@/lib/server/gateway/audit";
import { guard, readBody } from "@/lib/server/guard";
import { mitteilungMoeglich } from "@/lib/server/mitteilung";
import { stimmeStatusVon } from "@/lib/server/stimme";
import { telegramStatus } from "@/lib/server/telegram";
import { detectVaults } from "@/lib/server/obsidian";
import type { Settings } from "@/lib/settings";
import { approvalLimitOf } from "@/lib/approval";

// Das Passwort verlässt den Server nie: die Seite erfährt nur, ob eines gespeichert ist.
async function settings(config: JarvisConfig): Promise<Settings> {
  return {
    name: config.name,
    vaultPath: config.vaultPath ?? null,
    detectedVaults: await detectVaults(),
    mail: config.mail
      ? { provider: config.mail.provider, host: config.mail.host, port: config.mail.port, user: config.mail.user, hasPassword: Boolean(config.mail.password) }
      : null,
    brain: {
      configured: Boolean(brainKey(config)),
      hint: config.claude?.apiKey ? `…${config.claude.apiKey.slice(-4)}` : null,
      fromEnv: !config.claude?.apiKey && Boolean(process.env.ANTHROPIC_API_KEY),
    },
    crawler: {
      configured: Boolean(grokKey(config)),
      hint: config.xai?.apiKey ? `…${config.xai.apiKey.slice(-4)}` : null,
      fromEnv: !config.xai?.apiKey && Boolean(process.env.XAI_API_KEY),
      budgetUsd: xBudget(config),
    },
    commodities: {
      configured: Boolean(twelveKey(config)),
      hint: config.twelvedata?.apiKey ? `…${config.twelvedata.apiKey.slice(-4)}` : null,
      fromEnv: !config.twelvedata?.apiKey && Boolean(process.env.TWELVEDATA_API_KEY),
    },
    telegram: telegramStatus(config),
    stimme: await stimmeStatusVon(config),
    mitteilungen: { hinweise: config.mitteilungen?.hinweise === true, moeglich: mitteilungMoeglich() },
    desktop: desktopStatus(config),
    approval: { limitUsd: approvalLimitOf(config.approval?.limitUsd) },
    configFile: path.join(CONFIG_DIR, "config.json"),
  };
}

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await settings(await readConfig()));
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<EinstellungAktion>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  // Fürs Audit-Log nur, was geändert wurde, nie die Werte (Schlüssel, Passwörter).
  await protokolliere({ art: "einstellung", agent: "mensch", kanal: "mac", was: `Einstellung: ${String(body.action).slice(0, 40)}`, ergebnis: "angefragt" });
  // Prüfen und Speichern stehen in src/lib/server/einstellungen.ts; hier wird nur die Antwort gebaut.
  const ergebnis = await aendereEinstellung(body);
  if (!ergebnis.ok) return Response.json({ error: ergebnis.error }, { status: 400 });
  return Response.json({
    ...(await settings(ergebnis.config)),
    ...(ergebnis.message ? { message: ergebnis.message } : {}),
    ...(ergebnis.warning ? { warning: ergebnis.warning } : {}),
  });
}
