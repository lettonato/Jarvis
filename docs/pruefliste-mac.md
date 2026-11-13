# Prüfliste für deinen Mac

Diese Punkte kann nur ein Mensch am Mac prüfen. Solange sie offen sind, stehen die Schritte in
`ENTWICKLUNG.md` auf „Testbereit“ und nicht auf „Abgeschlossen“. Du brauchst etwa 45 Minuten.
Schreib mir einfach die Nummern, die geklappt haben, und bei den anderen, was du gesehen hast
(ein Bildschirmfoto reicht).

**Vorher:** Den neuen Stand als ZIP entpacken und JARVIS mit `start-jarvis.command` starten.
Der erste Start dauert etwas länger.

## A. Grundfunktionen (Schritt 1)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| A1 | JARVIS starten | JARVIS öffnet sich im Browser im Raum „Heute“: helle Wand, rechts das Fenster, unten die Leiste mit den Räumen |
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

## E. Projektgedächtnis (Schritt C1, neu)

Bitte nur mit einem erfundenen oder unkritischen Projekt ausprobieren.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| E1 | Unten in der Leiste auf „Projekte“ gehen, „Neues Projekt“, z. B. „Testprojekt Halle“ anlegen | Das Projekt erscheint als Kachel, die Akte geht auf |
| E2 | In der Akte „Eintrag hinzufügen“: eine Aufgabe mit Frist | Der Eintrag steht unter „Aufgaben“ mit „von dir eingetragen“ und Datum |
| E3 | Zu JARVIS sagen: „Im Testprojekt Halle haben wir heute entschieden, dass wir in Stahl bauen. Thomas holt bis Freitag Angebote ein.“ | JARVIS sagt, dass Vorschläge auf deine Bestätigung warten. Am Reiter „Projekte“ steht eine Zahl. **Wichtig:** Schlägt JARVIS gar nichts vor oder Falsches, schreib mir bitte, was er gesagt hat |
| E4 | Einen Vorschlag „Übernehmen“, einen mit „Ändern“ anpassen und übernehmen, einen „Ablehnen“ | Übernommenes steht in der Akte, Abgelehntes nirgends |
| E5 | Bei einem Eintrag „Korrigieren“, Text ändern, Grund angeben | Der Eintrag zeigt „Einmal korrigiert“, aufgeklappt steht der alte Text |
| E6 | Bei einem Eintrag „Zurückziehen“ | Er steht nur noch unten unter „Zurückgezogen“ |
| E7 | JARVIS fragen: „Was ist der Stand im Testprojekt Halle?“ | Er nennt nur Übernommenes, mit Datum; Abgelehntes und Zurückgezogenes nicht |
| E8 | In Telegram schreiben: „Trag im Testprojekt Halle ein, dass wir fertig sind“ | Es entsteht nur ein Vorschlag; bestätigen geht nur am Mac |
| E9 | Projekt bearbeiten → „Vertraulich“ ankreuzen, dann JARVIS nach dem Projekt fragen | JARVIS sagt, dass er es nicht lesen kann |
| E10 | Im Kalender einen Termin „Jour fixe Testprojekt Halle“ in 20 Minuten anlegen, JARVIS offen lassen (Projekt nicht vertraulich) | Zur Erinnerung erscheint im Gespräch die Vorbereitung: Entscheidungen und offene Aufgaben |

## F. Tagesübersicht „Heute“ (Schritt E1, neu)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| F1 | Unten in der Leiste auf „Heute“ gehen | Datum und groß an der Wand der nächste Termin (oder „Guten Tag“); darunter „Wartet auf dich“, Aufgaben, Post und Projekte; vor dem Fenster drei Glasscheiben: Termine heute, Märkte, Agenten |
| F2 | Mit deinem Kalender und deinen Erinnerungen vergleichen | Dieselben Termine von heute und dieselben fälligen Aufgaben. **Wichtig:** Fehlt etwas oder steht etwas Falsches da, schreib mir bitte, was |
| F3 | Im Testprojekt eine Aufgabe mit Frist von gestern eintragen, zurück zu „Heute“ | Unter „Wartet auf dich“ steht das Projekt mit der überfälligen Aufgabe |
| F4 | Zu JARVIS sagen: „Tagesübersicht“ | Die Ansicht „Heute“ geht auf |
| F5 | Auf deinem Bildschirm die Leiste oben ansehen | Alle Einträge passen in eine Zeile. Wenn nicht, schreib mir die Breite deines Fensters |

## G. Morgenbriefing und Tagesabschluss (Schritt G1, neu)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| G1 | Zu JARVIS sagen: „Briefing“ (im Testprojekt liegt noch die überfällige Aufgabe aus F3) | Im Briefing nennt JARVIS das Projekt und die überfällige Aufgabe |
| G2 | Zu JARVIS sagen: „Tagesabschluss“ | JARVIS sagt, was offen blieb und was morgen ansteht, und öffnet „Heute“ |
| G3 | In Telegram `/abschluss` schreiben | Eine Nachricht „Feierabend, …“ mit den Terminen von morgen. Projekte stehen nur als Zahl darin |
| G4 | Einstellungen → Handy: „Tagesabschluss jeden Abend um“ anhaken und eine Uhrzeit in zwei Minuten einstellen | Zur Uhrzeit kommt die Nachricht von selbst, danach an dem Tag nicht noch einmal. Den Haken kannst du wieder herausnehmen |
| G5 | Einstellungen → Handy: „Projekte beim Namen“ anhaken, dann in Telegram `/briefing` | Jetzt steht das Testprojekt mit Namen im Briefing. Ein als „Vertraulich“ markiertes Projekt steht nie mit Namen da |

## H. Agentensteuerung (Schritt F1, neu)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| H1 | Unten in der Leiste auf „Agenten“ gehen | Ganz oben steht „Steuerung“ mit fünf Agenten: Gespräch, Browser-Agent, Analyst, Intel, Spielgeld-Desk, jeder mit Zustand, „Zuletzt“ und „Kosten heute“ |
| H2 | Bei Intel mit den Angaben in der Intel-Ansicht vergleichen | Derselbe letzte Lauf und dieselben Kosten von heute |
| H3 | Beim Analysten „Sperren“ drücken, dann JARVIS um ein Dokument bitten | Der Analyst steht auf „gesperrt“, JARVIS sagt, dass er gesperrt ist. Danach „Entsperren“ |
| H4 | Läuft der Spielgeld-Desk: „Pausieren“, dann „Fortsetzen“ | Der Zustand wechselt auf „pausiert“ und zurück, auch auf dem Trading-Desk |
| H5 | Zu JARVIS sagen: „Was machen die Agenten gerade?“ | Er nennt, wer läuft, wer bereit ist und ob einer einen Fehler meldet |
| H6 | Nur wenn du magst (kostet etwa 40 Cent bei xAI): bei Intel „Jetzt starten“ | Intel steht auf „läuft“, danach steht ein neuer letzter Lauf da |
| H7 | JARVIS eine Frage stellen, die Claude beantwortet (zum Beispiel „Was steht heute an?“), dann „Agenten“ öffnen | Beim Gespräch steht unter „Kosten heute“ ein Betrag (meist ein bis drei Cent je Frage) und darunter „Claude Opus 5.5“ mit der Zahl der Anfragen. Oben steht „Heute zusammen“ und der laufende Monat |
| H8 | Nach ein paar Tagen: in der Konsole von Anthropic (platform.claude.com, Abrechnung) die Kosten des Monats ansehen und mit „im … bisher“ in „Agenten“ vergleichen | Die Zahlen liegen nah beieinander. JARVIS schätzt nach Listenpreis und zählt abgebrochene Antworten nur teilweise, deshalb darf er etwas darunter liegen. Bitte beide Zahlen notieren |

## I. Stimme mit ElevenLabs und Unterbrechen (Schritt H1, neu)

Die ElevenLabs-Stimme ist bisher nur gegen einen nachgebauten Dienst geprüft. Mit deinem Schlüssel zeigt sich
zum ersten Mal, ob das echte ElevenLabs alles genauso annimmt. **Das kostet Zeichen aus deinem Tarif bei
ElevenLabs** (Gratis-Tarif: 10.000 im Monat). I1 und I2 gehen ohne Schlüssel und kosten nichts.

| Nr. | Was du tust | Was du sehen oder hören solltest |
|---|---|---|
| I1 | JARVIS etwas Längeres fragen und, während er spricht, „Stopp“ sagen | Er hört auf zu sprechen, ohne dass du „Jarvis“ sagen musst. Mit Kopfhörern klappt es am sichersten |
| I2 | Dasselbe mit der Taste Escape | Er verstummt sofort |
| I3 | Bei ElevenLabs die Wunschstimme zu „Meine Stimmen“ hinzufügen und unter „Developers“ → „API Keys“ einen Schlüssel erstellen | Ein Schlüssel, der meist mit sk_ beginnt. Nicht in einen Chat kopieren |
| I4 | In JARVIS: Einstellungen → Stimme, Schlüssel einfügen, „Prüfen und speichern“ | „Verbunden. In deinem Konto sind … Stimmen.“ Der Schalter ist noch aus. Lehnt ElevenLabs ab, steht dort ein Satz mit dem Grund; den bitte an mich weitergeben |
| I5 | Stimme auswählen, „Probe hören“ | Du hörst „Hallo Benedikt, so klinge ich jetzt …“ in der gewählten Stimme |
| I6 | „Mit dieser Stimme sprechen“ anhaken, dann JARVIS etwas fragen | Er antwortet mit der neuen Stimme, ohne lange Pause zwischen den Sätzen. Oben steht, wie viele Zeichen heute vorgelesen wurden |
| I7 | Während er mit der neuen Stimme spricht: „Stopp“ oder Escape | Er verstummt sofort |
| I8 | Tageslimit auf 500 stellen und zwei, drei Fragen stellen | Nach kurzer Zeit spricht wieder die Stimme des Macs, und in den Einstellungen steht, dass das Tageslimit erreicht ist. Danach das Limit wieder hochstellen |
| I9 | Schalter ausschalten | JARVIS spricht wieder mit der Stimme des Macs |

## J. Neues Aussehen „Glashaus“ (Schritt E2, neu)

Das Aussehen ist bisher nur in der Sandbox mit Beispieldaten geprüft, in Chrome. Am Mac zählt dein Eindruck.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| J1 | JARVIS in Chrome öffnen und in der Leiste unten nacheinander auf „Projekte“, „Kalender“, „Heute“ klicken | Die Kamera fährt seitlich in den nächsten Raum: Der alte Raum gleitet hinaus, eine dunkle Wand mit dem Namen des Raums zieht vorbei, der neue gleitet herein. Die Leiste bleibt stehen. **Wichtig:** Ruckelt es oder flackert etwas, schreib mir bitte, bei welchem Wechsel |
| J2 | Dasselbe in Safari, falls du Safari nutzt | Entweder dieselbe Fahrt oder ein einfacher Wechsel ohne Fahrt. Beides ist in Ordnung; bitte schreib mir, was du siehst |
| J3 | Jeden Raum einmal ansehen (unter „Mehr“ stehen die übrigen) | Überall dunkle Schrift auf heller Wand, nichts abgeschnitten, nichts übereinander, jede Schrift gut lesbar |
| J4 | In einem langen Raum (Einstellungen, Trading) nach unten rollen | Nur die Wand rollt, Fenster und Leiste bleiben stehen; ganz unten ist nichts von der Leiste verdeckt |
| J4a | Einstellungen: oben in der Zeile unter der Überschrift auf „Sicherheit“ klicken, dann auf „Datenschutz“ | Die Wand rollt zum Abschnitt. Der Knopf „Prüfen und speichern“ steht in einer Zeile neben dem Eingabefeld |
| J4b | Trading ansehen, bei laufendem Spielgeld-Handel | Keine weißen Kästen mehr. Die Tabelle „Scan“ zeigt alle Spalten bis „Prüfung“ ohne seitliches Schieben; dort steht bei jedem Coin kurz der Grund |
| J5 | Das Browserfenster schmal ziehen (etwa halbe Bildschirmbreite) | Das Fenster rückt nach oben, der Inhalt steht darunter, die Leiste zeigt „Räume“ als Auswahl |
| J6 | In der Leiste rechts etwas an JARVIS schreiben oder „Jarvis“ sagen | Über der Leiste erscheint seine Antwort; ein Klick darauf klappt das ganze Gespräch auf |
| J7 | Einstellungen → Aussehen | Eine Liste: zu jedem Raum das Foto mit dem Namen des Fotografen |
| J8 | Gesamteindruck | Passt es zu dem Entwurf „Glashaus“, den du gewählt hast? Was stört dich, was fehlt dir? |

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
