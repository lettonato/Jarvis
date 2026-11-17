#!/usr/bin/env bash
# Sichert den aktuellen Stand unabhängig vom Arbeitsordner: ein Git-Bündel des Zweigs (mit ganzer Geschichte)
# und ein ZIP zum Entpacken. Aufruf:  bash scripts/sichern.sh /pfad/zum/sicherungsordner
#
# Die neue Sicherung entsteht zuerst in einem eigenen Unterordner und wird dort geprüft (siehe
# wiederherstellen-pruefen.sh: Bündel unbeschädigt, richtiger Commit, ZIP gleich dem Commit). Erst wenn sie
# besteht, ersetzt sie die alte, und an ihrem Platz wird sie noch einmal geprüft. Scheitert irgendetwas davon,
# liegt am Ende wieder die alte Sicherung im Ordner, wie sie war.
# Nicht gesichert werden deine Daten und Einstellungen in ~/.jarvis.
set -euo pipefail
ziel="${1:?Bitte den Sicherungsordner angeben}"
mkdir -p "$ziel"
ziel="$(cd "$ziel" && pwd)/"
pruefen="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/wiederherstellen-pruefen.sh"
zweig="$(git rev-parse --abbrev-ref HEAD)"
stand="$(git rev-parse HEAD)"
if [ "$zweig" = "HEAD" ]; then
  echo "FEHLER: Gerade ist kein Zweig ausgecheckt. Gesichert wird immer ein Zweig; bitte erst auf den Arbeitszweig wechseln." >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "Achtung: Es gibt nicht gespeicherte Änderungen. Gesichert wird nur der letzte Commit ${stand:0:7}." >&2
fi

# Reste eines Laufs, der hart abgebrochen wurde (Rechner aus, Sitzung beendet), räumt der nächste Lauf weg.
for rest in "${ziel}".neu-[0-9]*; do
  if [ -d "$rest" ]; then rm -rf "$rest"; fi
done
neu="${ziel}.neu-$$/"
alt="${neu}alt/"
mkdir "$neu" "$alt"
trap 'rm -rf "$neu"' EXIT
zeile="$(printf '%s  %s  %s' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$zweig" "$stand")"
if ! { git bundle create "${neu}jarvis-aktuell.bundle" "$zweig" >/dev/null 2>&1 \
  && git archive --format=zip --prefix=Jarvis-aktuell/ -o "${neu}Jarvis-aktuell.zip" HEAD \
  && printf '%s\n' "$zeile" > "${neu}sicherungen.txt" \
  && bash "$pruefen" "$neu" --nur-dateien >/dev/null; }; then
  echo "FEHLER: Die neue Sicherung von ${stand:0:7} ließ sich nicht anlegen oder nicht prüfen. Die alte Sicherung ist unverändert." >&2
  exit 1
fi

# Tauschen: Die alten Dateien wandern zur Seite, die neuen an ihren Platz, die Liste bekommt ihre Zeile, und
# dann wird geprüft, was wirklich im Ordner liegt. Geht dabei etwas schief, legt zurueck die alten wieder hin.
namen="jarvis-aktuell.bundle Jarvis-aktuell.zip sicherungen.txt"
gab_es=""
for name in $namen; do
  if [ -e "${ziel}${name}" ]; then gab_es="$gab_es $name"; fi
done
tausche() {
  local name
  for name in jarvis-aktuell.bundle Jarvis-aktuell.zip; do
    if [ -e "${ziel}${name}" ]; then mv -f "${ziel}${name}" "${alt}${name}" || return 1; fi
  done
  if [ -e "${ziel}sicherungen.txt" ]; then cp -p "${ziel}sicherungen.txt" "${alt}sicherungen.txt" || return 1; fi
  mv -f "${neu}jarvis-aktuell.bundle" "${ziel}jarvis-aktuell.bundle" || return 1
  mv -f "${neu}Jarvis-aktuell.zip" "${ziel}Jarvis-aktuell.zip" || return 1
  # Fehlt der alten Liste der Zeilenumbruch am Ende, bekäme die neue Zeile sonst keine eigene.
  if [ -s "${ziel}sicherungen.txt" ] && [ -n "$(tail -c 1 "${ziel}sicherungen.txt")" ]; then printf '\n' >> "${ziel}sicherungen.txt" || return 1; fi
  printf '%s\n' "$zeile" >> "${ziel}sicherungen.txt" || return 1
  bash "$pruefen" "$ziel" --nur-dateien >/dev/null
}
zurueck() {
  local name gut=0
  for name in $namen; do
    case " $gab_es " in
      *" $name "*)
        # Liegt die alte Datei zur Seite, kommt sie zurück; sonst liegt sie noch unberührt an ihrem Platz.
        if [ -e "${alt}${name}" ]; then mv -f "${alt}${name}" "${ziel}${name}" || gut=1; fi ;;
      *) rm -f "${ziel}${name}" || gut=1 ;;
    esac
  done
  return $gut
}
if ! tausche; then
  if zurueck; then
    echo "FEHLER: Die neue Sicherung von ${stand:0:7} ließ sich nicht an ihren Platz legen oder besteht dort die Prüfung nicht. Die alte Sicherung liegt wieder unverändert im Ordner." >&2
  else
    trap - EXIT
    echo "FEHLER: Die neue Sicherung von ${stand:0:7} ließ sich nicht an ihren Platz legen, und die alte ließ sich nicht zurücklegen. Die alten Dateien liegen in $alt" >&2
  fi
  exit 1
fi
echo "Gesichert und geprüft: $zweig @ ${stand:0:7} in $ziel"
