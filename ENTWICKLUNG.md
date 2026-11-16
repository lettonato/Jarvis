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
gebaut und in der Sandbox geprüft: 1190 von 1190 automatischen Tests bestehen, 0 übersprungen, 0 bekannte Lücken als TODO (seit Schritt B2 auch die Post gegen ein nachgebautes
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
Verzeichnis angelegt hat und Benedikt sich am Mac selbst anmeldet. Seit Schritt I1 ist der Umzug nach Azure
vorbereitet, soweit das ohne Azure geht: Das Projektgedächtnis kann in einer PostgreSQL-Datenbank liegen
(geprüft gegen ein echtes PostgreSQL 16 in der Sandbox, **nicht in Azure**), und die Verbindung zu Claude wird
an einer Stelle aufgebaut. In Azure ist nichts angelegt; es gibt keine Kosten. Seit Schritt H2.1 öffnet JARVIS
auf Zuruf Programme und Ordner am Mac aus einer festen Liste (nur öffnen, nichts bedienen); das ist **nur gegen
einen nachgebauten Mac geprüft**.
Offen ist die Prüfung auf dem Mac ([Prüfliste](docs/pruefliste-mac.md)); bis dahin steht alles auf
„Testbereit“. Seit Schritt C2 hat auch das persönliche Gedächtnis die Zusagen des Projektgedächtnisses: Zwei
Einträge zur selben Zeit überschreiben sich nicht, und eine beschädigte Datei wird nie stillschweigend ersetzt.
Das Projektgedächtnis ist nur mit Testdaten geprüft. Benedikt hat am 13. November freigegeben,
dass seine eigenen, unkritischen Projektdaten hinein dürfen; sensible Firmen- und Kundendaten weiterhin nicht
(siehe „Offene Fragen“, Punkt 5).

## Gesamtfortschritt

| Bereich (Auftrag vom 13.11.) | Stand | Was fehlt bis „Abgeschlossen“ |
|---|---|---|
| A Sicherheitsarchitektur | **Testbereit** (Sandbox) | Prüfliste auf dem Mac; unveränderliches Audit-Log und Key Vault erst mit Azure |
| B Bestehende Funktionen stabilisieren | **Testbereit** für Telegram, Intel, Kalender, Dokumente, Gehirn, Desk (mit Kaufpfad), Mail (IMAP), Obsidian, Gedächtnis und das Zuhören (Schritt J17, nur mit nachgebautem Mikrofon) | Oberflächentests im Browser; Mac-Prüfliste; zwei kleine Befunde aus den Durchsichten (siehe Schritt B5) |
| C Gehirn und Projektgedächtnis | **Testbereit** (Sandbox, Testdaten): Projektakten, Vorschläge mit Bestätigung und Korrektur, Vorbereitung vor Besprechungen; Speicher wahlweise Datei oder PostgreSQL (Schritt I1); das persönliche Gedächtnis mit denselben Zusagen wie das Projektgedächtnis (Schritt C2) | Mac-Prüfliste Teile E und Q; Zuordnung von Mails; persönliches Gedächtnis in die Datenbank (erst mit Anmeldung je Person); Freigabe für echte Projektdaten |
| E Geschäftsführungsdashboard | **Testbereit** für Tagesübersicht „Heute“, Projektübersicht, Agentenübersicht und die neue Oberfläche „Glashaus“ (zwölf Räume); **Offen** für Unternehmens- und Finanzübersicht | Mac-Prüfliste Teile F und J; Unternehmensübersicht (braucht Microsoft 365) |
| F Agenten | **Testbereit** für die zentrale Steuerung der sechs Agenten (Zustand, Läufe, Kosten, Grenzen, Start, Pause, Sperre), den gemeinsamen Zeitplan und den Edelmetall-Agenten (nur gegen Nachbau); **Offen** für weitere Agenten | Mac-Prüfliste Teile H und K; Marktagent, Newsletter und weitere |
| G Proaktive Routinen | **Testbereit** für Morgenbriefing mit Projekten, Tagesabschluss, Projektüberwachung, Hinweise am Tag aufs Handy und als Mitteilung am Mac (einstellbar, abschaltbar) und Antwortentwürfe für Mails ohne Versand; **Offen** für Marktüberwachung über Intel hinaus | Mac-Prüfliste Teile G, L, M und P; Entwurf im Ordner „Entwürfe“ des Postfachs (Frage 13) |
| D Microsoft 365 | **Testbereit** (nur gegen Nachbau) für Termine aus Outlook lesen (Schritt D1); **Blockiert** für die echte Anbindung, bis eure IT die Anwendung in Entra angelegt hat; **Offen** für Mail, Dateien, Teams | App-Registrierung durch die IT (Frage 14), Mac-Prüfliste Teil N; weitere Teile nur nach Benedikts Entscheidung |
| H Sprache und Desktop | **Testbereit** (nur gegen Nachbau) für die ElevenLabs-Stimme, das Unterbrechen mit „Stopp“ und, seit Schritt H2.1, das Öffnen von Programmen und Ordnern aus einer festen Liste; vorhanden: Weckwort, Vorlesen mit der Mac-Stimme | Mac-Prüfliste Teil I mit echtem Schlüssel und Teil AB; weitere Teile eines Desktop-Agenten (H2.2) |
| I Azure | **Testbereit** für die Vorbereitung (Schritt I1): Projektgedächtnis in PostgreSQL, Claude-Zugang an einer Stelle, Anleitung; **Blockiert** für alles in Azure selbst (Entscheidung und Kostenfreigabe) | Abonnement, IT-Kontakt, Region, Budget (Frage 3); davor Anmeldung je Person und die übrigen Daten auf die Datenbank umstellen |
| J Qualität | **Testbereit** für das Kostenbuch (Kosten je Agent, heute und im Monat) und die Modellwahl an einer Stelle (Schritt J1); **Testbereit** für das Zurückspielen der Sicherung (Schritt J2) und das Speichern der Einstellungen in einem Zug (Schritt J3); **Offen** für einen zweiten Zugang zu Claude (die Stelle dafür gibt es seit I1) | Mac-Prüfliste H7 und H8 (Zahlen mit der Abrechnung bei Anthropic vergleichen) |

## Wiederaufnahmepunkt

Für jede Fortsetzung, auch nach einer Unterbrechung:

* **Letzter gesicherter Stand:** siehe Abschnitt „Sicherung“ am Ende dieser Datei (Commit und Dateien).
* **Arbeitsort:** Cloud-Sandbox, nicht dauerhaft. Dauerhaft sind nur die Sicherungen in den Projektdateien
  (`jarvis/sicherung/`): ein Git-Bündel des Arbeitszweigs, ein Bündel aller Zweige, ein ZIP zum Entpacken.
  Wiederherstellen: `git clone jarvis-aktuell.bundle -b claude/project-thread-200bzy`, dann `npm ci`,
  `npm run pruefen`. Ob sich die Sicherung wirklich zurückspielen lässt, prüft
  `bash scripts/wiederherstellen-pruefen.sh <Ordner>` (Schritt J2), ohne sie zu verändern.
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
| Security Gateway (alle Werkzeuge, Klassen A–D, Deny by Default) | alle Werkzeuge laufen durch `gateway/` (die Richtlinientabelle hat seit Schritt H2.1 40 Einträge, davon 7 für den Browser), Websuche und Webseiten werden protokolliert, Herkunftsmarkierung, Freigaben per Knopf | jede Aktion geprüft, protokolliert, freigegeben | 2 | Testbereit (Sandbox geprüft, Mac offen) |
| Zentraler Not-Aus und Agentensperre | ein Schalter für Gespräch, Browser, Analyst, Intel, Desk; lösen nur am Mac mit „FREIGEBEN“ | ein Schalter für alles, nur Mensch löst | 2 | Testbereit (Sandbox geprüft, Mac offen) |
| Audit-Log und Alarmierung | `audit.jsonl` mit SHA-256-Kette, Schwärzung, Alarm per Telegram/Mac | manipulationssicher, Azure Monitor | 2/3 | Testbereit (lokal); unveränderliche Ablage Offen (Phase 3) |
| Geheimnisverwaltung | wahlweise Klartext `~/.jarvis/config.json` oder macOS-Schlüsselbund (Umzug per Knopf am Mac) | Key Vault, Managed Identity, getrennt Test/Prod | 2/3 | Schlüsselbund Testbereit (Sandbox geprüft, Mac offen); Key Vault Offen (Phase 3) |
| Anmeldung | keine, nur localhost | Entra ID mit MFA, eigene Identität je Nutzer | 5 | Offen |
| Betrieb in Azure | lokaler Next-Server; vorbereitet: Projektgedächtnis in PostgreSQL, Anleitung (Schritt I1) | Container Apps, Test- und Prod-Umgebung, IaC | 3 | Blockiert (Azure-Abo/IT klären) |
| Modelladapter | Modell und Preise je Rolle an einer Stelle (`src/lib/modelle.ts`); die Aufrufe selbst sind weiter Anthropic-Aufrufe in 4 Dateien | Claude primär, andere Modelle austauschbar | 4 | Modellwahl an einer Stelle Testbereit (Schritt J1); anderer Anbieter Offen |
| **Zentrales Gedächtnis** | | | | |
| Persönliches Gedächtnis | `gedaechtnis.json`, jeder Eintrag erst nach Ja per Knopf; Änderungen eine nach der anderen, eine beschädigte Datei wird nie ersetzt (Schritt C2) | Teil des Projektgedächtnisses, mit Bestätigung | 2/6 | Testbereit (Bestätigung, sichere Ablage in der Datei); Ablage in der Datenbank Offen (braucht die Anmeldung je Person) |
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
| KI-Gehirn mit Werkzeugen | 31 Werkzeuge + Websuche, alle über das Gateway | über Gateway, Datenminimierung | 2/4 | Testbereit |
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
| Programme und Dateien öffnen | Kalender-App, Obsidian, eigene PDFs (macOS); seit Schritt H2.1 auf Zuruf 19 Programme, 4 Ordner und bis zu 12 eigene Programme aus einer festen Liste (nur öffnen) | Desktop Agent mit freigegebenen Aktionen | 8 | Testbereit (nur gegen einen nachgebauten Mac) |
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
| Sprache (Weckwort, Zuhören, „Stopp“) | Regeln ja; der Ablauf per Handprüfung mit einem **nachgebauten Mikrofon** (seit Schritt J17) | Testbereit | `zuhoeren.test.ts` (20), `test/hand/zuhoeren-rauch.ts`; ein echtes Mikrofon nur über die Mac-Prüfliste (Teil AA) |
| 3D-Oberfläche (frühere Landschaft) | **nein** | Offen | wird seit „Glashaus“ nicht mehr gezeigt (Frage 7) |

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
| C2.1 Persönliches Gedächtnis mit denselben Zusagen wie das Projektgedächtnis: Änderungen eine nach der anderen, eine beschädigte Datei wird nie ersetzt, ein gescheitertes Speichern wird gemeldet und ändert nichts | Testbereit | Schritt C2 unten; `src/lib/server/memory.ts`, `test/module/gedaechtnis.test.ts` (27) |
| C2.2 Ausweg aus einer beschädigten Datei über die Einstellungen: beiseitelegen, Lesbares behalten, nichts löschen | Testbereit | im Browser durchgeklickt (`test/hand/gedaechtnis-rauch.ts`) |
| C2.3 Das Gespräch läuft mit beschädigtem Gedächtnis weiter und weiß davon | Testbereit | `brain.ts`; derselbe Test |
| C2.4 Persönliches Gedächtnis in der Datenbank (dieselbe Speicherschnittstelle wie die Projekte) | **Offen, bewusst nicht gebaut** | Dieses Gedächtnis gehört zu einer Person. In einer gemeinsamen Datenbank braucht es erst die Anmeldung je Person (Schritt I2), sonst läse jeder das Gedächtnis des anderen |
| C3 Mails und Besprechungsnotizen von selbst Projekten zuordnen und Vorschläge machen | Offen | braucht die Freigabe, Mailinhalte dafür auszuwerten |
| C4 Projektüberwachung (Überfälliges und nahe Fristen von selbst melden) | Testbereit im Morgenbriefing, im Tagesabschluss, in „Heute“ und als Hinweis am Tag | Schritte G1 und G2 |
| C4.2 Offene Risiken in der Projektüberwachung: Risiken mit Frist zählen wie Fristen, lange unveränderte Risiken kommen montags zur Sprache | Testbereit in „Heute“, im Morgenbriefing, im Tagesabschluss, in „Projekte“ und im Gespräch; die Hinweise am Tag bleiben bewusst bei Aufgaben | Schritt C4.2 unten; `karteVon`, `risikoUnveraendert`, `projektHinweis`; im Browser geprüft (`test/hand/risiken-rauch.ts`) |
| C5 PostgreSQL-Umsetzung der Speicherschnittstelle | Testbereit (gegen PostgreSQL 16 in der Sandbox, nicht in Azure) | Schritt I1 in Bereich I; `pg-speicher.ts`, `test/hand/postgres-rauch.ts` |

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

### Schritt C2: das persönliche Gedächtnis sicher ablegen (14. November 2026)

**Warum:** Das persönliche Gedächtnis (was JARVIS sich über dich merkt, `~/.jarvis/gedaechtnis.json`) war älter
als das Projektgedächtnis und hatte dessen Schutz nicht. Drei Fehler, alle zuerst mit einem Test nachgestellt:
(1) Merkt sich JARVIS zwei Dinge im selben Augenblick (das KI-Gehirn ruft Werkzeuge auch nebeneinander auf),
blieb nur eines übrig. (2) Eine beschädigte Datei (halb geschrieben, von Hand verändert) galt stillschweigend
als leer; beim nächsten Merken war alles Frühere überschrieben. (3) Scheiterte das Speichern, erfuhr es niemand,
und bis zum nächsten Neustart tat JARVIS so, als wüsste er es.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| C2.1a Jede Änderung liest, ändert und speichert in einem Zug, eine nach der anderen | Testbereit | zwanzig Änderungen durcheinander, keine geht verloren |
| C2.1b Eine beschädigte Datei bleibt Byte für Byte liegen. Als beschädigt gilt: kein lesbares JSON, falscher Aufbau, oder auch nur ein Eintrag in fremder Form (er fiele sonst beim nächsten Speichern still weg). Merken, Ändern und Vergessen werden so lange mit einem festen Satz abgelehnt | Testbereit | sieben beschädigte Inhalte |
| C2.1c Geschrieben wird über eine Nebendatei, nur für dich lesbar. Scheitert es, kommt ein fester Satz, und es ist nichts geändert, auch nicht im laufenden JARVIS | Testbereit | |
| C2.1d Eine Datei, die sich nicht öffnen lässt (Rechte), gilt nicht als leer und wird nicht weggeräumt | Testbereit | |
| C2.2 Einstellungen → Gedächtnis sagt, dass die Datei beschädigt ist, welche es ist und wie viele Einträge sich noch lesen lassen (nur die Zahl). Ein Knopf legt sie unter neuem Namen daneben (`gedaechtnis.json.beschaedigt-…`) und macht mit den lesbaren Einträgen weiter. Gelöscht wird nie | Testbereit | `legeBeiseite`, `/api/gedaechtnis` (`beiseite`) |
| C2.3 Das Gespräch antwortet weiter. Das Modell erfährt nur, dass das Gedächtnis gerade nicht lesbar ist, und verweist auf die Einstellungen | Testbereit | `memoryBlock(null)` |
| C2.5 Die Datei behält ihren Aufbau; eine Datei von früher wird gelesen, wie sie ist | Testbereit | kein Umzug nötig |

**Eigene Entscheidungen:** (1) „In dieselbe Speicherschicht“ heißt hier: dieselben Zusagen, nicht dieselbe
Datenbank. Eine Fassung für PostgreSQL gibt es bewusst nicht (C2.4). (2) Die Fehlersätze nennen weder den Inhalt
noch den Ort der Datei, weil sie als Ergebnis eines Werkzeugs auch ans Modell gehen (im Pfad steht der
Benutzername). Den Ort zeigt nur die Seite. (3) Aus einer beschädigten Datei gilt nichts, bis du sie
beiseitelegst; erst dann übernimmt JARVIS die lesbaren Einträge. (4) „Alles vergessen“ auf einer beschädigten
Datei legt sie ebenfalls beiseite, behält aber nichts.

**Grenzen:** Geschützt ist ein laufender JARVIS gegen sich selbst. Wer die Datei von Hand ändert, während
JARVIS läuft, sieht das erst nach einem Neustart, und die nächste Änderung von JARVIS überschreibt die
Handänderung. Zwei gleichzeitig laufende JARVIS können sich weiter überschreiben (wie bei den Einstellungen,
Schritt J3). Die Datei ist nicht verschlüsselt.

### Testergebnisse Schritt C2 (14. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **848 Tests: 848 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 27: `gedaechtnis.test.ts`) |
| Tests zuerst | Die drei Fehler oben und alle Befunde der Durchsicht wurden zuerst als Test geschrieben und liefen rot. Der Wettlauf „Lesen überholt eine Änderung“ ist mit einem angehaltenen Lesen nachgestellt: Ohne die Korrektur fehlte danach ein Eintrag |
| Gegenproben | Erste Runde vor der Durchsicht: 26 absichtlich eingebaute Fehler, 26 bemerkt. Zweite Runde für die Stellen, die nach der Durchsicht neu sind: 23 absichtlich eingebaute Fehler, 23 bemerkt (unter anderem: überholtes Lesen bringt den alten Stand zurück, beschädigte Datei wird verschoben statt kopiert, Kopie bleibt nach gescheitertem Speichern liegen, heiles oder nicht lesbares Gedächtnis wird beiseitegelegt, Beiseitelegen behält nichts oder zu viel, eine früher beiseitegelegte Datei wird überschrieben, Fehlersatz nennt den Ort der Datei) |
| `npx next build` | erfolgreich, mit den vier bekannten Warnungen |
| Handprüfung `gedaechtnis-rauch` (Chromium, gebauter Server, nachgebauter Claude) | alle Schritte in Ordnung: zwanzig Einträge im selben Augenblick aus der Seite, alle zwanzig in der Datei; Eintrag anlegen und vergessen über die Seite; Datei von außen beschädigt und JARVIS neu gestartet: Die Seite sagt es, nennt die Datei und zeigt nichts von ihrem Inhalt; Merken und Vergessen abgelehnt, Datei unverändert; das Gespräch antwortet, das Modell bekommt nichts aus der Datei; Beiseitelegen über den Knopf: alte Datei liegt Byte für Byte daneben; teils lesbare Datei: Die Seite nennt „2 Einträge“, danach sind genau die zwei da; nach einem Neustart noch alles da; keine Fehler in der Seite |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | neun Befunde. Eingearbeitet: Ein Lesen kurz nach dem Start konnte eine gleichzeitige Änderung überholen und den alten Stand zurückbringen (ein Eintrag wäre verloren gegangen); der Knopf zum Beiseitelegen erschien auch bei einer nicht lesbaren Datei, wo er nichts tun kann; ein einzelner kaputter Eintrag hätte alle guten unbrauchbar gemacht (jetzt bleiben die lesbaren beim Beiseitelegen erhalten); scheiterte das Schreiben beim Beiseitelegen, war die Datei schon verschoben, obwohl der Satz „nichts geändert“ sagte (jetzt erst kopieren, dann schreiben); der Satz nannte einen Knopf, den es in dem Zustand nicht gab, und den Pfad der Datei; die Seite verlor den Hinweis „beschädigt“ nach einer Antwort; eine unlesbare Zeit in einem Eintrag ließ die Einstellungen abstürzen; Störungen der Ablage antworten jetzt mit 500 statt 400. Bewusst nicht geändert: Die Ablage ist wie bei Entwürfen, Hinweisen und Zeitplan je Modul eigens gebaut; ein gemeinsamer Baustein dafür wäre ein eigener Umbau |
| Sicherheitsprüfung (von Hand) | Kein neuer Weg nach außen. Was in einer beschädigten Datei steht, erscheint weder auf der Seite noch im Fehlersatz noch beim Modell (geprüft mit einem Kennwort in der Datei). Die beiseitegelegte Datei ist nur für dich lesbar. Spitze Klammern, Steuerzeichen und halbe Zeichenpaare kommen weiter nicht ins Gedächtnis (kein Ausbruch aus dem Gedächtnis-Block im Prompt) |
| Nicht geprüft | echter Mac und Safari; ein echtes Claude-Modell (ob es bei beschädigtem Gedächtnis sinnvoll auf die Einstellungen verweist); eine volle Platte (das Scheitern ist mit einer blockierten Nebendatei nachgestellt); zwei gleichzeitig laufende JARVIS |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen; eines weniger (verlorene oder
still überschriebene Einträge im Gedächtnis). **Neue laufende Kosten:** keine.

### Schritt C4.2: offene Risiken in der Projektüberwachung (14. und 15. November 2026)

**Warum:** Die Projektüberwachung kannte nur Aufgaben. Ein Risiko stand als Zahl auf der Kachel und in der
Vorbereitung auf eine Besprechung, sonst nirgends: Lief die Frist eines Risikos ab oder blieb es wochenlang
liegen, sagte JARVIS nichts. Am Risiko selbst ändert sich nichts; es hat wie bisher einen Text, wahlweise einen
Zuständigen und eine Frist, und es lässt sich abhaken.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| C4.2a Ein offenes Risiko mit Frist zählt wie eine Frist: über der Frist oder heute fällig ist dringend („Wartet auf dich“), bis in drei Tagen fällt es auf | Testbereit | `projektHinweis` in `src/lib/heute.ts` |
| C4.2b Ein Projekt hat weiter einen Grund. Überfällige Aufgaben stehen vorn; ist daneben ein Risiko über der Frist oder heute fällig (oder umgekehrt heute eine Aufgabe), steht es als Nachsatz dabei, damit Dringendes nie unter den Tisch fällt | Testbereit | „…; außerdem ist ein Risiko über der Frist“ |
| C4.2c Ein offenes Risiko ohne Frist, das seit 14 Tagen niemand angefasst hat (bestätigt oder zuletzt korrigiert), kommt einmal in der Woche zur Sprache, am Montag: in „Heute“ und im Morgenbriefing, nie als dringend. Hat das Projekt schon einen anderen Grund, steht es als Nachsatz dabei | Testbereit | `RISIKO_REGELN`, `risikoUnveraendert` |
| C4.2d Der Tagesabschluss nennt Risiken über der Frist und die Frist von morgen; je Projekt eine Zeile | Testbereit | `tagesabschluss` |
| C4.2e „Projekte“ zeigt es jeden Tag: rote Marke „Risiko über der Frist“ auf der Kachel, das Risiko mit der nächsten Frist, „seit … Tagen unverändert“ auf der Kachel und am Eintrag in der Akte, eine Zeile „Risiken über der Frist“ in der Scheibe „Auf einen Blick“; Projekte mit Risiken über der Frist stehen in der Übersicht vorn | Testbereit | `ProjectsView.tsx` |
| C4.2f Das Gespräch weiß dasselbe wie die Kachel (`projekte_lesen`: wie viele Risiken über der Frist, nächste Frist, lange unveränderte) | Testbereit, nur gegen nachgebauten Claude | `projektZeile` |
| C4.2g Für jeden dieser Texte gelten die Regeln der Routinen weiter: Vertrauliche Projekte nie beim Namen, über Telegram Namen und Inhalte nur mit dem Schalter. Stammt der Text eines Risikos von Dritten (aus einer Mail), gilt ein Gespräch, in dem er vorkommt, als fremd beeinflusst | Testbereit | `routinen.test.ts`, `herkunft.test.ts` |

**Eigene Entscheidungen (Benedikt hat sie noch nicht gesehen):** (1) 14 Tage und Montag sind von mir gewählt
und stehen an einer Stelle (`RISIKO_REGELN`). (2) „Angefasst“ heißt: bestätigt oder irgendwie korrigiert. Auch
eine kleine Korrektur stellt die Uhr zurück. (3) Die Hinweise am Tag (Handy und Mitteilung am Mac) bleiben bei
Aufgaben; ein Risiko über der Frist meldet sich im Morgenbriefing, im Tagesabschluss und in „Heute“, aber nicht
zwischendurch. Grund: höchstens drei Hinweise am Tag, und die sollen für Aufgaben bleiben. (4) Haben eine
Aufgabe und ein Risiko dieselbe Frist in den nächsten Tagen, steht nur die Aufgabe da; das Risiko kommt am Tag
selbst dazu.

**Grenzen:** Die Erinnerung am Montag hat kein Gedächtnis. Läuft JARVIS am Montag nicht (Mac aus, Feiertag),
entfällt sie in dieser Woche; auf der Kachel und in der Akte steht das Alter jeden Tag. JARVIS bewertet kein
Risiko (wie wahrscheinlich, wie teuer); er zählt nur Fristen und Tage.

### Testergebnisse Schritt C4.2 (14. und 15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **900 Tests: 900 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 30: Regeln der Karte 10 in `projekt-risiken.test.ts`, „Heute“ 10, Briefing und Tagesabschluss 4, Herkunft 1, Projektgedächtnis mit Speicher und nachgebautem Claude 5) |
| Tests zuerst | Alle Regeln und alle Befunde der Durchsicht standen zuerst als Test da und liefen rot (erste Runde: 23 rote Tests, nach der Durchsicht noch einmal 5) |
| Gegenproben | Erste Runde: 45 absichtlich eingebaute Fehler, 44 bemerkt. Der eine nicht bemerkte war kein Fehler, sondern eine überflüssige Bedingung im Code; sie ist entfernt. Zweite Runde für die Stellen, die nach der Durchsicht neu sind: 13 eingebaute Fehler, 13 bemerkt. Darunter: Schwelle 13 oder 15 statt 14 Tage, Dienstag statt Montag, erledigte oder zurückgezogene Risiken zählen mit, Korrektur stellt die Uhr nicht zurück, heute fällig gilt schon als über der Frist, Risiko fällt hinter einer überfälligen Aufgabe weg, altes Risiko jeden Tag oder dringend, pausierte Projekte melden sich, Projekt doppelt im Tagesabschluss, Risikotext aus einer Mail macht das Gespräch nicht fremd, altes Risiko verliert „vertraulich“ |
| `npx next build` | erfolgreich, mit den vier bekannten Warnungen |
| Handprüfung `risiken-rauch` (Chromium, gebauter Server, an einem Sonntag) | alle Schritte in Ordnung, zweimal hintereinander: „Heute“ zeigt das Risiko über der Frist unter „Wartet auf dich“ und bei der Messe die Aufgabe von heute mit dem Nachsatz zum Risiko; das pausierte Projekt meldet nichts; das 20 Tage alte Risiko steht nicht in „Heute“ (kein Montag), aber auf der Kachel und in der Akte; Korrigieren nimmt den Zusatz „unverändert“ weg; Abhaken nimmt die rote Marke weg, und „Heute“ meldet das Risiko nicht mehr; keine Fehler in der Seite |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde. Eingearbeitet: Im Tagesabschluss konnte ein Projekt zweimal stehen (einmal mit Dringendem, einmal mit dem Risiko von morgen); ein lange unverändertes Risiko wäre in einem Projekt, das ständig einen anderen Anlass hat, nie zur Sprache gekommen (jetzt montags als Nachsatz); die Übersicht sortierte Projekte mit Risiken über der Frist nicht nach vorn, und „Auf einen Blick“ zählte sie nicht; das Gespräch bekam die lange unveränderten Risiken nicht, obwohl die Kachel sie zeigt; die Tage wurden an zwei Stellen gerechnet (jetzt nur in `dates.ts`). Bewusst nicht geändert, siehe „Eigene Entscheidungen“ und „Grenzen“: Hinweise am Tag bleiben bei Aufgaben; bei gleicher Frist in den nächsten Tagen steht nur die Aufgabe da; die Erinnerung am Montag holt nichts nach; jede Korrektur stellt die Uhr zurück. Ebenfalls nicht geändert: Aufgaben und Risiken in eine gemeinsame Liste von Fristen umzubauen wäre ein eigener Umbau |
| Sicherheitsprüfung (von Hand) | Kein neuer Weg nach außen. Der Text eines Risikos aus einem vertraulichen Projekt steht weder im Briefing noch im Tagesabschluss noch im gesprochenen Satz, und das Modell bekommt vertrauliche Projekte weiter gar nicht (Tests). Über Telegram stehen Risiken ohne den Schalter nur als Zahl da. Stammt ein Risikotext aus einer Mail, gilt das Gespräch als fremd beeinflusst, sobald er auf der Kachel steht oder in einem Satz von JARVIS vorkommt |
| Dabei bemerkt | Die Handprüfung prüfte beim ersten Lauf zu früh (der neue Text stand erst im Eingabefeld); die Prüfung wartet jetzt, bis das Formular zu ist. Am Programm war nichts falsch. Zwei neue Tests hingen zunächst am echten Datum; sie rechnen jetzt von heute aus oder mit Fristen weit weg |
| Nicht geprüft | echter Mac und Safari; ein echtes Claude-Modell (ob es von sich aus über Risiken spricht); der Montag im Browser (die Regel ist mit gestelltem Datum geprüft, die Handprüfung lief an einem Sonntag); das Morgenbriefing mit Risiken über echtes Telegram |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

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
(4) Seit Schritt J3 werden auch alle anderen Abschnitte der Einstellungen in einem Zug gelesen, geändert und
gespeichert; zwei Änderungen im selben Augenblick überschreiben sich nicht mehr.

## Bereich E – Geschäftsführungsdashboard

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| E1.1 Tageslage zusammenstellen: was auf dich wartet, Termine, Aufgaben, Post, Projekte. Ohne KI, nur aus Daten, die JARVIS schon hat; nichts verlässt dabei den Mac | Testbereit | `src/lib/heute.ts`, `test/regeln/heute.test.ts` |
| E1.2 Ansicht „Heute“ mit „Wartet auf dich“ (Not-Aus, Freigaben, Rückfragen des Desks, Intel-Warnung, Vorschläge fürs Projektgedächtnis, überfällige Aufgaben, dringende Projekte, wichtige Post, fertiges Dokument) und Karten für Termine, Aufgaben, Post, Projekte, Märkte und Nachrichten, Agenten | Testbereit | `src/components/views/TodayView.tsx`, `/heute`; im Browser geprüft |
| E1.3 Bei Terminen, in deren Titel ein Projekt vorkommt: Verweis auf die Akte | Testbereit | wie oben |
| E1.4 Zuruf: „Tagesübersicht“ oder „mein Tag“ öffnet „Heute“, „Projekte“ öffnet die Projekte | Testbereit | `src/lib/commands.ts` |
| E2 Neue Oberfläche „Glashaus“: jeder Bereich ein heller Raum mit Fensterfront, Kamerafahrt beim Wechsel, Leiste unten mit allen Räumen und dem Feld für JARVIS | Testbereit | Schritt E2 unten. Die frühere 3D-Übersicht mit den Felsen wird nicht mehr gezeigt; die Projekte haben jetzt wie alles andere ihren eigenen Raum |
| E3 Unternehmensübersicht (Teams, Dateien, Planner) | Blockiert | braucht Microsoft 365 (Bereich D) |
| E4.1 Marktlage: Krypto, Edelmetalle und Spielgeld-Desk auf einen Blick, mit dem, was auffällt; ohne KI und ohne neue Datenquellen | Testbereit; Kryptokurse in der Sandbox nur als Beispieldaten, die Gruppe des Desks nicht im Browser | Schritt E4.1 unten; `src/lib/marktlage.ts`, `src/components/Marktlage.tsx`; im Browser geprüft (`test/hand/marktlage-rauch.ts`) |
| E4.2 Finanzübersicht des Unternehmens (Umsatz, offene Posten, Liquidität) | Offen | braucht echte Firmendaten und eine Quelle dafür (Buchhaltung); nur nach Benedikts Freigabe |
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

### Schritt E4.1: Marktlage auf einen Blick (15. November 2026)

**Warum:** Krypto stand im Raum Trading, Gold und Silber standen im Raum Intel, das Spielgeld-Konto am Desk.
Wer wissen wollte, ob sich irgendwo etwas Größeres bewegt hat, musste drei Räume ansehen. Die Marktlage stellt
das an einer Stelle zusammen und sagt zuerst, was auffällt. Sie fragt nichts Neues ab und rechnet mit keinem
KI-Modell: Sie liest nur, was die anderen Räume ohnehin laden.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| E4.1a Regeln an einer Stelle: Krypto fällt ab 5 % in 24 Stunden auf, Gold und Silber ab 2 % zum Vortag oder am Hoch oder Tief der letzten 21 Handelstage (höchstens 1 % entfernt), das Spielgeld-Konto ab 3 % Minus am Tag oder wenn der Desk pausiert, am Tageslimit oder im Not-Aus ist | Testbereit | `MARKT_REGELN`, `marktlage` in `src/lib/marktlage.ts` |
| E4.1b Nichts wird geschätzt. Beispielkurse und veraltete Kurse heißen so und gelten nie als Bewegung; scheitert der Abruf der Edelmetalle oder fehlt ein Metall, steht das da, ohne den Wortlaut der Störung | Testbereit | Liste „Auffällig“, graue Punkte für Lücken in den Daten |
| E4.1c Raum Intel: oben das Feld „Marktlage“ mit dem Auffälligen und den drei Gruppen Krypto, Edelmetalle, Spielgeld-Desk; jede Zeile führt in den Raum, in dem die Einzelheiten stehen | Testbereit | `Marktlage.tsx`; Krypto und Edelmetalle im Browser geprüft, die Gruppe des Desks nur über die Regeln |
| E4.1d „Heute“: Die Scheibe „Märkte“ zeigt zusätzlich Gold und Silber und einen Satz „Auffällig: …“; veraltete Edelmetallkurse heißen auch dort so | Testbereit | `TodayView.tsx` |
| E4.1e Zuruf „Marktübersicht“, „Marktlage“, „Marktüberblick“, „Finanzübersicht“ oder „Wie stehen die Märkte?“: JARVIS antwortet ohne KI in zwei, drei Sätzen und öffnet den Raum Intel. Die Warnung von Intel steht vorn und wörtlich; Beispieldaten und veraltete Kurse heißen gleich am Anfang ihres Satzes so | Testbereit | `marktSatz`, Regel in `src/lib/commands.ts` |
| E4.1f Der Desk heißt überall „Spielgeld“. Die Warnung von Intel ist Text von Dritten: Kommt sie in einer Antwort vor, gilt das Gespräch als fremd beeinflusst | Testbereit | `marktlage.test.ts`, `src/lib/herkunft.ts` |

**Eigene Entscheidungen (Benedikt hat sie noch nicht gesehen):** (1) Die Schwellen 5 %, 2 %, 1 % und 3 % sind
von mir gewählt und stehen an einer Stelle (`MARKT_REGELN`). (2) Die Marktlage steht im Raum Intel, nicht in
einem eigenen Raum; die Leiste unten ist schon voll. (3) „Heute“ zeigt nur Bewegungen und Marken; Lücken in den
Daten stehen im Raum Intel, damit „Heute“ ruhig bleibt. (4) Der Zuruf antwortet mit Regeln, nicht mit Claude,
auch wenn das KI-Gehirn an ist (bei bis zu vier Wörtern wie bei allen Regeln; ein ganzer Satz geht an Claude).
(5) Die Marktlage schickt nichts über Telegram und meldet sich nicht von selbst; das wäre der nächste Schritt
(G4). (6) Die Seite fragt den Stand der Edelmetalle jetzt in jedem Raum ab, aber nur alle fünf Minuten und nur
bei JARVIS selbst; der Kursdienst wird dadurch nicht öfter gefragt (im Browser geprüft).

**Grenzen:** Die Übersicht kennt nur, was JARVIS schon hat: Bitcoin, Ethereum, Solana, Gold, Silber und das
Spielgeld-Konto. Aktien, Zinsen, Währungen und Zahlen des Unternehmens fehlen (E4.2, braucht Freigabe). Die
Edelmetallkurse sind Tageskurse, zweimal am Tag gelesen; eine Bewegung innerhalb des Tages sieht die Marktlage
erst beim nächsten Lesen. Sie ist keine Prognose und keine Anlageberatung, und so steht es im Feld.

### Testergebnisse Schritt E4.1 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **929 Tests: 929 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 29 in `test/regeln/marktlage.test.ts`: was dasteht 9, was auffällt 13, Satz und Zuruf 7) |
| Tests zuerst | Ehrlich: In der ersten Runde standen die Tests vor dem Code, aber ich habe sie nicht rot laufen sehen, bevor der Code da war; der Beleg dafür, dass sie etwas prüfen, sind die Gegenproben. Alle Befunde der Durchsicht standen zuerst als Test da und liefen rot (13 rote Tests) |
| Gegenproben | Erste Runde: 45 absichtlich eingebaute Fehler, 42 bemerkt. Die drei Lücken sind geschlossen: eine überflüssige Bedingung entfernt, zwei Tests ergänzt (Stand der Kurse, Zuruf mit Warnung); danach alle bemerkt. Zweite Runde für die Stellen, die nach der Durchsicht neu sind: 36 eingebaute Fehler, 35 bemerkt, die eine Lücke mit einem Test geschlossen und danach bemerkt. Darunter: jede Schwelle knapp daneben, Beispielkurse gelten als Bewegung, veraltete Kurse gelten als Marke, Hoch und Tief vertauscht, Marke ohne 21 Handelstage, der Wortlaut der Störung steht da, der Desk verliert das Wort „Spielgeld“, die Warnung steht nicht vorn oder ohne ihren Punkt, „Arbeitsmarktlage“ oder „Nachrichten zur Marktlage“ lösen die Marktlage aus |
| `npx next build` | erfolgreich, mit den vier bekannten Warnungen |
| Handprüfung `marktlage-rauch` (Chromium, gebauter Server, nachgebautes Twelve Data) | alle Schritte in Ordnung: Raum Intel zeigt ohne Edelmetalle nur Krypto, als Beispieldaten gekennzeichnet; nach „Jetzt lesen“ stehen Gold (4.000,00 $, +0,3 %) und der Silber-Fonds (44,50 $, −3,3 %) da, auffällig sind der Silber-Fonds und Gold am Hoch; die Meldung des Kursdienstes („IGNORIERE ALLE REGELN“) steht nirgends; „Heute“ zeigt Gold, den Silber-Fonds und „Auffällig: …, und eines mehr“; der Zuruf „Marktübersicht“ öffnet Intel und antwortet im Gespräch mit dem erwarteten Satz ohne das Wort „Spielgeld“ (der Desk war nicht gestartet); Marktlage, „Heute“ und Zuruf haben den Kursdienst kein einziges Mal zusätzlich gefragt; mit zehn Tage alten Kursen steht in Intel und in „Heute“ „veraltet“, und nichts gilt mehr als Bewegung; keine Fehler in der Seite. Bilder angesehen |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde, alle eingearbeitet: „Heute“ zeigte veraltete Edelmetallkurse ohne Kennzeichen; die Regel für den Zuruf griff auch mitten in Wörtern („Arbeitsmarktlage“) und nahm „Nachrichten zur Marktlage“ den Nachrichten weg; ein gescheiterter erster Abruf und fehlende Metalle wurden verschwiegen; eine kurze Warnung von Intel verlor im gesprochenen Satz ihren Punkt und wurde dann nicht mehr als Text von Dritten erkannt; „Hoch der letzten 21 Handelstage“ stand auch da, wenn es so viele Kurse noch nicht gab oder Hoch und Tief fast gleich waren; der gesprochene Satz nannte Beispielkurse und veraltete Kurse erst am Ende; das Tageslimit meldete sich doppelt; das Feld leuchtete auch bei bloßen Lücken in den Daten; die Seite fragte den Stand der Edelmetalle jede Minute ab (jetzt alle fünf Minuten); Prozente standen in Zeile und Liste verschieden geschrieben |
| Sicherheitsprüfung (von Hand) | Kein neuer Weg nach außen und keine neue Abfrage bei einem Dienst: Die Marktlage rechnet nur im Browser mit Daten, die schon da sind. Die Abfrage `/api/metalle` liest bei JARVIS selbst und fragt den Kursdienst nicht (im Browser gezählt). Der Wortlaut einer Störung des Kursdienstes steht weder im Feld noch im Satz. Die Warnung von Intel steht wörtlich da und macht das Gespräch fremd beeinflusst. Namen der Coins und Metalle sind feste Texte aus dem Programm. Der Desk bleibt Spielgeld |
| Dabei bemerkt | Die Handprüfung fand die Antwort zunächst nicht: Im Browser ohne Mikrofon zeigt die Zeile über der Leiste den Mikrofon-Hinweis statt der Antwort; die Prüfung klappt jetzt das Gespräch auf. Am Programm war dabei nichts falsch. Im Bild fiel auf, dass „Silber-Fonds SLV“ in drei Zeilen umbrach; die Veränderung steht jetzt in einer eigenen Zeile |
| Nicht geprüft | echter Mac und Safari; echte Kryptokurse (die Sandbox erreicht den Kursdienst nicht, deshalb Beispieldaten); die Gruppe „Spielgeld-Desk“ im Browser (der Desk war nicht gestartet; die Regeln dazu sind getestet); echtes Twelve Data; der Zuruf über die Stimme |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

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
| G2.4 Hinweis am Mac selbst (ohne Handy) als Mitteilung von macOS: eigener Schalter unter Einstellungen → Mitteilungen (**Voreinstellung: aus**), dieselbe Obergrenze, in der Mitteilung nur Zahlen, Knopf „Mitteilung zur Probe zeigen“ | Testbereit, **nur gegen einen nachgebauten Mac geprüft** | Schritt G2.4; `src/lib/server/mitteilung.ts`, `test/module/hinweise.test.ts`; Prüfliste Teil P |
| G3.1 Antwortentwurf auf Zuruf: am Mac im Raum „Post“ mit dem Knopf „Antwort entwerfen“ oder im Gespräch, auch per Telegram. Der Entwurf liegt nur auf dem Mac (`~/.jarvis/entwuerfe.json`), je Mail einer | Testbereit | Schritt G3; `src/lib/entwuerfe.ts`, `src/lib/server/entwuerfe.ts`, Werkzeug `antwort_entwerfen` (Klasse B) |
| G3.2 Kein Versand: Es gibt kein Werkzeug und keine Schnittstelle zum Senden. Empfänger ist immer der Absender, den der Server im Postfach liest; Betreff ist „Re: …“. Weder das KI-Modell noch der Text der Mail können das ändern. Im Postfach ändert sich nichts | Testbereit | `test/module/entwuerfe.test.ts`, `test/regeln/entwuerfe.test.ts` |
| G3.3 Lesen, ändern, kopieren, verwerfen im Raum „Post“; „Im Mailprogramm öffnen“ trägt Empfänger, Betreff und Text in eine neue Mail ein, abschicken musst du selbst. Was du geändert hast, überschreibt JARVIS nicht | Testbereit | `src/components/Antwortentwuerfe.tsx`; im Browser geprüft (`test/hand/post-rauch.ts`) |
| G3.4 Entwurf im Ordner „Entwürfe“ des echten Postfachs ablegen | Blockiert | ändert das echte Postfach; braucht Benedikts Entscheidung (Frage 13) |
| G3.5 Zitat der ursprünglichen Mail und „Allen antworten“, beides nur auf deinen Haken am Mac | Testbereit, **nur gegen das nachgebaute Postfach** | Schritt G3.5 unten; `zitatText`, `kopieEmpfaenger`, `mailZumEntwurf`; im Browser geprüft (`test/hand/post-rauch.ts`) |
| G3.6 Anhänge an der Antwort | Blockiert | Ein Link ins Mailprogramm kann keine Anhänge tragen. Das geht erst mit dem Entwurf im Postfach (G3.4, Frage 13) |
| G4.1 Starke Bewegungen am Markt im Morgenbriefing und im Tagesabschluss (Handy und gesprochen am Mac) | Testbereit; nur gegen nachgebautes Telegram und nachgebautes CoinGecko | Schritt G4.1 unten; `marktAbsatz`, `marktHinweis` in `src/lib/marktlage.ts` |
| G4.2 Marktüberwachung über Krypto und Edelmetalle hinaus (Aktien, Zinsen, Währungen) | Offen | neue Datenquellen, zum Teil bezahlt: braucht Benedikts Freigabe |

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
einmal und schreibt das in den Zeitplan. Die Hinweise kamen bis hierher nur aufs Handy; die Mitteilung am Mac
ist seit Schritt G2.4 gebaut (siehe unten).
**Sicherheitsrisiken:** keine neuen. Es geht nichts an ein KI-Modell, und über Telegram geht nichts, was nicht
schon Briefing und Tagesabschluss nach denselben Regeln schicken.

### Schritt G2.4: Hinweise am Tag als Mitteilung am Mac (14. November 2026)

**Was gebaut wurde.** Die Hinweise am Tag (überfällig, Rückmeldung fehlt, heute noch offen) gibt es jetzt auch
am Mac selbst, ohne Handy: als Mitteilung von macOS oben rechts am Bildschirm. Unter Einstellungen steht ein
neuer Abschnitt „Mitteilungen am Mac“ mit einem Schalter (Voreinstellung: aus) und dem Knopf „Mitteilung zur
Probe zeigen“. Im Zeitplan steht eine eigene Zeile „Hinweise am Tag als Mitteilung am Mac“.

**Wie es gebaut ist.**

* `src/lib/server/mitteilung.ts` ruft das auf jedem Mac vorhandene `osascript` auf. Es wird nichts installiert,
  und nichts verlässt den Mac. Text und Titel stehen nie im Skript, sie gehen als eigene Argumente an
  `osascript`; so kann kein Zeichen darin das Skript verändern. Steuerzeichen werden entfernt, überlange Texte
  gekürzt. Fehler werden nur als feste Sätze gemeldet.
* Handy und Mac sind zwei Wege mit je eigenem Schalter und eigenem Stand (`src/lib/server/hinweise.ts`). Jeder
  zählt für sich bis drei am Tag. Ist Telegram nicht erreichbar, zeigt der Mac den Hinweis trotzdem, und aufs
  Handy kommt er nach, ohne am Mac ein zweites Mal zu erscheinen. Die Datei `~/.jarvis/hinweise.json` behält
  ihr Format; der Stand für den Mac steht zusätzlich unter „mac“. Eine Datei von früher wird gelesen: Was dort
  schon als gemeldet steht, ist auch für den Mac nichts Neues.
* Die Regel gegen zu viele Meldungen ist dieselbe wie fürs Handy (`src/lib/hinweise.ts`): nur 9 bis 18 Uhr,
  höchstens drei am Tag, eine Stunde Abstand, jedes Ding einmal.
* Was das Morgenbriefing oder der Tagesabschluss schon gesagt hat, kommt auch am Mac nicht noch einmal, aber
  erst, wenn die Meldung wirklich hinausging. Nimmt Telegram sie nicht an, hat sie niemand gelesen, und der Mac
  zeigt den Hinweis selbst. Steht das Briefing gerade an, wartet der Mac darauf höchstens zehn Minuten (das
  Handy wartet wie bisher bis zu drei Stunden; ohne Telegram käme dort ohnehin nichts an).

**Eigene Entscheidungen (ohne Rückfrage getroffen).**

1. **In der Mitteilung stehen immer nur Zahlen** („2 Aufgaben sind überfällig. Einzelheiten in JARVIS unter
   „Heute“.“), nie ein Projektname oder der Wortlaut einer Aufgabe, auch nicht bei den eigenen Aufgaben aus dem
   Tresor. Grund: Eine Mitteilung sieht jeder, der auf den Bildschirm schaut, auch auf dem Sperrbildschirm oder
   wenn in einer Besprechung der Bildschirm geteilt wird. Einen Schalter „mit Namen“ gibt es bewusst nicht.
2. **Eigener Schalter, unabhängig vom Handy.** Man kann beides einschalten oder nur eines.
3. **Nimmt der Mac die Mitteilung nicht an**, ist sicher nichts erschienen: Nichts wird gemerkt, neuer Versuch
   eine Viertelstunde später. **Antwortet der Mac gar nicht** (15 Sekunden) oder wird `osascript` von außen
   beendet, weiß niemand, ob sie erschienen ist. Dann geht der Hinweis nicht verloren, aber der Versuch zählt
   wie eine Mitteilung: nächster Versuch frühestens eine Stunde später, höchstens drei am Tag. Schlimmstenfalls
   erscheint dieselbe Mitteilung also dreimal an einem Tag; verloren geht nichts.
4. **Kein Zusatzprogramm.** Deshalb öffnet ein Klick auf die Mitteilung nicht JARVIS (macOS ordnet sie nach
   meinem Wissen dem Skripteditor zu; am Mac nicht geprüft). Das steht so in den Einstellungen.
5. **Wer die Mitteilung am Mac zum ersten Mal einschaltet**, bekommt als Erstes eine Zusammenfassung dessen, was
   am Mac noch nicht als gemeldet gilt (ohne Handy also alles, was gerade ansteht). Das ist gewollt: So sieht
   man gleich, dass es geht.

### Testergebnisse Schritt G2.4 (14. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **821 Tests: 821 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 26: Text der Mitteilung 2, Mitteilung am Mac über den Taktgeber gegen den nachgebauten Mac 17, Schalter und Probe in den Einstellungen 7). Zwei frühere Tests zählen jetzt sieben statt sechs Zeilen im Zeitplan. Zwei der neuen Tests laufen nur außerhalb von macOS (dort ließe sich „kein Mac“ nicht nachstellen, ohne das echte `osascript` zu rufen) und würden auf einem Mac als übersprungen gemeldet |
| `npx next build` | erfolgreich, weiter nur die vier bekannten Hinweise von Turbopack. Ein fünfter (der Bau wollte dem Pfad zu `osascript` folgen) ist behoben |
| Handprüfung `mitteilung-rauch` (Chromium, gebauter Server, nachgebauter Mac) | alle fünf Schritte in Ordnung: Abschnitt und Schalter (aus) sind da, und ausgeschaltet kommt nichts; die Probe geht an den nachgebauten Mac und schaltet nichts ein; nach dem Einschalten über die Seite zeigt der Zeitplan des laufenden Servers von selbst „2 Aufgaben sind überfällig. …“, ohne Namen und ohne den Text im Skript; die Zeile steht im Zeitplan, und dieselbe Mitteilung kommt kein zweites Mal; Ausschalten über die Seite, unsinnige Angabe (400), fremde Seiten (403). `agenten-rauch` und `routinen-rauch` an die neue Zeile und den zweiten Schalter angepasst, beide laufen durch |
| Gegenproben (absichtlich eingebaute Fehler, Tests müssen fehlschlagen) | 52 von 52 erkannt, in zwei Läufen (35 nach dem Bau, 17 nach dem Code-Review). Unter anderem: Mitteilung kommt ausgeschaltet; Mac und Handy teilen sich den Stand; gezeigte Mitteilung wird nicht gemerkt; abgelehnte gilt als gezeigt; Versuch jede Minute; Wortlaut oder Projektname in der Mitteilung; Text im Skript; Steuerzeichen bleiben; alte Datei verliert den Teil fürs Handy; Mac wartet gar nicht oder volle drei Stunden auf das Briefing; Briefing gilt am Mac schon vor dem Senden als gesagt; hängende Mitteilung geht verloren; Schalter stellt auch das Handy um; Probe schaltet ein oder meldet Erfolg trotz Ablehnung |
| Code-Review | neun Punkte. Sieben eingearbeitet: Der Mac wartete bis zu drei Stunden auf ein Briefing, das wegen Telegram nicht durchkam (jetzt höchstens zehn Minuten); das Briefing galt am Mac schon als gesagt, bevor es hinausging (jetzt erst danach); eine hängende Mitteilung ließ den Hinweis verloren gehen (jetzt neuer Versuch nach einer Stunde); nach dem Umstieg hätte der Mac alles noch einmal gemeldet, was längst gesagt war; ein Stand in alter Form im Speicher wäre nach einem Neuladen falsch benutzt worden; ein von außen beendetes `osascript` galt als „sicher nicht gezeigt“; die Probe antwortete mit einem veralteten Stand der Einstellungen; der Zeitplan zeigte den Takt auch ohne Mac. Bewusst gelassen: Lässt sich `osascript` gar nicht starten, steht „nicht angenommen“ da und JARVIS versucht es alle Viertelstunde wieder (auf einem Mac gibt es das Programm immer, der Versuch kostet nichts); sind beide Wege an, wird das Projektgedächtnis je Minute zweimal statt einmal gelesen (eine kleine Datei; ein gemeinsamer Zwischenspeicher hätte gleichzeitige Änderungen verdeckt) |
| Am echten Mac geprüft | **nein.** Alles lief gegen ein nachgebautes `osascript`; eine echte Mitteilung ist nirgends erschienen |
| Nicht geprüft | ob macOS die Mitteilung zeigt (Erlaubnis für den Skripteditor, Fokus), wie sie auf dem Sperrbildschirm aussieht, was ein Klick darauf öffnet, ob die 15 Sekunden Frist am Mac passen (Prüfliste Teil P) |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. **Bekannte Grenzen:**
JARVIS kann nicht sehen, ob macOS eine Mitteilung wirklich zeigt: Fehlt die Erlaubnis oder ist ein Fokus (Nicht
stören) an, meldet macOS „erledigt“ und zeigt nichts; der Hinweis gilt dann als gezeigt. Dafür gibt es die
Mitteilung zur Probe. Ein Klick auf die Mitteilung führt nicht zu JARVIS. Die Mitteilung kommt nur, solange
JARVIS am Mac läuft. Antwortet der Mac mehrmals nicht, kann dieselbe Mitteilung bis zu dreimal am Tag erscheinen. **Sicherheitsrisiken:** keine neuen. Es geht nichts an ein KI-Modell und nichts ins Netz;
die Mitteilung enthält keine Inhalte. Der neue Schalter und die Probe laufen über dieselbe geschützte
Schnittstelle wie alle Einstellungen (fremde Seiten werden abgewiesen).

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
Die Antwort geht ohne Anhänge (Zitat und „Allen antworten“ gibt es seit Schritt G3.5 auf deinen Haken). Im
Mailprogramm ist sie eine neue Mail mit „Re:“ im Betreff, nicht technisch an den alten Verlauf
gehängt. Der Entwurf liegt nicht im Ordner „Entwürfe“ deines Postfachs (Frage 13). Der Absender einer Mail
lässt sich fälschen: Sieh bei „An“ nach, bevor du abschickst.
**Sicherheitsrisiken:** Ein Entwurf entsteht aus dem Text einer fremden Mail. Eine manipulierte Mail kann
versuchen, das KI-Modell dazu zu bringen, etwas in den Entwurf zu schreiben, das dort nicht hingehört. Das
Modell hat die Anweisung, das nicht zu tun; technisch erzwungen ist es nicht. Der Schutz ist: Der Entwurf
verlässt den Mac nur, wenn du ihn selbst abschickst, er geht nur an den Absender, und am Entwurf steht der
Hinweis, ihn vorher zu lesen. Wie schon beim Öffnen einer Mail geht ihr Text an das KI-Modell (Anthropic).

### Schritt G3.5: Zitat der ursprünglichen Mail und „Allen antworten“ (14. November 2026)

**Was sich für dich ändert:** An jedem Antwortentwurf im Raum „Post“ steht „Zitat und weitere Empfänger aus der
Mail holen“. Danach gibt es zwei Haken, beide zunächst aus:

* **„Ursprüngliche Mail als Zitat anhängen“**: Unter deinem Text steht dann „Am … schrieb …:“ und die ganze
  Mail, jede Zeile mit „>“, wie in einem Mailprogramm. Eine sehr lange Mail (über 6.000 Zeichen) wird an einem
  Zeilenende gekürzt, und das steht als letzte Zeile da. Du siehst das Zitat vorher. „Im Mailprogramm öffnen“
  und „Kopieren“ nehmen es mit.
* **„Allen antworten“**: erscheint nur, wenn die Mail an weitere Leute ging. Die Adressen stehen dabei; mit
  Haken gehen sie in Kopie (nicht als Empfänger), und am Entwurf steht die Zeile „Kopie“.

**Die festen Regeln dazu**

* **Nur auf deinen Klick am Mac.** Das KI-Modell kann weder ein Zitat noch weitere Empfänger anfordern: Das
  Werkzeug `antwort_entwerfen` kennt weiter nur die Nummer der Mail und den Text. Per Telegram geht es nicht.
* **Nichts davon wird gespeichert, nichts geht an ein KI-Modell.** Der Server liest die Mail dafür einmal, nur
  lesend, aus dem Postfach (sie bleibt ungelesen); Zitat und Adressen stehen nur im Fenster. In
  `entwuerfe.json` steht weiter kein Text der ursprünglichen Mail.
* **Weitere Empfänger kommen allein aus dem Kopf der Mail**, so wie der Server ihn im Postfach liest: ohne dich,
  ohne den Absender, jede Adresse einmal, nur schlichte Adressen. Was keine schlichte Adresse ist, bleibt weg
  und wird dir als Zahl genannt. Bei mehr als zehn wird keiner übernommen, statt still zu kürzen.
* **Gezeigt werden nur Adressen, keine Namen** aus dem Kopf der Mail: Ein Name lässt sich frei wählen und
  könnte über die Adresse dahinter täuschen.
* **Es ist dieselbe Mail oder keine.** Gehört die Nummer inzwischen zu einer anderen Mail (anderer Absender oder
  Betreff) oder ist die Mail weg, gibt es weder Zitat noch Empfänger.
* **Der Link** trägt die Kopie-Adressen als eigenes Feld, jede verschlüsselt; ist er zu lang, bleiben
  Empfänger, Kopie und Betreff, und der Text samt Zitat kommt über „Kopieren“. Passen nicht einmal die hinein,
  gibt es keinen Link statt eines abgeschnittenen.
* **Eine Antwortadresse im Kopf der Mail („Reply-To“) zählt weiter nicht**, auch nicht bei „Allen antworten“.

**Eigene Entscheidungen:** (1) Die frühere Regel „genau ein Empfänger“ gilt weiter als Voreinstellung;
„Allen antworten“ ist die eine Ausnahme und immer dein eigener Haken. (2) Zitiert wird die ganze Mail, nicht
die gekürzte Fassung zum Vorlesen: Die hört an manchen Zeilen still auf, und ein Zitat, das mitten im Satz
endet, ohne dass es dasteht, wäre falsch. (3) Die Haken werden nicht gespeichert: Nach neuem Laden der Seite
sind sie wieder aus.

**Grenzen:** Mit Zitat ist der Link fast immer zu lang; dann führt der Weg über „Kopieren“. Die Antwort ist im
Mailprogramm weiter eine neue Mail mit „Re:“, nicht technisch an den alten Verlauf gehängt. Eigene weitere
Adressen (Aliasse) erkennt JARVIS nicht: Ging die Mail an einen Alias von dir, steht der in Kopie. Bei Mails
von Verteilern oder Ticketsystemen, die über eine Antwortadresse laufen, erreicht „Allen antworten“ den
Verteiler deshalb nicht. Wer in Kopie
stand, bestimmt der Absender der Mail: Sieh die Adressen an, bevor du den Haken setzt.

### Testergebnisse Schritt G3.5 (14. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **870 Tests: 870 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 22: Regeln für Zitat, Kopie-Empfänger und Link 14; gegen das nachgebaute Postfach 8) |
| Tests zuerst | Alle neuen Tests liefen zuerst rot (die Funktionen gab es noch nicht) und nach dem Bau grün; ihre Aussagekraft belegen die Gegenproben |
| Gegenproben | Erste Runde: 29 absichtlich eingebaute Fehler, 28 sofort bemerkt. Unbemerkt blieb: Die Liste der übrigen Empfänger wäre mit einer geöffneten Mail in die Antwort an die Seite gegangen (zum KI-Modell nicht; das bekommt einen festen Text). Dafür gibt es jetzt einen eigenen Test, danach bemerkt. Zweite Runde nach der Durchsicht: 13 Fehler, 13 bemerkt (unter anderem: Zitat hört auf, wo das Vorlesen aufhört; gekürzt ohne Hinweis oder mitten in der Zeile; zu langer Link wird trotzdem gebildet) |
| `npx next build` | erfolgreich, mit den vier bekannten Warnungen |
| Handprüfung `post-rauch` (Chromium, gebauter Server, nachgebautes Postfach, nachgebauter Claude) | alle Schritte in Ordnung, neu: kein Haken ist von selbst gesetzt, und ohne Haken bleibt der Link, wie er war; mit „Zitat“ steht die Mail ohne Signatur unter dem Text, im Link und in der Zwischenablage; mit „Allen antworten“ steht die Kopie-Adresse am Entwurf und als eigenes Feld im Link; weder Zitat noch Kopie-Adresse stehen in der Datei; eine Mail nur an dich bietet kein „Allen antworten“; eine Mail mit eingeschleuster Anweisung wird nur zitiert, kein KI-Modell wird gefragt; beide Mails bleiben ungelesen, kein ändernder Befehl im Postfach; die Schnittstelle lehnt die Anfrage ohne eigenen Header ab |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | neun Befunde. Eingearbeitet: Das Zitat kam aus der Fassung zum Vorlesen und hörte deshalb still nach 2.500 Zeichen oder an einer Zeile wie „Von: …“ auf (jetzt die ganze Mail, sichtbar gekürzt erst ab 6.000 Zeichen); Tabulatoren fielen ersatzlos weg, Spalten liefen zusammen; der Link ohne Text konnte mit vielen Kopie-Adressen selbst zu lang werden; „Weitere Empfänger hat diese Mail nicht“ stand auch da, wenn Adressen nur ausgelassen wurden; Hinweis, wenn eine Kopie-Adresse vermutlich keine Antworten annimmt; die Mail wird an einer Stelle gelesen statt mit doppelter Feldliste; der Kommentar zur festen Regel stimmte nicht mehr. Bewusst nicht geändert: „Reply-To“ zählt weiter nicht (feste Regel aus G3); eigene Aliasse erkennt JARVIS nicht (steht bei den Grenzen) |
| Sicherheitsprüfung (von Hand) | Kein Weg zum Senden dazugekommen; die Schnittstelle hat eine lesende Aktion mehr (`mail`), hinter demselben Schutz wie die ändernden. Fremder Text (Name, Mailtext, Adressen) geht nur in die Anzeige, die Zwischenablage und den Link, jeweils als Text; im Link ist jede Kopie-Adresse geprüft und verschlüsselt. Das Öffnen einer Mail im Gespräch gibt dem Modell weiter keine Empfängerliste |
| Gegen die echten Dienste geprüft | **nein.** Nachgebautes Postfach. Wie ein echter Server An und Kopie liefert (Gruppen, Verteiler) und ob dein Mailprogramm das Feld „Kopie“ aus dem Link füllt, zeigt erst der Mac (Prüfliste M11 bis M13) |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** „Allen antworten“ schickt deine Antwort an
Adressen, die der Absender der Mail gewählt hat. Gemildert: nur auf deinen Haken, die Adressen stehen sichtbar
dabei, höchstens zehn, nie durch das KI-Modell. **Neue laufende Kosten:** keine.

### Schritt G4.1: starke Bewegungen am Markt im Morgenbriefing und im Tagesabschluss (15. November 2026)

**Warum:** Die Marktlage (Schritt E4.1) sagt, was auffällt, aber nur, wenn man hinsieht oder fragt. Morgens und
abends meldet sich JARVIS ohnehin; dort steht jetzt dabei, wenn sich ein Kurs stark bewegt hat. Dieselben
Regeln, dieselben Schwellen, kein KI-Modell.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| G4.1a Morgenbriefing und Tagesabschluss aufs Handy bekommen den Absatz „Märkte“: je eine Zeile für Kurse über der Schwelle (Krypto 5 % in 24 Stunden, Gold und Silber 2 % zum Vortag) und für Gold oder Silber am Hoch oder Tief der letzten 21 Handelstage; höchstens fünf Zeilen, der Rest als Zahl | Testbereit, nur gegen nachgebautes Telegram | `marktAbsatz`, `briefingMessage`, `abschlussNachricht` |
| G4.1b An einem ruhigen Tag steht nichts da. Beispielkurse gelten nie als Bewegung; kommen die Kryptokurse nicht, steht „Kryptokurse: gerade keine Verbindung“ da. Gold und Silber zählen nur mit einem Kurs von heute, je Metall: Die Bewegung vom Freitag steht nicht am Wochenende wieder da | Testbereit | `marktlage.test.ts`, `hinweise.test.ts` |
| G4.1c Der Spielgeld-Desk und die Warnung von Intel stehen im Briefing wie bisher an eigener Stelle und nicht noch einmal im Absatz | Testbereit | wie oben |
| G4.1d Gesprochen am Mac („Briefing“, „Tagesabschluss“): ein Satz „An den Märkten fällt auf: …“, höchstens drei Dinge; Kryptokurse nur, wenn der Mac sie in den letzten 15 Minuten geholt hat | Testbereit | `marktHinweis`, Regeln in `src/lib/commands.ts` |
| G4.1e Dafür fragt JARVIS morgens und abends nur die drei großen Kryptokurse ab (ohne den Scanner, und höchstens einmal in 15 Sekunden, gemeinsam mit Oberfläche und Desk); die Edelmetalle kommen aus dem Stand, den der Edelmetall-Agent schon gelesen hat | Testbereit | `majorsSnapshot` in `src/lib/market.ts` |

**Eigene Entscheidungen (Benedikt hat sie noch nicht gesehen):** (1) Es gibt keinen eigenen Schalter: Wer das
Morgenbriefing hat, bekommt den Absatz, wenn etwas auffällt. Die Kurse sind öffentlich und nichts aus der
Firma. (2) Zwischendurch meldet JARVIS nichts vom Markt; die höchstens drei Hinweise am Tag bleiben für
Aufgaben. (3) Von den Lücken in den Daten steht nur eine im Briefing: dass die Kryptokurse fehlen. Veraltete
Edelmetallkurse und ein gescheiterter Abruf stehen im Raum Intel. (4) Gold und Silber zählen nur mit einem Kurs
von heute. Der Silber-Fonds handelt erst ab dem Nachmittag (US-Börse); er steht deshalb eher im Tagesabschluss
als im Morgenbriefing.

**Grenzen:** Gemeldet wird der Stand zur Zeit des Briefings, nicht der Verlauf des Tages: Ein Kurs, der mittags
um 8 % fällt und abends wieder bei 3 % steht, kommt nicht vor. Die Edelmetalle sind so alt wie der letzte Lauf
des Edelmetall-Agenten (morgens 7:30 Uhr und abends 17:30 Uhr, wenn er eingeschaltet ist).

### Testergebnisse Schritt G4.1 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **938 Tests: 938 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 9: acht Regeltests in `marktlage.test.ts`, einer mit nachgebautem Telegram, CoinGecko und dem Stand des Edelmetall-Agenten in `hinweise.test.ts`) |
| Tests zuerst | Erste Runde: Die Regeltests standen vor dem Code und liefen rot (7 rote Tests). Ehrlich zur zweiten Runde: Die Tests zu den Befunden der Durchsicht habe ich vor dem Code geschrieben, aber nicht rot laufen sehen, bevor der Code da war; der Beleg dort sind die Gegenproben |
| Gegenproben | Erste Runde: 34 absichtlich eingebaute Fehler, 33 bemerkt; der eine war kein Fehler (der Absatz filtert den Desk ohnehin heraus, die Stelle ist doppelt abgesichert). Zweite Runde nach der Durchsicht: 20 eingebaute Fehler, 18 bemerkt; eine Lücke mit einem Test geschlossen und danach bemerkt, einer war von mir falsch gebaut und änderte nichts. Darunter: Desk, Warnung oder Datenlücken rutschen in den Absatz, sechs statt fünf Zeilen, der Rest wird verschwiegen, Absatz fehlt im Briefing oder im Abschluss, Edelmetalle mit altem Kurs zählen mit, der Ausfall der Kryptokurse wird verschwiegen oder gilt als echte Kurse, das Briefing holt den ganzen Markt samt Scanner, jede Abfrage holt neu, alte Kurse am Mac gelten als frisch |
| `npx next build` | erfolgreich, mit den vier bekannten Warnungen. Danach die Handprüfung `marktlage-rauch` noch einmal (die Marktlage teilt sich den Code): alle Schritte in Ordnung |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde. Eingearbeitet: Eine Bewegung bei Gold oder Silber wäre bis zu vier Tage lang jeden Morgen und Abend wieder gemeldet worden, etwa die vom Freitag das ganze Wochenende (jetzt zählt nur ein Kurs von heute, je Metall); das Briefing fragte CoinGecko an der gemeinsamen Sperre von 15 Sekunden vorbei ein zweites Mal (jetzt eine Abfrage für Oberfläche, Desk und Briefing); fehlten die Kryptokurse, sah das Briefing aus wie an einem ruhigen Tag (jetzt steht „Kryptokurse: gerade keine Verbindung“ da); am Mac konnte ein stundenalter Kurs als Neuigkeit gesprochen werden (jetzt nur, wenn die Kurse höchstens 15 Minuten alt sind); zwei Minuszeichen in einer Liste (jetzt überall „−“ in der Marktlage); doppelter Code für Beispielkurse, eine Fehlerbehandlung, die nie greifen konnte, ein Kommentar an der falschen Stelle, dieselbe Zeile dreimal. Bewusst nicht geändert: Der Satz kommt auch bei „Hallo“ und „Guten Tag“, weil das am Mac schon immer das ganze Briefing auslöst; gesprochen heißt es weiter „Bitcoin: +6 % in 24 Stunden“ wie im Zuruf „Marktübersicht“ (wie die Stimme das liest, steht in der Prüfliste); der Tagesabschluss bekommt den Absatz fertig, das Briefing die Daten |
| Sicherheitsprüfung (von Hand) | Ein neuer Abruf nach außen: Morgens und abends fragt JARVIS bei CoinGecko die drei großen Kurse ab, denselben Dienst und dieselbe Abfrage wie die Oberfläche; es geht nichts von dir hinaus. Aufs Handy gehen nur feste Namen (Bitcoin, Ethereum, Solana, Gold, Silber oder der Fonds) und Zahlen, kein Text von Dritten: Die Warnung von Intel und der Wortlaut einer Störung des Kursdienstes stehen nicht im Absatz (Tests). Der Desk bleibt Spielgeld und hat weiter seinen eigenen Satz |
| Nicht geprüft | echtes Telegram, echtes CoinGecko und echtes Twelve Data; echter Mac; die gesprochene Fassung über die Stimme; eine Handprüfung im Browser gab es für diesen Schritt nicht, weil sich an der Oberfläche nichts ändert (der gesprochene Satz ist über die Regeln getestet) |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(CoinGecko ist für diese Abfrage kostenlos und wird schon benutzt).

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
| H1.5 Unterbrechen: „Stopp“, „Halt“, „Ruhe“, „Hör auf“ ohne „Jarvis“, während er spricht; Escape und „Jarvis …“ wie bisher. Bricht auch die Wolkenstimme sofort ab | Testbereit (Regel und Escape geprüft; das gesprochene „Stopp“ seit Schritt J17 auch im Browser, mit einem nachgebauten Mikrofon) | `stopsSpeech` in `src/lib/voiceText.ts`; `test/hand/zuhoeren-rauch.ts` |
| H1.6 Mit echtem ElevenLabs-Schlüssel am Mac prüfen | Offen (Benedikt) | Prüfliste Teil I; kostet Zeichen aus seinem Tarif |
| H2.1 Programme und Ordner am Mac auf Zuruf öffnen, aus einer festen Liste | Testbereit (**nur gegen einen nachgebauten Mac**) | Schritt H2.1 unten; Prüfliste Teil AB |
| H2.2 Weitere Teile eines Desktop-Agenten (eigene Ordner, Dateien suchen und öffnen, Programme bedienen oder schließen) | Offen | nicht gebaut; jedes davon braucht eigene Regeln, siehe Grenzen in H2.1 |

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

### Schritt H2.1: Programme und Ordner am Mac auf Zuruf öffnen, nach festen Regeln (16. November 2026)

**Warum:** Am Mac öffnen konnte JARVIS bisher nur die Kalender-App, Obsidian und seine eigenen PDFs. „Jarvis,
öffne Excel“ ergab „Das verstehe ich noch nicht“ oder ging an das KI-Gehirn, das dafür kein Werkzeug hatte. Der
Auftrag nennt in Bereich H einen Desktop-Agenten mit Regeln; das ist der erste, kleinste Teil davon.

**Was JARVIS jetzt kann:** „Jarvis, öffne Safari“, „Starte Excel“, „Mach den Finder auf“, „Kannst du bitte Teams
öffnen“, „Zeig mir den Ordner Downloads“. Es gibt eine feste Liste: 19 Programme (Safari, Chrome, Outlook, Teams,
Word, Excel, PowerPoint, Apple Mail, Apple Notizen, Erinnerungen, Finder, Musik, Fotos, Karten, Rechner, Vorschau,
Systemeinstellungen, Spotify, WhatsApp) und 4 Ordner (Dokumente, Downloads, Schreibtisch, Bilder). In den
Einstellungen unter „Programme“ lässt sich jeder Eintrag ausschalten, und es gehen bis zu 12 eigene Programme dazu
(nur der Name, so wie das Programm im Ordner „Programme“ heißt). **JARVIS öffnet nur. Er bedient nichts, schließt
nichts, löscht nichts, und er öffnet keine einzelnen Dateien und keine Internetadressen.**

**Wie es abgesichert ist:** (1) Geöffnet wird an genau einer Stelle (`src/lib/server/desktop.ts`), ohne Shell, mit
festen Argumenten für `/usr/bin/open`: bei Apple-Programmen die feste Kennung von Apple, sonst der Name aus der
Liste, bei Ordnern der feste Pfad im Benutzerordner. Was nicht auf der Liste steht oder ausgeschaltet ist, lehnt
der Server ab, gleich wer fragt. (2) Die Seite und das KI-Gehirn schicken nie einen Namen oder Pfad, nur die
Kennung eines Listeneintrags. (3) Das KI-Gehirn bekommt ein Werkzeug `programm_oeffnen`, das nur die eingeschalteten
Einträge zur Auswahl hat; es läuft über das Security Gateway (Klasse A, nur am Mac, nicht über Telegram). (4) Ein
eigenes Programm darf nicht heißen wie etwas, das in JARVIS schon etwas bedeutet („Mail“, „Kalender“, „Notizen“,
„Einstellungen“ und so weiter), nicht wie ein fester Eintrag, und der Name darf nur aus Buchstaben, Ziffern,
Leerzeichen und wenigen Zeichen bestehen (kein Schrägstrich, kein Doppelpunkt, kein Bindestrich am Anfang). (5) Jedes
Öffnen und jede Ablehnung steht im Audit-Log.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| H2.1.1 Regeln: feste Liste, Zuruf verstehen („öffne“, „starte“, „mach … auf“, „… öffnen“, „zeig mir den Ordner …“, mit „bitte“, „mal“, „kannst du“), eigene Namen prüfen | Testbereit | `src/lib/desktop.ts`; `test/regeln/desktop.test.ts` (22 Tests) |
| H2.1.2 Server: Öffnen ohne Shell, nur Einträge der Liste, Ausgeschaltetes abgelehnt, Frist von 10 Sekunden, eigene Sätze bei Fehlern, Audit-Log | Testbereit, **nur gegen einen nachgebauten Mac** | `src/lib/server/desktop.ts`, `/api/desktop`; `test/module/desktop.test.ts` (22 Tests) |
| H2.1.3 Gespräch: fester Befehl ohne KI-Gehirn; mit KI-Gehirn das Werkzeug `programm_oeffnen` über das Security Gateway | Testbereit, **nur gegen einen nachgebauten Mac und ein nachgebautes KI-Modell** | `decide()` in `src/lib/commands.ts`; `brain.ts`; `gateway/richtlinien.ts` |
| H2.1.4 Einstellungen „Programme und Ordner am Mac“: ein- und ausschalten, zur Probe öffnen, eigene Programme hinzufügen und entfernen | Testbereit, **nur gegen einen nachgebauten Mac** | `src/components/ProgrammeSetup.tsx`; Handprüfung „Programme am Mac“ |
| H2.1.5 Handprüfung „Programme am Mac“ (11 Schritte) im Browser; jetzt 30 Handprüfungen | Testbereit | `test/hand/desktop-rauch.ts` (Port 3132) |
| H2.1.6 Am echten Mac prüfen: ob die Programme wirklich aufgehen, ob die Namen stimmen, was bei einem nicht installierten Programm geschieht | Offen (Benedikt) | Prüfliste Teil AB |

**Eigene Entscheidungen:** (1) Die feste Liste ist von Anfang an eingeschaltet. Jeder Eintrag öffnet nur ein
übliches Programm oder einen der vier Standardordner; ausschalten geht je Eintrag. (2) Nur öffnen. Bedienen,
Schließen und Beenden sind nicht gebaut. (3) Keine Internetadressen und keine eigenen Ordner oder Dateien: Eine
Adresse zu öffnen wäre ein Weg, auf dem ein fremder Text (aus einer Mail oder Webseite) Daten hinausschicken könnte;
das braucht eigene Regeln und kommt, wenn überhaupt, als eigener Schritt. (4) Das Werkzeug des KI-Gehirns ist Klasse
A ohne Rückfrage: Ein Programm aus deiner eigenen Liste zu öffnen verändert nichts und gibt nichts hinaus. Über
Telegram gibt es das Werkzeug nicht. (5) Der Not-Aus hält das KI-Gehirn an, nicht deinen eigenen Zuruf oder Klick;
so ist es beim Öffnen von Obsidian und der Kalender-App auch. (6) **„Öffne die Systemeinstellungen“ meint jetzt die
des Macs**, „Öffne die Einstellungen“ weiterhin die von JARVIS. Vorher landeten beide in JARVIS. (7) „Dokumente“
und „Bilder“ allein bleiben, was sie in JARVIS waren; den Ordner am Mac öffnet erst „Öffne den Ordner Dokumente“.
(8) Apple-Programme werden über die Kennung von Apple geöffnet, nicht über den Namen: Die App heißt je nach Sprache
des Macs „Notizen“ oder „Notes“. Microsoft-Programme, Chrome, Spotify und WhatsApp über den Namen.

**Grenzen:** (1) **Alles ist nur gegen einen nachgebauten Mac geprüft**: Statt `/usr/bin/open` läuft in den
Prüfungen ein kleines Programm, das mitschreibt, womit es aufgerufen wurde. Ob die Kennungen und Namen auf Benedikts
Mac stimmen und was das echte `open` bei einem nicht installierten Programm meldet, zeigt erst Prüfliste Teil AB.
(2) JARVIS erfährt nur, ob der Mac den Auftrag angenommen hat, nicht, ob das Fenster wirklich vorn ist. (3) Scheitert
das Öffnen, sagt JARVIS „Ich konnte … nicht öffnen. Vielleicht ist das Programm auf diesem Mac nicht installiert.“;
den wahren Grund kennt er nicht. (4) Antwortet der Mac zehn Sekunden
lang nicht, sagt JARVIS, dass er nicht weiß, ob das Programm offen ist. (5) In den ersten Augenblicken nach dem Laden
der Seite, bevor die Einstellungen da sind, kennt das Gespräch die Liste noch nicht; ein Zuruf in diesem Moment geht
wie früher weiter. Nicht nachgestellt. (6) Ein eigenes Programm, dessen Name nur aus einem Füllwort besteht („Bitte“,
„Kurz“), trifft der feste Befehl nicht; mit dem Knopf in den Einstellungen geht es auf.

### Testergebnisse Schritt H2.1 (16. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1190 Tests: 1190 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 44). Am Mac wären es rechnerisch vier weniger (zwei der neuen Tests stellen „kein Mac“ nach und werden dort übersprungen; nicht dort gelaufen) |
| Handprüfung „Programme am Mac“ | Mit dem endgültigen Stand zweimal gelaufen (einmal nach den Gegenproben, einmal im Sammellauf), zweimal bestanden (11 Schritte, 25 Sekunden). Beide Bilder angesehen (die Liste; das Gespräch mit „Ich konnte Spotify nicht öffnen …“ und „Safari ist … ausgeschaltet.“) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 30 Handprüfungen bestanden**, in drei Teilen gestartet (14, 10 und 6; zusammen rund 17 Minuten) |
| Tests zuerst | Die Regeln und die Tests gegen den nachgebauten Mac sind vor dem Code geschrieben und waren rot. Auch die acht Korrekturen aus dem Code-Review bekamen erst einen roten Test |
| Gegenproben (absichtlich eingebaute Fehler) | 51 eingebaute Fehler: 14 im Browser (je eigener Bau), 21 an den Regeln, 16 gegen den nachgebauten Mac. **49 sofort entdeckt**, im Browser alle im gemeinten Schritt. Zwei erst nach Schärfen, dann entdeckt: (1) „ein falscher Typ in der Einstellungsdatei bringt die Liste durcheinander“ (die Tests gegen den nachgebauten Mac fingen es, der Regeltest nicht; er prüft jetzt auch eine Zahl und ein Objekt an der Stelle der Liste); (2) „ein neu eingetragenes Programm bleibt still ausgeschaltet“ (der Fall trat nur ein, wenn der alte Schalter noch in der Datei stand; dafür gibt es jetzt einen eigenen Test). Danach Quelltext wie vorher (verglichen), sauberer Bau, 11 Schritte bestanden |
| Code-Review (mittlere Stufe, vor dem Commit) | Zehn Hinweise, acht umgesetzt: eigene Programme mit einem Artikel oder Füllwort im Namen („App Store“, „Die Zeit“) wurden nie getroffen; ein eigener Name konnte ein Wort von JARVIS kapern („Mail“) oder ein Apple-Programm unter englischem Namen doppeln („Notes“); „Ordner Bilder“ als eigener Name; jeder Fehler hieß „nicht gefunden“; eine von Hand geänderte Einstellungsdatei mit falschen Typen; ein falscher Kommentar; Namen mit Klammern und Ausrufezeichen waren verboten; ein abgelehnter Name schrieb die Einstellungen trotzdem neu. Bewusst gelassen: das Audit-Log wird nach dem Öffnen geschrieben und abgewartet (wie im Gateway), und zwei kleine Hilfsfunktionen stehen ähnlich schon bei Kalender und Mitteilung |
| Sicherheitsprüfung (von Hand) | Geöffnet wird nur an einer Stelle, ohne Shell, mit festen Argumenten; die Seite und das Modell schicken nur eine Kennung, nie Name oder Pfad; ein eigener Name kann weder ein Pfad noch ein Schalter für den Befehl sein (beginnt mit Buchstabe oder Ziffer, kein Schrägstrich, kein Doppelpunkt); von Hand in die Einstellungsdatei geschriebene Pfade werden übergangen; die neue Schnittstelle prüft Host, Herkunft und den eigenen Header wie alle anderen; die Meldung des Macs wird nie gelesen oder angezeigt; im Audit-Log steht der Name aus der Liste, nie der angefragte Text; über Telegram lehnt das Gateway ab; ein Modell, das einer eingeschleusten Anweisung folgt (Terminal, ein Pfad, ein ausgeschaltetes Programm), bekommt eine Absage und der Mac keinen Aufruf. Keine neuen Daten gehen hinaus |
| Nicht geprüft | **der Mac und das echte `open`**: ob die 19 Programme und 4 Ordner wirklich aufgehen, ob die Kennungen und Namen stimmen, Verhalten bei nicht installierten Programmen; der gesprochene Zuruf mit echtem Mikrofon; Safari; die Grenzen 2 und 5 |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** neu R-27 (Programme öffnen) in
`docs/jarvis-2.0/02-risiken.md`. **Neue laufende Kosten:** keine.

## Bereich I – Azure vorbereiten

Einzelheiten und die Anleitung für Benedikt und die IT: [docs/jarvis-2.0/09-azure-vorbereitung.md](docs/jarvis-2.0/09-azure-vorbereitung.md).

**In Azure ist nichts angelegt, nichts gebucht, und es gibt keine Kosten.** JARVIS hat keinen Zugang zu einem
Azure-Konto. Alles in diesem Bereich ist Vorbereitung im Programm und auf dem Papier.

### Schritt I1: Projektgedächtnis in PostgreSQL, Claude-Zugang an einer Stelle, Anleitung (14. November 2026)

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| I1.1 Zweite Umsetzung der Speicherschicht des Projektgedächtnisses mit PostgreSQL; eingeschaltet nur mit `JARVIS_PROJEKTE_DB`, sonst bleibt die Datei | Testbereit (gegen PostgreSQL 16.15 in der Sandbox, **nicht in Azure**) | `src/lib/server/projekte/pg-speicher.ts`, `schnittstelle.ts`; `test/hand/postgres-rauch.ts` |
| I1.2 Feste Regeln der Datenbank-Anbindung: außerhalb dieses Rechners immer verschlüsselt mit geprüftem Zertifikat; Kennwort nur in der Umgebung, nie in Meldung, Anzeige oder Protokoll; feste Meldungen mit Kennung; kein stilles Ausweichen auf die Datei; geringste Rechte reichen | Testbereit | `test/module/projekte-datenbank.test.ts` (16), Handprüfung Schritte 9b und 9d |
| I1.3 Änderungen nacheinander, auch bei zwei Prozessen an einer Datenbank: Transaktion unter einer Sperre, Warteschlange je Prozess, Frist von 20 Sekunden statt endlosem Warten | Testbereit | Handprüfung Schritte 6, 7 und 9c |
| I1.4 Umzug von einem Speicher in den anderen (`kopiereSpeicher`): nur lesen an der Quelle, nur in ein leeres Ziel, nur ganz | Testbereit; **wird von nichts aufgerufen**, ein echter Umzug braucht Benedikts Ansage | `src/lib/server/projekte/umzug.ts` |
| I1.5 Die Ansicht „Projekte“ sagt, wo das Gedächtnis liegt; ist der Speicher gestört, weiß JARVIS das im Gespräch und rät nichts | Testbereit | `ablageSatz`, Kontextzeile in `brain.ts`; `test/module/projekte.test.ts` (2 neue) |
| I1.6 Verbindung zu Claude an genau einer Stelle; jede Rolle behält ihre Wartezeit und Wiederholungen | Testbereit | `src/lib/server/claude.ts`, `test/regeln/claude-zugang.test.ts` (3); `browser-rauch.ts` läuft weiter durch |
| I1.7 Anleitung: was zentral laufen kann und was am Mac bleibt, Bausteine in Azure, Claude direkt oder über Foundry, fehlende Anmeldung, Daten, Reihenfolge, Kosten ohne erfundene Zahlen | Abgeschlossen (Dokument) | 09-azure-vorbereitung.md; Angaben zu Azure am 14.11. auf Microsoft Learn nachgelesen, sechs Seiten, Liste im Dokument |
| I2 Anmeldung über Entra ID und Rechte je Person | Offen | größter Teil vor einem Umzug; erst nach Benedikts Entscheidung, ob JARVIS zentral laufen soll |
| I3 Übrige Daten (Einstellungen, Audit-Log, Gateway, Kosten, Zeitplan und weitere) auf Datenbank und Blob Storage, Geheimnisse in den Key Vault | Offen | 18 von 19 Dateien schreiben weiter auf die Platte |
| I4 Zweiter Zugang zu Claude über Microsoft Foundry | Offen | drei Funktionen fehlen dort oder sind eingeschränkt (Ausweichmodell, neuere Websuche, Schlüsselprüfung); siehe Anleitung |
| I5 Container, Testumgebung, Betrieb in Azure | Blockiert | Abonnement, IT, Budget, Freigabe (Frage 3) |

**Eigene Entscheidungen (Benedikt hat sie noch nicht gesehen):** Die Tabellen tragen den ganzen Datensatz als
JSON statt einer Spalte je Angabe (der Entwurf vom 13. November ist damit ersetzt). Die Adresse der Datenbank
kommt nur aus der Umgebung, nicht aus den Einstellungen der Oberfläche. Für Foundry ist nichts gebaut, weil es
sich hier nicht prüfen lässt. Neu im Programm ist das Paket `pg` (MIT-Lizenz, keine Kosten, `npm audit` meldet
für die mitgelieferten Pakete weiter 0 Schwachstellen).

### Testergebnisse Schritt I1 (14. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, PostgreSQL 16.15)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **732 Tests: 732 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 21: Datenbank-Adresse, Wahl des Speichers, bereinigter Text, Umzug 16; Claude-Zugang 3; gestörter Speicher im Gespräch 2) |
| Tests zuerst | Die neuen Tests liefen vor dem Bau rot (Module fehlten), und nach der Durchsicht noch einmal rot (8 Tests), bevor die Korrekturen kamen |
| `npx next build` | erfolgreich; weiter die vier bekannten Hinweise von Turbopack, keine neuen |
| Handprüfung gegen ein echtes PostgreSQL (`postgres-rauch.ts`, eigenes leeres PostgreSQL 16.15 auf 127.0.0.1) | 16 Schritte in Ordnung: Tabellen entstehen einmal, auch bei zwei gleichzeitigen Starts; gleicher Inhalt und gleiche Reihenfolge; Neustart; Abbruch in der Transaktion; verwaister Eintrag abgelehnt und ein verschluckter Fehler geht nicht als Erfolg durch; 40 Einträge und 30 Zählschritte aus zwei Prozessen, keiner verloren; einzelne Änderung wartet auf die laufende Transaktion; von 305 entschiedenen Vorschlägen bleiben 300; Umzug aus der Datei und Verweigern des zweiten; NUL und halbes Zeichenpaar bereinigt; Konto ohne Anlegerecht reicht, fehlende Tabellen geben 42501; lange gehaltene Sperre (Lesen geht, 55P03 nach der Frist); gekappte Verbindung mitten in der Transaktion; fremde Adresse ohne Verschlüsselung oder mit selbst ausgestelltem Zertifikat: keine Verbindung, auch mit `sslmode=disable`; Ausfall und Wiederkehr der Datenbank; **alle 40 Tests aus `test/module/projekte.test.ts` gegen diese Datenbank** (vier davon prüfen nur die Datei) |
| Handprüfung im Browser (Chromium, gebauter Server) | `projekte-rauch.ts` mit der Datei und mit `--postgres`: Vorschlag übernehmen, ändern, ablehnen, Eintrag korrigieren, zurückziehen; die Seite nennt den richtigen Speicherort; mit Datenbank entsteht keine Datei. `browser-rauch.ts` und `agenten-rauch.ts` laufen weiter durch |
| Gegenproben (28 absichtlich eingebaute Fehler, Tests müssen fehlschlagen) | 28 erkannt. Zwei davon erst nach geschärften Tests: Das Kopieren in ein gefülltes Ziel fiel nur über den zweiten Schutz auf (jetzt prüft der Test die Meldung des ersten), und der Abriss der Verbindung wurde vom Ablauf der Handprüfung nicht mehr sicher ausgelöst (jetzt kappt die Prüfung die Verbindung gezielt mitten in einer Transaktion) |
| Dabei gefundener Fehler | **Riss die Verbindung zur Datenbank ab, während JARVIS sie für eine Änderung hielt, beendete das den ganzen Server** (ein Ereignis ohne Zuhörer). Gefunden von der Handprüfung gegen das echte PostgreSQL, behoben, mit eigener Prüfung und Gegenprobe |
| Code-Review (Skill `code-review`, Stufe mittel) | zehn Punkte, alle eingearbeitet: Text mit NUL oder einem zerschnittenen Emoji lehnte die Datenbank ab; jeder erste Zugriff brauchte das Recht, Tabellen anzulegen; Kennungen für Zertifikatsfehler wurden zu „unbekannt“ und nichts stand im Protokoll; wartende Änderungen belegten alle Verbindungen, sodass auch Lesen scheiterte; fiel der Speicher nach einem gelungenen Vorschlag aus, ging die ganze Antwort verloren; ein gestörter Speicher blieb im Gespräch unbemerkt; der Umzug scheiterte an Angaben ohne Wert; „nicht auf diesem Mac“ stand auch bei einer Datenbank auf diesem Rechner; die Handprüfung räumte bei einem frühen Fehler nicht auf; die Grenze von 300 Vorschlägen stand an zwei Stellen |
| Sicherheitsprüfung (von Hand) | alle Anweisungen an die Datenbank mit Platzhaltern, keine zusammengesetzten Texte; Kennwort und Benutzer stehen in keiner Meldung und nicht in der Anzeige (Test mit erkennbarem Kennwort); der Text der Datenbank geht nie an die Seite oder das Modell, nur ins Protokoll des Servers und dort ohne die Einzelheiten zur betroffenen Zeile; die Kennung der Störung geht nicht an das Modell (Test); keine Schlüssel im Diff; `npm audit --omit=dev`: 0 Schwachstellen vor und nach dem neuen Paket |
| Bei Microsoft nachgelesen (Microsoft Learn, 14.11.) | Anmeldung vor Container Apps und ihre Kopfzeilen, Geheimnisse aus dem Key Vault, Entra-Anmeldung und TLS bei Azure Database for PostgreSQL, unveränderlicher Blob-Speicher, Claude in Microsoft Foundry |
| Gegen Azure geprüft | **nein, nichts.** Nicht geprüft sind insbesondere: ob JARVIS dem Zertifikat der Azure-Datenbank von Haus aus vertraut, Anmeldung ohne Kennwort, andere PostgreSQL-Versionen, Geschwindigkeit über das Netz, Sicherung der Datenbank |
| Nicht geprüft | echter Mac (für diesen Schritt gibt es dort nichts zu prüfen: Ohne die Umgebungsvariable ändert sich nichts außer einem Satz in der Ansicht Projekte); der Schritt zur Verschlüsselung der Handprüfung braucht die Adresse 127.0.0.2 und läuft so nur unter Linux |

**Was gesichert wurde:** siehe „Sicherung“. **Offene Probleme:** keine bekannten Fehler. **Bekannte Grenzen:**
Fällt die Datenbank aus, lassen Hinweise am Tag, Morgenbriefing und Vorbereitung vor Besprechungen die
Projekte ohne eigene Meldung weg (wie bisher bei einer beschädigten Datei); die Ansicht Projekte und das
Gespräch melden es. Die Sperre lässt nur eine Änderung zur Zeit zu. Nur das Projektgedächtnis ist umgestellt.
**Sicherheitsrisiken:** neu R-26 in [02-risiken.md](docs/jarvis-2.0/02-risiken.md) (Kennwort in der Umgebung,
Inhalte lesbar für die Verwaltung der Datenbank, keine Benutzer in JARVIS). **Neue laufende Kosten:** keine.

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
| J1.6 Anderer Anbieter als Anthropic austauschbar | Offen; vorbereitet in Schritt I1 | die Verbindung zu Claude wird seit I1 an einer Stelle aufgebaut (`src/lib/server/claude.ts`, Test `claude-zugang.test.ts`). Ein zweiter Zugang (Claude über Microsoft Foundry) ist nicht gebaut; was dabei anders wäre, steht in 09-azure-vorbereitung.md |
| J1.7 Wiederherstellungstests (Sicherung zurückspielen und prüfen) | Testbereit | gebaut in Schritt J2 (unten): `scripts/wiederherstellen-pruefen.sh`, `test/module/sicherung.test.ts` (32) |

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


### Schritt J2: Sicherung zurückspielen und prüfen (14. November 2026)

**Warum:** Eine Sicherung, die noch nie zurückgespielt wurde, ist eine Hoffnung. Bisher prüfte `sichern.sh`
nur, dass sich das Git-Bündel klonen lässt; das ZIP wurde gar nicht geprüft, und eine neue Sicherung
überschrieb die alte, bevor feststand, dass sie taugt.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J2.1 `scripts/wiederherstellen-pruefen.sh <Ordner>`: Bündel unbeschädigt und klonbar, Commit wie in der letzten Zeile von `sicherungen.txt`, Geschichte heil (`git fsck`); ZIP entpackt und Datei für Datei gleich dem Commit | Testbereit | 13 Tests in `test/module/sicherung.test.ts`: jede Art Schaden wird beim Namen genannt (abgeschnittenes Bündel, ein umgekipptes Byte, unlesbarer Kopf, falscher Commit, ein geänderter Buchstabe im ZIP, Datei zu viel, abgeschnittenes ZIP, fehlende Datei) |
| J2.2 Vollständig: aus dem entpackten ZIP allein Pakete installieren (`npm ci`) und `npm run pruefen`; nur „alle bestanden, nichts ausgelassen“ zählt | Testbereit | mit der echten Sicherung gelaufen: **732 von 732 Tests im wiederhergestellten Stand** (Stand `5432fe7`, 77 Sekunden). 7 Tests an einem Wegwerf-Projekt |
| J2.3 `scripts/sichern.sh`: neue Sicherung entsteht in einem eigenen Unterordner, wird dort geprüft und ersetzt die alte erst danach; an ihrem Platz wird sie noch einmal geprüft. Scheitert etwas, liegt am Ende wieder die alte Sicherung im Ordner | Testbereit | 12 Tests: Prüfung scheitert vorher, nachher, Verschieben bricht an jeder der vier Stellen ab, allererste Sicherung scheitert, Liste ohne Zeilenumbruch, kein Zweig ausgecheckt, Reste eines abgebrochenen Laufs |
| J2.4 Sicherung der Daten in `~/.jarvis` (Gedächtnis, Projekte, Einstellungen, Schlüssel) | **Offen; braucht Benedikts Freigabe** | Diese Sicherung enthält nur das Programm. Eine Sicherung der Daten würde Zugangsdaten anfassen; bis dahin schützt sie nur Time Machine am Mac |

**Grenzen:** Die Prüfung liest die Sicherung nur und arbeitet in einem Wegwerf-Ordner. Der vollständige Lauf
braucht Netz (für `npm ci`) und einige Minuten. Er beweist, dass sich das **Programm** wiederherstellen lässt,
nicht die Daten. Ob die Sicherung auf dem Mac ankommt, hängt weiter davon ab, dass Benedikt das ZIP
herunterlädt oder GitHub wieder geht; die Sandbox ist kein dauerhafter Speicher.

### Testergebnisse Schritt J2 (14. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, git 2.43)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **764 Tests: 764 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 32: Sicherung prüfen 13, vollständig zurückspielen 7, sichern 12) |
| Echte Sicherung vollständig zurückgespielt | Bündel unbeschädigt, Commit `5432fe7` wie in `sicherungen.txt`, 59 Commits Geschichte; ZIP enthält dieselben 300 Dateien, Byte für Byte; `npm ci` in Ordnung; Lint, Typprüfung und 732 von 732 Tests im wiederhergestellten Stand |
| Tests zuerst | Die Tests für das neue Verhalten liefen vor dem Bau rot (erst 5, nach der Durchsicht noch einmal 11). Dabei gefunden: `git bundle verify` liest nur den Kopf, ein abgeschnittenes Bündel fällt erst beim Klonen auf; ein Lauf ohne Testzahlen brach ohne Meldung ab; eine Liste ohne Zeilenumbruch am Ende ebenso |
| Gegenproben | 32 absichtlich eingebaute Fehler in den beiden Skripten: 31 bemerkt. Der eine (Fehler beim Verschieben des Bündels wird übergangen) ändert am Ergebnis nichts: Die Prüfung im Ordner fängt denselben Fall, die alte Sicherung wird zurückgelegt |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde. Eingearbeitet: Ordner ohne ganzen Pfad galt als beschädigt; das Tauschen in drei Schritten konnte eine gemischte Sicherung hinterlassen (jetzt Zurücklegen); neue Zeile hing an der alten, wenn der Zeilenumbruch fehlte; `bc` als unnötige Abhängigkeit; kein ausgecheckter Zweig; liegen gebliebene Arbeitsordner; Tests erbten `GIT_DIR`; Unterlagen. Bewusst nicht geändert: Die doppelte Prüfung bleibt (sie dauert 0,6 Sekunden und prüft, was wirklich im Ordner liegt); das ZIP wird weiter mit allen Dateien des Commits verglichen (ein ZIP, dem Dateien fehlen, soll auffallen) |
| Sicherheitsprüfung (von Hand) | Die Skripte lesen keine Einstellungen und keine Schlüssel und senden nichts; `npm ci` lädt dieselben Pakete wie jede Installation. Zweig und Commit aus `sicherungen.txt` gehen nur als einzelne, in Anführungszeichen gesetzte Angaben an git. Gelöscht wird nur in eigenen Wegwerf-Ordnern und in Arbeitsordnern mit dem Namen `.neu-<Zahl>` im Sicherungsordner |
| Nicht geprüft | **am Mac**: Die Skripte sind für die Bash des Mac geschrieben (keine neueren Sprachmittel), dort aber nicht gelaufen. Windows. Eine Sicherung der Daten in `~/.jarvis` gibt es nicht (J2.4) |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.


### Schritt J3: Einstellungen in einem Zug lesen, ändern und speichern (14. November 2026)

**Warum:** Jede Stelle, die Einstellungen speichert, las bisher erst alle Einstellungen, prüfte dann (ein
Schlüssel wird beim Anbieter getestet, eine Abschiedsnachricht geht ans Handy; das dauert Sekunden) und schrieb
am Ende ihren alten Stand ganz zurück. Was in der Zwischenzeit woanders gespeichert wurde, war wieder weg: ein
Schalter, die Kopplung des Handys, oder die Anmeldung bei Microsoft 365, die sich im Hintergrund erneuert (der
alte Anmeldeschlüssel gilt dann nicht mehr, du müsstest dich neu anmelden). Seit D1 gab es dafür
`aendereConfig`, benutzt hat es nur der Abschnitt Microsoft 365.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J3.1 Die Einstellungsseite: Prüfen und Speichern stehen jetzt in `src/lib/server/einstellungen.ts` (vorher in der Schnittstelle, dort nicht prüfbar). Jede der 22 Aktionen prüft erst und ändert dann den Stand von dem Augenblick, in dem gespeichert wird | Testbereit | `test/module/einstellungen.test.ts` (22) |
| J3.2 Handy koppeln und trennen, Edelmetalle, Lagebild, Kalenderziel: ebenso | Testbereit | derselbe Test; `speichereKalenderZiel` in `calendar.ts` |
| J3.3 Stimme (ElevenLabs): prüfen, dann den Abschnitt ändern, wie er dann ist. Wurde der Schlüssel inzwischen entfernt oder getauscht, gilt eine Wahl von Stimme, Modell, Limit oder Schalter nicht mehr. Ins Audit-Log kommt, was sich wirklich geändert hat | Testbereit | `test/module/stimme.test.ts` (21) |
| J3.4 Umzug der Zugangsdaten in den Schlüsselbund und zurück: umgestellt wird der Stand von jetzt. Ein Schlüssel, der während des Umzugs geändert wird, landet im Schlüsselbund; ein entfernter Abschnitt hinterlässt dort nichts; scheitert das Umstellen am Schluss, wird alles zurückgenommen; hin und zurück laufen nie zugleich | Testbereit, **nur gegen den nachgebauten Schlüsselbund** | `test/module/zugangsdaten.test.ts` (21, davon 8 neu). Am echten Schlüsselbund weiter nur am Mac prüfbar (Prüfliste). Ein Umzug findet weiter nur auf deinen Knopfdruck statt |
| J3.5 Im Programm speichert niemand mehr einen ganzen, vorher gelesenen Stand | Testbereit | Regeltest: `writeConfig` benutzt in `src` nur noch `config.ts` selbst |

**Dabei gefunden und behoben:** (1) Beim Trennen des Handys ging der Schalter „Hinweise am Tag“ verloren (er
fehlte in der Liste dessen, was beim Trennen bleibt). (2) Im Schlüsselbund-Betrieb schrieb JARVIS einen leeren
Wert als „Geheimnis“ in den Schlüsselbund, wenn du ein Tagesbudget für X eingestellt hast und der xAI-Schlüssel
nur aus der Umgebung kam. (3) Eine Mail-Einstellung ohne Angaben ließ die Schnittstelle abstürzen statt eine
Meldung zu geben.

**Eigene Entscheidungen:** Zwei Änderungen am selben Abschnitt zur selben Zeit (zwei Fenster): Die spätere gilt,
aber nur für diesen Abschnitt. Der Eintrag im Audit-Log zur Stimme wird nach dem Speichern geschrieben statt
davor, damit er stimmt; scheitert das Schreiben des Logs, ist der Schalter trotzdem gespeichert.

**Grenzen:** Geschützt ist ein laufender JARVIS gegen sich selbst. Zwei gleichzeitig laufende JARVIS auf
demselben Mac (zwei gestartete Server) können sich weiter überschreiben; dagegen gibt es keine Sperre über die
Datei (bei der Handprüfung gesehen: Eine Änderung aus einem zweiten Programm war nach dem nächsten Speichern des
Servers wieder weg). Wer `config.json` von Hand ändert, während JARVIS speichert, ebenso.

### Testergebnisse Schritt J3 (14. November 2026, Cloud-Sandbox, Linux, Node 22.23.4)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **795 Tests: 795 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 31: Einstellungen 22, Zugangsdaten 8, Stimme 1) |
| Tests zuerst | Die alte Logik wurde zuerst unverändert in das neue Modul verschoben; dagegen liefen 9 der ersten 17 Tests rot (jede Stelle verlor nachweislich Änderungen), die 4 neuen Tests zum Umzug der Zugangsdaten ebenso. Nach der Durchsicht noch einmal 8 Tests rot, bevor die Korrekturen kamen |
| Gegenproben | 36 absichtlich eingebaute Fehler: 36 bemerkt, 0 nicht bemerkt (unter anderem: Speichern nicht mehr in einem Zug, die Einstellungsseite schreibt ihren alten Stand, entfernter Bot oder Schlüssel kommt zurück, Trennen nimmt ein neu gekoppeltes Handy mit oder verliert Schalter, Stimme gilt für ein anderes Konto, Umzug stellt den alten Stand um, Rückweg trotz gesperrtem Schlüsselbund, gescheitertes Umstellen lässt Einträge im Schlüsselbund, hin und zurück zugleich) |
| `npx next build` | erfolgreich, mit den vier bekannten Warnungen |
| Handprüfung `einstellungen-rauch` (Chromium, gebauter Server, nachgebauter Claude und nachgebautes Telegram) | alle Schritte in Ordnung: fremde Seiten abgewiesen; sechs abgelehnte Eingaben mit klarer Meldung; Name und Rückfrage-Grenze über die Seite gespeichert; sechs Änderungen im selben Augenblick (Bot-Schlüssel mit langsamer Prüfung, Claude-Schlüssel, Name, Grenze, Lagebild, Edelmetalle) stehen alle in der Datei; das Handy koppelt sich über den Code, währenddessen werden Schalter umgelegt, beides bleibt; Handy getrennt, während der Name geändert wird, Schalter bleiben; kein Schlüssel im Seitentext. Dazu `stimme-rauch` (Stimme einrichten und schalten über die Seite): alle Schritte in Ordnung |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde. Eingearbeitet: Die Stimme setzte ihren alten Abschnitt in den frischen Stand ein und holte so einen entfernten Schlüssel zurück (jetzt wie alle anderen: prüfen, dann am frischen Stand ändern); das Budget für X legte einen entfernten Abschnitt leer wieder an; der Umzug in den Schlüsselbund hatte für seinen letzten Schritt keine Rücknahme; das Aufräumen danach lief außerhalb der Reihe und konnte einen eben gespeicherten Eintrag löschen; hin und zurück konnten zugleich laufen; das Trennen nahm auch ein inzwischen neu gekoppeltes Handy mit; Mail ohne Angaben. Bewusst nicht geändert: Telegram entfernen speichert weiter in zwei Schritten (trennen, dann entfernen; der Schlüssel ist danach ohnehin weg); `writeConfig` bleibt für Tests und die erste Einrichtung bestehen, mit dem Regeltest als Wächter |
| Sicherheitsprüfung (von Hand) | Keine neue Stelle, an der ein Schlüssel gelesen, gezeigt oder gesendet wird. Das neue Modul gibt dieselben Meldungen wie vorher zurück, nie einen Wert; ins Audit-Log gehen weiter nur Namen. Der Umzug der Zugangsdaten räumt bei einem Fehler jetzt auch im letzten Schritt auf; gelöscht wird im Schlüsselbund nur unter dem Namen von JARVIS und nur, solange die Datei noch im Klartext-Betrieb ist |
| Nicht geprüft | **der echte Schlüsselbund am Mac**; echte Dienste (alles gegen Nachbauten); zwei gleichzeitig laufende JARVIS; Safari |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen; eines weniger (verlorene
Änderungen an Einstellungen, darunter die Anmeldung bei Microsoft 365). **Neue laufende Kosten:** keine.

### Schritt J4: alle Handprüfungen im Browser mit einem Befehl (15. November 2026)

**Warum:** Inzwischen gibt es 17 Handprüfungen, die JARVIS im echten Browser durchklicken (Netzschleuse,
Browser-Agent, PDF, Projekte, Routinen, Agenten, Stimme, Edelmetalle, Post, Microsoft 365, Einstellungen,
Mitteilung am Mac, Gedächtnis, Risiken, Marktlage, PostgreSQL, Projekte mit PostgreSQL). Bisher lief nach
einem Paket nur die Prüfung, die zum Paket gehörte. Ob ein älterer Raum dabei kaputtging, fiel erst auf, wenn
jemand daran dachte, seine Prüfung von Hand zu starten.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J4.1 Ein Befehl: `npm run handpruefung -- [Ordner] [--ohne-bauen] [--nur name,name]` baut JARVIS einmal und lässt alle Prüfungen nacheinander laufen, jede höchstens sechs Minuten. Im Ordner liegen danach die Bildschirmfotos je Prüfung, ein Protokoll je Prüfung und `ergebnis.json` | Testbereit | `test/hand/alle.ts`; drei vollständige Durchläufe (unten) |
| J4.2 Ehrliches Ergebnis: „Alle 17 bestanden“ und Code 0 nur, wenn alle gelaufen sind und bestanden haben. Ein Fehlschlag: Code 1, mit Namen und Grund. Etwas nicht geprüft (kein Chrome, kein PostgreSQL, Auswahl mit `--nur`): Code 2, und es steht da, was fehlt. Zwei ältere Prüfungen (Netzschleuse, Browser-Agent) enden immer mit Code 0; bei ihnen zählt, was sie ausgeben | Testbereit | `test/helfer/handpruefungen.ts`, `test/regeln/handpruefungen.test.ts` (24) |
| J4.3 Nichts wird still übergangen: Eine neue Datei `test/hand/*-rauch.ts`, die nicht in der Liste steht, lässt `npm test` scheitern. Ein Tippfehler im Aufruf (`--nur` mit unbekanntem Namen, unbekannte Angabe, `JARVIS_CHROME` zeigt ins Leere) bricht ab | Testbereit | derselbe Test |
| J4.4 Aufräumen: Nach jeder Prüfung, nach einem Abbruch wegen der Zeit und bei Strg+C beendet der Sammellauf, was von der Prüfung noch läuft (ihr Server in eigener Prozessgruppe, Chrome) | Testbereit, **nur unter Linux** | `test/helfer/prozessgruppe.ts`, `test/module/prozessgruppe.test.ts` (7 unter Linux); beides absichtlich ausgelöst (unten). Am Mac gibt es `/proc` nicht; dort sagt der Sammellauf nach einem Abbruch, dass er es nicht feststellen kann |
| J4.5 Gebaut wird nur, wenn eine Prüfung läuft, die den gebauten Server startet | Testbereit | Regeltest: genau die Prüfungen mit `next start` tragen „bau“ |

**Dabei gefunden und behoben: die Prüfung des persönlichen Gedächtnisses war wackelig.** Im ersten Sammellauf
schlug sie fehl, einzeln bestand sie meist. Sie startet JARVIS dreimal neu, um zu zeigen, dass eine von außen
veränderte Datei erst nach einem Neustart gilt. Ursache, mit Belegen: Der gebaute Server (`next start`) hört
nach dem Signal zum Beenden zwar sofort auf, neue Verbindungen anzunehmen, wartet dann aber, bis alle offenen
Verbindungen von selbst enden. Die Seite im Browser fragt weiter ab und hält ihre Verbindungen damit offen. Der
alte Prozess lebte deshalb weiter (über 20 Sekunden gemessen) und beantwortete die Anfragen der offenen Seite
mit seinem alten Gedächtnis im Speicher, während auf demselben Port schon der neue lief. Die Prüfung wartet
jetzt, bis vom alten Server kein Prozess mehr läuft, und beendet ihn nach zwei Sekunden hart. Meine erste
Vermutung dazu hatte ich mit einem zu groben Versuch (antwortet der Port noch?) für widerlegt gehalten; erst
der Blick auf die Prozesse hat sie bestätigt.

**Ist JARVIS am Mac betroffen? Nein.** Am Mac startet JARVIS mit `next dev` (`start-jarvis.command`); dort
schließt Next beim Beenden alle Verbindungen selbst (nachgelesen in `node_modules/next/dist/server/lib/start-server.js`,
nicht am Mac geprüft). **Für einen zentralen Betrieb gilt es** (dort liefe `next start`): Nach dem Signal zum
Beenden kann der alte Prozess weiterleben, solange ein Browserfenster offen ist. Das steht jetzt in
`docs/jarvis-2.0/09-azure-vorbereitung.md` bei den bekannten Grenzen.

**Eigene Entscheidungen:** Sechs Minuten je Prüfung (die längste braucht hier 71 Sekunden). Die Prüfungen
laufen nacheinander, nicht gleichzeitig: Sie teilen sich Ports und den gebauten Stand. Ausgelassen zählt nie
als bestanden, auch nicht bei einer absichtlichen Auswahl.

**Grenzen:** (1) Das Aufräumen nach einem Abbruch geht nur unter Linux. (2) Die anderen zwölf Prüfungen mit
Server beenden ihn am Ende weiter mit einem einfachen Signal und warten nicht; das reicht, weil danach Seite und
Prüfung enden, und der Sammellauf räumt unter Linux ohnehin nach. Ein gemeinsamer Helfer für Start und Stopp
aller Prüfungen wäre sauberer und ist offen. (3) Ohne `JARVIS_CHROME` fallen alle Prüfungen im Browser aus,
auch die zwei, die ein installiertes Chrome selbst fänden. (4) Der Sammellauf prüft, was die Prüfungen prüfen:
Für die Räume Trading (Spielgeld-Desk), Aufgaben und Dokumente gibt es noch keine Handprüfung im Browser.
(5) Alles läuft gegen Nachbauten; echte Dienste, Safari und der Mac sind damit nicht geprüft.

### Testergebnisse Schritt J4 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **969 Tests: 969 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 31: Auswertung des Sammellaufs 24, Prozessgruppen 7). Am Mac wären es rechnerisch 967 (nicht dort gelaufen): Drei der sieben Tests zu Prozessgruppen brauchen `/proc`, dafür gibt es dort einen eigenen; unter Windows gibt es die sieben nicht |
| Sammellauf, erster Durchlauf | **16 von 17 bestanden, 1 fehlgeschlagen** (Gedächtnis, siehe oben); Code 1, mit Namen und Grund |
| Gedächtnis-Prüfung einzeln, vor der Korrektur | bei der Suche (mit zusätzlicher Ausgabe in der Prüfung) 8 von 13 Läufen fehlgeschlagen, immer beim dritten Neustart; in jedem antwortete der alte Server nach dem Signal weiter. In dem Lauf, in dem ich genauer hingesehen habe, wies er neue Verbindungen ab und antwortete nur noch auf der offenen |
| Gedächtnis-Prüfung einzeln, nach der Korrektur | 6 von 6 Läufen bestanden |
| Sammellauf, zweiter Durchlauf (nach der Korrektur) | **Alle 17 Handprüfungen bestanden**, Code 0 |
| Sammellauf, dritter Durchlauf (nach dem Code-Review) | **Alle 17 Handprüfungen bestanden**, Code 0; danach lief kein Prozess einer Prüfung mehr |
| Abbruch wegen der Zeit (Frist für den Versuch auf 4 Sekunden gesetzt, danach zurück auf 6 Minuten) | „nicht in der Zeit fertig geworden und abgebrochen“, Code 1; sechs noch laufende Prozesse der Prüfung beendet, der Port der Prüfung antwortet nicht mehr |
| Abbruch des Sammellaufs mittendrin (Signal wie Strg+C, während die Prüfung Microsoft 365 lief) | vorher 21 Prozesse und ein antwortender Server, danach keiner; kein Wegwerf-Ordner blieb liegen |
| Tippfehler in `JARVIS_CHROME` | bricht mit der Meldung ab, Code 1; nichts läuft |
| `--nur pdf,postgres` | kein Bau; 2 von 17 bestanden, „Nicht geprüft: 15 nicht ausgewählte“, Code 2 |
| Gescheiterter Bau (für den Versuch ohne `npx` im Pfad) | Code 1; ein altes `ergebnis.json` im Ordner ist ersetzt durch „Der Bau ist gescheitert; keine Handprüfung ist gelaufen“ |
| Tests zuerst | Für Prozessgruppen, Marke, nicht abgeholte Prozesse, Bau-Regel und Chrome-Pfad: Tests zuerst geschrieben und rot gesehen. Die Tests zu den Angaben des Aufrufs entstanden zusammen mit dem Code; für die übrigen ersten Tests der Auswertung ist nicht festgehalten, dass sie vorher rot liefen. Dafür die Gegenproben |
| Gegenproben | 53 absichtlich eingebaute Fehler: 52 bemerkt. Der eine nicht bemerkte (Ergebnis von vorn statt von hinten in der Ausgabe suchen) ändert am Ergebnis nichts: Beide Wege finden denselben Block |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde. Eingearbeitet (acht, zwei davon teilweise): Strg+C ließ Prüfung, Server und Chrome weiterlaufen; ein beendeter, noch nicht abgeholter Prozess galt als lebendig, das Beenden wäre in manchen Containern gescheitert; ein Fehler beim Aufräumen konnte den eigentlichen Fehler der Prüfung verdecken; nach einem gescheiterten Bau sah ein altes `ergebnis.json` aus wie neu; die Tests zu Prozessgruppen wären unter Windows gescheitert; gebaut wurde auch für Prüfungen, die keinen Server starten; ein Tippfehler in `JARVIS_CHROME` ließ still fast alles ausfallen (teilweise: die zwei Prüfungen, die Chrome selbst fänden, fallen ohne die Angabe weiter aus); die Dauer je Prüfung enthielt das Aufräumen (teilweise: der leere Profilordner entsteht weiter für jede Prüfung). Nicht eingearbeitet, als Grenze notiert: Aufräumen nur unter Linux; gemeinsamer Helfer für Start und Stopp aller Prüfungen |
| Sicherheitsprüfung (von Hand) | Nur Prüfwerkzeug, kein Code von JARVIS geändert. Beendet werden nur Prozesse, die der Lauf selbst gestartet hat: über ihre eigene Prozessgruppe oder über eine Marke in der Umgebung, die je Prüfung einmalig ist (Prozessnummer, Name, Zeit). Ein laufendes JARVIS am selben Rechner trägt die Marke nicht und bleibt unberührt (geprüft mit einem Prozess mit anderer Marke). Gelöscht wird im Zielordner nur `ergebnis.json`. Keine Schlüssel, kein Netz |
| Nicht geprüft | **der Mac** (kein `/proc`, anderes Chrome), Windows, echte Dienste, Safari |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

### Schritt J5: gemeinsamer Start und Stopp für alle Handprüfungen, neue Handprüfung für den Raum Trading (15. November 2026)

**Warum:** Zwei Grenzen aus J4. (1) Zwölf Handprüfungen starteten den gebauten Server jede für sich, mit je
einer eigenen Warteschleife, und beendeten ihn mit einem einfachen Signal, ohne zu warten. Lag von einem früheren
Lauf noch ein Server auf dem Port, antwortete der, und die Prüfung lief gegen den falschen Stand. (2) Für den
Raum Trading gab es keine Prüfung im Browser.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J5.1 Eine Stelle für Start und Stopp: `starteNext(port, umgebung)` startet nur auf einem freien Port; `bereit(adresse)` gilt erst, wenn der Server mit gutem Status antwortet und der eigene Prozess auch anderthalb Sekunden später noch läuft; `stop()` kommt erst zurück, wenn kein Prozess der Gruppe mehr läuft; `stopLeise()` meldet einen Fehler beim Beenden, statt den eigentlichen Fehler der Prüfung zu verdecken | Testbereit | `test/helfer/server.ts`, `test/module/handserver.test.ts` (12) |
| J5.2 Alle 13 Handprüfungen mit Server nutzen diese Stelle; keine startet den Server daran vorbei, und jede hat ihren eigenen Port | Testbereit | Regeltests in `test/regeln/handpruefungen.test.ts` (jetzt 26); Sammellauf unten |
| J5.3 Neue Handprüfung Trading: Start über den Knopf, Scan, Blockchain-Prüfung, Urteil des Chiefs, Rückfrage vor dem Kauf mit Nein und Ja, Kauf mit Spielgeld, Stop-Loss nach einem Kurssturz, Not-Aus | Testbereit, **nur gegen nachgebauten Markt und nachgebautes Claude** | `test/hand/trading-rauch.ts`; unten |

**Was die Prüfung Trading im Einzelnen zeigt:** Ohne den eigenen Header und von fremden Seiten startet niemand
den Handel (403). Vor dem Start steht „Kein echter Handel“ da, der Not-Aus ist gesperrt. Nach dem Start fragt
JARVIS vor dem Kauf des guten Coins; bis zur Antwort ist nichts gekauft. Der Coin, bei dem der Entwickler neue
Coins erzeugen kann, erreicht den Chief gar nicht; den zweiten lehnt der Chief ab. „Nein“: nichts gekauft. Ein
später aufgetauchter Coin, „Ja, kaufen“: Position mit 200 bis 500 $ (hier 471,20 $), das Spielgeld sinkt
entsprechend. Kurs auf 60 %: Der Stop-Loss verkauft (hier −195,12 $), die Position verschwindet von der Seite.
Not-Aus: danach kein Handel, keine offene Rückfrage und keine Anfrage an Claude mehr, obwohl ein neuer guter
Coin auftaucht.

**Eigene Entscheidungen:** (1) Die Rückfrage ab 100 $ ist in der Prüfung eingeschaltet (im Auslieferungszustand
kauft der Desk seit 30. Oktober ohne Rückfrage); so sind beide Wege, Nein und Ja, geprüft. (2) Nach dem Not-Aus
wartet die Prüfung doppelt so lange, wie der Desk vorher für einen neuen Coin gebraucht hat (gemessen 9,9
Sekunden, also 20), mindestens 8 Sekunden. Ein fester kurzer Wert hätte nichts bewiesen. (3) Die Bestätigung
nach der ersten guten Antwort kostet jeden Start anderthalb Sekunden; das ist der Preis dafür, einen fremden
Server nicht für den eigenen zu halten. (4) Die Prüfung der Stimme hat jetzt Port 3120 (vorher 3111 wie die Post).

**Grenzen:** (1) Die Prüfung Trading läuft gegen Nachbauten; echte Kurse, echte Blockchain-Abfragen und das
echte Claude sind damit nicht geprüft. Rohstoffe (Gold, Silber, Öl) und die Suche auf X kommen in ihr nicht vor.
(2) Geprüft wird nur an der IPv4-Adresse des Rechners, ob der Port frei ist. Hält ein anderer ihn nur über IPv6,
scheitert der eigene Start, und die Prüfung endet mit der Meldung dazu (nicht geprüft: Die Sandbox hat kein IPv6).
(3) Lässt sich ein Server am Ende nicht beenden, gilt die Prüfung trotzdem als bestanden; es steht in ihrer
Ausgabe, der Sammellauf räumt unter Linux nach, und der nächste Start auf dem Port bricht ab. (4) Für die Räume
Aufgaben und Dokumente gibt es weiter keine Handprüfung im Browser. (5) Der Mac, Windows und Safari sind nicht geprüft.

### Testergebnisse Schritt J5 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **983 Tests: 983 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 14: Start und Stopp des Servers 12, Regeln der Handprüfungen 2). Am Mac wären es rechnerisch 981 (nicht dort gelaufen) |
| Sammellauf mit Neubau, nach allen Änderungen | **Alle 18 Handprüfungen bestanden**, Code 0 (Trading 54 Sekunden, Microsoft 365 72) |
| Sammellauf nach der Umstellung, vor der Prüfung Trading | Alle 17 Handprüfungen bestanden |
| Prüfung Trading einzeln | dreimal hintereinander bestanden; nach der letzten Änderung (alle Dienste zeigen auf den Nachbau) noch einmal im Sammellauf, zusammen mit Stimme und Mitteilung |
| Gegenprobe Trading | Not-Aus in der Prüfung weggelassen: Sie scheitert bei „auch Claude wird nicht mehr gefragt“ |
| Belegter Port | Fremder Server auf dem Port einer Prüfung: Sie bricht ab mit „Auf Port … antwortet schon ein Server“, statt gegen ihn zu prüfen |
| Tests zuerst | Für den Helfer: Tests zuerst geschrieben und rot gesehen (fremder Server antwortet, Frist je Antwort, Bestätigung nach der ersten Antwort, leises Beenden, doppelter Port). Die Prüfung Trading entstand tastend an der laufenden Seite und wurde danach festgeschrieben; zwei meiner ersten Erwartungen an die Seite waren falsch (Text vor dem Start, Überschrift ohne Positionen) und sind in der Prüfung korrigiert, nicht in JARVIS |
| Gegenproben | 21 absichtlich eingebaute Fehler im Helfer: 21 bemerkt. Zwischendurch waren es 10 von 14; für die vier fehlenden kamen Tests dazu |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde. Eingearbeitet (sechs): Warten ohne Frist, wenn jemand die Verbindung annimmt und nie antwortet; Stimme und Post auf demselben Port; ein fremder Server, der den Port kurz nach der Prüfung bindet, galt als der eigene; die Regel gegen einen Start am Helfer vorbei erkannte nur eine Schreibweise; zwölfmal dieselbe Zeile zum Beenden; doppelte Angaben in der Umgebung einer Prüfung. Geprüft, trifft nicht zu (einer): Ein Programm, das es nicht gibt, wird schon beim Start klar gemeldet; dafür gibt es jetzt einen Test. Nicht übernommen (drei): IPv6 und das Bestehen trotz gescheitertem Beenden (beides oben als Grenze), gemeinsame Warteschleife für drei Prüfungen (die Schleifen warten auf Verschiedenes) |
| Sicherheitsprüfung (von Hand) | Nur Prüfwerkzeug, kein Code von JARVIS geändert. Der Helfer beendet nur die Prozessgruppe, die er selbst gestartet hat, und fragt den Port nur am eigenen Rechner ab. Die Prüfung Trading schreibt in einen eigenen leeren Testordner; alle Adressen des Desks nach außen (Kurse, Blockchain-Prüfung, Rohstoffe, X, Claude) zeigen auf Nachbauten am eigenen Rechner; der Schlüssel darin ist erfunden. Es bleibt Spielgeld |
| Am Rand aufgefallen, nicht geändert | Der Raum Trading schreibt Prozente mit Bindestrich („-2 %“), Beträge mit echtem Minuszeichen |
| Nicht geprüft | **der Mac**, Windows, echte Dienste, Safari |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

### Schritt J6: Handprüfungen für die Räume Aufgaben und Dokumente; ein unlesbarer Tresor heißt nicht mehr „nichts fällig“ (15. November 2026)

**Warum:** Für die Räume Aufgaben und Dokumente gab es keine Prüfung im Browser (Grenze aus J5). Beide hängen am
Mac (Obsidian, Vorschau, Finder) und lassen sich trotzdem prüfen: mit einem Testordner als Tresor, einem
nachgebauten Claude und einem nachgebauten `/usr/bin/open`, das nur festhält, was geöffnet werden sollte.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J6.1 Handprüfung Aufgaben: Tresor über die Seite verbinden (ein Ordner, den es nicht gibt, wird abgelehnt), fünf Gruppen nach Fälligkeit mit den Zahlen oben, notieren mit Datum und „wichtig“, abhaken, verschieben auf morgen und um eine Woche, eine inzwischen in Obsidian geänderte Aufgabe, ein Tresor, der verschwindet, Schutz der Schnittstelle | Testbereit, **nur gegen einen Testordner; Obsidian selbst läuft nicht** | `test/hand/aufgaben-rauch.ts` (Port 3121); unten |
| J6.2 Handprüfung Dokumente: ohne Claude-Schlüssel, bestellen von Hand, Stand während der Arbeit, fertiges PDF (von einem echten Chrome gesetzt), öffnen, im Finder zeigen, Ordner öffnen, im Browser ansehen, abbrechen, ein Dokument, das nicht fertig wird, Neustart mitten in der Arbeit, Schutz der Schnittstelle | Testbereit, **nur gegen nachgebautes Claude; recherchiert wird nichts** | `test/hand/dokumente-rauch.ts` (Port 3122); unten |
| J6.3 **Gefunden und behoben:** Lässt sich der Tresor nicht lesen, steht das jetzt überall da, statt „nichts fällig“ | Testbereit | `aufgabenUnlesbar` und `TRESOR_UNLESBAR` in `src/lib/tasks.ts`; `test/regeln/routinen.test.ts` (5 neue), `test/module/gehirn.test.ts` (1 neuer) |

**Der Fund im Einzelnen.** Die Prüfung Aufgaben benennt den Tresor mittendrin um. Der Raum zeigte dann oben in
Rot „Den Ordner … gibt es nicht“ und direkt darunter in Grün „Keine offenen Aufgaben. Alles erledigt.“, dazu
dreimal die Zahl 0. Am Mac entsteht derselbe Zustand ohne jedes Zutun: macOS sperrt den Ordner Dokumente, bis
Terminal dort freigegeben ist, und der Tresor, den JARVIS anlegt, liegt genau dort. Das Code-Review hat danach
gezeigt, dass derselbe Fehler an weiteren Stellen saß. Vorher und nachher:

| Stelle | vorher | jetzt |
|---|---|---|
| Raum Aufgaben | Fehlermeldung, darunter „Alles erledigt“, Zahlen 0, Formular zum Notieren | nur die Fehlermeldung |
| Heute | „Heute ist nichts fällig.“, „Sonst liegt heute nichts an.“, „Nichts wartet auf dich.“ | „Die Aufgaben lassen sich gerade nicht lesen.“, in „Wartet auf dich“ und in der Spalte Aufgaben der Satz zum Tresor |
| Gespräch (Startseite) | „0 Punkte bis nächste Woche“ | „Aufgaben gerade nicht lesbar“ |
| Zuruf „Meine Aufgaben“ | der Grund, danach „Bis nächste Woche ist nichts fällig.“ | nur der Grund |
| Zuruf „Guten Morgen“ | der Grund, danach „Es liegt nichts Dringendes an.“ | der Grund, ohne den Nachsatz |
| Tagesabschluss (Handy und gesprochen) | „Von den Aufgaben ist nichts offen geblieben.“ | „Aufgaben: Der Obsidian-Tresor lässt sich gerade nicht lesen.“ |
| Morgenbriefing am Handy | die Aufgaben fehlten ohne ein Wort | derselbe Satz |
| Was Claude im Gespräch vor Augen hat | „Aufgaben: 0 offen, 0 bis nächste Woche fällig“ | „Aufgaben: nicht lesbar (Grund)“ |

**Eigene Entscheidungen:** (1) In Morgenbriefing und Tagesabschluss steht nur der kurze Satz, nicht der Grund: In
ihm steht der Pfad des Ordners. Die Zurufe nennen wie bisher den Grund, und an Claude geht er wie bisher schon
über das Werkzeug zum Lesen der Aufgaben. (2) Der Hinweis in
„Wartet auf dich“ gilt als dringend: Solange er dasteht, weiß JARVIS nichts über die Aufgaben. (3) Die Zähler
in der Leiste (Zahl neben „Aufgaben“) bleiben, wie sie sind: Dort steht dann keine Zahl, und das behauptet
nichts. (4) Der nachgebaute Claude kann sich jetzt Bedenkzeit nehmen (`bedenkzeit(ms)`), damit die Seite den
Analysten bei der Arbeit zeigt und ein Abbruch mittendrin geprüft werden kann.

**Grenzen:** (1) Obsidian, Vorschau und Finder laufen in der Prüfung nicht; geprüft ist, was JARVIS in die
Dateien schreibt und was es dem Mac übergibt. „Neuen Tresor in Dokumente anlegen“ klickt die Prüfung nicht (der
Tresor entstünde im Benutzerordner). (2) Die Sperre von macOS ist mit einem umbenannten Ordner nachgestellt, nicht
am Mac ausgelöst. (3) Die Prüfung Dokumente recherchiert nicht: Suche im Web, Kosten und das echte Claude sind
damit nicht geprüft; die Kosten stehen wegen der winzigen nachgebauten Antworten bei 0,00 $. (4) Kurz vor
Mitternacht (ab 23:58 Uhr) bricht die Prüfung Aufgaben mit einem Hinweis ab, statt über den Tageswechsel falsch zu
rechnen. (5) Der Mac, Windows und Safari sind nicht geprüft.

### Testergebnisse Schritt J6 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **989 Tests: 989 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 6). Am Mac wären es rechnerisch 987 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 20 Handprüfungen bestanden**, Code 0 (Aufgaben 10 Sekunden, Dokumente 77) |
| Prüfung Aufgaben, erster Lauf | **fehlgeschlagen am letzten Schritt**: Die Seite zeigte „Alles erledigt“ neben der Fehlermeldung (der Fund oben). Nach der Korrektur im Raum Aufgaben erneut fehlgeschlagen, jetzt in „Heute“ (dort stand weiter „nichts fällig“); nach der Korrektur dort bestanden |
| Prüfung Dokumente | erster und zweiter Lauf bestanden, **der dritte gescheitert**. Ursache gemessen (drei Messläufe): Der Auftrag, bei dem der Analyst nichts abgibt, war nach rund 25 Millisekunden gescheitert; meine Prüfung wartete auf die Anzeige „arbeitet“, die dann meist gar nicht erscheint. Das war ein Fehler der Prüfung, nicht von JARVIS; mit Bedenkzeit je Antwort danach vier von vier bestanden, dann zweimal in einem Lauf nur dieser beiden Prüfungen und einmal im Sammellauf |
| Gegenproben Dokumente | Server ohne Chrome: scheitert bei „· PDF“ (es entsteht nur die Webseite). Abbrechen weggelassen: scheitert, weil kein Eintrag „abgebrochen“ erscheint |
| Tests zuerst | Für die Regel „unlesbar ist nicht leer“: sechs Tests zuerst geschrieben und rot gesehen. Für die Anzeige in Aufgaben und Heute war die Handprüfung der rote Test. Für die Zeile im Raum Gespräch nicht eigens rot gesehen (den Text gab es vorher nicht) |
| Gegenproben zur Regel | 14 absichtlich eingebaute Fehler (Übersicht, Tagesabschluss, Morgenbriefing, Zurufe, Blickfeld von Claude): 14 bemerkt |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | sieben Befunde. Eingearbeitet (sechs): „Sonst liegt heute nichts an“ stand weiter über der Fehlermeldung; derselbe Fehler in Tagesabschluss, Morgenbriefing, Zurufen und im Blickfeld von Claude (daraus wurde J6.3); die Prüfung Dokumente sah nach, ob das PDF geöffnet wurde, bevor der Mac es geöffnet haben musste; der nachgebaute Claude nahm für eine längst abgebrochene Anfrage später einen Zug aus dem Drehbuch eines anderen Schritts; die Seite konnte zwischen Änderung und Klick neu laden; das Formular zum Notieren stand auch bei fehlendem Tresor da. Als Grenze notiert (einer): ein Lauf über Mitternacht |
| Sicherheitsprüfung (von Hand) | An JARVIS selbst nur Texte und Anzeige geändert: keine neue Eingabe, kein neuer Weg nach außen, nichts an Rechten. Aufs Handy geht der kurze Satz ohne Pfad. Die Prüfungen schreiben nur in eigene Testordner; Claude und `open` sind Nachbauten; der Schlüssel darin ist erfunden. Bestätigt durch die Prüfungen: Die Schnittstelle der Aufgaben schreibt nicht außerhalb des Tresors und nicht in andere Dateien als Markdown; die der Dokumente gibt keine Datei an fremde Seiten und kennt nur eigene Kennungen |
| Am Rand aufgefallen, nicht geändert | Bei genau einem Abschnitt oder einer Quelle steht „1 Abschnitte“ und „1 Quellen“ (Raum Dokumente, Nachricht aufs Handy) |
| Nicht geprüft | **der Mac** (Obsidian, Vorschau, Finder, die Ordnersperre von macOS), Windows, echtes Claude, Safari |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

### Schritt J7: Handprüfungen für den Raum Kalender und das Gespräch; sechs Fehler gefunden und behoben (15. November 2026)

**Warum:** Für den Raum Kalender (ohne Outlook) und für das getippte Gespräch gab es keine Prüfung im Browser.
Beide sind Kern von JARVIS: Im Kalender trägt er ein, und im Gespräch entscheidet sich, was an Claude geht, was
erst nach einem Ja geschieht und ob „Anhalten“ anhält.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J7.1 Handprüfung Kalender: Zugriff noch nie gefragt, Nein am Mac mit dem Weg in die Systemeinstellungen, nach dem Erlauben die nächsten zwei Wochen (vorbei, läuft, kommt noch, ganztägig, freie Tage, Zahlen oben), eintragen mit Uhrzeit und ganztägig, Kalender für neue Termine wählen (kein schreibgeschützter), gewählter Kalender inzwischen schreibgeschützt, ein Mac, der nicht speichert, „Zeigen“ in der Kalender-App, Schutz der Schnittstelle, kein Ändern und Löschen | Testbereit, **nur gegen einen nachgebauten Mac-Kalender; die Kalender-App läuft nicht** | `test/hand/kalender-rauch.ts` (Port 3123, 9 Schritte); unten |
| J7.2 Handprüfung Gespräch: feste Befehle ohne Claude-Schlüssel, Vorschlag „Termin …“, Termin und Aufgabe per Satz, ein Mac, der nicht speichert, Gespräch nach dem Neuladen und in einem neuen Fenster, freie Frage an Claude mit dem bisherigen Gespräch, Anhalten (sofort und mitten im Nachdenken), ein Termin, den das Modell eintragen will (Nein, dann Ja), Ausfall von Claude, „Neues Gespräch“, Schutz der Schnittstelle | Testbereit, **nur getippt und nur gegen nachgebautes Claude** | `test/hand/gespraech-rauch.ts` (Port 3124, 10 Schritte); unten |
| J7.3 **Gefunden und behoben:** Ein ausdrücklich genannter Kalender wird nie still durch einen anderen ersetzt, weder über Claude noch beim festen Befehl ohne KI-Gehirn; die Frage oben nennt den Kalender | Testbereit, **am Mac nicht geprüft** (wenige Zeilen im Skript für die Kalender-App) | `fest` in `addEvent` und im Skript `EVENTKIT` (`src/lib/server/calendar.ts`); `genannterKalender` in `src/lib/commands.ts`; `was` in `gateway/richtlinien.ts`; `test/module/kalender.test.ts` (4 neue, 1 erweitert), `test/regeln/kalender-zuruf.test.ts` (6), `test/module/gateway.test.ts` (1); Prüfung Gespräch, Schritt 4; Prüfliste T2 |
| J7.4 **Gefunden und behoben:** Der erste Klick auf die Zeile über der Leiste klappt das Gespräch auf, auch wenn dort der Hinweis „Klick einmal irgendwo auf die Seite …“ steht | Testbereit | `Antwortzeile` in `src/components/AppFrame.tsx`; Prüfung Gespräch, Schritt 5 |
| J7.5 **Gefunden und behoben:** „Anhalten“ (Knopf oder Esc) direkt nach dem Abschicken hält die Frage auf | Testbereit | `pending` in `src/components/JarvisProvider.tsx`; Prüfung Gespräch, Schritt 7 |
| J7.6 **Gefunden und behoben:** Reißt die Verbindung zu Claude mitten in der Antwort ab, steht ein verständlicher Satz da statt „terminated.“ | Testbereit | `abgerissen` in `src/lib/server/brain.ts` (nennt Claude nur, wenn es Claudes Verbindung war); `test/module/gehirn.test.ts` (1 neuer); Prüfung Gespräch, Schritt 9 |
| J7.7 **Gefunden und behoben:** Nach „Ja, ausführen“ zeigt der Raum die Änderung sofort | Testbereit | Der Server nennt nach dem Ja die geänderten Bereiche (`geaendert` aus `entscheideFreigabe`, Liste `BEREICHE` in `src/lib/sicherheit.ts`), die Seite lädt sie neu (`NACH_JA` in `src/components/Sicherheit.tsx`); `test/module/gateway.test.ts` (2 erweitert); Prüfung Gespräch, Schritt 8 |
| J7.8 **Gefunden und behoben:** Von einer angehaltenen Antwort, von der noch nichts dastand, bleibt keine leere Zeile; über der Leiste steht danach nicht die Antwort auf die Frage davor | Testbereit | `Message` in `src/components/Console.tsx`; `antwortAufLetztes` in `src/lib/brain.ts`; `test/regeln/antwortzeile.test.ts` (4); Prüfung Gespräch, Schritt 7 |

**Die Funde im Einzelnen.**

| Fund | vorher | jetzt |
|---|---|---|
| Kalender, ausdrücklich genannt (J7.3) | Nannte das Modell einen Kalender, den es nicht gibt oder der schreibgeschützt ist, hätte das Skript am Mac den Termin still in den Standardkalender gelegt, auch wenn du vorher „Termin im Kalender X“ freigegeben hast. Die automatischen Tests behaupteten das Gegenteil, weil der nachgebaute Kalender strenger war als das echte Skript | Der nachgebaute Kalender verhält sich wie das Skript. Ein ausdrücklich genannter Kalender gilt fest: Geht es dort nicht, wird nichts eingetragen und der Grund steht da. Der Kalender aus den Einstellungen bleibt ein Wunsch: Ist er nicht mehr beschreibbar, landet der Termin im Standardkalender, und JARVIS nennt, in welchem. Im Code-Review kam dazu heraus: Ohne KI-Gehirn überhörte der feste Befehl „Trag … in den Kalender Arbeit ein“ den Kalender ganz und schrieb „Arbeit“ in den Titel. Jetzt gilt ein genannter Kalender, den es gibt, auch dort fest. Groß- und Kleinschreibung des Namens spielt keine Rolle, und die Frage oben („Termin eintragen: …“) nennt den Kalender, wenn einer verlangt ist |
| Erster Klick (J7.4) | Nach dem Öffnen steht über der Leiste „Klick einmal irgendwo auf die Seite, dann höre ich zu.“ Wer genau dorthin klickte, bekam das Gespräch nicht aufgeklappt: Der Hinweis verschwand schon beim Drücken, mit ihm das Element unter dem Zeiger, und der Browser zählt dann keinen Klick. Gemessen: 8 von 10 Versuchen ohne Wirkung | Die Zeile behält ihre Elemente, nur Text und Farbe wechseln: 10 von 10 |
| Anhalten (J7.5) | JARVIS fängt eine gute Drittelsekunde nach dem Abschicken an. Wer in dieser Zeit anhielt, hielt nichts an: Die Frage ging trotzdem an Claude, die Antwort kam trotzdem (und kostete) | Anhalten nimmt auch zurück, was noch nicht unterwegs ist; es geht nichts an Claude |
| Abriss (J7.6) | Im Gespräch stand „terminated.“ | „Die Verbindung zu Claude ist abgerissen. Frag mich bitte noch einmal.“ Reißt eine andere Verbindung ab (eine Webseite, der Browser-Agent), steht „Die Verbindung ist abgerissen. Versuch es bitte noch einmal.“ da, ohne Claude zu nennen |
| Nach dem Ja (J7.7) | Oben stand „Eingetragen im Kalender …“, der Raum Kalender zeigte den Tag weiter als „frei“, bis zur nächsten regulären Abfrage (Kalender bis fünf Minuten, Post zwei, Aufgaben eine) | Nach einem Ja sagt der Server, was sich geändert hat, und die Seite lädt genau das frisch (Kalender, Aufgaben, Post, Gedächtnis, Desk, Dokumente, Intel). Nach einem Nein, einer Sperre oder einem Fehler lädt nichts neu |
| Leere Zeile (J7.8) | Nach dem Anhalten blieb ein Lichtpunkt ohne Text stehen, manchmal mit dem Satz „Enthält Inhalte von Dritten“ darunter | Die Zeile gibt es nicht mehr (hat die Antwort Quellen, bleibt sie stehen). Die Zeile über der Leiste zeigt nur die Antwort auf das zuletzt Gesagte; nach einer angehaltenen Frage steht dort „Bereit“, nicht die Antwort auf die Frage davor |

**Eigene Entscheidungen:** (1) Ausdrücklich genannter Kalender fest, Kalender aus den Einstellungen als Wunsch
(Begründung in der Tabelle): Die Seite zeigt bei „landet in …“ schon vorher den Kalender, in dem der Termin
wirklich landet. (2) „Anhalten“ nimmt in der Drittelsekunde auch einen festen Befehl zurück („Trag … ein“):
Wer anhält, will, dass nichts geschieht. (3) Nach einem Ja lädt nur die betroffene Abfrage neu, nicht alles:
Die Post frisch zu lesen dauert, und ein Termin ändert daran nichts. (4) Beide Prüfungen stellen sich, dem
Server und dem Browser eine Zeitzone ein, in der es gerade Mittag ist; so sehen sie zu jeder Tageszeit denselben
Kalender und laufen nie über Mitternacht. (5) Für den Schritt „erster Klick“ gilt im Browser der Prüfung fest
„noch nicht geklickt“: Ob Chrome ein neues Fenster der Prüfung schon als angeklickt führt, wechselte von Lauf
zu Lauf. (6) Eine angehaltene Frage bleibt im Gespräch stehen und gehört damit zum Verlauf, den Claude bei der
nächsten Frage sieht, genau wie eine Frage, die beim Nachdenken angehalten wurde; „Neues Gespräch“ räumt sie weg.
(7) Ein Wort hinter „in den Kalender“, das kein vorhandener Kalender ist, bleibt wie bisher Teil des Titels
(„Trag morgen um 9 in den Kalender Zahnarzt ein“): JARVIS kann nicht wissen, ob ein Kalender gemeint war.

**Grenzen:** (1) Die Kalender-App, die Rückfrage von macOS und das Skript dafür laufen in der Prüfung nicht.
Geprüft ist, was JARVIS dem Mac übergibt und wie die Seite mit seinen Antworten umgeht. Die neuen Zeilen im Skript
(J7.3) sind am Mac ungeprüft; Punkt T2 der Prüfliste prüft sie. (2) Das Gespräch ist getippt geprüft, nicht
gesprochen (die Stimme prüft `stimme-rauch.ts`), und gegen nachgebautes Claude: Was das echte Modell antwortet
oder welches Werkzeug es wählt, ist damit nicht geprüft. (3) Wird der Zugriff auf den Kalender entzogen, während
der Raum offen ist, sagt die Seite es beim nächsten Eintragen; die Liste zeigt bis zum Neuladen, was sie zuletzt
gelesen hat. (4) Der Mac, Windows und Safari sind nicht geprüft. Der Fund J7.4 betrifft vor allem Browser, die
das Mikrofon erst nach einem Klick freigeben (Safari).

### Testergebnisse Schritt J7 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1005 Tests: 1005 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 16). Am Mac wären es rechnerisch 1003 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 22 Handprüfungen bestanden**, Code 0 (Kalender 9 Sekunden, Gespräch 29) |
| Prüfung Kalender, erste Läufe | ein Fehlschlag aus der Prüfung selbst (ein erwarteter Text falsch abgeschrieben); danach bestanden |
| Prüfung Gespräch, erste Läufe | mehrfach fehlgeschlagen, jedes Mal mit Ursache: Das Aufklappen nach dem Neuladen wirkte in 8 von 10 Versuchen nicht (Fund J7.4, nach der Korrektur 10 von 10); die Antwort kam trotz sofortigem „Anhalten“ (Fund J7.5); „terminated.“ im Gespräch (Fund J7.6); der Raum zeigte nach dem Ja weiter „frei“ (Fund J7.7, im Bild gesehen); leere Zeile nach dem Anhalten (Fund J7.8, im Bild gesehen). Aus der Prüfung selbst: zu früh getippt, bevor das Feld die Schreibmarke hatte („ZtZahnar“); ob Chrome ein neues Fenster als „angeklickt“ führt, wechselte von Lauf zu Lauf (jetzt fest vorgegeben); eine falsche Annahme über den Hinweis „Inhalte von Dritten“ |
| Gegenproben (absichtlich eingebaute Fehler, je ein eigener Bau) | **12 von 12 entdeckt.** Kalender (5): „Heute noch“ zählt Vergangenes; ein genannter Kalender wird still ersetzt; „Zeigen“ öffnet immer heute; Termine in der Vergangenheit werden angenommen; Einträge ohne Titel werden gezeigt. Gespräch (7): Anhalten hält eine eben abgeschickte Frage nicht auf; nach dem Ja lädt der Raum nicht neu (in beiden Bauweisen); der Hinweis ist wieder ein eigenes Element; das Modell trägt Termine ohne Ja ein; ein Abriss heißt wieder „terminated“; ein genannter Kalender wird beim festen Befehl überhört. Danach alle Dateien wiederhergestellt (mit `git diff` gegen die Kopie von vorher verglichen) |
| Tests zuerst | Für den genannten Kalender, den Mac, der nicht speichert, den Abriss, den festen Befehl mit Kalender, die Groß- und Kleinschreibung, die Frage mit Kalender und die Meldung an die Seite: Tests zuerst geschrieben und rot gesehen. Für Klick, Anhalten, Neuladen nach dem Ja und die leere Zeile war die Handprüfung der rote Test. Die Regel für die Zeile über der Leiste: Test gegen die alte Regel rot gesehen |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Befunde. Eingearbeitet (acht): der feste Befehl ohne KI-Gehirn überhörte einen genannten Kalender; ein vom Modell leicht anders geschriebener Kalendername hätte jetzt hart abgelehnt (darum Groß- und Kleinschreibung egal, und die Frage nennt den Kalender); „Verbindung zu Claude“ stand auch da, wenn eine andere Verbindung abriss; über der Leiste stand nach einer angehaltenen Frage die Antwort davor; eine leere Antwort mit Quellen wäre verschwunden; die Seite führte eine eigene Liste, was nach welchem Ja neu zu laden ist (jetzt sagt es der Server); neu geladen wurde auch nach einem Fehler, und der Kalender doppelt gelesen; der nachgebaute Kalender nahm einen schreibgeschützten Standardkalender an. Als Entscheidung notiert (zwei): Eine angehaltene Frage bleibt im Verlauf (Entscheidung 6); zwei Sätze innerhalb einer Drittelsekunde starten wie bisher beide |
| Rückschritt aus der Nacharbeit, von der Prüfung Gespräch gefunden | Nach dem Einarbeiten blieb die leere Zeile wieder stehen, wenn sie den Hinweis „Inhalte von Dritten“ trug. Behoben, danach beide Prüfungen und der Sammellauf erneut bestanden |
| Sicherheitsprüfung (von Hand) | Kein neuer Weg nach außen, keine neue Berechtigung. Der Kalendername aus einem Satz wird nur mit vorhandenen Kalendern verglichen und geht wie bisher als Daten an den Mac, nie als Programmcode; im Suchmuster ist er entschärft. Strenger als vorher: Ein genannter Kalender wird nie ersetzt, und die Frage vor dem Ja zeigt ihn. Die Antwort auf ein Ja nennt der Seite nur die Namen der geänderten Bereiche, keine Inhalte. Die Prüfungen schreiben nur in eigene Testordner; Claude, Kalender und `open` sind Nachbauten; der Schlüssel darin ist erfunden |
| Am Rand aufgefallen, nicht geändert | Die Bestätigung eines selbst getippten Termins trägt den Hinweis „Enthält Inhalte von Dritten“, sobald im Gespräch vorher fremde Inhalte standen (so gewollt, wirkt aber seltsam); das Datumsfeld zeigt im Browser der Prüfung das amerikanische Format; „Als Nächstes“ zeigt den Beginn eines Termins, der schon läuft |
| Nicht geprüft | **der Mac** (Kalender-App, die Rückfrage von macOS, das geänderte Skript), Windows, echtes Claude, die Stimme in diesem Zusammenhang, Safari |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

### Schritt J8: Handprüfungen für das Lagebild im Raum Intel und für das Lesen der Post; fünf Fehler gefunden und behoben (15. November 2026)

**Warum:** Das Lagebild von Grok kostet bei jedem Klick Geld und bremst den Trading-Desk; der Raum Post zeigt
fremde Texte und ändert etwas im Postfach („Gelesen“). Für beides gab es Tests der Regeln, aber keine Prüfung
der ganzen Strecke im Browser. (`post-rauch.ts` prüft im Raum Post nur die Antwortentwürfe.)

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J8.1 Handprüfung Intel: ohne Schlüssel, Lagebild von Hand (Reihenfolge, Quellen, fremder Text), Warnung an den Trading-Desk, gezielte Suche, Tagesbudget, eigene Themen, Ausfälle von xAI, die Zurufe im Gespräch, „Von selbst lesen“, gesperrter Agent, Schutz der Schnittstelle | Testbereit, **nur gegen nachgebautes Grok; es floss kein Geld** | `test/hand/intel-rauch.ts` (Port 3125, 11 Schritte); unten |
| J8.2 Handprüfung Post lesen: verbinden (auch mit falschem Passwort), Übersicht, Mail öffnen, „Gelesen“, „Als Aufgabe“, „Neu laden“, mit JARVIS durchgehen, gelöschte Mail, Ausfall des Postfachs, Schutz der Schnittstelle | Testbereit, **nur gegen ein nachgebautes Postfach** | `test/hand/postfach-rauch.ts` (Port 3126, 10 Schritte); unten |
| J8.3 **Gefunden und behoben:** Reicht das Tagesbudget nicht mehr für ein Lagebild, sagt der Raum Intel das, statt nur die Knöpfe grau zu zeigen | Testbereit | `budgetHinweis` in `src/lib/intel.ts`, `IntelView.tsx`; `budgetReicht`; `test/regeln/intel-raum.test.ts` (5); Prüfung Intel, Schritt 6 |
| J8.4 **Gefunden und behoben:** Ein Thema, das es schon gibt, wird nicht mehr als „kommt ins nächste Lagebild“ bestätigt | Testbereit | `themaDazu` in `src/lib/intel.ts`; `test/regeln/intel-raum.test.ts` (5); Prüfung Intel, Schritt 7 |
| J8.5 **Gefunden und behoben:** Eine Warnung an den Trading-Desk gilt ihre sechs Stunden, auch wenn inzwischen ein neues Lagebild ohne Warnung kommt | Testbereit | `warnung` im Stand von Intel (`src/lib/server/intel.ts`); `test/module/intel.test.ts` (2 neue); Prüfung Intel, Schritt 7 |
| J8.6 **Gefunden und behoben:** Beim Durchgehen der Mails markiert „gelesen“ die Mail als gelesen, statt sie noch einmal vorzulesen | Testbereit | Regel in `sessionCommand` (`src/lib/commands.ts`); `test/regeln/post-durchgehen.test.ts` (4); Prüfung Postfach, Schritt 8 |
| J8.7 **Gefunden und behoben:** Fällt das Postfach aus, behauptet der Raum Post nicht mehr „Keine wichtigen Mails. Schön ruhig heute.“ | Testbereit | `MailView.tsx`; Prüfung Postfach, Schritt 10 |

**Die Funde im Einzelnen.**

| Fund | vorher | jetzt |
|---|---|---|
| Graue Knöpfe (J8.3) | Oben stand zum Beispiel „Heute 0,76 $ von 1,00 $“, und „Aktualisieren“ und „Suchen“ waren grau. Dass die übrigen 24 Cent nicht für ein Lagebild reichen (etwa 40 Cent), stand nirgends | Ein Satz nennt, was übrig ist, was nötig ist und dass ein höheres Tagesbudget sofort hilft |
| Doppeltes Thema (J8.4) | Wer „bitcoin“ oder ein schon vorhandenes Thema eintrug, las „„bitcoin“ kommt ins nächste Lagebild.“, obwohl nichts dazukam | „„bitcoin“ gibt es schon.“ Bestätigt wird der Name, unter dem das Thema wirklich gespeichert ist (ohne Klammern, höchstens 40 Zeichen) |
| Warnung (J8.5) | Seite und Handy sagten „Warnung bis 18:46 Uhr“ und „die nächsten 6 Stunden“. Kam vorher ein neues Lagebild ohne Warnung (ein Klick auf „Aktualisieren“ genügt), war die Warnung sofort weg, und der Desk kaufte wieder. Eine Warnung aus einer gezielten Suche blieb dagegen stehen | Die Warnung wird getrennt vom Lagebild gemerkt und gilt ihre sechs Stunden. Eine neue, andere Warnung löst sie ab. Intel bremst den Desk, er gibt ihn nicht frei |
| „gelesen“ (J8.6) | JARVIS fragt „Vorlesen, Aufgabe, gelesen oder weiter?“. Wer „gelesen“ antwortete, bekam die Mail noch einmal vorgelesen, und im Postfach blieb sie ungelesen: Die Regel für „vorlesen“ suchte nach „lesen“ und fand es in „ge-lesen“ | „gelesen“ und „als gelesen markieren“ markieren genau diese Mail; „lesen“, „vorlesen“, „durchlesen“ lesen vor |
| Ausfall (J8.7) | Antwortete der Mail-Server nicht, stand die Fehlermeldung da, darunter aber „Neue wichtige 0, Ungelesen gesamt 0“ und „Keine wichtigen Mails. Schön ruhig heute.“ | Es steht nur der Grund da und „Was im Postfach liegt, weiß JARVIS gerade nicht.“ „Heute“, das Briefing und die Zurufe hatten das schon richtig |

**Eigene Entscheidungen:** (1) Die Warnung bleibt bestehen, auch wenn Grok sie im nächsten Lagebild nicht
wiederholt (J8.5). Begründung: Die Zusage „bis … Uhr“ stand schon auf der Seite und auf dem Handy; ein
Sprachmodell lässt eine Meldung auch einmal weg, ohne dass die Lage besser ist; und es geht nur um eine Bremse
für Spielgeld. Wer die Bremse früher lösen will, kann das bisher nicht von Hand; das habe ich nicht gebaut.
(2) Bei ausgefallenem Postfach zeigt der Raum nichts aus dem letzten gelungenen Abruf: Ein alter Stand, der wie
ein frischer aussieht, wäre schlechter als eine ehrliche Lücke. (3) Der nachgebaute Grok bekam eine Bedenkzeit
(`bedenkzeit(ms)`), damit sich prüfen lässt, was die Seite zeigt, während Grok liest.

**Grenzen:** (1) Geprüft ist gegen Nachbauten. Was das echte Grok liefert, wie lange es braucht und was es
kostet, ist damit nicht geprüft; ebenso wenig ein echtes Postfach (T-Online, Gmail, iCloud) mit seinen
Eigenheiten. (2) „In Mail öffnen“ ist nur als Link geprüft; Apple Mail läuft nicht. (3) Das Lagebild, das Intel
von selbst liest (morgens und am Nachmittag), ist im Browser nicht geprüft, nur in den Tests der Regeln;
geprüft ist, dass das Öffnen des Raums und das Einschalten allein nichts kosten. (4) Der Mac, Windows und
Safari sind nicht geprüft.

**Aus dem Code-Review eingearbeitet (jeweils erst der Test, rot gesehen).**

| Hinweis | Was daran stimmte | jetzt |
|---|---|---|
| „ungelesen“ | Nach der Korrektur J8.6 hätte „lass sie ungelesen“ oder „nicht als gelesen markieren“ die Mail als gelesen markiert, also das Gegenteil getan. Vorher wurde sie in dem Fall nur vorgelesen | „ungelesen“ und „nicht … gelesen“ fassen nichts an: „Bleibt ungelesen.“, weiter zur nächsten Mail |
| „nachlesen“, „weiterlesen“, „vorgelesen“ | Diese Wörter lasen vor J8.6 vor und danach nicht mehr | lesen wieder vor |
| Warnung aus einem Stand von früher | Die Korrektur J8.5 merkte sich nur Warnungen aus neuen Lagebildern. Eine Warnung, die beim Aktualisieren von JARVIS schon im alten Lagebild stand, wäre vom nächsten Lagebild weiter aufgehoben worden | Bevor ein Lagebild oder eine Suche abgelöst wird, wird ihre Warnung gemerkt |
| „Übrig 0,40 $, nötig 0,40 $“ | Bei krummen Beträgen (übrig 0,397 $) rundete der neue Satz auf und widersprach sich | Der Rest wird auf den Cent abgerundet. Dazu eine Regel an einer Stelle (`budgetReicht`) für Server, Raum und Agenten-Übersicht, mit einem Millionstel Dollar Spielraum: Der Rechner rechnet 3 minus 2,60 eine Spur kleiner als 0,40 aus, das hätte vorher als „reicht nicht“ gegolten |
| Rat zu einem höheren Tagesbudget | Bei 10 $ (mehr lässt sich nicht eintragen) riet der Satz trotzdem dazu | Am Höchstwert steht nur „Morgen geht es weiter.“ |
| Zwei Rechnungen für dasselbe | Knöpfe und Hinweis rechneten getrennt; Seite und Server prüften ein neues Thema mit je eigenen Regeln | Die Knöpfe richten sich nach dem Hinweis; ein Test hält Seite und Server beim Thema zusammen (44 Fälle) |
| Raum Post bei Ausfall | Die Sperre stand an vier Stellen, zwei Blöcke (Newsletter, Knopf „Mit JARVIS durchgehen“) waren nur zufällig leer | Eine benannte Bedingung (`lesbar`) für alles, was vom Inhalt des Postfachs lebt |
| Nachgebautes Grok | Antworten mit Bedenkzeit liefen nach dem Stoppen weiter | Beim Stoppen werden sie verworfen; dass die Bedenkzeit bis zum Abstellen gilt, steht jetzt dabei |
| Prüfung Intel und die volle Stunde | Startet die Prüfung kurz vor einer vollen Stunde, wird aus 12 Uhr 13 Uhr, und fünf Uhrzeit-Vergleiche wären fälschlich gescheitert | Die Vergleiche lassen beide Stunden zu |

### Testergebnisse Schritt J8 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1021 Tests: 1021 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 16). Am Mac wären es rechnerisch 1019 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 24 Handprüfungen bestanden**, Code 0, rund 8 Minuten (Intel 81 Sekunden, Postfach 15) |
| Prüfung Intel, erste Läufe | mehrfach fehlgeschlagen. Echte Funde: graue Knöpfe ohne Erklärung (J8.3), doppeltes Thema bestätigt (J8.4), Warnung vorzeitig weg (J8.5). Aus der Prüfung selbst: Es gibt zwei Felder, die „Thema“ heißen; ein fester Hilfetext wurde mit der Laufanzeige verwechselt; ein Häkchen ändert sich erst, wenn der Server geantwortet hat; ein vergessener Rest im Text der Prüfung |
| Prüfung Postfach, erste Läufe | fehlgeschlagen. Echte Funde: „gelesen“ las vor (J8.6), „Schön ruhig heute“ bei Ausfall (J8.7). Aus der Prüfung selbst: Ein fester Hinweis im Formular wurde für die Fehlermeldung gehalten; „Auf einen Blick“ steht außerhalb des Hauptbereichs |
| Gegenproben (absichtlich eingebaute Fehler, je ein eigener Bau) | **14 von 14 entdeckt.** Intel (8): Tagesbudget nicht mehr durchgesetzt; kein Hinweis bei grauen Knöpfen; ein neues Lagebild hebt die Warnung auf; ein doppeltes Thema wird bestätigt; jede Adresse wird ein Link (auch `javascript:`); JARVIS sagt das fertige Lagebild nicht an; ein gesperrter Agent fragt Grok trotzdem; Meldungen nicht nach Wichtigkeit. Postfach (6): „gelesen“ liest vor; bei Ausfall stehen Nullen da; „Gelesen“ trifft die falsche Mail; drei Wochen alte Mails stehen da; die Signatur bleibt im Text; Öffnen markiert als gelesen. **Eine Gegenprobe zählte beim ersten Durchgang zu Unrecht:** Der eingebaute Fehler „gesperrter Agent“ ließ sich nicht bauen, die Prüfung scheiterte also schon am Start und nicht an dem Fehler. Mit einem Fehler, der baut, wiederholt: Die Prüfung scheitert genau in Schritt 11 (zehn Schritte davor in Ordnung). Danach alle Dateien wiederhergestellt (mit `git diff` gegen die Kopie von vorher verglichen), sauber gebaut, beide Prüfungen ohne eingebaute Fehler bestanden |
| Tests zuerst | Budget-Hinweis, doppeltes Thema, Warnung und „gelesen“: Tests zuerst geschrieben und rot gesehen; für den Ausfall des Postfachs war die Handprüfung der rote Test. Alle Punkte aus dem Code-Review: erst der Test, rot gesehen (fünf rote Tests, dazu einer für den Rechenrest) |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Hinweise, alle eingearbeitet (Tabelle oben). Zwei davon waren Rückschritte aus meinen eigenen Korrekturen dieses Schritts („ungelesen“; „nachlesen“). Danach `npm run pruefen` und der Sammellauf erneut |
| Fehler in den eigenen Tests bei der Nacharbeit | zwei, beide im Test, nicht im Programm: Ein Test erwartete bei einem Zehnmillionstel Dollar unter 0,40 $ noch „reicht nicht“ (das ist jetzt der gewollte Spielraum); ein älterer Test verließ sich darauf, dass eine frühere Warnung aus dem Test davor beim Ablösen verschwindet (genau der Fehler, der behoben wurde). Beide Tests angepasst, Begründung steht im Test |
| Sicherheitsprüfung (von Hand) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code (die Schlüssel und Passwörter der Prüfungen sind erfunden; alle Adressen sind `127.0.0.1` oder `example.com`). Strenger als vorher: Eine Warnung bremst den Desk die vollen sechs Stunden; „ungelesen“ ändert nichts im Postfach. Geprüft bleibt: Die Schnittstellen lehnen fremde Herkunft ab; aus Groks Antwort werden nur `http`- und `https`-Adressen zu Links; fremder Text bleibt Text; das Postfach-Passwort steht auf keiner Seite und in keiner Antwort; „Gelesen“ setzt nur das Gelesen-Zeichen, löschen und senden lehnt die Schnittstelle ab. Der Budget-Hinweis und die Themen-Regel sind nur Text auf der Seite; durchgesetzt wird weiter auf dem Server |
| Am Rand aufgefallen, nicht geändert | Zwei Fehlersätze enden ohne Punkt („Letzter Versuch: Grok hat keinen lesbaren Bericht geliefert“, „… xAI bremst gerade, zu viele Anfragen“); „Ungelesen gesamt“ zählt den ganzen Posteingang, darüber steht „letzte 14 Tage“; „Mit freundlichen Grüßen“ gilt nicht als Beginn der Signatur; eine Warnung lässt sich nicht von Hand aufheben; das Häkchen „Von selbst lesen“ springt erst um, wenn der Server geantwortet hat |
| Nicht geprüft | **echtes Grok** (Inhalt, Dauer, Kosten), **ein echtes Postfach**, Apple Mail, der Mac, Windows, Safari |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten; U1 bis U3 der Prüfliste kosten am Mac echtes Geld bei xAI und sind freiwillig).


### Schritt J9: Kleinigkeiten am Rand behoben; Handprüfung für den Raum „Heute“; dabei vier weitere Fehler gefunden und behoben (15. November 2026)

**Warum:** In J6 bis J8 standen Kleinigkeiten „am Rand aufgefallen, nicht geändert“ in den Testergebnissen.
Und „Heute“ ist der Raum, den man als ersten sieht: Er stellt alles zusammen (Kalender, Aufgaben, Post,
Projekte, Intel, Sicherheit), war aber nur in Ausschnitten im Browser geprüft, nie mit allen Quellen zugleich
und nie mit einer Quelle, die lädt oder ausfällt.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J9.1 Prozente mit echtem Minuszeichen, überall (Trading, „Heute“, Zurufe, Handy), wie schon bei den Beträgen; beim Vorlesen wird ein Minus vor einer Zahl als „minus“ gesprochen | Testbereit | `formatPct` in `src/lib/format.ts`, `forSpeech` in `src/lib/voiceText.ts`; `test/regeln/format.test.ts`, `test/regeln/stimme.test.ts`; Prüfung Marktlage |
| J9.2 „1 Abschnitt“, „1 Quelle“, „1 Suche“ statt „1 Abschnitte“ (Raum Dokumente, das Dokument selbst, der Satz von JARVIS, die Nachricht aufs Handy) | Testbereit | `anzahl` in `src/lib/format.ts`; `test/regeln/format.test.ts`; Prüfung Dokumente |
| J9.3 Raum Kalender: Ein Termin, der schon läuft, heißt „Läuft seit 11:30“ und nicht „Als Nächstes 11:30“ | Testbereit | `CalendarView.tsx`; Prüfung Kalender |
| J9.4 Fehlermeldungen von Grok enden als ganzer Satz (im Raum Intel hinter „Letzter Versuch:“ und im Gespräch) | Testbereit | `alsSatz` in `src/lib/format.ts`; `test/regeln/format.test.ts`; Prüfung Intel |
| J9.5 Raum Post: Die mittlere Zahl heißt „Ungelesen im ganzen Posteingang“ (sie zählt alles, nicht nur die 14 Tage der Liste) | Testbereit | `MailView.tsx`; Prüfung Postfach |
| J9.6 Zwei Sätze in einem Augenblick (doppelter Klick, zwei Sätze der Spracheingabe): Die neue Frage löst die alte ab, statt dass beide nebeneinander an Claude gehen; derselbe Satz zählt einmal; ein fester Befehl davor geht nicht verloren. Kommt seine Bestätigung erst, während JARVIS schon über die neue Frage nachdenkt, steht sie still im Gespräch: Sie wird nicht gesprochen, nimmt „Denke nach …“ nicht weg und bricht die Antwort nicht ab | Testbereit | `handle` und `execute` in `JarvisProvider.tsx`; Prüfung Gespräch, neuer Schritt (jetzt 11) |
| J9.7 Handprüfung „Heute“: frischer Mac, langsamer Kalender, voller Tag, Not-Aus, Ausfälle von Postfach, Tresor und Kalender, Rückkehr | Testbereit, **nur gegen Nachbauten** | `test/hand/heute-rauch.ts` (Port 3127, 6 Schritte); unten |
| J9.8 **Gefunden und behoben:** „Heute“ behauptet nichts mehr über eine Quelle, die noch lädt, nicht verbunden ist oder nicht antwortet | Testbereit | `luecken`, `kopfSatz`, `tagesSatz`, `wartetLeer` in `src/lib/heute.ts`; `test/regeln/heute.test.ts` (6 neue); Prüfung Heute, Schritte 1, 2 und 5 |
| J9.9 **Gefunden und behoben:** Ohne Verbindung zum Wetterdienst steht kein erfundenes Wetter mehr im Kopf von „Heute“, und das Briefing sagt keines an | Testbereit | `wetterKurz` in `src/lib/weather.ts`, Briefing in `src/lib/commands.ts`; `test/regeln/heute.test.ts` (3 neue); Prüfung Heute, Schritt 1 |
| J9.10 **Gefunden und behoben:** Hat JARVIS gemerkt, dass das Postfach nicht antwortet, tauchen die Mails von vorhin nicht wieder auf (ein neuerer, gelungener Abruf bleibt dabei stehen) | Testbereit | `readMail` in `src/lib/server/mail.ts`; `test/module/post.test.ts` (2 neue); Prüfung Heute, Schritt 5 |
| J9.11 **Gefunden und behoben:** Der nachgebaute Mac kann sich mit dem Kalender Zeit lassen (`wartezeit_ms`), damit sich prüfen lässt, was eine Seite währenddessen zeigt | Erledigt (nur Prüfwerkzeug) | `test/mocks/osascript-mock.mjs` |

**Die Funde im Raum „Heute“ im Einzelnen.**

| Fund | vorher | jetzt |
|---|---|---|
| Laden (J9.8) | Bis der Kalender geantwortet hatte (am Mac oft Sekunden), stand im Kopf „Heute steht kein Termin an“ und an der Scheibe „Kein Termin.“; ebenso „Heute ist nichts fällig.“, „Keine neuen wichtigen Mails.“ und „Nichts wartet auf dich.“, bevor Aufgaben, Post und Sicherheitslage gelesen waren | „Der Kalender lädt noch“, „Die Aufgaben laden noch.“ und so weiter; der Rest steht schon da |
| Kalender nicht lesbar (J9.8) | War der Zugriff verweigert oder lieferte der Mac einen Fehler, stand „Der Kalender ist noch nicht verbunden.“ an der Scheibe und im Kopf „Heute steht kein Termin an“ | Bei einem Fehler „Der Kalender lässt sich gerade nicht lesen“, bei fehlender Erlaubnis „JARVIS darf den Kalender nicht lesen“ (das geht nicht von selbst vorbei; wie die Erlaubnis zu geben ist, steht im Raum Kalender), im Kopf und an der Scheibe. Fehlen Outlook-Termine, ganz oder zum Teil, steht derselbe Satz da wie im Raum Kalender („Die Termine aus Outlook fehlen gerade.“) |
| Postfach ausgefallen (J9.8) | In der Liste stand es richtig, der Satz zum Tag sagte aber „Sonst liegt heute nichts an.“ | Der Satz nennt es: „…, das Postfach antwortet nicht.“ |
| Wetter (J9.9) | Ohne Verbindung zum Wetterdienst liefert JARVIS Beispieldaten (11 °C, teils bewölkt). Im Kopf von „Heute“ standen sie als Wetter da (der Hinweis „Beispieldaten“ steht nur klein in der Ecke und nur auf großen Bildschirmen), und das Briefing sagte „Draußen hat es 11 Grad“ | Im Kopf und im Briefing steht dann kein Wetter. Wer ausdrücklich nach dem Wetter fragt, hört wie bisher, dass es Beispieldaten sind |
| Alter Stand (J9.10) | Nach „Neu laden“ bei ausgefallenem Postfach zeigte der Raum Post den Fehler, „Heute“ und jede frisch geladene Seite aber bis zu einer Minute lang wieder die Mails von vorhin | Ein gescheiterter Abruf verwirft den gemerkten Stand |

**Bewusst nicht geändert** (aus der Liste „am Rand“): (1) „Mit freundlichen Grüßen“ als Beginn der Signatur:
Alles danach wegzulassen würde auch weitergeleitete Mails und Nachsätze abschneiden; der Schaden wäre größer
als der Nutzen. (2) Das Häkchen „Von selbst lesen“ springt erst um, wenn der Server gespeichert hat: Es zeigt,
was gilt, nicht, was angeklickt wurde. (3) Der Hinweis „Enthält Inhalte von Dritten“ an der Bestätigung eines
selbst getippten Termins: so gewollt. (4) Eine Warnung von Intel von Hand aufheben: Das wäre eine neue
Funktion, keine Kleinigkeit; offen. (5) Das amerikanische Datumsformat: liegt am Browser der Prüfung.

**Eigene Entscheidungen:** (1) Kommt ein Satz, während der davor noch wartet, wird ein wartender fester Befehl
sofort ausgeführt, eine wartende Frage an das KI-Gehirn entfällt (die neue hätte sie ohnehin abgelöst, nur
wäre die Anfrage schon bezahlt gewesen). (2) Beispielwetter wird im Kopf und im Briefing weggelassen statt
gekennzeichnet: Ein Wetter, das keines ist, hilft dort niemandem. (3) Was nicht verbunden ist, zählt nicht als
Lücke unter „Wartet auf dich“ („Nichts wartet auf dich.“ bleibt); was ausgefallen ist, schon („Soweit JARVIS
es gerade lesen kann, wartet nichts auf dich.“). (4) Ein fester Befehl, den ein neuerer Satz überholt hat, wird
ausgeführt und steht im Gespräch, aber er wird nicht gesprochen: Gesprochen wird die Antwort auf den neuen Satz.
(5) Was „Heute“ aus einer Lücke folgert, hängt an ihrer Art (lädt, fehlt, gestört), nicht am Wortlaut des Satzes.

**Grenzen:** (1) Geprüft ist gegen Nachbauten (Mac-Kalender, Postfach, Grok). (2) Die fehlenden
Outlook-Termine und der Satz „Soweit JARVIS es gerade lesen kann …“ sind nur als Regel getestet, nicht im
Browser. (3) Die Scheiben „Märkte“ und „Agenten“ sind in dieser Prüfung nur gestreift (Märkte prüft
`marktlage-rauch.ts`). (4) Der Mac, Windows und Safari sind nicht geprüft. (5) **Offen:** „Heute“ unterscheidet
nicht, ob eine Abfrage an JARVIS selbst noch läuft oder dauerhaft scheitert (etwa die Projekte bei ausgefallener
Datenbank): Dann steht dort weiter „… laden noch“. Das ist ehrlicher als das frühere „Nichts wartet auf dich“,
aber noch nicht genau; vorgemerkt für J10. (6) Ob eine Stimme „−0,7 %“ ohne die Umschreibung richtig läse, ist
nicht ausprobiert; mit „minus“ hängt es nicht mehr an der Stimme.

### Testergebnisse Schritt J9 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1041 Tests: 1041 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 20). Am Mac wären es rechnerisch 1039 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 25 Handprüfungen bestanden**, in zwei Hälften gestartet (13 und 12, zusammen rund 9 Minuten; in einem Zug passt der Lauf nicht mehr in die zehn Minuten, die ein Befehl hier laufen darf). „Heute“ 22 Sekunden, Gespräch 54 |
| Sammellauf, erster Durchgang der ersten Hälfte | **3 von 13 fehlgeschlagen:** Stimme, Edelmetalle, Gedächtnis. Zwei Ursachen lagen in den Prüfungen, eine ist ungeklärt (nächste drei Zeilen) |
| Prüfung Edelmetalle: hing an der Tageszeit | Der Agent liest von selbst, wenn eine seiner Uhrzeiten (ab Werk 07:30 und 17:30) höchstens zwei Stunden zurückliegt. Der Lauf fiel auf 18:30 Uhr: Der Kursdienst wurde doppelt gefragt, „Noch kein Lagebild“ stand nicht mehr da. Kein Fehler im Programm (Nachholen ist gewollt). Die Prüfungen Edelmetalle und Marktlage stellen die Uhrzeiten jetzt fern von jetzt (`test/helfer/uhrzeiten.ts`, mit eigenem Test über alle Tageszeiten) |
| Prüfung Stimme: hing an der Länge des Briefings | Der Schritt „Tageslimit“ verließ sich darauf, dass bis dahin über 500 Zeichen gesprochen waren. Seit das Briefing kein Beispielwetter mehr ansagt (J9.9), waren es 497. Die Prüfung füllt jetzt selbst genau bis zum Limit auf |
| Prüfung Gedächtnis: **einmal gescheitert, Ursache nicht gefunden** | Im ersten Sammellauf standen nach „Vergessen“ 21 statt 20 Einträge in der Datei. In 14 Wiederholungen (8 einzeln, 5 unter Last auf allen Kernen, 1 im Sammellauf) bestanden. An dieser Prüfung und am Gedächtnis wurde nichts geändert, damit der Fehler sichtbar bleibt, falls er wiederkommt. **Offen** |
| Prüfung „Heute“, erste Läufe | mehrfach fehlgeschlagen. Echte Funde: J9.8 bis J9.10. Aus der Prüfung selbst: der erste Stand wurde geprüft, bevor der Kalender geantwortet hatte; nach „zurück“ behält die Seite den vorigen Raum unsichtbar (es gibt dann zwei Hauptbereiche); die Überschrift heißt „Heute:“, wenn eine Uhrzeit folgt; ein Satz stand an zwei Stellen |
| Gegenproben (absichtlich eingebaute Fehler, zehn eigene Baue) | **Erster Durchgang: 16 von 17 entdeckt.** Nicht entdeckt: „Prozente wieder mit Bindestrich“; die Prüfung Marktlage sah nur die Zeilen der Edelmetalle, die ihr Minuszeichen selbst setzen. Die Prüfung verlangt jetzt „Ethereum … −0,7 %“ im Raum Intel und an der Scheibe „Märkte“; die Gegenprobe wurde wiederholt und **scheitert jetzt wie gewollt (17 von 17).** Die anderen: „Heute“ (9): ohne lesbaren Kalender „kein Termin“ im Kopf; „kein Termin“ beim Laden; Beispielwetter als Wetter; der Satz zum Tag verschweigt das ausgefallene Postfach; alte Mails nach dem Ausfall; Post ganz oben unter „Wartet auf dich“; Vergangenes nicht durchgestrichen; Not-Aus fehlt unter „Wartet auf dich“; unlesbarer Tresor heißt „nichts fällig“. Kalender (1), Postfach (1), Intel (1), Dokumente (1), Gespräch (3: doppelter Satz zählt zweimal; fester Befehl geht verloren; zwei Fragen gehen beide an Claude). Kein eingebauter Fehler ließ den Bau scheitern; danach war der Stand wiederhergestellt (Vergleich mit dem Stand davor) |
| Tests zuerst | Minuszeichen, Einzahl, ganzer Satz, Lücken in „Heute“, Wetter, alter Stand der Post: Tests zuerst geschrieben und rot gesehen. Für „Läuft seit“, den Zähler im Postfach und die schnellen Sätze war die Handprüfung der rote Test. Alle eingearbeiteten Punkte aus dem Code-Review: erst der Test, rot gesehen (vier rote Regeltests in „Heute“, je einer für Vorlesen und Post, dazu die Handprüfung Gespräch, die an „Denke nach …“ scheiterte) |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Hinweise. **Neun eingearbeitet:** eine späte Bestätigung nahm „Denke nach …“ weg und hätte beim Sprechen die laufende Antwort abgebrochen; unvollständige Outlook-Termine galten nicht als Lücke; fehlende Kalender-Erlaubnis stand als vorübergehende Störung da; „Wartet auf dich“ wartete nicht auf Desk, Intel und Dokumente; das Minuszeichen ging ungeprüft ans Vorlesen; ein später gescheiterter Abruf konnte einen neueren, gelungenen Stand der Post verwerfen; doppelte Helfer und zwei Wortlaute für dieselbe Lücke; Folgerungen hingen am Wortlaut von Sätzen; ein überflüssiger Zwischenname. **Einer offen notiert:** Laden und dauerhaftes Scheitern einer eigenen Abfrage sind in „Heute“ nicht unterschieden (Grenze 5). Danach `npm run pruefen` und der Sammellauf erneut |
| Sicherheitsprüfung (von Hand) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code (die Schlüssel und Passwörter der Prüfungen sind erfunden; alle Adressen sind `127.0.0.1` oder `example.com`). Vorsichtiger als vorher: Was nicht gelesen ist, wird nicht als leer ausgegeben; erfundenes Wetter wird nicht mehr angezeigt oder angesagt; ein gescheiterter Abruf der Post zeigt keinen alten Stand. Die Fehlermeldung des Mac-Kalenders steht weiter nicht in „Heute“ (im Test mit spitzen Klammern geprüft). „Heute“ fragt den Mac nicht nach der Kalender-Erlaubnis (geprüft) |
| Am Rand aufgefallen, nicht geändert | An der Scheibe „Agenten“ in „Heute“ sind lange Namen abgeschnitten („G..“, „B..“); der Hinweis „Beispieldaten“ steht nur auf großen Bildschirmen in der Ecke. Beides vorgemerkt für J10 |
| Nicht geprüft | **der Mac** (Kalender, Mitteilungen, Stimme), **echte Dienste** (Postfach, Grok, Claude, Wetterdienst, Twelve Data), Windows, Safari |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten).


### Schritt J10: JARVIS ohne Maus und im schmalen Fenster; „Heute“ unterscheidet Laden und Ausfall (15. November 2026)

**Warum:** Bisher war jede Prüfung mit der Maus und in voller Breite gelaufen. Wer mit der Tastatur arbeitet
oder JARVIS in einem schmalen Fenster neben anderen Programmen offen hat, kam nie vor. Dazu zwei offene Punkte
aus J9: abgeschnittene Namen an den Scheiben in „Heute“ und der Unterschied zwischen „lädt noch“ und „antwortet
nicht“.

**Bestandsaufnahme zuerst:** Ein Messlauf durch alle elf Räume in zwei Breiten (390 und 1280 Pixel): seitliches
Überlaufen, abgeschnittener Text, Weg der Tab-Taste (wo landet die Markierung, ist sie zu sehen), Bedienbares
ohne Namen. Ergebnis: Kein Raum läuft seitlich über, alles Bedienbare hat einen Namen und ist mit der Tab-Taste
erreichbar. Sieben Dinge hakten (Tabelle unten).

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J10.1 Was mit der Tab-Taste markiert wird, rollt nicht mehr hinter die Zeile, in der JARVIS antwortet, und nicht hinter die Leiste (breit und schmal, auch in Räumen ohne Scheiben) | Testbereit | `scroll-padding` an `.raum-wand` und `.raum` in `src/app/globals.css`, im schmalen Fenster der Platz unter dem Text (`.raum:not(:has(.raum-scheiben > *)) .raum-wand`); Prüfung Bedienung, Schritte 1 und 4 |
| J10.2 Die Leertaste bedient, was markiert ist (etwa „Feste Grenzen“ aufklappen); das Mikrofon schaltet sie nur, wenn nichts markiert ist | Testbereit | `BEDIENBAR` in `JarvisProvider.tsx`; Prüfung Bedienung, Schritt 2 |
| J10.3 Das Menü der Räume („Mehr“, schmal „Räume“) geht mit der Tastatur: Pfeiltasten, Pos1, Ende; Escape schließt es und markiert wieder den Knopf; Pfeil nach unten oder oben öffnet es | Testbereit | `Mehr` in `AppFrame.tsx`; Prüfung Bedienung, Schritte 3 und 4 |
| J10.4 Schmales Fenster: Im Feld für JARVIS ist Platz zum Tippen (125 statt rund 40 Pixel bei 390 Breite); der Name „JARVIS“ weicht dort, der Raum „Gespräch“ steht unter „Räume“; das Menü bleibt im Fenster | Testbereit | `Leiste` und `Mehr` in `AppFrame.tsx`; Prüfung Bedienung, Schritt 4 |
| J10.5 Das Feld für JARVIS zeigt den Rand an seinem ganzen dunklen Rahmen, wenn es mit der Tastatur markiert ist (vorher: ein Rechteck innen im runden Rahmen, blaugrün auf fast Schwarz) | Testbereit | `Composer` in `Console.tsx`, Regel `[data-fokusrahmen] textarea:focus-visible` in `globals.css`; Prüfung Bedienung, Schritte 1 und 4 |
| J10.6 Aufgeklapptes Gespräch: Die Markierung steht nach dem Aufklappen im Gespräch; Escape klappt es zu und markiert wieder die Zeile über der Leiste (gibt es die nicht mehr, das Feld für JARVIS); arbeitet JARVIS gerade, unterbricht das erste Escape ihn und das Gespräch bleibt stehen; im schmalen Fenster heißt es nicht mehr „G“ | Testbereit; der Fall „Zeile gibt es nicht mehr“ **nicht im Browser geprüft** (dort steht immer der Hinweis zum Mikrofon in der Zeile) | `Gespraech` und `Leiste` in `AppFrame.tsx`; Prüfung Bedienung, Schritt 4 |
| J10.7 Scheiben (in jedem Raum): Kein Name ist mehr abgeschnitten. Ein langer Name bricht um (mit Trennstrich), ein Wert, der nicht mehr daneben passt, rückt in die nächste Zeile. In den schmalen Scheiben von „Heute“ läuft der Name eines Termins hinter der Uhrzeit weiter und unter ihr durch (drei statt fünf Zeilen). Passt eine Scheibe trotzdem nicht in die Höhe, rollt sie in sich, statt unter den Boden zu ragen | Testbereit | `ScheibenZeile` und `Scheibe` in `Raum.tsx`, `.raum-scheiben > *` in `globals.css`; Prüfung Bedienung, Schritt 5 (sechs Termine mit langen Namen, auch bei 1280 × 700) |
| J10.8 „Heute“: Antwortet JARVIS an einer Stelle selbst nicht (eine eigene Abfrage scheitert von Anfang an), steht dort „… lassen sich gerade nicht laden“ statt endlos „… laden noch“, auch an den Scheiben „Agenten“ und „Märkte“; „Wartet auf dich“ sagt dann „Soweit JARVIS es gerade lesen kann …“. Solange noch nie etwas kam, versucht JARVIS es nach 5, 15, 45 Sekunden wieder und nicht erst mit dem nächsten Takt (bei den Terminen fünf Minuten) | Testbereit | `gescheitert`, `bild` und die schnellen Versuche in `src/lib/geteilt.ts`, `failed` in `usePolling.ts`, `luecken` und `restStand` in `src/lib/heute.ts`; `test/regeln/geteilt.test.ts`, `test/regeln/heute.test.ts`; Prüfung Heute, neuer Schritt 7 |
| J10.9 Handprüfung „Bedienung“ | Testbereit, **nur im Browser der Sandbox** | `test/hand/bedienung-rauch.ts` (Port 3128, 5 Schritte); jetzt 26 Handprüfungen |
| J10.10 Das Bauen (`next build`) übernimmt jede Änderung am Aussehen: Der Zwischenspeicher des Bauens ist aus | Testbereit | `turbopackFileSystemCacheForBuild: false` in `next.config.ts`; Regeltest in `test/regeln/handpruefungen.test.ts`; Messung siehe unten |

**Die Funde im Einzelnen.**

| Fund | vorher | jetzt |
|---|---|---|
| Markierung hinter der Leiste (J10.1) | Beim Durchgehen mit der Tab-Taste lag jede dritte bis vierte Stelle hinter der Antwortzeile über der Leiste (gemessen: 2 bis 11 je Raum); man tippte blind | Die Seite rollt so, dass das Markierte darüber steht |
| Leertaste (J10.2) | Auf einem Aufklapper („Feste Grenzen“) startete die Leertaste das Mikrofon, und aufgeklappt wurde nichts | Sie klappt auf |
| Menü der Räume (J10.3) | Escape schloss es nicht (es unterbrach nur JARVIS), Pfeiltasten taten nichts | wie jedes Menü |
| Schmales Fenster (J10.4) | Vom Feld für JARVIS blieben rund 40 Pixel („Sag „“) | 125 Pixel |
| Rand am Feld für JARVIS (J10.5) | Der Rand stand als Rechteck innen im runden, dunklen Rahmen (blaugrün auf fast Schwarz, Kontrast gerechnet 3,1 zu 1) | Der Rand steht um den ganzen Rahmen, auf der hellen Leiste (gerechnet 4,0 zu 1), und nur dort. Zuerst hatte ich das Feld für randlos gehalten; siehe Testergebnisse |
| Gespräch (J10.6) | Nach dem Aufklappen mit der Tastatur war die Markierung weg (die Tab-Taste begann wieder oben auf der Seite); im schmalen Fenster stand als Überschrift „G“ | siehe oben |
| Scheiben (J10.7) | „Bespre…“, „Browser-A…“, „I..“ neben „nicht eingerichtet“ | ganze Namen |

**Fund beim Gegenprüfen: Das Bauen verschluckte gelegentlich eine Änderung am Aussehen.** Zwei Gegenproben
widersprachen sich (ein eingebauter Fehler an `globals.css` blieb unentdeckt, der nächste scheiterte an der
Stelle des vorigen). Nachgemessen: `globals.css` abwechselnd in zwei Fassungen geschrieben, jedes Mal gebaut und in
`.next/static` nachgesehen, welche Fassung dort steht.

| Messung | Ergebnis |
|---|---|
| `next build` wie bisher (mit Zwischenspeicher `.next/cache/turbopack`), 6 Mal | 5 richtig, **1 Mal der alte Stand** (Exit 0, keine Meldung); in einem ersten Versuch von Hand 2 von 4 falsch |
| dasselbe mit 3 Sekunden Pause vor dem Bauen, 6 Mal | 5 richtig, **1 Mal der alte Stand** (an der Eile liegt es also nicht) |
| Zwischenspeicher vor jedem Bauen gelöscht, 6 Mal | 6 richtig, je 13 Sekunden |
| mit der neuen Einstellung (Zwischenspeicher aus), 12 Mal | 12 richtig, je 11 bis 12 Sekunden (vorher 5 bis 6) |
| `next dev` (so startet JARVIS am Mac): Datei geändert, während JARVIS aus war, dann gestartet; 21 Mal | 21 richtig |

Warum der Zwischenspeicher die Änderung manchmal nicht bemerkt, ist **nicht geklärt** (ein Fehler in Next oder im
Baustein für Tailwind liegt nahe; gesucht habe ich dort nicht). Geändert ist deshalb nur, was sich messen ließ: Das
Bauen läuft ohne ihn. **Folgen:** (1) Der Mac ist nach dieser Messung nicht betroffen; dort wird nicht gebaut. Bewiesen
ist das mit 21 Versuchen nicht, nur sehr wahrscheinlich (bei einer Fehlerquote wie beim Bauen wären 21 Treffer in
Folge ein Zufall von rund 2 %). (2) Betroffen sein konnten die Handprüfungen und die Gegenproben, wenn zwischen zwei
Läufen nur `globals.css` geändert wurde. Bei den früheren Gegenproben, deren Skripte noch vorliegen (33), kam das
nicht vor; die Gegenproben dieses Schrittes sind mit dem verlässlichen Bauen wiederholt. (3) Ein späterer zentraler
Betrieb würde bauen; für ihn gilt die Einstellung gleich mit.

**Eigene Entscheidungen:** (1) Escape im Menü schließt nur das Menü und unterbricht JARVIS dabei nicht. (2) Im
schmalen Fenster verschwindet der Name „JARVIS“ aus der Leiste; der Platz gehört dem Feld. (3) Ist das Gespräch
aufgeklappt und steht die Markierung darin, gilt Escape zuerst JARVIS, wenn er gerade arbeitet (zuhört, nachdenkt,
spricht): Es unterbricht ihn, und das Gespräch bleibt stehen. Arbeitet er nicht, klappt Escape das Gespräch zu.
Steht die Markierung im Feld für JARVIS, unterbricht Escape wie bisher nur JARVIS. (4) Ein Stand, der schon da ist, bleibt bei einem späteren Ausfall stehen und gilt
nicht als „nicht ladbar“ (wie bisher; nur „noch nie geantwortet“ ist neu). (5) Scheitert ein älterer Abruf, während
ein neuerer schon unterwegs ist, steht für diesen Augenblick „lässt sich gerade nicht laden“ da; der neuere
berichtigt es, sobald er ankommt (ein Hinweis aus dem Code-Review, bewusst so gelassen: Würde auf den neueren
gewartet, bliebe eine Stelle, die im Takt von zehn Sekunden gefragt wird und nie antwortet, für immer bei „lädt
noch“).

**Grenzen:** (1) Geprüft ist im Chromium der Sandbox; Safari und der Mac sind nicht geprüft (Safari markiert mit
der Tab-Taste ab Werk nur Felder, nicht Knöpfe und Verweise: Systemeinstellungen → Tastatur → Tastaturnavigation).
(2) Kleine Klickflächen (einige Verweise sind nur 14 bis 21 Pixel hoch) sind nicht geändert. (3) Ein Vorleseprogramm
(VoiceOver) ist nicht ausprobiert; geprüft ist nur, dass alles Bedienbare einen Namen hat. (4) Die Silbentrennung
an den Scheiben macht der Browser; an anderen Rechnern kann sie anders ausfallen (abgeschnitten wird in keinem Fall).
(5) Die Breiten zwischen 390 und 1280 sind nur an zwei Stellen gemessen. (6) Das Bauen dauert jetzt rund 12 statt
6 Sekunden; die Ursache im Zwischenspeicher ist nicht gefunden, nur umgangen. (7) Ist das Gespräch aufgeklappt,
verdeckt es, was dahinter mit der Tab-Taste markiert wird (es ist viel höher als die Zeile, für die der Platz
bemessen ist); Escape klappt es zu. Vorgemerkt für J11. (8) „Lässt sich gerade nicht laden“ steht nur in „Heute“.
Die anderen Räume (Aufgaben, Post, Projekte, Agenten …) schreiben bei einem Ausfall von Anfang an weiter „lädt“.
Vorgemerkt. (9) Eine Scheibe, die in sich rollt, lässt sich mit der Tastatur allein nicht rollen (mit Maus,
Trackpad und Finger schon); alle Termine stehen im Raum Kalender, in den ihre Überschrift führt. (10) Bei
1280 × 700 mit sechs langen Terminen liegt das Ende der Scheibe hinter der Zeile, in der JARVIS antwortet, wenn
dort gerade etwas steht.

### Testergebnisse Schritt J10 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1048 Tests: 1048 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 7). Am Mac wären es rechnerisch 1046 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 26 Handprüfungen bestanden**, in drei Teilen gestartet (13, 10 und 3; zusammen rund 10 Minuten). Bedienung 48 Sekunden, „Heute“ 27 |
| Prüfung Bedienung, erste Läufe | mehrfach fehlgeschlagen. Echte Funde: J10.1 bis J10.7. Aus der Prüfung selbst: ein Datumsfeld hat mehrere Haltepunkte; die Schwelle für das Feld war zu streng (130 statt gemessener 125 Pixel); das Menü ragte nach meiner eigenen Änderung links aus dem Fenster; meine erste Fassung für die Scheiben brach Namen Buchstabe für Buchstabe um |
| Gegenproben, erster Durchgang (absichtlich eingebaute Fehler, zehn eigene Baue) | **10 von 12 entdeckt.** Nicht entdeckt: (a) „das Feld für JARVIS zeigt keinen Rand“ und (b) „Markiertes rollt im schmalen Fenster wieder hinter die Leiste“ |
| Lücke (a): mein Fund war falsch | Das Feld hatte schon vorher einen Rand, nur innen im dunklen Rahmen (die Klasse, die ihn abschalten sollte, verliert gegen die Regel in `globals.css`). Nach meiner Änderung standen **zwei Ränder ineinander**. Jetzt steht einer, um den ganzen Rahmen; die Prüfung verlangt genau das (außen ja, innen nein) |
| Lücke (b): die Prüfung prüfte nichts | Nach dem Wechsel in den Raum über das Menü begann der Gang mit der Tab-Taste in der Leiste und war nach **3 Stellen** zu Ende; die lange Liste kam nie dran. Der Gang beginnt jetzt am Anfang der Seite, erkennt sein Ende am Element und nicht am Namen, und die Prüfung verlangt, dass alle 14 Aufgaben erreicht wurden |
| Gegenproben wiederholt | Zuerst mit widersprüchlichem Ergebnis; Ursache war das Bauen (Fund oben, J10.10). Mit dem verlässlichen Bauen: **4 von 4 entdeckt** (die zwei Lücken, der neue Fehler „zwei Ränder“ und noch einmal „hinter der Antwortzeile“), jede an der gemeinten Stelle. Die übrigen neun aus dem ersten Durchgang sind nicht wiederholt; die Zeilen, an denen sie scheiterten, sind unverändert |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Hinweise, alle nachgeprüft. **Acht eingearbeitet:** (1) Escape im aufgeklappten Gespräch brach eine laufende Antwort ab; (2) **die Scheibe „Termine heute“ ragte an einem Tag mit sechs langen Terminen unter den Boden** (nachgemessen: bei 1280 × 700 um 272 Pixel, bei 1440 × 800 um 148, bei 1920 × 1000 passte sie; vor J10 war dort abgeschnitten worden, es war also meine eigene Verschlechterung); (3) Räume ohne Scheiben hatten im schmalen Fenster unten keinen Platz über der Leiste; (5) nach einem einzigen Fehlschlag am Anfang stand „lässt sich gerade nicht laden“ bis zum nächsten Takt da; (6) nach „Neues Gespräch“ ging die Markierung beim Zuklappen verloren; (8, zum Teil) die Scheiben „Agenten“ und „Märkte“ in „Heute“ sagten bei einem Ausfall weiter „melden sich“ und „Noch keine Kurse“; (9) jede Abfrage meldete sich doppelt an, und die Liste der Ausfälle stand zweimal im Code; (10) die Prüfung der Leertaste sah auf irgendeine Statuszeile, und der Block für die Mittags-Zeitzone stand in sieben Prüfungen. **Einer bewusst nicht** (4, siehe Eigene Entscheidungen 5). **Zwei als Grenze vermerkt** (7 und der Rest von 8, siehe Grenzen 7 und 8) |
| Gegenproben zu den Änderungen aus dem Review | **8 von 8 entdeckt.** Eine („kein schneller neuer Versuch“) scheiterte zuerst an einer anderen, wackligen Stelle der Prüfung „Heute“ und zählt so nicht; allein wiederholt scheiterte sie zweimal an der gemeinten Stelle (Schritt 7) |
| Fund durch eine vorhandene Prüfung | Die Prüfung „Heute“ las nach dem Umbau der Scheibe „08:00Frühbesprechung“: Zwischen Uhrzeit und Name stand kein Leerzeichen, nur ein Abstand. Ein Vorleseprogramm hätte es so vorgelesen. Behoben |
| Wacklige Stellen in den Prüfungen | (a) Bedienung scheiterte ohne eingebauten Fehler in 2 von 3 Läufen: Die Prüfung drückte die nächste Taste, bevor die Markierung nach dem Zuklappen zurück war. Sie wartet jetzt darauf; danach 4 von 4 und der Sammellauf bestanden. (b) „Heute“ suchte einen Satz, der für einen Augenblick an zwei Stellen stehen kann. (c) Meine Zählung für „die Leertaste startet nicht das Mikrofon“ war zweimal falsch (sie zählte das Lauschen auf „Jarvis“ mit, das die Seite bei jedem Tastendruck neu versucht); geprüft wird jetzt der angezeigte Zustand, mit Gegenstück (ohne Markierung schaltet die Leertaste auf „Ich höre zu“) |
| Tests zuerst | Regeltests zuerst und rot gesehen: nie antwortende Schnittstelle, Ausfälle in „Heute“, schnelle Versuche (5, 15, 45 Sekunden), ein Bild für Stand und Ausfall, Bauen ohne Zwischenspeicher, Mittags-Zeitzone. In der Handprüfung rot gesehen: die sieben ersten Funde, die zwei Ränder, der Gang durch nur 3 Stellen. **Nicht zuerst rot gesehen**, sondern nachträglich durch Gegenproben belegt: Escape während JARVIS arbeitet, Raum ohne Scheiben, hohe Scheibe, Name hinter der Uhrzeit, Scheiben „Agenten“ und „Märkte“ |
| Sicherheitsprüfung (von Hand) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code. Die schnellen Versuche gehen nur an JARVIS selbst (`127.0.0.1`), höchstens einer je Fehlschlag, nie dichter als der Takt, und nur solange noch nie etwas kam. `seite.route` (Abfragen verzögern oder abbrechen) steht nur in den Prüfungen. Das Bauen ohne Zwischenspeicher ändert nichts am Ergebnis, nur an der Dauer |
| Am Rand aufgefallen, nicht geändert | Die Silbentrennung im Chromium der Sandbox trennt manches falsch („Gewer-bepark“); am Mac trennt der dortige Browser. Ob JARVIS eine Notiz noch schreibt, wenn man ihn mit Escape mitten im Befehl unterbricht, ist nicht untersucht |
| Nicht geprüft | **der Mac**, **Safari**, ein **Vorleseprogramm** (VoiceOver), echte Dienste, Windows, Fensterbreiten zwischen 390 und 1280 außer den gemessenen |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten).


### Schritt J11: JARVIS für ein Vorleseprogramm; größere Klickflächen; kein verlorener Buchstabe beim Raumwechsel (15. November 2026)

**Warum:** In J10 blieb offen, wie JARVIS für jemanden ist, der ihn sich vorlesen lässt (VoiceOver am Mac), dazu
zwei Punkte von dort: die kleinen Klickflächen und das aufgeklappte Gespräch, das verdeckte, was dahinter
markiert war.

**Bestandsaufnahme zuerst:** Ein Messlauf durch alle zwölf Räume mit den Augen eines Vorleseprogramms: Titel und
Sprache der Seite, Überschriften der Reihe nach, benannte Bereiche, Namen von Feldern, Knöpfen und Bildern, was
nach einem Klick gemeldet wird, Höhe von allem Anklickbaren. In Ordnung war: Jeder Raum hat seinen Namen im Titel,
genau eine Hauptüberschrift und keine übersprungene Stufe; kein Feld, Knopf oder Bild ist ohne Namen; ein Wechsel
des Raums wird angesagt. Sechs Dinge hakten (Tabelle „Funde“).

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J11.1 Die Scheiben rechts sind ein eigener Bereich „Auf einen Blick“, die Leiste unten ein eigener Bereich „Leiste“; nichts Bedienbares steht mehr außerhalb eines Bereichs | Testbereit | `RaumSeite` in `Raum.tsx` (`aside`), `Leiste` in `AppFrame.tsx`; Prüfung Vorlesen, Schritt 1 |
| J11.2 Die Zeile über der Leiste heißt wie ihr Inhalt (was JARVIS gerade sagt) und am Ende „Ganzes Gespräch zeigen“ | Testbereit | `Antwortzeile` in `AppFrame.tsx`; Prüfung Vorlesen, Schritt 2 |
| J11.3 Was JARVIS antwortet, wird angesagt, solange das Gespräch zugeklappt ist: jede fertige Antwort, in ihrer Reihenfolge, auch dieselben Worte ein zweites Mal. Nicht angesagt wird, womit JARVIS selbst zu hören war, und nichts aus dem Gespräch von gestern | Testbereit | Regeln in `src/lib/ansage.ts` (11 Regeltests), `Ansage` in `AppFrame.tsx`; `hoerbar` in `src/lib/useVoice.ts` (wirklich zu hören, nicht nur „Spreche …“); Prüfung Vorlesen, Schritt 2 |
| J11.4 Was auf einen Klick hin gemeldet wird („Eingetragen …“, „nicht gespeichert“), ist als Meldung ausgezeichnet: Gelungenes als Hinweis, Gescheitertes als Warnung. Was schon dasteht, wenn der Raum aufgeht („Der Not-Aus steht“, „Verbunden …“), bleibt gewöhnlicher Text | Testbereit | `Notice` mit `meldung` in `ui.tsx`, an 28 Stellen gesetzt; Prüfung Vorlesen, Schritte 3 und 6 |
| J11.5 Das aufgeklappte Gespräch klappt zu, sobald die Markierung mit der Tab-Taste aus Gespräch und Leiste hinaus auf die Seite wandert. Ein Mausklick auf die Seite, Tippen dort und ein kurzer Wechsel in ein anderes Fenster lassen es offen | Testbereit | `Leiste` in `AppFrame.tsx`; Prüfung Vorlesen, Schritt 4 |
| J11.6 Alles Anklickbare ist in allen zwölf Räumen mindestens 24 Pixel hoch (vorher 14 bis 22 an rund einem Dutzend Arten von Stellen) | Testbereit | `.griff`, `summary` und die Regel für Kästchen in `globals.css`; Haken an einer Aufgabe in `TasksView.tsx`; Prüfung Vorlesen, Schritt 5; Regeltest `test/regeln/klickflaechen.test.ts` |
| J11.7 Handprüfung „Vorlesen“ | Testbereit, **nur im Browser der Sandbox, ohne Vorleseprogramm** | `test/hand/vorlesen-rauch.ts` (Port 3129, 6 Schritte); jetzt 27 Handprüfungen |
| J11.8 Wer tippt, während JARVIS nach einer Antwort den Raum wechselt, verliert keinen Buchstaben mehr; die Eingabetaste schickt auch in diesem Augenblick ab, und zwar das, was im Feld steht | Testbereit | `useDraft` und `Composer` in `Console.tsx`; Prüfung Bedienung, neuer Schritt 6 (fünf Versuche mit verschieden schnellem Tippen, fünf mit der Eingabetaste gleich nach der Antwort) |

**Die Funde im Einzelnen.**

| Fund | vorher | jetzt |
|---|---|---|
| Antwort von JARVIS | Die Zeile über der Leiste hatte den festen Namen „Ganzes Gespräch zeigen“. Ein Vorleseprogramm las nur den und nie, was JARVIS geantwortet hat; angesagt wurde eine Antwort nur im aufgeklappten Gespräch | Der Name ist der Inhalt, und jede fertige Antwort wird angesagt (J11.2, J11.3) |
| Meldungen nach einem Klick | standen stumm da; wer nicht hinsieht, erfuhr nicht, ob gespeichert wurde | als Meldung ausgezeichnet (J11.4) |
| Scheiben und Leiste | lagen außerhalb jedes Bereichs; mit „zum nächsten Bereich springen“ waren sie nicht zu finden | zwei benannte Bereiche (J11.1) |
| Aufgeklapptes Gespräch | verdeckte, was dahinter mit der Tab-Taste markiert wurde (J10, Grenze 7) | klappt zu, wenn die Markierung hinauswandert (J11.5) |
| Klickflächen | Haken an einer Aufgabe 19 Pixel; Verweise wie „öffnen ›“ 14, Überschriften der Scheiben 16, „Ansicht öffnen“ und alles zum Aufklappen 18, Zähler in „Heute“ und die Abschnitte der Einstellungen 21, „JARVIS“ 22; Kästchen zum Ankreuzen 13 bis 15 in zu niedrigen Zeilen | überall mindestens 24 (J11.6) |
| **Alter Fehler, durch die neue Prüfung gefunden** | Die Prüfung Vorlesen scheiterte in 3 von 4 Läufen an einer Stelle, an der sie gleich nach einer Antwort die nächste Frage tippt. Nachgestellt und gemessen: Tippt man genau in dem Augenblick, in dem JARVIS nach „Meine Termine“ in den Raum Kalender wechselt, ging **in 6 von 12 Versuchen ein Buchstabe verloren** („ie wird das Wetter“). Ursache, mit einer Sonde im Feld gemessen: Der Browser meldet den Buchstaben, bei React kommt er in diesem Augenblick (rund 40 Millisekunden, während der neue Raum fertig wird) nicht an, und das nächste Zeichnen setzt das Feld auf den Stand davor zurück. Der Fehler ist älter als J11 (seit dem Raumwechsel mit Überblendung, E2). **Dasselbe galt für die Eingabetaste:** In diesem Augenblick gedrückt, kam auch sie bei React nicht an; im Feld stand dann die Frage mit einem Zeilenumbruch dahinter, und nichts wurde abgeschickt (so scheiterte die Prüfung Vorlesen nach der ersten Korrektur noch in 4 von 6 Läufen) | Das Feld hört Buchstaben und Eingabetaste vom Browser selbst, an React vorbei, stellt nach jedem Zeichnen wieder her, was zuletzt getippt wurde, und schickt ab, was im Feld steht. Danach **0 von 33 Versuchen** mit verlorenem Buchstaben (18 im Messlauf, 15 in drei Läufen der Prüfung); mit der Eingabetaste die Prüfung Vorlesen 6 von 6 und Bedienung 3 von 3 (J11.8) |
| Beim eigenen Durchsehen | Dieselben Worte zweimal („Notiert.“) wären nur einmal angesagt worden; „Ganzes Gespräch zeigen“ wäre zweimal vorgelesen worden (als Name und als Beschreibung); ein Mausklick in ein Feld der Seite klappte das Gespräch zu | behoben, jeweils zuerst in der Prüfung rot gesehen |

**Eigene Entscheidungen:** (1) In J10 war vorgemerkt, das aufgeklappte Gespräch zu einem eigenen Fenster zu
machen, das die Markierung festhält. Stattdessen klappt es zu, wenn die Markierung hinauswandert: Es ist kein
Dialog, man soll daneben weiterarbeiten können, und Escape schließt es wie bisher. (2) Was JARVIS hörbar selbst
spricht, wird nicht auch noch angesagt; sonst redeten zwei Stimmen durcheinander. Bleibt seine Stimme stumm (der
Browser hat keine oder darf noch keinen Ton abspielen), sagt das Vorleseprogramm an, nach zwei Sekunden
Wartezeit, in denen JARVIS beginnen könnte. Am Mac spricht JARVIS im Normalfall jede Antwort selbst; einen
Schalter „JARVIS ohne Stimme“ gibt es bisher nicht.
(3) Eine Notiz ist ab Werk gewöhnlicher Text; nur das Ergebnis eines Klicks ist eine Meldung (ein Hinweis aus dem
Code-Review: Andersherum würde jede künftige Notiz, die schon beim Betreten dasteht, das Vorlesen unterbrechen,
und eine Notiz mit einer Zahl darin würde bei jeder Änderung neu vorgelesen). (4) Der kleine Hinweis „Ganzes
Gespräch zeigen“ beim Überfahren der Zeile mit der Maus entfällt; der Pfeil am Rand der Zeile bleibt. (5) Die
Klickflächen wachsen durch unsichtbaren Rand, nicht durch größere Schrift; das Aussehen bleibt. Sichtbar größer
sind nur der Haken an einer Aufgabe (19 auf 24 Pixel) und Zeilen mit einem Kästchen (bis 3 Pixel höher).
Nachgemessen in zehn Räumen vor und nach der Änderung: sieben unverändert, „Agenten“ höchstens 2 Pixel,
„Aufgaben“ 6, „Einstellungen“ 9 (aufaddiert über die ganze lange Seite). (6) 24 Pixel sind das Mindestmaß der
Richtlinie für barrierefreie Seiten (WCAG 2.2, 2.5.8), nicht die 44 Pixel für Fingerbedienung.

**Grenzen:** (1) **Kein Vorleseprogramm lief mit.** Geprüft ist, was der Browser einem Vorleseprogramm übergibt
(Namen, Rollen, Bereiche, Stellen für Ansagen), nicht, was VoiceOver daraus macht. Bekannt uneinheitlich ist, ob
VoiceOver in Safari eine Meldung ansagt, die samt ihrer Auszeichnung erst nach dem Klick erscheint. (2) Darf
JARVIS das Mikrofon nicht benutzen, zeigt die Zeile über der Leiste dauerhaft diesen Hinweis und nicht die Antwort
(schon vor J11 so); angesagt wird die Antwort trotzdem. Vorgemerkt. (3) Hält man JARVIS mitten im Sprechen an oder
fällt die Stimme mitten in einer Antwort aus, gilt die Antwort als gehört; der Rest wird nicht angesagt. (4) In dem
Augenblick, in dem JARVIS zu hören ist, gilt alles bis dahin als gehört, auch eine stille Meldung von kurz davor.
(5) Nicht im Browser geprüft, nur durch Regeltests oder gar nicht: mehrere Antworten hintereinander und die
Vorbereitung hinter einer gesprochenen Erinnerung (Regeltests); dass die Ansage auch wartet, während das Mikrofon
offen ist; dass nach „Neues Gespräch“ nichts Altes mehr in der Ansage steht; die Wolkenstimme (ElevenLabs) als
„zu hören“. (6) Der Verweis in der Tabelle der offenen Positionen im Trading-Raum kommt in der Prüfung nicht vor
(die Testdaten haben keine offene Position); die Verweise der Kandidaten daneben schon. (7) Die Klickflächen sind
bei 1280 × 800 gemessen, nicht im schmalen Fenster. (8) Farbkontraste sind in diesem Schritt nicht gemessen.
(9) Eine Scheibe, die in sich rollt, lässt sich weiter nicht mit der Tastatur rollen (J10, Grenze 9). (10) Warum
React den getippten Buchstaben beim Raumwechsel nicht annimmt, ist nicht geklärt, nur gemessen und umgangen; die
erste Korrektur (nur den Stand nachziehen) half nicht (weiter 6 von 12), die zweite nur halb (4 von 12), erst
die dritte ganz; für die Eingabetaste brauchte es danach eine vierte. Im Feld „Neues Thema“ im Raum Intel und in anderen Feldern der Räume ist dasselbe denkbar; dort
wechselt der Raum aber nicht, während man tippt. Eingabe über eine Eingabehilfe (Akzente, Emoji-Auswahl) ist mit
der Korrektur nicht ausprobiert.

### Testergebnisse Schritt J11 (15. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1063 Tests: 1063 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 15: 11 zur Ansage, 4 zu den Klickflächen). Am Mac wären es rechnerisch 1061 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 27 Handprüfungen bestanden**, in drei Teilen gestartet (13, 10 und 4; zusammen rund 11 Minuten). Vorlesen 55 Sekunden, Bedienung 68 |
| Prüfung Vorlesen, erste Läufe | mehrfach fehlgeschlagen. Echte Funde: Tabelle „Funde“. Aus der Prüfung selbst: Sie verlangte im Namen der Zeile ein Wort, das dort nicht stehen muss; die Ansage kam nie, weil JARVIS im Browser der Sandbox drei Sekunden lang „spricht“, ohne dass etwas zu hören ist (daraus wurde das Zeichen „wirklich zu hören“); meine erste Fassung der größeren Klickflächen nahm einem Verweis seinen Abstand nach oben |
| Gegenproben, erster Durchgang (16 absichtlich eingebaute Fehler, je ein eigener Bau) | **15 von 16 entdeckt**, jede an der gemeinten Stelle. Nicht entdeckt: der Verweis in der Tabelle der offenen Positionen im Trading-Raum (kommt in den Testdaten nicht vor; Grenze 6) |
| Gegenproben, zweiter Durchgang (nach dem Code-Review: 9 im Browser, 7 an den Regeltests) | Alle 16 fielen auf, die 7 an den Regeltests an der gemeinten Regel. Von den 9 im Browser aber **nur 5 an der gemeinten Stelle; 4 scheiterten früher**, an der Stelle, an der die Prüfung nach einer Antwort die nächste Frage tippt. Die 4 zählen so nicht. Dieselbe Stelle scheiterte auch ohne eingebauten Fehler (nächste Zeile) |
| Die wacklige Stelle untersucht (Skill zur Fehlersuche: nachstellen, messen, dann erst ändern) | Kein Wackler der Prüfung, sondern der alte Fehler aus der Tabelle „Funde“. Gemessen: verlorener Buchstabe in **6 von 12** Versuchen; nach der ersten Korrektur weiter 6 von 12; nach der zweiten 4 von 12; nach der dritten **0 von 18**, dazu 15 Versuche in drei Läufen der Prüfung ohne Verlust. Danach scheiterte die Prüfung Vorlesen immer noch in **4 von 6** Läufen, jetzt an der Eingabetaste (im Feld stand „Meine Termine“ mit Zeilenumbruch). Nach der vierten Korrektur: Vorlesen **6 von 6**, Bedienung **3 von 3**; seither in allen Läufen bestanden (Sammellauf und vier Läufe ohne Fehler am Ende der Gegenproben) |
| Gegenproben, dritter Durchgang (die 4 von oben wiederholt, 3 neue zum Tippen; die Eingabetaste war da noch nicht behoben) | 7 fielen auf, **4 an der gemeinten Stelle** (2 der wiederholten, 2 zum Tippen in der Prüfung Bedienung). **3 wieder an der wackligen Stelle** und so nicht gezählt |
| Gegenproben, vierter und fünfter Durchgang (nach der Korrektur für die Eingabetaste) | Die 3 offenen und eine neue („die Eingabetaste schickt gar nicht mehr ab“): **4 von 4 an der gemeinten Stelle.** „Abgeschickt wird der Stand von React statt des Feldes“ fällt in der Prüfung Bedienung im ersten Lauf auf (Schritt 6); in der Prüfung Vorlesen nur in einem von zwei Läufen, dort ist es Zufall und kein Beleg |
| Gegenproben zusammen | 36 verschiedene eingebaute Fehler (29 im Browser, 7 an den Regeltests); **35 an der gemeinten Stelle entdeckt**, einer nicht (Trading, Grenze 6) |
| Neuer Schritt in der Prüfung Bedienung zuerst rot gesehen | Tippen beim Raumwechsel: rot mit dem Stand vor der Korrektur. Eingabetaste: Mit dem ersten Signal (der Raumwechsel beginnt) wurde der Schritt **nicht** rot; erst mit dem Signal „JARVIS setzt zum Sprechen an“ scheiterte er mit dem Stand vor der vierten Korrektur („Wie spät ist es“ mit Zeilenumbruch im Feld) und bestand danach |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Hinweise, alle nachgeprüft. **Acht eingearbeitet**, darunter: dieselben Worte zweimal wurden nur einmal angesagt; der Name der Zeile wäre doppelt vorgelesen worden; ein Mausklick in ein Feld der Seite klappte das Gespräch zu; jede Notiz war eine Meldung, auch was schon dastand (jetzt nur auf Wunsch der Stelle, Eigene Entscheidungen 3); die Regel für die Klickflächen überstimmte eigene Abstände (jetzt mit Regeltest). **Einer als Grenze vermerkt** (Grenze 3). **Einer mit einem Kommentar im Code beantwortet** (die Mindesthöhe am Haken ist nicht doppelt) |
| Aussehen vorher und nachher verglichen (zehn Räume, Lage der Elemente gemessen) | sieben Räume unverändert; „Agenten“ höchstens 2 Pixel, „Aufgaben“ 6, „Einstellungen“ 9 Pixel über die ganze Seite |
| Tests zuerst | Regeltests zuerst und rot gesehen: alle 11 zur Ansage, die 4 zu den Klickflächen. In der Handprüfung rot gesehen: fester Name der Zeile, keine Ansage, stumme Meldungen, Bereiche, Gespräch bleibt offen, Klickflächen, dieselben Worte zweimal, doppelter Name, Mausklick in ein Feld, Tippen und Eingabetaste beim Raumwechsel. Für die übrigen Stellen der Prüfung (etwa „was schon dasteht, ist keine Meldung“ und „nach dem Neuladen wird nichts Altes angesagt“) ist nicht festgehalten, ob sie zuerst rot waren; belegt sind sie durch die Gegenproben |
| Sicherheitsprüfung (von Hand; der Skill dafür braucht den Stand bei GitHub) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code, keine neue Abfrage an den Server. Die zwei neuen Lauscher hängen nur am eigenen Eingabefeld und lesen nur dessen Inhalt. Die Stelle für Ansagen bekommt Text als Text (kein HTML) und nur, was ohnehin im Gespräch steht. Die Stimme, die nur so tut, und das Zählen der Raumwechsel stehen nur in den Prüfungen |
| Nicht geprüft | **der Mac**, **Safari**, ein **Vorleseprogramm** (VoiceOver; Prüfliste Teil X ist dafür der einzige echte Beleg), echte Dienste, die Wolkenstimme, Eingabehilfen, Klickflächen im schmalen Fenster, Farbkontraste |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten).


### Schritt J12: Ausfälle in allen Räumen ehrlich anzeigen (15. und 16. November 2026)

**Warum:** Seit J10 unterscheidet „Heute“, ob eine Quelle noch lädt oder JARVIS dort nicht antwortet. Die anderen
Räume taten das nicht (J10, Grenze 8; vorgemerkt in J11).

**Bestandsaufnahme zuerst:** Ein Messlauf durch alle zwölf Räume, einmal mit Abfragen, die nie beantwortet werden,
einmal mit Abfragen, die sofort scheitern; aufgeschrieben, was dann jeweils dasteht.

| Raum | Was bei einem Ausfall dastand |
|---|---|
| Aufgaben | „lädt …“ für immer; in der Scheibe „Bis nächste Woche 0, Überfällig 0, Heute erledigt 0“ |
| Post | „lädt …“ für immer; „Wichtig 0“; in der Scheibe drei Nullen |
| Kalender | die Karte „Mit dem Kalender verbinden“, darin „Lade Kalender …“ |
| Projekte, Dokumente, Einstellungen | „Lade …“ für immer |
| Intel | „Lade Intel …“, „Noch keine Kurse.“, „Lade die Kurse …“ |
| Agenten | „Die Agenten melden sich …“, „Lade den Zeitplan …“ |
| Trading | „lädt …“; dazu **„Spielgeld-Konto 10.000,00 $“, „Die Spinne schläft“, „Noch nichts passiert“, „noch keine Ausführung“**, gleich ob der Handel gerade läuft |
| Browser | gar nichts: kein Zustand, kein Feld für einen Auftrag |
| Gespräch | Kalender, Post und Aufgaben fehlten bei „Was gerade ansteht“ einfach |
| Heute | richtig (seit J10) |

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J12.1 Ein Satz je Quelle an einer Stelle: „… lädt noch.“ oder, wenn JARVIS dort nicht antwortet, „… lässt sich gerade nicht laden.“ „Heute“ und die Räume sagen über dieselbe Quelle dasselbe | Testbereit | `src/lib/ladestand.ts` (18 Quellen), Baustein `Ladestand` in `ui.tsx`; `heute.ts` benutzt dieselben Sätze; Regeltests |
| J12.2 Zehn Räume sagen, was sich nicht laden lässt, statt für immer zu laden: Aufgaben, Kalender, Post, Projekte, Trading, Intel (Lagebild, Marktlage, Gold und Silber), Agenten (Steuerung, Zeitplan, Wetter), Browser, Dokumente, Einstellungen (dazu dort Sicherheitslage, Gedächtnis, Microsoft, Kalender) | Testbereit | je Raum `Ladestand`; Prüfung Ausfall, Schritte 1, 2 und 4 |
| J12.3 Solange eine Quelle nicht gelesen ist, behauptet der Raum nichts: keine Zahl in den Scheiben, kein „verbinden“, kein Formular; im Trading-Raum bleiben Konto, Spinne, Trades und Protokoll weg, und der Not-Aus dort sagt nicht mehr, es laufe kein Handel | Testbereit | `TasksView`, `MailView`, `CalendarView`, `TradingDesk` (Bausteine nehmen den Desk nur noch gelesen an); Prüfung Ausfall, Schritte 1 und 2 |
| J12.4 Eine einzelne Projektakte, die sich nicht laden lässt, sagt das; JARVIS versucht es nach 5, 15, 45 Sekunden und dann jede Minute wieder. Gibt es das Projekt nicht mehr, klappt die Kachel zu | Testbereit | `ProjectsView.tsx`, `pauseNach` in `geteilt.ts`; Prüfung Ausfall, Schritt 5 |
| J12.5 Im Raum Gespräch steht bei „Was gerade ansteht“, welche Quelle sich nicht laden lässt | Testbereit | `FocusView.tsx`; Prüfung Ausfall, Schritt 3 |
| J12.6 Kein Raum schreibt seinen Ladesatz mehr selbst: Ein Regeltest liest alle Bausteine und lässt nur zwei begründete Ausnahmen zu | Testbereit | `test/regeln/ladestand.test.ts` (6 Tests) |
| J12.7 Handprüfung „Ausfall“ | Testbereit, **nur im Browser der Sandbox** | `test/hand/ausfall-rauch.ts` (Port 3130, 6 Schritte); jetzt 28 Handprüfungen |

**Eigene Entscheidungen:** (1) Solange ein Raum seine Quelle nicht hat, steht dort nur der Satz. Auch das Feld
„Notieren“ im Raum Aufgaben kommt erst, wenn die Aufgaben gelesen sind. (2) Der Satz ist gewöhnlicher Text und
keine Meldung (Regel aus J11: Was schon dasteht, wenn der Raum aufgeht, unterbricht kein Vorleseprogramm).
(3) Kein Zusatz wie „JARVIS versucht es weiter“; die Räume mit „Neu laden“ behalten den Knopf. (4) Im
Trading-Raum zeigen die Kacheln „Scan“ und „Vet“ ohne Kurse einen Strich statt „…“, und die Scan-Tabelle kommt
erst mit den Kursen. (5) In „Heute“ heißt es jetzt „Die Agenten laden noch.“ statt „Die Agenten melden sich …“.
(6) Der Raum Browser behält seine eigene Abfrage (Hinweis aus dem Code-Review, bewusst nicht übernommen): Sein
Takt wechselt, sobald ein Auftrag läuft, und die gemeinsame Abfrage vergisst bei einem Wechsel des Takts für
einen Augenblick den Stand; das Bild des Browsers würde dann flackern.

**Grenzen:** (1) **Wann das am Mac vorkommt:** Ist JARVIS ganz beendet, lädt die Seite gar nicht erst; die Sätze
erscheinen, wenn eine einzelne Abfrage scheitert oder JARVIS gerade neu startet, während die Seite offen ist. Am
Mac lässt sich das kaum von Hand herbeiführen; belegt ist es nur in der Sandbox. (2) Eine Abfrage, die nie
beantwortet wird, bleibt bei „lädt noch“; eine Frist gibt es nicht. (3) Fällt JARVIS aus, nachdem ein Raum schon
gelesen war, bleibt der alte Stand ohne Hinweis stehen (wie bisher, J10, Eigene Entscheidungen 4). (4) Nicht im
Browser geprüft: der Satz zum Gedächtnis in den Einstellungen (steht nur mit Claude-Schlüssel da) und die
Marktlage, wenn nur die Krypto-Kurse fehlen, Edelmetalle oder Desk aber da sind (die Testdaten haben weder noch).
(5) Die schmale Leiste für Not-Aus und Freigaben oben zeigt nichts, wenn sich die Sicherheitslage nicht laden
lässt; in den Einstellungen steht es. (6) Im Trading-Raum zeigen die übrigen Kacheln ohne Kurse weiter ihre
Erklärtexte; nur die Werte sind Striche. (7) Am Rand aufgefallen, nicht geändert: Die Karte für Microsoft 365
wechselt ihren Takt, während du dich anmeldest; nach dem Code müsste dabei für einen Augenblick „lädt noch“
aufblitzen (nicht gemessen). (8) Schmales Fenster und Mac sind für diesen Schritt nicht geprüft.

### Testergebnisse Schritt J12 (16. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1069 Tests: 1069 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 6). Am Mac wären es rechnerisch 1067 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 28 Handprüfungen bestanden**, in drei Teilen gestartet (13, 10 und 5; zusammen rund 11 Minuten). Ausfall 47 Sekunden |
| Bestandsaufnahme | Messlauf durch alle zwölf Räume in zwei Fällen (Abfragen hängen; Abfragen scheitern); Ergebnis in der Tabelle oben |
| Prüfung Ausfall, erste Läufe | zuerst rot gegen den alten Stand (kein Raum außer „Heute“ kannte den Unterschied). Danach drei Fehler der Prüfung selbst: ein erwarteter Text war geraten („Intel verbinden“ statt „Mit Grok verbinden“); im Raum Agenten fehlt bei einem Ausfall auch das Wetter; das Gedächtnis steht ohne Claude-Schlüssel gar nicht in den Einstellungen (Grenze 4) |
| Gegenproben (20 absichtlich eingebaute Fehler: 16 im Browser mit je eigenem Bau, 4 an den Regeltests) | **20 von 20 entdeckt, jede an der gemeinten Stelle** (das Skript vergleicht dafür, nach wie vielen Schritten die Prüfung scheitert). Ein Durchgang, keine Wiederholung nötig |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Hinweise, alle nachgeprüft. **Neun eingearbeitet:** (1) eine Akte, die es nicht mehr gibt, „lud“ für immer; (2) fehlende Krypto-Kurse standen in der Marktlage nur da, wenn sonst gar nichts da war; (3) der Not-Aus im Trading-Raum sagte ohne gelesenen Desk „greift, sobald der Handel läuft“; (4) mit Desk, aber ohne Kurse zeigten zwei Kacheln für immer „…“ und die Scan-Tabelle stand leer da; (5) der neue Versuch für eine Akte kam alle 5 Sekunden für immer; (7) die Bausteine im Trading-Raum und in der Post nahmen weiter „nicht gelesen“ an, obwohl sie nur noch gelesen aufgerufen werden (jetzt lässt der Typ nichts anderes zu); (8) und (9) zwei Kommentare an der falschen Stelle; (10) der Regeltest wäre unter Windows an den Pfaden gescheitert. **Einer bewusst nicht** (6, siehe Eigene Entscheidungen 6) |
| Tests zuerst | Zuerst und rot gesehen: der Regeltest (erst fehlte der Baustein, dann fielen die letzten zwei von Hand geschriebenen Sätze auf), die Prüfung Ausfall gegen den alten Stand, und aus dem Review je einzeln mit eigenem Bau: Not-Aus (3), Kacheln und Scan-Tabelle (4), Akte ohne Projekt (1), Abstand der Versuche (5). **Nicht zuerst rot gesehen:** die Marktlage mit nur fehlenden Krypto-Kursen (2; dafür gibt es keine Prüfung, Grenze 4) |
| Sicherheitsprüfung (von Hand; der Skill dafür braucht den Stand bei GitHub) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code. Der neue Versuch für eine Akte geht nur an JARVIS selbst, höchstens einer je Fehlschlag, mit wachsendem Abstand bis zu einer Minute. `seite.route` (Abfragen hängen lassen, abbrechen, Antworten verändern) steht nur in den Prüfungen. Der Not-Aus in Agenten und Einstellungen ist unverändert; der Knopf im Trading-Raum war ohne gelesenen Desk schon vorher gesperrt |
| Aussehen | Mit gelesenen Daten ist an den Räumen nichts umgebaut; die vorhandenen Prüfungen der Räume (Aufgaben, Post, Kalender, Trading, Intel, Agenten, Einstellungen) bestehen unverändert. **Nicht eigens vermessen** (anders als in J11) |
| Nicht geprüft | **der Mac**, **Safari**, echte Dienste, schmales Fenster; ein echter Ausfall von JARVIS (nur im Browser nachgestellt); die Fälle aus Grenze 4 |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten).


### Schritt J13: Die Zeile über der Leiste zeigt wieder die Antwort; Abfragen ohne Antwort geben auf (16. November 2026)

**Warum:** Zwei vorgemerkte Grenzen. (J11, Grenze 2) Darf JARVIS das Mikrofon nicht benutzen, stand in der Zeile
über der Leiste für immer die Meldung dazu; wer tippte, sah die Antwort nur im aufgeklappten Gespräch. (J12,
Grenze 2) Eine Abfrage, die nie beantwortet wird, blieb für immer bei „lädt noch“.

**Bestandsaufnahme zuerst:** (1) In der Zeile gewann eine Meldung immer gegen die Antwort. Bei gesperrtem Mikrofon
fragt JARVIS den Browser bei jedem Klick und Tastendruck neu und meldet dieselben Worte noch einmal; ohne Netz für
die Spracherkennung verschwindet die Meldung bei jedem Versuch kurz und kommt wieder. (2) Im Browser der Sandbox
steht auf einer Seite ohne Klick erst „Klick einmal irgendwo auf die Seite, dann höre ich zu.“, nach dem ersten
Klick „Ich darf das Mikrofon nicht benutzen. …“. (3) Bei hängenden Abfragen kam im Takt jeweils eine weitere dazu,
und keine wurde je beendet; ein Browser lässt zu einem Server nur wenige Abfragen zugleich zu.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J13.1 Eine Meldung zum Mikrofon oder zum Ton steht in der Zeile nur, bis das Gespräch weitergeht (eine neue Frage, eine fertig gewordene Antwort). Danach steht dort wieder die Antwort, und die kleine Überschrift der Zeile sagt „· Hinweis im Gespräch“; im aufgeklappten Gespräch steht die Meldung wie bisher | Testbereit | `src/lib/antwortzeile.ts` (neu), `AppFrame.tsx`; `test/regeln/antwortzeile-meldung.test.ts` (12 Tests); Prüfung Vorlesen, Schritt 2 |
| J13.2 Dieselbe Meldung noch einmal ist nichts Neues: beim Weitertippen, nach dem Auf- und Zuklappen des Gesprächs, nach kurzem Verschwinden | Testbereit; das kurze Verschwinden **nur als Regel** | Regeltests; Prüfung Vorlesen, Schritt 2 (Weitertippen, Auf- und Zuklappen) |
| J13.3 Nach dem Neuladen steht die Meldung wieder vorn: Das Gespräch von vorhin zählt nicht als „weitergegangen“ | Testbereit | Prüfung Vorlesen, Schritt 2; Regeltest |
| J13.4 Fehler (rot) und Hinweis (ocker) haben je ihr eigenes Merkzeichen: Verschwindet ein Fehler, gilt ein alter Hinweis nicht als neu | Testbereit, **nur als Regel** | Regeltest |
| J13.5 Jede gemeinsame Abfrage hat eine Frist: mindestens 30 Sekunden, höchstens eine Minute, je nach Takt. Danach steht „… lässt sich gerade nicht laden.“ da, und die Abfrage wird wirklich beendet. Ein schon gelesener Stand bleibt stehen | Testbereit, **nur im Browser der Sandbox** | `fristFuer` in `src/lib/geteilt.ts`, `getJson(url, signal)` in `api.ts`; `test/regeln/geteilt.test.ts` (neu 8 Tests); Prüfung Ausfall, Schritt 7 |
| J13.6 Geht die letzte Stelle, die eine Quelle braucht (Wechsel des Raums), wird beendet, was noch unterwegs ist. Läuft schon ein jüngerer Versuch, löst eine abgelaufene Frist keinen zusätzlichen aus | Testbereit, **nur als Regel** | `geteilt.ts`; Regeltests |

**Eigene Entscheidungen:** (1) Der Verweis heißt „Hinweis im Gespräch“ und steht in der kleinen Überschrift der
Zeile neben dem Zustand („Bereit · Hinweis im Gespräch“). Die Meldungen selbst sind unverändert. (2) „Weitergegangen“
heißt: ein neuer Zug im Gespräch, oder eine Antwort ist fertig geworden. Das zweite, weil der erste Klick auf die
Seite eine Frage abschicken und zugleich das Mikrofon wecken kann; dessen Meldung kommt dann, während JARVIS schon
antwortet. (3) Kommt dieselbe Meldung wieder, nachdem sie weg war, ist sie nur dann neu, wenn das Gespräch
inzwischen weitergegangen ist. Eine Uhr braucht es dafür nicht. (4) Die Merkzeichen gehören der Leiste, nicht der
Zeile: Die Zeile gibt es nicht, solange das Gespräch aufgeklappt ist. (5) Die Frist ist mindestens 30 Sekunden,
weil JARVIS seinen eigenen Quellen weniger lässt (Kalender am Mac 20 Sekunden, Microsoft 15, Kurse und Wetter 8).
(6) Aus dem Code-Review bewusst nicht übernommen: Die Regel sitzt in der Leiste und nicht in der Stimme
(`useVoice`), weil nur die Zeile zwischen Meldung und Antwort wählen muss und ein Umbau an der Stimme mehr
riskiert, als er bringt.

**Grenzen:** (1) Kommt eine Meldung erst nach der fertigen Antwort (du verneinst die Frage des Browsers nach dem
Mikrofon erst später; oder dein erster Klick ist ein Vorschlag wie „Meine Termine“, und die Meldung kommt nach
der schnellen Antwort), steht sie bis zur nächsten Frage vor der Antwort. (2) Der Verweis sagt nicht, worum es
geht. (3) Nur als Regel geprüft, nicht im Browser: das kurze Verschwinden ohne Netz, Fehler und Hinweis zugleich,
das Beenden beim Wechsel des Raums. Der Browser der Sandbox kennt nur das gesperrte Mikrofon. (4) Ein Postfach, das
für die erste Antwort länger als eine Minute braucht, gälte als „lässt sich gerade nicht laden“ und würde neu
gefragt (JARVIS liest im Hintergrund weiter und merkt sich das Ergebnis); nicht nachgestellt. (5) „Neu laden“
endet bei einer hängenden Abfrage jetzt nach der Frist, sagt aber wie bei jedem Fehlschlag nichts dazu; der alte
Stand bleibt ohne Hinweis stehen (J12, Grenze 3, weiter offen). (6) Keine Frist haben die Abfragen außerhalb der
gemeinsamen: eine einzelne Projektakte, der Raum Browser, die Spur der Spinne im Trading-Raum. (7) Die Regel
„das Gespräch von vorhin zählt nicht“ wirkt im Browser heute nicht sichtbar, weil das alte Gespräch immer vor der
ersten Meldung zurückgeholt wird; sie ist als Regeltest gedeckt und bleibt als Vorsicht. (8) Nicht geprüft: der
Mac, Safari, VoiceOver, schmales Fenster. Ob Safari die Meldung zum Mikrofon in derselben Reihenfolge bringt, ist
offen (Prüfliste Teil Z).

### Testergebnisse Schritt J13 (16. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1089 Tests: 1089 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 20). Am Mac wären es rechnerisch 1087 (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 28 Handprüfungen bestanden**, in drei Teilen gestartet (13, 10 und 5; zusammen rund 12 Minuten). Vorlesen 56 Sekunden, Ausfall 78 Sekunden (der neue Schritt wartet die Frist von 30 Sekunden wirklich ab) |
| Tests zuerst | Zuerst und rot gesehen: die Regeltests für die Zeile (das Modul fehlte) und für die Frist (sechs Tests rot); die Prüfung Ausfall gegen einen Bau des alten Stands (Schritt 7: „nach 45 Sekunden … Die Agenten laden noch.“); aus dem Review je einzeln die Regeltests „letzte Stelle geht“ und „kein zusätzlicher Versuch“. **Nicht zuerst rot gesehen:** die neuen Stellen der Prüfung Vorlesen gegen den alten Stand (der erste Versuch scheiterte an einer falschen Annahme der Prüfung, siehe nächste Zeile), und die Regeln zur Zeile aus dem Review (kurzes Verschwinden, Fehler und Hinweis getrennt: Regel und Test sind zusammen entstanden); für beides stehen die Gegenproben |
| Fehler der Prüfung selbst | (1) Angenommen war, im Browser der Sandbox stehe von Anfang an „Ich darf das Mikrofon nicht benutzen“; auf einer Seite ohne Klick steht dort erst die Bitte um einen Klick. Die Prüfung klickt jetzt zuerst und wartet auf die Meldung. (2) Die gestellte Uhr der Regeltests springt bei einem großen Schritt ans Ende; eine unterwegs gestartete Abfrage bekam ihre Frist von dort. Die Tests gehen jetzt in Schritten von höchstens einem Takt. (3) Beim Anlegen hatte ich die vorhandene Datei `antwortzeile.test.ts` (vier Tests aus J7) überschrieben; vor dem ersten Lauf bemerkt, aus Git zurückgeholt, die neuen Tests stehen in einer eigenen Datei |
| Gegenproben (19 absichtlich eingebaute Fehler: 7 im Browser mit je eigenem Bau, 12 an den Regeltests) | **18 von 19 entdeckt, jede an der gemeinten Stelle** (das Skript vergleicht die Zahl der Schritte davor und den Wortlaut der Fehlermeldung). **Einer im Browser nicht entdeckt:** „das Gespräch von vorhin zählt als weitergegangen“ ändert im Browser nichts (Grenze 7); derselbe Fehler am Regeltest wird entdeckt |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Hinweise, alle nachgeprüft. **Sieben eingearbeitet:** (1) nach dem Auf- und Zuklappen des Gesprächs galt die alte Meldung wieder als neu und verdeckte die Antwort; (2) eine kurz verschwundene Meldung (ohne Netz bei jedem Versuch) galt jedes Mal als neu; (5) verschwand ein Fehler, sprang ein alter Hinweis nach vorn; (6) bei hängenden Abfragen im kurzen Takt löste jede abgelaufene Frist einen zusätzlichen Versuch aus; (7) beim Wechsel des Raums blieben hängende Abfragen und ihre Uhren zurück; (9) eine leere Meldung hätte eine leere Zeile gezeigt; (10) zwei überflüssige Namen. **Drei bewusst nicht:** (3) die Frist beendet auch langsame Abfragen (Eigene Entscheidungen 5, Grenze 4); (4) „Neu laden“ meldet den Abbruch nicht (Grenze 5, war bei jedem Fehlschlag schon so); (8) die Regel an der Quelle statt in der Leiste (Eigene Entscheidungen 6) |
| Sicherheitsprüfung (von Hand; der Skill dafür braucht den Stand bei GitHub) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code. Neu ist nur, dass der Browser eigene Abfragen an JARVIS nach einer Frist beendet; dadurch bleiben weniger Verbindungen offen als vorher. Am Server ändert sich nichts. `seite.route` (Abfragen hängen lassen) steht nur in den Prüfungen |
| Aussehen | Die Zeile ist dieselbe; neu ist nur der Zusatz in der kleinen Überschrift. Ein Bild der Zeile mit Antwort und Verweis angesehen (1280 Pixel breit). **Nicht eigens vermessen**, schmales Fenster nicht angesehen |
| Nicht geprüft | **der Mac**, **Safari**, **VoiceOver**, echte Dienste, schmales Fenster; die Fälle aus Grenze 3 und 4 im Browser |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten).

### Schritt J14: Ein Hinweis, wenn JARVIS nicht mehr antwortet; Änderungen sagen es auf Deutsch (16. November 2026)

**Warum:** Zwei vorgemerkte Grenzen (J12, Grenze 3; J13, Grenze 5). Fällt JARVIS aus, nachdem ein Raum schon
gelesen war, blieb der alte Stand ohne ein Wort stehen, und „Neu laden“ sagte nichts dazu.

**Bestandsaufnahme zuerst (im Browser der Sandbox gemessen, mit einer Sonde, die danach wieder gelöscht wurde):**

| Was | Vorher |
|---|---|
| Raum war gelesen, dann antwortet JARVIS nicht mehr | Der Raum zeigt weiter den alten Stand, ohne Hinweis. „Neu laden“ ändert nichts und sagt nichts |
| Eine Änderung in dieser Zeit (Aufgabe abhaken, notieren, speichern) | Es erscheint der Text des Browsers auf Englisch: „Failed to fetch“ (in Safari hieße er „Load failed“) |
| Eine Frage im Gespräch in dieser Zeit | JARVIS antwortet mit „Failed to fetch“ und liest das auch vor |
| Raum wird erst während des Ausfalls geöffnet | Richtig seit J12: „… lässt sich gerade nicht laden.“ |

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J14.1 Antwortet JARVIS nicht mehr, steht oben in jeder Ansicht: „JARVIS antwortet seit 12:08 Uhr nicht. Du siehst den Stand von davor, und Änderungen kommen gerade nicht an.“ Die Räume zeigen weiter, was sie zuletzt gelesen haben. Mit der ersten Antwort verschwindet der Hinweis von selbst | Testbereit, **nur im Browser der Sandbox** | `src/lib/verbindung.ts` (neu), `Verbindungshinweis` in `AppFrame.tsx`, `useVerbindung` in `usePolling.ts`; `test/regeln/verbindung.test.ts` (neu, 10 Tests); Prüfung Ausfall, Schritt 8 |
| J14.2 Jede Anfrage der Seite meldet, ob JARVIS geantwortet hat: die gemeinsamen Abfragen, jede Änderung, das Gespräch, das Vorlesen und die Probe der Stimme. Ein Klick, der ankommt, beendet den Hinweis sofort | Testbereit | `frage` in `src/lib/api.ts`; `test/regeln/anfragen.test.ts` (neu, 12 Tests, einer liest alle Dateien der Seite: nur `api.ts` darf `fetch` rufen) |
| J14.3 Ein Stolperer ist kein Ausfall. Der Hinweis kommt erst, wenn zwei Anfragen mit mindestens acht Sekunden Abstand ohne Antwort geblieben sind **und** JARVIS seit zwölf Sekunden nicht geantwortet hat. Zwei Abfragen im Zehn-Sekunden-Takt nacheinander erfüllen beides | Testbereit | Regeltests; Prüfung Ausfall, Schritt 4 (einzelne Stellen fallen aus, JARVIS antwortet sonst: kein Hinweis) und Schritt 8 |
| J14.4 Eine Abfrage, die nach ihrer Frist aufgegeben wird (J13), zählt als „keine Antwort“. Eine, die beendet wird, weil niemand mehr zuhört (Wechsel des Raums), zählt nicht; ebenso wenig ein „Stopp“ im Gespräch | Testbereit, **nur als Regel** | `geteilt.ts`; `test/regeln/geteilt.test.ts` (neu 3 Tests), `anfragen.test.ts` |
| J14.5 Antwortet JARVIS gar nicht, sagen Änderungen und das Gespräch: „JARVIS antwortet gerade nicht. Versuch es gleich noch einmal.“ statt „Failed to fetch“. Das gilt auch, wenn eine Antwort mittendrin abreißt (JARVIS wird beendet, während er schreibt). Der Fehler des Browsers bleibt zum Nachsehen am Fehler hängen (`cause`) | Testbereit; der Abriss mittendrin **nur als Regel** | `NICHT_ERREICHBAR` in `api.ts`; Regeltests; Prüfung Ausfall, Schritt 8 (Aufgabe abhaken, ein Befehl und eine freie Frage im Gespräch) |
| J14.6 War die letzte Antwort nicht heute (der Mac schlief über Nacht), steht der Tag dabei: „seit gestern, 23:10 Uhr“, „seit dem 14. November, 09:00 Uhr“. Hat JARVIS in diesem Besuch noch nie geantwortet: „JARVIS antwortet gerade nicht. Änderungen kommen gerade nicht an.“ | Testbereit, **nur als Regel** | `verbindungsSatz` in `src/lib/ladestand.ts`; `test/regeln/ladestand.test.ts` (neu 3 Tests) |
| J14.7 Die Stelle für den Hinweis gibt es von Anfang an (unsichtbar und leer, als „Status“), damit ein Vorleseprogramm den Satz ansagt, wenn er erscheint | Testbereit; **ob VoiceOver ihn ansagt, ist nicht geprüft** | Prüfung Ausfall, Schritt 8 |

**Eigene Entscheidungen:** (1) Ein Hinweis oben in jeder Ansicht, kein Zeichen an jedem einzelnen Raum: Alle
Anfragen gehen an denselben JARVIS, und die Räume sollen ihren Stand behalten, statt leer zu werden. (2) Der
Hinweis ist ocker wie andere Hinweise, kein Dialog, kein Knopf; er nennt die Zeit der letzten Antwort, weil das
sagt, wie alt der Stand höchstens ist. (3) Jede Antwort zählt als Antwort, auch eine mit Fehler (auch „502“:
JARVIS sagt das selbst, wenn etwa das Postfach nicht erreichbar ist). (4) Die Regel hat zwei Bedingungen, weil
jede einen eigenen Fehlalarm verhindert: Der Abstand zwischen zwei Fehlschlägen zählt nicht die Zeit mit, die der
Mac geschlafen hat (beim Aufwachen feuern alle Uhren zugleich, bevor das Netz da ist); die zwölf Sekunden ohne
Antwort verhindern, dass eine einzelne Stelle, die immer wieder scheitert, als Ausfall von JARVIS gilt. (5) Eine
Anfrage, die vor der letzten Antwort begonnen hat, zählt nicht: Braucht der Kalender sehr lange und wird nach
seiner Frist aufgegeben, während JARVIS anderswo antwortet, sagt das nichts über JARVIS. (6) Für eine
gescheiterte Änderung gibt es überall denselben Satz; „Neu laden“ bekommt keinen eigenen, der Hinweis oben
erklärt es. (7) Aus den Reviews bewusst nicht übernommen: Auch ein Fehler des Browsers, der kein Ausfall ist
(eine falsch gebaute Anfrage, ein Programmierfehler), wird zu „JARVIS antwortet gerade nicht“; der Browser
unterscheidet das nicht verlässlich, und der ursprüngliche Fehler bleibt am Fehler hängen.

**Grenzen:** (1) Der Hinweis kommt 10 bis 20 Sekunden nach dem Ausfall (zwei Abfragen im Zehn-Sekunden-Takt);
hängt JARVIS, statt weg zu sein, erst nach etwa 40 bis 50 Sekunden (die Frist aus J13 läuft zuerst ab). Bis dahin
steht der alte Stand ohne Hinweis da. Anfragen, die im Augenblick des Ausfalls schon unterwegs waren, zählen
nicht mit. (2) Meldet nur eine einzelne Stelle dauerhaft einen Fehler, während JARVIS sonst antwortet, steht in
einem schon gelesenen Raum weiter der alte Stand ohne Hinweis (der Rest von J12, Grenze 3). (3) „Neu laden“ sagt
selbst nichts, wenn es scheitert. (4) Die einzelnen Abfragen (eine Akte, der Raum Browser, die Spur der Spinne)
haben weiter keine Frist; hängt eine davon, meldet sie nichts (J13, Grenze 6). (5) In einem Fenster im
Hintergrund bremst der Browser die Uhren; der Hinweis kann dort später kommen. (6) Nur als Regel geprüft, nicht
im Browser: das Aufwachen des Mac, „gestern“ im Satz, der Abriss mitten in einer Antwort, die abgelaufene Frist
als „keine Antwort“, der Fall „noch nie geantwortet“. (7) Im Gespräch spricht JARVIS dann über sich in der
dritten Person („JARVIS antwortet gerade nicht“); ob er den Satz am Mac vorliest, hängt davon ab, ob die Stimme
des Mac oder die von ElevenLabs gewählt ist (die zweite braucht JARVIS selbst). (8) Nicht geprüft: der Mac,
Safari („Load failed“), VoiceOver, schmales Fenster.

### Testergebnisse Schritt J14 (16. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1117 Tests: 1117 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 28). Am Mac wären es rechnerisch zwei weniger (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 28 Handprüfungen bestanden**, in drei Teilen gestartet (13, 10 und 5; zusammen rund 14 Minuten). Ausfall 126 Sekunden (vorher 78: Schritt 4 wartet 22 Sekunden, ob ein falscher Hinweis kommt, und Schritt 8 wartet auf den Hinweis und auf sein Verschwinden) |
| Tests zuerst | Zuerst und rot gesehen: die Regeltests zur ersten Fassung (das Modul fehlte) und die Prüfung Ausfall gegen einen Bau des Stands J13 (Schritt 8: „die Stelle für den Hinweis gibt es von Anfang an“). **Nicht zuerst rot gesehen:** die Regeltests zur endgültigen Fassung (nach den beiden Reviews wurde die Regel zweimal umgebaut; Regel und Tests sind dabei zusammen entstanden) und die neue Stelle in Schritt 4 der Prüfung; für beides stehen die Gegenproben |
| Gegenproben | 38 absichtlich eingebaute Fehler: 8 im Browser mit je eigenem Bau, 30 an den Regeltests. **Im vollständigen Durchgang 36 von 38 entdeckt, jeder an der gemeinten Stelle** (das Skript vergleicht die Zahl der Schritte davor und den Wortlaut der Fehlermeldung). **Zwei zunächst nicht entdeckt, beides Lücken der Prüfungen:** (1) „das Gespräch fragt am gemeinsamen Weg vorbei“: Die Prüfung im Browser stellte nur einen Befehl („Notiere …“), der einen anderen Weg nimmt; ohne eingerichtetes KI-Gehirn beantwortet die Seite eine freie Frage selbst. Schritt 8 stellt jetzt auch eine freie Frage. (2) „auch Anfragen von vor der letzten Antwort zählen“: Der Regeltest wartete zu kurz, sodass die zweite Bedingung der Regel den Fehler verdeckte. Nach dem Schärfen beide einzeln wiederholt: **entdeckt**. Am Ende jedes Durchgangs: Quelltext wie vorher (Vergleich mit `git diff`), sauberer Bau, Prüfung Ausfall mit 8 Schritten bestanden |
| Durch die Gegenproben gefunden | Im ersten Durchgang fiel ein eingebauter Fehler an einer anderen Stelle auf als gemeint („der Hinweis bleibt stehen“ schon in Schritt 4). Das hieß: Fallen einzelne Stellen aus, während JARVIS sonst antwortet, erschien der Hinweis für Augenblicke und verschwand mit der nächsten Antwort wieder. Daraus ist die zweite Bedingung der Regel entstanden (zwölf Sekunden ohne Antwort). Der Durchgang wurde abgebrochen und auf dem endgültigen Stand ganz wiederholt |
| Code-Review (Skill `code-review`, Stufe mittel, zweimal: auf der ersten Fassung und nach dem Umbau) | **Erstes Review, zehn Hinweise, alle eingearbeitet:** ein Abriss mitten in der Antwort zeigte weiter den Text des Browsers; Änderungen und das Gespräch zählten nicht mit (ein Klick, der ankam, beendete den Hinweis nicht); eine nach ihrer Frist aufgegebene langsame Abfrage zählte, obwohl JARVIS anderswo antwortete; der ursprüngliche Fehler ging verloren; die Probe der Stimme fragte am gemeinsamen Weg vorbei; nach Mitternacht fehlte der Tag im Satz. Einer davon („502 bis 504 zählen als keine Antwort“) hat sich im zweiten Review als falsch erwiesen und ist wieder draußen. **Zweites Review, acht Hinweise, sechs eingearbeitet:** JARVIS sagt selbst „502“ (Postfach, Stimme), das hätte als Ausfall gegolten; die Schlafzeit des Mac zählte als Ausfall; das Vorlesen fragte am gemeinsamen Weg vorbei; ein Abriss mitten in der Antwort zählte nicht; eine Anfrage wurde an zwei Stellen als begonnen gemeldet; die Uhr für „gestern“ lief auch ohne Hinweis. **Einer zur Hälfte:** Anfragen, die beim Ausfall schon unterwegs waren, zählen weiter nicht (Grenze 1). **Einer bewusst nicht:** Eigene Entscheidungen 7 |
| Sicherheitsprüfung (von Hand; der Skill dafür braucht den Stand bei GitHub) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code. Geändert ist nur die Seite im Browser: Sie zählt mit, ob ihre eigenen Anfragen an JARVIS beantwortet werden, und zeigt statt des Textes des Browsers einen festen Satz. Der Satz enthält nichts aus der Antwort oder dem Fehler. Am Server ändert sich nichts. `seite.route` (Abfragen abbrechen) steht nur in den Prüfungen |
| Aussehen | Ein Bild des Hinweises über dem Raum Aufgaben angesehen (1280 Pixel breit): ein heller Streifen mit ockerfarbener Kante oben in der Mitte, über den anderen Hinweisen. **Nicht eigens vermessen**, schmales Fenster nicht angesehen |
| Nicht geprüft | **der Mac**, **Safari**, **VoiceOver**, echte Dienste, schmales Fenster; die Fälle aus Grenze 6 im Browser |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten).

### Schritt J15: Auch einzelne Abfragen geben nach einer Frist auf; nichts staut sich mehr (16. November 2026)

**Warum:** Eine vorgemerkte Grenze (J13, Grenze 6; J14, Grenze 4). Die gemeinsamen Abfragen geben seit J13 nach
einer Frist auf, die einzelnen daneben warteten weiter für immer.

**Bestandsaufnahme zuerst (im Quelltext gelesen; der Raum Browser im Browser der Sandbox gemessen):** Acht
einzelne Abfragen hatten keine Frist: eine Projektakte, der Stand im Raum Browser, die Spur der Spinne im
Trading-Raum, „Kalender neu laden“ in den Einstellungen, das Warten auf das Koppeln mit Telegram, die Liste der
Stimmen, eine Mail im Gespräch öffnen, die Vorbereitung zu einem Termin. Hängt JARVIS, heißt das: Die Akte „lädt
noch“ für immer, der Knopf bleibt grau, die Spur bleibt stehen. Der Raum Browser schickte dabei alle zweieinhalb
Sekunden eine weitere Abfrage hinterher, die auch hängen blieb (gemessen: fünf in zwölf Sekunden), das Koppeln mit
Telegram alle drei Sekunden; ein Browser lässt zu einem Server nur wenige Abfragen zugleich zu.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J15.1 Jede einzelne Abfrage gibt nach 30 Sekunden auf und wird wirklich beendet. Das sitzt an einer Stelle (`getJson`) und gilt damit für alle acht | Testbereit für die Akte und den Raum Browser; die übrigen sechs **nur als Regel** (dieselbe Funktion) | `EINZEL_FRIST_MS` und `getJson` in `src/lib/api.ts`; `test/regeln/anfragen.test.ts` (neu 9 Tests); Prüfung Ausfall, Schritt 9 |
| J15.2 Wo JARVIS selbst länger brauchen darf, gilt eine Minute: eine Mail öffnen (das Postfach) und „Kalender neu laden“ (der Kalender am Mac zusammen mit Outlook) | Testbereit, **nur als Regel** | `LANGE_FRIST_MS`; Regeltest (liest dafür auch die beiden Stellen im Quelltext) |
| J15.3 Wo der Fehler gezeigt oder gesagt wird („Kalender neu laden“, die Mail im Gespräch), heißt er: „Das dauert gerade zu lange. Versuch es gleich noch einmal.“ Die Räume sagen wie bisher „… lässt sich gerade nicht laden.“ | Testbereit; der Satz **nur als Regel**, die Räume im Browser | `ZU_LANGE` in `api.ts`; Regeltests; Prüfung Ausfall, Schritt 9 |
| J15.4 Eine abgelaufene Frist zählt für den Hinweis aus J14 als „keine Antwort“, aber nur, wenn JARVIS seit dem Beginn der Abfrage auch sonst nicht geantwortet hat | Testbereit, **nur als Regel** | Regeltests |
| J15.5 Solange eine Abfrage unterwegs ist, schickt der Raum Browser keine weitere hinterher; ebenso das Warten auf das Koppeln mit Telegram | Raum Browser: Testbereit. Telegram: **gebaut, nicht geprüft** | `BrowserView.tsx`, `TelegramSetup.tsx`; Prüfung Ausfall, Schritt 9 (eine Abfrage in zwölf Sekunden statt fünf) |
| J15.6 Wird der Raum verlassen (oder die Akte zugeklappt), endet sofort, was noch unterwegs ist; das gilt als Abbruch, nicht als Ausfall | Raum Browser: Testbereit. Akte, Spur der Spinne, Telegram: **gebaut, nur die Regel dahinter geprüft** | `getJson(url, signal)`; `BrowserView.tsx`, `ProjectsView.tsx`, `CrawlerWeb.tsx`, `TelegramSetup.tsx`; Regeltests; Prüfung Ausfall, Schritt 9 |

**Eigene Entscheidungen:** (1) Die Frist sitzt in `getJson` und nicht an jeder der acht Stellen: Wer künftig eine
Abfrage baut, hat sie von selbst. Die gemeinsamen Abfragen rufen `getJson` ausdrücklich ohne eigene Frist, weil sie
ihre mitbringen (J13). (2) 30 Sekunden wie bei den gemeinsamen Abfragen, weil JARVIS seinen eigenen Quellen
weniger lässt; eine Minute nur dort, wo zwei Quellen nacheinander dran sein können. (3) Ein eigener Satz für die
abgelaufene Frist, weil sie nicht heißt, dass JARVIS weg ist. (4) **Änderungen bekommen bewusst keine Frist.** Ein
Abbruch im Browser macht am Mac nichts rückgängig; wer dann noch einmal klickt, täte es womöglich zweimal. Und
manche Änderungen dürfen Minuten dauern (ein Dokument, das Lagebild, ein Auftrag im Raum Browser). (5) Aus dem
Review bewusst nicht übernommen: beide Fristen (die der gemeinsamen und die der einzelnen Abfragen) in einen
Baustein zu legen, und die beiden Schleifen auf eine Kette von Weckern umzubauen; beides wäre ein größerer Umbau
an Stellen, die geprüft laufen.

**Grenzen:** (1) Hängt JARVIS während einer Änderung, bleibt der Knopf weiter grau, bis die Seite neu geladen
wird (Eigene Entscheidungen 4). (2) Nicht im Browser geprüft: die Spur der Spinne, „Kalender neu laden“, das
Koppeln mit Telegram, die Liste der Stimmen, eine Mail öffnen, die Vorbereitung zu einem Termin; das Beenden beim
Zuklappen einer Akte. (3) Gibt die Seite eine Abfrage auf, arbeitet JARVIS am Mac sie trotzdem zu Ende; das
Ergebnis kommt dann mit der nächsten Abfrage oder gar nicht an. (4) Ob 30 Sekunden am echten Mac für jede Stelle
reichen, ist offen (Prüfliste Y8). (5) Nicht geprüft: der Mac, Safari, schmales Fenster.

### Testergebnisse Schritt J15 (16. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1126 Tests: 1126 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 9). Am Mac wären es rechnerisch zwei weniger (nicht dort gelaufen) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 28 Handprüfungen bestanden**, in drei Teilen gestartet (13, 10 und 5; zusammen rund 14 Minuten). Ausfall 171 Sekunden (vorher 126: Schritt 9 wartet die Frist von 30 Sekunden wirklich ab) |
| Tests zuerst | Zuerst und rot gesehen: fünf der Regeltests zur Frist (hängt für immer; keine Uhr; halbe Antwort) und der neue Schritt 9 der Prüfung Ausfall gegen einen Bau des Stands J14 („… schickt der Raum Browser keine weitere hinterher (5 in zwölf Sekunden)“). **Nicht zuerst rot gesehen:** die Regeltests zum Signal von außen und zum eigenen Satz (aus dem Review; Regel und Test sind zusammen entstanden) und die Stelle „Raum verlassen“ in Schritt 9; dafür stehen die Gegenproben |
| Fehler der Prüfung selbst | (1) Der nachgestellte Browser der Regeltests brach eine Anfrage nicht ab, deren Signal schon gesetzt war (der echte tut das); nachgezogen. (2) Aus dem Review: Schritt 9 gab hängende Abfragen zuerst nur für neue frei; eine, die kurz vorher losging, hätte noch ihre ganze Frist gehangen und die Prüfung gelegentlich scheitern lassen. Die Prüfung hält die Abfragen jetzt selbst fest und lässt beim Freigeben auch die wartenden durch |
| Gegenproben | 18 absichtlich eingebaute Fehler: 4 im Browser mit je eigenem Bau (keine Frist; der Raum Browser staut wieder; er lässt seine Abfrage beim Verlassen hängen; die Frist ist zu knapp), 14 an den Regeltests. **18 von 18 entdeckt, jeder an der gemeinten Stelle** (das Skript vergleicht die Zahl der Schritte davor und den Wortlaut der Fehlermeldung). Danach: Quelltext wie vorher (Vergleich mit `git diff`), sauberer Bau, Prüfung Ausfall mit 9 Schritten bestanden. **Nicht durch Gegenproben gedeckt:** die Sperre gegen den Stau beim Koppeln mit Telegram und das Beenden beim Zuklappen einer Akte, beim Verlassen des Trading-Raums und der Einstellungen (dafür gibt es keine Prüfung im Browser, Grenze 2) |
| Code-Review (Skill `code-review`, Stufe mittel, nur diese Änderung) | zehn Hinweise, alle nachgeprüft. **Sechs eingearbeitet:** „Kalender neu laden“ kann länger als 30 Sekunden brauchen (jetzt eine Minute); eine abgelaufene Frist sagte „JARVIS antwortet gerade nicht“ (jetzt ein eigener Satz); die Sperre gegen den Stau galt nur je Durchlauf, und beim Verlassen des Raums blieb die Abfrage offen (jetzt endet sie); die Prüfung im Browser hing an einem knappen Zeitfenster; der Regeltest zur langen Frist prüfte eine Zahl im Quelltext (jetzt den Namen, an beiden Stellen). **Vier bewusst nicht:** eine Frist auch für Änderungen (Eigene Entscheidungen 4, Grenze 1); ein gemeinsamer Baustein für beide Fristen und die Schleifen als Kette von Weckern (Eigene Entscheidungen 5); die Prüfung im Browser gegen den Entwicklungsserver (sie läuft immer gegen den gebauten Stand) |
| Sicherheitsprüfung (von Hand; der Skill dafür braucht den Stand bei GitHub) | Kein neuer Weg nach außen, keine neue Berechtigung, kein Schlüssel im Code. Geändert ist nur, wann der Browser eigene lesende Abfragen an JARVIS beendet; es bleiben weniger Verbindungen offen als vorher. Änderungen werden nie von selbst abgebrochen. Am Server ändert sich nichts |
| Nicht geprüft | **der Mac**, **Safari**, echte Dienste, schmales Fenster; die Stellen aus Grenze 2 im Browser |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine
(die Prüfungen fragen nur Nachbauten).

### Schritt J16: Wenn JARVIS ganz hängt: im Browser nachgestellt; zwei Grenzen bewusst stehen gelassen (16. November 2026)

**Warum:** Nach J15 blieb offen, was mit einer Änderung geschieht, bei der JARVIS hängt (J15, Grenze 1), und ob
der Hinweis aus J14 auch dann kommt, wenn JARVIS nicht weg ist, sondern hängt (J14, Grenze 6: nur als Regel
geprüft). An JARVIS selbst ist in diesem Schritt **nichts geändert**; neu ist eine Prüfung und zwei begründete
Entscheidungen.

**Bestandsaufnahme zuerst:** Die Seite kennt 36 Stellen, die etwas ändern (Aufgabe abhaken, Termin eintragen,
Einstellungen speichern, Lagebild aktualisieren, Rückfrage des Desks beantworten und weitere). Einige dürfen
lange dauern (das Lagebild, ein Dokument, das Prüfen eines Postfachs). Bei den lesenden Schnittstellen antwortet
JARVIS auch dann, wenn eine Quelle ausfällt (die Übersicht der Post etwa meldet den Fehler in der Antwort);
dauerhaft scheitern kann eine einzelne lesende Stelle heute nur bei einem Fehler im Programm oder, wenn das
Projektgedächtnis in der Datenbank liegt, bei deren Ausfall.

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J16.1 Hängt JARVIS ganz (nichts wird beantwortet), steht nach Ablauf der Fristen derselbe Hinweis oben wie beim Ausfall, mit „Änderungen kommen gerade nicht an“ | Testbereit, **nur im Browser der Sandbox** (in der Prüfung nach rund 40 bis 50 Sekunden) | Prüfung Ausfall, Schritt 10 (neu) |
| J16.2 Eine Änderung, die dabei unterwegs ist, wird nicht abgebrochen. Antwortet JARVIS wieder, kommt sie an, genau einmal, und der Hinweis verschwindet | Testbereit, **nur im Browser der Sandbox**, an einer Änderung (Aufgabe abhaken) | Prüfung Ausfall, Schritt 10 |

**Eigene Entscheidungen (beide: geprüft und bewusst nicht gebaut):** (1) **Änderungen bekommen keine Frist.** Ein
Abbruch im Browser macht am Mac nichts rückgängig; nach einem zweiten Klick käme die Änderung womöglich doppelt
an. Für den Fall, dass JARVIS ganz hängt, erklärt es der Hinweis oben; die Prüfung zeigt, dass die Änderung dann
nicht verloren geht. (2) **Kein eigener Hinweis für eine einzelne lesende Stelle, die dauerhaft scheitert**
(J14, Grenze 2). Das kommt heute praktisch nicht vor (siehe Bestandsaufnahme) und bräuchte in jedem Raum eine
eigene Stelle. Wird das Projektgedächtnis einmal zentral in der Datenbank geführt (Bereich I), gehört es dazu.

**Grenzen:** (1) Hängt nur die eine Schnittstelle einer Änderung und JARVIS antwortet sonst, bleibt der Knopf
grau, bis die Seite neu geladen wird; ein Hinweis kommt dann nicht. Nicht nachgestellt. (2) Der Fall aus
Entscheidung 2 bleibt ohne Hinweis. (3) Nicht geprüft: der Mac, Safari, andere Änderungen als das Abhaken.

### Testergebnisse Schritt J16 (16. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1126 Tests: 1126 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (keine neuen) |
| Prüfung Ausfall mit dem neuen Schritt 10 | Dreimal gelaufen, dreimal bestanden (10 Schritte; im Sammellauf 220 Sekunden, vorher 171) |
| Sammellauf | Der dritte Teil wiederholt (Bedienung, Vorlesen, Ausfall und die beiden zur Datenbank): **5 von 5 bestanden**. Die Teile 1 und 2 **nicht wiederholt:** Am Quelltext von JARVIS ist seit dem Sammellauf zu J15 (28 von 28) nichts geändert, nur an der Prüfung Ausfall |
| Tests zuerst | Entfällt: Das Verhalten gab es schon, die Prüfung weist es nach. Dass sie nicht leer besteht, zeigt die Gegenprobe |
| Gegenprobe (ein absichtlich eingebauter Fehler, eigener Bau) | „Eine abgelaufene Frist zählt nicht als keine Antwort“: **entdeckt an der gemeinten Stelle** (Schritt 10: „70 Sekunden, nachdem JARVIS hängt, steht oben immer noch kein Hinweis“). Danach Quelltext wie vorher, sauberer Bau, 10 Schritte bestanden. **Nicht durch eine Gegenprobe gedeckt:** „genau einmal“ (dafür müsste die Prüfung den Server verändern) |
| Code-Review, Sicherheitsprüfung | Entfallen: keine Änderung am Quelltext von JARVIS. `seite.route` (Anfragen festhalten) steht nur in der Prüfung |
| Nicht geprüft | **der Mac**, **Safari**; die Fälle aus Grenze 1 und 2 |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

### Schritt J17: Das Zuhören geprüft, mit einem nachgebauten Mikrofon; fünf Fehler beim Weckwort und beim Anhalten behoben (16. November 2026)

**Warum:** Wie JARVIS zuhört (das Weckwort, ein Befehl per Stimme, das Zuhören nach seiner Antwort, „Stopp“), war
bisher nirgends geprüft, außer in vier Regeln zu „Stopp“ (H1.5: „nur als Regel, ohne Mikrofon“; Bereich B:
„Sprache: nein, Offen“). Der Browser der Sandbox hat weder Mikrofon noch Lautsprecher.

**Wie geprüft wird:** Die neue Handprüfung „Zuhören“ ersetzt im Browser die Spracherkennung und die Sprachausgabe
durch zwei Nachbauten. Was „das Mikrofon hört“, sagt die Prüfung an (erst vorläufig, dann fertig, wie Chrome es
liefert); was JARVIS „spricht“, schreibt der Nachbau mit, Satz für Satz und mit Dauer. Alles dahinter ist echt:
die Seite, der gebaute Server, ein Testordner als Tresor, ein nachgebauter Claude. **Nicht geprüft ist damit, ob
ein echtes Mikrofon „Jarvis“ richtig versteht** und wie viel von seiner eigenen Stimme es aufschnappt; das geht
nur am Mac (Prüfliste Teil AA).

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| J17.1 Handprüfung „Zuhören“ (11 Schritte): Weckwort mit Ton und mitlaufendem Text; ein Befehl per Stimme bis in den Tresor; nach der Antwort hört er acht Sekunden ohne „Jarvis“ zu; sein eigenes Echo zählt nicht; „Stopp“ beim Sprechen; „Jarvis, …“ mitten in seine Antwort; nach einer getippten Frage hört er nicht von selbst zu; die Erkennung endet, kreiselt, hat kein Netz, ist verboten; mit KI-Gehirn Satz für Satz; freihändig aus (Knopf, Leertaste, bleibt nach dem Neuladen aus); der Browser erlaubt das Mikrofon erst nach einem Klick; nie laufen zwei Mikrofone zugleich | Testbereit, **nur mit nachgebautem Mikrofon** | `test/hand/zuhoeren-rauch.ts` (Port 3131); jetzt 29 Handprüfungen |
| J17.2 Fehler behoben: „Jarvis, stopp“, während er noch nachdenkt, tat nichts; die Antwort kam trotzdem und wurde gesprochen. Jetzt hält ein gesprochenes Haltewort dasselbe an wie die Escape-Taste | Testbereit, **nur mit nachgebautem Mikrofon** | `onHalt` in `src/lib/useVoice.ts`, `halt` in `JarvisProvider.tsx`; Prüfung Schritt 9 |
| J17.3 Fehler behoben: Sprach er gerade einen Satz, in dem „Jarvis“ vorkam, überhörte er „Jarvis, stopp“ (sein Name gilt dann nicht als Weckwort). Anhalten lässt er sich jetzt immer | Testbereit, **nur mit nachgebautem Mikrofon** | Prüfung Schritt 9 |
| J17.4 Fehler behoben: Endete die Erkennung mitten in „Jarvis, wie …“, blieb die Anzeige auf „Ich höre zu …“ stehen, obwohl er wieder nur auf „Jarvis“ wartete | Testbereit, **nur mit nachgebautem Mikrofon** | `verwirfHalbGehoertes`; Prüfung Schritte 8 und 10 |
| J17.5 Fehler behoben: „Danke, Jarvis“ beendete das Zuhören nach seiner Antwort nicht und weckte ihn sonst sogar auf (Ton, „Ich höre zu …“). „Okay, danke“ und „Stopp bitte“ galten als neue Frage: Ohne KI-Gehirn kam „Das verstehe ich noch nicht …“, mit KI-Gehirn ging der Dank an Claude | Testbereit (Regeln) und **nur mit nachgebautem Mikrofon** (Prüfung Schritt 6) | `isHalt` in `src/lib/voiceText.ts` |
| J17.6 Fehler behoben: „Jarvis, Jarvis, Briefing“ (er hat beim ersten Mal nicht reagiert) gab „Jarvis, Briefing“ als Befehl weiter, nur „Jarvis, Jarvis“ sogar „Jarvis“ als Frage | Testbereit (Regeln, Prüfung Schritt 6) | `afterWake` |
| J17.7 Regeltests für das, was bisher keinen einzigen Test hatte: Weckwort (auch „Dschawis“, „Tscharvis“ und so weiter), Haltewörter, Echo | Testbereit | `test/regeln/zuhoeren.test.ts` (20 Tests) |

**Eigene Entscheidungen:** (1) Höfliche Formen sind Haltewörter: „Stopp bitte“, „Okay, stopp“, „Danke dir“, mit
seinem Namen davor oder dahinter, auch so, wie der Erkenner ihn schreibt („Danke, Dschawis“). „Nein danke“, „Ja“
und „Okay“ allein sind es nicht, das sind Antworten. (2) „Okay, danke“, „Super, danke“, „Passt, danke“ sind nach
einer Antwort ein Dank. **Hat JARVIS aber gerade etwas gefragt** (sein letzter Satz endet mit einem Fragezeichen),
sind sie eine Antwort und gehen weiter; das kam aus dem Code-Review. (3) „Stopp“ ohne „Jarvis“ hält ihn wie bisher
nur an, während er spricht. Beim stillen Nachdenken braucht es „Jarvis, stopp“, damit ein Wort im Raum keine Frage
abbricht. (4) Beginnt ein Befehl selbst mit „Jarvis“ („Jarvis, Jarvis-Einstellungen öffnen“), fällt auch dieses
weg: Der Erkenner setzt kein Komma, an dem es sich unterscheiden ließe, und zweimal „Jarvis“ ist der häufigere Fall.

**Grenzen:** (1) Alles hier ist nur mit dem nachgebauten Mikrofon geprüft. Offen bleibt am Mac: ob Chrome und
Safari „Jarvis“ verstehen, wie gut das Unterdrücken des eigenen Echos mit echten Lautsprechern trägt, die Erkennung
auf dem Mac selbst, ein Fenster im Hintergrund. (2) Solange er einen Satz mit „Jarvis“ spricht und 2,5 Sekunden
danach, nimmt er „Jarvis, <Befehl>“ nicht an (anhalten geht). Das ist der Schutz vor seinem eigenen Echo, wie
bisher. (3) Ein sehr schnelles Wort (innerhalb von 1,2 Sekunden nach seinem Satz), das in seinem Satz vorkam, gilt
als Echo und wird verworfen, wie bisher. (4) Einen festen Befehl, der schon läuft (etwa eine Mail öffnen), hält
auch „Jarvis, stopp“ nicht auf, so wenig wie die Escape-Taste; er spricht nur nicht mehr. Nicht nachgestellt.
(5) Nicht geprüft: die ElevenLabs-Stimme zusammen mit dem Zuhören.

### Testergebnisse Schritt J17 (16. November 2026, Cloud-Sandbox, Linux, Node 22.23.4, Chromium, PostgreSQL 16)

| Prüfung | Ergebnis |
|---|---|
| `npm run pruefen` | 0 Befunde, 0 Fehler; **1146 Tests: 1146 bestanden, 0 fehlgeschlagen, 0 übersprungen, 0 TODO** (neu 20). Am Mac wären es rechnerisch zwei weniger (nicht dort gelaufen) |
| Handprüfung „Zuhören“ | Mit dem endgültigen Stand dreimal gelaufen, dreimal bestanden (11 Schritte; im Sammellauf 102 Sekunden). Drei der fünf Bilder angesehen (Zuhören, verbotenes Mikrofon, „Klick einmal …“) |
| Sammellauf nach allen Änderungen, gegen den neu gebauten Stand | **Alle 29 Handprüfungen bestanden**, in drei Teilen gestartet (14, 10 und 5; zusammen rund 17 Minuten). Zuhören 102 Sekunden, Ausfall 213 Sekunden |
| Tests zuerst | Die Regeln zu zweimal „Jarvis“ und zu den höflichen Haltewörtern und in der Prüfung „Danke, Jarvis“ waren vor der Korrektur rot und danach grün. Für die Fehler J17.2 bis J17.4 kam die Korrektur vor dem ersten roten Lauf; dass die Prüfung sie bemerkt, zeigt hier die Gegenprobe (jede Korrektur einzeln zurückgenommen) |
| Gegenproben (absichtlich eingebaute Fehler, je eigener Bau) | 49 eingebaute Fehler: 17 an den Regeln, 32 im Browser (je eigener Bau). **46 sofort entdeckt**, im Browser alle im gemeinten Schritt. Drei erst nach Schärfen, dann entdeckt: (1) „der Rest nach dem Weckwort behält seine Leerzeichen“ (Regel; ein Test mit Leerzeichen am Rand fehlte); (2) „das gesprochene Haltewort hält nur die Stimme an“ (fast gleichwertig: Auch das bricht das Nachdenken ab; der Unterschied ist eine Frage, die noch nicht unterwegs ist. Die Prüfung hält jetzt eine Frage sofort an und sieht nach, dass sie nie beim KI-Gehirn ankommt); (3) „ein zweites Mikrofon startet neben dem ersten“ (der Zähler des Nachbaus begann mit jedem Neuladen neu; die Prüfung fragt jetzt nach mehreren Schritten und gleich nach „Jarvis“). Außerdem fiel „nach einem verbotenen Mikrofon versucht er es im Kreis weiter“ zuerst erst eine Prüfstelle später auf (die wachsende Pause aus dem Teil davor verdeckte es); nach einer Korrektur der Prüfung an der gemeinten. Unter den 49 sind die fünf behobenen Fehler, jeder einzeln zurückgenommen („wie vorher“): alle entdeckt. Danach Quelltext wie vorher (verglichen), sauberer Bau, 11 Schritte bestanden |
| Code-Review (mittlere Stufe, vor dem Commit) | Acht Hinweise, alle bearbeitet: Haltewort mit verhörtem Namen („Danke, Dschawis“) zählte nicht; „Okay, danke“ verschluckte die Antwort auf eine Rückfrage; die Anzeige konnte „hört nicht zu“ sagen, obwohl der Mikrofon-Knopf noch galt; beim halb gehörten „Danke, Jarvis“ kam der Weckton; „Jarvis, stopp“ hielt je nach seinem Satz Verschiedenes an; zweimal dieselbe Rücksetzung und dieselbe Regel im Code. Der Hinweis zu „Jarvis, Jarvis neu starten“ ist bewusst nicht umgesetzt (Entscheidung 4) |
| Sicherheitsprüfung (von Hand) | Keine neue Schnittstelle, keine neuen Daten, nichts geht hinaus. Das Mikrofon der Prüfung ist ein Nachbau; ein echtes Mikrofon wird von hier aus nie geöffnet. Das neue Anhalten ruft nur, was die Escape-Taste schon ruft |
| Nicht geprüft | **der Mac**, **Safari**, **ein echtes Mikrofon und echte Lautsprecher**; die Fälle aus den Grenzen 2 bis 5 |

**Was gesichert wurde:** siehe „Sicherung“. **Sicherheitsrisiken:** keine neuen. **Neue laufende Kosten:** keine.

## Phase 3 bis 10

| Phase | Zustand | Hinweis |
|---|---|---|
| 3 Azure-Infrastruktur | Blockiert; vorbereitet in Schritt I1 (Bereich I) | D&S-Abonnement, IT-Verantwortliche, freigegebene Dienste, Kosten klären |
| 4 Claude sicher integrieren | Offen | persönlicher API-Schlüssel; AVV, Aufbewahrung, ZDR klären (R-14) |
| 5 Microsoft 365 / Entra ID | Testbereit für Termine aus Outlook lesen (Schritt D1, nur gegen Nachbau); echte Anbindung blockiert | siehe Bereich D; braucht die App-Registrierung durch eure IT |
| 6 Projektgedächtnis | Testbereit (Schritt C1, Datei statt Datenbank) | siehe Bereich C |
| 7 Geschäftsführungsdashboard | Testbereit für „Heute“ und „Projekte“ (Schritt E1), Rest offen | siehe Bereich E |
| 8 Desktop Agent, Sprache | Blockiert | Windows oder Mac (R-15) |
| 9 Verkehr, Automatisierungen, Agenten | Offen | Trading bleibt Spielgeld |
| 10 Qualitätssicherung, Einführung | Offen | |

## Offene Fragen an Benedikt

1. [Prüfliste für den Mac](docs/pruefliste-mac.md) durchgehen (Teile A bis Z und AA; Teil N erst, wenn eure IT so weit ist; Teile X, Y und Z neu seit J11, J12 und J13; die Punkte Y4 bis Y8 neu seit J14 und J15; Teil AA neu seit J17). Benedikt hat sie am 13. November
   als PDF bekommen.
2. Schlüssel nach dem Umzug neu ausstellen (Rotation)? Ändert echte Zugangsdaten, daher nur auf deine Ansage.
3. Vor Phase 3: Gibt es ein D&S-Azure-Abonnement, und wer betreut die Unternehmens-IT? Dazu seit Schritt I1:
   Soll JARVIS überhaupt zentral laufen (mehrere Personen, oder weiterarbeiten, wenn der Mac aus ist)? Solange
   nur du ihn am Mac nutzt, bringt Azure wenig. Was vorher zu entscheiden ist, steht in
   [09-azure-vorbereitung.md](docs/jarvis-2.0/09-azure-vorbereitung.md).
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
| Arbeitszweig als Git-Bündel | Projektdateien `jarvis/sicherung/jarvis-aktuell.bundle` | wird nach jedem Arbeitspaket mit `scripts/sichern.sh` erneuert. Die neue Sicherung wird erst für sich geprüft und ersetzt die alte nur, wenn sie besteht (Schritt J2); Verlauf in `sicherungen.txt`. Zurückspielen und prüfen: `bash scripts/wiederherstellen-pruefen.sh <Ordner>` |
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
9. **I1: gebaut, Testbereit** (Schritt I1 in Bereich I): Projektgedächtnis wahlweise in PostgreSQL, Verbindung
   zu Claude an einer Stelle, Anleitung für Azure. In Azure selbst ist nichts angelegt.
10. **J2: gebaut, Testbereit** (Schritt J2 in Bereich J): Die Sicherung lässt sich zurückspielen und prüfen;
   eine misslungene neue Sicherung lässt die alte liegen.
11. **J3: gebaut, Testbereit** (Schritt J3 in Bereich J): Einstellungen werden überall in einem Zug gelesen,
   geändert und gespeichert.
12. **G2.4: gebaut, Testbereit, nur gegen einen nachgebauten Mac** (Schritt G2.4 in Bereich G): Hinweise am Tag
   als Mitteilung am Mac, ohne Handy.
13. **C2: gebaut, Testbereit** (Schritt C2 in Bereich C): Das persönliche Gedächtnis verliert keine Einträge
   mehr und ersetzt nie eine beschädigte Datei. In der Datenbank liegt es bewusst noch nicht (C2.4).
14. **G3.5: gebaut, Testbereit, nur gegen das nachgebaute Postfach** (Schritt G3.5 in Bereich G): Zitat der
   ursprünglichen Mail und „Allen antworten“, beides nur auf deinen Haken am Mac. Anhänge gehen erst mit dem
   Entwurf im Postfach (Frage 13).
15. **C4.2: gebaut, Testbereit** (Schritt C4.2 in Bereich C): Offene Risiken gehören zur Projektüberwachung.
   Ein Risiko mit Frist zählt wie eine Frist, ein lange unverändertes kommt montags zur Sprache.
16. **E4.1: gebaut, Testbereit** (Schritt E4.1 in Bereich E): Marktlage im Raum Intel, in „Heute“ und als
   Zuruf „Marktübersicht“: Krypto, Edelmetalle und Spielgeld-Desk auf einen Blick, mit dem, was auffällt.
   Ohne KI und ohne neue Datenquellen.
17. **G4.1: gebaut, Testbereit, nur gegen nachgebautes Telegram** (Schritt G4.1 in Bereich G): Starke
   Bewegungen am Markt stehen im Morgenbriefing und im Tagesabschluss, am Handy und gesprochen am Mac.
18. **J4: gebaut, Testbereit** (Schritt J4 in Bereich J): Ein Befehl baut JARVIS und klickt alle 17
   Handprüfungen im Browser nacheinander durch; „alle bestanden“ steht nur da, wenn alle gelaufen sind.
   Dabei eine wackelige Prüfung (Gedächtnis) gefunden und behoben.
19. **J5: gebaut, Testbereit** (Schritt J5 in Bereich J): Alle Handprüfungen starten und beenden den Server
   an einer Stelle (nur auf freiem Port, fremde Server werden nicht für den eigenen gehalten). Neue
   Handprüfung für den Raum Trading mit dem Spielgeld-Desk, gegen nachgebauten Markt; jetzt 18 Prüfungen.
20. **J6: gebaut, Testbereit** (Schritt J6 in Bereich J): Handprüfungen für die Räume Aufgaben und Dokumente,
   jetzt 20 Prüfungen. Dabei gefunden und behoben: Ein Obsidian-Tresor, der sich nicht lesen lässt, sah aus
   wie „nichts fällig“; jetzt steht überall da, dass JARVIS die Aufgaben nicht lesen kann.
21. **J7: gebaut, Testbereit** (Schritt J7 in Bereich J): Handprüfungen für den Raum Kalender und für das
   getippte Gespräch, jetzt 22 Prüfungen. Dabei sechs Fehler gefunden und behoben: ein ausdrücklich genannter
   Kalender wurde still ersetzt oder beim festen Befehl überhört (am Mac noch ungeprüft, Prüfliste T2), der erste Klick auf die Zeile über der
   Leiste klappte das Gespräch nicht auf, „Anhalten“ direkt nach dem Abschicken hielt nichts an, ein Abriss
   der Verbindung zu Claude hieß „terminated.“, nach „Ja, ausführen“ zeigte der Raum die Änderung erst Minuten
   später, und nach dem Anhalten blieb eine leere Zeile stehen.
22. **J8: gebaut, Testbereit** (Schritt J8 in Bereich J): Handprüfungen für das Lagebild im Raum Intel und für
   das Lesen der Post, jetzt 24 Prüfungen. Dabei fünf Fehler gefunden und behoben: graue Knöpfe ohne Erklärung
   bei aufgebrauchtem Tagesbudget, ein doppeltes Thema wurde als dazugekommen bestätigt, eine Warnung an den
   Trading-Desk verschwand mit dem nächsten Lagebild, „gelesen“ beim Durchgehen der Mails las die Mail noch
   einmal vor, und ein ausgefallenes Postfach sah aus wie ein leeres.
23. **J9: gebaut, Testbereit** (Schritt J9 in Bereich J): sechs Kleinigkeiten behoben (Minuszeichen bei
   Prozenten, „1 Abschnitt“, laufender Termin im Kalender, Fehlersätze mit Punkt, Zähler im Raum Post, zwei
   Sätze in einem Augenblick) und eine Handprüfung für den Raum „Heute“, jetzt 25 Prüfungen. Dabei vier Fehler
   gefunden und behoben: „Heute“ sagte „kein Termin“ und „nichts wartet“, solange noch geladen wurde oder der
   Kalender nicht lesbar war; erfundenes Beispielwetter stand als Wetter da und wurde im Briefing angesagt; ein
   ausgefallenes Postfach zeigte bis zu einer Minute lang wieder die alten Mails; der Satz zum Tag verschwieg
   ein ausgefallenes Postfach.
24. **J10: gebaut, Testbereit** (Schritt J10 in Bereich J): JARVIS lässt sich ohne Maus bedienen und im schmalen
   Fenster benutzen (sieben Funde behoben, neue Handprüfung „Bedienung“, jetzt 26 Prüfungen); „Heute“
   unterscheidet, ob eine Quelle noch lädt oder JARVIS dort nicht antwortet, und versucht es nach einem
   Fehlschlag am Anfang nach Sekunden wieder. Die Scheibe „Termine heute“ fasst einen vollen Tag. Beim Gegenprüfen
   gefunden und abgestellt: Das Bauen verschluckte gelegentlich eine Änderung am Aussehen (nur für Prüfungen und
   einen späteren zentralen Betrieb von Belang; der Mac startet anders).
25. **J11: gebaut, Testbereit, ohne Vorleseprogramm geprüft** (Schritt J11 in Bereich J): Wer sich JARVIS
   vorlesen lässt, hört jetzt, was JARVIS antwortet und ob ein Klick gelungen ist; Scheiben und Leiste sind
   eigene Bereiche; das aufgeklappte Gespräch klappt zu, wenn die Markierung mit der Tab-Taste hinauswandert;
   alles Anklickbare ist mindestens 24 Pixel hoch. Neue Handprüfung „Vorlesen“, jetzt 27 Prüfungen. Dabei einen
   alten Fehler gefunden und behoben: Wer genau dann tippte oder die Eingabetaste drückte, wenn JARVIS den Raum
   wechselte, verlor einen Buchstaben oder schickte nichts ab.
26. **J12: gebaut, Testbereit, nur in der Sandbox nachgestellt** (Schritt J12 in Bereich J): Zehn Räume sagen
   jetzt, wenn sich etwas nicht laden lässt, statt für immer „Lade …“ zu zeigen. Dabei gefunden und behoben: Die
   Räume Aufgaben und Post zeigten bei einem Ausfall Nullen, der Kalender bot „verbinden“ an, und der
   Trading-Raum zeigte ein Konto mit 10.000 $ und „Die Spinne schläft“, gleich ob der Handel lief. Neue
   Handprüfung „Ausfall“, jetzt 28 Prüfungen.
27. **J13: gebaut, Testbereit, nur in der Sandbox geprüft** (Schritt J13 in Bereich J): Die Zeile über der Leiste
   zeigt nach einer Antwort wieder die Antwort, auch wenn das Mikrofon gesperrt ist; die Meldung dazu ist dann nur
   noch als „Hinweis im Gespräch“ vermerkt. Eine Abfrage, die nie beantwortet wird, gibt JARVIS nach 30 bis 60
   Sekunden auf und sagt, was sich nicht laden lässt; vorher blieb sie für immer offen.
28. **J14: gebaut, Testbereit, nur in der Sandbox geprüft** (Schritt J14 in Bereich J): Antwortet JARVIS nicht
   mehr, steht oben in jeder Ansicht, seit wann, und dass der Raum den Stand von davor zeigt. Eine Änderung oder
   eine Frage sagt dann „JARVIS antwortet gerade nicht. Versuch es gleich noch einmal.“ statt „Failed to fetch“.
29. **J15: gebaut, Testbereit, nur in der Sandbox geprüft** (Schritt J15 in Bereich J): Auch die einzelnen
   Abfragen (eine Akte, der Raum Browser, die Spur der Spinne und fünf weitere) geben nach 30 Sekunden auf, statt
   für immer zu warten; der Raum Browser staut keine Abfragen mehr und beendet seine, wenn er verlassen wird.
30. **J16: geprüft, an JARVIS nichts geändert** (Schritt J16 in Bereich J): Hängt JARVIS ganz, kommt derselbe
   Hinweis wie beim Ausfall, und eine Änderung, die gerade unterwegs ist, kommt genau einmal an, wenn er wieder
   antwortet (im Browser der Sandbox nachgestellt). Zwei Grenzen bleiben bewusst stehen: keine Frist für
   Änderungen, kein eigener Hinweis für eine einzelne Stelle, die dauerhaft scheitert.
   Die Reihe zu Ausfällen (J12 bis J16) ist damit abgeschlossen, soweit sie sich ohne den Mac prüfen lässt.
31. **J17: gebaut, Testbereit, nur mit nachgebautem Mikrofon geprüft** (Schritt J17 in Bereich J): Das Zuhören
   hat jetzt eine eigene Handprüfung (Weckwort, Befehl per Stimme, Zuhören nach der Antwort, „Stopp“, Fehler des
   Mikrofons), jetzt 29 Prüfungen. Dabei fünf Fehler gefunden und behoben: „Jarvis, stopp“ beim Nachdenken tat
   nichts; es wurde überhört, wenn er gerade selbst „Jarvis“ sagte; die Anzeige „Ich höre zu …“ konnte hängen
   bleiben; „Danke, Jarvis“ und „Okay, danke“ galten als Weckruf oder neue Frage; zweimal „Jarvis“ wurde Teil des
   Befehls.
32. **H2.1: gebaut, Testbereit, nur gegen einen nachgebauten Mac geprüft** (Schritt H2.1 in Bereich H): „Jarvis,
   öffne Excel“ öffnet Programme und Ordner aus einer festen Liste (19 Programme, 4 Ordner, bis zu 12 eigene), mit
   und ohne KI-Gehirn; in den Einstellungen lässt sich jeder Eintrag ausschalten. Nur öffnen, nichts bedienen.
   Neue Handprüfung „Programme am Mac“, jetzt 30 Prüfungen.
   **Als Nächstes:** ein Paket, das keine Entscheidung von Benedikt braucht; Kandidaten stehen in der
   Übersicht oben (Modelladapter, Gesprächsnachbereitung, weitere Teile des Desktop-Agenten). Als Frage an Benedikt
   vorgemerkt, nicht gebaut: ein Schalter „JARVIS ohne Stimme“. Unter Beobachtung bleibt der einmalige, nicht
   wiederholbare Ausfall der Prüfung Gedächtnis aus J9. Die weiteren Schritte für Azure (Anmeldung je Person,
   übrige Daten in die Datenbank) erst, wenn Benedikt entschieden hat, ob JARVIS zentral laufen soll (Frage 3).
