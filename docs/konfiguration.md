# JARVIS – Konfiguration

Stand: 5. November 2026. Konfiguration und Geheimnisse liegen **nie im Repository**, sondern außerhalb
des Programmordners. Der Code liest sie an genau zwei Stellen: aus `~/.jarvis/config.json` und aus
Umgebungsvariablen.

## 1. Einstellungsdatei `~/.jarvis/config.json`

* Wird von der Einstellungsseite in JARVIS geschrieben (`src/lib/server/config.ts`), Ordner mit Rechten
  0700, Datei mit 0600.
* Der Ordner lässt sich mit `JARVIS_CONFIG_DIR` verlegen (Tests nutzen dafür immer einen leeren Testordner).
* Vorlage ohne echte Werte: [`config.example.json`](../config.example.json).

| Schlüssel | Bedeutung | Geheim? |
|---|---|---|
| `name` | Wie JARVIS dich anspricht | nein |
| `vaultPath` | Pfad zum Obsidian-Tresor | nein |
| `mail.provider`, `host`, `port`, `user` | IMAP-Postfach | nein |
| `mail.password` | Postfach-Passwort (am besten App-Passwort) | **ja** |
| `claude.apiKey` | Anthropic-API-Schlüssel | **ja** |
| `xai.apiKey`, `xai.dailyBudgetUsd` | Grok (xAI) für X und Intel, Tagesbudget | Schlüssel **ja** |
| `twelvedata.apiKey` | Kurse für Gold, Silber, Öl | **ja** |
| `telegram.token` | Schlüssel des eigenen Telegram-Bots | **ja** |
| `telegram.bot`, `chatId`, `chatName`, `trades`, `warnings`, `reminders`, `projekte`, `briefing`, `abschluss` | Kopplung und Meldungen | nein |
| `calendar.target` | Kalender für neue Termine | nein |
| `microsoft.tenantId`, `clientId`, `konto`, `extern` | Microsoft 365: Verzeichnis und Anwendung, verbundenes Konto, Schalter „Outlook-Termine auch im Gespräch und über Telegram“ (siehe `docs/jarvis-2.0/08-microsoft-365.md`) | nein |
| `microsoft.refreshToken` | Anmeldung bei Microsoft 365 (Schlüssel zum Angemeldetbleiben); entsteht bei der Anmeldung mit Code, nie von Hand eintragen | **ja** |
| `intel.topics`, `budgetUsd`, `auto` | Themen und Budget für Intel | nein |
| `desktop.aus`, `desktop.eigene` | Programme und Ordner am Mac (seit Schritt H2.1): Kennungen der ausgeschalteten Einträge der festen Liste; Namen der eigenen Programme (höchstens 12). Am besten über Einstellungen → Programme ändern: Von Hand eingetragene Namen, die JARVIS nicht zulässt (Pfade, Sonderzeichen, Wörter wie „Mail“), werden übergangen | nein |
| `approval.limitUsd` | Ab welchem Betrag der Desk vor Käufen fragt (`null` = nie) | nein |
| `geheimnisse` | `datei` (Standard) oder `schluesselbund`; nur über Einstellungen → Sicherheit ändern | nein |

Weitere Zustandsdateien im selben Ordner (kein Konfigurationsinhalt, aber persönliche Daten):
`gedaechtnis.json`, `telegram.json`, `intel.json`, `dokumente.json`, `spielgeld.json`,
`spielgeld-trades.jsonl`, `browser-profil/`.

Projektgedächtnis (seit Schritt C1, siehe `docs/jarvis-2.0/07-projektgedaechtnis.md`): `projekte.json`
(Projekte, bestätigte Einträge mit Verlauf, Vorschläge). Nicht von Hand ändern; ist die Datei beschädigt,
meldet JARVIS das und überschreibt sie nicht.

Dateien des Security Gateways (seit Schritt 2, siehe `docs/jarvis-2.0/04-security-gateway.md`):
`sicherheit.json` (Not-Aus, Agentensperren, Strenge für Klasse C; ist sie beschädigt, startet JARVIS mit
Not-Aus), `freigaben.json` (die letzten 60 Freigaben), `audit.jsonl` (Audit-Log, nur angehängt, mit
Prüfkette). Nicht von Hand ändern: Eine geänderte Zeile im Audit-Log meldet die Prüfung als Manipulation.

**Zugangsdaten (R-07):** Ohne Umzug stehen die fünf Geheimnisse im Klartext in dieser Datei. Seit Schritt
2.3 lassen sie sich unter Einstellungen → Sicherheit in den macOS-Schlüsselbund umziehen (Dienst „JARVIS“,
je Geheimnis ein Eintrag). Dann steht hier `"geheimnisse": "schluesselbund"` und statt jedes Werts
`"@schluesselbund"`. Diese Marken nicht von Hand ändern; zurück geht es über „Zurück in die Datei“.
Beschreibung: [`docs/jarvis-2.0/05-zugangsdaten.md`](jarvis-2.0/05-zugangsdaten.md). Ziel laut Plan bleibt
Azure Key Vault mit Managed Identity und getrennten Schlüsseln für Test und Produktion.

## 2. Umgebungsvariablen

Alle optional. Ohne sie gilt der Wert in der Spalte „Standard“.

### Schlüssel (Ersatz, wenn nichts in `config.json` steht)

| Variable | Standard | Zweck |
|---|---|---|
| `ANTHROPIC_API_KEY` | – | Claude-Schlüssel für Entwickler |
| `XAI_API_KEY` | – | Grok-Schlüssel |
| `TWELVEDATA_API_KEY` | – | Twelve-Data-Schlüssel |

### Adressen externer Dienste (für Tests auf nachgebaute Server umlenkbar)

| Variable | Standard |
|---|---|
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` (vom Anthropic SDK gelesen) |
| `XAI_BASE_URL` | `https://api.x.ai` |
| `TELEGRAM_API_URL` | `https://api.telegram.org` |
| `DEXSCREENER_URL` | `https://api.dexscreener.com` |
| `COINGECKO_URL` | `https://api.coingecko.com` |
| `GECKOTERMINAL_URL` | `https://api.geckoterminal.com` |
| `RUGCHECK_URL` | `https://api.rugcheck.xyz` |
| `OPEN_METEO_URL` | `https://api.open-meteo.com` |
| `TWELVEDATA_URL` | `https://api.twelvedata.com` |
| `MICROSOFT_LOGIN_URL` | `https://login.microsoftonline.com` |
| `MICROSOFT_GRAPH_URL` | `https://graph.microsoft.com/v1.0` |
| `ELEVENLABS_BASE_URL` | `https://api.elevenlabs.io` (ElevenLabs-Stimme) |
| `JARVIS_SEARCH_URL` | DuckDuckGo-HTML-Suche (Browser-Agent) |

### Orte und Programme

| Variable | Standard | Zweck |
|---|---|---|
| `JARVIS_CONFIG_DIR` | `~/.jarvis` | Einstellungen und Zustände |
| `JARVIS_DOCS_DIR` | `~/Documents/JARVIS` | Ablage der Dokumente |
| `JARVIS_PROJEKTE_DB` | nicht gesetzt | Adresse einer PostgreSQL-Datenbank (`postgres://benutzer:kennwort@rechner:5432/datenbank`). Gesetzt: Das Projektgedächtnis liegt dort statt in `projekte.json`. Enthält ein Kennwort, gehört deshalb nie in eine Datei im Repository. Außerhalb dieses Rechners immer verschlüsselt. Einzelheiten: [09-azure-vorbereitung.md](jarvis-2.0/09-azure-vorbereitung.md) |
| `JARVIS_CHROME` | installiertes Google Chrome | Chrome-Programm für Browser-Agent und PDF |
| `JARVIS_OSASCRIPT` | `/usr/bin/osascript` | macOS-Automation (Tests: nachgebauter Mac) |
| `JARVIS_OPEN` | `/usr/bin/open` | Programme, Ordner und Dateien öffnen (Tests: `test/mocks/open-mock.mjs`). Ist sie gesetzt, bietet JARVIS das Öffnen von Programmen auch auf einem Rechner an, der kein Mac ist; **nur für Tests** |
| `JARVIS_SECURITY_BIN` | `/usr/bin/security` | macOS-Schlüsselbund (Tests: `test/mocks/security-mock.mjs`) |
| `JARVIS_WEATHER_PLACE`, `JARVIS_WEATHER_LAT`, `JARVIS_WEATHER_LON` | Deggendorf, 48.84 / 12.96 | Wetter und Ort für die Websuche |

### Takt und Testhilfen

| Variable | Standard | Zweck |
|---|---|---|
| `JARVIS_TICK_MS` | 10000 | Takt des Spielgeld-Desks |
| `JARVIS_HUNT_MS` | 3 × Takt | Suche nach neuen Coins |
| `JARVIS_COMMODITY_MS` | 360000 | Abfrage Rohstoffkurse |
| `JARVIS_TELEGRAM_POLL_S` | 50 | Long Polling bei Telegram |
| `JARVIS_BROWSER_HEADLESS` | – | `1` = Chrome nie sichtbar (Tests) |
| `JARVIS_BROWSER_LOCAL` | – | Hosts, die der Browser trotz Heimnetz öffnen darf (**nur Tests**) |
| `JARVIS_BROWSER_TEMPO` | 1 | Bremst den Browser-Agenten (Videos) |
| `JARVIS_DESKTOP_FRIST_MS` | 10000 | Wie lange JARVIS beim Öffnen eines Programms auf den Mac wartet (Tests: kürzer) |

`NEXT_RUNTIME`, `NEXT_PHASE` und `APPDATA` setzt Next.js bzw. Windows selbst.

## 3. Test und Produktion trennen

* Tests (`npm test`) setzen immer einen frischen `JARVIS_CONFIG_DIR` im Temp-Ordner, lenken alle
  Dienstadressen auf nachgebaute Server oder einen toten Port und löschen `ANTHROPIC_API_KEY`,
  `XAI_API_KEY`, `TWELVEDATA_API_KEY` aus der Umgebung (`test/helfer/umgebung.ts`). Ein Test kann so
  nie echte Daten lesen, echte Dienste ansprechen oder Kosten auslösen.
* Die CI (`.github/workflows/pruefung.yml`) braucht keine Geheimnisse.
* Für Azure (Phase 3) kommen getrennte Schlüssel je Umgebung aus Key Vault; das ist noch offen.

## 4. Reproduzierbar starten

* Node.js 22 (`.nvmrc`, `engines` in `package.json`).
* Pakete exakt nach `package-lock.json`: `npm ci` (auch in den Startdateien).
* Prüfen vor jedem Push: `npm run pruefen` (Lint, Typprüfung, Tests), dazu `npx next build`.
