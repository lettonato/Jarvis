# JARVIS 2.0 – Plan für den ersten Entwicklungsschritt

Stand: 5. November 2026. Dieser Plan ist ein **Vorschlag**. Umgesetzt wird erst nach Benedikts Freigabe.

## Warum dieser Schritt zuerst

Der Plan verlangt, vor jeder Änderung den Stand zu sichern und die bestehenden Funktionen durch Tests
abzusichern (Aufgabe 1.2). Heute gibt es im Repo keinen einzigen Test (R-10), und der aktuelle Stand
hängt in 16 ungemergten PRs (R-11). Ein Security Gateway (Phase 2) ohne Tests einzubauen hieße, jedes
Werkzeug anzufassen, ohne prüfen zu können, ob danach noch alles geht. Deshalb kommt zuerst das
Sicherheitsnetz, direkt danach das Gateway.

## Schritt 1: Sicherheitsnetz (Phase 1.2) — ca. 1 Arbeitssitzung

Alles in diesem Schritt ist nicht destruktiv, ändert kein Verhalten von JARVIS und kostet nichts.

| # | Was | Welche Dateien | Auswirkung |
|---|---|---|---|
| 1.1 | **Stand versionieren:** Git-Tag `stand-2026-11-05` auf den heutigen Stand (`9d6811c`) setzen. Damit gibt es einen festen Rückfallpunkt, egal was mit den Branches passiert. | nur Tag | keine |
| 1.2 | **Testgerüst ins Repo:** `npm test` mit dem in Node eingebauten Testläufer (keine neue Abhängigkeit). Nachgebaute Server für Anthropic, xAI, Telegram, Markt und Webseiten unter `test/mocks/`, damit nie echte Dienste angesprochen werden. | `test/`, `package.json` (Skript) | keine |
| 1.3 | **Tests für die festen Regeln** (ohne Netz): Desk-Regeln (`paper.ts`), Rückfrage (`approval.ts`), Browser-Sperren (`src/lib/browser.ts`), Crawler-Adressfilter, Kalender-/Datumsregeln, Telegram-Koppelcode, Pfadprüfung Obsidian/Dokumente, `guard.ts`. Die heute gefundenen Lücken (R-04, R-05) werden als **erwartet fehlschlagende** Tests festgehalten, damit ihre Behebung messbar ist. | `test/*.test.ts` | keine |
| 1.4 | **Tests für die Module mit nachgebauten Diensten:** Gehirn-Werkzeuge (je ein Aufruf pro Werkzeug), Desk-Takt, Intel, Analyst, Telegram. | `test/*.test.ts` | keine |
| 1.5 | **Automatische Prüfung bei jedem Push (GitHub Actions):** Lint, Typprüfung, Build, Tests, Secret-Scan (gitleaks) über die ganze History. Für private Repos im kostenlosen Kontingent von GitHub (2.000 Minuten/Monat); ein Lauf dauert geschätzt 3–5 Minuten. | `.github/workflows/pruefung.yml` | keine Kosten im Freikontingent |
| 1.6 | **Konfiguration vom Code trennen:** `config.example.json` und eine Liste aller Umgebungsvariablen (heute 29, verstreut im Code) mit Bedeutung und Test-/Produktivwert. | `docs/konfiguration.md`, `config.example.json` | keine |
| 1.7 | **Reproduzierbar starten:** Startdateien nutzen `npm ci` statt `npm install`; Node-Version festschreiben (`.nvmrc`, `engines`). | `start-jarvis.*`, `package.json` | Start nach Update minimal anders, Verhalten gleich |
| 1.8 | **Entwicklungsübersicht pflegen:** `ENTWICKLUNG.md` mit Offen / In Arbeit / Blockiert / Testbereit / Abgeschlossen. | `ENTWICKLUNG.md` | keine |

**Abnahme von Schritt 1:** Alle Tests laufen in der CI grün (mit Ausnahme der bewusst markierten
Lücken-Tests), der Tag existiert, die Konfiguration ist dokumentiert. Das wird mit dem CI-Lauf belegt,
nicht behauptet. Was sich nur auf dem Mac prüfen lässt (Apple-Kalender, echtes Chrome, Mikrofon), kommt
als kurze Prüfliste für Benedikt in die Übersicht und bleibt bis zu seiner Bestätigung „Testbereit“.

## Schritt 2 (Vorschau): Security Gateway, erste Ausbaustufe (Phase 2.1, 2.2, 2.5)

Nur zur Einordnung, wird nach Schritt 1 einzeln zur Freigabe vorgelegt.

* `src/lib/server/gateway/` mit einer **Richtlinientabelle**: jedes Werkzeug mit Klasse A–D, Zielsystem,
  Datenart. Nicht eingetragene Werkzeuge werden abgelehnt (Deny by Default).
* Alle Werkzeuge in `brain.ts`, `documents.ts` und im Browser-Agenten laufen über `gateway.call()`.
* **Herkunftsmarkierung:** Sobald in einem Gespräch nicht vertrauenswürdiger Inhalt gelesen wurde (Mail,
  Webseite, Termin von Dritten, Grok), sind Klasse-C-Werkzeuge nur nach Bestätigung möglich und der
  Browser nur auf vorher genannte Adressen.
* **Bestätigungen außerhalb des Modells** nach dem Muster der Desk-Rückfrage (Knopf am Bildschirm oder
  in Telegram), für Klasse C einstellbar, für Klasse D immer.
* **Zentraler Not-Aus** und Sperre je Agent; nur ein Mensch kann ihn lösen. `handel_steuern: weiter`
  nach Not-Aus wird für das Modell gesperrt.
* **Audit-Log** als Datei, an die nur angehängt wird, jede Zeile mit Prüfsumme der vorigen (Manipulation
  fällt auf); ohne Geheimnisse und ohne Mailinhalte, nur Metadaten.
* Sofort-Fixes: DNS-Prüfung im Browser-Agenten (R-04), Lücken im Crawler-Filter und feste IP je Abruf (R-05),
  Gedächtnis-Einträge nur nach Bestätigung (R-03).
* Tests: Prompt-Injection-Testfälle mit nachgebautem Claude, der den Angriff „befolgt“; das Gateway muss
  ihn trotzdem blockieren. So wird das Abnahmekriterium unabhängig vom Modellverhalten geprüft.

## Was dafür von Benedikt gebraucht wird

1. **Freigabe für Schritt 1** (oder Änderungswünsche).
2. **Entscheidung zum Versionsstand:** Der Stapel aus 16 offenen PRs bleibt vorerst, Schritt 1 baut auf
   `dokumente` auf (Vorschlag). Alternative: erst den Stapel nach `main` mergen, dann ist `main` wieder
   die gültige Basis. Merge nur auf sein „merge“.
3. Später, vor Phase 3 und 8 (nicht jetzt): Gibt es ein D&S-Azure-Abonnement und wer betreut die IT? Läuft
   der Geschäftsführungs-PC mit Windows oder Mac?

## Was ausdrücklich nicht passiert

Keine Azure-Ressourcen, keine Kosten außerhalb des GitHub-Freikontingents, keine Änderungen an
Zugangsdaten, keine echten Postfächer oder Firmendaten, kein Merge ohne „merge“.
