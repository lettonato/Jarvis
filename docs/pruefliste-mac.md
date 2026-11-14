# Prüfliste für deinen Mac

Diese Punkte kann nur ein Mensch am Mac prüfen. Solange sie offen sind, stehen die Schritte in
`ENTWICKLUNG.md` auf „Testbereit“ und nicht auf „Abgeschlossen“. Du brauchst etwa 55 Minuten (Teil N geht erst, wenn eure IT so weit ist; Teil O ist neu).
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
