// Was sich in den Einstellungen ändern lässt, an einer Stelle. Die Seite (api/einstellungen) reicht nur durch.
//
// Jede Änderung läuft in zwei Schritten: Erst wird geprüft (ein Schlüssel wird beim Anbieter getestet, ein Ordner
// gesucht; das kann dauern), dann wird in einem Zug gelesen, geändert und gespeichert (aendereConfig). Geändert
// wird dabei der Stand von dem Augenblick, nicht der vom Anfang: Was in der Zwischenzeit woanders gespeichert
// wurde (das Handy koppelt sich, Microsoft erneuert seine Anmeldung), bleibt erhalten.

import { promises as fs } from "node:fs";
import path from "node:path";
import { aendereConfig, expandHome, grokKey, readConfig, type JarvisConfig, type MailConfig } from "./config";
import { testTwelveKey } from "./desk/commodities";
import { testGrokKey } from "./desk/grok";
import { testKey } from "./brain";
import { testMail } from "./mail";
import { MITTEILUNG_SATZ, MitteilungError, mitteilungMoeglich, zeigeMitteilung } from "./mitteilung";
import { stimmeEinstellen, type StimmeAktion } from "./stimme";
import { explainTelegramError, prefsOf, renewCode, resetTelegram, sendTest, testTelegramToken, unpairTelegram, wakeTelegram } from "./telegram";
import { createVault, vaultProblem } from "./obsidian";
import { providerById } from "../mailProviders";
import { findToken, isClock, tokenProblem } from "../telegram";
import { isApprovalLimit, type ApprovalLimit } from "../approval";
import { ausVon, EIGENE_HOECHSTENS, eigeneId, istFestesWort, istVergeben, programmName, zieleVon } from "../desktop";

type MailInput = { provider: string; host?: string; port?: number; user: string; password?: string };

export type EinstellungAktion =
  | { action: "name"; name: string }
  | { action: "vault"; path: string }
  | { action: "createVault" }
  | { action: "mail"; mail: MailInput }
  | { action: "removeMail" }
  | { action: "claude"; apiKey: string }
  | { action: "removeClaude" }
  | { action: "xai"; apiKey: string }
  | { action: "xaiBudget"; budgetUsd: number }
  | { action: "removeXai" }
  | { action: "telegram"; token: string }
  | { action: "telegramCode" }
  | { action: "telegramPrefs"; trades?: boolean; warnings?: boolean; reminders?: boolean; projekte?: boolean; hinweise?: boolean; briefing?: string | null; abschluss?: string | null }
  | { action: "telegramTest" }
  | { action: "telegramUnpair" }
  | { action: "removeTelegram" }
  | { action: "approval"; limitUsd: ApprovalLimit }
  | { action: "twelvedata"; apiKey: string }
  | { action: "removeTwelvedata" }
  | { action: "macHinweise"; an: boolean }
  | { action: "macMitteilungProbe" }
  | { action: "desktopSchalter"; id: string; an: boolean }
  | { action: "desktopNeu"; name: string }
  | { action: "desktopWeg"; id: string }
  | StimmeAktion;

// Was zu den Programmen in der Datei steht, wenn es überhaupt die erwartete Form hat (sonst von vorn).
const desktopVon = (c: JarvisConfig) => (c.desktop && typeof c.desktop === "object" && !Array.isArray(c.desktop) ? c.desktop : {});

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

export type EinstellungErgebnis = { ok: false; error: string } | { ok: true; config: JarvisConfig; message?: string; warning?: string };

const nein = (error: string): EinstellungErgebnis => ({ ok: false, error });
// Lesen, ändern, speichern in einem Zug. aendern bekommt den Stand von jetzt und ändert ihn an Ort und Stelle.
const speichere = (aendern: (config: JarvisConfig) => void): Promise<JarvisConfig> =>
  aendereConfig((config) => {
    aendern(config);
    return config;
  });

export async function aendereEinstellung(body: EinstellungAktion): Promise<EinstellungErgebnis> {
  // Nur zum Prüfen. Gespeichert wird nie dieser Stand, sondern immer der frische in speichere.
  const config = await readConfig();

  if (body.action === "name") {
    const name = body.name?.trim().slice(0, 40);
    if (!name) return nein("Bitte einen Namen eintragen.");
    return { ok: true, config: await speichere((c) => void (c.name = name)) };
  }
  if (body.action === "vault") {
    const vault = path.resolve(expandHome(body.path?.trim() ?? ""));
    const ok = await fs.stat(vault).then((s) => s.isDirectory()).catch(() => false);
    if (!body.path?.trim() || !ok) return nein(`Den Ordner ${vault} gibt es nicht.`);
    // Sperrt macOS den Ordner, merkt sich JARVIS ihn trotzdem; nach der Freigabe geht es dann sofort.
    const problem = await vaultProblem(vault);
    const neu = await speichere((c) => void (c.vaultPath = vault));
    return { ok: true, config: neu, ...(problem ? { warning: problem } : {}) };
  }
  if (body.action === "createVault") {
    const vault = await createVault();
    return { ok: true, config: await speichere((c) => void (c.vaultPath = vault)) };
  }
  if (body.action === "mail") {
    if (!body.mail || typeof body.mail !== "object") return nein("Bitte die E-Mail-Adresse eintragen.");
    // Zwei Änderungen am selben Postfach zur selben Zeit: Die spätere gilt. Alles andere bleibt erhalten.
    const mail = mailConfig(body.mail, config.mail);
    if (typeof mail === "string") return nein(mail);
    const result = await testMail(mail);
    if (!result.ok) return nein(result.error);
    return { ok: true, config: await speichere((c) => void (c.mail = mail)), message: `Verbunden. Im Posteingang sind ${result.unread} ungelesene Mails.` };
  }
  if (body.action === "removeMail") return { ok: true, config: await speichere((c) => void delete c.mail) };
  if (body.action === "claude") {
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey.startsWith("sk-ant-")) return nein("Ein Claude-Schlüssel beginnt mit sk-ant-. Bitte den ganzen Schlüssel einfügen.");
    const result = await testKey(apiKey);
    if (!result.ok) return nein(result.error);
    return { ok: true, config: await speichere((c) => void (c.claude = { apiKey })), message: "Verbunden. Ab jetzt verstehe ich auch freie Sätze." };
  }
  if (body.action === "removeClaude") return { ok: true, config: await speichere((c) => void delete c.claude) };
  if (body.action === "xai") {
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey.startsWith("xai-")) return nein("Ein xAI-Schlüssel beginnt mit xai-. Bitte den ganzen Schlüssel einfügen.");
    const result = await testGrokKey(apiKey);
    if (!result.ok) return nein(result.error);
    return { ok: true, config: await speichere((c) => void (c.xai = { ...c.xai, apiKey })), message: "Verbunden. Ab jetzt liest der Crawler mit Grok auch X." };
  }
  if (body.action === "xaiBudget") {
    const budget = Math.round(Number(body.budgetUsd) * 100) / 100;
    if (!(budget >= 0.2 && budget <= MAX_X_BUDGET_USD)) return nein(`Bitte einen Betrag zwischen 0,20 und ${MAX_X_BUDGET_USD} Dollar eintragen.`);
    if (!grokKey(config)) return nein("Bitte zuerst den xAI-Schlüssel eintragen.");
    // Wurde der Schlüssel inzwischen entfernt, gibt es nichts mehr zu begrenzen; ein leerer Abschnitt entstünde.
    return { ok: true, config: await speichere((c) => void (grokKey(c) ? (c.xai = { apiKey: c.xai?.apiKey ?? "", dailyBudgetUsd: budget }) : undefined)) };
  }
  if (body.action === "removeXai") return { ok: true, config: await speichere((c) => void delete c.xai) };
  if (body.action === "telegram") {
    const pasted = body.token?.trim() ?? "";
    const token = findToken(pasted);
    // Die Zeichenzahl hilft beim Suchen, ohne etwas vom Eingefügten zu zeigen. Ein Schlüssel hat rund 46 Zeichen.
    if (!token) return nein(`Darin finde ich keinen Bot-Schlüssel (eingefügt: ${pasted.length} Zeichen, meist sind es 46). ${tokenProblem(pasted) ?? ""} Am iPhone im Chat mit dem BotFather einmal kurz auf den Schlüssel tippen, dann ist er kopiert.`.replace("  ", " "));
    const result = await testTelegramToken(token);
    if (!result.ok) return nein(result.error);
    // Derselbe Schlüssel noch einmal: Kopplung und Einstellungen bleiben. Ein neuer Bot braucht eine neue Kopplung.
    let same = false;
    const neu = await speichere((c) => {
      same = c.telegram?.token === token;
      c.telegram = same ? { ...c.telegram!, bot: result.bot } : { token, bot: result.bot, ...(c.telegram ? prefsOf(c.telegram) : undefined) };
    });
    if (same) wakeTelegram();
    else await resetTelegram();
    // Bei einem neuen Bot erklärt die Seite das Koppeln selbst, eine zweite Meldung wäre doppelt.
    return { ok: true, config: neu, ...(same ? { message: `Verbunden mit @${result.bot}.` } : {}) };
  }
  if (body.action === "telegramCode") {
    if (!config.telegram) return nein("Bitte zuerst den Bot-Schlüssel eintragen.");
    renewCode();
    return { ok: true, config };
  }
  if (body.action === "telegramPrefs") {
    if (!config.telegram) return nein("Bitte zuerst den Bot-Schlüssel eintragen.");
    if (body.briefing !== undefined && body.briefing !== null && !isClock(String(body.briefing))) return nein("Bitte eine Uhrzeit wie 07:30 eintragen.");
    if (body.abschluss !== undefined && body.abschluss !== null && !isClock(String(body.abschluss))) return nein("Bitte eine Uhrzeit wie 18:00 eintragen.");
    const neu = await speichere((c) => {
      // Wurde der Bot inzwischen entfernt, gibt es nichts mehr einzustellen.
      if (!c.telegram) return;
      const next = { ...c.telegram };
      for (const key of ["trades", "warnings", "reminders", "projekte", "hinweise"] as const) if (typeof body[key] === "boolean") next[key] = body[key];
      if (body.briefing !== undefined) next.briefing = body.briefing;
      if (body.abschluss !== undefined) next.abschluss = body.abschluss;
      c.telegram = next;
    });
    return { ok: true, config: neu };
  }
  if (body.action === "telegramTest") {
    try {
      await sendTest();
    } catch (e) {
      return nein(explainTelegramError(e));
    }
    return { ok: true, config, message: "Gesendet. Sieh auf dein Handy." };
  }
  if (body.action === "telegramUnpair") {
    await unpairTelegram();
    return { ok: true, config: await readConfig() };
  }
  if (body.action === "removeTelegram") {
    // Erst verabschieden und trennen (das meldet sich beim Handy), dann den Abschnitt entfernen.
    if (config.telegram?.chatId) await unpairTelegram();
    const neu = await speichere((c) => void delete c.telegram);
    wakeTelegram();
    return { ok: true, config: neu };
  }
  if (body.action === "twelvedata") {
    const apiKey = body.apiKey?.trim() ?? "";
    if (!/^[A-Za-z0-9]{16,64}$/.test(apiKey)) return nein("Ein Twelve-Data-Schlüssel besteht nur aus Buchstaben und Zahlen, meist 32 Zeichen. Bitte den ganzen Schlüssel einfügen.");
    const result = await testTwelveKey(apiKey);
    if (!result.ok) return nein(result.error);
    return { ok: true, config: await speichere((c) => void (c.twelvedata = { apiKey })), message: "Verbunden. Ab jetzt schaut der Desk auch auf Gold, Silber und Öl." };
  }
  if (body.action === "removeTwelvedata") return { ok: true, config: await speichere((c) => void delete c.twelvedata) };
  if (body.action === "elevenlabs" || body.action === "elevenlabsPrefs" || body.action === "removeElevenlabs") {
    // Prüfen, Speichern und Audit-Log der Stimme stehen in stimme.ts.
    const result = await stimmeEinstellen(body);
    if (!result.ok) return nein(result.error);
    return { ok: true, config: result.config, ...(result.message ? { message: result.message } : {}) };
  }
  if (body.action === "approval") {
    if (!isApprovalLimit(body.limitUsd)) return nein("Diese Grenze gibt es nicht.");
    const limitUsd = body.limitUsd;
    return { ok: true, config: await speichere((c) => void (c.approval = { limitUsd })) };
  }
  // Hinweise am Tag als Mitteilung am Mac selbst. Ausschalten geht immer, einschalten nur auf einem Mac.
  if (body.action === "macHinweise") {
    const an = body.an;
    if (typeof an !== "boolean") return nein("Ungültige Anfrage.");
    if (an && !mitteilungMoeglich()) return nein(MITTEILUNG_SATZ["kein-mac"]);
    const neu = await speichere((c) => {
      c.mitteilungen = { ...c.mitteilungen, hinweise: an };
    });
    return { ok: true, config: neu, message: an ? "Eingeschaltet. Mit der Mitteilung zur Probe siehst du, ob sie bei dir ankommt." : "Ausgeschaltet." };
  }

  // Zeigt eine Mitteilung zur Probe. Ob sie wirklich erscheint, entscheidet macOS (Erlaubnis, Fokus); das kann
  // JARVIS nicht sehen, deshalb sagt die Antwort, wo du nachsiehst.
  if (body.action === "macMitteilungProbe") {
    try {
      await zeigeMitteilung("JARVIS", "So sieht ein Hinweis von JARVIS aus.");
    } catch (e) {
      return nein(e instanceof MitteilungError ? e.message : MITTEILUNG_SATZ.abgelehnt);
    }
    // Die Probe kann einige Sekunden dauern: Die Antwort zeigt den Stand von jetzt, nicht den von vorhin.
    return {
      ok: true,
      config: await readConfig(),
      message: "Die Mitteilung ist unterwegs und sollte oben rechts erscheinen. Kommt nichts: In den Systemeinstellungen unter Mitteilungen den „Skripteditor“ erlauben und nachsehen, ob gerade ein Fokus (Nicht stören) eingeschaltet ist.",
    };
  }

  // Programme und Ordner, die JARVIS am Mac öffnen darf (src/lib/desktop.ts). Geprüft wird jeweils gegen den
  // Stand im Augenblick des Speicherns, damit zwei Änderungen zugleich einander nicht überschreiben.
  if (body.action === "desktopSchalter") {
    const { id, an } = body;
    if (typeof id !== "string" || typeof an !== "boolean") return nein("Ungültige Anfrage.");
    if (!zieleVon(config.desktop).some((z) => z.id === id)) return nein("Dieses Programm gibt es nicht in der Liste.");
    return {
      ok: true,
      config: await speichere((c) => {
        const aus = new Set(ausVon(c.desktop));
        if (an) aus.delete(id);
        else aus.add(id);
        c.desktop = { ...desktopVon(c), aus: [...aus] };
      }),
    };
  }
  if (body.action === "desktopNeu") {
    const name = programmName(body.name);
    if (!name) return nein("So kann ein Programm nicht heißen. Trag den Namen so ein, wie er im Ordner „Programme“ steht, zum Beispiel „Notion“: ohne Pfad, höchstens 60 Zeichen.");
    if (istFestesWort(name)) return nein(`${name} steht schon in der Liste.`);
    if (istVergeben(name)) return nein(`„${name}“ heißt in JARVIS schon etwas anderes und kann deshalb kein eigenes Programm sein.`);
    const id = eigeneId(name);
    let grund = "";
    // Wird abgelehnt, bleibt die Datei, wie sie ist (null: nichts zu speichern).
    const neu = await aendereConfig((c) => {
      const eigene = zieleVon(c.desktop).filter((z) => z.eigen);
      if (eigene.some((z) => z.id === id)) grund = `${name} steht schon in der Liste.`;
      else if (eigene.length >= EIGENE_HOECHSTENS) grund = `Es gehen höchstens ${EIGENE_HOECHSTENS} eigene Programme. Entferne erst eines.`;
      if (grund) return null;
      // Ein früher ausgeschaltetes Programm gleichen Namens käme sonst still ausgeschaltet zurück.
      return { ...c, desktop: { ...desktopVon(c), aus: ausVon(c.desktop).filter((x) => x !== id), eigene: [...eigene.map((z) => z.name), name] } };
    });
    return grund ? nein(grund) : { ok: true, config: neu, message: `${name} steht jetzt in der Liste. Mit „Öffnen“ siehst du, ob der Mac es unter diesem Namen findet.` };
  }
  if (body.action === "desktopWeg") {
    const id = body.id;
    if (typeof id !== "string") return nein("Ungültige Anfrage.");
    const ziel = zieleVon(config.desktop).find((z) => z.id === id);
    if (!ziel) return nein("Dieses Programm gibt es nicht in der Liste.");
    if (!ziel.eigen) return nein("Feste Programme lassen sich nur ausschalten, nicht entfernen.");
    return {
      ok: true,
      config: await speichere((c) => {
        c.desktop = {
          ...desktopVon(c),
          aus: ausVon(c.desktop).filter((x) => x !== id),
          eigene: zieleVon(c.desktop)
            .filter((z) => z.eigen && z.id !== id)
            .map((z) => z.name),
        };
      }),
    };
  }

  return nein("Unbekannte Aktion.");
}
