#!/usr/bin/env bash
# Prüft, ob sich aus der Sicherung wirklich wieder ein laufender Stand herstellen lässt. Die Sicherung selbst
# wird dabei nur gelesen; gearbeitet wird in einem Wegwerf-Ordner, der danach verschwindet.
#
#   bash scripts/wiederherstellen-pruefen.sh /pfad/zum/sicherungsordner            (vollständig, einige Minuten)
#   bash scripts/wiederherstellen-pruefen.sh /pfad/zum/sicherungsordner --nur-dateien   (ohne Installieren und Tests)
#
# Geprüft wird:
#   1. Das Git-Bündel ist unbeschädigt und enthält den Commit, den sicherungen.txt als letzten nennt.
#   2. Das ZIP lässt sich entpacken und enthält genau die Dateien dieses Commits, Byte für Byte.
#   3. Aus dem entpackten ZIP allein (so, wie man es auf einem neuen Rechner täte) lassen sich die Pakete
#      installieren, und Lint, Typprüfung und alle Tests bestehen.
# Nicht geprüft werden deine Daten und Einstellungen in ~/.jarvis: Die sind nicht Teil dieser Sicherung.
set -euo pipefail
ordner="${1:?Bitte den Sicherungsordner angeben}"
# Ganzer Pfad, damit die Angabe auch gilt, wenn weiter unten aus einem anderen Ordner heraus gearbeitet wird.
ordner="$(cd "$ordner" 2>/dev/null && pwd)/" || { echo "FEHLER: Den Ordner $1 gibt es nicht." >&2; exit 1; }
modus="${2:-}"
case "$modus" in
  "" | --nur-dateien) ;;
  *) echo "FEHLER: Unbekannte Angabe „${modus}“. Erlaubt ist nur --nur-dateien." >&2; exit 1 ;;
esac
buendel="${ordner}jarvis-aktuell.bundle"
zip="${ordner}Jarvis-aktuell.zip"
liste="${ordner}sicherungen.txt"
for datei in "$buendel" "$zip" "$liste"; do
  [ -s "$datei" ] || { echo "FEHLER: $datei fehlt oder ist leer." >&2; exit 1; }
done

probe="$(mktemp -d)"
trap 'rm -rf "$probe"' EXIT
# (read meldet einen Fehler, wenn der Zeilenumbruch am Ende fehlt; gelesen hat es die Zeile trotzdem.)
read -r _ zweig erwartet < <(tail -n 1 "$liste") || true
case "$erwartet" in
  *[!0-9a-f]* | "") echo "FEHLER: Die letzte Zeile von sicherungen.txt nennt keinen Commit." >&2; exit 1 ;;
esac

# 1. Das Bündel: unbeschädigt, klonbar, richtiger Commit, saubere Geschichte.
# (git prüft ein Bündel nur innerhalb eines Repositorys; dafür reicht ein leeres. „bundle verify“ liest nur den
# Kopf des Bündels; ein abgeschnittenes Bündel fällt erst beim Klonen auf, das jedes Objekt auspackt.)
git init -q "$probe/leer"
git -C "$probe/leer" bundle verify "$buendel" >/dev/null 2>&1 || { echo "FEHLER: Das Git-Bündel ist beschädigt (der Kopf ist nicht lesbar)." >&2; exit 1; }
git clone -q "$buendel" "$probe/klon" -b "$zweig" 2>/dev/null || { echo "FEHLER: Das Git-Bündel ist beschädigt oder enthält den Zweig $zweig nicht (es lässt sich nicht klonen)." >&2; exit 1; }
stand="$(git -C "$probe/klon" rev-parse HEAD)"
[ "$stand" = "$erwartet" ] || { echo "FEHLER: Das Bündel enthält $stand, sicherungen.txt nennt $erwartet." >&2; exit 1; }
git -C "$probe/klon" fsck --no-progress --no-dangling >/dev/null 2>&1 || { echo "FEHLER: Die Geschichte im Bündel ist beschädigt." >&2; exit 1; }
commits="$(git -C "$probe/klon" rev-list --count HEAD)"
echo "  in Ordnung: Bündel unbeschädigt, Commit ${stand:0:7} wie in sicherungen.txt, $commits Commits Geschichte"

# 2. Das ZIP: entpacken und mit den Dateien des Commits vergleichen. Verglichen wird mit allen Dateien des
#    Commits: Ein ZIP, dem Dateien fehlen, wäre keine vollständige Sicherung und soll hier auffallen.
unzip -q "$zip" -d "$probe/zip" || { echo "FEHLER: Das ZIP lässt sich nicht entpacken." >&2; exit 1; }
[ -d "$probe/zip/Jarvis-aktuell" ] || { echo "FEHLER: Im ZIP fehlt der Ordner Jarvis-aktuell." >&2; exit 1; }
if ! diff -r -q -x .git "$probe/klon" "$probe/zip/Jarvis-aktuell" > "$probe/unterschiede.txt" 2>&1; then
  echo "FEHLER: Das ZIP enthält nicht dieselben Dateien wie der Commit im Bündel:" >&2
  head -n 20 "$probe/unterschiede.txt" >&2
  exit 1
fi
dateien="$(git -C "$probe/klon" ls-files | wc -l | tr -d ' ')"
echo "  in Ordnung: ZIP enthält dieselben $dateien Dateien wie der Commit, Byte für Byte"

if [ "$modus" = "--nur-dateien" ]; then
  echo "Sicherung geprüft (nur Dateien): ${stand:0:7}. Installieren und Tests wurden ausgelassen."
  exit 0
fi

# 3. Aus dem ZIP allein: installieren und alles prüfen. Die Tests benutzen ihre eigenen Wegwerf-Ordner und
#    nachgebaute Dienste; echte Einstellungen und Schlüssel werden nicht gelesen.
cd "$probe/zip/Jarvis-aktuell"
npm ci --no-audit --no-fund > "$probe/npm-ci.log" 2>&1 || { echo "FEHLER: Die Pakete lassen sich nicht installieren (npm ci):" >&2; tail -n 15 "$probe/npm-ci.log" >&2; exit 1; }
echo "  in Ordnung: Pakete installiert (npm ci)"
if ! npm run pruefen > "$probe/pruefen.log" 2>&1; then
  echo "FEHLER: Im wiederhergestellten Stand bestehen Lint, Typprüfung oder Tests nicht:" >&2
  grep -E "^not ok|^# (tests|pass|fail)|error" "$probe/pruefen.log" | head -n 30 >&2
  exit 1
fi
# (Findet grep nichts, ist das hier kein Abbruchgrund: Dann fehlen die Zahlen, und das wird unten gemeldet.)
zahl() { { grep -E "$1" "$probe/pruefen.log" || true; } | tail -n 1 | tr -dc '0-9'; }
tests="$(zahl '^# tests ')"
bestanden="$(zahl '^# pass ')"
rest="$({ grep -E '^# (fail|cancelled|skipped|todo) ' "$probe/pruefen.log" || true; } | awk '{ summe += $NF } END { print summe + 0 }')"
if [ -z "$tests" ] || [ "$tests" = "0" ] || [ "$tests" != "$bestanden" ] || [ "$rest" != "0" ]; then
  echo "FEHLER: Die Zahlen der Tests stimmen nicht (${bestanden:-?} von ${tests:-?} bestanden, ${rest:-?} anderes)." >&2
  exit 1
fi
echo "  in Ordnung: Lint, Typprüfung und $bestanden von $tests Tests im wiederhergestellten Stand"
echo "Sicherung geprüft und wiederhergestellt: ${stand:0:7}."
