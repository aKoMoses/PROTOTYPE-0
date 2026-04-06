@echo off
setlocal

cd /d "%~dp0"
title PROTOTYPE-0 Launcher

if not exist "package.json" (
  echo package.json introuvable dans %cd%
  echo Verifie que ce lanceur est bien dans le dossier du projet.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm est introuvable.
  echo Installe Node.js puis relance ce fichier.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installation des dependances...
  call npm install
  if errorlevel 1 goto :fail
)

echo Lancement de PROTOTYPE-0...
echo Une fenetre navigateur va s'ouvrir automatiquement.
echo Garde cette fenetre ouverte pendant que tu joues.
echo.

call npm run dev -- --host 127.0.0.1 --open
if errorlevel 1 goto :fail

exit /b 0

:fail
echo.
echo Le lancement a echoue.
pause
exit /b 1
