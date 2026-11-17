# Design-Entwürfe (13. November 2026)

Drei Richtungen für das neue Aussehen von JARVIS, als einzelne HTML-Seiten in 1920 × 1080. Es sind Bilder zum
Aussuchen, kein Teil der Anwendung. Alle Inhalte sind Beispieldaten.

| Datei | Richtung | Idee |
|---|---|---|
| `a.html` | A „Premiere“ | Jeder Bereich ist eine Filmszene zwischen schwarzen Balken, das Gesprochene steht als Untertitel im Bild. |
| `b.html` | B „Glashaus“ | Heller Raum mit Fensterfront, das Wichtigste steht groß an der Wand, die Kamera fährt von Raum zu Raum. |
| `c.html` | C „Horizont“ | Eine durchgehende Landschaft nach Tageszeit, der Tag als Sonnenbogen, die Kugel ist JARVIS. |
| `d.html` | „Terrasse“ (zu B) | Im Freien vor der ganzen Aussicht, der Inhalt steht auf dem gläsernen Geländer, der Blick schwenkt. |
| `e.html` | „Lichtspiel“ (zu B) | Sonnenlicht fällt auf eine ruhige Wand, die Lichtfelder ordnen den Inhalt, das Licht wandert. |
| `g.html` | „Farbglas“ (zu B) | Raumhohe Schiebetüren aus farbigem Glas vor der Aussicht, beim Wechsel gleiten sie zur Seite. |
| `story.html?d=a` | Übergang | Vier Bilder des Wechsels zwischen zwei Bereichen (`d=a`, `b`, `c`, `d`, `e` oder `g`). |

Jede Richtung zeigt mit `?f=1` bis `?f=4` die vier Bilder ihres Übergangs.

Die Schriften liegen nicht im Projekt. Zum Ansehen in diesem Ordner einmal ausführen:

    npm install --no-save @fontsource/instrument-serif @fontsource-variable/manrope @fontsource-variable/archivo @fontsource-variable/outfit @fontsource-variable/bricolage-grotesque @fontsource-variable/fraunces @fontsource-variable/big-shoulders-display

Stand: Benedikt gefällt B „Glashaus“ am besten (13.11.). Er wollte weitere Ideen in dieser Richtung sehen und hat dazu
„Terrasse“, „Lichtspiel“ und „Farbglas“ bekommen. Ist nichts Besseres dabei, wird B gebaut. Gebaut wird erst nach seiner Wahl.

Entschieden am 13.11.: Benedikt bleibt bei B „Glashaus“, so wie gezeigt. Gebaut in Schritt E2 (siehe `ENTWICKLUNG.md`,
Bereich E). Die Entwürfe hier bleiben als Vorlage und zum Vergleich liegen.
