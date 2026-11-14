# JARVIS 2.0 – Entwicklungsübersicht

Dauerhafte Übersicht nach dem verbindlichen Entwicklungsplan für D&S. Wird bei jedem Schritt aktualisiert.

**Oberstes Ziel:** ein vollständig integrierter, proaktiver digitaler Geschäftsführungsassistent für D&S.
Kein Bündel einzelner Funktionen, sondern ein System mit zentralem Gedächtnis, einheitlicher Oberfläche,
gemeinsamer Agentensteuerung und sicheren Unternehmensintegrationen. Jede Änderung muss darauf einzahlen.

**Zustände:** Offen · In Arbeit · Blockiert · Testbereit · Abgeschlossen

**Regeln:** „Abgeschlossen“ nur mit nachprüfbarem Beleg (Testlauf, CI-Lauf, Bestätigung von Benedikt).
„Testbereit“ heißt: gebaut, aber noch nicht vollständig geprüft (z. B. nur in der Sandbox, nicht auf dem
Mac). Bekannte Lücken werden nie als bestanden geführt. Produktive Änderungen, Berechtigungen,
Zugangsdaten, Kosten und vertrauliche Daten nur nach ausdrücklicher Freigabe. Vertrauliche
Unternehmensdaten erst nach Sicherheits- und Datenschutzfreigabe. Merge nur auf Benedikts „merge“.

Letzte Aktualisierung: 13. November 2026 (Schritt B5, nach E2 „Glashaus“)

## Aktueller Stand

Seit 13. November 2026 gilt Benedikts Dauerauftrag: JARVIS eigenständig fertigentwickeln, in der Reihenfolge
Sicherheit und Stabilität → Gehirn und Projektgedächtnis → Dashboard und Agentensteuerung → proaktive
Routinen und Agenten → Microsoft 365 (zuerst nur mit Testdaten) → Sprache, Desktop, Azure-Vorbereitung.
Grenzen: keine echten Firmendaten, keine Kosten, keine echten Mails/Termine, keine Änderung an echten
Zugangsdaten, kein Push/Merge ohne ausdrückliche Freigabe.

Die Sicherheitsarchitektur (Schritte 2.1 bis 2.6), das Projektgedächtnis (Schritt C1), die Tagesübersicht
„Heute“ (Schritt E1), die ersten proaktiven Routinen (Schritt G1: Projekte im Morgenbriefing,
Tagesabschluss), die Agentensteuerung (Schritt F1) und die ElevenLabs-Stimme mit Unterbrechen (Schritt H1,
Benedikts Wunsch vom 13. November) und das Kostenbuch mit der Modellwahl an einer Stelle (Schritt J1) sind
gebaut und in der Sandbox geprüft: 711 von 711 automatischen Tests bestehen, 0 übersprungen, 0 bekannte Lücken als TODO (seit Schritt B2 auch die Post gegen ein nachgebautes
Postfach und der Kaufpfad des Spielgeld-Desks gegen einen nachgebauten Markt). Die ElevenLabs-Stimme ist nur gegen einen nachgebauten
Dienst geprüft, nie gegen das echte ElevenLabs; sie ist aus, bis Benedikt am Mac seinen Schlüssel einträgt.
Seit Schritt E2 hat JARVIS das neue Aussehen „Glashaus“ (Benedikts Wahl vom 13. November): zwölf helle Räume
mit Fensterfront, die Kamera fährt von Raum zu Raum. Alle Funktionen sind geblieben; die frühere 3D-Landschaft
wird nicht mehr gezeigt, ihr Code liegt noch im Repo (Frage 7). Seit Schritt E3 sind auch die dichten Räume
Trading und Einstellungen ruhig: keine weißen Kästen mehr, die Scan-Tabelle zeigt alle Spalten, die
Einstellungen haben oben eine Sprungleiste. Seit Schritt F2 gibt es einen gemeinsamen Zeitplan für alles, was
JARVIS von selbst tut, und den ersten neuen Agenten: ein Lagebild für Gold und Silber aus Tageskursen, nach
festen Regeln und ohne KI-Modell. Er ist nur gegen ein nachgebautes Twelve Data geprüft. Seit Schritt G3
entwirft JARVIS auf Zuruf Antworten auf Mails; verschicken kann er nichts, und im Postfach ändert er dafür
nichts (nur gegen ein nachgebautes Postfach und ein nachgebautes KI-Modell geprüft). Seit Schritt D1 kann
JARVIS die Termine aus Outlook lesen (Microsoft 365 über Graph, nur lesen, nur der Kalender). Das ist **nur
gegen ein nachgebautes Microsoft geprüft**; mit dem echten läuft es erst, wenn eure IT eine Anwendung im
Verzeichnis angelegt hat und Benedikt sich am Mac selbst anmeldet.
Offen ist die Prüfung auf dem Mac ([Prüfliste](docs/pruefliste-mac.md)); bis dahin steht alles auf
„Testbereit“. Das Projektgedächtnis ist nur mit Testdaten geprüft. Benedikt hat am 13. November freigegeben,
dass seine eigenen, unkritischen Projektdaten hinein dürfen; sensible Firmen- und Kundendaten weiterhin nicht
(siehe „Offene Fragen“, Punkt 5).

## Gesamtfortschritt

| Bereich (Auftrag vom 13.11.) | Stand | Was fehlt bis „Abgeschlossen“ |
|---|---|---|
| A Sicherheitsarchitektur | **Testbereit** (Sandbox) | Prüfliste auf dem Mac; unveränderliches Audit-Log und Key Vault erst mit Azure |
| B Bestehende Funktionen stabilisieren | **Testbereit** für Telegram, Intel, Kalender, Dokumente, Gehirn, Desk (mit Kaufpfad), Mail (IMAP), Obsidian, Gedächtnis; **Offen** für Sprache und Oberfläche als automatische Tests | Oberflächentests im Browser; Mac-Prüfliste; zwei kleine Befunde aus den Durchsichten (siehe Schritt B5) |
| C Gehirn und Projektgedächtnis | **Testbereit** (Sandbox, Testdaten): Projektakten, Vorschläge mit Bestätigung und Korrektur, Vorbereitung vor Besprechungen, Speicherschicht für PostgreSQL vorbereitet | Mac-Prüfliste Teil E; Zuordnung von Mails; persönliches Gedächtnis einbinden; Freigabe für echte Projektdaten |
| E Geschäftsführungsdashboard | **Testbereit** für Tagesübersicht „Heute“, Projektübersicht, Agentenübersicht und die neue Oberfläche „Glashaus“ (zwölf Räume); **Offen** für Unternehmens- und Finanzübersicht | Mac-Prüfliste Teile F und J; Unternehmensübersicht (braucht Microsoft 365) |
| F Agenten | **Testbereit** für die zentrale Steuerung der sechs Agenten (Zustand, Läufe, Kosten, Grenzen, Start, Pause, Sperre), den gemeinsamen Zeitplan und den Edelmetall-Agenten (nur gegen Nachbau); **Offen** für weitere Agenten | Mac-Prüfliste Teile H und K; Marktagent, Newsletter und weitere |
| G Proaktive Routinen | **Testbereit** für Morgenbriefing mit Projekten, Tagesabschluss, Projektüberwachung, Hinweise am Tag (einstellbar, abschaltbar) und Antwortentwürfe für Mails ohne Versand; **Offen** für Marktüberwachung über Intel hinaus | Mac-Prüfliste Teile G, L und M; Hinweis als Mitteilung am Mac (G2.4); Entwurf im Ordner „Entwürfe“ des Postfachs (Frage 13) |
| D Microsoft 365 | **Testbereit** (nur gegen Nachbau) für Termine aus Outlook lesen (Schritt D1); **Blockiert** für die echte Anbindung, bis eure IT die Anwendung in Entra angelegt hat; **Offen** für Mail, Dateien, Teams | App-Registrierung durch die IT (Frage 14), Mac-Prüfliste Teil N; weitere Teile nur nach Benedikts Entscheidung |
| H Sprache und Desktop | **Testbereit** (nur gegen Nachbau) für die ElevenLabs-Stimme und das Unterbrechen mit „Stopp“; vorhanden: Weckwort, Vorlesen mit der Mac-Stimme, Programme öffnen auf macOS | Mac-Prüfliste Teil I mit echtem Schlüssel; Desktop-Agent mit Regeln |
| I Azure | **Blockiert** (Entscheidung und Kostenfreigabe) | Vorbereitung: Speicher- und Modellschicht austauschbar, Anleitung |
| J Qualität | **Testbereit** für das Kostenbuch (Kosten je Agent, heute und im Monat) und die Modellwahl an einer Stelle (Schritt J1); **Offen** für austauschbare Anbieter und Wiederherstellungstests | Mac-Prüfliste H7 und H8 (Zahlen mit der Abrechnung bei Anthropic vergleichen) |

## Wiederaufnahmepunkt

Für jede Fortsetzung, auch nach einer Unterbrechung:

* **Letzter gesicherter Stand:** siehe Abschnitt „Sicherung“ am Ende dieser Datei (Commit und Dateien).
* **Arbeitsort:** Cloud-Sandbox, nicht dauerhaft. Dauerhaft sind nur die Sicherungen in den Projektdateien
  (`jarvis/sicherung/`): ein Git-Bündel des Arbeitszweigs, ein Bündel aller Zweige, ein ZIP zum Entpacken.
  Wiederherstellen: `git clone jarvis-<datum>.bundle -b claude/project-thread-200bzy`, dann `npm ci`,
  `npm run pruefen`.
* **GitHub:** seit 13. November gesperrt (Konto). Letzter hochgeladener Stand `093129f`. Hochladen erst nach
  Benedikts Freigabe, kein Force-Push.
* **Exakt nächster Schritt:** steht unter „Nächste Schritte“ am Ende dieser Datei.

---

## Zielübersicht: Kernfunktionen des fertigen JARVIS

Wo steht jede Kernfunktion auf dem Weg zum fertigen Geschäftsführungsassistenten?
„Heute“ beschreibt, was im Code wirklich da ist. „Ziel“ ist der Endzustand laut Plan.

| Kernfunktion | Heute | Ziel | Phase | Stand |
|---|---|---|---|---|
| **Fundament** | | | | |
| Sicherheitsnetz: Tests, CI, Secret-Scan, Rückfallpunkt | 123 Tests, CI grün, gitleaks ohne Fund | jeder Schritt automatisch geprüft | 1 | Abgeschlossen ([CI-Lauf](https://github.com/lettonato/Jarvis/actions/runs/42112321400)); Mac-Prüfliste offen |
| Security Gateway (alle Werkzeuge, Klassen A–D, Deny by Default) | alle 32 Werkzeuge von Gehirn (24), Browser (7) und Analyst (1) laufen durch `gateway/`, Websuche und Webseiten werden protokolliert, Herkunftsmarkierung, Freigaben per Knopf | jede Aktion geprüft, protokolliert, freigegeben | 2 | Testbereit (Sandbox geprüft, Mac offen) |
| Zentraler Not-Aus und Agentensperre | ein Schalter für Gespräch, Browser, Analyst, Intel, Desk; lösen nur am Mac mit „FREIGEBEN“ | ein Schalter für alles, nur Mensch löst | 2 | Testbereit (Sandbox geprüft, Mac offen) |
| Audit-Log und Alarmierung | `audit.jsonl` mit SHA-256-Kette, Schwärzung, Alarm per Telegram/Mac | manipulationssicher, Azure Monitor | 2/3 | Testbereit (lokal); unveränderliche Ablage Offen (Phase 3) |
| Geheimnisverwaltung | wahlweise Klartext `~/.jarvis/config.json` oder macOS-Schlüsselbund (Umzug per Knopf am Mac) | Key Vault, Managed Identity, getrennt Test/Prod | 2/3 | Schlüsselbund Testbereit (Sandbox geprüft, Mac offen); Key Vault Offen (Phase 3) |
| Anmeldung | keine, nur localhost | Entra ID mit MFA, eigene Identität je Nutzer | 5 | Offen |
| Betrieb in Azure | lokaler Next-Server | Container Apps, Test- und Prod-Umgebung, IaC | 3 | Blockiert (Azure-Abo/IT klären) |
| Modelladapter | Modell und Preise je Rolle an einer Stelle (`src/lib/modelle.ts`); die Aufrufe selbst sind weiter Anthropic-Aufrufe in 4 Dateien | Claude primär, andere Modelle austauschbar | 4 | Modellwahl an einer Stelle Testbereit (Schritt J1); anderer Anbieter Offen |
| **Zentrales Gedächtnis** | | | | |
| Persönliches Gedächtnis | `gedaechtnis.json`, jeder Eintrag erst nach Ja per Knopf | Teil des Projektgedächtnisses, mit Bestätigung | 2/6 | Testbereit (Bestätigung), Umbau Offen |
| Projektakten (Verantwortliche, Termine, Aufgaben, Entscheidungen, Risiken, Quellen) | `projekte.json` hinter einer Speicherschnittstelle; jeder Eintrag mit Quelle, Zeitstempel und Korrekturverlauf; Ansicht „Projekte“ | PostgreSQL mit Quelle und Zeitstempel | 6 | Testbereit (Datei, Testdaten); PostgreSQL Offen (Phase 3) |
| Gesprächsnachbereitung (Aufgaben/Entscheidungen aus Notizen, Vorschlag zur Bestätigung) | JARVIS schlägt im Gespräch Einträge vor; sie gelten erst nach Bestätigung am Mac (auch geändert) | strukturiert, erst nach Bestätigung gespeichert | 6 | Testbereit (im Gespräch); aus Mails und Besprechungsnotizen von selbst Offen |
| Intelligente Erinnerung vor Folgeterminen | Vorbereitung aus bestätigten Einträgen, wenn der Termin ein Projekt nennt; am Mac im Gespräch, per Telegram nur nach Einschalten | frühere Entscheidungen mit Quelle | 6 | Testbereit |
| **Einheitliche Oberfläche** | | | | |
| Kommandozentrale mit Ansichten und 3D-Welt | vorhanden (13 Ansichten) | Geschäftsführungsdashboard | 7 | Testbereit |
| Tagesübersicht, Projektübersicht, Unternehmensüberblick | Ansichten „Heute“ und „Projekte“; Unternehmensüberblick fehlt | alle Bereiche aus Phase 7 | 7 | Testbereit (Tag, Projekte), Offen (Unternehmen) |
| JARVIS-Chat (Text und Sprache, öffnet Bereiche) | vorhanden, öffnet Ansichten | zentral im Dashboard | 7/8 | Testbereit |
| Mitarbeiterkapazitäten | fehlt | nur offizielle Zeiterfassung, keine Überwachung | 7 | Offen |
| **Gemeinsame Agentensteuerung** | | | | |
| Agentensteuerung an einer Stelle | Ansicht „Agenten“: Zustand, Läufe, Kosten, Grenzen, Start, Pause, Sperre für fünf Agenten | dazu Zeitplan und weitere Agenten | 9 | Testbereit (Steuerung), Offen (Zeitplan, neue Agenten) |
| KI-Gehirn mit Werkzeugen | 28 Werkzeuge + Websuche, alle über das Gateway | über Gateway, Datenminimierung | 2/4 | Testbereit |
| Browser-Agent | eigenes Chrome, harte Kauf-/Passwortsperren, jede Aktion über das Gateway, jede Verbindung über die Netzschleuse (kein DNS-Rebinding, auch WebSockets geprüft) | über Gateway, DNS-geprüfte Adressen | 2/9 | Testbereit (R-04 samt Rest behoben, Mac offen) |
| Dokumentenagent (Recherche → PDF) | vorhanden, Kostenbremse 10 $, Abgabe über das Gateway, Not-Aus bricht ab | über Gateway, Ablage SharePoint/Blob | 9 | Testbereit |
| Grok-Marktbeobachtung (Intel) | 2× täglich, Tagesbudget | proaktive Berichte | 9 | Testbereit |
| Webcrawler | gemeinsamer Netzschutz `netz.ts` (alle IP-Formen, feste geprüfte IP je Abruf) | gemeinsam nutzbar, Lücken geschlossen | 2/9 | Testbereit (R-05 behoben) |
| Trading-Simulation (Spielgeld) | vorhanden, kein Echtgeld-Code | strikt getrennt von Echtgeld | 9 | Testbereit |
| Proaktive Routinen (Kalender, Projekte, Rückmeldungen, Berichte) | Briefing mit Projekten, Tagesabschluss, Erinnerungen mit Vorbereitung; jede einzeln abschaltbar | kontrollierbar, protokolliert, abschaltbar | 9 | Testbereit (Briefing, Abschluss), Offen (Rückmeldungen, Berichte) |
| Verkehrsplanung | fehlt | echte Verkehrsdaten | 9 | Offen |
| **Sichere Unternehmensintegrationen** | | | | |
| Kalender | Apple-Kalender (macOS), lesen und eintragen | Outlook über Microsoft Graph | 5 | Testbereit (Apple), Graph Offen |
| E-Mail | IMAP lesen, als gelesen markieren | Graph: Testpostfach, Priorisierung, Entwürfe, Versand nur nach Freigabe | 5 | Testbereit (IMAP), Graph Offen |
| Aufgaben | Obsidian | Planner, Projektgedächtnis | 5/6 | Testbereit (Obsidian), Planner Offen |
| Dokumente/SharePoint | eigene PDFs | SharePoint finden, Blob nur wenn nötig | 5 | Offen |
| Teams | fehlt | berechtigte Informationen | 5 | Offen |
| Handy | Telegram (ein gekoppelter Chat) | für Firmendaten Teams/Dashboard statt Telegram | 5/7 | Testbereit (privat) |
| **Desktop und Sprache** | | | | |
| Programme und Dateien öffnen | Kalender-App, Obsidian, eigene PDFs (macOS) | Desktop Agent mit freigegebenen Aktionen | 8 | Testbereit (eingeschränkt) |
| Sprache (Weckwort, Vorlesen, Unterbrechen) | Web-Speech im Browser | Desktop Agent, unterbrechbar | 8 | Testbereit |
| Autostart und Morgenroutine | `start-jarvis.command` per Doppelklick | Start beim Login, Identität prüfen, Briefing | 8 | Blockiert (Windows oder Mac?) |

---

## Phase 1 – Bestandsaufnahme und Sicherheitsnetz

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| 1.1 Ist-Architektur aller Komponenten (9 Punkte) | Testbereit | [Bestandsaufnahme](docs/jarvis-2.0/01-bestandsaufnahme.md); wartet auf Durchsicht durch Benedikt |
| 1.1 Implementiert vs. getestet | Testbereit | alle 8 genannten Funktionen im Code vorhanden, „Programme öffnen“ eingeschränkt |
| 1.2 Stand versionieren | Testbereit | Tag `stand-2026-11-05` auf `9d6811c` lokal gesetzt; **Hochladen des Tags wird von der Cloud-Sandbox blockiert**. Rückfallpunkt bleibt Commit `9d6811c` (Branch `dokumente`). Tag kann Benedikt auf GitHub unter Releases anlegen. |
| 1.2 Keine API-Schlüssel im Repo | Abgeschlossen | 31 Commits aller Branches am 05.11.2026 geprüft, nur Testwert `xai-test-123` in entfernter Datei |
| 1.2 Schutz gegen künftige Schlüssel-Commits | Abgeschlossen | gitleaks 8.18.4 in der CI: 33 Commits aller Branches, „no leaks found“ ([CI-Lauf](https://github.com/lettonato/Jarvis/actions/runs/42112321400)) |
| 1.2 Konfiguration vom Code getrennt und dokumentiert | Abgeschlossen | [docs/konfiguration.md](docs/konfiguration.md), [config.example.json](config.example.json); alle 29 Umgebungsvariablen erfasst |
| 1.2 Reproduzierbare Entwicklungsumgebung | Testbereit | `npm ci` in beiden Startdateien, Node 22 (`.nvmrc`, `engines`); auf dem Mac noch nicht gestartet |
| 1.2 Bestehende Funktionen durch Tests abgesichert | Testbereit | 123 Tests, siehe Testergebnisse; Mac-Funktionen nur per Prüfliste |
| 1.2 Rückfallmöglichkeit | Testbereit | Commit `9d6811c` + CI auf jedem Push ([CI-Lauf](https://github.com/lettonato/Jarvis/actions/runs/42112321400)); Tag fehlt noch auf GitHub |

### Testergebnisse Schritt 1 (5. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm ci` | erfolgreich |
| `npm run lint` | 0 Befunde |
| `npm run typecheck` (`next typegen` + `tsc`) | 0 Fehler (inkl. Tests) |
| `npm test` | **123 Tests: 110 bestanden, 0 fehlgeschlagen, 13 bekannte Lücken (TODO, nicht bestanden)** |
| `next build` | erfolgreich, 28 Routen |
| Rauchtest `next start`: 11 Seiten und 9 API-Routen | alle 200; fremder Host → 403, POST ohne `x-jarvis` → 403 |
| `npm audit --omit=dev` | 0 Schwachstellen in Laufzeit-Paketen |
| `npm audit` (inkl. Entwicklungswerkzeuge) | 1 mittlere Meldung in `minimatch` über eslint, bestand schon vorher, betrifft nur Entwicklung |
| CI auf GitHub (5. November, 21:25 UTC) | alle Prüfungen grün: Lint, Typen, Tests, Build, Audit, gitleaks ([CI-Lauf](https://github.com/lettonato/Jarvis/actions/runs/42112321400)). Erster Lauf scheiterte an einem Fehler im Workflow selbst (Prüfsumme des gitleaks-Archivs), behoben |

Abgedeckt: Desk-Regeln und Rückfrage (14), Browser-Sperren (39), Crawler-Filter (25), API-Schutz,
Telegram- und Dokument-Regeln (14), Obsidian, Gedächtnis, Dokumentablage (9), KI-Gehirn mit
nachgebautem Claude (10), Spielgeld-Desk (7).

**Bekannte Lücken, Stand 5. November als TODO-Tests geführt (seit Schritt 2 alle behoben, siehe unten):**

| Risiko | TODO-Tests | Befund |
|---|---|---|
| R-03 Gedächtnis ohne Bestätigung | 1 | nachgestelltes Modell schreibt eingeschleuste Regel dauerhaft ins Gedächtnis |
| R-04 Browser-Adressfilter | 4 | `192.168.178.1.nip.io`, `127.0.0.1.nip.io`, `localtest.me`, `168.63.129.16` werden geöffnet |
| R-05 Crawler-Filter | 7 | `168.63.129.16`, NAT64, Hex-IPv6, 6to4, Sonderbereiche, DNS-Rebinding |
| R-06 Not-Aus | 1 | nachgestelltes Modell hebt den Not-Aus mit `handel_steuern: weiter` auf, Desk läuft wieder |

**Im Rahmen von Schritt 1 gefundener und behobener Fehler:**

* R-16: Obsidian-Schreiben folgte einem verknüpften Ordner im Tresor nach draußen, wenn die Zieldatei
  noch nicht existierte (`link/neu.md`). Test schlug fehl, Datei landete außerhalb. Behoben in
  `src/lib/server/obsidian.ts` (`inside` prüft den nächsten vorhandenen Ordner). Test jetzt grün.

**Nicht automatisch prüfbar, Prüfliste für Benedikt auf dem Mac** (bleibt „Testbereit“ bis zur Bestätigung):

1. JARVIS mit `start-jarvis.command` starten (jetzt mit `npm ci`, der erste Start dauert etwas länger).
2. Kalender-Ansicht: Termine erscheinen; „Trag morgen 10 Uhr Test ein“ legt einen Termin an.
3. „Öffne Obsidian“ und „Öffne den Kalender“.
4. Browser-Ansicht: ein kurzer Suchauftrag läuft.
5. Ein Dokument erstellen lassen und das PDF öffnen.
6. Telegram: Briefing oder eine Frage beantworten lassen.

**Noch nicht automatisiert getestet (Stand Schritt 1):** Kaufpfad des Desks mit nachgebautem Markt, Intel/Grok,
Analyst (Dokumente) und Telegram mit nachgebauten Servern, IMAP-Postfach. Nachgeholt in den Schritten B1
(Telegram, Intel, Kalender, Dokumente) und B2 (Postfach, Kaufpfad des Desks).

## Phase 2 – Zentrale Sicherheitsarchitektur

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| Prüfung der Grundlagen (Secrets, Tools, SSRF, Injection, Not-Aus, Logs) | Testbereit | [Risikoliste](docs/jarvis-2.0/02-risiken.md) |
| 2.1 Security Gateway, Deny by Default | Testbereit | `src/lib/server/gateway/`; Tests „Deny by Default und Richtlinientabelle“ (7), Gegenprobe ohne Gateway schlägt fehl |
| 2.2 Sicherheitsklassen A–D | Testbereit | Richtlinientabelle mit 34 Einträgen (32 eigene Werkzeuge, Websuche, Webseiten); Tests „Klassen A bis D“ (5) |
| 2.2 Freigaben außerhalb des Modells | Testbereit | Mac-Leiste und Telegram-Knöpfe, genau einmal, Verfall 15 Min.; Tests (7); Telegram-Knöpfe auf dem Handy noch nicht geprüft |
| 2.3 Zugangsdaten schützen | Testbereit | R-07 eingedämmt: Umzug in den macOS-Schlüsselbund per Knopf am Mac, [Beschreibung](docs/jarvis-2.0/05-zugangsdaten.md); Tests „Zugangsdaten“ (9) gegen nachgebautes `security`; echtes macOS noch nicht geprüft |
| 2.4 Schutz vor manipulierten Inhalten | Testbereit | Herkunftsmarkierung, R-03/R-04/R-05 behoben, R-02 durch Freigabepflicht nach fremden Inhalten eingedämmt; Tests „Herkunft“ (3) und Netzschutz (alle früheren TODO-Tests) |
| 2.5 Zentraler Not-Aus, Agentensperre | Testbereit | R-06 behoben; Tests „zentraler Not-Aus“ (7), „Agentensperren“ (2) |
| 2.5 Audit-Log, Alarmierung, Manipulationsschutz | Testbereit | R-08 lokal behoben (Kette, Schwärzung, Alarm); Tests „Audit-Log“ (4); unveränderliche Ablage erst mit Azure |
| 2.6 Netzschleuse für den Browser (DNS-Rebinding, WebSockets) | Testbereit | [Beschreibung](docs/jarvis-2.0/06-netzschleuse-und-herkunft.md); Tests „Netzschleuse“ (26) und Handprüfung mit echtem Chromium; Google Chrome auf dem Mac offen |
| 2.6 Herkunft im ganzen Gespräch | Testbereit | fremde Inhalte wirken über die Antwort hinaus; Tests „Herkunft“ (jetzt 6) mit Gegenprobe |

### Testergebnisse Schritt 2 (8. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint` | 0 Befunde |
| `npm run typecheck` | 0 Fehler |
| `npm test` | **179 Tests: 179 bestanden, 0 fehlgeschlagen, 0 TODO** (Schritt 1: 123 Tests, davon 13 bekannte Lücken) |
| Die 13 früheren TODO-Tests (R-03, R-04 ×4, R-05 ×7, R-06) | alle als normale Tests grün, nach echter Behebung im Code |
| Gegenprobe: Gateway im Gehirn testweise entfernt | R-03, R-06 und der Test „manipuliertes Modell“ schlagen fehl; danach wiederhergestellt |
| `next build` | erfolgreich |
| Rauchtest `next start` mit `/api/sicherheit` | Not-Aus an → Desk-Start abgelehnt; Lösen mit falscher Bestätigung abgelehnt, mit „FREIGEBEN“ gelöst; ohne `x-jarvis` und mit fremdem Host 403; Audit-Kette intakt; Seiten `/`, `/einstellungen`, `/trading`, `/fokus`, `/agenten` 200 |
| Oberfläche im Headless-Chrome | Not-Aus-Leiste, Freigabe-Leiste und Sicherheitszentrale werden angezeigt (ohne 3D-Welt; das Standard-Headless-Chrome der Sandbox stürzt bei der Kommandozentrale ab, auch ohne die Änderungen von Schritt 2) |

Neue Tests in `test/module/gateway.test.ts` (35): Deny by Default, jedes angebotene Werkzeug hat eine Regel,
jede freigabepflichtige Regel hat eine Aktion, Aufrufer und Kanäle, Klassen A–D, Freigaben (genau einmal,
auch bei gleichzeitigem Ja, Nein, Verfall, kein Ja durch das System, Nachprüfung beim Ja), Herkunft nach
dem Lesen von Mails, Not-Aus sperrt jedes Werkzeug und jeden Agenten, Lösen nur am Mac, nur die
Sicherheitszentrale ruft `notausAus`/`entsperreAgent`/`entscheideFreigabe` auf, Audit-Kette erkennt
Änderung und Löschung, Schwärzung. Dazu R-03 und R-06 in `gehirn.test.ts`, R-04 und R-05 in `test/regeln/`.

**Prüfliste Schritt 2 für Benedikt auf dem Mac** (bleibt „Testbereit“ bis zur Bestätigung):

1. „Merk dir, dass ich Kaffee schwarz trinke“: Oben erscheint eine Freigabe; nach „Ja, ausführen“ steht
   der Eintrag unter Einstellungen → Gedächtnis.
2. „Trag morgen 10 Uhr Test ein“: Freigabe am Mac und in Telegram; Ja auf dem Handy trägt ein, der Knopf
   am Mac verschwindet.
3. Einstellungen → Sicherheit → Not-Aus: rote Leiste oben, JARVIS antwortet „Ich bin angehalten“.
   `/notaus` in Telegram wirkt genauso. Lösen nur mit „FREIGEBEN“ am Mac.
4. Audit-Log in den Einstellungen zeigt die Schritte, „Prüfkette intakt“.

### Testergebnisse Schritt 2.3 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint` | 0 Befunde |
| `npm run typecheck` | 0 Fehler |
| `npm test` | **188 Tests: 188 bestanden, 0 fehlgeschlagen, 0 TODO** (neu: 9 in `test/module/zugangsdaten.test.ts`) |
| `next build` | erfolgreich |
| Rauchtest `next start` mit `/api/sicherheit` | Lage enthält den Zugangsdaten-Status (alle fünf Einträge, Modus „datei“); Umzug auf Linux mit 409 „Der macOS-Schlüsselbund ist hier nicht verfügbar.“ abgelehnt; ohne `x-jarvis` 403 |
| Echtes macOS-`security` | **nicht geprüft** (gibt es in der Sandbox nicht), siehe Prüfliste |
| CI auf GitHub | **nicht gelaufen**, Hochladen seit 13. November gesperrt |

**Prüfliste Schritt 2.3 für Benedikt auf dem Mac** (bleibt „Testbereit“ bis zur Bestätigung). Vorher am
besten eine Kopie von `~/.jarvis/config.json` an einem sicheren Ort ablegen:

1. Einstellungen → Sicherheit → Zugangsdaten: Alle eingerichteten Schlüssel stehen auf „Datei“.
2. Häkchen setzen, „In den Schlüsselbund umziehen“: Meldung „… Einträge liegen jetzt im Schlüsselbund“.
   Falls macOS nach dem Anmeldepasswort fragt, notieren, wann.
3. Schlüsselbundverwaltung öffnen, nach „JARVIS“ suchen: je Schlüssel ein Eintrag.
4. `~/.jarvis/config.json` ansehen: statt der Schlüssel steht `@schluesselbund`.
5. JARVIS neu starten: Gespräch, Mail, Telegram und Kurse funktionieren wie vorher.
6. Optional: „Zurück in die Datei“, dann wieder umziehen.
7. Empfehlung: danach Claude-, xAI-, Twelve-Data- und Telegram-Schlüssel sowie das Mail-App-Passwort neu
   ausstellen, weil alte Kopien der Datei in Backups liegen können. Das entscheidest du.

### Testergebnisse Schritt 2.6 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **217 Tests: 217 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: 26 Netzschleuse, 3 Herkunft) |
| Gegenprobe Netzschleuse (Prüfung testweise entfernt) | 16 von 26 Tests schlagen fehl; danach wiederhergestellt |
| `next build` | erfolgreich |
| Handprüfungen mit echtem Chromium (`test/hand/`) | interner Dienst von einer geöffneten Seite aus nicht erreichbar (fetch, WebSocket, Navigation, Name → 127.0.0.1): 0 Treffer; Gegenprobe 2 Treffer; Browser-Agent liest Testseite weiter; PDF wird erzeugt |
| Google Chrome auf dem Mac | **nicht geprüft** |
| CI auf GitHub | **nicht gelaufen** (Hochladen gesperrt) |

Die vollständige Prüfliste für den Mac steht jetzt verständlich in [docs/pruefliste-mac.md](docs/pruefliste-mac.md)
(Teile A bis D, etwa 20 Minuten).

**Verbleibende Risiken nach Schritt 2:** siehe [Schritt 2, Abschnitt „Verbleibende Risiken“](docs/jarvis-2.0/04-security-gateway.md#verbleibende-risiken).

## Bereich B – Bestehende Funktionen stabilisieren

| Funktion | Automatisch geprüft | Zustand | Hinweis |
|---|---|---|---|
| JARVIS-Chat (Gehirn, Werkzeuge) | ja, nachgebauter Claude | Testbereit | `gehirn.test.ts`, `gateway.test.ts` |
| Telegram (Koppeln, nur ein Chat, Knöpfe, Not-Aus, Briefing) | ja, nachgebauter Telegram-Server | Testbereit | `telegram.test.ts` (16), echtes Handy offen |
| Intel/Grok (Kostenbremse, Warnung, Bereinigung) | ja, nachgebauter xAI-Server | Testbereit | `intel.test.ts` (11) |
| Kalender (lesen, eintragen nach Ja, Programme öffnen) | ja, nachgebauter Mac | Testbereit | `kalender.test.ts` (11), echter Apple-Kalender offen |
| Dokumente/Analyst (Abgabe, Nachbessern, kein Skript im Dokument) | ja, nachgebauter Claude | Testbereit | `dokumente.test.ts` (9); PDF nur per Handprüfung mit Chromium |
| Browser-Agent | Regeln ja; Ablauf per Handprüfung mit Chromium | Testbereit | `browser-sperren.test.ts`, `netzschleuse.test.ts`, `test/hand/` |
| Webcrawler | Filter ja | Testbereit | `crawler-filter.test.ts` |
| Trading-Desk (Spielgeld) | ja: Regeln, Engine und der ganze Kaufpfad gegen einen nachgebauten Markt | Testbereit | `desk-kauf.test.ts` (28), `test/mocks/markt-mock.ts`; nur Spielgeld, keine Börsenanbindung; echte Marktdienste nie von hier aus abgefragt |
| Obsidian, Gedächtnis, Dokumentablage | ja, echte Dateien im Testordner | Testbereit | `dateien.test.ts` |
| E-Mail (IMAP) | ja, nachgebautes Postfach | Testbereit | `post.test.ts` (23), `test/mocks/imap-mock.ts`; echtes Postfach nur über die Mac-Prüfliste |
| Sprache (Weckwort, Vorlesen), 3D-Oberfläche | **nein** | Offen | nur im Browser prüfbar |

### Testergebnisse Schritt B1 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **264 Tests: 264 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Telegram 16, Intel 11, Kalender 11, Dokumente 9) |
| Gegenprobe Telegram (Prüfung des Absenders bei Knöpfen entfernt; Zähler der Fehlversuche entfernt) | 2 bzw. 5 Tests schlagen fehl; danach wiederhergestellt |
| Dabei gefundene Fehler | keine im Verhalten. Ergänzt: `stopTelegram()` zum sauberen Anhalten, Wetteradresse über `OPEN_METEO_URL` umlenkbar (Tests fragen keinen echten Dienst), nachgebauter Claude antwortet auch ohne Streaming |

### Schritt B2: Post und Kaufpfad des Desks (13. November 2026)

Gebaut wurden nur Tests und zwei nachgebaute Dienste, dazu eine Korrektur in der Post:

* **Nachgebautes Postfach** (`test/mocks/imap-mock.ts`): ein IMAP-Server auf diesem Rechner mit sieben
  Beispiel-Mails (wichtig, Newsletter, automatische Antwort, eine Mail mit eingeschleuster Anweisung, alt,
  gelesen, markiert). Er versteht genau die Befehle, die JARVIS schickt, und schreibt jeden mit.
* **Nachgebauter Markt** (`test/mocks/markt-mock.ts`): DexScreener, GeckoTerminal, CoinGecko und RugCheck auf
  einem Server. Kurse, Liquidität und der Blockchain-Bericht lassen sich mitten im Test ändern.
* **Geschlossene Lücke (R-21):** Stand in den Einstellungen ein anderer Port als 993 und bot der Server keine
  Verschlüsselung an, meldete sich JARVIS trotzdem an, das Passwort ging dann unverschlüsselt über das Netz.
  Jetzt verlangt JARVIS auf jedem anderen Port STARTTLS und meldet sich sonst nicht an (Ausnahme: ein Server
  auf diesem Mac). Die Meldung sagt das in einem Satz. Mit Port 993 (Voreinstellung) ändert sich nichts.

### Testergebnisse Schritt B2 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **427 Tests: 427 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Post 23, Kaufpfad des Desks 28) |
| Post (`post.test.ts`) | Liste: 14 Tage, höchstens 40, Reihenfolge, Zähler, Massenpost und automatische Antworten erkannt, Umlaute; Öffnen: Signatur und Zitat entfernt, Länge begrenzt; Lesen markiert nie als gelesen; „als gelesen“ trifft genau eine Mail; falsches Passwort und nicht erreichbarer Server geben verständliche Meldungen ohne das Passwort; kein Login ohne Verschlüsselung; der ganze Weg über das Gehirn: Mailtext gilt als fremd, „als gelesen markieren“ wartet auf das Ja am Mac, ein Nein ändert nichts |
| Kaufpfad (`desk-kauf.test.ts`) | Kauf mit 2 bis 5 % des Kontos samt Gebühren und Slippage; kein Doppelkauf; Stop-Loss und 12 Stunden Sperre; Hälfte bei +100 %; Nachlauf-Stop vor und nach dem Teilverkauf; Platz machen nach 12 Stunden ohne +20 %; Liquiditätsabzug; verschwundenes Handelspaar; spät auftauchendes Rug-Zeichen; harte Filter und Blockchain-Prüfung vor dem Chief; der Chief kann gemessene Grenzen nicht überstimmen; unbrauchbare Chief-Antwort; RugCheck fällt aus; Kurs läuft davon; Rückfrage ab der Grenze (einmal fragen, Ja, Nein, verfallen, Kurs gestiegen); höchstens acht Positionen; Pause; Tageslimit; Not-Aus |
| Gegenproben (Regel verbogen, Tests müssen fehlschlagen) | Post: 5 von 5 fallen auf (Zeitraum, Obergrenze, automatische Antworten, Zwischenspeicher nach „gelesen“, Verschlüsselungspflicht). Desk: 17 von 17 fallen auf, zwei davon (Nachlauf-Stop vor dem Teilverkauf, Verfall der Rückfrage) erst nach geschärften Tests (Stop-Loss, Positionszahl, Tageslimit, Sperre, Teilverkauf, beide Nachlauf-Stops, Liquiditätsabzug, Einsatzhöhe, Hinterherlaufen, Prüfungen je Runde, verschwundenes Paar, Wache, Rückfrage, Verfall kurz und lang, 12-Stunden-Regel). Danach wiederhergestellt |
| Dabei gefundene Fehler | einer: Passwort ohne Verschlüsselung (R-21, behoben, siehe oben). Im Desk kein Fehler im Verhalten |
| Code-Review (Skill `code-review`, Stufe mittel) | An den Dateien dieses Schritts kein Befund. Die Durchsicht lief über den ganzen Zweig und meldet **zehn Befunde an früheren Schritten**; die ersten beiden sind nachgestellt und behoben (siehe Schritt B3), die übrigen acht sind **noch nicht geprüft und nicht behoben**: Name vertraulicher Projekte in einer Fehlermeldung an das Modell (`projekte.ts`); `projekte_lesen` setzt „fremd“ nicht für Einträge von Dritten (`brain.ts`); Projektsuche trifft kurze Namen zu leicht (`projekte.ts`); umbenannter Projektvorschlag verwaist Einträge; Tonfreigabe nach blockierter Wolkenstimme (`useVoice.ts`); Schlüsselbund wird bei jedem Lesen neu gefragt (`config.ts`); gleichzeitiges Speichern der Einstellungen stößt zusammen (`config.ts`); Klartextprüfung nach dem Umzug meldet Fehlalarm (`zugangsdaten.ts`); Regel „Projekt“ fängt kurze Eingaben ab (`commands.ts`); „Heute“ fragt alle 10 Sekunden die ganze Sicherheitslage ab (`TodayView.tsx`). Nächster Schritt: einzeln nachstellen und beheben |
| Sicherheitsprüfung (von Hand; `security-review` braucht `origin/HEAD`) | Die Änderung an der Post verschärft nur; beide Nachbauten hören nur auf 127.0.0.1; Adresse und Passwort im Nachbau sind erfunden; kein Test fragt einen echten Dienst |
| Nicht geprüft | ein echtes Postfach (ob der echte Anbieter sich wie der Nachbau verhält, zeigt die Mac-Prüfliste); STARTTLS selbst (der Nachbau bietet es nicht an, geprüft ist nur, dass JARVIS sich ohne nicht anmeldet); echte Marktdienste; Rohstoffe im Kaufpfad (eigene Tests in `test/regeln/`) |

### Schritt B3: zwei Befunde zum Schutz vertraulicher Projekte (13. November 2026)

Beide Befunde aus der Durchsicht ließen sich nachstellen (Tests zuerst rot) und sind behoben:

* **R-22 Vertraulicher Projektname in einer Fehlermeldung:** Fragte das Modell nach einem Projekt, das es nicht
  gibt, zählte die Fehlermeldung alle Projekte auf, auch die vertraulichen. Der Name wäre damit an Anthropic
  und in eine Telegram-Antwort gelangt. Jetzt nennt die Meldung nur noch nicht vertrauliche Projekte.
* **R-23 Übersicht mit Text von Dritten galt nicht als fremd:** `projekte_lesen` zeigt je Projekt auch die
  nächste Frist, die letzte Entscheidung und den nächsten Schritt. Stammte so ein Eintrag aus einer Mail, das
  Projekt selbst aber von Benedikt, blieb das Gespräch „sauber“, und spätere Aktionen brauchten kein Ja. Jetzt
  trägt jede Projektkarte das Kennzeichen `textVonDritten`, und das Gespräch gilt dann als fremd beeinflusst.

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **431 Tests: 431 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: 4 in `projekte.test.ts`) |
| Gegenproben (Korrektur einzeln zurückgenommen) | Name wieder in der Meldung: 2 Tests schlagen fehl; altes Kennzeichen: 1 Test schlägt fehl. Danach wiederhergestellt |
| Nicht geprüft | die übrigen acht Befunde der Durchsicht; das echte Modell |

### Schritt B4: zwei Sicherheitsbefunde aus der Durchsicht zu Schritt E2 (13. November 2026)

Beide ließen sich nachstellen (Tests zuerst rot) und sind behoben:

* **R-25 Schlüssel im Schlüsselbund mit leerem Wert überschrieben:** Speicherte JARVIS Einstellungen, die er
  gelesen hatte, während der Schlüsselbund gesperrt war, und war der Schlüsselbund inzwischen wieder offen,
  wurde der echte Schlüssel durch einen leeren ersetzt. Jetzt bleibt ein Eintrag im Schlüsselbund bei einem
  leeren Wert immer unangetastet (`src/lib/server/config.ts`).
* **R-24 Eigene Antworten mit Text von Dritten:** Briefing, Besprechung der Post, vorgelesene Mails,
  Terminerinnerungen und Nachrichten standen im Gespräch, ohne als „von Dritten“ zu gelten. Jetzt erkennt
  `src/lib/herkunft.ts` solchen Text, und die Antwort trägt das Kennzeichen; der Server fragt danach bei
  Änderungen nach, auch wenn „nur nach fremdem Text fragen“ eingestellt ist.

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **444 Tests: 444 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: 8 in `herkunft.test.ts`, 1 in `zugangsdaten.test.ts`) |
| Vorher rot | Schlüsselbund-Test: „Claude-Schlüssel unverändert“ schlug fehl, der Wert war leer |
| Handprüfung im Browser (gebauter Server, Beispieldaten) | „Wetter“ und der Satz mit der Zahl der Mails bleiben ohne Kennzeichen; „Die Mail ist von Petra Bauer. Betreff: …“ trägt es |
| Nicht geprüft | echter macOS-Schlüsselbund; ob das Gateway nach einer so gekennzeichneten Antwort am Mac wirklich nachfragt (die Weitergabe des Kennzeichens an den Server ist seit Schritt 2 gebaut und dort getestet, hier nicht erneut) |

**Offen aus der Durchsicht:** siehe Schritt B5.

### Schritt B5: acht weitere Befunde aus den Durchsichten (13. November 2026)

Jeder Befund wurde zuerst mit einem Test nachgestellt (rot), dann behoben. Ausnahme ist die Tonfreigabe, die
sich nur im Browser zeigt; dort lief die Handprüfung der Stimme.

| Befund | Was passierte | Behoben in | Beleg |
|---|---|---|---|
| Projekt falsch zugeordnet | Ein Projekt „IT“ wurde in „Weiterbildung Mitarbeiter“ gefunden, weil nach Buchstabenfolgen gesucht wurde | `src/lib/projekte.ts` (`findeProjekt`: nur ganze Wörter) | `test/regeln/projekt-suche.test.ts` (5) |
| Umbenanntes Projekt verliert seine Einträge | Wer einen Projektvorschlag beim Übernehmen umbenannte, bekam mit dem ersten wartenden Eintrag ein zweites Projekt unter dem alten Namen | `src/lib/server/projekte/projekte.ts` | `projekte.test.ts` (neu) |
| Korrektur überschreibt Handänderung | Ein Korrekturvorschlag stellte beim Übernehmen alle Felder auf den Stand vom Vorschlag zurück | wie oben; der Vorschlag merkt sich, welche Felder JARVIS ändern will (`geaendert`) | `projekte.test.ts` (neu) |
| Gleichzeitiges Speichern der Einstellungen | Zwei Speichervorgänge zur selben Zeit: einer scheiterte mit Fehler, weil beide dieselbe Nebendatei nutzten | `src/lib/server/config.ts` (nacheinander, eigene Nebendatei) | `zugangsdaten.test.ts` (neu, vorher 11 von 12 Aufrufen fehlgeschlagen) |
| Gesperrter Schlüsselbund wird dauernd gefragt | Jedes Lesen der Einstellungen startete `security` neu für jeden unlesbaren Eintrag (im Test 18 statt 3 Aufrufe) | `config.ts`: 20 Sekunden Pause nach einem Fehlversuch | `zugangsdaten.test.ts` (neu) |
| Falscher Alarm nach dem Umzug | Ein Passwort, das zufällig auch als Name in der Datei steht, ließ den Umzug mit „noch im Klartext“ enden, obwohl alles umgezogen war | `src/lib/server/zugangsdaten.ts`: kurze Werte nur an ihrer Stelle prüfen, lange Schlüssel weiter in der ganzen Datei | `zugangsdaten.test.ts` (neu) |
| „Projekt“ kapert Sätze | Jeder kurze Satz mit dem Wort Projekt öffnete die Projektansicht, statt an Claude oder an die Regeln für Post und Aufgaben zu gehen | `src/lib/commands.ts` | `test/regeln/heute.test.ts` (erweitert) |
| Ton bleibt nach einer Blockade aus | Nach „Klick einmal irgendwo auf die Seite“ gab der Klick den Ton nicht frei, weil JARVIS die beendete Sprachschlange noch für aktiv hielt | `src/lib/useVoice.ts` | kein automatischer Test möglich; `stimme-rauch` läuft weiter durch. Die Blockade selbst ist **nicht nachgestellt** |

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **454 Tests: 454 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** |
| `npx next build` | erfolgreich |
| Handprüfungen `projekte-rauch`, `stimme-rauch`, `agenten-rauch` | alle Schritte in Ordnung |
| Nicht geprüft | echter macOS-Schlüsselbund; die Tonblockade im Browser; ob 20 Sekunden Pause am Mac angenehm sind (nach dem Entsperren des Schlüsselbunds dauert es bis zu 20 Sekunden, bis die Dienste wieder als eingerichtet gelten) |

**Die beiden letzten Punkte aus den Durchsichten** (Netzschleuse ohne Ausweichadresse, doppelte Abfrage der
Sicherheitslage) sind in Schritt B6 erledigt.

### Schritt B6: Netzschleuse weicht aus, eine Abfrage statt mehrerer (13. November 2026)

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| B6.1 Hat ein Server mehrere Adressen und die erste antwortet nicht, nimmt die Netzschleuse die nächste. Alle Adressen stammen aus derselben einen Auflösung und sind alle geprüft; eine einzige interne Adresse sperrt weiter den ganzen Namen | Testbereit | `src/lib/server/netzschleuse.ts` (`pruefeZiele`, `verbindeNacheinander`), `test/module/netzschleuse.test.ts` (9 neue Tests) |
| B6.2 Höchstens vier Adressen, IPv6 und IPv4 abwechselnd; zusammen höchstens 15 Sekunden (jede außer der letzten höchstens 5, die letzte bekommt den Rest); die Schleuse merkt sich je Ziel 60 Sekunden, welche Adresse geantwortet hat, und nimmt sie zuerst | Testbereit | wie oben. Gemerkt wird nur die Reihenfolge: Verbunden wird nie zu einer Adresse, die nicht in der jetzigen Auflösung steht und jetzt geprüft ist |
| B6.3 Unverschlüsselter Abruf: Verbindet ein Server und antwortet dann nicht, endet der Abruf nach 15 Sekunden Funkstille | Testbereit | Test mit einem stummen Server |
| B6.4 Fragen mehrere Stellen der Oberfläche dieselbe Schnittstelle ab, läuft nur eine Abfrage im kürzesten Takt, und alle sehen denselben Stand. Die Sicherheitslage (Hinweisleiste, „Heute“, Einstellungen) wird damit einmal statt zwei- bis dreimal abgefragt, und ein Klick in der Leiste gilt in „Heute“ sofort | Testbereit | `src/lib/geteilt.ts`, `src/lib/usePolling.ts`, `test/regeln/geteilt.test.ts` (9); im Browser gezählt |
| B6.5 Eine Antwort, die schon unterwegs war, überschreibt keinen neueren Stand mehr (eine eben erledigte Freigabe tauchte sonst für Sekunden wieder auf) | Testbereit | `geteilt.test.ts` |

### Testergebnisse Schritt B6 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **500 Tests: 500 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** |
| Tests zuerst | Die Tests zum Ausweichen liefen vor dem Bau rot (5 von 5). Die Tests zu den Befunden der Durchsicht ebenfalls (3 rot bei den geteilten Abfragen; die zur Schleuse hingen, weil es die Wartezeiten noch nicht gab). Gegenprobe: Lädt jede Stelle selbst, schlägt der Test „eine Abfrage“ fehl |
| `npx next build` | erfolgreich |
| Alle zwölf Räume im gebauten Server (Chromium, Beispieldaten) | laden ohne Seiten- und Konsolenfehler; „Heute“ und „Trading“ angesehen |
| Abfragen von `/api/sicherheit` gezählt (12,5 Sekunden) | „Heute“: 4, „Einstellungen“: 4, also eine Abfrage alle 4 Sekunden. Vorher nicht gemessen; nach dem alten Code wären es rechnerisch 6 und 7 |
| Not-Aus ein und wieder gelöst, in „Heute“ | steht in Hinweisleiste und „Wartet auf dich“ und verschwindet an beiden Stellen |
| Handprüfungen mit echtem Chrome: `schleuse-rauch`, `browser-rauch`, `agenten-rauch`, `projekte-rauch` | erlaubte Seite kommt an, kein interner Zugriff (0 Treffer), Audit-Kette in Ordnung; alle Schritte in Ordnung |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | neun Befunde, alle eingearbeitet: vier Versuche konnten nur IPv6 treffen; kein Zeitlimit mehr beim unverschlüsselten Abruf; veraltete Antwort überschrieb neuen Stand; 5 Sekunden je Adresse waren für langsame Server zu kurz; kein Gedächtnis für tote Adressen; doppelte erste Abfrage nach schnellem Ab- und Anmelden; zwei Bauarten der Abfrage nebeneinander; ungenutzte Funktion; doppelte Aufräumer |
| Sicherheitsprüfung (von Hand) | Die Regeln der Schleuse sind unverändert: eine Auflösung je Verbindung, jede Adresse geprüft, schon eine interne sperrt; das Ausweichen und das Merken wählen nur unter geprüften Adressen der jetzigen Auflösung (Test mit DNS-Rebinding nach einer gemerkten Adresse: 403). Die geteilte Abfrage ändert nichts daran, wer etwas darf: Entschieden wird weiter auf dem Server |
| Nicht geprüft | ein echtes Netz mit toter IPv6-Strecke (nur nachgestellt); Safari; ob 15 Sekunden Funkstille für sehr langsame unverschlüsselte Seiten am Mac reichen |

## Bereich C – Gehirn und Projektgedächtnis

Einzelheiten: [docs/jarvis-2.0/07-projektgedaechtnis.md](docs/jarvis-2.0/07-projektgedaechtnis.md).

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| C1.1 Datenformen: Projekt, Eintrag (Aufgabe, Entscheidung, Besprechungsnotiz, Risiko, nächster Schritt), Vorschlag; jeder Eintrag mit Quelle und Zeitstempel | Testbereit | `src/lib/projekte.ts` |
| C1.2 Speicherschicht mit austauschbarem Speicher (heute Datei, später PostgreSQL), Transaktionen, beschädigte Datei wird nie überschrieben | Testbereit | `src/lib/server/projekte/speicher.ts`; Tabellenentwurf in der Doku |
| C1.3 Bestätigungsprozess: JARVIS schlägt vor, ein Mensch am Mac übernimmt, ändert oder lehnt ab; genau einmal | Testbereit | `src/lib/server/projekte/projekte.ts`, `/api/projekte` |
| C1.4 Korrekturprozess: Verlauf mit altem Stand, Grund und Zeit; Zurückziehen statt Löschen | Testbereit | wie oben |
| C1.5 Werkzeuge für das Gehirn (`projekte_lesen`, `projekt_lesen`, `projekt_vorschlagen`) über das Gateway; Herkunft vom Server | Testbereit | `brain.ts`, `richtlinien.ts` |
| C1.6 Ansicht „Projekte“: Eingang für Vorschläge, Projektliste, Akte, Formulare | Testbereit | im Browser durchgeklickt (`test/hand/projekte-rauch.ts`) |
| C1.7 Vorbereitung vor Besprechungen (Mac; Telegram nur nach Einschalten) | Testbereit | `terminVorbereitung` |
| C1.8 Vertrauliche Projekte: nichts davon an das KI-Gehirn oder über Telegram | Testbereit | Test „geht nicht an Anthropic“ |
| C2 Persönliches Gedächtnis in dieselbe Speicherschicht (Bestätigung gibt es dort schon über das Gateway) | Offen | |
| C3 Mails und Besprechungsnotizen von selbst Projekten zuordnen und Vorschläge machen | Offen | braucht die Freigabe, Mailinhalte dafür auszuwerten |
| C4 Projektüberwachung (Überfälliges und nahe Fristen von selbst melden) | Testbereit im Morgenbriefing, im Tagesabschluss, in „Heute“ und als Hinweis am Tag | Schritte G1 und G2; offen: offene Risiken |
| C5 PostgreSQL-Umsetzung der Speicherschnittstelle | Blockiert | braucht eine Datenbank (Azure, Phase 3) |

### Testergebnisse Schritt C1 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **294 Tests: 294 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Projektgedächtnis 30) |
| `npx next build` | erfolgreich; neu `/projekte` und `/api/projekte` |
| Handprüfung im Browser (Chromium, gebauter Server, Testdaten) | Vorschlag übernehmen, geändert übernehmen, ablehnen, Eintrag korrigieren, zurückziehen: in Ordnung; Datei danach wie erwartet; POST ohne eigenen Header und von fremder Seite → 403; keine Fehler in der Seite |
| Gegenproben (Schutz entfernt, Tests müssen fehlschlagen) | Bestätigen durch jeden: 4 schlagen fehl; vertrauliches Projekt lesbar: 1; beschädigte Datei ersetzt: 1; doppeltes Übernehmen: 2; Herkunft nicht vom Server: 4; Vorbereitung aus vertraulichen Projekten: 2. Danach wiederhergestellt, 30 von 30 bestehen |
| Dabei gefundener Fehler | Ein älterer Test der Dokumente schlug im Gesamtlauf gelegentlich fehl (2 von 7 Läufen, einzeln 5 von 5 bestanden). Ursache: Die Testhilfe `documentDone()` wartete nicht auf Speichern und Meldung, wenn das Dokument sehr schnell fertig war. Behoben; danach 4 Gesamtläufe hintereinander mit 294 von 294 |
| Nicht geprüft | echter Mac (Prüfliste Teil E); echtes Claude-Modell (nur nachgebaut: ob Claude von sich aus sinnvoll vorschlägt, zeigt erst der Mac); echte Erinnerung aus dem Apple-Kalender; Sprachausgabe der Vorbereitung |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. **Sicherheitsrisiken:**
R-17 (Projektinhalte gehen beim Lesen an Anthropic; gemildert durch „vertraulich“), R-18 (Datei unverschlüsselt
und für denselben Benutzer änderbar) in [02-risiken.md](docs/jarvis-2.0/02-risiken.md).

## Bereich D – Microsoft 365

Einzelheiten und die Anleitung für die IT: [docs/jarvis-2.0/08-microsoft-365.md](docs/jarvis-2.0/08-microsoft-365.md).

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| D1.1 Anmeldung mit Code an genau einem Verzeichnis, ohne Passwort in JARVIS und ohne Geheimnis der Anwendung; drei Rechte, alle nur lesend (`offline_access`, `User.Read`, `Calendars.ReadBasic`) | Testbereit (nur gegen Nachbau) | `src/lib/microsoft.ts`, `src/lib/server/microsoft.ts`; `test/module/microsoft.test.ts` |
| D1.2 Termine aus Outlook lesen (heute und 31 Tage), im Raum „Kalender“ neben den Terminen des Macs; Privates ohne Titel und Ort; Abgesagtes fehlt; kein Termin doppelt | Testbereit (nur gegen Nachbau) | `src/lib/server/calendar.ts`; im Browser geprüft (`test/hand/microsoft-rauch.ts`) |
| D1.3 Outlook-Termine bleiben am Bildschirm des Macs, bis du den Schalter setzt: nichts davon an das KI-Modell, über Telegram oder in eine gesprochene Antwort; JARVIS nennt nur die Zahl | Testbereit (nur gegen Nachbau) | `fuerGespraech`, `readCalendar` (gefiltert) und `readCalendarGanz` (nur für den Bildschirm) |
| D1.4 Einstellungen → Microsoft 365: Nummern eintragen, anmelden, Schalter, abmelden, ganz entfernen | Testbereit (nur gegen Nachbau) | `src/components/MicrosoftSetup.tsx`, `/api/microsoft` |
| D1.5 Schlüssel: Zugang nur im Arbeitsspeicher, Anmeldung bei den Zugangsdaten (Datei oder Schlüsselbund); der Schlüssel geht nur an Graph (keine fremde Folgeseite, keine Umleitung); feste Sätze statt der Texte von Microsoft | Testbereit (nur gegen Nachbau) | `test/module/microsoft.test.ts` |
| D1.6 Echte Anbindung an euer Microsoft 365 | Blockiert | braucht die App-Registrierung durch eure IT und Benedikts eigene Anmeldung (Frage 14) |
| D2 Mails über Graph lesen | Offen | weiteres Recht bei Microsoft; Benedikts Entscheidung |
| D3 Dateien (OneDrive, SharePoint) finden und lesen | Offen | weiteres Recht; Firmendaten, daher nur nach Freigabe |
| D4 Teams-Besprechungen; Termine in Outlook eintragen | Offen | schreibend nur über das Gateway mit Freigabe im Einzelfall; keine Auswertung von Online-Zeiten |

### Schritt D1: Termine aus Outlook lesen, nur lesen (13. und 14. November 2026)

**Ziel:** der erste, kleinste Schritt zu Microsoft 365: Firmentermine im Kalender von JARVIS sehen, ohne dass
JARVIS in Outlook etwas ändern kann und ohne dass Firmentermine den Mac verlassen, bevor du es willst.

**Was sich für dich ändert**

* In den Einstellungen gibt es den Abschnitt **„Microsoft 365: Termine aus Outlook“**. Er erklärt, was eure IT
  einmal anlegt, nimmt die zwei Nummern an und führt dich durch die Anmeldung: JARVIS zeigt einen Code, den du
  auf der Seite von Microsoft eingibst. Dein Passwort gibst du nur dort ein.
* Danach stehen deine Outlook-Termine im Raum **„Kalender“**, mit „Outlook“ dahinter. Als privat markierte
  Termine heißen „Privater Termin“, ohne Titel und Ort.
* **Im Gespräch, in Telegram und in gesprochenen Antworten nennt JARVIS Outlook-Termine nicht**, solange du den
  Haken „Outlook-Termine auch im Gespräch und über Telegram“ nicht setzt. Er sagt nur, dass es welche gibt:
  „Morgen hast du einen Termin: um 9 Uhr Zahnarzt. Dazu kommen 2 Termine aus Outlook, die ich hier nicht
  nenne.“ Die Erinnerung am Mac lautet dann „In 10 Minuten: ein Termin aus Outlook.“
* Kann JARVIS Outlook gerade nicht lesen, steht der Grund im Raum „Kalender“, und im Gespräch sagt er „Die
  Termine aus Outlook fehlen gerade.“ dazu, statt einen Tag „frei“ zu nennen.
* Solange nichts eingetragen ist, ändert sich nichts: Es geht keine Anfrage an Microsoft.

**Die festen Regeln** stehen in [08-microsoft-365.md](docs/jarvis-2.0/08-microsoft-365.md): nur lesen, nur der
Kalender, geringste Rechte, ein Verzeichnis, kein Passwort in JARVIS, der Schlüssel geht nur an Graph, feste
Sätze, nichts wird geraten.

**Entwurfsentscheidungen (von mir getroffen, Benedikt kann sie ändern)**

* Kalender zuerst und nur lesend, weil das den kleinsten Zugriff braucht und sofort nützt. Mail, Dateien und
  Teams sind bewusst nicht dabei.
* Outlook im Gespräch ist **aus**, bis du es einschaltest. Grund ist deine Vorgabe, dass sensible Daten nur mit
  deiner Zustimmung an externe Dienste gehen: Im Gespräch liest das KI-Modell (Anthropic) mit, Telegram ist ein
  weiterer Dienst.
* `readCalendar` liefert seitdem den gefilterten Kalender; den ganzen liest nur `readCalendarGanz`, und das nur
  für die Schnittstelle des Bildschirms. Ein Test hält fest, dass es dabei bleibt.

### Testergebnisse Schritt D1 (14. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **711 Tests: 711 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 58: Regeln ohne Netz 21; gegen das nachgebaute Microsoft, den nachgebauten Mac-Kalender und den nachgebauten Claude 37) |
| `npx next build` | erfolgreich; weiter die vier bekannten Hinweise von Turbopack, keine neuen |
| Handprüfung im Browser (Chromium, gebauter Server, nachgebautes Microsoft) | `microsoft-rauch.ts` (neu): Schutz der Schnittstelle, unbrauchbare Nummern bleiben draußen, Code und Adresse erscheinen, kein Passwortfeld, die Seite merkt die Anmeldung von selbst, kein Schlüssel in der Seite, Outlook-Termine im Raum Kalender (Privates ohne Titel und Ort, Abgesagtes fehlt), Schalter an und aus, neue Anmeldung abbrechen, fester Satz bei fehlendem Recht, abmelden, ganz entfernen; an Graph gingen nur lesende Anfragen an `/me` und `/me/calendarView`. `post-rauch.ts` und `projekte-rauch.ts` laufen weiter durch |
| Gegenproben (60 absichtlich eingebaute Fehler, Tests müssen fehlschlagen) | 60 erkannt, 0 nicht erkannt (unter anderem: nur lesende Rechte, Sammeladressen, nur https und nur Microsoft als Anmeldeadresse, Folgeseite nur unter Graph, keiner Umleitung folgen, andere Zeitzone wird nicht geraten, Privates ohne Titel und Ort, ohne Schalter kein Outlook im Gespräch, verdeckt ohne Titel, Erinnerung ohne Titel, nicht „frei“ bei Outlook-Terminen oder bei einer Lücke, höchstens fünf Seiten und das steht dabei, abgelaufen fragt nicht ständig, erneuerter Schlüssel wird gemerkt, nur ein Erneuern zugleich, kein Schlüssel im Stand, kein Termin doppelt, laufendes Lesen zählt nach dem Umschalten nicht, Erinnerungen vergessen den gemerkten Kalender, lesen und speichern in einem Zug) |
| Code-Review | zehn Punkte, alle eingearbeitet: Erinnerungen fürs Handy nutzten bis zu fünf Minuten einen gemerkten Kalender, auch nach dem Ausschalten; ein gerade laufendes Lesen schrieb seinen alten Stand zurück; nach einer neuen Anmeldung bei schon verbundenem Konto blieb die alte Fehlermeldung stehen; die Sätze nannten einen Tag „frei“, wenn Outlook gerade nicht lesbar war; Termine erschienen doppelt, wenn das Firmenkonto auch in der Kalender-App steht; ohne Mac-Kalender wirkte der Kalender beschreibbar; bei mehr als 500 Terminen fehlten welche ohne Hinweis; eine halb kaputte Antwort nach der Anmeldung hätte die Anmeldung verloren und den Code ein zweites Mal geschickt; am Anmeldeserver galt auch eine unverschlüsselte Adresse; der ungefilterte Kalender war der übliche Weg (jetzt ist es der gefilterte) |
| Beim Einarbeiten selbst gefunden | Der Schalter konnte sich zurückstellen: Lief gerade ein Erneuern des Schlüssels, während du den Haken herausnahmst, schrieb das Erneuern seinen älteren Stand der Einstellungen zurück, mit gesetztem Haken. Behoben: Änderungen am Abschnitt Microsoft 365 lesen und speichern jetzt in einem Zug (`aendereConfig`); ein Test stellt genau diese Lage nach |
| Bei Microsoft nachgelesen (Microsoft Learn, 13.11.) | Anmeldung mit Code und Erneuern, `Calendars.ReadBasic` als geringstes Recht, Zeiten in UTC, Fehlerform und Statuscodes, die Felder für abgesagt, ganztägig und privat, Folgeseiten über die ganze Adresse |
| Gegen den echten Dienst geprüft | **nein.** Anmeldeserver und Graph waren nachgebaut. Angenommen und nicht nachgelesen sind: die genaue Schreibweise der Zeiten, dass die Kalenderansicht `$select` und `$top` annimmt und in Seiten liefert, und wie ganztägige Termine in UTC ankommen (siehe 08-microsoft-365.md) |
| Nicht geprüft | echter Mac, echtes Microsoft 365 (Prüfliste Teil N); ob Richtlinien eures Verzeichnisses die Anmeldung mit Code zulassen |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. **Bekannte Grenzen:**
höchstens 500 Outlook-Termine für 31 Tage (steht dann dabei); nur der eigene Hauptkalender; ist der
Mac-Kalender noch nicht verbunden, zeigt der Raum Kalender Outlook trotzdem, das Gespräch aber nicht.
**Sicherheitsrisiken:** (1) Mit der Anmeldung liest JARVIS echte Firmentermine und hält einen Schlüssel, mit dem
sich deine Termine lesen lassen, solange die Zustimmung bei Microsoft besteht. Er liegt bei den anderen
Zugangsdaten; im Schlüsselbund-Modus im Schlüsselbund. (2) Titel und Orte von Terminen stammen oft von Dritten
(Einladungen). Mit gesetztem Haken gehen sie wie Mac-Termine an das KI-Modell; das Gespräch gilt dann wie
bisher als „fremd“, sobald Termine gelesen wurden. (3) Steht das Firmenkonto auch in der Kalender-App des
Macs, gehen diese Termine über den Mac-Kalender ins Gespräch, unabhängig vom Haken (siehe Anleitung).
(4) Andere Abschnitte der Einstellungen werden noch ohne Sperre gelesen, geändert und gespeichert; zwei
Änderungen im selben Augenblick können sich dort überschreiben (offen in Bereich J).

## Bereich E – Geschäftsführungsdashboard

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| E1.1 Tageslage zusammenstellen: was auf dich wartet, Termine, Aufgaben, Post, Projekte. Ohne KI, nur aus Daten, die JARVIS schon hat; nichts verlässt dabei den Mac | Testbereit | `src/lib/heute.ts`, `test/regeln/heute.test.ts` |
| E1.2 Ansicht „Heute“ mit „Wartet auf dich“ (Not-Aus, Freigaben, Rückfragen des Desks, Intel-Warnung, Vorschläge fürs Projektgedächtnis, überfällige Aufgaben, dringende Projekte, wichtige Post, fertiges Dokument) und Karten für Termine, Aufgaben, Post, Projekte, Märkte und Nachrichten, Agenten | Testbereit | `src/components/views/TodayView.tsx`, `/heute`; im Browser geprüft |
| E1.3 Bei Terminen, in deren Titel ein Projekt vorkommt: Verweis auf die Akte | Testbereit | wie oben |
| E1.4 Zuruf: „Tagesübersicht“ oder „mein Tag“ öffnet „Heute“, „Projekte“ öffnet die Projekte | Testbereit | `src/lib/commands.ts` |
| E2 Neue Oberfläche „Glashaus“: jeder Bereich ein heller Raum mit Fensterfront, Kamerafahrt beim Wechsel, Leiste unten mit allen Räumen und dem Feld für JARVIS | Testbereit | Schritt E2 unten. Die frühere 3D-Übersicht mit den Felsen wird nicht mehr gezeigt; die Projekte haben jetzt wie alles andere ihren eigenen Raum |
| E3 Unternehmensübersicht (Teams, Dateien, Planner) | Blockiert | braucht Microsoft 365 (Bereich D) |
| E4 Finanz- und Marktübersicht über Spielgeld-Desk und Intel hinaus | Offen | |
| E5 Agentenübersicht mit Steuerung | Testbereit | Schritt F1: Ansicht „Agenten“, Karte in „Heute“ |

### Testergebnisse Schritt E1 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **305 Tests: 305 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Tageslage 11) |
| `npx next build` | erfolgreich; neu `/heute` |
| Handprüfung im Browser (Chromium, gebauter Server, Testdaten) | „Heute“ zeigt den wartenden Vorschlag und die überfällige Projektaufgabe, alle sechs Karten erscheinen, keine Fehler in der Seite; Bildschirmfoto angesehen |
| Gegenprobe (Filter „nur aktive Projekte“ entfernt) | 1 Test schlägt fehl; danach wiederhergestellt |
| Nicht geprüft | echter Mac (Prüfliste Teil F) mit echtem Kalender, echten Erinnerungen und echter Post; schmale Fenster: bei 1280 Pixeln Breite passt die Leiste mit 13 Einträgen nicht mehr ganz und lässt sich seitlich schieben |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. **Sicherheitsrisiken:**
keine neuen. Die Tagesübersicht liest nur, schickt nichts an ein Modell und zeigt vertrauliche Projekte nur
am Mac (wie die Ansicht „Projekte“).

### Schritt E2: neue Oberfläche „Glashaus“ (13. November 2026)

Benedikts Wunsch: ein ganz anderes Aussehen, „Richtung 4K, richtige Kino-Übergänge“. Aus den Entwürfen
(`docs/design-entwuerfe/`) hat er B „Glashaus“ gewählt, so wie gezeigt. Umgesetzt mit dem Skill `frontend-design`.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| E2.1 Gestaltungsgrundlage: Farben (Kalkwand, Schiefer, Gletscher, Sonne), Schrift Archivo (liegt im Projekt, freie Lizenz OFL), Schriftgröße wächst mit dem Bildschirm | Testbereit | `src/app/globals.css`, `public/schrift/` |
| E2.2 Der Raum: links die Wand mit dem Inhalt (nur sie rollt), rechts die Fensterfront mit dem Foto des Bereichs, unten der Boden mit Spiegelung und Sonnenlicht, davor Scheiben aus Milchglas für die wichtigsten Zahlen | Testbereit | `src/components/Raum.tsx`, `src/lib/raeume.ts` |
| E2.3 Kamerafahrt beim Wechsel: alter Raum hinaus, dunkle Zwischenwand mit dem Namen des nächsten Raums, neuer Raum herein; Richtung nach der Reihenfolge in der Leiste. Mit „Bewegung reduzieren“ nur kurzes Überblenden | Testbereit | `globals.css` (Abschnitt Kamerafahrt), `test/regeln/raeume.test.ts` |
| E2.4 Leiste auf dem Boden: Name, Räume mit Zählern, „Mehr“, Feld für JARVIS mit Mikrofon; darüber die letzte Antwort, aufklappbar zum ganzen Gespräch. Oben die Hinweise, die nicht warten können (Not-Aus, Freigaben, Rückfragen) | Testbereit | `src/components/AppFrame.tsx` |
| E2.5 Alle zwölf Räume umgestellt: Heute (Eingang, mit dem nächsten Termin groß an der Wand), Aufgaben, Kalender, Post, Projekte, Trading, Intel, Agenten, Browser, Dokumente, Einstellungen, Gespräch | Testbereit | `src/components/views/`, `TradingDesk.tsx`, `CrawlerWeb.tsx` (das Netz der Spinne ist ein dunkler Bildschirm an der Wand) |
| E2.6 Bildnachweis der Fotos steht offen unter Einstellungen → Aussehen; ein Test prüft, dass zu jedem Fenster Foto und Urheber vorhanden sind | Testbereit | `SettingsView.tsx`, `public/welt/QUELLEN.md`, `test/regeln/raeume.test.ts` |
| E2.7 Schmale Bildschirme: Fenster oben, Inhalt darunter, Räume als Auswahl | Testbereit | bei 390 Pixeln Breite an zwei Räumen angesehen |

**Was sich für dich ändert:** Die Startseite ist jetzt der Raum „Heute“ (die Adresse `/heute` führt in denselben
Raum). Die frühere Kommandozentrale mit den Kacheln und die 3D-Landschaft werden nicht mehr gezeigt; die
Auswahl „Gebirge oder Fotos“ und die Bildqualität in den Einstellungen sind deshalb entfallen. Der Code der
Landschaft (`src/components/world/`, `src/lib/world.ts`, `src/lib/quality.ts`) liegt weiter im Repo, bis
Benedikt entscheidet (Frage 7). Entfernt wurden nur die Teile, die ausschließlich zur alten Oberfläche
gehörten: `CommandCenter.tsx`, `ModuleCard.tsx`, `HoloLink.tsx`, `HoloView.tsx`, `src/lib/holo.ts`; sie stehen
im Verlauf vor diesem Commit. Alle Funktionen, Schnittstellen und Daten sind unverändert.

### Testergebnisse Schritt E2 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **435 Tests: 435 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Räume 4) |
| `npx next build` | erfolgreich |
| Gegenprobe (Fahrtrichtung vertauscht; Foto eines Raums umbenannt) | je 1 Test schlägt fehl; danach wiederhergestellt |
| Handprüfungen im Browser (Chromium, gebauter Server, Testdaten): `projekte-rauch`, `agenten-rauch`, `routinen-rauch`, `stimme-rauch`, `schleuse-rauch`, `browser-rauch`, `pdf-rauch` | alle Schritte in Ordnung; `stimme-rauch` an das neue Eingabefeld angepasst |
| Alle zwölf Räume mit Beispieldaten (`test/hand/glashaus-schau.ts`) bei 1440 × 810 angesehen, Trading und Einstellungen auch weiter unten; acht Räume zusätzlich in 3840 × 2160 für Benedikt aufgenommen (davon „Heute“ angesehen) | dunkle Schrift auf heller Wand, nichts abgeschnitten; keine Fehler in der Seite |
| Kamerafahrt in Zeitlupe gefilmt (Heute → Projekte → Kalender → Heute) | Raum, Zwischenwand und neuer Raum bewegen sich als eine Fahrt, die Leiste bleibt stehen |
| „Bewegung reduzieren“ | nur zwei Überblendungen von 160 ms, keine Fahrt |
| Sprung zu einem Abschnitt (`/einstellungen#aussehen`) | die Wand rollt zum Abschnitt, auch wenn er erst nach dem Laden erscheint |
| Durchsicht mit dem Skill `code-review` (Stufe mittel) und Sicherheitsdurchsicht von Hand | siehe Ergebnis unter dieser Tabelle |
| **Nicht geprüft** | echter Mac und Safari (die Fahrt nutzt „View Transitions“; ältere Browser wechseln ohne Fahrt); echte Daten; Geschwindigkeit des Milchglases auf dem Mac; sehr große Monitore über 1920 Pixel Breite nur über die Skalierung, nicht am Gerät; schmale Bildschirme nur an zwei Räumen; die langen Räume Trading und Einstellungen wurden an mehreren Stellen, aber nicht Zeile für Zeile angesehen; der Trading-Desk nur im Ruhezustand, nicht mit laufendem Handel |

**Ergebnis der Durchsicht:** Der Skill hat wieder den ganzen Zweig durchgesehen (ohne GitHub fehlt ihm der
Vergleichsstand). Zum Umbau der Oberfläche gab es keinen Befund. Von Hand geprüft: Der Umbau ändert keine
Datei unter `src/lib/server` und keine Schnittstelle, fügt keine fremden Adressen, kein eingebettetes HTML und
keine neuen Speicherorte im Browser hinzu; Schrift und Fotos liegen im Projekt. Die Durchsicht nannte aber zehn
Befunde zu früheren Schritten: sechs der acht bekannten (Schritt B2) und **vier neue**, die noch nicht
nachgestellt sind:

| Neuer Befund (ungeprüft) | Stelle |
|---|---|
| Im Schlüsselbund-Betrieb kann `writeConfig` einen gespeicherten Schlüssel mit einem leeren Wert überschreiben, wenn die Einstellungen gelesen wurden, während der Schlüsselbund gesperrt war, und er inzwischen wieder lesbar ist | `src/lib/server/config.ts` (um Zeile 176) |
| Morgenbriefing und Tagesabschluss sprechen Text aus Projekteinträgen, ohne ihn als „von Dritten“ zu kennzeichnen; die Kennzeichnung aus Schritt B3 greift dort nicht | `src/lib/commands.ts` (um Zeile 495) |
| Ein Korrekturvorschlag merkt sich alle Felder zum Zeitpunkt des Vorschlags; wer den Eintrag danach von Hand ändert und dann übernimmt, bekommt die alten Werte zurück | `src/lib/server/projekte/projekte.ts` (um Zeile 375) |
| Die Netzschleuse verbindet nur zur ersten gefundenen Adresse eines Servers, ohne Ausweichen auf die nächste | `src/lib/server/netzschleuse.ts` (um Zeile 78) |

Die ersten beiden betreffen Sicherheit und sind in Schritt B4 behoben (R-25, R-24).

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** In den dichten Räumen (Trading, Einstellungen)
standen noch weiße Kästen aus der alten Oberfläche auf der Wand (erledigt in Schritt E3). Der Raum „Firma“ aus dem Entwurf fehlt, er braucht Microsoft 365 (E3). **Sicherheitsrisiken:** keine
neuen. Der Umbau ändert nur die Darstellung; Schnittstellen, Gateway, Freigaben und Not-Aus sind unverändert
und weiter in jedem Raum oben sichtbar.

### Schritt E3: Feinschliff der Räume Trading und Einstellungen (13. November 2026)

Der offene Punkt aus Schritt E2. **Status: Testbereit** (Sandbox, Beispieldaten). Geändert ist nur die
Darstellung, dazu ein Satz im Protokoll des Desks; keine Schnittstelle, keine Regel des Handels, kein Speicherort.

| Was | Vorher | Jetzt |
|---|---|---|
| Trading: Kacheln, Konto, Kurse, Tabellen, Protokoll | weiße Kästen mit Rahmen aus der alten Oberfläche | dieselbe Platte wie in den anderen Räumen: dunkle Linie oben, Wandton, kein Kasten (`PLATTE`, `KACHEL` in `TradingDesk.tsx`) |
| Trading: Scan-Tabelle | stand neben den Grenzwerten; von elf Spalten waren sechs zu sehen, die Prüfung nur durch Schieben | ganze Breite, alle elf Spalten ohne Schieben; die Begründung der Prüfung bricht um (höchstens drei Zeilen, der ganze Text im Hinweis) |
| Trading: Reihenfolge darunter | Scan und Trades links, Grenzwerte und Protokoll rechts | Trades und Protokoll links, Grenzwerte rechts |
| Trading: Texte | Angaben mit Mittelpunkten aneinandergehängt, „BESTANDEN“ in Großbuchstaben, Link „Einstellungen → Rohstoffe“ | Sätze mit Komma und Doppelpunkt, „bestanden“, Link „Einstellungen unter Rohstoffe“; die Regeln des Kontos als echte Liste |
| Trading: Knöpfe | eckig | rund wie überall im Glashaus |
| Protokoll des Desks, wenn Claudes Bewertung nicht zu gebrauchen ist | „Claude antwortet nicht: Unexpected token 'D', … is not valid JSON Ich kaufe in dieser Runde nichts“ | „Claude antwortet nicht: Claudes Bewertung war nicht lesbar. Ich kaufe in dieser Runde nichts.“ Gilt auch für JSON in falscher Form und für eine leere Antwort. Gekauft wird in allen Fällen weiterhin nichts |
| Fehlererklärungen des Gehirns (`explainBrainError`) | manche ohne Satzzeichen am Ende | enden immer als Satz; das wirkt auch in Telegram und in den Meldungen der Oberfläche |
| Einstellungen | fünfzehn Abschnitte untereinander, gut 6.000 Pixel lang, ohne Übersicht | oben eine Sprungleiste mit allen Abschnitten; Leiste und Abschnitte kommen aus derselben Liste (`abschnitteVon`), alle fünfzehn haben eine Adresse (`#du` … `#datenschutz`) |
| Einstellungen: Knopf „Prüfen und speichern“ | brach neben dem Eingabefeld in zwei Zeilen um | einzeilig (`fest` am Knopf, nur an den fünf Stellen neben einem Schlüsselfeld) |
| Schau mit Beispieldaten (`test/hand/glashaus-schau.ts`) | der nachgebaute Chief antwortete unbrauchbar, der Raum Trading blieb leer | der nachgebaute Chief bewertet die zwei Beispiel-Coins: ein Kauf, eine Absage mit langer Begründung. So zeigt die Schau Position, Trade und Urteile (Spielgeld gegen den nachgebauten Markt) |

### Testergebnisse Schritt E3 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **501 Tests: 501 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Fehler als lesbarer Satz 1; der Test zur unbrauchbaren Antwort des Chiefs prüft jetzt fünf Arten von Antwort und den genauen Satz im Protokoll) |
| Rot vor Grün | der Satz im Protokoll schlug vor der Korrektur fehl (einmal mit „Unexpected token“, einmal mit „Cannot read properties of null“); ohne die Satz-Korrektur im Gehirn schlägt deren Test fehl |
| `npx next build` | erfolgreich |
| Sprungleiste im Browser (Chromium, gebauter Server, Beispieldaten) | alle 15 Einträge haben ein Ziel; nach dem Klick steht der Abschnitt oben an der Wand (der letzte so weit oben, wie die Seite reicht) |
| Trading im Browser, ruhend und mit laufendem Spielgeld-Handel (ein Kauf, eine Absage) | Scan-Tabelle 943 von 943 Pixeln, auch mit langer Begründung; bei 820 Pixeln Fensterbreite rollt nur die Tabelle seitlich, nicht die Seite; keine Fehler in der Seite |
| Alle zwölf Räume bei 390 und 1440 Pixeln Breite | kein Knopf und kein Link ragt aus der Seite, nichts lässt sich seitlich schieben |
| Handprüfungen `agenten-rauch`, `projekte-rauch`, `stimme-rauch` | alle Schritte in Ordnung |
| Durchsicht mit dem Skill `code-review` (Stufe mittel) | zehn Befunde zu diesem Schritt, alle eingearbeitet (siehe unten) |
| **Nicht geprüft** | echter Mac und Safari; echte Kurse und echte Antworten von Claude; die Karten für Gold, Silber und Öl (in der Schau ist kein Twelve-Data-Schlüssel eingetragen, die Karten waren nicht zu sehen); viele Coins und viele Positionen zugleich; die Einstellungen ohne Claude-Schlüssel (dann fehlt der Abschnitt „Gedächtnis“ samt Eintrag in der Leiste, das folgt aus derselben Liste, wurde aber nicht angesehen) |

**Befunde der Durchsicht und was daraus wurde:** (1) Gültiges JSON in falscher Form (`null`, `{"coins":{}}`)
lief am neuen Schutz vorbei: jetzt geprüft und getestet. (2, 3) Das Satzzeichen wurde an einer Stelle mit einem
Muster geflickt: jetzt an der Quelle (`alsSatz` in `brain.ts`), auch für Leerraum am Ende. (4) Die Ursache des
Lesefehlers ging verloren: sie hängt jetzt als `cause` am Fehler. (5) „Einzeilig“ galt für alle Knöpfe der
Oberfläche: jetzt nur noch auf Wunsch (`fest`). (6) Die Begründung in der Tabelle war nur per Maus lesbar:
jetzt bricht sie um. (7) Die Grenzwerte konnten ihre Spalte aufdrücken: `min-w-0`. (8) Sprungleiste und
Abschnitte waren zwei Listen: jetzt eine. (9) Doppelter Grund unter den Rohstoff-Karten, überflüssige
Schablonen: bereinigt. (10) Tests für die neuen Fälle: ergänzt.

**Sicherheitsdurchsicht von Hand:** keine neue Schnittstelle, kein neuer Speicherort, keine fremde Adresse,
kein eingebettetes HTML. Der Kaufpfad ist unverändert: Eine unbrauchbare Bewertung führt wie bisher zu keinem
Kauf (Test). Die Ursache am Fehler enthält bei falscher Form nur die Länge der Antwort, nicht ihren Text.
**Offene Probleme:** die Punkte unter „Nicht geprüft“. **Sicherheitsrisiken:** keine neuen.

## Bereich F – Agenten

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| F1.1 Eine Lage für alle Agenten (Gespräch, Browser, Analyst, Intel, Spielgeld-Desk): Zustand, Arbeitsweise, letzter und nächster Lauf, letztes Ergebnis, Fehler, Kosten von heute, feste Grenzen | Testbereit | `src/lib/agenten.ts`, `test/regeln/agenten.test.ts` |
| F1.2 Not-Aus und Sperre gehen jedem anderen Zustand vor; dann wird kein Start angeboten | Testbereit | wie oben, dazu `test/module/agenten.test.ts` gegen die echten Module |
| F1.3 Steuerung in der Ansicht „Agenten“: Intel von Hand starten (mit Kostenhinweis), Desk pausieren und fortsetzen, jeden Agenten sperren und entsperren; Karte „Agenten“ in „Heute“ | Testbereit | `src/components/AgentControl.tsx`; im Browser geprüft (`test/hand/agenten-rauch.ts`) |
| F1.4 Die Steuerung hat keine eigenen Rechte: `/api/agenten` liest nur; die Knöpfe gehen an Intel, Desk und Sicherheitszentrale mit deren Prüfungen | Testbereit | POST auf `/api/agenten` gibt 405 |
| F1.5 Werkzeug `agenten_lesen` für das KI-Gehirn (Klasse A): nur Zustände, Zeiten und Zahlen, kein Text aus dem Netz | Testbereit | Test mit eingeschleuster Anweisung im Lagebild |
| F1.6 Ein Start von Intel von Hand steht im Audit-Log | Testbereit (nur gelesen, kein eigener Test) | `src/app/api/intel/route.ts` |
| F2 Gemeinsamer Zeitplan für Agenten | Testbereit (Sandbox) | Schritt F2 unten. Intel und Edelmetalle laufen über einen Taktgeber; Morgenbriefing und Tagesabschluss zeigt er nur an |
| F3.1 Edelmetall-Agent: Lagebild für Gold und Silber mit Quelle, Datum, Trennung von Fakt und Einordnung, ohne Prognose | Testbereit (nur gegen nachgebautes Twelve Data) | Schritt F2 unten |
| F3.2 Weitere Agenten: Markt, Newsletter, Unternehmen und Technologie, Investoren, Compliance | Offen | neue bezahlte Datenquellen brauchen Benedikts Freigabe |
| F4 Kosten je Agent auch für Gespräch und Browser zählen | Testbereit | Schritt J1 in Bereich J |

### Testergebnisse Schritt F1 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **339 Tests: 339 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Regeln der Agentensteuerung 12, gegen die echten Module und als Werkzeug 5) |
| `npx next build` | erfolgreich; neu `/api/agenten` |
| Handprüfung im Browser (Chromium, gebauter Server, Testdaten) | fünf Agenten mit Zustand; ohne xAI-Schlüssel kein Start-Knopf; Analyst sperren und entsperren wirkt und steht in der Datei der Sicherheitszentrale; „Heute“ zeigt dieselben Agenten; keine Fehler in der Seite; Bildschirmfoto angesehen |
| Gegenproben (Schutz entfernt, Tests müssen fehlschlagen) | Not-Aus ohne Vorrang: 2 schlagen fehl; Sperre ohne Vorrang: 3; Start trotz aufgebrauchtem Budget: 1; Werkzeug gibt Ergebnistext eines Agenten ans Modell: 1. Danach wiederhergestellt, 17 von 17 bestehen |
| Nicht geprüft | echter Mac (Prüfliste Teil H); Start von Intel aus der Steuerung mit echtem Grok (kostet Geld, nur am Mac); Pausieren eines laufenden Desks im Browser (im Test nur die Regel) |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. Für Gespräch und
Browser steht bei den Kosten „noch nicht gezählt“; das ist eine Lücke, kein Wert von null. **Sicherheitsrisiken:**
keine neuen. Die Steuerung kann nichts, was die Ansichten dahinter nicht schon konnten.

### Schritt F2: gemeinsamer Zeitplan und Edelmetall-Agent (13. November 2026)

**Was gebaut wurde**

* **Ein Taktgeber für alles, was JARVIS von selbst tut** (`src/lib/server/zeitplan.ts`, Regeln in
  `src/lib/zeitplan.ts`, Aufgabenliste in `src/lib/server/zeitplan-aufgaben.ts`). Jede Minute fragt er die
  angemeldeten Aufgaben, ob sie dran sind. Für alle gleich gilt: Mit Not-Aus oder Sperre des Agenten läuft
  nichts; zwei Läufe derselben Aufgabe überschneiden sich nie (auch nicht, wenn Zeitgeber und eine geöffnete
  Seite im selben Augenblick nachsehen); ein hängender Lauf wird nach zehn Minuten als fehlgeschlagen gezählt
  und gibt die Aufgabe wieder frei. Jeder Lauf steht mit Beginn und Ausgang in `~/.jarvis/zeitplan.json`, der
  Beginn sofort; wurde JARVIS mitten im Lauf beendet, steht das nach dem Neustart da. In der Datei und in der
  Anzeige stehen nur Zeiten und feste Sätze des Programms, kein Fehlertext eines fremden Servers.
* **Intel läuft jetzt über diesen Taktgeber** statt über einen eigenen Zeitgeber. Wann Intel dran ist
  (tagsüber, im Budget, nicht gleich nach einem Fehlschlag), entscheidet weiter Intel selbst.
* **Edelmetall-Agent „Edelmetalle“** (`src/lib/metalle.ts`, `src/lib/server/metalle.ts`): liest zweimal am Tag
  (07:30 und 17:30, einstellbar, abschaltbar) die Tageskurse von Gold und Silber bei Twelve Data, mit dem
  Schlüssel, den der Spielgeld-Desk schon nutzt. Kein KI-Modell, kein Handel, kein neuer Dienst. Das Lagebild
  trennt **Fakten** (Kurs mit Datum, Veränderung zum Vortag, in 5 und 21 Handelstagen, Hoch und Tief, mittlere
  Tagesspanne, Verhältnis Gold zu Silber, Quelle und Zeitpunkt) von der **Einordnung** (Trend nach fester
  Regel: Kurs gegen den Schnitt der letzten 20 und 50 Handelstage, die Regel steht dabei). Eine Prognose gibt
  er nicht ab; der Hinweis „keine Prognose und keine Anlageberatung“ steht immer dabei.
* **Silber im kostenlosen Plan:** Am 13. November über den Twelve-Data-Konnektor nachgesehen: Das verbundene
  Konto hat 800 Abrufe am Tag (kostenloser Plan), Gold je Feinunze (XAU/USD) kommt, Silber je Feinunze
  (XAG/USD) erst ab dem Plan „Grow“, der Silber-Fonds SLV kommt. Deshalb fragt der Agent für ein Metall, das es
  je Feinunze nicht gibt, den US-Fonds, der ihm folgt (SLV, für Gold GLD; dieselben Ausweichquellen wie beim
  Desk). Der Fonds steht mit eigenem Namen und „je Anteil“ da, nie als Kurs je Feinunze, mit einem Satz, warum;
  das Verhältnis Gold zu Silber gibt es dann nicht.
* **Oberfläche:** im Raum Intel der Abschnitt „Gold und Silber“ (Zahlen, Einordnung, Knopf „Jetzt lesen“,
  Uhrzeiten), im Raum Agenten die Zeile „Edelmetalle“ in der Steuerung und darunter der Abschnitt „Zeitplan“
  (je Aufgabe Takt, letzter Lauf nach Plan mit Ausgang, nächster Termin oder der Grund, warum keiner ansteht).
* **Im Gespräch:** Werkzeug `edelmetalle_lesen` (Klasse A, nur lesen, fragt Twelve Data nicht neu). JARVIS
  bekommt Fakten und Einordnung getrennt und die Anweisung, daraus keine Prognose und keine Empfehlung zu machen.
* **Nebenbei behoben:** Der Sprung zu einem Abschnitt (etwa aus der Steuerung nach „Intel, Gold und Silber“)
  landete daneben, wenn die Seite nach dem Sprung noch gewachsen ist. Die Wand folgt jetzt ein paar Sekunden
  und lässt los, sobald man selbst rollt. Im Raum Intel sind die letzten Punktketten („·“) durch Sätze ersetzt.

**Entwurfsentscheidungen (im Rahmen des Dauerauftrags selbst getroffen)**

* Platin und Palladium sind nicht dabei: ob der Plan sie liefert, ist nicht geprüft.
* Nach einem gescheiterten Lauf (etwa: der Mac ist gerade aufgewacht, das Netz fehlt noch) versucht der Agent es
  nach einer halben Stunde wieder, bis zwei Stunden nach der Uhrzeit. Ein verpasster Tag wird nicht nachgeholt.
* Ein Lauf verbraucht bei Twelve Data zwei Abrufe (einen je Kursreihe, so steht es in deren Hilfe), mit Fonds
  drei. Das sind bei zwei Läufen am Tag höchstens sechs von 800.
* Morgenbriefing und Tagesabschluss verschickte in diesem Schritt noch Telegram mit seinem eigenen Minutentakt;
  seit Schritt G2 laufen auch sie über den gemeinsamen Taktgeber.

### Testergebnisse Schritt F2 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **581 Tests: 581 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 80: Regeln des Zeitplans 9, Regeln der Edelmetalle 16, Taktgeber 16, Edelmetall-Agent gegen nachgebautes Twelve Data und als Werkzeug 23, Aufgaben des Zeitplans gegen die echten Module 11, Karte „Edelmetalle“ in der Agentensteuerung 5) |
| `npx next build` | erfolgreich; neu `/api/metalle` und `/api/zeitplan` |
| Handprüfungen im Browser (Chromium, gebauter Server) | neu `test/hand/metalle-rauch.ts`: Abschnitt im Raum Intel ohne Lagebild, „Jetzt lesen“, Gold je Feinunze und Silber-Fonds je Anteil mit Begründung, Einordnung getrennt, kein Text von Twelve Data in der Seite, Schlüssel nur im Kopf der Anfrage, unbrauchbare Uhrzeit abgelehnt, brauchbare gespeichert, „Jetzt starten“ in der Steuerung, gesperrt liest er nicht. Dazu Agentensteuerung (jetzt sechs Agenten und vier Zeilen im Zeitplan), Tagesabschluss, Projekte: alle in Ordnung |
| Musteransicht (`test/hand/glashaus-schau.ts`, 1440 und 390 Pixel breit) | Abschnitt „Gold und Silber“, Zeile in der Steuerung und Zeitplan angesehen; nichts lässt sich seitlich schieben; alle zwölf Räume ohne herausragende Knöpfe; Sprünge zu vier Abschnitten landen kalt geladen und per Klick; nach eigenem Rollen holt die Wand einen nicht zurück |
| Gegenproben (33 absichtlich eingebaute Fehler, Tests müssen fehlschlagen) | 32 erkannt (unter anderem: Not-Aus und Sperre im Taktgeber, Überlappung, Fristen, fester Satz statt Fehlertext, abgebrochener Lauf nach Neustart, Nachholen über Mitternacht, Trendregel, Fonds je Anteil, Verhältnis nur je Feinunze, kein Fonds bei leerem Kontingent, neuer Versuch nach Fehlschlag). Einer ist gleichwertig: Eine Aufgabe ohne Fälligkeitsprüfung läuft auch ohne die zusätzliche Abfrage nie |
| Code-Review (zwei Durchgänge) | erster Durchgang zehn Punkte, zweiter zwei; alle eingearbeitet oder unten als Grenze genannt |
| Gegen den echten Dienst geprüft | nur drei einzelne Lese-Abfragen über den Twelve-Data-Konnektor (Gold, Silber, SLV, je drei Tage) und der Verbrauch. Die Antwort auf eine Abfrage für zwei Kursreihen zugleich hat JARVIS selbst noch nie vom echten Twelve Data bekommen |
| Nicht geprüft | echter Mac (Prüfliste Teil K); Lauf zur Uhrzeit über Stunden (im Test mit gestellter Uhr); echtes Aufwachen aus dem Ruhezustand; Platin, Palladium |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** Der Aufbau der Antwort bei zwei Kursreihen in
einer Abfrage ist so angenommen, wie ihn der Desk seit jeher liest; stimmt er nicht, meldet der Agent „keine
brauchbaren Kurse“ und zeigt nichts Falsches. Die Kurse des Fonds folgen dem Silberpreis nur ungefähr
(Gebühren, Börsenzeiten); deshalb steht er als Fonds da. Ob der Schlüssel am Mac zum selben Konto gehört wie
der Konnektor, weiß ich nicht. **Sicherheitsrisiken:** keine neuen. Der Agent kann nur lesen, hat kein
KI-Modell und kein Werkzeug zum Handeln; der Schlüssel geht nur im Kopf der Anfrage an Twelve Data.

## Bereich G – Proaktive Routinen

Alles hier entsteht ohne KI aus Daten, die JARVIS schon hat (`src/lib/routinen.ts`, aufbauend auf der Tageslage
von „Heute“). Zwei feste Regeln: Ein vertrauliches Projekt wird nie beim Namen genannt, weder über Telegram
noch im Gespräch am Mac (was JARVIS dort sagt, steht im Verlauf und ginge mit der nächsten Frage an das
KI-Gehirn). Über Telegram stehen Projektnamen und -inhalte nur, wenn der Schalter „Projekte beim Namen“ an ist.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| G1.1 Morgenbriefing mit Projekten: am Mac als Satz, über Telegram als Absatz (ohne Schalter nur Zahlen) | Testbereit | `projekteAbsatz`, `projektSatz`; `test/regeln/routinen.test.ts` |
| G1.2 Tagesabschluss: was erledigt ist, was heute offen blieb, Termine und Aufgaben von morgen, Projekte, was noch auf ein Ja wartet | Testbereit | `tagesabschluss`, `abschlussNachricht`, `abschlussSatz` |
| G1.3 Tagesabschluss per Telegram zur eingestellten Uhrzeit, einmal am Tag; **Voreinstellung: aus**. Auf Zuruf jederzeit: `/abschluss` oder „Feierabend“ in Telegram, „Tagesabschluss“ am Mac | Testbereit | `sendeTagesmeldung` über den gemeinsamen Zeitplan, Einstellungen → Handy |
| G1.4 Projektüberwachung: Überfälliges und Fristen bis drei Tage voraus erscheinen von selbst im Briefing, im Abschluss und unter „Wartet auf dich“ | Testbereit | wie oben |
| G1.5 Abschaltbar: Briefing, Tagesabschluss, Erinnerungen, Projektnamen, Warnungen und Trades je mit eigenem Schalter | Testbereit | im Browser geprüft (`test/hand/routinen-rauch.ts`) |
| G2.1 Hinweise am Tag per Telegram: in einem Projekt ist etwas überfällig geworden, jemand anderes ist mit seiner Aufgabe im Verzug („Hier fehlt eine Rückmeldung“), am Nachmittag ist noch etwas von heute offen. **Voreinstellung: aus** | Testbereit | Schritt G2; `src/lib/hinweise.ts`, `src/lib/server/hinweise.ts` |
| G2.2 Regel gegen zu viele Meldungen: nur 9 bis 18 Uhr, höchstens drei am Tag, mindestens eine Stunde Abstand, jedes Ding einmal, alles Gleichzeitige in einer Nachricht; was das Briefing schon sagt, kommt nicht noch einmal | Testbereit | `test/regeln/hinweise.test.ts` |
| G2.3 Morgenbriefing, Erinnerungen vor Terminen und Tagesabschluss laufen über den gemeinsamen Taktgeber; ein Fehlschlag steht mit festem Satz im Zeitplan; war Telegram nicht erreichbar, kommt die Nachricht nach, aber nie doppelt | Testbereit | `test/module/hinweise.test.ts` |
| G2.4 Hinweis am Mac selbst (ohne Handy), etwa als Mitteilung von macOS | Offen | am Mac steht Überfälliges wie bisher unter „Heute“ |
| G3.1 Antwortentwurf auf Zuruf: am Mac im Raum „Post“ mit dem Knopf „Antwort entwerfen“ oder im Gespräch, auch per Telegram. Der Entwurf liegt nur auf dem Mac (`~/.jarvis/entwuerfe.json`), je Mail einer | Testbereit | Schritt G3; `src/lib/entwuerfe.ts`, `src/lib/server/entwuerfe.ts`, Werkzeug `antwort_entwerfen` (Klasse B) |
| G3.2 Kein Versand: Es gibt kein Werkzeug und keine Schnittstelle zum Senden. Empfänger ist immer der Absender, den der Server im Postfach liest; Betreff ist „Re: …“. Weder das KI-Modell noch der Text der Mail können das ändern. Im Postfach ändert sich nichts | Testbereit | `test/module/entwuerfe.test.ts`, `test/regeln/entwuerfe.test.ts` |
| G3.3 Lesen, ändern, kopieren, verwerfen im Raum „Post“; „Im Mailprogramm öffnen“ trägt Empfänger, Betreff und Text in eine neue Mail ein, abschicken musst du selbst. Was du geändert hast, überschreibt JARVIS nicht | Testbereit | `src/components/Antwortentwuerfe.tsx`; im Browser geprüft (`test/hand/post-rauch.ts`) |
| G3.4 Entwurf im Ordner „Entwürfe“ des echten Postfachs ablegen | Blockiert | ändert das echte Postfach; braucht Benedikts Entscheidung (Frage 13) |
| G3.5 Allen antworten, Anhänge, Zitat der ursprünglichen Mail | Offen | bisher nur Antwort an den Absender, ohne Zitat |
| G4 Marktüberwachung über Intel und Desk hinaus | Offen | kommt mit den Agenten (F) |

### Testergebnisse Schritt G1 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **322 Tests: 322 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Routinen 14, Briefing und Tagesabschluss über den nachgebauten Telegram-Server 3) |
| `npx next build` | erfolgreich |
| Handprüfung im Browser (Chromium, gebauter Server, nachgebauter Telegram-Server) | Tagesabschluss ist aus; einschalten speichert 18:00, Uhrzeit ändern speichert, ausschalten speichert; eine unsinnige Uhrzeit lehnt die Schnittstelle ab; keine Fehler in der Seite |
| Gegenproben (Schutz entfernt, Tests müssen fehlschlagen) | Namen trotz ausgeschaltetem Schalter: 3 schlagen fehl; vertrauliche Projekte beim Namen: 7; zweite Meldung am selben Tag: 2; Tagesabschluss ungefragt eingeschaltet: 2. Danach wiederhergestellt |
| Nicht geprüft | echtes Handy und echter Mac (Prüfliste Teil G); ob die Uhrzeit hält, wenn der Mac schläft (nachgeholt wird bis drei Stunden später, sonst fällt die Meldung an dem Tag aus) |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. Bekannte Grenze: Wer
schon gekoppelt ist, sieht `/abschluss` erst nach erneutem Koppeln im Telegram-Menü; getippt geht es sofort.
**Sicherheitsrisiken:** keine neuen. Titel von Terminen und Texte von Aufgaben standen schon bisher im
Briefing und gehen damit über Telegram; für das Projektgedächtnis gilt der Schalter.

### Schritt G2: Hinweise am Tag, und alles per Telegram über den gemeinsamen Zeitplan (13. November 2026)

**Was sich geändert hat**

* **Ein Taktgeber für alles:** Morgenbriefing, Erinnerungen vor Terminen und Tagesabschluss hatte bisher
  Telegram mit einer eigenen Minutenuhr verschickt. Jetzt sind es Aufgaben des gemeinsamen Zeitplans
  (`src/lib/server/zeitplan-aufgaben.ts`), wie Intel und die Edelmetalle. Damit gelten für sie dieselben
  Regeln: keine Überlappung, Fristen, und ein Fehlschlag steht mit einem festen Satz im Zeitplan (nie mit dem
  Text, den Telegram schickt). Nachrichten an dich sind kein Agent: Sie kommen auch, wenn der Not-Aus steht
  (der Tagesabschluss nennt ihn ja gerade).
* **Nichts geht verloren, nichts kommt doppelt** (`sendeVonSelbst` in `src/lib/server/telegram.ts`): Vor jeder
  Nachricht, die von selbst hinausgeht, sieht JARVIS kurz nach, ob Telegram erreichbar ist. Wenn nicht (der Mac
  ist gerade aufgewacht, das WLAN fehlt noch), ist sicher nichts hinausgegangen; nichts wird als erledigt
  gemerkt, und der Zeitplan versucht es später wieder (Briefing und Tagesabschluss nach fünf Minuten,
  Hinweise nach einer Viertelstunde, Erinnerungen in der nächsten Minute). Erst danach wird die Sache als
  erledigt gemerkt und gesendet. Scheitert es ab da, bleibt es bei erledigt, weil ein Teil schon angekommen
  sein kann. Bisher fiel das Briefing an so einem Morgen stillschweigend aus.
* **Hinweise am Tag** (`src/lib/hinweise.ts`, ohne KI): drei Anlässe. „Überfällig“: Eine Aufgabe von dir in
  einem laufenden Projekt ist über der Frist und stand noch in keinem Briefing. „Hier fehlt eine Rückmeldung“:
  Für die überfällige Aufgabe ist jemand anderes zuständig (das Feld „zuständig“ nennt nicht dich). „Heute noch
  offen“: einmal am Tag ab 15 Uhr, was heute fällig ist, aus Projekten und aus dem Obsidian-Tresor.
* **Die Obergrenze:** nur zwischen 9 und 18 Uhr, höchstens drei Hinweise am Tag, mindestens eine Stunde
  dazwischen, jedes Ding nur einmal, und alles, was gleichzeitig ansteht, kommt in einer Nachricht (je Gruppe
  höchstens fünf Zeilen). Was Morgenbriefing oder Tagesabschluss schon als überfällig nennen, gilt als gemeldet.
  Steht gerade eines von beiden an, wartet der Hinweis, bis es draußen ist.
* **Datenschutz wie bei G1:** Vertrauliche Projekte werden nie beim Namen genannt, nur gezählt. Ohne den
  Schalter „Projekte beim Namen“ stehen über Telegram nur Zahlen. Der Stand in `~/.jarvis/hinweise.json`
  enthält nur Schlüssel aus Nummern und Daten sowie Sendezeiten, keinen Text.
* **Oberfläche:** Einstellungen → Handy hat den neuen Haken „Hinweise am Tag“ (aus, bis du ihn setzt). Der
  Zeitplan im Raum Agenten zeigt jetzt sechs Zeilen; alle führt der Taktgeber selbst aus.

**Entwurfsentscheidungen (im Rahmen des Dauerauftrags selbst getroffen)**

* Voreinstellung aus, wie beim Tagesabschluss: Nach einem Update soll nicht ungefragt eine neue Art von
  Nachricht aufs Handy kommen.
* „Rückmeldung fehlt“ heißt hier genau: Eine bestätigte Projektaufgabe mit Frist ist überfällig, und zuständig
  ist jemand anderes. Ob derjenige wirklich nicht geantwortet hat, weiß JARVIS nicht; Mails wertet er dafür
  nicht aus (das wäre C3 und braucht deine Freigabe).
* Schaltet man die Hinweise zum ersten Mal ein, kommt alles bisher Überfällige einmal gesammelt.
* Nach 60 Tagen vergisst JARVIS, dass er etwas gemeldet hat; ist es dann immer noch überfällig, erinnert er
  noch einmal.
* Der Tresor wird für „Heute noch offen“ höchstens alle zehn Minuten durchsucht.

### Testergebnisse Schritt G2 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **621 Tests: 621 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 40: Regeln der Hinweise 14, alles per Telegram über den Taktgeber gegen den nachgebauten Telegram-Server 28; dafür zwei frühere Tests ersetzt, die prüften, dass der Zeitplan Briefing und Tagesabschluss nur anzeigt). Die früheren Tests für Briefing, Tagesabschluss und Erinnerungen laufen unverändert weiter, jetzt über den Taktgeber |
| `npx next build` | erfolgreich |
| Handprüfungen im Browser (Chromium, gebauter Server) | `routinen-rauch.ts` erweitert: „Hinweise am Tag“ ist aus, Anhaken speichert, der Zeitplan zeigt danach die Regel sowie Briefing und Erinnerungen mit ihrem Takt. `agenten-rauch.ts` (sechs Zeilen im Zeitplan) und `metalle-rauch.ts` laufen durch |
| Gegenproben (29 absichtlich eingebaute Fehler, Tests müssen fehlschlagen) | 29 erkannt (unter anderem: nur tagsüber, höchstens drei am Tag, eine Stunde Abstand, jedes Ding nur einmal, heute erst am Nachmittag, Vertrauliches nie beim Namen, ohne Schalter nur Zahlen, aus bis zum Einschalten, erst Erreichbarkeit prüfen und dann merken, merken vor dem Senden, fester Satz statt Telegram-Text, Hinweis wartet auf das Briefing, Erinnerung nur einmal). Einer blieb im ersten Lauf unbemerkt (zwei Läufe überschreiben sich den Stand); dafür gibt es jetzt einen eigenen Test, danach erkannt |
| Code-Review | zehn Punkte, alle eingearbeitet: Das Briefing merkte auch fehlende Rückmeldungen als gesagt (der Hinweis wäre nie gekommen); Briefing und Hinweis konnten in derselben Minute dasselbe melden; zwei gleichzeitige Läufe konnten sich den Stand überschreiben; ein abgelehnter Schlüssel stand als „nicht erreichbar“ da; der Tresor wurde am Nachmittag jede Minute durchsucht; eine abgerissene Verbindung stand als „nicht angenommen“ da; je Erinnerung ein eigener Erreichbarkeits-Blick; doppelte Wartezeit-Regel; Grenzen als fester Text statt aus der Regel; hängender Lauf hätte ein zweites Briefing auslösen können |
| Gegen den echten Dienst geprüft | **nein.** Alles lief gegen den nachgebauten Telegram-Server; an das echte Telegram ging nichts |
| Nicht geprüft | echtes Handy und echter Mac (Prüfliste Teil L); ob die Uhrzeiten über Stunden halten (im Test mit gestellter Uhr); echtes Aufwachen aus dem Ruhezustand |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. Bekannte Grenzen: Reißt
die Verbindung mitten im Senden ab, weiß niemand, ob die Nachricht ankam; JARVIS schickt sie dann nicht noch
einmal und schreibt das in den Zeitplan. Die Hinweise kommen nur aufs Handy, nicht als Mitteilung am Mac (G2.4).
**Sicherheitsrisiken:** keine neuen. Es geht nichts an ein KI-Modell, und über Telegram geht nichts, was nicht
schon Briefing und Tagesabschluss nach denselben Regeln schicken.

### Schritt G3: Antwortentwürfe für Mails, ohne Versand (13. November 2026)

**Ziel:** JARVIS nimmt dir das Vorformulieren ab, ohne je selbst etwas zu verschicken. „Entwürfe ja, Senden
nur durch dich“ ist hier keine Einstellung, sondern die Bauweise: Einen Weg zum Senden gibt es in JARVIS nicht.

**Was sich für dich ändert**

* Im Raum „Post“ hat jede wichtige Mail den Knopf **„Antwort entwerfen“** (nur mit eingerichtetem KI-Gehirn).
  Im Gespräch geht es genauso: „Entwirf eine Antwort auf die Mail von Petra und sag für Dienstag zu.“ Auch
  per Telegram; der Entwurf liegt dann am Mac.
* Oben im Raum „Post“ erscheint **„Antwortentwürfe“**: An, Betreff, der Text in einem Feld zum Ändern, dazu
  „Im Mailprogramm öffnen“, „Kopieren“, „Speichern“ (nur wenn du etwas geändert hast) und „Verwerfen“.
* „Im Mailprogramm öffnen“ öffnet eine neue Mail in deinem Mailprogramm, mit Empfänger, Betreff und Text.
  Abschicken musst du sie dort selbst. Ist der Text für den Link zu lang (ab etwa 1.900 Zeichen im Link),
  öffnet der Knopf nur Empfänger und Betreff, und den Text holst du mit „Kopieren“: So kommt nie ein
  abgeschnittener Text an.
* Nimmt die Absenderadresse erkennbar keine Antworten an (no-reply und ähnliche), steht das am Entwurf, und
  JARVIS sagt es dazu.

**Die festen Regeln**

* **Kein Versand.** Es gibt kein Werkzeug, das sendet, weiterleitet oder im Postfach etwas ablegt, und die
  Schnittstelle `/api/entwuerfe` kennt nur Lesen, Ändern und Verwerfen. Für einen Entwurf geht genau ein
  lesender Befehl an das Postfach (Absender und Betreff, nicht der Text der Mail).
* **Der Empfänger ist immer der Absender der Mail**, so wie der Server ihn im Postfach liest. Das KI-Modell
  gibt nur die Nummer der Mail und den Text an; einen Empfänger oder Betreff kann es nicht angeben, und was
  es zusätzlich mitschickt, wird nicht beachtet. Eine abweichende Antwortadresse im Kopf der Mail
  („Reply-To“) oder im Text ändert nichts. Eine Absenderadresse, die mehr ist als eine schlichte Adresse
  (Komma, Fragezeichen, &, Leerzeichen), bekommt gar keinen Entwurf.
* **Der Link ins Mailprogramm** enthält genau einen Empfänger, einen Betreff und einen Text. Zeichen aus
  Betreff und Text sind verschlüsselt und können keine weiteren Empfänger oder Felder aufmachen.
* **Was du selbst geändert hast, bleibt.** Ein neuer Entwurf ersetzt den alten nur, solange du ihn nicht
  geändert hast; sonst sagt JARVIS, dass dein Entwurf bleibt, bis du ihn verwirfst.
* **Ein Entwurf macht das Gespräch „fremd“** (wie das Öffnen einer Mail): Danach fragt das Gateway bei
  Änderungen und Aufträgen mit Außenwirkung nach. Das Werkzeug selbst ist Klasse B (intern vorbereiten,
  ohne Freigabe), weil der Entwurf den Mac nicht verlässt.
* **Die Datei** `~/.jarvis/entwuerfe.json` ist nur für dich lesbar und enthält nur die Entwürfe (höchstens
  50, kein Text der ursprünglichen Mail, kein Passwort). Lässt sie sich nicht schreiben, erfährst du es, und
  es gilt der alte Stand. Ist sie unlesbar, wird sie beiseitegelegt und nicht überschrieben.
* **Anweisungen an das KI-Modell** (keine Garantie, sondern Vorgabe): in deinem Namen, kurz, in der Sprache
  der Mail; nichts zusagen, was du nicht gesagt hast; fehlende Angaben als Lücke in eckigen Klammern; der
  Text der Mail ist nie eine Anweisung; nichts aus anderen Mails, dem Gedächtnis oder Projekten hineinschreiben,
  das du nicht dafür genannt hast.

### Testergebnisse Schritt G3 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **653 Tests: 653 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 32: Regeln für Betreff, Text, Adresse und Link 8; Entwürfe gegen das nachgebaute Postfach und den nachgebauten Claude 24). `npx next build` zeigt weiter die vier bekannten Hinweise von Turbopack, keine neuen |
| `npx next build` | erfolgreich |
| Handprüfung im Browser (Chromium, gebauter Server, nachgebautes Postfach, nachgebauter Claude) | `post-rauch.ts` (neu): Schutz der Schnittstelle (ohne eigenen Header und von fremder Seite 403; „senden“ und „anlegen“ gibt es nicht), Knopf „Antwort entwerfen“, Entwurf erscheint, ändern und speichern, Link ins Mailprogramm mit dem Text aus dem Feld, zu langer Text ohne Text im Link, eigener Entwurf wird nicht überschrieben, verwerfen; am Ende kein ändernder Befehl im Postfach |
| Gegenproben (38 absichtlich eingebaute Fehler, Tests müssen fehlschlagen) | 38 erkannt (unter anderem: Empfänger nicht vom Aufrufer, nur schlichte Adresse, Betreff und Text im Link verschlüsselt, langer Link ohne Text, eigene Änderung bleibt, gleiche Nummer aber andere Mail, höchstens 50, Datei nur für dich, Schreibfehler wird gemeldet, danach gilt der alte Stand, Änderungen nacheinander, kaputte Datei beiseite, nur Absender und Betreff laden, Entwurf macht das Gespräch fremd, Klasse B, Modell weiß: kein Versand). Im ersten Lauf blieb einer unbemerkt („no-reply“ im Teil hinter dem @ hätte fälschlich gewarnt); dafür gibt es jetzt zwei weitere Prüffälle, danach erkannt. Ein zweiter war falsch angesetzt und lief erst im zweiten Anlauf |
| Code-Review | zehn Punkte, alle eingearbeitet: Ein Schreibfehler wurde verschluckt (Entwurf schien gespeichert); jeder Postfachfehler hieß „die Mail gibt es nicht mehr“; der Entwurf machte das Gespräch nicht „fremd“, obwohl der Name des Absenders im Ergebnis steht; ein neuer Entwurf überschrieb stillschweigend einen von dir geänderten; nach dem Speichern blieb der Knopf „Speichern“ stehen, wenn der Server den Text aufgeräumt hatte; sehr lange Links ins Mailprogramm; dieselbe Mailnummer nach einem Wechsel des Postfachs; für den Entwurf wurde die ganze Mail geladen statt nur Absender und Betreff; „no-reply“ mit Zusatz wurde nicht erkannt; überflüssige Fehlerbehandlung |
| Gegen die echten Dienste geprüft | **nein.** Postfach und KI-Modell waren nachgebaut. Was das echte Modell schreibt (Ton, Länge, ob es Lücken lässt statt zu erfinden), ist nicht geprüft |
| Nicht geprüft | echter Mac: ob „Im Mailprogramm öffnen“ dein Mailprogramm mit Umlauten und Absätzen richtig füllt (Prüfliste Teil M); echtes Postfach |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. **Bekannte Grenzen:**
Die Antwort geht nur an den Absender (kein „Allen antworten“), ohne Anhänge und ohne Zitat der ursprünglichen
Mail. Im Mailprogramm ist sie eine neue Mail mit „Re:“ im Betreff, nicht technisch an den alten Verlauf
gehängt. Der Entwurf liegt nicht im Ordner „Entwürfe“ deines Postfachs (Frage 13). Der Absender einer Mail
lässt sich fälschen: Sieh bei „An“ nach, bevor du abschickst.
**Sicherheitsrisiken:** Ein Entwurf entsteht aus dem Text einer fremden Mail. Eine manipulierte Mail kann
versuchen, das KI-Modell dazu zu bringen, etwas in den Entwurf zu schreiben, das dort nicht hingehört. Das
Modell hat die Anweisung, das nicht zu tun; technisch erzwungen ist es nicht. Der Schutz ist: Der Entwurf
verlässt den Mac nur, wenn du ihn selbst abschickst, er geht nur an den Absender, und am Entwurf steht der
Hinweis, ihn vorher zu lesen. Wie schon beim Öffnen einer Mail geht ihr Text an das KI-Modell (Anthropic).

## Bereich H – Sprache und Desktop

Benedikts Wunsch vom 13. November 2026: eine bessere Stimme über ElevenLabs. Sie ist ein Zusatz zur Stimme des
Macs, nie ein Ersatz: Ohne Schlüssel, ausgeschaltet, über dem Tageslimit, beim Not-Aus oder bei einem Fehler
spricht der Mac weiter. Der Schlüssel liegt nur auf dem Server (`src/lib/server/stimme.ts`), die Seite bekommt
nur den Ton. **Wichtig:** Ist die Stimme eingeschaltet, geht jeder Satz, den JARVIS laut vorliest, an
ElevenLabs, auch Inhalt aus Mails, Terminen und Aufgaben (R-20 in `docs/jarvis-2.0/02-risiken.md`).

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| H1.1 ElevenLabs einrichten: Schlüssel prüfen und speichern (zieht mit in den Schlüsselbund um), Stimme aus dem eigenen Konto wählen, Modell, Probe mit festem Satz, Schalter; nichts schaltet sich von selbst ein | Testbereit (nur Nachbau) | Einstellungen → Stimme; `stimmeEinstellen`; `test/module/stimme.test.ts` |
| H1.2 Vorlesen Satz für Satz über `/api/stimme`; der nächste Satz wird geholt, während der aktuelle läuft; fällt ElevenLabs aus, spricht der Mac den Rest | Testbereit (nur Nachbau) | `src/lib/useVoice.ts`; im Browser geprüft (`test/hand/stimme-rauch.ts`) |
| H1.3 Tageslimit in Zeichen (Voreinstellung 5.000), gezählt vor dem Senden; Not-Aus hält auch die Probe | Testbereit | `sprich`, `stimmeStatus` |
| H1.4 Fehler von ElevenLabs als eigener Satz von JARVIS (nie der Text des Dienstes), sichtbar in den Einstellungen und einmal als Hinweis | Testbereit | `fehlerText` |
| H1.5 Unterbrechen: „Stopp“, „Halt“, „Ruhe“, „Hör auf“ ohne „Jarvis“, während er spricht; Escape und „Jarvis …“ wie bisher. Bricht auch die Wolkenstimme sofort ab | Testbereit (Regel und Escape geprüft; das gesprochene „Stopp“ nur als Regel, ohne Mikrofon) | `stopsSpeech` in `src/lib/voiceText.ts` |
| H1.6 Mit echtem ElevenLabs-Schlüssel am Mac prüfen | Offen (Benedikt) | Prüfliste Teil I; kostet Zeichen aus seinem Tarif |
| H2 Desktop-Agent mit Regeln | Offen | |

### Testergebnisse Schritt H1 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run lint`, `npm run typecheck` | 0 Befunde, 0 Fehler |
| `npm test` | **376 Tests: 376 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Regeln der Stimme und des Unterbrechens 17, gegen den nachgebauten ElevenLabs-Dienst 20) |
| `npx next build` | erfolgreich; neu `/api/stimme` |
| Handprüfung im Browser (Chromium, gebauter Server, nachgebautes ElevenLabs mit echtem, stillem MP3) | fremde Herkunft und fehlender JARVIS-Kopf: 403; falscher Schlüssel wird nicht gespeichert; richtiger Schlüssel schaltet nichts ein und steht nirgends in der Seite; Stimme wählen, Probe wird abgespielt, einschalten; eine Antwort wird in zwei Stücken geholt und beide werden im Browser bis zum Ende abgespielt; Escape: kein weiterer Satz; Ausfall des Dienstes: höchstens zwei Versuche, keine Fehler in der Seite; Tageslimit: 429 und Hinweis in den Einstellungen; Schlüssel entfernen. Bildschirmfotos angesehen |
| Code-Review (Skill `code-review`, Stufe mittel) | zehn Befunde, alle behoben und, wo es eine Regel ist, mit Test belegt: Probe kam bei ausgeschaltetem Schalter am Not-Aus vorbei; Stimme blieb nach einer Ablehnung bis zum Neuladen aus; „Stopp“ griff schon bei halb gehörten Sätzen; Tonfreigabe des Browsers wurde zu früh als erteilt gemerkt; Echo-Schutz sperrte „Hör auf“ bei Alltagswörtern; ein nicht belegtes Modell (v4 Turbo) entfernt; Fehler des Dienstes waren unsichtbar; neuer Schlüssel behielt Stimme und Schalter; Frist schnitt lange Sätze ab; Rückbuchung nach Mitternacht |
| Sicherheitsprüfung (von Hand; der Skill `security-review` lief nicht, weil er `origin/HEAD` braucht und GitHub gesperrt ist) | Schlüssel nie in Antworten, im Audit-Log oder in der Seite; Schnittstelle nur von diesem Mac mit JARVIS-Kopf; Stimmenkennung nur aus der Liste des Kontos und nur Buchstaben und Ziffern; Text des Dienstes wird nie angezeigt oder vorgelesen; gespeichert wird nur die Zeichenzahl des Tages |
| Gegenproben (Schutz entfernt, Tests müssen fehlschlagen) | Schalter ignoriert: 3 schlagen fehl; Not-Aus ignoriert: 2; Limit nicht geprüft: 1; Probe schickt fremden Text: 1; Probe trotz Not-Aus: 2; beliebige Stimme gespeichert: 1; Fehler zählen als Verbrauch: 1; Sprachcode für Multilingual: 1; Schlüssel schaltet gleich ein: 1; „Stopp“ ohne Echo-Schutz: 1; „Danke“ unterbricht: 1; Rückbuchung nach Mitternacht: 1. Danach wiederhergestellt |
| Nicht geprüft | **das echte ElevenLabs** (kein Schlüssel, keine Kosten von hier): ob der Dienst Anfragen genau so annimmt, wie der Nachbau es tut, zeigt erst Prüfliste Teil I; Klang und Verzögerung; Safari; das gesprochene „Stopp“ mit echtem Mikrofon und Lautsprecher (Echo) |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** Der Nachbau ist nach der Dokumentation von
ElevenLabs vom 13. November gebaut (`/v2/voices`, `/v1/text-to-speech/…/stream`, `/v1/user/subscription`);
die Fehlerantworten des echten Dienstes sind dort nicht beschrieben, deshalb wertet JARVIS nur den Statuscode aus.
Ob Stimmen aus der ElevenLabs-Bibliothek im Gratis-Tarif über die API gehen, ist nicht belegt.
**Vorfall:** Ein Versuch, über den ElevenLabs-Konnektor von der Cloud aus drei Hörproben zu erzeugen, wurde von
ElevenLabs abgelehnt („ungewöhnliche Aktivität“, Gratis-Zugang gesperrt). Berechnet wurde nichts; Benedikt ist
informiert; von der Cloud aus wird nichts mehr erzeugt. **Sicherheitsrisiken:** neu R-20 (Vorgelesenes geht
an ElevenLabs). Laufende Kosten entstehen erst, wenn Benedikt einen bezahlten Tarif wählt und die Stimme
einschaltet; das ist seine Entscheidung.

## Bereich J – Qualität

### Schritt J1: Kostenbuch und Modellwahl an einer Stelle (13. November 2026)

Bisher zählten nur Intel, der Analyst und das X-Lesen des Desks ihre Kosten, jeder für sich. Beim Gespräch und
beim Browser-Agenten stand „noch nicht gezählt“, und die Bewertungen des Chiefs fehlten ganz. Das Modell und die
Preise standen in vier Dateien.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J1.1 Eine Stelle für Modellwahl und Preise: Rolle (Gespräch, Browser, Analyst, Chief) → Modell; Listenpreise je Modell; Rechnung aus dem Verbrauch, den Anthropic mit jeder Antwort meldet | Testbereit | `src/lib/modelle.ts`, `test/regeln/modelle.test.ts` (11). Die Wahl ist unverändert: Opus 5.5, für den Chief Haiku 5.5 |
| J1.2 Kostenbuch `~/.jarvis/kosten.json`: je Tag und Agent Betrag, Anfragen, Token, Websuchen, getrennt nach Claude und Grok; nur Zahlen, kein Text, kein Schlüssel | Testbereit | `src/lib/server/kosten.ts`, `test/module/kosten.test.ts` (11) |
| J1.3 Alle fünf Agenten buchen: Gespräch und Browser je Anfrage, Analyst je Anfrage (seine Summe je Dokument bleibt), Chief des Desks, Intel und das X-Lesen des Desks mit dem Betrag, den Grok meldet | Testbereit | Tests gegen den nachgebauten Claude und xAI; Browser mit echtem Chrome in `test/hand/browser-rauch.ts`. **Nicht automatisch geprüft:** die Buchung beim X-Lesen des Desks (zwei Zeilen wie bei Intel) |
| J1.4 Ansicht „Agenten“: „Kosten heute“ bei jedem Agenten, beim Desk Grok und Claude einzeln; oben „Heute zusammen“ und der laufende Monat, mit dem Hinweis „geschätzt nach Listenpreis“ | Testbereit | `src/components/AgentControl.tsx`; im gebauten Server mit Beispieldaten angesehen (Gespräch, Browser, Desk mit zwei Diensten) |
| J1.5 JARVIS kann die Kosten nennen („Was hat JARVIS heute gekostet?“): `agenten_lesen` liefert Summe heute, Monat und die Dienste einzeln, weiter nur Zahlen und feste Bezeichnungen | Testbereit | `test/module/agenten.test.ts` (erweitert) |
| J1.6 Anderer Anbieter als Anthropic austauschbar | Offen | die vier Aufrufstellen nutzen weiter das Anthropic-SDK direkt; ein Wechsel des Modells innerhalb von Claude braucht jetzt eine Zeile |
| J1.7 Wiederherstellungstests (Sicherung zurückspielen und prüfen) | Offen | `scripts/sichern.sh` prüft bisher nur, dass sich das Bündel klonen lässt |

**So wird gerechnet (Stand der Preise: 13. November 2026, abgelesen aus der Preisliste von Anthropic):**
Opus 5.5 kostet 4 Dollar je Million Token Eingabe und 20 je Million Ausgabe, gelesener Zwischenspeicher 0,20,
geschriebener 5 (fünf Minuten) oder 8 (eine Stunde). Haiku 5.5 kostet 0,10 und 0,50, bei Anfragen mit mehr als
100.000 Token Prompt 0,50 und 2,50. Eine Websuche kostet einen Cent. Antwortet nach einer Ablehnung ein
Ausweichmodell, zählt jeder Versuch zum Preis seines Modells. Grok rechnet seine Kosten selbst aus; das Buch
übernimmt den Betrag.

**Grenzen, die du kennen solltest:**

* Die Zahlen sind eine **Schätzung nach Listenpreis**, keine Rechnung. Maßgeblich bleibt die Abrechnung bei
  Anthropic und xAI. Ändern sich dort die Preise, muss die Tabelle in `src/lib/modelle.ts` nachgezogen werden.
* Bricht eine Antwort mittendrin ab (du unterbrichst, die Verbindung reißt), bucht JARVIS beim Gespräch und beim
  Analysten, was zu Beginn der Antwort gemeldet war: die Eingabe sicher, die Ausgabe zu niedrig. Beim Browser
  und beim Chief (Antwort in einem Stück) ist bei einem Abbruch nichts bekannt und nichts gebucht. Das Buch
  zählt in diesen Fällen etwas zu wenig.
* Ein abgelehnter Versuch ohne Ausgabe wird nicht mitgezählt. Anthropic berechnet ihn in wenigen Kategorien
  doch; auch das wäre etwas zu wenig.
* Das Buch zählt ab dem ersten Tag, an dem etwas gebucht wurde („gezählt seit“). Frühere Ausgaben stehen
  nicht darin. Am ersten Tag kann „Heute zusammen“ etwas enthalten, das Intel oder der Desk schon vorher
  ausgegeben haben; der Monat ist deshalb nie kleiner als der Tag.
* Beim Analysten steht weiter, was die **heute gestarteten** Dokumente gekostet haben. Läuft ein Dokument über
  Mitternacht, weicht das leicht vom Buch ab.
* Das Buch bremst nichts. Die Obergrenzen setzen weiter die Agenten selbst durch (Tagesbudget bei Intel und
  beim X-Lesen, höchstens 10 Dollar je Dokument). Ein gemeinsames Tagesbudget für alle Agenten gibt es nicht.
* Lässt sich die Datei nicht lesen, zeigt die Ansicht „nicht lesbar“ statt einer falschen Zahl, die Agenten
  arbeiten weiter, und die Datei bleibt unangetastet. Ist ihr Inhalt kaputt, wird sie beiseitegelegt
  (`kosten.json.defekt-…`) und das Buch beginnt neu.

### Testergebnisse Schritt J1 (13. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **482 Tests: 482 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu: Modelle und Preise 11, Kostenbuch 11, Kosten in der Agentenlage 6; erweitert: Intel, Dokumente, Werkzeug `agenten_lesen`) |
| Tests zuerst | Die neuen Tests liefen vor dem Bau rot (Modul fehlte) und nach der Durchsicht noch einmal rot (7 Tests), bevor die Korrekturen kamen. Gegenprobe: gegen die alte `agenten.ts` schlagen 4 der neuen Regeltests fehl |
| `npx next build` | erfolgreich |
| Handprüfung `agenten-rauch` (Chromium, gebauter Server) | alle Schritte in Ordnung |
| Handprüfung `browser-rauch` (echtes Chrome, nachgebauter Claude) | drei Anfragen an Claude, drei Buchungen beim Browser-Agenten (0,00042 Dollar bei je 10 und 5 Token); die Netzsperren wie bisher |
| Ansicht „Agenten“ mit Beispieldaten (1920 × 1080) | Gespräch 0,17 $ bei 6 Anfragen, Browser 0,28 $ bei 9, nachgerechnet von Hand; „Heute zusammen 0,45 $, im November bisher 2,25 $“; Desk mit Grok und Claude einzeln |
| Preise | gegen die Preisliste von Anthropic vom 13. November geprüft (Opus 5.5, Haiku 5.5 mit beiden Stufen, Opus 5, Opus 4.8, Sonnet 5.5, Websuche) |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde, alle eingearbeitet: Monatssumme sprang, wenn die Auskunft eines Agenten ausfiel; jeder Lesefehler galt als kaputte Datei und legte ein heiles Buch beiseite; „nicht lesbar“ war nie erreichbar; das Grok-Budget des Desks fehlte im Werkzeug; abgebrochene Antworten wurden nicht gebucht; der Desk zeigte Claude-Kosten, obwohl er aus war; „claude-opus-5-2“ wäre als „claude-opus-5“ gerechnet worden; jede Buchung schrieb die ganze Datei; doppelte Hilfsfunktion und Namen |
| Sicherheitsprüfung (von Hand) | Im Buch stehen nur Zahlen und feste Schlüsselwörter (Test liest die Datei und prüft jede Zeichenkette); Datei nur für den Benutzer lesbar; beim Laden zählt nur, was ein bekannter Agent, ein bekannter Dienst und eine Zahl ist; das Werkzeug gibt weiter keinen Text aus dem Netz an das Modell; kein Agent hängt vom Buch ab (Fehler beim Buchen werden gemeldet, nicht geworfen); Budgets unverändert |
| Nicht geprüft | **die echte Abrechnung**: Ob die Schätzung zur Rechnung von Anthropic passt, zeigt erst der Vergleich am Mac (Prüfliste H8). Kein echter Claude- oder Grok-Aufruf von hier, keine Kosten. Safari. Die Buchung beim X-Lesen des Desks |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** siehe „Grenzen“ oben. **Sicherheitsrisiken:**
keine neuen; das Kostenbuch enthält keine Inhalte. **Neue laufende Kosten:** keine.

## Phase 3 bis 10

| Phase | Zustand | Hinweis |
|---|---|---|
| 3 Azure-Infrastruktur | Blockiert | D&S-Abonnement, IT-Verantwortliche, freigegebene Dienste, Kosten klären |
| 4 Claude sicher integrieren | Offen | persönlicher API-Schlüssel; AVV, Aufbewahrung, ZDR klären (R-14) |
| 5 Microsoft 365 / Entra ID | Testbereit für Termine aus Outlook lesen (Schritt D1, nur gegen Nachbau); echte Anbindung blockiert | siehe Bereich D; braucht die App-Registrierung durch eure IT |
| 6 Projektgedächtnis | Testbereit (Schritt C1, Datei statt Datenbank) | siehe Bereich C |
| 7 Geschäftsführungsdashboard | Testbereit für „Heute“ und „Projekte“ (Schritt E1), Rest offen | siehe Bereich E |
| 8 Desktop Agent, Sprache | Blockiert | Windows oder Mac (R-15) |
| 9 Verkehr, Automatisierungen, Agenten | Offen | Trading bleibt Spielgeld |
| 10 Qualitätssicherung, Einführung | Offen | |

## Offene Fragen an Benedikt

1. [Prüfliste für den Mac](docs/pruefliste-mac.md) durchgehen (Teile A bis N; Teil N erst, wenn eure IT so weit ist). Benedikt hat sie am 13. November
   als PDF bekommen.
2. Schlüssel nach dem Umzug neu ausstellen (Rotation)? Ändert echte Zugangsdaten, daher nur auf deine Ansage.
3. Vor Phase 3: Gibt es ein D&S-Azure-Abonnement, und wer betreut die Unternehmens-IT?
4. Vor Phase 8: Läuft der Geschäftsführungs-PC mit Windows oder macOS?
5. **Entschieden am 13. November 2026:** Ins Projektgedächtnis dürfen Benedikts eigene, unkritische
   Projektdaten („nur Sachen zu mir, nichts Wichtiges“). Für sensible Dinge überlegt er sich noch etwas; bis
   dahin bleiben vertrauliche Firmen- und Kundendaten draußen oder werden als „vertraulich“ markiert (dann
   gehen weder Name noch Inhalt an Anthropic oder über Telegram, R-17).
6. Soll die Vorbereitung vor Besprechungen auch per Telegram kommen? Steht auf aus; du schaltest es selbst in
   den Einstellungen ein, wenn du es willst.
8. ElevenLabs: Schlüssel am Mac eintragen (Einstellungen → Stimme), Wunschstimme im ElevenLabs-Konto zu „Meine
   Stimmen“ hinzufügen, Prüfliste Teil I. Der Gratis-Tarif hat 10.000 Zeichen im Monat (etwa 30 Antworten);
   ob du einen bezahlten Tarif nimmst (Starter 6 $ im Monat, Stand 13.11.), entscheidest du.
7. 3D-Landschaft: Im Glashaus wird sie nicht mehr gezeigt (die frühere Frage nach einem Felsen für die
   Projekte hat sich damit erledigt). Ihr Code liegt noch im Repo. Soll er endgültig entfernt werden, oder
   möchtest du sie irgendwo behalten? Bis zu deiner Ansage bleibt er unangetastet.
9. Glashaus am Mac ansehen (Prüfliste Teil J) und sagen, was noch stört.
11. Twelve Data: Im kostenlosen Plan gibt es Silber nur über den Fonds SLV, nicht je Feinunze (dafür bräuchte
    es den bezahlten Plan „Grow“). Der Edelmetall-Agent zeigt deshalb den Fonds und schreibt das dazu. Ein
    bezahlter Plan wäre deine Entscheidung; nötig ist er nicht. Prüfliste Teil K am Mac durchgehen.
12. Hinweise am Tag: Sie sind aus. Wenn du sie willst, setz den Haken unter Einstellungen → Handy und geh
    Prüfliste Teil L durch. Passen dir die Grenzen (9 bis 18 Uhr, höchstens drei am Tag, „Heute noch offen“ ab
    15 Uhr)? Sie stehen an einer Stelle und lassen sich leicht ändern.
13. Antwortentwürfe: Sie liegen nur auf dem Mac im Raum „Post“; verschicken musst du selbst (Prüfliste
    Teil M). Soll JARVIS einen Entwurf künftig auf dein Ja hin auch in den Ordner „Entwürfe“ deines echten
    Postfachs legen, damit du ihn am Handy fertig machen kannst? Das würde dein echtes Postfach verändern
    und ist deshalb nicht gebaut, bis du es entscheidest. Senden würde JARVIS auch dann nicht.
14. Microsoft 365: Willst du deine Outlook-Termine in JARVIS sehen? Dann braucht es einmal eure IT: eine
    Anwendung im Microsoft-Verzeichnis der Firma mit zwei lesenden Rechten (Anleitung in
    [08-microsoft-365.md](docs/jarvis-2.0/08-microsoft-365.md), Abschnitt „Was eure IT einmal anlegt“). Das
    ändert etwas an eurem Verzeichnis und ist deshalb eure Entscheidung, nicht meine. Danach meldest du dich
    am Mac selbst an (Prüfliste Teil N); damit liest JARVIS zum ersten Mal echte Firmentermine. Steht dein
    Firmenkonto auch in der Kalender-App des Macs? Dann gehen diese Termine heute schon über den Mac-Kalender
    ins Gespräch mit dem KI-Modell; sag mir, ob du das so willst.
10. Kosten: nach ein paar Tagen die Zahlen in „Agenten“ mit der Abrechnung bei Anthropic vergleichen
    (Prüfliste H8). Möchtest du ein gemeinsames Tagesbudget für alle Agenten, bei dem JARVIS warnt oder anhält?
    Bisher hat jeder Agent nur seine eigene Grenze.

## Sicherung

| Was | Wo | Stand |
|---|---|---|
| Arbeitszweig als Git-Bündel | Projektdateien `jarvis/sicherung/jarvis-aktuell.bundle` | wird nach jedem Arbeitspaket mit `scripts/sichern.sh` erneuert und dabei geprüft (klonen, gleicher Commit); Verlauf in `sicherungen.txt` |
| Alle Zweige (alle PRs) | Projektdateien `jarvis/sicherung/jarvis-alle-zweige-2026-11-13.bundle` | Stand 13.11. |
| ZIP zum Entpacken auf dem Mac | Projektdateien `jarvis/sicherung/Jarvis-aktuell.zip` | wie der Arbeitszweig, ohne `node_modules` |
| GitHub | `lettonato/jarvis`, PR #18 | Stand `093129f` vom 8.11.; alles danach nur lokal |

## Nächste Schritte

Benedikts Wünsche vom 13. November 2026 gehen vor:

1. **H1 Stimme: gebaut, Testbereit** (siehe Bereich H). Offen ist nur die Prüfung mit Benedikts Schlüssel am Mac.
2. **E-Design: Benedikt hat am 13.11. „Glashaus“ gewählt** („wir bleiben bei der Ursprungsversion“), also
   Entwurf B wie gezeigt, ohne Zutaten aus den anderen Entwürfen. Vorlage: `docs/design-entwuerfe/b.html`.
   **Status: Testbereit** (Schritt E2 in Bereich E): alle zwölf Räume sind umgestellt, alle Funktionen
   geblieben. Der Feinschliff der dichten Räume Trading und Einstellungen ist in Schritt E3 erledigt. Offen
   ist Benedikts Blick am Mac (Prüfliste Teil J).
3. **Befunde aus den Durchsichten vom 13.11.**: alle behoben, in den Schritten B3, B4, B5 und B6.

Danach wie geplant:

4. **J Kostenübersicht und Modelladapter: gebaut, Testbereit** (Schritt J1 in Bereich J). Offen: Vergleich mit
   der echten Abrechnung am Mac (Prüfliste H8), anderer Anbieter austauschbar, Wiederherstellungstests.
5. **F2/F3.1: gebaut, Testbereit** (Schritt F2 in Bereich F): gemeinsamer Zeitplan, Edelmetall-Agent. Weitere
   Agenten (F3.2) nur mit freigegebenen Datenquellen.
6. **G2: gebaut, Testbereit** (Schritt G2 in Bereich G): Hinweise am Tag mit Obergrenze; Morgenbriefing,
   Erinnerungen und Tagesabschluss laufen über den gemeinsamen Taktgeber.
7. **G3: gebaut, Testbereit** (Schritt G3 in Bereich G): Antwortentwürfe für Mails, ohne Versand.
8. **D1: gebaut, Testbereit, nur gegen Nachbau** (Schritt D1 in Bereich D): Termine aus Outlook lesen. Die
   echte Anbindung wartet auf eure IT (Frage 14). Mail, Dateien und Teams über Graph sind nicht gebaut.
   **Als Nächstes: I:** Azure nur vorbereiten (Anleitung, Speicher- und Modellschicht austauschbar; nichts
   anlegen, keine Kosten). Danach offen in J: anderer Anbieter austauschbar, Wiederherstellungstests,
   Einstellungen überall in einem Zug lesen und speichern (wie seit D1 für Microsoft 365).
