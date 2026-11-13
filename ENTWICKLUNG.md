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

Letzte Aktualisierung: 13. November 2026 (Schritt F1)

## Aktueller Stand

Seit 13. November 2026 gilt Benedikts Dauerauftrag: JARVIS eigenständig fertigentwickeln, in der Reihenfolge
Sicherheit und Stabilität → Gehirn und Projektgedächtnis → Dashboard und Agentensteuerung → proaktive
Routinen und Agenten → Microsoft 365 (zuerst nur mit Testdaten) → Sprache, Desktop, Azure-Vorbereitung.
Grenzen: keine echten Firmendaten, keine Kosten, keine echten Mails/Termine, keine Änderung an echten
Zugangsdaten, kein Push/Merge ohne ausdrückliche Freigabe.

Die Sicherheitsarchitektur (Schritte 2.1 bis 2.6), das Projektgedächtnis (Schritt C1), die Tagesübersicht
„Heute“ (Schritt E1), die ersten proaktiven Routinen (Schritt G1: Projekte im Morgenbriefing,
Tagesabschluss), die Agentensteuerung (Schritt F1) und die ElevenLabs-Stimme mit Unterbrechen (Schritt H1,
Benedikts Wunsch vom 13. November) sind gebaut und in der Sandbox geprüft: 431 von 431 automatischen Tests
bestehen, 0 übersprungen, 0 bekannte Lücken als TODO (seit Schritt B2 auch die Post gegen ein nachgebautes
Postfach und der Kaufpfad des Spielgeld-Desks gegen einen nachgebauten Markt). Die ElevenLabs-Stimme ist nur gegen einen nachgebauten
Dienst geprüft, nie gegen das echte ElevenLabs; sie ist aus, bis Benedikt am Mac seinen Schlüssel einträgt.
Offen ist die Prüfung auf dem Mac ([Prüfliste](docs/pruefliste-mac.md)); bis dahin steht alles auf
„Testbereit“. Das Projektgedächtnis ist nur mit Testdaten geprüft. Benedikt hat am 13. November freigegeben,
dass seine eigenen, unkritischen Projektdaten hinein dürfen; sensible Firmen- und Kundendaten weiterhin nicht
(siehe „Offene Fragen“, Punkt 5).

## Gesamtfortschritt

| Bereich (Auftrag vom 13.11.) | Stand | Was fehlt bis „Abgeschlossen“ |
|---|---|---|
| A Sicherheitsarchitektur | **Testbereit** (Sandbox) | Prüfliste auf dem Mac; unveränderliches Audit-Log und Key Vault erst mit Azure |
| B Bestehende Funktionen stabilisieren | **Testbereit** für Telegram, Intel, Kalender, Dokumente, Gehirn, Desk (mit Kaufpfad), Mail (IMAP), Obsidian, Gedächtnis; **Offen** für Sprache und 3D-Oberfläche als automatische Tests | Oberflächentests im Browser; Mac-Prüfliste; zehn Befunde aus der Durchsicht vom 13.11. prüfen (siehe Schritt B2) |
| C Gehirn und Projektgedächtnis | **Testbereit** (Sandbox, Testdaten): Projektakten, Vorschläge mit Bestätigung und Korrektur, Vorbereitung vor Besprechungen, Speicherschicht für PostgreSQL vorbereitet | Mac-Prüfliste Teil E; Zuordnung von Mails; persönliches Gedächtnis einbinden; Freigabe für echte Projektdaten |
| E Geschäftsführungsdashboard | **Testbereit** für Tagesübersicht „Heute“, Projektübersicht und Agentenübersicht (13 Ansichten); **Offen** für Unternehmens- und Finanzübersicht | Mac-Prüfliste Teil F; Unternehmensübersicht (braucht Microsoft 365); Projekte in der 3D-Übersicht (Frage 7) |
| F Agenten | **Testbereit** für die zentrale Steuerung der fünf vorhandenen Agenten (Zustand, Läufe, Kosten, Grenzen, Start, Pause, Sperre); **Offen** für weitere Agenten und einen gemeinsamen Zeitplan | Mac-Prüfliste Teil H; Marktagent, Edelmetallagent, Newsletter und weitere; Kostenzählung für Gespräch und Browser (J) |
| G Proaktive Routinen | **Testbereit** für Morgenbriefing mit Projekten, Tagesabschluss und Projektüberwachung im Briefing (einstellbar, abschaltbar); **Offen** für Mail-Entwürfe, Marktüberwachung über Intel hinaus | Mac-Prüfliste Teil G; Meldung im Lauf des Tages, wenn etwas überfällig wird; Mail-Unterstützung |
| D Microsoft 365 | Offen | Graph-Anbindung zuerst gegen nachgebaute Schnittstellen; echte Anbindung **blockiert** bis Entra-Freigabe |
| H Sprache und Desktop | **Testbereit** (nur gegen Nachbau) für die ElevenLabs-Stimme und das Unterbrechen mit „Stopp“; vorhanden: Weckwort, Vorlesen mit der Mac-Stimme, Programme öffnen auf macOS | Mac-Prüfliste Teil I mit echtem Schlüssel; Desktop-Agent mit Regeln |
| I Azure | **Blockiert** (Entscheidung und Kostenfreigabe) | Vorbereitung: Speicher- und Modellschicht austauschbar, Anleitung |
| J Qualität | läuft mit | Modelladapter, Kostenübersicht, Wiederherstellungstests |

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
| Modelladapter | Anthropic fest in 4 Dateien | Claude primär, andere Modelle austauschbar | 4 | Offen |
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
| C4 Projektüberwachung (Überfälliges und nahe Fristen von selbst melden) | Testbereit im Morgenbriefing, im Tagesabschluss und in „Heute“ | Schritt G1; offen: Meldung im Lauf des Tages, offene Risiken |
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

## Bereich E – Geschäftsführungsdashboard

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| E1.1 Tageslage zusammenstellen: was auf dich wartet, Termine, Aufgaben, Post, Projekte. Ohne KI, nur aus Daten, die JARVIS schon hat; nichts verlässt dabei den Mac | Testbereit | `src/lib/heute.ts`, `test/regeln/heute.test.ts` |
| E1.2 Ansicht „Heute“ mit „Wartet auf dich“ (Not-Aus, Freigaben, Rückfragen des Desks, Intel-Warnung, Vorschläge fürs Projektgedächtnis, überfällige Aufgaben, dringende Projekte, wichtige Post, fertiges Dokument) und Karten für Termine, Aufgaben, Post, Projekte, Märkte und Nachrichten, Agenten | Testbereit | `src/components/views/TodayView.tsx`, `/heute`; im Browser geprüft |
| E1.3 Bei Terminen, in deren Titel ein Projekt vorkommt: Verweis auf die Akte | Testbereit | wie oben |
| E1.4 Zuruf: „Tagesübersicht“ oder „mein Tag“ öffnet „Heute“, „Projekte“ öffnet die Projekte | Testbereit | `src/lib/commands.ts` |
| E2 Projekte in der 3D-Übersicht (eigener Fels) | Offen | Die Übersicht hat zehn feste Plätze; ein elfter würde das Bild verschieben. Vorschlag: Projekte statt des Platzhalters „Telefon“ (Frage 7) |
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

## Bereich F – Agenten

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| F1.1 Eine Lage für alle Agenten (Gespräch, Browser, Analyst, Intel, Spielgeld-Desk): Zustand, Arbeitsweise, letzter und nächster Lauf, letztes Ergebnis, Fehler, Kosten von heute, feste Grenzen | Testbereit | `src/lib/agenten.ts`, `test/regeln/agenten.test.ts` |
| F1.2 Not-Aus und Sperre gehen jedem anderen Zustand vor; dann wird kein Start angeboten | Testbereit | wie oben, dazu `test/module/agenten.test.ts` gegen die echten Module |
| F1.3 Steuerung in der Ansicht „Agenten“: Intel von Hand starten (mit Kostenhinweis), Desk pausieren und fortsetzen, jeden Agenten sperren und entsperren; Karte „Agenten“ in „Heute“ | Testbereit | `src/components/AgentControl.tsx`; im Browser geprüft (`test/hand/agenten-rauch.ts`) |
| F1.4 Die Steuerung hat keine eigenen Rechte: `/api/agenten` liest nur; die Knöpfe gehen an Intel, Desk und Sicherheitszentrale mit deren Prüfungen | Testbereit | POST auf `/api/agenten` gibt 405 |
| F1.5 Werkzeug `agenten_lesen` für das KI-Gehirn (Klasse A): nur Zustände, Zeiten und Zahlen, kein Text aus dem Netz | Testbereit | Test mit eingeschleuster Anweisung im Lagebild |
| F1.6 Ein Start von Intel von Hand steht im Audit-Log | Testbereit (nur gelesen, kein eigener Test) | `src/app/api/intel/route.ts` |
| F2 Gemeinsamer Zeitplan für Agenten (heute hat nur Intel einen) | Offen | |
| F3 Weitere Agenten: Markt, Edelmetalle, Newsletter, Unternehmen und Technologie, Investoren, Compliance; mit Quellen, Zeitstempeln, Trennung von Fakt und Prognose | Offen | neue bezahlte Datenquellen brauchen Benedikts Freigabe |
| F4 Kosten je Agent auch für Gespräch und Browser zählen | Offen | kommt mit J (Kostenübersicht) |

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

## Bereich G – Proaktive Routinen

Alles hier entsteht ohne KI aus Daten, die JARVIS schon hat (`src/lib/routinen.ts`, aufbauend auf der Tageslage
von „Heute“). Zwei feste Regeln: Ein vertrauliches Projekt wird nie beim Namen genannt, weder über Telegram
noch im Gespräch am Mac (was JARVIS dort sagt, steht im Verlauf und ginge mit der nächsten Frage an das
KI-Gehirn). Über Telegram stehen Projektnamen und -inhalte nur, wenn der Schalter „Projekte beim Namen“ an ist.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| G1.1 Morgenbriefing mit Projekten: am Mac als Satz, über Telegram als Absatz (ohne Schalter nur Zahlen) | Testbereit | `projekteAbsatz`, `projektSatz`; `test/regeln/routinen.test.ts` |
| G1.2 Tagesabschluss: was erledigt ist, was heute offen blieb, Termine und Aufgaben von morgen, Projekte, was noch auf ein Ja wartet | Testbereit | `tagesabschluss`, `abschlussNachricht`, `abschlussSatz` |
| G1.3 Tagesabschluss per Telegram zur eingestellten Uhrzeit, einmal am Tag; **Voreinstellung: aus**. Auf Zuruf jederzeit: `/abschluss` oder „Feierabend“ in Telegram, „Tagesabschluss“ am Mac | Testbereit | `telegramMinute`, Einstellungen → Handy |
| G1.4 Projektüberwachung: Überfälliges und Fristen bis drei Tage voraus erscheinen von selbst im Briefing, im Abschluss und unter „Wartet auf dich“ | Testbereit | wie oben |
| G1.5 Abschaltbar: Briefing, Tagesabschluss, Erinnerungen, Projektnamen, Warnungen und Trades je mit eigenem Schalter | Testbereit | im Browser geprüft (`test/hand/routinen-rauch.ts`) |
| G2 Meldung im Lauf des Tages, sobald etwas überfällig wird oder eine Rückmeldung fehlt | Offen | braucht eine Regel gegen zu viele Meldungen |
| G3 Mail-Unterstützung: Antwortentwürfe vorbereiten | Offen | Entwürfe ja, Senden nur mit Freigabe |
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

## Phase 3 bis 10

| Phase | Zustand | Hinweis |
|---|---|---|
| 3 Azure-Infrastruktur | Blockiert | D&S-Abonnement, IT-Verantwortliche, freigegebene Dienste, Kosten klären |
| 4 Claude sicher integrieren | Offen | persönlicher API-Schlüssel; AVV, Aufbewahrung, ZDR klären (R-14) |
| 5 Microsoft 365 / Entra ID | Blockiert | braucht Phase 2 und einen Test-Tenant bzw. Testpostfach |
| 6 Projektgedächtnis | Testbereit (Schritt C1, Datei statt Datenbank) | siehe Bereich C |
| 7 Geschäftsführungsdashboard | Testbereit für „Heute“ und „Projekte“ (Schritt E1), Rest offen | siehe Bereich E |
| 8 Desktop Agent, Sprache | Blockiert | Windows oder Mac (R-15) |
| 9 Verkehr, Automatisierungen, Agenten | Offen | Trading bleibt Spielgeld |
| 10 Qualitätssicherung, Einführung | Offen | |

## Offene Fragen an Benedikt

1. [Prüfliste für den Mac](docs/pruefliste-mac.md) durchgehen (Teile A bis I). Benedikt hat sie am 13. November
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
7. 3D-Übersicht: Sollen die Projekte dort einen eigenen Felsen bekommen, an der Stelle des Platzhalters
   „Telefon“? Bis dahin erreichst du „Heute“ und „Projekte“ über die Leiste oben und per Zuruf.

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
   **Status: Offen**, der Umbau beginnt mit dem Skill `frontend-design`; alle Funktionen bleiben. An der
   Oberfläche ist noch nichts geändert.
3. **Befunde aus der Durchsicht vom 13.11.**: die zwei zum Schutz vertraulicher Projekte sind behoben
   (Schritt B3). Die übrigen acht (Liste in den Testergebnissen von Schritt B2) einzeln nachstellen, mit Test
   belegen, beheben.

Danach wie geplant:

4. **J Kostenübersicht und Modelladapter:** Kosten je Agent zählen (auch Gespräch und Browser), eine Stelle
   für die Modellwahl.
5. **F2/F3:** gemeinsamer Zeitplan, erster neuer Agent (Edelmetalle über die vorhandene Twelve-Data-Anbindung).
6. G2/G3: Meldung im Lauf des Tages mit Obergrenze, Antwortentwürfe für Mails (ohne Senden).
7. D Microsoft 365 nur gegen nachgebaute Schnittstellen.
