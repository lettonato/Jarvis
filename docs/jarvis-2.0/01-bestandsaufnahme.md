# JARVIS 2.0 – Phase 1: Bestandsaufnahme (Ist-Architektur)

Stand: 5. November 2026. Geprüft wurde der neueste Entwicklungsstand, also der Branch `dokumente`
(PR #17, Commit `9d6811c`). Er enthält alle offenen PRs #2 bis #17 als Stapel. Auf `main` liegt nur PR #1
(Kommandozentrale), alles andere ist **nicht gemergt**.

Grundlage sind ausschließlich der Code, die Git-Historie und Prüfläufe in einer Cloud-Sandbox
(Linux, Node 22.23.4). Nichts davon wurde auf Benedikts Mac oder gegen echte Konten ausgeführt.

## 1. Überblick in einem Satz

JARVIS ist heute **eine einzige Next.js-Anwendung (TypeScript, Next 16.4.2, React 19.3)**, die auf einem
Mac unter `127.0.0.1:3000` im Entwicklungsmodus (`npm run dev`) läuft, ihre Daten als JSON-Dateien in
`~/.jarvis/` ablegt und Claude über einen persönlichen Anthropic-API-Schlüssel direkt mit rund 25
Werkzeugen ausstattet. Es gibt keinen getrennten Backend-Dienst, keine Datenbank, keine Benutzerverwaltung
und kein zentrales Sicherheits-Gateway.

```
 Browser (localhost:3000)          Telegram-Handy (1 gekoppelter Chat)
        │  fetch + Header x-jarvis           │  Long Polling
        ▼                                    ▼
 ┌─────────────────────── Next.js-Server (ein Node-Prozess) ───────────────────────┐
 │ API-Routen /api/* ── guard.ts (nur localhost, kein cross-site)                   │
 │                                                                                  │
 │ brain.ts (Claude Opus 5.5, Tool Runner, 25 Werkzeuge, web_search/web_fetch)       │
 │   ├─ obsidian.ts   Dateien im Obsidian-Tresor lesen/schreiben                     │
 │   ├─ mail.ts       IMAP lesen, als gelesen markieren                              │
 │   ├─ calendar.ts   Apple-Kalender per osascript (JXA), open -a Calendar           │
 │   ├─ memory.ts     Gedächtnis (gedaechtnis.json)                                  │
 │   ├─ browser.ts    eigenes Chrome per Playwright, Claude steuert Klicks           │
 │   ├─ documents.ts  Analyst (Claude + Websuche) → HTML → PDF                       │
 │   ├─ intel.ts      Grok (xAI) liest Nachrichten und X, 2× täglich                 │
 │   └─ desk/*        Spielgeld-Desk: Scanner, Crawler, Grok, Chief (Claude), Risk   │
 │ instrumentation.ts startet beim Hochfahren: Desk-Takt, Intel-Zeitplan, Telegram   │
 └──────────────────────────────────────────────────────────────────────────────────┘
        │ Dateien                                    │ HTTPS
        ▼                                            ▼
 ~/.jarvis/*.json, ~/.jarvis/browser-profil,   Anthropic, xAI, Telegram, DexScreener,
 ~/Documents/JARVIS, Obsidian-Tresor           CoinGecko, GeckoTerminal, RugCheck,
                                               Twelve Data, Open-Meteo, IMAP-Server
```

## 2. Was tatsächlich da ist und was nur behauptet war

| Funktion laut Plan | Befund im Code | Getestet? |
|---|---|---|
| Claude als KI-Modell | Ja. `src/lib/server/brain.ts`, Modell `claude-opus-5-5`, Anthropic SDK 1.1.0, persönlicher API-Schlüssel aus `~/.jarvis/config.json` oder `ANTHROPIC_API_KEY`. | Nur gegen einen nachgebauten Claude-Server in früheren Sandboxen. Kein Test liegt im Repo. |
| Eigenständiges Öffnen von Programmen und Dateien | **Nur teilweise.** JARVIS öffnet genau drei Dinge: die Kalender-App, Obsidian-Links (`obsidian://`) und eigene PDFs in `~/Documents/JARVIS`. Es gibt **kein** allgemeines „Programm X öffnen“ und keine Shell. | Kalender laut Projektnotizen von Benedikt auf dem Mac bestätigt (PR #7). Sonst nur mit nachgebautem `open`. |
| Dokumentenerstellung | Ja. `documents.ts`: Claude recherchiert mit Websuche, liefert strukturierte Inhalte, JARVIS baut HTML und mit Chrome ein PDF (`pdf.ts`), Ablage `~/Documents/JARVIS`, Versand per Telegram. | Nur gegen nachgebaute Server. |
| Kalenderzugriff | Ja, aber **nur Apple-Kalender auf macOS** (`calendar.ts`, osascript/EventKit). Lesen 31 Tage, neue Termine eintragen. Kein Outlook, kein Graph, unter Windows nicht lauffähig. | Lesen/Eintragen von Benedikt auf dem Mac bestätigt (PR #7). |
| Webcrawler | Ja, aber als Teil des Trading-Desks: `desk/crawler.ts` liest RugCheck und die Projektseite eines Coins (max. 300 KB, 1.500 Zeichen Text). Dazu web_search/web_fetch, die bei Anthropic laufen, und der Browser-Agent. | Nur mit nachgebauten Seiten und DNS-Ersatz. |
| Grok-Agent zur täglichen Marktbeobachtung | Ja. `intel.ts` + `desk/grok.ts`: Grok (xAI Responses API) liest morgens und nachmittags Nachrichten und X zu BTC/ETH/SOL und eigenen Themen, Tagesbudget, kann den Desk 6 h bremsen. | Nur gegen nachgebauten xAI-Server. |
| Trading-Testumgebung mit Spielgeld | Ja. `paper.ts` (feste Regeln), `desk/engine.ts`. **Es gibt keinen Code für echte Börsen, Wallets oder Schlüssel** (geprüft per Volltextsuche). 10.000 $ Spielgeld, Stop-Loss, Tageslimit, Rückfrage vor Käufen. | Nur gegen nachgebauten Markt-Server. |
| Erste automatisierte PC-Aktionen | Ja, in engen Grenzen: Browser-Agent (`browser.ts`, eigenes Chrome-Profil, Klicks und Eintippen, harte Sperren für Kaufen/Absenden/Passwörter), Kalender öffnen, Obsidian-Dateien schreiben. | Nur mit nachgebauten Webseiten. |
| *nicht im Plan genannt* | Mail (IMAP lesen), Obsidian-Aufgaben, Gedächtnis, Telegram-Bedienung, Sprache (Browser-Spracherkennung), 3D-Oberfläche. | wie oben |

**Wichtigster Befund zu Tests:** Im Repository liegt **kein einziger automatischer Test**, kein `npm test`,
keine CI. Die Tests aus den bisherigen PRs (z. B. `rueckfrage.test.ts`, `tempo-engine.test.ts`) und die
nachgebauten Server (`*-mock.mjs`) lagen nur in den Arbeitsordnern früherer Cloud-Sitzungen und sind mit
ihnen verloren. Die PR-Beschreibungen nennen bestandene Tests, nachprüfbar ist das heute nicht mehr.

### Heute in dieser Sitzung tatsächlich geprüft

| Prüfung | Ergebnis |
|---|---|
| `npm ci` | erfolgreich |
| `next build` | erfolgreich, 28 Routen |
| `tsc --noEmit` (nach dem Build, der die Next-Typen erzeugt) | 0 Fehler |
| `eslint` | 0 Befunde |
| `npm audit --omit=dev` | 0 bekannte Schwachstellen |
| Secrets in allen 31 Commits aller Branches | kein echter Schlüssel gefunden (Details in 02-risiken.md) |
| Adressfilter des Browser-Agenten (`urlProblem`) gegen 13 Adressen | Lücken bestätigt (siehe R-04) |
| Adressfilter des Crawlers (`privateAddress`) gegen 13 Adressen | Lücken bestätigt (siehe R-05) |

Funktionstests der einzelnen Module gegen echte oder nachgebaute Dienste wurden **heute nicht** ausgeführt,
weil es dafür im Repo nichts gibt. Das ist der erste Entwicklungsschritt (03-plan-schritt-1.md).

## 3. Komponenten im Einzelnen (9 Punkte)

Alle Komponenten: **Sprache TypeScript**, laufen im selben Node-Prozess, teilen sich `~/.jarvis/`.

### 3.1 KI-Gehirn (Gespräch und Werkzeuge)
1. **Umsetzung:** `src/lib/server/brain.ts`, `/api/gehirn` (NDJSON-Streaming). Anthropic Tool Runner,
   max. 10 Runden, `effort: medium`, Beta `server-side-fallback-2026-07-01`. 25 eigene Werkzeuge plus
   `web_search` (5×) und `web_fetch` (3×). Kontextblock mit Uhrzeit, Aufgaben-, Mail-, Kalender-, Desk-Lage.
2. **Sprache:** TypeScript.
3. **Externe APIs:** Anthropic Messages API (inkl. serverseitiger Websuche und Seitenabruf).
4. **Berechtigungen:** API-Schlüssel (persönlich). Erbt alle Rechte der Werkzeuge: Obsidian schreiben,
   Mail als gelesen markieren, Termine anlegen, Browser steuern, Desk starten/stoppen, Dokumente auf
   Kosten starten, Gedächtnis ändern.
5. **Datenflüsse:** Satz + letzte 24 Gesprächszeilen + komplettes Gedächtnis + Kontextzeilen gehen zu
   Anthropic; über Werkzeuge zusätzlich bis zu 150 Aufgaben, 40 Mail-Kopfzeilen, ganze Mailtexte,
   150 Termine, Desk-Stand, Browser-Ergebnisse.
6. **Speicher:** keiner eigener; Gesprächsverlauf liegt im Browser bzw. im Telegram-Zustand.
7. **Fehlerquellen:** Abbruch nach 10 Runden („mehr als ich auf einmal schaffe“), Zeitüberschreitung 60 s,
   Ablehnungen, fehlende Schlüssel; Antworten nur so gut wie das Modell.
8. **Sicherheitsrisiken:** Werkzeuge laufen **direkt ohne Gateway**, Schutz gegen Prompt Injection nur per
   Satz im Systemprompt (R-01, R-02, R-03).
9. **Abhängigkeiten:** obsidian, mail, calendar, memory, browser, documents, intel, desk, telegram (als Kanal).

### 3.2 Programme und Dateien öffnen
1. **Umsetzung:** `calendar.ts` → `openCalendar`, `openUrl`, `openFile` mit `execFile` (`/usr/bin/open`,
   `/usr/bin/osascript`), **ohne Shell**, feste Argumente. Aufrufer: Kalender-App, `obsidian://`-Links,
   eigene PDFs.
2. **Sprache:** TypeScript, AppleScript/JXA-Schnipsel.
3. **Externe APIs:** keine; macOS-Automation.
4. **Berechtigungen:** macOS „Automation“ für Terminal → Kalender, Dateizugriff des Benutzers.
5. **Datenflüsse:** lokal.
6. **Speicher:** keiner.
7. **Fehlerquellen:** läuft nur auf macOS (`process.platform === "darwin"`), Freigabedialoge von macOS.
8. **Sicherheitsrisiken:** gering, da kein freies Kommando. `openUrl` nimmt beliebige URLs entgegen, wird
   aber nur mit selbst gebauten `obsidian://`-Links aufgerufen.
9. **Abhängigkeiten:** brain, documents, obsidian.

### 3.3 Kalender (Apple)
1. **Umsetzung:** `calendar.ts` (Server) + `src/lib/calendar.ts` (Regeln); JXA-Skript über EventKit liest
   alle Kalender für 31 Tage, legt neue Termine an; kein Ändern/Löschen. Cache im Speicher.
2. **Sprache:** TypeScript + JXA.
3. **Externe APIs:** keine direkt; was iCloud/Exchange auf dem Mac synchronisiert, wird mitgelesen.
4. **Berechtigungen:** macOS-Kalenderzugriff „Vollzugriff“.
5. **Datenflüsse:** Termine → Bildschirm, Telegram-Erinnerungen, Claude (Kontextzeile und `termine_lesen`).
6. **Speicher:** nur im Speicher; Zielkalender in `config.json`.
7. **Fehlerquellen:** macOS-Rechte, Zeitzonen, nur Mac.
8. **Sicherheitsrisiken:** Termine (auch von Dritten eingeladene) sind nicht vertrauenswürdiger Text, der
   ungefiltert an Claude geht (Prompt Injection).
9. **Abhängigkeiten:** brain, telegram (Erinnerungen, Briefing).

### 3.4 Mail (IMAP)
1. **Umsetzung:** `mail.ts` mit `imapflow` + `mailparser`; ungelesene und markierte Mails der letzten 14
   Tage, einzelne Mail öffnen, als gelesen markieren. Kein Senden, kein Löschen.
2. **Sprache:** TypeScript.
3. **Externe APIs:** IMAP-Server des Anbieters (Voreinstellungen in `mailProviders.ts`, z. B. t-online).
4. **Berechtigungen:** volles Postfach-Passwort.
5. **Datenflüsse:** Kopfzeilen und ganze Mailtexte → Bildschirm und Claude.
6. **Speicher:** Passwort **im Klartext** in `~/.jarvis/config.json` (Dateirecht 0600).
7. **Fehlerquellen:** Anbieter-Sperren, App-Passwörter, Zeitüberschreitungen.
8. **Sicherheitsrisiken:** Mails sind der Haupteinfallsweg für Prompt Injection (R-01); Passwort im Klartext (R-07).
9. **Abhängigkeiten:** brain, telegram (Briefing), Oberfläche.

### 3.5 Aufgaben und Notizen (Obsidian)
1. **Umsetzung:** `obsidian.ts` liest Markdown-Aufgaben (Tasks-Plugin-Format) aus dem Tresor, schreibt
   `JARVIS/Eingang.md` und `JARVIS/Notizen.md`, hakt ab, verschiebt. Pfadprüfung gegen Ausbruch aus dem
   Tresor inkl. Symlinks (Zeilen 142–147).
2. **Sprache:** TypeScript.
3. **Externe APIs:** keine.
4. **Berechtigungen:** Schreibzugriff auf den Tresor-Ordner.
5. **Datenflüsse:** Aufgabentexte → Claude; Claude → neue Aufgaben/Notizen.
6. **Speicher:** Obsidian-Tresor (Pfad in `config.json`).
7. **Fehlerquellen:** gleichzeitige Bearbeitung in Obsidian, ungewöhnliche Formate.
8. **Sicherheitsrisiken:** Änderungen (Klasse C) laufen ohne Bestätigung, nur auf Modellentscheidung.
9. **Abhängigkeiten:** brain, telegram.

### 3.6 Gedächtnis
1. **Umsetzung:** `memory.ts`, Werkzeuge `gedaechtnis_merken/aendern/vergessen`, Seite `/api/gedaechtnis`.
2. **Sprache:** TypeScript.
3. **Externe APIs:** keine (aber Inhalt geht bei jeder Anfrage an Anthropic).
4. **Berechtigungen:** —
5. **Datenflüsse:** gesamtes Gedächtnis steht in jedem Systemprompt.
6. **Speicher:** `~/.jarvis/gedaechtnis.json`.
7. **Fehlerquellen:** keine Versionierung, falsche Einträge bleiben.
8. **Sicherheitsrisiken:** Claude schreibt **ohne Rückfrage** dauerhaft hinein; eine manipulierte Mail kann so
   eine Anweisung in alle künftigen Gespräche einschleusen (R-03).
9. **Abhängigkeiten:** brain.

### 3.7 Browser-Agent
1. **Umsetzung:** `server/browser.ts` (762 Zeilen) + Regeln in `src/lib/browser.ts`. Playwright-core 1.64.1
   steuert ein eigenes Chrome mit **dauerhaftem Profil** `~/.jarvis/browser-profil`. Claude bekommt die
   Bedienelemente als Liste und wählt Aktionen (suchen, öffnen, klicken, tippen, auswählen). Max. 30
   Schritte / 6 Minuten. Feste Sperren: Kauf-/Absende-Wörter, Formular-Absenden, Passwort-/TAN-/IBAN-Felder,
   Heimnetz-Adressen (nur nach Namen), Downloads, Dialoge immer „Nein“.
2. **Sprache:** TypeScript.
3. **Externe APIs:** Anthropic; beliebige Webseiten.
4. **Berechtigungen:** lokales Chrome; im Profil gespeicherte Anmeldungen (wenn Benedikt sich dort
   selbst angemeldet hat).
5. **Datenflüsse:** Seiteninhalte → Claude → Klicks; Ergebnis → Gehirn → ggf. Telegram.
6. **Speicher:** Chrome-Profil mit Cookies in `~/.jarvis/browser-profil`.
7. **Fehlerquellen:** Seiten ändern sich, Cookie-Banner, Bot-Erkennung.
8. **Sicherheitsrisiken:** Adressfilter prüft nur Namen, nicht die aufgelöste IP (R-04); jede öffentliche
   Adresse ist erlaubt, also Datenabfluss per Seitenaufruf möglich (R-02); angemeldete Sitzungen im Profil.
9. **Abhängigkeiten:** brain, telegram, Oberfläche (Live-Bild).

### 3.8 Dokumente (Analyst)
1. **Umsetzung:** `documents.ts`, `document-html.ts`, `pdf.ts`. Claude Opus 5.5 mit Websuche/Seitenabruf in
   bis zu 14 Runden, Abgabe über Werkzeug `dokument_abgeben`, Prüfung, HTML, PDF über Chrome **ohne
   JavaScript und ohne Netz**. Kostenbremse `DOC_LIMITS.maxUsd`.
2. **Sprache:** TypeScript.
3. **Externe APIs:** Anthropic (inkl. Websuche), Telegram (Versand).
4. **Berechtigungen:** Schreiben in `~/Documents/JARVIS`.
5. **Datenflüsse:** Auftrag → Anthropic → Webseiten → PDF → Telegram.
6. **Speicher:** `~/Documents/JARVIS`, Ersatz `~/.jarvis/dokumente`, Stand `~/.jarvis/dokumente.json`.
7. **Fehlerquellen:** Ausfall mitten im Lauf (Dokument verloren), Chrome fehlt, Kosten.
8. **Sicherheitsrisiken:** Auftrag kann von Claude ausgelöst werden, auch durch manipulierte Inhalte (Kosten);
   Dateiauslieferung mit Pfadprüfung und strenger CSP – gut gelöst.
9. **Abhängigkeiten:** brain, telegram, Browser-Baustein (Chrome).

### 3.9 Intel (Grok-Marktbeobachtung)
1. **Umsetzung:** `intel.ts`, `desk/grok.ts`; Zeitplan prüft regelmäßig, ob ein Lagebild fällig ist
   (morgens/nachmittags), gezielte Suche auf Zuruf; Tagesbudget in USD; Warnung bremst den Desk 6 h.
2. **Sprache:** TypeScript.
3. **Externe APIs:** xAI Responses API (Grok mit X- und Websuche).
4. **Berechtigungen:** xAI-Schlüssel.
5. **Datenflüsse:** Themen → xAI; Lagebild → Oberfläche, Claude, Telegram, Desk.
6. **Speicher:** `~/.jarvis/intel.json`.
7. **Fehlerquellen:** Budget erschöpft, xAI-Ausfall, Grok-Antwort nicht lesbar.
8. **Sicherheitsrisiken:** X-Beiträge sind manipulierbar und steuern über die Warnung den Desk (nur Spielgeld).
9. **Abhängigkeiten:** desk, brain, telegram.

### 3.10 Spielgeld-Desk (Trading-Simulation)
1. **Umsetzung:** `desk/engine.ts` (1.141 Zeilen): Takt (Wache 10 s, Suche 30 s), Scanner (DexScreener,
   CoinGecko, GeckoTerminal), harte Filter (`thresholds.ts`), Crawler, Grok, Chief (Claude oder
   Faustregeln), Size, Risk, Rohstoffe (Twelve Data). Regeln in `paper.ts` sind Konstanten. Rückfrage vor
   Käufen ab Grenze (`approval.ts`), Not-Aus.
2. **Sprache:** TypeScript.
3. **Externe APIs:** DexScreener, CoinGecko, GeckoTerminal, RugCheck, Twelve Data, xAI, Anthropic.
4. **Berechtigungen:** nur Lese-APIs. **Kein Börsen- oder Wallet-Zugang vorhanden.**
5. **Datenflüsse:** Marktdaten → Entscheidungen → Spielgeld-Konto; Meldungen → Telegram.
6. **Speicher:** `~/.jarvis/spielgeld.json`, `~/.jarvis/spielgeld-trades.jsonl` (wird angehängt).
7. **Fehlerquellen:** Datenquellen fallen aus oder sind gesperrt, Mac schläft ein, Neustart unterbricht.
8. **Sicherheitsrisiken:** keine Echtgeld-Gefahr heute. Claude darf den Not-Aus per `handel_steuern: weiter`
   selbst wieder aufheben (R-06).
9. **Abhängigkeiten:** intel, crawler, brain (Chief), telegram, approval.

### 3.11 Telegram (Handy-Kanal)
1. **Umsetzung:** `server/telegram.ts`: Long Polling, Koppeln per Einmal-Code (Fehlversuche begrenzt), nur
   der gekoppelte Chat wird bedient. Briefing, Erinnerungen, Desk-Meldungen, Rückfrage-Knöpfe, Gespräch
   mit dem vollen Gehirn (ohne Mac-only-Werkzeuge).
2. **Sprache:** TypeScript.
3. **Externe APIs:** Telegram Bot API.
4. **Berechtigungen:** Bot-Token.
5. **Datenflüsse:** Briefing mit Terminen, Aufgaben, Mails und Desk-Stand verlässt den Mac über Telegram.
6. **Speicher:** Token im Klartext in `config.json`, Zustand in `~/.jarvis/telegram.json`.
7. **Fehlerquellen:** zweiter Leser (409), Sperren, Mac offline.
8. **Sicherheitsrisiken:** Wer den Telegram-Account übernimmt, bedient JARVIS mit allen Werkzeugen; Telegram
   ist kein für Firmendaten freigegebener Kanal (R-09).
9. **Abhängigkeiten:** brain, desk, documents, calendar, mail, obsidian.

### 3.12 Oberfläche, Sprache, Zugriffsschutz
1. **Umsetzung:** React-Oberfläche mit 3D-Welt (three.js), Ansichten, Sprache über die Web-Speech-API
   des Browsers (`useVoice.ts`, Weckwort „Jarvis“). Alle API-Routen (16 Dateien) rufen `guard()` auf:
   Host muss localhost sein, keine Cross-Site-Anfragen, Schreibzugriffe brauchen Header `x-jarvis: 1`.
2. **Sprache:** TypeScript/TSX, CSS (Tailwind 4).
3. **Externe APIs:** Spracherkennung des Browsers (bei Chrome/Safari je nach System über Server des Herstellers), Open-Meteo.
4. **Berechtigungen:** Mikrofon im Browser.
5. **Datenflüsse:** gesprochener Text → Gehirn.
6. **Speicher:** Einstellungen im Browser (localStorage) und `~/.jarvis`.
7. **Fehlerquellen:** Next-Dev-Modus im Alltag (langsamer Start, Cache-Probleme, siehe `rm -rf .next/dev`).
8. **Sicherheitsrisiken:** Keine Anmeldung; Schutz beruht allein darauf, dass nur `127.0.0.1` lauscht.
   Für Azure muss das komplett ersetzt werden (Entra ID).
9. **Abhängigkeiten:** alle Server-Module über `/api/*`.

## 4. Speicherorte (alle lokal auf dem Mac)

| Ort | Inhalt | Schutz |
|---|---|---|
| `~/.jarvis/config.json` | Name, Tresorpfad, **Mail-Passwort, Claude-, xAI-, Twelve-Data-Schlüssel, Telegram-Token** | Klartext, Datei 0600, Ordner 0700 |
| `~/.jarvis/gedaechtnis.json` | Gedächtnis | Klartext |
| `~/.jarvis/telegram.json`, `intel.json`, `dokumente.json` | Zustände | Klartext |
| `~/.jarvis/spielgeld.json`, `spielgeld-trades.jsonl` | Desk-Stand, Trade-Protokoll | Klartext, änderbar |
| `~/.jarvis/browser-profil/` | Chrome-Profil inkl. Cookies | wie Chrome |
| `~/Documents/JARVIS/` | erzeugte PDFs/HTML | Benutzerrechte |
| Obsidian-Tresor | Aufgaben, Notizen | Benutzerrechte |

## 5. Laufzeit und Betrieb

* Start per Doppelklick: `start-jarvis.command` (Mac) bzw. `start-jarvis.bat` (Windows, dort fehlen
  Kalender und „Öffnen“). Beide installieren mit `npm install` (nicht `npm ci`) und starten **`npm run dev`**.
* `caffeinate` hält den Mac wach, damit der Desk weiterläuft.
* Hintergrundarbeit startet in `src/instrumentation.ts` (Desk, Intel, Telegram) im selben Prozess.
* Kein Container, keine Health-Checks, keine Protokolldateien außer `console.error` im Terminal und dem
  Trade-Protokoll.

## 6. Abgleich mit der Zielarchitektur

| Ziel | Ist | Abstand |
|---|---|---|
| Azure Container Apps | lokaler Next-Dev-Server | groß: Container, Produktionsmodus, Hintergrundjobs auslagern |
| Entra ID + MFA | keine Anmeldung, nur localhost | vollständig neu |
| Microsoft Graph (Outlook, Kalender, SharePoint, Planner, Teams) | IMAP + Apple-Kalender + Obsidian | neu; Apple/IMAP bleiben höchstens für privat |
| PostgreSQL | JSON-Dateien | neu, mit Datenmodell |
| Blob Storage | `~/Documents/JARVIS` | Speicher-Adapter nötig |
| Key Vault / Managed Identity | Klartext-JSON | Geheimnis-Adapter nötig |
| Security Gateway, Klassen A–D | Werkzeuge direkt am Modell | **Kernaufgabe Phase 2** |
| Azure Monitor, Audit-Log | `console.error` | neu |
| Desktop Agent (Windows-Login) | Mac-spezifisch (osascript, open, caffeinate) | **offene Frage:** Mac oder Windows? |
| Modelladapter | Anthropic-SDK fest verdrahtet in 4 Dateien | Adapter nötig |

Die gewählten Azure-Dienste passen grundsätzlich zur Anwendung: Sie ist zustandsarm genug für Container
Apps, die JSON-Zustände lassen sich sauber in Tabellen überführen, und Hintergrundtakte (Desk, Intel,
Telegram) passen zu Container Apps Jobs. Zwei Punkte brauchen eine Entscheidung vor Phase 3: Der
Browser-Agent braucht ein Chrome mit Profil und gehört eher auf den Desktop Agent als in die Cloud, und
der Spielgeld-Desk mit seinem 10-Sekunden-Takt sollte als eigener Dienst laufen, nicht im Web-Prozess.
