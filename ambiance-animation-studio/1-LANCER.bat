@echo off
setlocal
cd /d "%~dp0"
title Ambiance Animation Studio

echo.
echo  ============================================
echo   AMBIANCE ANIMATION STUDIO
echo  ============================================
echo.
echo  Demarrage du serveur...
echo  (cette fenetre doit rester ouverte)
echo.

REM Journal pour diagnostiquer
echo ==== %DATE% %TIME% ==== > "%~dp0demarrer-log.txt"
echo Dossier: %CD% >> "%~dp0demarrer-log.txt"

if not exist "%~dp0index.html" (
  echo  ERREUR: mauvais dossier — index.html introuvable
  echo  ERREUR: mauvais dossier >> "%~dp0demarrer-log.txt"
  goto FIN
)
if not exist "%~dp0lib\ffmpeg\ffmpeg.js" (
  echo  ERREUR: lib\ffmpeg manquant — ZIP incomplet
  echo  ERREUR: lib ffmpeg manquant >> "%~dp0demarrer-log.txt"
  goto FIN
)

echo  Lancement PowerShell...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
set ERR=%ERRORLEVEL%
echo.
echo  Code sortie: %ERR%
echo  Code sortie: %ERR% >> "%~dp0demarrer-log.txt"

if not "%ERR%"=="0" (
  echo.
  echo  ECHEC. Essayez Node si installe:
  where node >nul 2>&1
  if %errorlevel%==0 (
    echo  -^> node serve.mjs
    node "%~dp0serve.mjs"
  ) else (
    echo  Node non trouve.
    echo  Installez Python OU Node, OU envoyez demarrer-log.txt
  )
)

:FIN
echo.
echo  ============================================
echo  Si la page ne s'ouvre pas, lisez:
echo    %~dp0demarrer-log.txt
echo  ============================================
echo.
pause
endlocal
