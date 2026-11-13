# Tests

```
npm test            # alle Tests (Node-Testläufer mit tsx)
npm run pruefen     # Lint, Typprüfung und Tests
```

* `test/regeln/` prüft feste Regeln ohne Netz: Desk und Rückfrage, Browser-Sperren, Crawler-Adressfilter,
  API-Schutz, Telegram- und Dokument-Regeln.
* `test/module/` prüft Module mit echten Dateien im Temp-Ordner und nachgebauten Diensten:
  Obsidian, Gedächtnis, Dokumentablage, KI-Gehirn (nachgebauter Claude in `test/mocks/claude-mock.ts`),
  Spielgeld-Desk und das Security Gateway (`gateway.test.ts`: Deny by Default, Klassen, Freigaben,
  Not-Aus, Agentensperren, Audit-Log, ein manipuliertes Modell).
* Nachgebaute Dienste in `test/mocks/`: Claude (`claude-mock.ts`), Telegram (`telegram-mock.ts`), xAI/Grok
  (`xai-mock.ts`), der Mac für Kalender und Programme (`osascript-mock.mjs`, `open-mock.mjs`) und der
  macOS-Schlüsselbund (`security-mock.mjs`).
* `test/helfer/umgebung.ts` sorgt dafür, dass kein Test echte Einstellungen, echte Schlüssel oder echte
  Dienste berührt.

**Bekannte Sicherheitslücken** stehen als Tests mit `todo` und Risikonummer (siehe
`docs/jarvis-2.0/02-risiken.md`). Sie laufen bei jedem Durchgang mit, werden als `# TODO` gemeldet und
gelten **nicht** als bestanden. Ist eine Lücke behoben, wird aus dem `todo` ein normaler Test.
Seit Schritt 2 (8. November 2026) ist keine bekannte Lücke mehr offen; alle 13 früheren `todo`-Tests sind
normale Tests.

`test/hand/` enthält Handprüfungen, die ein echtes Chrome brauchen und deshalb nicht bei `npm test` mitlaufen
(Netzschleuse, Browser-Agent, PDF). Aufruf steht jeweils oben in der Datei.

Neue Werkzeuge: Der Test „jedes Werkzeug steht in der Tabelle“ liest alle `betaTool({ name })` aus
`brain.ts` und `browser.ts`. Ein Werkzeug ohne Zeile in `src/lib/server/gateway/richtlinien.ts` lässt ihn
fehlschlagen, ebenso eine freigabepflichtige Regel ohne Aktion in `src/lib/server/aktionen.ts`.

Nur auf dem Mac prüfbar und deshalb nicht automatisiert: Apple-Kalender (osascript), Öffnen von
Programmen, echtes Chrome für Browser-Agent und PDF, Spracherkennung, echte Postfächer und Telegram.
