# Azure: was vorbereitet ist, und was vorher zu entscheiden ist (Schritt I1)

Stand 14. November 2026. **In Azure ist nichts angelegt und nichts gebucht, es sind keine Kosten entstanden,
und JARVIS hat keinen Zugang zu einem Azure-Konto.** Dieser Schritt hat nur im Programm vorbereitet, was sich
ohne Azure vorbereiten und prüfen lässt, und hier aufgeschrieben, was vor einem Umzug zu klären ist.

## In Kürze

* JARVIS läuft heute auf einem Mac und antwortet nur diesem Mac. Daran ändert dieser Schritt nichts.
* **Vorbereitet und geprüft:** Das Projektgedächtnis kann statt in einer Datei in einer PostgreSQL-Datenbank
  liegen. Geprüft gegen ein echtes PostgreSQL 16 hier in der Sandbox, nicht gegen eine Datenbank in Azure.
* **Vorbereitet:** Die Verbindung zu Claude wird an genau einer Stelle aufgebaut. Ein anderer Zugang (Claude
  über Microsoft Foundry in eurem Azure) wäre dort einzubauen; gebaut ist er nicht.
* **Nicht gebaut:** Anmeldung für mehrere Personen, Betrieb als Container, Geheimnisse im Key Vault, das
  unveränderliche Audit-Log, alle anderen Daten in der Datenbank.

**Meine ehrliche Einschätzung:** Solange nur du JARVIS an deinem Mac benutzt, bringt dir Azure wenig. Vieles,
was JARVIS kann, hängt am Mac (siehe unten). Sinnvoll wird der Umzug, wenn mehrere Personen bei D&S JARVIS
nutzen sollen oder wenn er weiterarbeiten soll, während der Mac aus ist.

## Was zentral laufen könnte, und was am Mac bleibt

| Teil | Zentral möglich? | Anmerkung |
|---|---|---|
| Gespräch mit Claude, Projektgedächtnis, Tagesübersicht, Agentenübersicht | ja | braucht vorher eine Anmeldung (siehe unten) |
| Telegram, Zeitplan, Intel, Edelmetalle, Spielgeld-Desk | ja | es darf immer nur ein JARVIS laufen, der Telegram abfragt und den Zeitplan führt; das ist heute so gebaut und ungeprüft für mehrere |
| Outlook-Termine über Microsoft Graph | ja, mit Umbau | heute meldet sich ein Mensch am Mac mit einem Code an; zentral bräuchte es die Anmeldung je Person |
| Mails (IMAP) | technisch ja | die Zugangsdaten zum Postfach lägen dann zentral; das ist eine eigene Entscheidung |
| Kalender des Macs, Erinnerungen, Programme öffnen, Vorlesen mit der Mac-Stimme, Weckwort | nein | das sind Funktionen des Macs; zentral bliebe davon nur, was über Microsoft Graph geht |
| Browser-Agent (eigenes Chrome zum Zusehen), Obsidian-Ordner, Ordner Dokumente/JARVIS | nein | brauchen den Rechner, an dem du sitzt; dafür ist der Desktop-Agent aus Bereich H gedacht |

## Die Bausteine in Azure (Vorschlag für eure IT)

Was in der Spalte „bei Microsoft nachgelesen“ steht, habe ich am 14. November 2026 auf Microsoft Learn
gelesen. Ausprobiert ist davon nichts.

| Baustein | Wofür | Bei Microsoft nachgelesen |
|---|---|---|
| Azure Container Apps | JARVIS als Container, erreichbar nur über HTTPS | Eingebaute Anmeldung: Mit „Restrict access: Require authentication“ wird jede nicht angemeldete Anfrage abgewiesen, bevor sie JARVIS erreicht. Microsoft Entra ID ist als Anbieter vorgesehen. Wer angemeldet ist, steht in den Kopfzeilen `X-MS-CLIENT-PRINCIPAL-NAME` und `X-MS-CLIENT-PRINCIPAL-ID`; von außen lassen sich diese Kopfzeilen nicht setzen. Nur mit HTTPS verwenden (`allowInsecure` aus). **Achtung:** Ohne weitere Einstellung kann sich jedes Konto eures Verzeichnisses anmelden |
| Azure Database for PostgreSQL (Flexible Server) | Projektgedächtnis, später die übrigen Daten | Verbindungen müssen verschlüsselt sein (TLS 1.2 oder 1.3). Anmeldung ohne gespeichertes Kennwort ist möglich: Die Anwendung holt sich über ihre verwaltete Identität ein Token, das als Kennwort gilt (bis zu 24 Stunden gültig). **JARVIS kann heute nur Benutzer und Kennwort** |
| Azure Key Vault | Schlüssel und Kennwörter | Container Apps kann ein Geheimnis aus dem Key Vault beziehen; dafür braucht die Anwendung eine verwaltete Identität mit der Rolle „Key Vault Secrets User“. Das Geheimnis kommt als Umgebungsvariable oder als Datei im Container an. Eine neue Version wird binnen 30 Minuten übernommen |
| Blob Storage mit Unveränderlichkeit | Audit-Log, das niemand nachträglich ändern kann | Mit einer zeitbasierten Aufbewahrungsrichtlinie lassen sich Dateien anlegen und lesen, aber nicht ändern oder löschen; eine gesperrte Richtlinie lässt sich nicht mehr verkürzen. An eine bestehende Datei weiterzuschreiben gelingt unter einer solchen Richtlinie ohne Zusatzeinstellung nicht. Für JARVIS hieße das: ein neuer Abschnitt des Logs je Zeitraum statt einer Datei, die wächst |
| Claude über Microsoft Foundry (wahlweise) | Claude aus eurem Azure-Vertrag statt mit persönlichem Schlüssel | siehe nächster Abschnitt |
| Azure Monitor | Protokolle des Servers, Alarme | nicht nachgelesen |

Für den Anfang reicht eine **Testumgebung**. Eine zweite für den echten Betrieb kommt erst, wenn die Testumgebung
mit erfundenen Daten geprüft ist.

## Claude: direkt bei Anthropic oder über Microsoft Foundry

Heute fragt JARVIS Claude direkt bei Anthropic, mit dem Schlüssel aus deinen Einstellungen (Risiko R-14: Was du
JARVIS fragst, geht über einen persönlichen Schlüssel an Anthropic).

**Bei Microsoft nachgelesen (14.11.2026):** Claude-Modelle gibt es in Microsoft Foundry. Sie werden mit
derselben Programmierschnittstelle angesprochen wie bei Anthropic, unter einer Adresse eurer eigenen
Azure-Ressource, angemeldet über Entra ID oder einen Schlüssel. Voraussetzung ist ein bezahltes
Azure-Abonnement mit Zugang zum Azure Marketplace; Testkonten und Abonnements über einen Zwischenhändler (CSP)
sind ausgeschlossen. Als Bereitstellung nennt die Seite „Global Standard“ für alle Claude-Modelle und für einige
zusätzlich eine Datenzone USA. **Eine Bereitstellung nur in der EU steht auf der gelesenen Seite nicht.** Die
Liste der Regionen und die Seite zum Datenschutz habe ich nicht gelesen. Welche Modelle es genau gibt, steht
auf einer weiteren Seite; die Modelle, die JARVIS heute benutzt (Opus 5.5, Haiku 5.5), habe ich dort **nicht
bestätigt**.

**Aus der Übersicht von Anthropic, welche Funktionen es auf welcher Plattform gibt** (gelesen 14.11.2026): Drei
Dinge, die JARVIS heute benutzt, gibt es über Foundry nicht oder nur eingeschränkt.

1. Lehnt ein Modell eine Anfrage ab, lässt JARVIS Anthropic heute von selbst ein anderes Modell antworten. Das
   gibt es über Foundry nicht; der Wechsel müsste in JARVIS selbst gebaut werden.
2. Die Websuche und das Lesen von Webseiten gibt es bei „gehostet auf Azure“ nur in der älteren Fassung.
   JARVIS benutzt die neuere.
3. Die Abfrage, mit der JARVIS beim Eintragen prüft, ob dein Schlüssel gilt, gibt es dort nicht.

Der Wechsel wäre also kein Schalter, sondern ein eigener Schritt mit Tests. Vorbereitet ist nur, dass er an
einer Stelle stattfindet (`src/lib/server/claude.ts`). Preise in Foundry habe ich nicht nachgelesen.

## Der wichtigste fehlende Baustein: Anmeldung

JARVIS kennt heute keine Benutzer. Der Schutz ist, dass er nur Anfragen annimmt, die an „diesen Rechner“
gerichtet sind (`src/lib/server/guard.ts`). **Unter einer Adresse im Internet beantwortet JARVIS deshalb keine
einzige Datenanfrage, sondern lehnt alle ab.** Das ist Absicht und bleibt so, bis es eine Anmeldung gibt.

Vor einem zentralen Betrieb braucht es:

1. die Anmeldung über Entra ID vor dem Container (siehe oben), beschränkt auf die Konten, die JARVIS nutzen
   sollen, nicht auf das ganze Verzeichnis;
2. in JARVIS die Prüfung, wer angemeldet ist, und Rechte je Person: Heute gilt „der Mensch am Mac bestätigt“.
   Zentral muss feststehen, wer Vorschläge fürs Projektgedächtnis bestätigen darf, wer Freigaben im Gateway
   erteilt und wer den Not-Aus löst;
3. getrennte Daten je Person, wo es um Persönliches geht (Gedächtnis, Mails, Termine).

Nichts davon ist gebaut. Es ist der größte Teil der Arbeit vor einem Umzug.

## Daten: was wohin käme

JARVIS legt seine Daten heute in 19 Dateien und Ordnern unter `~/.jarvis` ab. Ein Container hat keine dauerhafte
Platte: Was dort nur in einer Datei steht, ist nach einem Neustart weg.

| Heute | Zentral | Stand |
|---|---|---|
| `projekte.json` (Projektgedächtnis) | PostgreSQL | **vorbereitet und geprüft** (siehe unten) |
| `gedaechtnis.json` (persönliches Gedächtnis) | PostgreSQL | offen (Aufgabe C2) |
| `config.json` (Einstellungen), Schlüssel im macOS-Schlüsselbund | Einstellungen in die Datenbank, Schlüssel in den Key Vault | offen |
| `audit.jsonl` (Audit-Log mit Prüfkette) | Blob Storage mit Unveränderlichkeit | offen |
| `freigaben.json`, `sicherheit.json` (Gateway, Not-Aus) | PostgreSQL | offen |
| `kosten.json`, `zeitplan.json`, `hinweise.json`, `entwuerfe.json`, `telegram.json`, `stimme.json` | PostgreSQL | offen |
| `intel.json`, `metalle.json`, `spielgeld.json`, `spielgeld-trades.jsonl` | PostgreSQL | offen |
| `dokumente.json` und die PDFs | Datenbank und Blob Storage | offen |
| `browser-profil` | bleibt am Rechner | gehört zum Browser-Agenten |

**Nur das Projektgedächtnis ist umgestellt.** Alle anderen Teile schreiben weiter direkt in Dateien. Ein
Zwischenweg wäre ein eingehängtes Netzlaufwerk im Container; das habe ich nicht nachgelesen und nicht geprüft.

## Das Projektgedächtnis in PostgreSQL

Eingeschaltet wird es mit einer Umgebungsvariable beim Start:

```
JARVIS_PROJEKTE_DB=postgres://benutzer:kennwort@rechner:5432/datenbank
```

Ohne diese Variable bleibt alles, wie es ist: die Datei auf dem Mac. Die Ansicht „Projekte“ nennt unten, wo
das Gedächtnis liegt.

**Feste Regeln:**

1. **Verschlüsselt außerhalb dieses Rechners.** Zu jeder Adresse außer `localhost`, `127.0.0.1` und `::1`
   verbindet sich JARVIS nur verschlüsselt und prüft das Zertifikat. Zusätze in der Adresse (`sslmode=disable`
   und ähnliche) werden nicht gelesen und können das nicht abschalten.
2. **Das Kennwort steht nur in der Umgebung.** Es steht in keiner Meldung, nicht im Protokoll und nicht in der
   Anzeige; die Anzeige nennt nur Datenbank und Rechner. In Azure käme es aus dem Key Vault.
3. **Feste Meldungen.** Meldet die Datenbank einen Fehler, sieht die Seite und das KI-Modell nur den Satz „Die
   Datenbank des Projektgedächtnisses ist nicht erreichbar oder hat einen Fehler gemeldet“ mit einer kurzen
   Kennung. Der Text der Datenbank steht für die Fehlersuche im Protokoll des Servers, höchstens einmal je
   Minute und Kennung.
4. **Kein stilles Ausweichen.** Ist die Datenbank eingestellt, aber nicht erreichbar oder die Adresse
   unbrauchbar, schreibt JARVIS nicht ersatzweise in die Datei. Sonst lägen die Projekte danach an zwei Orten.
5. **Änderungen nacheinander.** Zusammengehörige Schritte laufen in einer Transaktion und unter einer Sperre
   in der Datenbank, auch wenn zwei JARVIS-Prozesse dieselbe Datenbank benutzen. Bestätigt wird weiter genau einmal.
6. **Geringste Rechte.** Legt eure IT die Tabellen an, reicht JARVIS ein Konto, das darin lesen, einfügen,
   ändern und löschen darf. Tabellen anlegen muss es dann nicht dürfen. Fehlen die Tabellen, legt JARVIS sie
   beim ersten Zugriff an, wenn sein Konto das darf.

**Die Tabellen** (so, wie JARVIS sie anlegt; `daten` trägt den ganzen Datensatz):

```sql
create table if not exists projekte (
  lfd bigint generated always as identity,
  id text primary key,
  daten jsonb not null
);
create table if not exists projekt_eintraege (
  lfd bigint generated always as identity,
  id text primary key,
  projekt_id text not null references projekte(id),
  daten jsonb not null
);
create index if not exists projekt_eintraege_projekt on projekt_eintraege (projekt_id);
create table if not exists projekt_vorschlaege (
  lfd bigint generated always as identity,
  id text primary key,
  zustand text not null check (zustand in ('offen', 'uebernommen', 'abgelehnt')),
  daten jsonb not null
);
```

**Umziehen:** Es gibt eine Funktion, die das Projektgedächtnis von der Datei in die Datenbank kopiert
(`kopiereSpeicher`). Sie liest die Datei nur, kopiert nur in eine leere Datenbank und übernimmt nichts, wenn
dort nicht genau dasselbe ankommt. **Sie wird von nichts in JARVIS aufgerufen.** Ein echter Umzug deiner Daten
passiert erst auf deine Ansage.

### Geprüft

Gegen ein eigenes, leeres PostgreSQL 16.15 auf demselben Rechner (`npx tsx test/hand/postgres-rauch.ts`):

* Tabellen entstehen beim ersten Zugriff genau einmal, auch wenn zwei Prozesse gleichzeitig starten.
* Was gespeichert wird, kommt genauso und in derselben Reihenfolge zurück; der Stand übersteht einen Neustart.
* Bricht eine Transaktion ab, ist nichts davon gespeichert. Ein Fehler, den der Aufrufer verschluckt, geht
  nicht als Erfolg durch.
* Zwei Prozesse schreiben gleichzeitig: 40 Einträge und 30 Zählschritte, keiner verloren.
* Hält jemand die Sperre lange, bleibt Lesen möglich; wartende Änderungen kommen danach in ihrer Reihenfolge
  an; nach Ablauf einer Frist gibt eine Änderung mit einer Meldung auf, statt endlos zu hängen (im Betrieb
  20 Sekunden; geprüft mit einer kurzen Frist).
* Ein Konto ohne das Recht, Tabellen anzulegen, reicht.
* Zu einer fremden Adresse kommt ohne Verschlüsselung keine Verbindung zustande, mit einem selbst
  ausgestellten Zertifikat auch nicht, auch nicht mit `sslmode=disable` in der Adresse.
* Fällt die Datenbank aus, kommt die feste Meldung, JARVIS läuft weiter, und wenn sie wieder da ist, geht es
  von selbst weiter.
* Umzug aus der Datei: gleicher Inhalt; ein zweiter Umzug in die gefüllte Datenbank wird verweigert.
* **Alle Tests des Projektgedächtnisses aus `npm test` laufen unverändert auch gegen diese Datenbank** (nur
  ein Mensch am Mac bestätigt, Vorschläge sind kein Wissen, Korrekturverlauf, vertrauliche Projekte,
  Vorbereitung, Briefing).
* Im Browser gegen den gebauten Server mit dieser Datenbank: Vorschlag übernehmen, ändern, ablehnen, Eintrag
  korrigieren und zurückziehen (`test/hand/projekte-rauch.ts --postgres`).

Dabei gefunden und behoben: Riss die Verbindung zur Datenbank mitten in einer Änderung ab, beendete das den
ganzen Server.

### Nicht geprüft

* **Azure Database for PostgreSQL selbst.** Insbesondere, ob JARVIS dem Zertifikat des Azure-Dienstes von Haus
  aus vertraut. Wenn nicht, käme die feste Meldung mit einer Zertifikats-Kennung, und es wäre eine kleine
  Ergänzung nötig.
* Anmeldung an der Datenbank ohne Kennwort (verwaltete Identität). Nicht gebaut.
* Andere Versionen als PostgreSQL 16.15, große Datenmengen, Geschwindigkeit über das Netz.
* Sicherung und Wiederherstellung der Datenbank. Das wäre Sache des Azure-Dienstes und eurer IT.

### Bekannte Grenzen

* Fällt die Datenbank aus, zeigt die Ansicht „Projekte“ die Meldung, und JARVIS sagt im Gespräch, dass er das
  Projektgedächtnis gerade nicht lesen kann. **Die Hinweise am Tag, das Morgenbriefing und die Vorbereitung vor
  Besprechungen lassen die Projekte in dieser Zeit ohne eigene Meldung weg.** Das war bei einer beschädigten
  Datei schon so.
* Ist die Datenbank nicht nur aus, sondern das Netz dorthin verstopft, wartet jede Anfrage bis zu fünf Sekunden,
  bevor die Meldung kommt.
* **Beenden und Neustart (gefunden in Schritt J4, 15. November 2026):** Zentral liefe JARVIS als gebauter Server
  (`next start`). Der hört nach dem Signal zum Beenden zwar auf, neue Verbindungen anzunehmen, wartet dann aber,
  bis alle offenen Verbindungen von selbst enden. Ein offenes Browserfenster fragt weiter ab und hält sie offen:
  In der Sandbox lebte der alte Prozess so über 20 Sekunden weiter und antwortete der offenen Seite mit seinem
  alten Stand, während daneben schon der neue lief. Vermutlich läuft in dieser Zeit auch sein Zeitplan weiter;
  das habe ich nicht geprüft. Für den Betrieb heißt das: Die Plattform muss den alten Container nach einer
  kurzen Frist hart beenden, und es darf nie mehr als eine Instanz zugleich laufen (der Zeitplan und die
  Dateien sind dafür nicht gebaut). Am Mac (`next dev`) schließt Next die Verbindungen beim Beenden selbst.
* Die Sperre lässt immer nur eine Änderung zur Zeit zu. Für ein Projektgedächtnis mit wenigen Nutzern ist das
  richtig; für viele gleichzeitige Schreiber wäre es zu langsam.

## Reihenfolge, wenn ihr es wollt

Jeder Schritt mit einem Stern legt etwas an, das Geld kostet oder Rechte ändert, und passiert nur mit deiner
ausdrücklichen Freigabe und durch eure IT.

1. Entscheiden: Gibt es ein Azure-Abonnement von D&S, wer betreut es, welche Region (EU), welches Budget im
   Monat, wer soll JARVIS nutzen.
2. Entscheiden: Claude weiter direkt bei Anthropic (dann mit Firmenvertrag statt persönlichem Schlüssel) oder
   über Foundry. Dazu gehört die Frage, wo die Daten verarbeitet werden.
3. Anmeldung und Rechte je Person in JARVIS bauen und mit nachgebauter Anmeldung prüfen (kostet nichts).
4. Die übrigen Daten auf Datenbank und Blob Storage umstellen, Geheimnisse auf den Key Vault vorbereiten
   (kostet nichts, geprüft gegen PostgreSQL hier und nachgebaute Dienste).
5. ★ Testumgebung in Azure anlegen (Container Apps, PostgreSQL, Key Vault, Speicher, Anmeldung über Entra ID).
6. JARVIS dort mit erfundenen Daten prüfen, auch: Wer nicht angemeldet ist, sieht nichts.
7. ★ Umgebung für den echten Betrieb anlegen, ★ Daten umziehen, Mac-Betrieb parallel weiterlaufen lassen, bis
   alles stimmt.

## Kosten

Zahlen nenne ich nicht, weil ich keine Preise nachgelesen habe und sie von Region und Größe abhängen. Laufend
Geld kosten würden: die Datenbank (läuft durchgehend, auch in der kleinsten Größe), der Container (nach
Verbrauch), der Speicher und die Protokolle (nach Menge), der Key Vault (je Zugriff, wenig) und, falls gewählt,
Claude über Foundry (je Anfrage, wie heute bei Anthropic). Eure IT kann das mit dem Preisrechner von Microsoft
durchrechnen: <https://azure.microsoft.com/pricing/calculator/>.

## Quellen

Microsoft Learn, gelesen am 14. November 2026 (jeweils unter `learn.microsoft.com/en-us/azure/`):

* `container-apps/authentication` (Anmeldung vor dem Container)
* `container-apps/manage-secrets` (Geheimnisse aus dem Key Vault)
* `postgresql/security/security-entra-concepts` (Anmeldung an der Datenbank über Entra ID)
* `postgresql/security/security-tls` (Verschlüsselung der Verbindung zur Datenbank)
* `storage/blobs/immutable-storage-overview` (unveränderlicher Speicher)
* `foundry/foundry-models/how-to/use-foundry-models-claude` (Claude in Microsoft Foundry)

Dazu die Plattformübersicht aus der Entwicklerdokumentation von Anthropic (welche Funktion es auf welcher
Plattform gibt), gelesen am selben Tag.
