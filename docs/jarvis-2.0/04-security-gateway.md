# JARVIS 2.0 – Schritt 2: Zentrale Sicherheitsarchitektur

Stand: 8. November 2026. Umgesetzt auf dem Branch `claude/project-thread-200bzy` (PR #18), in der
Cloud-Sandbox geprüft. Auf dem Mac noch nicht geprüft (siehe Prüfliste in ENTWICKLUNG.md).

## Überblick

```
 Modell (Claude)                          Mensch
 ─────────────────                        ──────────────────────────────
 Gehirn  ─┐                               Mac: Einstellungen → Sicherheit
 Browser ─┼─► Security Gateway ─► Werkzeug     (Not-Aus, Sperren, Freigaben, Audit-Log)
 Analyst ─┘      │    │                   Telegram: /notaus, Ja/Nein-Knöpfe
                 │    └─► Freigabe ◄──── Ja/Nein (nur Mensch, genau einmal)
                 ├─► Not-Aus / Agentensperren (sicherheit.json)
                 └─► Audit-Log (audit.jsonl, Prüfkette) ─► Alarm (Telegram/Mac)
```

Alle Teile liegen in `src/lib/server/gateway/`:

| Datei | Aufgabe |
|---|---|
| `richtlinien.ts` | Richtlinientabelle: jedes Werkzeug mit Klasse A–D, Ziel, Datenart, erlaubten Aufrufern, Rollen, Kanälen, Freigabepflicht, „liefert fremde Inhalte“. Was fehlt, wird abgelehnt. |
| `gateway.ts` | `pruefe()` entscheidet, `durchGateway()` führt aus oder legt eine Freigabe an, Alarm bei auffälligen Versuchen. |
| `freigaben.ts` | Freigaben anlegen, Ja/Nein eines Menschen, genau einmal ausführen, Verfall nach 15 Minuten. |
| `zustand.ts` | Zentraler Not-Aus, Sperre je Agent, Strenge für Klasse C (`~/.jarvis/sicherheit.json`). |
| `audit.ts` | Audit-Log mit SHA-256-Kette, Schwärzung von Geheimnissen, Prüfung der Kette. |
| `../aktionen.ts` | Die verändernden Aktionen selbst. Sie laufen direkt (wenn erlaubt) oder nach einer Freigabe, mit demselben Code. |

## Entscheidungsweg im Gateway

1. Werkzeug nicht in der Tabelle → **abgelehnt** (Deny by Default, auch Namen wie `constructor`).
2. Aufrufer, Rolle oder Kanal passen nicht → **abgelehnt** (z. B. Browser-Agent darf kein Gedächtnis,
   Mac-Werkzeuge nicht über Telegram).
3. Not-Aus an oder Agent gesperrt (aufrufender oder ausführender Agent) → **abgelehnt**.
4. Klasse D (auch dynamisch, z. B. `handel_steuern: weiter` nach einem Not-Aus) → **abgelehnt**.
5. Freigabepflicht greift → **Freigabe** wird angelegt, das Modell erfährt nur „wartet auf Freigabe“.
6. Sonst → **ausgeführt**. Jeder Schritt wird protokolliert.

Die Entscheidung hängt nur von Tabelle, Zustand und Herkunft ab, nie vom Text des Modells.

## Klassen

| Klasse | Bedeutung | Werkzeuge heute | Rückfrage |
|---|---|---|---|
| A Lesen | liest nur | aufgaben_lesen, termine_lesen, mails_lesen, mail_oeffnen, handel_status, nachrichten_lesen, dokument_oeffnen, agenten_lesen, edelmetalle_lesen, projekte_lesen, projekt_lesen, ansicht_oeffnen, besprechung_starten, kalender_oeffnen, obsidian_oeffnen, programm_oeffnen (nur ein eingeschalteter Eintrag aus der Liste der Programme und Ordner, nur am Mac), web_search*, web_fetch* | nie |
| B Vorbereiten | intern anlegen, begrenzt im Web | aufgabe_anlegen, notiz_merken, antwort_entwerfen (nur ein Entwurf auf dem Mac; Empfänger und Betreff setzt der Server aus dem Postfach, verschickt wird nichts), projekt_vorschlagen (nur Vorschlag, gilt erst nach Bestätigung am Mac, siehe 07-projektgedaechtnis.md), handel_steuern (pause, notaus), alle Browser-Aktionen, dokument_abgeben | nie |
| B mit Außenwirkung/Kosten | | browser_auftrag, dokument_erstellen, nachrichten_suchen | sobald fremde Inhalte im Gespräch sind |
| C Verändern | ändert Daten oder Zustände | aufgabe_erledigen, aufgabe_verschieben, mail_gelesen, termin_eintragen | standardmäßig immer; einstellbar auf „nur nach fremden Inhalten“ |
| C, immer | | gedaechtnis_merken/aendern/vergessen, handel_steuern (start, weiter) | immer |
| D Kritisch | für die KI gesperrt | handel_steuern weiter nach Not-Aus; Not-Aus lösen, Agent entsperren, Freigaben erteilen (gibt es als Werkzeug nicht) | – |

\* laufen bei Anthropic; JARVIS kann sie nicht einzeln anhalten, protokolliert sie aber, und danach gilt das
Gespräch als „fremd“.

## Herkunft (Schutz vor Prompt Injection)

Sobald im Gespräch Text von Dritten gelesen wurde (Mail, Termin, Webseite, Grok, Browser-Ergebnis, auch
nach einem Fehler beim Lesen), gilt es als **fremd**. Danach brauchen Klasse-C-Werkzeuge und Werkzeuge mit
Außenwirkung oder Kosten eine Freigabe. Ein Text in einer Mail kann also keinen Browser-Auftrag, kein
Dokument und keine Änderung mehr auslösen, ohne dass Benedikt es sieht und bestätigt.

Dazu: Der Kontext nennt keine Termintitel mehr (Einladungen kommen von Dritten), die Freigabe-Frage zeigt
die echten Eingabewerte, und fremde Inhalte bekommen nie eigene Rechte.

## Freigaben

* Die Frage erscheint am Mac oben in jeder Ansicht und in Telegram mit „Ja, ausführen“ und „Nein“.
* Nur ein Mensch entscheidet (`mac` oder `telegram`, nie `system`); die KI hat kein Werkzeug dafür.
* Ausgeführt wird **genau einmal**: Die Entscheidung läuft unter einer Sperre; ein zweites Ja (auch
  gleichzeitig von Mac und Telegram) wird abgelehnt.
* Vor dem Ausführen prüft das Gateway noch einmal Not-Aus, Sperren und Klasse D.
* Ohne Antwort verfällt die Frage nach 15 Minuten; beim Not-Aus werden alle offenen Fragen geschlossen.
* Telegram-Knöpfe nutzen das Präfix `fg:` und zählen nur aus dem gekoppelten Chat.

## Zentraler Not-Aus und Agentensperren

* Einschalten: Knopf am Mac (Einstellungen → Sicherheit) oder `/notaus` in Telegram.
* Wirkung: Gespräch (Claude wird gar nicht mehr gefragt), Browser-Agent (laufender Auftrag bricht ab),
  Analyst (laufendes Dokument bricht ab), Intel (auch automatisches Lesen), Spielgeld-Desk (Not-Aus, kein
  Takt, kein Start/Weiter). Offene Freigaben werden geschlossen. Benedikt bekommt eine Meldung.
* Lösen: **nur am Mac**, durch Eintippen von `FREIGEBEN`. Telegram, das System und die KI können es nicht;
  ein Test stellt sicher, dass `notausAus` nur von der Schnittstelle `/api/sicherheit` aufgerufen wird.
* Der Desk bleibt nach dem Lösen angehalten, bis Benedikt ihn auf dem Trading-Desk fortsetzt.
* Jeder Agent lässt sich einzeln sperren; entsperren ebenfalls nur am Mac.
* Ist `sicherheit.json` beschädigt, startet JARVIS mit eingeschaltetem Not-Aus.

## Audit-Log

* `~/.jarvis/audit.jsonl`, nur angehängt. Jede Zeile: Nummer, Zeit, Art, Agent, Kanal, Werkzeug, Klasse,
  Ergebnis, Grund, gekürzte Eingabe, Prüfsumme der vorigen Zeile, eigene Prüfsumme.
* Protokolliert: jede Gateway-Entscheidung, jede Ausführung und jeder Fehler, Websuche/Webseiten bei
  Anthropic, Freigaben (angefragt, Ja, Nein, verfallen, ausgeführt, gesperrt), Not-Aus an/aus, Sperren,
  Strenge-Einstellung, Desk-Steuerung am Mac, Einstellungsänderungen (nur welche, nie Werte), Alarme.
* Geschwärzt: Werte unter Schlüsseln wie key, token, passwort, iban, pin, tan, cvc; Anthropic-, xAI- und
  Telegram-Schlüssel und IBANs auch im Fließtext. Texte auf 300 Zeichen gekürzt; Mailtexte stehen nie im Log.
* Prüfung: lückenlose Nummern, Kette und Prüfsummen. Änderung oder Löschung einer Zeile fällt auf
  (Anzeige in den Einstellungen).
* Alarm per Telegram/Mac bei abgelehnten Aufrufen, die das Modell nicht versuchen sollte (unbekannt,
  falscher Aufrufer/Kanal, Klasse D) und bei fünf oder mehr Ablehnungen in zehn Minuten; höchstens einmal je
  Grund in zehn Minuten.

## Erweiterbarkeit

Ein neues Werkzeug (Microsoft Graph, Azure, Projektgedächtnis, anderes Modell) braucht:
1. eine Zeile in `RICHTLINIEN` (sonst läuft es nicht, und der Test „jedes Werkzeug steht in der Tabelle“
   schlägt fehl),
2. bei Freigabepflicht eine Aktion in `AKTIONEN` (sonst schlägt der Test „hat eine ausführbare Aktion“ fehl),
3. den Aufruf über `durchGateway()`.

Rollen (`rollen`) sind vorbereitet; heute gibt es nur `geschaeftsfuehrung`. Mit Entra ID (Phase 5) kommt die
Identität des Nutzers in den Aufruf.

## Verbleibende Risiken

| Risiko | Einordnung | Wie weiter |
|---|---|---|
| Chrome löst Namen selbst auf: DNS-Rebinding innerhalb von Chrome theoretisch möglich (JARVIS prüft jede Anfrage, Chrome kann danach anders auflösen) | Mittel | **behoben in [Schritt 2.6](06-netzschleuse-und-herkunft.md)** (Netzschleuse) |
| Audit-Log und `sicherheit.json` liegen auf dem Mac; wer dort Zugriff hat, kann sie ab einer Stelle neu schreiben | Mittel | unveränderliche Ablage in Azure (Phase 3) |
| Websuche und Webseiten laufen bei Anthropic; JARVIS kann sie nur protokollieren, nicht einzeln sperren | Niedrig | `web_fetch` öffnet keine Links aus Mails (seit Schritt 1) |
| Der Gesprächsverlauf gilt nicht als fremd; eine frühere Zusammenfassung einer Mail könnte im nächsten Satz nachwirken | Niedrig bis Mittel | **behoben in [Schritt 2.6](06-netzschleuse-und-herkunft.md)** (Herkunft je Antwort im Verlauf) |
| Freigaben über Telegram: wer den Telegram-Account übernimmt, kann Ja drücken (aber keinen Not-Aus lösen) | Mittel | Firmendaten nicht über Telegram (Phase 5/7), Entra ID mit MFA |
| Zugangsdaten im Klartext in `~/.jarvis/config.json` (R-07) | Hoch | Schlüsselbund gebaut in [Schritt 2.3](05-zugangsdaten.md) (Umzug am Mac offen), Key Vault in Phase 3 |
| Keine Anmeldung, nur ein Nutzer und localhost | Mittel | Entra ID (Phase 5) |
| Interne Desk-Agenten (Chief) sind keine Werkzeugaufrufe; sie werden über Not-Aus/Sperre angehalten, nicht einzeln geprüft | Niedrig (Spielgeld) | bleibt so, Echtgeld ist ausgeschlossen |

## Was sich für Benedikt im Alltag ändert

* Änderungen (Aufgabe abhaken/verschieben, Mail als gelesen, Termin eintragen) brauchen ein Ja per Knopf.
  Wer das nur nach fremden Inhalten möchte, stellt es in den Einstellungen unter Sicherheit um.
* JARVIS merkt sich nichts mehr ohne Bestätigung.
* Browser-Aufträge, Dokumente und Grok-Suchen fragen nach, wenn vorher im Gespräch Mails, Termine oder
  Webseiten gelesen wurden.
* `/notaus` in Telegram hält jetzt alles an, nicht nur den Desk. Lösen nur am Mac.
