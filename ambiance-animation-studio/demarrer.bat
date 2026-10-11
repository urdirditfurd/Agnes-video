@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ============================================
echo   Ambiance Animation Studio — demarrage
echo  ============================================
echo.
echo  1) Cette fenetre DOIT rester ouverte
echo  2) Le navigateur s'ouvre sur http://127.0.0.1:8765/
echo  3) Si la page refuse la connexion : lisez les messages ci-dessous
echo.

if not exist "index.html" (
  echo  ERREUR: index.html introuvable.
  echo  Placez demarrer.bat DANS le dossier ambiance-animation-studio.
  pause
  exit /b 1
)
if not exist "lib\ffmpeg\ffmpeg.js" (
  echo  ERREUR: lib\ffmpeg\ manquant.
  echo  Telechargez le dossier COMPLET, pas seulement index.html.
  pause
  exit /b 1
)

where python >nul 2>&1
if %errorlevel%==0 (
  echo  Python trouve — demarrage...
  echo.
  python serve.py
  if errorlevel 1 goto TRY_PY
  goto END
)

:TRY_PY
where py >nul 2>&1
if %errorlevel%==0 (
  echo  Essai avec: py -3 serve.py
  echo.
  py -3 serve.py
  if errorlevel 1 goto NO_PYTHON
  goto END
)

:NO_PYTHON
echo.
echo  ERREUR: Python introuvable.
echo  Installez Python 3 depuis https://www.python.org/downloads/
echo  Cochez "Add python.exe to PATH" puis relancez demarrer.bat
echo.
pause
exit /b 1

:END
echo.
echo  Serveur arrete.
pause
