# Schritt 2.3 – Zugangsdaten im macOS-Schlüsselbund (R-07)

Stand: 13. November 2026 · Zustand: **Testbereit** (in der Sandbox mit nachgebautem Schlüsselbund geprüft,
auf dem Mac noch nicht)

## Worum es geht

Bisher standen fünf Geheimnisse im Klartext in `~/.jarvis/config.json` (Rechte 0600): der Claude-Schlüssel,
der xAI-Schlüssel, der Twelve-Data-Schlüssel, das Mail-Passwort und der Telegram-Bot-Schlüssel. Wer die
Datei bekommt (Backup, Kopie, Synchronisierung, versehentliches Teilen), hat alle Zugänge.

Der Schlüsselbund schützt vor genau diesem Weg: Er ist verschlüsselt und nur bei angemeldetem, entsperrtem
Benutzer lesbar. Er schützt **nicht** vor einem Schadprogramm, das schon als Benedikts Benutzer läuft (siehe
„Verbleibende Risiken“).

Mit Schritt 2.3 können diese fünf Werte in den macOS-Schlüsselbund umziehen. In der Datei steht danach
statt des Werts nur die Marke `@schluesselbund`. Alles andere in der Datei bleibt, wie es ist.

## Wie es funktioniert

| Teil | Datei | Was er tut |
|---|---|---|
| Schlüsselbund-Zugriff | `src/lib/server/schluesselbund.ts` | ruft das Bordwerkzeug `/usr/bin/security` auf, Dienst „JARVIS“, je Geheimnis ein Eintrag (z. B. `claude.apiKey`) |
| Einstellungen | `src/lib/server/config.ts` | `GEHEIMNISSE` listet die Werte (seit Schritt D1 auch die Anmeldung bei Microsoft 365, `microsoft.refreshToken`); `readConfig` setzt sie aus dem Schlüsselbund ein, `writeConfig` legt neue oder geänderte Werte dort ab |
| Umzug und Rückweg | `src/lib/server/zugangsdaten.ts` | `inSchluesselbund`, `zurueckInDatei`, `zugangsdatenStatus` |
| Bedienung | Einstellungen → Sicherheit → „Zugangsdaten“ | zeigt je Geheimnis, wo es liegt; Knopf zum Umziehen (mit Bestätigungshäkchen) und Rückweg |
| Schnittstelle | `/api/sicherheit`, Aktionen `zugangsdaten_schluesselbund` und `zugangsdaten_datei` | nur von diesem Mac, nur mit `x-jarvis`-Header |

Schutzregeln:

* **Kein Schlüssel in einer Befehlszeile.** Geschrieben wird über die Eingabe von `security -i`, der Wert als
  Hex-Zeichenkette (`-X`). In der Prozessliste steht nur `security -i`. Gelesen wird mit
  `find-generic-password -w`; der Wert steht dabei nur in der Ausgabe an JARVIS.
* **Sonderzeichen sicher.** Der Wert wird als `b64:` plus Base64 abgelegt, weil `security -w` Werte mit
  Umlauten sonst als Hex ausgibt und dann nicht mehr eindeutig wäre.
* **Umzug nur durch einen Menschen am Mac.** Telegram, das Modell und das System können ihn nicht starten.
* **Erst prüfen, dann umstellen.** Jeder Wert wird geschrieben und sofort zurückgelesen. Stimmt einer nicht,
  werden alle schon geschriebenen Einträge gelöscht und die Datei bleibt unverändert. Erst danach wird die
  Datei umgeschrieben (atomar über eine Zwischendatei), und JARVIS prüft, dass kein Wert mehr im Klartext
  darin steht.
* **Gesperrter Schlüsselbund löscht nie.** Kann JARVIS einen Eintrag nicht lesen, gilt der Dienst als nicht
  eingerichtet, und die Sicherheitszentrale zeigt den Grund. Beim Speichern anderer Einstellungen bleibt die
  Marke stehen, der Eintrag bleibt im Schlüsselbund.
* **Rückweg nur, wenn alles lesbar ist.** Sonst gingen nicht lesbare Werte verloren.
* **Audit-Log nennt nur Namen.** Umzug, Fehler und Rückweg stehen im Audit-Log mit den Namen der Einträge,
  nie mit Werten.

Umgebungsvariablen (`ANTHROPIC_API_KEY`, `XAI_API_KEY`, `TWELVEDATA_API_KEY`) bleiben ein Ersatz, wenn in
der Datei nichts steht; die Sicherheitszentrale zeigt sie als „Umgebung“.

## Tests

`test/module/zugangsdaten.test.ts` (9 Tests) gegen ein nachgebautes `security`
(`test/mocks/security-mock.mjs`, eingesetzt über `JARVIS_SECURITY_BIN`). Der Nachbau protokolliert jede
Befehlszeile; der Test prüft, dass darin kein Geheimnis steht. Geprüft werden: Status vorher, Umzug ohne
Klartext und mit gleichen Werten (auch ein Mail-Passwort mit Umlauten, Anführungszeichen, Leerzeichen und
`€`), keine Werte in Befehlszeilen, nur „mac“ darf umziehen, Rücknahme bei Schreibfehler, neue/geänderte/
entfernte Schlüssel nach dem Umzug, gesperrter Schlüsselbund (nichts gelöscht, Rückweg verweigert),
Rückweg in die Datei, Audit-Log ohne Werte.

**Was die Sandbox nicht prüfen kann:** das echte `security` von macOS (Rückgabecodes, `-i` mit `-X`,
ob und wann macOS beim Zugriff nachfragt). Der Umzug liest jeden Wert zurück, bevor er die Datei
umstellt, sodass ein abweichendes Verhalten auf dem Mac zum Abbruch ohne Änderung führt und nicht zu
verlorenen Werten. Bestätigt ist das erst mit der Prüfliste in `ENTWICKLUNG.md`.

## Verbleibende Risiken

| Risiko | Einordnung | Wie weiter |
|---|---|---|
| Alte Klartext-Kopien von `config.json` in Time-Machine- oder anderen Backups | Mittel | nach dem Umzug die Schlüssel erneuern (Rotation); Entscheidung bei Benedikt |
| Die Einträge legt `/usr/bin/security` an, das damit für sie zugelassen ist. Ein Programm, das als Benedikts Benutzer läuft, kann sie vermutlich über dasselbe Werkzeug ohne Rückfrage lesen (auf dem Mac zu prüfen) | Mittel | Schutz gegen Schadprogramme bringt erst ein eigener Dienst mit Key Vault (Phase 3) oder ein signiertes Hilfsprogramm |
| Weiterhin ein Satz Schlüssel für alles, keine Trennung Test/Produktion | Mittel | Phase 3 (Key Vault, getrennte Umgebungen) |
| Der laufende JARVIS hält die Werte im Arbeitsspeicher | Niedrig | unvermeidlich, solange JARVIS sie nutzt |
