import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { CONFIG_DIR, expandHome, grokKey, readConfig, writeConfig, xBudget, type JarvisConfig, type MailConfig } from "@/lib/server/config";
import { testGrokKey } from "@/lib/server/desk/grok";
import { brainKey, testKey } from "@/lib/server/brain";
import { guard, readBody } from "@/lib/server/guard";
import { testMail } from "@/lib/server/mail";
import { createVault, detectVaults } from "@/lib/server/obsidian";
import { providerById } from "@/lib/mailProviders";
import type { Settings } from "@/lib/settings";

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
    configFile: path.join(CONFIG_DIR, "config.json"),
  };
}

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await settings(await readConfig()));
}

type MailInput = { provider: string; host?: string; port?: number; user: string; password?: string };

type Action =
  | { action: "name"; name: string }
  | { action: "vault"; path: string }
  | { action: "createVault" }
  | { action: "mail"; mail: MailInput }
  | { action: "removeMail" }
  | { action: "claude"; apiKey: string }
  | { action: "removeClaude" }
  | { action: "xai"; apiKey: string }
  | { action: "xaiBudget"; budgetUsd: number }
  | { action: "removeXai" };

// Mehr als 20 $ am Tag sind für einen Spielgeld-Test sicher ein Tippfehler.
const MAX_X_BUDGET_USD = 20;

// Ergänzt Server und Port aus der Anbieterliste; ein leeres Passwort heißt „das gespeicherte behalten“.
function mailConfig(input: MailInput, saved?: MailConfig): MailConfig | string {
  const provider = providerById(input.provider);
  const host = (provider.id === "andere" ? input.host : provider.host)?.trim() ?? "";
  const port = provider.id === "andere" ? Number(input.port) || 993 : provider.port;
  const user = input.user?.trim() ?? "";
  const password = input.password || (saved && saved.user === user && saved.host === host ? saved.password : "");
  if (!host) return "Bitte den IMAP-Server eintragen.";
  if (!user) return "Bitte die E-Mail-Adresse eintragen.";
  if (!password) return "Bitte das Passwort eintragen.";
  return { provider: provider.id, host, port, user, password };
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const config = await readConfig();

  if (body.action === "name") {
    const name = body.name?.trim().slice(0, 40);
    if (!name) return Response.json({ error: "Bitte einen Namen eintragen." }, { status: 400 });
    config.name = name;
  } else if (body.action === "vault") {
    const vault = path.resolve(expandHome(body.path?.trim() ?? ""));
    const ok = await fs.stat(vault).then((s) => s.isDirectory()).catch(() => false);
    if (!body.path?.trim() || !ok) return Response.json({ error: `Den Ordner ${vault} gibt es nicht.` }, { status: 400 });
    config.vaultPath = vault;
  } else if (body.action === "createVault") {
    config.vaultPath = await createVault();
  } else if (body.action === "mail") {
    const mail = mailConfig(body.mail, config.mail);
    if (typeof mail === "string") return Response.json({ error: mail }, { status: 400 });
    const result = await testMail(mail);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    config.mail = mail;
    await writeConfig(config);
    return Response.json({ ...(await settings(config)), message: `Verbunden. Im Posteingang sind ${result.unread} ungelesene Mails.` });
  } else if (body.action === "removeMail") {
    delete config.mail;
  } else if (body.action === "claude") {
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey.startsWith("sk-ant-")) return Response.json({ error: "Ein Claude-Schlüssel beginnt mit sk-ant-. Bitte den ganzen Schlüssel einfügen." }, { status: 400 });
    const result = await testKey(apiKey);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    config.claude = { apiKey };
    await writeConfig(config);
    return Response.json({ ...(await settings(config)), message: "Verbunden. Ab jetzt verstehe ich auch freie Sätze." });
  } else if (body.action === "removeClaude") {
    delete config.claude;
  } else if (body.action === "xai") {
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey.startsWith("xai-")) return Response.json({ error: "Ein xAI-Schlüssel beginnt mit xai-. Bitte den ganzen Schlüssel einfügen." }, { status: 400 });
    const result = await testGrokKey(apiKey);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    config.xai = { ...config.xai, apiKey };
    await writeConfig(config);
    return Response.json({ ...(await settings(config)), message: "Verbunden. Ab jetzt liest der Crawler mit Grok auch X." });
  } else if (body.action === "xaiBudget") {
    const budget = Math.round(Number(body.budgetUsd) * 100) / 100;
    if (!(budget >= 0.2 && budget <= MAX_X_BUDGET_USD)) {
      return Response.json({ error: `Bitte einen Betrag zwischen 0,20 und ${MAX_X_BUDGET_USD} Dollar eintragen.` }, { status: 400 });
    }
    if (!grokKey(config)) return Response.json({ error: "Bitte zuerst den xAI-Schlüssel eintragen." }, { status: 400 });
    config.xai = { apiKey: config.xai?.apiKey ?? "", dailyBudgetUsd: budget };
  } else if (body.action === "removeXai") {
    delete config.xai;
  } else {
    return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
  }
  await writeConfig(config);
  return Response.json(await settings(config));
}
