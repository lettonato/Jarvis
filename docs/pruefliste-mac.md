# Prüfliste für deinen Mac

Diese Punkte kann nur ein Mensch am Mac prüfen. Solange sie offen sind, stehen die Schritte in
`ENTWICKLUNG.md` auf „Testbereit“ und nicht auf „Abgeschlossen“. Du brauchst etwa 20 Minuten.
Schreib mir einfach die Nummern, die geklappt haben, und bei den anderen, was du gesehen hast
(ein Bildschirmfoto reicht).

**Vorher:** Den neuen Stand als ZIP entpacken und JARVIS mit `start-jarvis.command` starten.
Der erste Start dauert etwas länger.

## A. Grundfunktionen (Schritt 1)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| A1 | JARVIS starten | Die Kommandozentrale öffnet sich im Browser |
| A2 | Kalender-Ansicht öffnen | Deine Termine erscheinen |
| A3 | Sagen oder tippen: „Öffne Obsidian“, danach „Öffne den Kalender“ | Beide Programme öffnen sich |
| A4 | Ein Dokument erstellen lassen, z. B. „Erstelle ein kurzes Dokument über Gold“ | Unter Dokumente liegt ein PDF, es lässt sich öffnen |
| A5 | In Telegram eine Frage an JARVIS schicken | JARVIS antwortet |

## B. Sicherheit (Schritt 2)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| B1 | „Merk dir, dass ich Kaffee schwarz trinke“ | Oben erscheint eine Freigabe. Nach „Ja, ausführen“ steht der Eintrag unter Einstellungen → Gedächtnis |
| B2 | „Trag morgen 10 Uhr Test ein“ | Freigabe am Mac und in Telegram. Ja auf dem Handy trägt den Termin ein, der Knopf am Mac verschwindet |
| B3 | Einstellungen → Sicherheit → Not-Aus drücken | Rote Leiste oben; JARVIS antwortet „Ich bin angehalten“. `/notaus` in Telegram wirkt genauso |
| B4 | Not-Aus lösen | Geht nur am Mac und nur mit dem Wort FREIGEBEN |
| B5 | Einstellungen → Sicherheit → Audit-Log ansehen | Die Schritte von eben stehen drin, darüber „Prüfkette intakt“ |

## C. Browser mit Netzschutz (Schritt 2.6, neu)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| C1 | Browser-Ansicht: „Such mir das Wetter in Deggendorf“ | Der Auftrag läuft wie bisher durch und liefert ein Ergebnis. **Wichtig:** Falls Chrome nicht startet oder nach einem Benutzernamen fragt, bitte Bildschirmfoto |
| C2 | Browser-Ansicht: „Öffne http://192.168.178.1“ (deine Fritzbox) | JARVIS lehnt ab: Seiten im Heimnetz öffnet er nicht |
| C3 | „Was gibt es Neues in der Post?“, danach „Such dazu etwas im Browser“ | Unter der ersten Antwort steht klein „Enthält Inhalte von Dritten“. Der Browser-Auftrag startet erst nach deinem Ja |

## D. Zugangsdaten in den Schlüsselbund (Schritt 2.3)

Das ist der einzige Teil, der echte Zugangsdaten bewegt. **Mach ihn nur, wenn du das möchtest.** Er lässt
sich zurücknehmen (D6).

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| D0 | Vorher: `~/.jarvis/config.json` an einen sicheren Ort kopieren (Finder: Gehe zu → Gehe zum Ordner → `~/.jarvis`) | Eine Kopie als Rückversicherung |
| D1 | Einstellungen → Sicherheit → Zugangsdaten | Alle eingerichteten Schlüssel stehen auf „Datei“ |
| D2 | Häkchen setzen und „In den Schlüsselbund umziehen“ | Meldung „… Einträge liegen jetzt im Schlüsselbund“. Fragt macOS nach deinem Anmeldepasswort, notier bitte, wann |
| D3 | Programm „Schlüsselbundverwaltung“ öffnen, nach JARVIS suchen | Je Schlüssel ein Eintrag |
| D4 | Die Datei `~/.jarvis/config.json` in TextEdit ansehen | Statt der Schlüssel steht `@schluesselbund` |
| D5 | JARVIS beenden und neu starten | Gespräch, Mail, Telegram und Kurse funktionieren wie vorher |
| D6 | Optional: „Zurück in die Datei“, danach wieder umziehen | Beides klappt ohne Fehlermeldung |
| D7 | Danach die Kopie aus D0 löschen. Empfehlung: die Schlüssel bei Anthropic, xAI, Twelve Data und Telegram sowie das Mail-App-Passwort neu ausstellen, weil alte Kopien der Datei in Backups liegen können | Deine Entscheidung; ich ändere keine Zugangsdaten |

**Wenn beim Umzug etwas schiefgeht:** JARVIS bricht ab und lässt die Datei, wie sie war. Sollte JARVIS danach
einen Dienst als „nicht eingerichtet“ zeigen, steht unter Sicherheit → Zugangsdaten der Grund.
