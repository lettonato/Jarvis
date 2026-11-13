# Tests

```
npm test            # alle Tests (Node-Testläufer mit tsx)
npm run pruefen     # Lint, Typprüfung und Tests
```

* `test/regeln/` prüft feste Regeln ohne Netz: Desk und Rückfrage, Browser-Sperren, Crawler-Adressfilter,
  API-Schutz, Telegram- und Dokument-Regeln, die Tageslage für „Heute“ (`heute.test.ts`: Reihenfolge von
  „Wartet auf dich“, überfällige Aufgaben, Projekte mit Frist, Termine mit Projektbezug) und die Routinen
  (`routinen.test.ts`: Projekte im Briefing, Tagesabschluss, was dabei nicht über Telegram gehen darf) und
  die Agentensteuerung (`agenten.test.ts`: Zustände, Vorrang von Not-Aus und Sperre, erlaubte Knöpfe, Kosten
  je Agent). `modelle.test.ts` prüft die Modellwahl und die Preisrechnung gegen Zahlen aus der Preisliste.
  `geteilt.test.ts` prüft die geteilten Abfragen der Oberfläche (eine Abfrage für mehrere Stellen, keine
  veraltete Antwort über einem neueren Stand), mit gestellter Uhr.
* `test/module/` prüft Module mit echten Dateien im Temp-Ordner und nachgebauten Diensten:
  Obsidian, Gedächtnis, Dokumentablage, KI-Gehirn (nachgebauter Claude in `test/mocks/claude-mock.ts`),
  Spielgeld-Desk und das Security Gateway (`gateway.test.ts`: Deny by Default, Klassen, Freigaben,
  Not-Aus, Agentensperren, Audit-Log, ein manipuliertes Modell). `projekte.test.ts` prüft das
  Projektgedächtnis: nur ein Mensch am Mac bestätigt, Vorschläge sind kein Wissen, Korrekturverlauf,
  vertrauliche Projekte, Speicher in der Datei und auf einem zweiten Speicher ohne Datei.
  `kosten.test.ts` prüft das Kostenbuch: Buchen je Agent und Tag, nur Zahlen in der Datei, gleichzeitige
  Buchungen, abgebrochene Antwort, nicht lesbare und kaputte Datei. Der nachgebaute Claude meldet je Antwort
  10 Token Eingabe und 5 Ausgabe und nennt das angefragte Modell; mit dem Zug `{ abbruch: true }` reißt eine
  Antwort mittendrin ab.
* Nachgebaute Dienste in `test/mocks/`: Claude (`claude-mock.ts`), Telegram (`telegram-mock.ts`), xAI/Grok
  (`xai-mock.ts`), ElevenLabs mit Stimmenliste, Kontostand und einem stillen, echten MP3
  (`elevenlabs-mock.ts`), der Mac für Kalender und Programme (`osascript-mock.mjs`, `open-mock.mjs`), der
  macOS-Schlüsselbund (`security-mock.mjs`), ein Postfach (`imap-mock.ts`: IMAP auf 127.0.0.1 mit sieben
  Beispiel-Mails, schreibt jeden Befehl mit; `post.test.ts`) und der Markt für den Spielgeld-Desk
  (`markt-mock.ts`: DexScreener, GeckoTerminal, CoinGecko, RugCheck; `desk-kauf.test.ts`). Der Desk merkt
  sich Kurse 15 Sekunden: Die Kaufpfad-Tests stellen deshalb die Uhr und springen je Runde 20 Sekunden.
* `test/helfer/umgebung.ts` sorgt dafür, dass kein Test echte Einstellungen, echte Schlüssel oder echte
  Dienste berührt.

**Bekannte Sicherheitslücken** stehen als Tests mit `todo` und Risikonummer (siehe
`docs/jarvis-2.0/02-risiken.md`). Sie laufen bei jedem Durchgang mit, werden als `# TODO` gemeldet und
gelten **nicht** als bestanden. Ist eine Lücke behoben, wird aus dem `todo` ein normaler Test.
Seit Schritt 2 (8. November 2026) ist keine bekannte Lücke mehr offen; alle 13 früheren `todo`-Tests sind
normale Tests.

`test/hand/` enthält Handprüfungen, die ein echtes Chrome brauchen und deshalb nicht bei `npm test` mitlaufen
(Netzschleuse, Browser-Agent, PDF, Ansichten „Heute“ und „Projekte“, Schalter für den Tagesabschluss, Agentensteuerung). Aufruf steht jeweils oben in der Datei.

`test/hand/glashaus-schau.ts` ist keine Prüfung, sondern eine Schau: Sie startet JARVIS mit Beispieldaten
(nachgebautes Postfach, nachgebauter Markt, Kalender, Aufgaben, drei Projekte), damit man alle Räume gefüllt
ansehen und fotografieren kann. Vorher `npx next build`, dann `npx tsx test/hand/glashaus-schau.ts 3210 start`.

Neue Werkzeuge: Der Test „jedes Werkzeug steht in der Tabelle“ liest alle `betaTool({ name })` aus
`brain.ts` und `browser.ts`. Ein Werkzeug ohne Zeile in `src/lib/server/gateway/richtlinien.ts` lässt ihn
fehlschlagen, ebenso eine freigabepflichtige Regel ohne Aktion in `src/lib/server/aktionen.ts`.

Nur auf dem Mac prüfbar und deshalb nicht automatisiert: Apple-Kalender (osascript), Öffnen von
Programmen, echtes Chrome für Browser-Agent und PDF, Spracherkennung, echte Postfächer und Telegram.
