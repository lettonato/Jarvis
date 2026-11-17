# Prüfliste für deinen Mac

Diese Punkte kann nur ein Mensch am Mac prüfen. Solange sie offen sind, stehen die Schritte in
`ENTWICKLUNG.md` auf „Testbereit“ und nicht auf „Abgeschlossen“. Du brauchst etwa 150 Minuten (Teil N geht erst, wenn eure IT so weit ist; die Teile P, Q, R, S, T, U, V, W, X, Y, Z, AA, AB und AC und die Punkte M11 bis M13, Y4 bis Y8, Z5 und AB12 sind neu).
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
| H1 | Unten in der Leiste auf „Agenten“ gehen | Ganz oben steht „Steuerung“ mit sechs Agenten: Gespräch, Browser-Agent, Analyst, Intel, Edelmetalle, Spielgeld-Desk, jeder mit Zustand, „Zuletzt“ und „Kosten heute“ |
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

## K. Zeitplan und Edelmetalle (Schritt F2, neu)

Der Agent für Gold und Silber ist bisher nur gegen ein nachgebautes Twelve Data geprüft. Er braucht den
Twelve-Data-Schlüssel, den du für die Rohstoffe im Trading schon eingetragen hast (sonst: Einstellungen,
Rohstoffe). Er nutzt kein KI-Modell und kostet nichts außer zwei bis drei Abrufen aus deinem Kontingent je Lauf.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| K1 | Raum „Intel“ öffnen und nach unten zum Abschnitt „Gold und Silber“ rollen, dann „Jetzt lesen“ | Nach ein paar Sekunden steht unter „Fakten“ Gold mit Kurs je Feinunze und dem Datum des Kurses. Bei Silber steht entweder der Kurs je Feinunze oder „Silber-Fonds SLV“ mit Kurs je Anteil und einem Satz, warum. **Wichtig:** Steht dort stattdessen ein Fehler, schreib mir bitte den Satz |
| K2 | Den Goldkurs mit einer Seite deiner Wahl vergleichen (zum Beispiel gold.de, in Dollar je Unze) | Der Kurs liegt nah beieinander (Tageskurs, kein Sekundenkurs) |
| K3 | Den Abschnitt lesen | Fakten und „Einordnung nach festen Regeln“ stehen getrennt. Nirgends steht eine Vorhersage oder Kaufempfehlung; der Satz „keine Prognose und keine Anlageberatung“ steht da |
| K4 | Bei „Uhrzeiten“ `25:00` eintragen und speichern, danach zwei eigene Uhrzeiten | Die falsche Uhrzeit wird abgelehnt, die richtigen werden gespeichert, und „Nächstes Lagebild“ nennt die nächste davon |
| K5 | Raum „Agenten“: Abschnitt „Zeitplan“ unter der Steuerung ansehen | Sechs Zeilen: Intel, Edelmetalle, Morgenbriefing, Erinnerung vor Terminen, Hinweise am Tag, Tagesabschluss, jede mit Takt und nächstem Termin oder dem Grund, warum keiner ansteht |
| K6 | JARVIS über eine der Uhrzeiten hinweg laufen lassen (zum Beispiel über 17:30), danach in „Agenten“ nachsehen | Im Zeitplan steht bei Edelmetalle unter „Zuletzt nach Plan“ die Uhrzeit, im Raum Intel ein neues „Gelesen heute …“ |
| K7 | In „Agenten“ bei Edelmetalle „Sperren“, dann im Raum Intel „Jetzt lesen“ | Es wird nicht gelesen, die Meldung nennt die Sperre. Im Zeitplan steht „Der Agent ist gesperrt.“ Danach „Entsperren“ |
| K8 | Zu JARVIS sagen: „Wie steht Gold?“ | Er nennt den Kurs mit dem Datum und, wenn du fragst, den Trend nach der Regel. Er gibt keine Prognose und keine Empfehlung |
| K9 | In „Agenten“ bei Edelmetalle auf „öffnen“ klicken | Der Raum Intel geht auf und steht gleich beim Abschnitt „Gold und Silber“ |

## L. Hinweise am Tag und alles per Telegram über den Zeitplan (Schritt G2, neu)

Morgenbriefing, Erinnerungen vor Terminen und Tagesabschluss startet jetzt derselbe Taktgeber wie die Agenten.
Neu sind die „Hinweise am Tag“. Sie sind aus, bis du sie einschaltest, kommen nur zwischen 9 und 18 Uhr,
höchstens dreimal am Tag, und jedes Ding nur einmal. Geprüft ist das bisher nur gegen ein nachgebautes Telegram.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| L1 | Einstellungen → Handy ansehen | Der Haken „Hinweise am Tag“ ist nicht gesetzt. Alles andere steht wie vorher |
| L2 | Am nächsten Morgen abwarten | Das Morgenbriefing kommt wie gewohnt zur eingestellten Uhrzeit, einmal. Im Raum „Agenten“ steht es im Zeitplan unter „Zuletzt nach Plan“ |
| L3 | Einen Termin in 20 Minuten in den Kalender eintragen und warten | Eine Viertelstunde vorher kommt die Erinnerung aufs Handy, einmal. Im Zeitplan steht sie bei „Erinnerung vor Terminen“ |
| L4 | Zwischen 9 und 18 Uhr: „Hinweise am Tag“ anhaken. Im Testprojekt eine Aufgabe mit Frist von gestern eintragen, als zuständig einen anderen Namen (zum Beispiel „Thomas“) | Innerhalb von ein bis zwei Minuten kommt „Kurzer Hinweis“ aufs Handy. Ohne den Haken „Projekte beim Namen“ steht darin nur eine Zahl, mit dem Haken „Hier fehlt eine Rückmeldung“ mit Projekt, Aufgabe und „zuständig: Thomas“ |
| L5 | Gleich danach noch eine überfällige Aufgabe eintragen | In der nächsten Stunde kommt nichts. Frühestens eine Stunde nach dem ersten Hinweis kommt der zweite |
| L6 | Eine eigene Aufgabe in Obsidian mit Fälligkeit heute offen lassen und bis nach 15 Uhr warten | Einmal am Nachmittag kommt „Heute noch offen“ mit dieser Aufgabe |
| L7 | Am Mac das WLAN für zwei Minuten ausschalten, während eine Erinnerung oder ein Hinweis fällig wäre, dann wieder einschalten | Im Zeitplan steht kurz „Telegram war nicht erreichbar“, danach kommt die Nachricht nach, und zwar einmal |
| L8 | Den Haken „Hinweise am Tag“ wieder herausnehmen, wenn du sie nicht willst | Im Zeitplan steht bei den Hinweisen „Ausgeschaltet.“, und es kommt nichts mehr |

## M. Antwortentwürfe für Mails (Schritt G3, neu)

JARVIS entwirft auf Zuruf eine Antwort auf eine Mail. Er verschickt nichts und legt auch nichts in dein
Postfach: Der Entwurf liegt nur auf dem Mac im Raum „Post“. Abschicken tust du ihn selbst aus deinem
Mailprogramm. Geprüft ist das bisher nur gegen ein nachgebautes Postfach und ein nachgebautes KI-Modell.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| M1 | Raum „Post“ öffnen, bei einer wichtigen Mail auf „Antwort entwerfen“ klicken | JARVIS antwortet kurz, und oben im Raum erscheint „Antwortentwürfe“ mit einem Entwurf. Bei „An“ steht der Absender der Mail, bei „Betreff“ steht „Re: …“ |
| M2 | Den Entwurf lesen | Der Text ist in deinem Namen geschrieben. Wo JARVIS etwas nicht wissen kann (Termin, Preis), steht eine Lücke in eckigen Klammern statt einer erfundenen Angabe |
| M3 | Sagen: „Schreib die Antwort kürzer und sag für Dienstag zu“ | Der Entwurf wird durch einen neuen ersetzt. Es bleibt bei einem Entwurf je Mail |
| M4 | Im Feld etwas ändern und auf „Speichern“ klicken | Es steht „Gespeichert.“ und rechts „von dir geändert“. Der Knopf „Speichern“ verschwindet |
| M5 | Danach noch einmal „Antwort entwerfen“ bei derselben Mail | JARVIS sagt, dass dein geänderter Entwurf bleibt. Dein Text ist unverändert |
| M6 | Auf „Im Mailprogramm öffnen“ klicken | Dein Mailprogramm öffnet eine neue Mail mit Empfänger, Betreff und Text. Sie ist noch nicht verschickt; das machst du selbst. Umlaute und Absätze stimmen |
| M7 | Bei einem sehr langen Entwurf (mehr als etwa eine Bildschirmseite) | Unter den Knöpfen steht, dass der Text für den Link zu lang ist. Der Knopf öffnet dann Empfänger und Betreff, den Text holst du mit „Kopieren“ |
| M8 | Eine Antwort auf einen Newsletter oder eine „no-reply“-Mail entwerfen lassen | Am Entwurf steht der Hinweis, dass diese Adresse vermutlich keine Antworten annimmt |
| M9 | Auf „Verwerfen“ klicken | Der Entwurf ist weg. Im Postfach selbst hat sich nichts geändert: Die Mail ist weiter ungelesen, im Ordner „Entwürfe“ und im Ordner „Gesendet“ deines Mailprogramms liegt nichts von JARVIS |
| M10 | In Telegram schreiben: „Entwirf eine Antwort auf die Mail von … “ | JARVIS antwortet, dass der Entwurf am Mac im Raum „Post“ liegt. Dort steht er mit dem Zusatz „vom Handy aus“ |
| M11 (neu) | An einem Entwurf auf „Zitat und weitere Empfänger aus der Mail holen“ klicken, dann „Ursprüngliche Mail als Zitat anhängen“ anhaken | Unter dem Haken steht „Am … schrieb …:“ und die ganze Mail mit „>“ vor jeder Zeile. Die Mail ist im Postfach weiter ungelesen |
| M12 (neu) | Mit dem Haken auf „Kopieren“ klicken und in eine neue Mail einfügen (oder „Im Mailprogramm öffnen“, wenn der Text kurz genug ist) | Dein Text, darunter das Zitat. Umlaute und Absätze stimmen |
| M13 (neu) | Bei einer Mail, die an mehrere Leute ging: „Allen antworten“ anhaken, dann „Im Mailprogramm öffnen“ | Am Entwurf steht die Zeile „Kopie“ mit den Adressen. Im Mailprogramm stehen sie im Feld „Kopie“, der Absender bei „An“. Deine eigene Adresse ist nicht dabei. Schreib mir, wenn dein Mailprogramm das Feld „Kopie“ leer lässt |

## N. Microsoft 365: Termine aus Outlook (Schritt D1, neu)

JARVIS liest deine Termine aus Outlook und zeigt sie im Raum „Kalender“. Er trägt in Outlook nichts ein und
ändert nichts. **Das geht erst, wenn eure IT einmal eine Anwendung im Microsoft-Verzeichnis der Firma angelegt
hat** (was genau, steht unter Einstellungen → Microsoft 365 und in der Anleitung für die IT). Bis dahin kannst
du nur N1 prüfen. Geprüft ist dieser Teil bisher nur gegen ein nachgebautes Microsoft, nie gegen das echte.

Mit N3 liest JARVIS zum ersten Mal echte Firmentermine. Das entscheidest du, indem du dich selbst anmeldest.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| N1 | Einstellungen öffnen, zu „Microsoft 365“ springen | Der Abschnitt erklärt, was eure IT anlegt (zwei Rechte, beide nur lesend), und hat zwei Felder: Verzeichnis-ID und Anwendungs-ID. Tippst du „common“ oder irgendein Wort ein, bleibt „Speichern“ grau |
| N2 | Die beiden Nummern von eurer IT eintragen, „Speichern“ | Es steht „Gespeichert. Jetzt kannst du dich bei Microsoft anmelden.“ |
| N3 | „Bei Microsoft anmelden“ klicken, den Link zur Anmeldeseite öffnen, den Code eingeben, dich mit dem Firmenkonto anmelden | JARVIS zeigt einen Code und einen Link. Der Link führt auf eine Seite von Microsoft (microsoft.com oder login.microsoftonline.com). Microsoft fragt, ob JARVIS dein Profil und deine Kalender lesen darf, und nichts darüber hinaus. Ein Passwort gibst du nur bei Microsoft ein, nie in JARVIS |
| N4 | Zurück zu JARVIS, ein paar Sekunden warten | Es steht „Verbunden mit …“ und dein Firmenkonto. Der Haken „Outlook-Termine auch im Gespräch und über Telegram“ ist **nicht** gesetzt |
| N5 | Raum „Kalender“ öffnen | Deine Outlook-Termine stehen bei den Tagen, mit „Outlook“ dahinter. Darüber steht, dass sie nur hier am Bildschirm stehen. Abgesagte Termine fehlen |
| N6 | Einen Termin ansehen, der in Outlook als „Privat“ markiert ist | Er heißt „Privater Termin“, ohne Titel und ohne Ort |
| N7 | Einen ganztägigen Termin und einen Termin mit Uhrzeit mit Outlook vergleichen | Tag und Uhrzeit stimmen mit Outlook überein. **Bitte genau hinsehen:** Verrutscht ein ganztägiger Termin um einen Tag oder eine Uhrzeit um eine Stunde, schreib mir das |
| N8 | JARVIS fragen: „Was steht morgen an?“ (an einem Tag mit Outlook-Terminen) | JARVIS nennt die Termine aus dem Mac-Kalender und sagt dazu, wie viele aus Outlook kommen, ohne ihre Titel zu nennen. In Telegram dasselbe |
| N9 | In den Einstellungen den Haken „Outlook-Termine auch im Gespräch und über Telegram“ setzen, dann noch einmal fragen | Jetzt nennt JARVIS auch die Outlook-Termine beim Namen. Den Haken wieder herausnehmen: sofort wieder nur die Zahl. Lass ihn so, wie du es haben willst |
| N10 | Stehen Termine doppelt im Raum „Kalender“? | Nein. Falls doch: Dann steht dein Firmenkonto auch in der Kalender-App des Macs, und die Titel weichen leicht ab. Schreib mir ein Beispiel. Wichtig zu wissen: Firmentermine, die über die Kalender-App des Macs kommen, nennt JARVIS immer auch im Gespräch |
| N11 | In Outlook nachsehen | Dort hat sich nichts geändert: kein neuer Termin, keine Zu- oder Absage von JARVIS |
| N12 | „Abmelden“ klicken | Die Outlook-Termine sind aus dem Raum „Kalender“ verschwunden, die beiden Nummern stehen noch da. „Microsoft 365 ganz entfernen“ löscht auch sie |

## O. Sicherung zurückspielen und Einstellungen speichern (Schritte J2 und J3, neu)

Zwei kurze Proben. O1 und O2 brauchen das Terminal, den Ordner mit JARVIS und Netz; sie ändern an deinem JARVIS
und an der Sicherung nichts (gearbeitet wird in einem Wegwerf-Ordner).

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| O1 | Die Dateien `jarvis-aktuell.bundle`, `Jarvis-aktuell.zip` und `sicherungen.txt` aus den Projektdateien in einen eigenen Ordner laden, zum Beispiel `~/Downloads/jarvis-sicherung` | Drei Dateien in einem Ordner |
| O2 | Im Terminal im JARVIS-Ordner: `bash scripts/wiederherstellen-pruefen.sh ~/Downloads/jarvis-sicherung` (dauert einige Minuten) | Vier Zeilen „in Ordnung“ und am Ende „Sicherung geprüft und wiederhergestellt“. Steht dort „FEHLER“, schick mir die Zeile |
| O3 | Einstellungen → Handy: „Hinweise am Tag“ einschalten, dann „Handy trennen“ und neu koppeln | Der Schalter „Hinweise am Tag“ ist danach noch an (früher ging er beim Trennen verloren) |
| O4 | Einstellungen: einen Schlüssel neu einfügen und, während „Prüfen“ noch läuft, in einem zweiten Fenster deinen Namen ändern | Beides ist danach gespeichert |

## P. Hinweise als Mitteilung am Mac (Schritt G2.4, neu)

JARVIS kann sich am Mac selbst melden, ohne Handy: mit einer Mitteilung von macOS oben rechts. Das habe ich nur
gegen einen nachgebauten Mac geprüft; ob macOS die Mitteilung bei dir wirklich zeigt, sieht man nur am Mac.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| P1 | Einstellungen → Mitteilungen: „Mitteilung zur Probe zeigen“ klicken | Oben rechts erscheint eine Mitteilung „JARVIS: So sieht ein Hinweis von JARVIS aus.“ Beim ersten Mal fragt macOS vielleicht, ob der „Skripteditor“ Mitteilungen zeigen darf: erlauben. Erscheint nichts, sieh unter Systemeinstellungen → Mitteilungen → Skripteditor nach, und ob ein Fokus (Nicht stören) an ist. Schreib mir, was du gesehen hast |
| P2 | Zwischen 9 und 18 Uhr: dort „Hinweise am Tag“ anhaken. Im Testprojekt eine Aufgabe mit Frist von gestern eintragen und bestätigen, dann bis zu zwei Minuten warten | Eine Mitteilung „Eine Aufgabe ist überfällig. Einzelheiten in JARVIS unter „Heute“.“ Darin steht kein Projektname und kein Text der Aufgabe. Unter Agenten → Zeitplan steht bei „Hinweise am Tag als Mitteilung am Mac“ der Lauf |
| P3 | Weitere fünf Minuten warten | Dieselbe Mitteilung kommt nicht noch einmal |
| P4 | Auf die Mitteilung klicken | JARVIS öffnet sich dadurch nicht; macOS öffnet vermutlich den Skripteditor (einfach wieder schließen). Schreib mir, was passiert ist |
| P5 | Haken wieder wegnehmen | Im Zeitplan steht bei der Zeile „Ausgeschaltet.“, es kommt nichts mehr |

## Q. Persönliches Gedächtnis (Schritt C2, neu)

Was JARVIS sich über dich merkt, liegt jetzt sicherer: Zwei Einträge zur selben Zeit überschreiben sich nicht
mehr, und eine beschädigte Datei wird nie stillschweigend durch eine leere ersetzt. An deiner Datei ändert der
neue Stand nichts.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| Q1 | Einstellungen → Gedächtnis öffnen | Deine bisherigen Einträge stehen alle noch da. Steht dort stattdessen „Die Datei des Gedächtnisses ist beschädigt“, klick **nichts** an und schick mir ein Bildschirmfoto |
| Q2 | Dort selbst etwas eintragen („Merken“), dann bei diesem Eintrag „Vergessen“ klicken | Der Eintrag erscheint und verschwindet wieder; die anderen bleiben |
| Q3 | Im Gespräch: „Merk dir, dass ich montags in München bin, und dass meine Steuerberaterin Frau Huber heißt“ und beide Freigaben mit Ja bestätigen | Unter Einstellungen → Gedächtnis stehen danach beide Einträge |

## R. Offene Risiken in der Projektüberwachung (Schritt C4.2, neu)

JARVIS achtet jetzt auch auf Risiken, nicht nur auf Aufgaben. Ein Risiko mit Frist zählt wie eine Frist. Ein
Risiko ohne Frist, das seit 14 Tagen niemand angefasst hat, kommt einmal in der Woche zur Sprache, am Montag.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| R1 | Im Testprojekt ein Risiko eintragen, als Frist das Datum von gestern | Auf der Kachel des Projekts steht rot „Risiko über der Frist“. Unter „Heute“ steht bei „Wartet auf dich“ das Projekt mit „Ein Risiko ist über der Frist: …, seit gestern überfällig“ |
| R2 | In der Akte das Risiko abhaken | Die rote Marke und der Eintrag unter „Heute“ verschwinden |
| R3 | Ein zweites Risiko ohne Frist eintragen und nichts weiter tun | Unter „Heute“ steht dazu nichts (auch am Montag nicht, weil es neu ist). Erst nach 14 Tagen steht in der Akte am Risiko „seit 14 Tagen unverändert“, und am Montag darauf steht es im Morgenbriefing und unter „Heute“. Das kannst du erst in zwei Wochen sehen; schreib mir dann bitte, ob es gekommen ist |

## S. Marktlage auf einen Blick (Schritte E4.1 und G4.1, neu)

Im Raum Intel steht jetzt ganz oben das Feld „Marktlage“: Krypto, Gold und Silber und das Spielgeld-Konto
nebeneinander, darüber, was auffällt. JARVIS rechnet das selbst aus den Kursen, die er schon hat, ohne KI.
Es ist keine Prognose und keine Anlageberatung.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| S1 | Den Raum „Intel“ öffnen | Oben das Feld „Marktlage“ mit Bitcoin, Ethereum und Solana in Euro und der Veränderung in 24 Stunden. Steht dort „Beispielkurse, keine echten Daten“, hat dein Mac gerade keine Verbindung zum Kursdienst; schreib mir das bitte |
| S2 | Weiter unten bei „Gold und Silber“ auf „Jetzt lesen“ klicken (geht nur mit deinem Twelve-Data-Schlüssel) | Im Feld „Marktlage“ kommt die Gruppe „Edelmetalle“ dazu, mit denselben Kursen wie unten und „Kurse vom …“ mit dem Datum von heute oder dem letzten Handelstag |
| S3 | Ansehen, was über den Gruppen steht | Entweder „Nichts Auffälliges“ oder eine kurze Liste, zum Beispiel „Bitcoin: +6 % in 24 Stunden“ oder „Gold steht am Hoch der letzten 21 Handelstage“. Ein Klick auf eine Zeile führt zu den Einzelheiten |
| S4 | Unten eintippen oder sagen: „Marktübersicht“ | JARVIS antwortet in zwei, drei Sätzen mit denselben Zahlen und öffnet den Raum Intel. Läuft der Desk, nennt er ihn „Spielgeld-Konto“ |
| S5 | Den Raum „Heute“ öffnen | In der Scheibe „Märkte“ stehen auch Gold und Silber |
| S6 | An den nächsten Tagen auf das Morgenbriefing und den Tagesabschluss am Handy achten | An ruhigen Tagen steht dort nichts zum Markt. Hat sich Bitcoin, Ethereum oder Solana in 24 Stunden um 5 % oder mehr bewegt (oder Gold oder Silber am selben Tag um 2 %), steht ein Absatz „Märkte“ mit je einer Zeile dabei. Steht dort „Kryptokurse: gerade keine Verbindung“, hat dein Mac den Kursdienst nicht erreicht. Schreib mir bitte, wenn du den Absatz das erste Mal siehst, und ob die Zahl zu dem passt, was im Raum Intel steht |
| S7 | An so einem Tag am Mac „Briefing“ sagen | JARVIS sagt nach den Nachrichten einen Satz „An den Märkten fällt auf: …“. Hör bitte hin, ob die Stimme die Prozente verständlich vorliest (zum Beispiel „minus sieben Prozent“), und schreib mir, wenn nicht |

## T. Kalender und Gespräch (Schritt J7, neu)

Den Raum Kalender und das getippte Gespräch klicke ich jetzt bei jeder Änderung automatisch durch, aber gegen
einen nachgebauten Kalender und einen nachgebauten Claude. Dabei habe ich sechs Fehler gefunden und behoben.
Diese Punkte zeigen, ob es mit deiner echten Kalender-App und dem echten Claude genauso ist. Die Testtermine
löschst du am Ende selbst wieder; JARVIS kann nichts löschen.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| T1 | Raum „Kalender“: bei „Neuer Termin“ „JARVIS-Test“ eintippen, „Morgen“ anklicken, als Uhrzeit 09:00 eintragen, „30 Min“ anklicken, dann „Eintragen“ | Darunter steht „Eingetragen im Kalender …: JARVIS-Test, morgen um 9 Uhr.“ mit dem Kalender, der vorher rechts bei „landet in …“ stand. In der Kalender-App steht der Termin morgen von 9:00 bis 9:30 in genau diesem Kalender |
| T2 | Im Gespräch tippen: „Trag übermorgen um 10 Uhr JARVIS-Test zwei in den Kalender Geburtstage ein“ (oder nenne einen anderen Kalender, in den man nichts eintragen kann, etwa „Feiertage“). Erscheint oben eine Frage, steht darin „im Kalender „Geburtstage““; dann auf „Ja, ausführen“ klicken. (Ohne eingerichtetes KI-Gehirn antwortet JARVIS gleich, ohne Frage) | Oben oder im Gespräch steht „Den Kalender „…“ gibt es nicht oder er ist schreibgeschützt.“ In der Kalender-App steht übermorgen **kein** neuer Termin, auch nicht in einem anderen Kalender. **Wichtig:** Steht er doch irgendwo, schreib mir das bitte; diese Stelle konnte ich nur am nachgebauten Kalender prüfen |
| T3 | Im Gespräch tippen: „Trag am Freitag um 14 Uhr JARVIS-Test drei ein, wenn das für dich passt“, im Raum „Kalender“ bleiben und oben auf „Ja, ausführen“ klicken | Oben steht „Eingetragen im Kalender …“, und der Termin steht sofort in der Liste am Freitag, ohne dass du neu lädst |
| T4 | JARVIS im Browser neu öffnen und noch nirgends klicken. Steht über der Leiste „Klick einmal irgendwo auf die Seite, dann höre ich zu.“, genau auf diese Zeile klicken | Das Gespräch klappt auf, und JARVIS hört ab jetzt zu. Steht die Zeile nicht da, lass den Punkt aus |
| T5 | Eine längere Frage tippen (zum Beispiel „Erzähl mir ausführlich die Geschichte von Rosenheim“), Enter drücken und sofort danach Esc drücken | JARVIS antwortet nicht mehr und steht wieder auf „Bereit“. Im aufgeklappten Gespräch steht deine Frage, darunter keine leere Zeile |
| T6 | Dieselbe Frage noch einmal stellen und, während JARVIS schreibt, das WLAN am Mac ausschalten. Danach wieder einschalten und etwas anderes fragen | Im Gespräch steht ein verständlicher deutscher Satz, zum Beispiel „Die Verbindung zu Claude ist abgerissen. Frag mich bitte noch einmal.“, kein einzelnes englisches Wort. Die nächste Frage beantwortet JARVIS wieder |
| T7 | Die Testtermine in der Kalender-App löschen | Sie sind auch im Raum „Kalender“ weg, spätestens nach „Neu laden“ |

## U. Lagebild und Post (Schritt J8, neu)

Für U1 bis U3 brauchst du den xAI-Schlüssel in den Einstellungen. **Achtung, das kostet echtes Geld bei xAI:**
jedes Lagebild und jede Suche etwa 25 bis 45 Cent. Mit dem Tagesbudget von 1 $ sind es höchstens zwei.
Wenn du das nicht möchtest, lass U1 bis U3 aus. U4 bis U6 kosten nichts.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| U1 | Raum „Intel“ öffnen, auf „Aktualisieren“ klicken und warten | Erst „Grok liest die Nachrichten und X …“ mit laufenden Sekunden, dann das Lagebild: oben die Lage, darunter Meldungen mit Quelle. Oben steht, was es heute gekostet hat. Schreib mir bitte, wie lange es gedauert hat und was es gekostet hat |
| U2 | Unten bei „Deine Themen“ ein Thema eintragen, das es schon gibt (zum Beispiel „bitcoin“) | „„bitcoin“ gibt es schon.“ und kein neues Schildchen |
| U3 | Noch einmal „Aktualisieren“, bis oben mehr als 60 Cent stehen (bei 1 $ Tagesbudget also nach dem zweiten Lagebild) | „Aktualisieren“ und „Suchen“ sind grau, und darüber steht ein Satz, warum: was übrig ist und was nötig wäre |
| U4 | Raum „Post“ öffnen und eine Mail anklicken, die du noch nicht gelesen hast | Der Text der Mail steht da, ohne Signatur. In deinem Mailprogramm ist die Mail danach **weiterhin ungelesen** |
| U5 | Im Raum „Post“ auf „Mit JARVIS durchgehen“ klicken (den Knopf gibt es nur mit neuen wichtigen Mails). Auf die Frage „vorlesen“ antworten, danach „gelesen“ | JARVIS liest die Mail einmal vor. Auf „gelesen“ sagt er „Als gelesen markiert.“ und geht zur nächsten; in deinem Mailprogramm ist genau diese Mail jetzt gelesen |
| U6 | WLAN am Mac ausschalten, im Raum „Post“ auf „Neu laden“ klicken, danach das WLAN wieder einschalten und noch einmal „Neu laden“ | Ohne WLAN: ein Satz wie „Der Mail-Server antwortet nicht. Ist das Internet da?“ und darunter „Was im Postfach liegt, weiß JARVIS gerade nicht.“, **nicht** „Keine wichtigen Mails“. Mit WLAN stehen die Mails wieder da |

## V. „Heute“ und Kleinigkeiten (Schritt J9, neu)

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| V1 | JARVIS beenden, neu starten und sofort den Raum „Heute“ ansehen, an einem Tag mit Terminen | In den ersten Sekunden steht unter „Heute“ höchstens „Der Kalender lädt noch“, nie „Heute steht kein Termin an“. Danach erscheint dein nächster oder laufender Termin. Schreib mir bitte, wie lange das Laden etwa dauert |
| V2 | WLAN am Mac ausschalten, die Seite neu laden (⌘R), „Heute“ ansehen und „Briefing“ eintippen. Danach WLAN wieder an und noch einmal neu laden | Ohne WLAN: Oben in „Heute“ steht kein Wetter, und das Briefing nennt keines (vorher: erfundene 11 Grad). Mit WLAN steht das echte Wetter wieder da |
| V3 | Noch ohne WLAN: Raum „Post“, „Neu laden“, dann zurück zu „Heute“ | In „Heute“ steht bei Post „Das Postfach antwortet nicht.“, und der Satz unter dem Termin endet mit „…, das Postfach antwortet nicht.“ Es stehen keine Mails von vorhin da |
| V4 | Während ein Termin läuft, den Raum „Kalender“ öffnen | Oben bei „Auf einen Blick“ steht „Läuft seit“ mit der Uhrzeit des Beginns, nicht „Als Nächstes“ |
| V5 | Raum „Post“: die mittlere Zahl mit deinem Mailprogramm vergleichen | „Ungelesen im ganzen Posteingang“ ist dieselbe Zahl, die dein Mailprogramm am Posteingang zeigt |
| V6 | Eine Frage eintippen und zweimal sehr schnell hintereinander die Eingabetaste drücken; danach zwei verschiedene kurze Fragen so schnell wie möglich nacheinander abschicken | Die doppelte Frage steht einmal im Gespräch und wird einmal beantwortet. Von den zwei verschiedenen wird die letzte beantwortet (wenn du schneller warst als etwa eine Drittelsekunde; sonst bricht die zweite die erste ab) |
| V7 | Kurz nacheinander abschicken: „Notiere Testeintrag“ und gleich danach eine längere Frage (zum Beispiel „Was weißt du über den Watzmann und seine Geschichte“) | „Notiert: Testeintrag.“ steht im Gespräch, wird aber nicht gesprochen. „Denke nach …“ bleibt stehen, bis die Antwort auf die Frage kommt, und die Antwort wird ganz gesprochen. Den Testeintrag danach im Raum Aufgaben wieder löschen |
| V8 | Nur wenn du magst: Systemeinstellungen → Datenschutz & Sicherheit → Kalender, dort dem Terminal den Zugriff nehmen; JARVIS neu starten und „Heute“ ansehen. Danach den Zugriff wieder geben | Unter „Heute“ und an der Scheibe „Termine heute“ steht „JARVIS darf den Kalender nicht lesen“, nicht „kein Termin“. Nach dem Zurückgeben stehen die Termine wieder da |
| V9 | Wenn ein Kurs im Minus steht: „Marktübersicht“ sagen oder eintippen, mit eingeschalteter Stimme | Die Stimme sagt „minus“ vor der Zahl. Schreib mir bitte, falls sie es doppelt sagt oder weglässt |

## W. Ohne Maus und im schmalen Fenster (Schritt J10, neu)

In Safari markiert die Tab-Taste ab Werk nur Felder. Für diesen Teil entweder Chrome nehmen oder einmal
einschalten: Systemeinstellungen → Tastatur → „Tastaturnavigation“.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| W1 | Raum „Aufgaben“ (mit mehr Aufgaben, als auf den Bildschirm passen): die Maus weglegen und mit der Tab-Taste durch die ganze Seite gehen | Was markiert ist, hat einen blaugrünen Rand und ist immer zu sehen; nichts verschwindet hinter der Leiste unten. Am Ende kommst du zu den Räumen und ins Feld für JARVIS; beim Feld steht der Rand um den ganzen dunklen Rahmen (ein Rand, nicht zwei ineinander) |
| W2 | Raum „Agenten“: mit der Tab-Taste auf „Feste Grenzen“ gehen und die Leertaste drücken | Die Grenzen klappen auf. Das Mikrofon geht dabei nicht an |
| W3 | Mit der Tab-Taste auf „Mehr“ in der Leiste, Eingabetaste, dann Pfeil nach unten und nach oben, dann Escape | Das Menü geht auf, die Pfeile wandern durch die Räume, Escape schließt es, und „Mehr“ ist wieder markiert |
| W4 | Das Fenster von JARVIS so schmal ziehen, wie es geht, und einen Satz tippen | Im Feld ist Platz zum Tippen, kein Raum lässt sich seitlich verschieben. Der Name „JARVIS“ fehlt dann in der Leiste; alle Räume stehen unter „Räume“ |
| W5 | Im schmalen Fenster die Zeile über der Leiste mit der Tab-Taste ansteuern, Eingabetaste, dann Escape | Das Gespräch klappt auf und heißt „Gespräch“ (nicht „G“); Escape klappt es wieder zu |
| W6 | Raum „Heute“ in voller Breite ansehen, am besten an einem Tag mit mehreren Terminen | An den drei Scheiben rechts ist kein Name abgeschnitten. Bei den Terminen steht die Uhrzeit vorn, der Name läuft dahinter weiter und unter ihr durch. Sind es so viele, dass die Scheibe nicht reicht, lässt sie sich rollen; nichts ragt unter den Boden. Schreib mir bitte, wenn dir das so nicht gefällt |
| W7 | Das Gespräch aufklappen, JARVIS etwas Längeres fragen und Escape drücken, während er antwortet oder spricht; danach noch einmal Escape | Das erste Escape unterbricht JARVIS, das Gespräch bleibt offen. Das zweite klappt es zu |
| W8 | Nur wenn es sich ergibt: JARVIS starten, während das WLAN noch nicht da ist oder der Mac gerade aufwacht, und „Heute“ ansehen | Steht irgendwo „… lässt sich gerade nicht laden“, verschwindet das nach einigen Sekunden von selbst, ohne Neuladen |

## X. Mit VoiceOver, und kleine Klickflächen (Schritt J11, neu)

VoiceOver ist das Vorleseprogramm des Macs. Einschalten und ausschalten: Befehlstaste + F5 (an manchen
Tastaturen dazu die Taste fn). Du musst es nicht kennen: einschalten, die Schritte machen, ausschalten. In der
Sandbox lief kein Vorleseprogramm mit; dieser Teil ist deshalb der einzige echte Beleg. Am Mac spricht JARVIS
jede Antwort selbst; VoiceOver liest eine Antwort nur vor, wenn JARVIS stumm bleibt (einen Schalter „JARVIS ohne
Stimme“ gibt es bisher nicht; sag mir, wenn du einen möchtest).

| Nr. | Was du tust | Was du hören oder sehen solltest |
|---|---|---|
| X1 | VoiceOver einschalten, JARVIS öffnen, mit der Tab-Taste in das Feld für JARVIS gehen, „Meine Termine“ tippen, Eingabetaste | JARVIS spricht die Antwort mit seiner eigenen Stimme. VoiceOver sagt sie **nicht** zusätzlich an. Reden zwei Stimmen durcheinander, schreib es mir bitte |
| X2 | Mit der Tab-Taste auf die Zeile über der Leiste gehen (dort steht, was JARVIS zuletzt gesagt hat) | VoiceOver liest, was in der Zeile steht, und am Ende „Ganzes Gespräch zeigen“, und das nur einmal |
| X3 | Eingabetaste auf dieser Zeile, dann mit der Tab-Taste immer weiter, bis die Markierung oben auf der Seite ankommt | Das Gespräch klappt auf. Sobald die Markierung auf der Seite ist, klappt es von selbst zu; was markiert ist, ist zu sehen |
| X4 | Das Gespräch mit der Maus aufklappen und danach mit der Maus in ein Feld der Seite klicken (etwa „Neue Aufgabe“) und tippen | Das Gespräch bleibt offen |
| X5 | Raum „Kalender“: einen Termin für morgen eintragen | VoiceOver sagt „Eingetragen im Kalender …“ an, ohne dass du dorthin gehst. Sagt es nichts, schreib es mir bitte (das ist die Stelle, an der VoiceOver in Safari bekannt eigen ist) |
| X6 | VoiceOver-Taste + U (die VoiceOver-Tasten sind ctrl + alt), mit Pfeil links oder rechts zur Liste der Bereiche („Landmarken“) | In der Liste stehen „Auf einen Blick“ (die Scheiben rechts), „Leiste“ und „Räume“ |
| X7 | VoiceOver ausschalten. Raum „Aufgaben“: eine Aufgabe mit der Maus abhaken; Raum „Agenten“: „öffnen ›“ und „Feste Grenzen“ anklicken | Der Haken ist etwas größer als früher, alles lässt sich leichter treffen. Sieht irgendwo etwas verrutscht aus, schreib es mir bitte |
| X8 | Im Feld für JARVIS „Meine Termine“ tippen, Eingabetaste. Sobald JARVIS antwortet und in den Raum Kalender wechselt, sofort weitertippen: „Wie wird das Wetter“, Eingabetaste | Im Feld fehlt kein Buchstabe, und die zweite Frage wird abgeschickt (früher ging in diesem Augenblick manchmal ein Buchstabe verloren, oder die Eingabetaste machte nur eine neue Zeile) |

## Y. Wenn JARVIS etwas nicht laden kann (Schritte J12 bis J15, neu)

Die Räume sagen jetzt, wenn sich etwas nicht laden lässt („Die Aufgaben lassen sich gerade nicht laden.“), statt für
immer „Lade …“ zu zeigen oder eine Null. Von Hand lässt sich das am Mac kaum herbeiführen; in der Sandbox ist es
nachgestellt. Für dich bleiben zwei kurze Blicke.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| Y1 | JARVIS starten und nacheinander die Räume Aufgaben, Post, Kalender, Trading und Agenten öffnen | Alles sieht aus wie vorher. Für einen Augenblick kann „… lädt noch.“ dastehen; danach steht der Inhalt da |
| Y2 | Nur falls es dir begegnet: In einem Raum steht „… lässt sich gerade nicht laden.“ | Nach ein paar Sekunden bis einer Minute sollte der Inhalt von selbst kommen. Bleibt der Satz stehen, schreib mir bitte, in welchem Raum und was du vorher getan hast |
| Y3 | Nur falls es dir begegnet: In einem Raum steht länger als eine Minute „… lädt noch.“ | Das sollte es seit Schritt J13 nicht mehr geben: Nach höchstens einer Minute ohne Antwort steht dort „… lässt sich gerade nicht laden.“. Bleibt „lädt noch“ länger stehen, schreib mir bitte, in welchem Raum |
| Y4 | JARVIS läuft, der Raum Aufgaben ist offen. Jetzt JARVIS beenden (so wie sonst auch), die Seite im Browser offen lassen und etwa 20 Sekunden warten | Oben in der Mitte erscheint ein heller Streifen: „JARVIS antwortet seit … Uhr nicht. Du siehst den Stand von davor, und Änderungen kommen gerade nicht an.“ Die Uhrzeit stimmt etwa mit dem Beenden überein. Deine Aufgaben stehen weiter da |
| Y5 | Solange JARVIS aus ist: eine Aufgabe abhaken, und unten im Feld eine Frage tippen und abschicken | Beide Male steht da: „JARVIS antwortet gerade nicht. Versuch es gleich noch einmal.“ Steht irgendwo „Failed to fetch“ oder „Load failed“, schreib mir bitte, wo |
| Y6 | JARVIS wieder starten, die Seite **nicht** neu laden | Nach höchstens einer halben Minute verschwindet der Streifen von selbst, und das Abhaken geht wieder |
| Y7 | Nur falls es dir begegnet: Der Streifen erscheint, obwohl JARVIS läuft (etwa kurz nach dem Aufklappen des Mac) | Das sollte nicht vorkommen. Schreib mir bitte, was du vorher getan hast und wie lange er stand |
| Y8 | Nur falls es dir begegnet: Irgendwo steht „Das dauert gerade zu lange. Versuch es gleich noch einmal.“ (etwa nach „Kalender neu laden“ oder wenn JARVIS eine Mail öffnen soll) | Beim zweiten Versuch sollte es gehen. Kommt der Satz öfter, schreib mir bitte, wobei; dann ist die Wartezeit für deinen Mac zu knapp |

## Z. Die Zeile über der Leiste, wenn das Mikrofon gesperrt ist (Schritt J13, neu)

Darf JARVIS das Mikrofon nicht benutzen, stand in der Zeile über der Leiste bisher für immer die Meldung dazu, und
wer tippte, sah die Antwort nur im aufgeklappten Gespräch. Jetzt steht die Meldung dort nur, bis das Gespräch
weitergeht. Zum Ausprobieren sperrst du das Mikrofon für einen Augenblick selbst: in Chrome links in der
Adresszeile auf das Symbol klicken und das Mikrofon ausschalten (in Safari: Menü Safari, Einstellungen für diese
Website, Mikrofon „Ablehnen“). Danach bitte wieder erlauben (Z4).

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| Z1 | Mikrofon für JARVIS sperren, die Seite neu laden, einmal irgendwo auf die Seite klicken | In der Zeile über der Leiste steht rot „Ich darf das Mikrofon nicht benutzen. …“ |
| Z2 | „Meine Termine“ tippen, Eingabetaste. Danach ein paar Buchstaben ins Feld tippen, ohne abzuschicken | In der Zeile steht die Antwort, nicht mehr die Meldung. Klein darüber steht „· Hinweis im Gespräch“. Beim Weitertippen bleibt die Antwort stehen. Kommt die rote Meldung zurück, schreib es mir bitte |
| Z3 | Auf die Zeile klicken, dann das Gespräch wieder zuklappen | Im aufgeklappten Gespräch steht unten die rote Meldung zum Mikrofon. Nach dem Zuklappen steht in der Zeile wieder die Antwort |
| Z4 | Das Mikrofon wieder erlauben, die Seite neu laden | Alles wie vorher: keine rote Meldung, kein „Hinweis im Gespräch“, JARVIS hört wieder zu |
| Z5 | Vor Z4, solange das Mikrofon noch gesperrt ist: ins leere Eingabefeld sehen; dann das Gespräch aufklappen und „Neues Gespräch“ wählen (Schritt J18, neu) | Im Feld steht „Schreib hier, was du brauchst“, nicht „Sag „Jarvis“ oder tippe“. Im leeren Gespräch steht „Schreib mir unten. …“, keine Aufforderung zu sprechen. Nach Z4 steht im Feld wieder „Sag „Jarvis“ oder tippe“ |

## AA. Zuhören mit dem echten Mikrofon (Schritt J17, neu)

Wie JARVIS zuhört, ist in der Sandbox nur mit einem nachgebauten Mikrofon geprüft. Ob dein Mikrofon „Jarvis“
versteht und wie viel es von seiner eigenen Stimme aufschnappt, zeigt sich nur bei dir. Freihändig muss an sein
(im aufgeklappten Gespräch steht „Hört auf „Jarvis““). Mit Kopfhörern ist es am einfachsten; bitte einmal auch
mit den Lautsprechern des Mac.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| AA1 | „Jarvis“ sagen, kurz warten, dann „Meine Aufgaben“ | Nach „Jarvis“ kommt ein kurzer Doppelton, und unten steht „Ich höre zu …“. Danach antwortet er |
| AA2 | Nach seiner Antwort, ohne „Jarvis“: „Wie ist das Wetter?“ | Er antwortet. Nach jeder Antwort auf einen gesprochenen Satz hört er etwa acht Sekunden weiter zu |
| AA3 | Nach einer Antwort: „Okay, danke“ oder „Danke, Jarvis“ | Er hört auf zuzuhören (unten steht wieder „Sag „Jarvis““) und antwortet nicht darauf |
| AA4 | „Jarvis, Jarvis, Briefing“ (zweimal sein Name) | Er beginnt das Briefing. Im Gespräch steht „Briefing“, nicht „Jarvis, Briefing“ |
| AA5 | Während er das Briefing spricht: „Stopp bitte“ | Er verstummt sofort und hört danach nicht von selbst zu |
| AA6 | Mit KI-Gehirn: per Stimme etwas fragen, wofür er im Web nachsehen muss. Solange „Denke nach …“ dasteht: „Jarvis, stopp“ | Das Nachdenken hört auf, es kommt keine Antwort mehr. Bisher kam sie trotzdem |
| AA7 | Mit den Lautsprechern des Mac (ohne Kopfhörer): ihn etwas Längeres sagen lassen und nichts sagen | Er spricht zu Ende, ohne sich selbst zu unterbrechen, und nimmt seinen eigenen Satz danach nicht als neue Frage. Tut er es doch, schreib mir bitte, was er gerade gesagt hat |
| AA8 | Nur falls es dir begegnet: Unten steht dauerhaft „Ich höre zu …“, obwohl du nichts gesagt hast | Das sollte nicht mehr vorkommen. Schreib mir bitte, was du vorher getan hast |

## AB. Programme und Ordner am Mac öffnen (Schritt H2.1, neu)

JARVIS öffnet auf Zuruf Programme und Ordner aus einer festen Liste (Einstellungen → Programme). In der Sandbox
ist das nur gegen einen nachgebauten Mac geprüft: Ob die Programme bei dir wirklich aufgehen, sehe ich von hier
nicht. JARVIS öffnet nur. Er bedient nichts und schließt nichts.

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| AB1 | Sagen oder tippen: „Öffne Safari“ | JARVIS antwortet „Ich öffne Safari.“, und Safari kommt nach vorn |
| AB2 | „Starte Excel“, danach „Mach den Finder auf“ und „Öffne den Rechner“ | Alle drei gehen auf. Geht eines nicht, schreib mir bitte, welches und was JARVIS dazu sagt |
| AB3 | „Zeig mir den Ordner Downloads“, danach „Öffne den Ordner Dokumente“ | Der Finder zeigt den jeweiligen Ordner. Fragt macOS, ob JARVIS (oder das Terminal) auf den Ordner zugreifen darf, notier es bitte |
| AB4 | „Öffne die Systemeinstellungen“, danach „Öffne die Einstellungen“ | Erst gehen die Systemeinstellungen des Mac auf, dann die Einstellungen von JARVIS |
| AB5 | Einstellungen → Programme: die Liste durchgehen und bei jedem Programm, das du hast, auf „Öffnen“ klicken | Jedes installierte Programm geht auf. **Wichtig für mich:** welche nicht aufgehen, obwohl sie installiert sind (dann stimmt der Name in meiner Liste nicht) |
| AB6 | Ein Programm aus der Liste, das du **nicht** installiert hast (zum Beispiel Spotify oder WhatsApp): „Öffne Spotify“ | JARVIS sagt „Ich konnte Spotify nicht öffnen. Vielleicht ist das Programm auf diesem Mac nicht installiert.“ Es erscheint kein Fenster von macOS, das nach dem Programm sucht |
| AB7 | In den Einstellungen bei „Safari“ den Haken entfernen, dann „Öffne Safari“ | „Safari ist in den Einstellungen unter „Programme“ ausgeschaltet.“, und nichts geht auf. Haken wieder setzen |
| AB8 | Unten ein eigenes Programm eintragen, das du hast (der Name wie im Ordner „Programme“, zum Beispiel „Notion“), dann „Öffne Notion“ | Es steht in der Liste und geht auf. „Entfernen“ nimmt es wieder heraus |
| AB9 | Als eigenes Programm „Mail“ und danach „../Geheim“ eintragen | Beides wird abgelehnt, mit einem Satz, warum. Der Text bleibt im Feld stehen |
| AB10 | Mit KI-Gehirn: „Ich möchte gleich eine Tabelle bauen, mach mir dafür bitte das passende Programm auf“ | Er öffnet Excel, ohne nachzufragen. Unter Sicherheit → Audit-Log steht der Aufruf, ebenso die Punkte von eben („Öffnen: Safari“) |
| AB11 | In Telegram: „Öffne Safari“ | Auf dem Mac geht nichts auf; JARVIS sagt, dass er das nur am Mac kann oder dass er dafür kein Werkzeug hat |
| AB12 | Ins Feld tippen: „Jarvis, öffne Safari“, danach „Hey Jarvis, Wochenbericht“ (Schritt J18, neu) | Safari geht auf und er sagt „Ich öffne Safari.“; danach kommt der Wochenbericht. Beides wie ohne „Jarvis“ davor, kein „Das verstehe ich noch nicht“ |

## AC. Wochenbericht (Schritt G5, neu)

JARVIS fasst die Woche zusammen: was du erledigt hast, was liegt, was die nächsten sieben Tage bringen. Ohne
KI-Modell, nur aus deinen Aufgaben in Obsidian, dem Kalender und dem Projektgedächtnis. In der Sandbox ist das nur
gegen ein nachgebautes Telegram und einen Testordner geprüft. **Als erledigt zählt nur, was in Obsidian mit Datum
abgehakt ist** (so wie JARVIS und das Plugin „Tasks“ es schreiben: `- [x] Angebot verschickt ✅ 2026-11-12`).

| Nr. | Was du tust | Was du sehen solltest |
|---|---|---|
| AC1 | Sagen oder tippen: „Wochenbericht“ | JARVIS antwortet mit „Deine Woche, Benedikt. …“ und nennt, wie viele Aufgaben du erledigt hast und wie viele es in der Vorwoche waren; der Raum „Heute“ geht auf |
| AC2 | „Wie war meine Woche?“ | Dieselbe Antwort |
| AC3 | Stimmt die Zahl der erledigten Aufgaben? In Obsidian nachzählen, was seit Montag abgehakt ist | Die Zahl passt. **Wichtig für mich:** Wenn sie zu klein ist, schau bitte, ob hinter den abgehakten Aufgaben ein Datum steht (✅ und der Tag). Ohne Datum kann JARVIS sie keiner Woche zuordnen |
| AC4 | In Telegram: `/woche` | Eine Nachricht „Deine Woche, Benedikt (… bis …):“ mit den Erledigten beim Namen, dem Überfälligen, den Terminen der nächsten sieben Tage (je Tag eine Zeile) und den Aufgaben, die fällig werden |
| AC5 | Hast du einen Termin über mehrere Tage im Kalender (Urlaub, Messe)? Dann in der Nachricht nachsehen | Er steht einmal da, an seinem ersten Tag, mit „(bis …)“, und zählt als ein Termin |
| AC6 | Einstellungen → Handy: bei „Wochenbericht jeden“ den Haken setzen | Vorgeschlagen sind Freitag und 16:00 Uhr. Unter Agenten → Zeitplan steht „Wochenbericht, freitags um 16:00 Uhr, per Telegram“ mit dem nächsten Termin |
| AC7 | Zum Ausprobieren: Wochentag auf heute stellen und die Uhrzeit auf zwei Minuten nach jetzt, dann warten | Der Bericht kommt von selbst aufs Handy, genau einmal. Im Zeitplan steht der Lauf. Danach Wochentag und Uhrzeit wieder so stellen, wie du sie haben willst |
| AC8 | Ohne den Haken „Projekte beim Namen“: steht in der Nachricht ein Projektname? | Nein, nur Zahlen („Projekte: Eines hat Überfälliges …“). Mit dem Haken stehen offene Projekte beim Namen, ein vertrauliches nie |
| AC9 | Den Haken bei „Wochenbericht jeden“ wieder entfernen, wenn du ihn nicht willst | Im Zeitplan steht „ausgeschaltet“; auf Zuruf und mit `/woche` geht er weiter |

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
