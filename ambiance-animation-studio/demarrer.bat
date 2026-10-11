@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ============================================
echo   Ambiance Animation Studio — demarrage
echo  ============================================
echo.
echo  Cette fenetre DOIT rester ouverte.
echo  Si "can't connect" : le serveur n'est PAS lance.
echo.

if not exist "%~dp0index.html" (
  echo  [X] index.html introuvable
  echo      Mettez demarrer.bat DANS ambiance-animation-studio\
  goto FAIL
)
if not exist "%~dp0lib\ffmpeg\ffmpeg.js" (
  echo  [X] lib\ffmpeg\ manquant
  echo      Telechargez le ZIP/dossier COMPLET depuis GitHub
  goto FAIL
)
echo  [OK] Pack complet detecte
echo.

REM --- 1) Python ---
where python >nul 2>&1
if %errorlevel%==0 (
  echo  [1/3] Essai Python...
  python "%~dp0serve.py"
  if %errorlevel%==0 goto END
  echo  Python a echoue, essai suivant...
  echo.
)

where py >nul 2>&1
if %errorlevel%==0 (
  echo  [1/3] Essai py -3...
  py -3 "%~dp0serve.py"
  if %errorlevel%==0 goto END
  echo  py a echoue, essai suivant...
  echo.
)

REM --- 2) PowerShell (pas besoin de Python) ---
echo  [2/3] Essai PowerShell (sans Python)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if %errorlevel%==0 goto END
echo  PowerShell a echoue, essai suivant...
echo.

REM --- 3) Node.js ---
where node >nul 2>&1
if %errorlevel%==0 (
  echo  [3/3] Essai Node.js...
  node "%~dp0serve.mjs"
  if %errorlevel%==0 goto END
)

echo.
echo  ============================================
echo   AUCUN SERVEUR N'A PU DEMARRER
echo  ============================================
echo.
echo  Installez UNE de ces options, puis relancez :
echo    A) Python 3  https://www.python.org/downloads/
echo       ^> cochez "Add python.exe to PATH"
echo    B) Node.js   https://nodejs.org/
echo.
echo  Ou ouvrez PowerShell dans ce dossier et tapez :
echo    powershell -ExecutionPolicy Bypass -File .\serve.ps1
echo.
echo  Puis ouvrez l'URL verte affichee (ex. http://127.0.0.1:8765/)
echo.
pause
exit /b 1

:FAIL
echo.
pause
exit /b 1

:END
echo.
echo  Serveur arrete.
pause
endlocal
