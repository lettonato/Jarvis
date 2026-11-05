# JARVIS 2.0 – Entwicklungsübersicht

Dauerhafte Übersicht nach dem verbindlichen Entwicklungsplan für D&S. Wird bei jedem Schritt aktualisiert.

**Zustände:** Offen · In Arbeit · Blockiert · Testbereit · Abgeschlossen

**Regeln:** „Abgeschlossen“ nur mit nachprüfbarem Beleg (Testlauf, CI-Link, Bestätigung von Benedikt).
„Testbereit“ heißt: gebaut, aber noch nicht vollständig geprüft. Keine erfundenen Testergebnisse.
Produktive Änderungen, Berechtigungen, Zugangsdaten, Kosten und vertrauliche Daten nur nach
ausdrücklicher Freigabe. Merge nur auf Benedikts „merge“.

Letzte Aktualisierung: 5. November 2026

## Aktueller Schritt

Phase 1 Bestandsaufnahme ist erstellt. **Wartet auf Benedikts Freigabe** für Schritt 1 (Sicherheitsnetz),
siehe [Plan](docs/jarvis-2.0/03-plan-schritt-1.md).

## Phase 1 – Bestandsaufnahme

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| 1.1 Ist-Architektur aller Komponenten (9 Punkte) | Testbereit | [Bestandsaufnahme](docs/jarvis-2.0/01-bestandsaufnahme.md); wartet auf Durchsicht durch Benedikt |
| 1.1 Implementiert vs. getestet ermitteln | Testbereit | Ergebnis: alle 8 genannten Funktionen sind im Code vorhanden, „Programme öffnen“ nur eingeschränkt; kein automatischer Test im Repo |
| 1.2 Stand versionieren (Tag) | Offen | Schritt 1.1 im Plan |
| 1.2 Keine API-Schlüssel im Repo | Abgeschlossen | 31 Commits aller Branches geprüft am 05.11.2026, nur Testwert `xai-test-123` in entfernter Datei; [Risiken A](docs/jarvis-2.0/02-risiken.md) |
| 1.2 Schutz gegen künftige Schlüssel-Commits | Offen | Secret-Scan in CI, Schritt 1.5 |
| 1.2 Konfiguration vom Code trennen | Offen | Schritt 1.6 |
| 1.2 Reproduzierbare Entwicklungsumgebung | Offen | Schritt 1.7; `npm ci` + `next build` + `tsc` + `eslint` liefen am 05.11.2026 in der Sandbox fehlerfrei |
| 1.2 Bestehende Funktionen durch Tests absichern | Offen | Schritt 1.2–1.4; heute 0 Tests im Repo |
| 1.2 Rückfallmöglichkeit | Offen | Tag + CI, Schritt 1.1/1.5 |

## Phase 2 – Zentrale Sicherheitsarchitektur

| Aufgabe | Zustand | Beleg / Hinweis |
|---|---|---|
| Prüfung der Grundlagen (Secrets, Tools, SSRF, Injection, Not-Aus, Logs) | Testbereit | [Risikoliste](docs/jarvis-2.0/02-risiken.md) |
| 2.1 Security Gateway, Deny by Default | Offen | Schritt 2 im Plan; hängt an Phase 1.2 |
| 2.2 Sicherheitsklassen A–D | Offen | Erste Einordnung aller Werkzeuge in der Risikoliste, Abschnitt B |
| 2.3 Zugangsdaten schützen | Offen | heute Klartext in `~/.jarvis/config.json` (R-07) |
| 2.4 Schutz vor manipulierten Inhalten | Offen | R-02, R-03; Browser-Adressfilter R-04, Crawler R-05 |
| 2.5 Zentraler Not-Aus, Agentensperre | Offen | nur Desk-Not-Aus vorhanden, vom Modell aufhebbar (R-06) |
| 2.5 Audit-Log, Alarmierung, Manipulationsschutz | Offen | nicht vorhanden (R-08) |

## Phase 3 bis 10

| Phase | Zustand | Hinweis |
|---|---|---|
| 3 Azure-Infrastruktur | Blockiert | braucht Klärung: D&S-Abonnement, IT-Verantwortliche, freigegebene Dienste, Kosten |
| 4 Claude sicher integrieren | Offen | heute persönlicher API-Schlüssel, SDK in 4 Dateien fest verdrahtet; AVV/ZDR-Klärung nötig (R-14) |
| 5 Microsoft 365 / Entra ID | Blockiert | braucht Phase 2 und einen Test-Tenant bzw. Testpostfach |
| 6 Projektgedächtnis | Offen | heute nur `gedaechtnis.json` |
| 7 Geschäftsführungsdashboard | Offen | bestehende Oberfläche als Ausgangspunkt |
| 8 Desktop Agent, Sprache | Blockiert | offene Frage: Windows oder Mac (R-15) |
| 9 Verkehr, Automatisierungen, Agenten | Offen | Desk, Intel, Analyst, Crawler vorhanden; Trading bleibt Spielgeld |
| 10 Qualitätssicherung, Einführung | Offen | — |

## Offene Fragen an Benedikt

1. Freigabe für Schritt 1 (Sicherheitsnetz)?
2. Versionsstand: Stapel der 16 offenen PRs vorerst stehen lassen (Vorschlag) oder zuerst nach `main` mergen?
3. Vor Phase 3: Gibt es ein D&S-Azure-Abonnement, und wer betreut die Unternehmens-IT?
4. Vor Phase 8: Läuft der Geschäftsführungs-PC mit Windows oder macOS?
