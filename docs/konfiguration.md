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
| `telegram.bot`, `chatId`, `chatName`, `trades`, `warnings`, `reminders`, `briefing` | Kopplung und Meldungen | nein |
| `calendar.target` | Kalender für neue Termine | nein |
| `intel.topics`, `budgetUsd`, `auto` | Themen und Budget für Intel | nein |
| `approval.limitUsd` | Ab welchem Betrag der Desk vor Käufen fragt (`null` = nie) | nein |

Weitere Zustandsdateien im selben Ordner (kein Konfigurationsinhalt, aber persönliche Daten):
`gedaechtnis.json`, `telegram.json`, `intel.json`, `dokumente.json`, `spielgeld.json`,
`spielgeld-trades.jsonl`, `browser-profil/`.

**Bekannte Schwäche (R-07):** Geheimnisse stehen im Klartext in dieser Datei. Ziel laut Plan: macOS-
Schlüsselbund bzw. Azure Key Vault mit Managed Identity, getrennte Schlüssel für Test und Produktion.

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
| `TWELVEDATA_URL` | `https://api.twelvedata.com` |
| `JARVIS_SEARCH_URL` | DuckDuckGo-HTML-Suche (Browser-Agent) |

### Orte und Programme

| Variable | Standard | Zweck |
|---|---|---|
| `JARVIS_CONFIG_DIR` | `~/.jarvis` | Einstellungen und Zustände |
| `JARVIS_DOCS_DIR` | `~/Documents/JARVIS` | Ablage der Dokumente |
| `JARVIS_CHROME` | installiertes Google Chrome | Chrome-Programm für Browser-Agent und PDF |
| `JARVIS_OSASCRIPT` | `/usr/bin/osascript` | macOS-Automation (Tests: nachgebauter Mac) |
| `JARVIS_OPEN` | `/usr/bin/open` | Programme/Dateien öffnen (Tests: Ersatz) |
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
