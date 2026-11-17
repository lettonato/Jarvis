# Schritt C1: Projektgedächtnis mit Bestätigung und Korrektur

Stand: 13. November 2026. Zustand: **Testbereit** (Sandbox, nur mit Testdaten).

JARVIS hatte bisher nur ein persönliches Gedächtnis: kurze Sätze über Benedikt. Für D&S braucht es ein
zweites: was in den Projekten gilt. Wer ist verantwortlich, was wurde entschieden, was ist offen, bis wann,
welche Risiken gibt es, was kommt als Nächstes. Dieses Gedächtnis ist jetzt da.

## Die Grundregel

**Nichts gilt als wahr, was ein Mensch am Mac nicht bestätigt hat.**

* JARVIS kann nur **vorschlagen**. Ein Vorschlag liegt im Eingang der Ansicht „Projekte“ und ist bis zur
  Entscheidung kein Wissen: Das KI-Gehirn bekommt ihn nicht einmal zu lesen, nur die Zahl der wartenden
  Vorschläge.
* **Übernehmen, ändern und übernehmen, ablehnen** geht nur am Mac. Per Telegram, per Sprache oder durch die
  KI selbst geht es nicht; es gibt dafür kein Werkzeug.
* **Korrigieren** löscht nichts: Der alte Stand steht mit Zeit und Grund im Verlauf des Eintrags.
* **Zurückziehen** löscht nichts: Der Eintrag verschwindet aus der Akte und aus dem, was JARVIS liest,
  bleibt aber unter „Zurückgezogen“ mit Grund sichtbar.
* Jeder Eintrag trägt **Quelle und Zeitstempel**: von wem (selbst eingetragen oder von JARVIS
  vorgeschlagen), woher (Gespräch, Mail, Termin, Dokument, Web), über welchen Kanal, wann bestätigt.
* Ob ein Vorschlag auf **Text von Dritten** beruht, setzt der Server, nicht das Modell. Solche Vorschläge
  sind in der Ansicht gelb markiert.

## Was gespeichert wird

| Ding | Felder |
|---|---|
| Projekt | Name, Beschreibung, Status (aktiv, pausiert, abgeschlossen), Verantwortliche, Fortschritt in Prozent (nur wenn jemand eine Zahl nennt, JARVIS schätzt nichts), weitere Namen für Termine und Mails, vertraulich ja/nein, Quelle, angelegt, geändert |
| Eintrag | Art (Aufgabe, Entscheidung, Besprechungsnotiz, Risiko, nächster Schritt), Text, zuständig, Frist, Datum, erledigt, Quelle, bestätigt am, Verlauf der Korrekturen, zurückgezogen (wann, warum) |
| Vorschlag | Art (neues Projekt, neuer Eintrag, Korrektur), Inhalt, Quelle, Zustand (offen, übernommen, abgelehnt), entschieden am |

Grenzen gegen Überflutung: höchstens 100 offene Vorschläge, 20 Einträge je Vorschlag des Modells, 200
Projekte, 2000 Einträge je Projekt; Texte werden gekürzt und spitze Klammern entfernt.

## Wie JARVIS es benutzt

| Werkzeug | Klasse | Was es tut |
|---|---|---|
| `projekte_lesen` | A | Übersicht aller Projekte (nur Bestätigtes) |
| `projekt_lesen` | A | Akte eines Projekts mit Quelle und Datum je Eintrag |
| `projekt_vorschlagen` | B | legt Vorschläge in den Eingang; ändert nichts am Wissen |

Die Bestätigung in der Ansicht ist die Freigabe. Deshalb fragt das Gateway bei `projekt_vorschlagen` nicht
zusätzlich nach; jeder Aufruf steht trotzdem im Audit-Log. Im Audit-Log stehen nur Nummern und Arten, nie
Inhalte.

In der Lagezeile jedes Gesprächs steht, wie viele Projekte es gibt und wie viele Vorschläge warten. Namen
stehen dort nur von Projekten, die Benedikt selbst angelegt hat und die nicht vertraulich sind.

Liest JARVIS einen Eintrag, der aus Text von Dritten stammt, gilt das Gespräch ab dann als fremd beeinflusst
(wie nach dem Lesen einer Mail), und das Gateway fragt bei Änderungen nach.

## Vorbereitung vor einer Besprechung

Steht in einem Termin der Name eines Projekts (oder einer seiner weiteren Namen, als ganzes Wort), gehört zur
Erinnerung eine Vorbereitung: letzte Besprechung, die letzten Entscheidungen, offene Aufgaben mit Frist,
Risiken, nächster Schritt, alles mit Datum und nur aus bestätigten Einträgen.

* Am Mac erscheint sie im Gespräch direkt nach der Erinnerung.
* Per Telegram kommt sie nur, wenn es in den Einstellungen eingeschaltet ist. **Voreinstellung: aus**, weil
  damit Projektinhalte über einen Dienst außer Haus gehen.
* Derselbe Schalter („Projekte beim Namen“) gilt seit Schritt G1 für das Morgenbriefing und den Tagesabschluss
  über Telegram: Ohne ihn stehen dort nur Zahlen („2 Projekte brauchen dich“), mit ihm Namen und der Anlass.
* Der Titel des Termins wird nur im Programm verglichen und nie als Anweisung gelesen.

## Vertrauliche Projekte

Ein Projekt lässt sich als vertraulich markieren. Dann gilt:

* Das KI-Gehirn erfährt nur, wie viele vertrauliche Projekte es gibt. Name, Beschreibung und Inhalt gehen
  nicht an Anthropic. Nennt Benedikt den Namen selbst im Gespräch, steht er natürlich in seiner Frage.
* Per Telegram geht nichts daraus hinaus, auch nicht in der Vorbereitung.
* Sichtbar und bearbeitbar ist es nur in der Ansicht „Projekte“ am Mac.

## Wichtig: wohin die Daten gehen

* Die Datei liegt auf dem Mac: `~/.jarvis/projekte.json`, nur für den eigenen Benutzer lesbar.
* **Fragt man JARVIS nach einem Projekt, liest das KI-Gehirn die Akte, und ihr Inhalt geht an Anthropic.**
  Das ist dieselbe Lage wie bei Mails und Terminen (R-14). Solange Auftragsverarbeitung, Aufbewahrung und
  Datenstandort nicht geklärt und von Benedikt freigegeben sind, gehören **keine echten vertraulichen
  Projektdaten** in nicht vertrauliche Projekte. Gebaut und geprüft ist alles nur mit Testdaten.
* Die Datei ist nicht verschlüsselt und wird nicht automatisch gesichert. Time Machine sichert sie mit.

## Zwei Speicher: Datei oder Datenbank

Alles Speichern läuft über eine Schnittstelle (`ProjektSpeicher` in
`src/lib/server/projekte/schnittstelle.ts`). Dahinter steckt heute die Datei auf dem Mac (`speicher.ts`). Seit
Schritt I1 (14. November 2026) gibt es eine zweite Umsetzung mit PostgreSQL (`pg-speicher.ts`); die Abläufe
darüber sind für beide dieselben. Eingeschaltet wird die Datenbank nur mit der Umgebungsvariable
`JARVIS_PROJEKTE_DB`; ohne sie bleibt alles bei der Datei.

| Methode | Datei | PostgreSQL |
|---|---|---|
| `projekte()`, `speichereProjekt()` | Liste in der Datei | Tabelle `projekte` |
| `eintraege(projektId?)`, `speichereEintrag()` | Liste in der Datei | Tabelle `projekt_eintraege` |
| `vorschlaege(zustand?)`, `speichereVorschlag()` | Liste in der Datei | Tabelle `projekt_vorschlaege` |
| `transaktion(arbeit)` | Warteschlange, bei Fehler Stand von vorher | Transaktion unter einer Sperre in der Datenbank, bei Fehler `ROLLBACK` |

Die Tabellen tragen den ganzen Datensatz als JSON und daneben nur die Spalten, nach denen gesucht oder die
geprüft werden (Nummer, Projekt, Zustand, Reihenfolge). Der frühere Entwurf mit einer Spalte je Angabe ist
damit ersetzt: So kann sich die Form eines Eintrags ändern, ohne dass die Datenbank umgebaut werden muss. Die
Tabellen, die Regeln (Verschlüsselung, Kennwort, feste Meldungen, geringste Rechte) und was geprüft ist, stehen
in [09-azure-vorbereitung.md](09-azure-vorbereitung.md). **Geprüft gegen ein PostgreSQL 16 in der Sandbox,
nicht gegen eine Datenbank in Azure.**

Mit mehreren Benutzern kommen später dazu: wer bestätigt hat (heute immer „der Mensch am Mac“), Rechte je
Projekt und Zeilenschutz in der Datenbank.

## Geprüft

`test/module/projekte.test.ts` (40 Tests) und `test/hand/projekte-rauch.ts` (Ansicht im echten Browser, mit `--postgres` auch gegen die Datenbank).

| Was | Wie geprüft |
|---|---|
| Nur ein Mensch am Mac trägt ein, bestätigt, korrigiert | Aufrufe als Telegram und als System werden abgelehnt, nichts ändert sich |
| Ein Vorschlag ist kein Wissen | nach dem Vorschlag gibt es weder Projekt noch Eintrag; das Modell bekommt den Vorschlagstext nicht |
| Bestätigung genau einmal | zweites Übernehmen oder Ablehnen wird abgelehnt |
| Ändern und übernehmen | es gilt die geänderte Fassung |
| Korrektur mit Verlauf, Zurückziehen ohne Löschen | alter Stand, Grund und Zeit bleiben erhalten |
| Herkunft setzt der Server | fremdes Gespräch oder Quelle „Mail“ ergibt das Kennzeichen; das Modell kann sich nicht als Mensch ausgeben |
| Eingang nicht flutbar | bei 100 offenen Vorschlägen ist Schluss |
| Datei: Rechte 0600, Neustart, gleichzeitiges Schreiben, Abbruch mittendrin | 25 gleichzeitige Einträge bleiben erhalten; nach Abbruch steht der Stand von vorher in der Datei |
| Beschädigte Datei | wird gemeldet und nie überschrieben |
| Audit-Log ohne Inhalte | Projektname und Texte kommen im Log nicht vor, die Prüfkette bleibt intakt |
| Vertraulich | Name, Beschreibung, Inhalt und Nummer gehen nicht ans Modell, auch nicht, wenn es den Namen rät; keine Vorbereitung per Telegram |
| Vorbereitung | richtige Einträge mit Datum; per Telegram nur nach Einschalten |
| Ansicht im Browser | Vorschlag übernehmen, geändert übernehmen, ablehnen, korrigieren, zurückziehen; Schnittstelle lehnt Aufrufe ohne eigenen Header und von fremden Seiten ab |

Gegenproben (Schutz entfernt, Tests müssen fehlschlagen, danach wiederhergestellt): Bestätigen durch jeden
(4 Tests schlagen fehl), vertrauliches Projekt lesbar (1), beschädigte Datei wird ersetzt (1), doppeltes
Übernehmen (2), Herkunft nicht vom Server (4), Vorbereitung auch aus vertraulichen Projekten (2).

## Bekannte Grenzen

* Nur in der Sandbox und nur mit Testdaten geprüft. Auf dem Mac offen: Prüfliste Teil E.
* Die Datei ist nicht verschlüsselt; wer als derselbe Benutzer am Mac angemeldet ist, kann sie lesen und
  ändern. Ein manipulationssicherer Speicher kommt erst mit der zentralen Datenbank.
* „Am Mac“ heißt: über die Oberfläche auf diesem Rechner. Eine Anmeldung mit Benutzer und Passwort gibt es
  noch nicht (kommt mit Entra ID).
* Wer einen Vorschlag übernimmt, ohne ihn zu lesen, macht ihn zu Wissen. Dagegen hilft nur die gelbe
  Markierung bei Text von Dritten und dass danach Änderungen nachgefragt werden.
* JARVIS erkennt Projekte in Terminen nur am Namen oder an hinterlegten weiteren Namen.
* Mails werden noch nicht von selbst Projekten zugeordnet; JARVIS schlägt nur vor, wenn im Gespräch darüber
  gesprochen wird. Die Projektüberwachung (überfällige Aufgaben von selbst melden) kommt mit den proaktiven
  Routinen.
