@echo off
cd /d "%~dp0"
echo.
echo  Ambiance Video Generator
echo  Demarrage du serveur proxy (anti-CORS Kling)...
echo.
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8765/
  python serve.py
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8765/
  py -3 serve.py
  goto :eof
)
echo ERREUR: Python n'est pas installe.
echo Telecharge Python 3 depuis https://www.python.org/downloads/
echo Coche "Add python.exe to PATH" pendant l'installation.
pause
