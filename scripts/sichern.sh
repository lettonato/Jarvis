#!/usr/bin/env bash
# Sichert den aktuellen Stand unabhängig vom Arbeitsordner: ein Git-Bündel des Zweigs (mit ganzer Geschichte)
# und ein ZIP zum Entpacken. Danach wird die Sicherung geprüft: Sie muss sich klonen lassen und denselben
# Commit enthalten. Aufruf:  bash scripts/sichern.sh /pfad/zum/sicherungsordner
set -euo pipefail
ziel="${1:?Bitte den Sicherungsordner angeben}"
mkdir -p "$ziel"
ziel="${ziel%/}/"
zweig="$(git rev-parse --abbrev-ref HEAD)"
stand="$(git rev-parse HEAD)"
if [ -n "$(git status --porcelain)" ]; then
  echo "Achtung: Es gibt nicht gespeicherte Änderungen. Gesichert wird nur der letzte Commit ${stand:0:7}." >&2
fi
git bundle create "${ziel}jarvis-aktuell.bundle" "$zweig" >/dev/null 2>&1
git archive --format=zip --prefix=Jarvis-aktuell/ -o "${ziel}Jarvis-aktuell.zip" HEAD
probe="$(mktemp -d)"
trap 'rm -rf "$probe"' EXIT
git clone -q "${ziel}jarvis-aktuell.bundle" "$probe/klon" -b "$zweig"
gesichert="$(git -C "$probe/klon" rev-parse HEAD)"
if [ "$gesichert" != "$stand" ]; then
  echo "FEHLER: Die Sicherung enthält $gesichert statt $stand." >&2
  exit 1
fi
printf '%s  %s  %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$zweig" "$stand" >> "${ziel}sicherungen.txt"
echo "Gesichert und geprüft: $zweig @ ${stand:0:7} in $ziel"
