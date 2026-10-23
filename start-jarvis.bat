@echo off
title JARVIS
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte die LTS-Version von https://nodejs.org installieren und danach neu starten.
  pause
  exit /b 1
)

if not exist node_modules\imapflow (
  echo Installiere Pakete, das dauert beim ersten Mal ein bis zwei Minuten ...
  call npm install
  if errorlevel 1 (
    echo Die Installation ist fehlgeschlagen.
    pause
    exit /b 1
  )
)

rem Zwischenspeicher leeren, damit nach einem Update sicher die neuen Dateien gelten.
if exist .next\dev rmdir /s /q .next\dev

echo JARVIS startet. Der Browser oeffnet sich gleich mit http://localhost:3000
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
pause
