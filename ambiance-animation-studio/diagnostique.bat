@echo off
cd /d "%~dp0"
title Diagnostic Ambiance Animation Studio
echo.
echo  === DIAGNOSTIC ===
echo  Dossier : %CD%
echo.

if exist "index.html" (echo  [OK] index.html) else (echo  [X] index.html MANQUANT)
if exist "serve.ps1" (echo  [OK] serve.ps1) else (echo  [X] serve.ps1 MANQUANT)
if exist "lib\ffmpeg\ffmpeg.js" (echo  [OK] lib\ffmpeg\ffmpeg.js) else (echo  [X] lib\ffmpeg MANQUANT)
if exist "lib\ffmpeg\ffmpeg-core.wasm" (echo  [OK] ffmpeg-core.wasm) else (echo  [X] ffmpeg-core.wasm MANQUANT)

echo.
where powershell >nul 2>&1 && echo  [OK] powershell || echo  [X] powershell
where python >nul 2>&1 && (echo  [OK] python & python --version) || echo  [ ] python absent
where py >nul 2>&1 && (echo  [OK] py & py -3 --version) || echo  [ ] py absent
where node >nul 2>&1 && (echo  [OK] node & node --version) || echo  [ ] node absent

echo.
echo  Test PowerShell 1 ligne...
powershell -NoProfile -Command "Write-Host ('PS OK ' + $PSVersionTable.PSVersion)"

echo.
echo  Fichiers du dossier:
dir /b
echo.
echo  Copiez TOUT ce texte si vous avez besoin d'aide.
echo.
pause
