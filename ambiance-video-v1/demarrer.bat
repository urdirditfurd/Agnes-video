@echo off
chcp 65001 >nul
echo.
echo  ============================================
echo   Ambiance Video Studio v1 — demarrage local
echo  ============================================
echo.
echo  NE PAS double-cliquer sur index.html
echo  (sinon erreur lib/ffmpeg/ ERR_FILE_NOT_FOUND)
echo.
cd /d "%~dp0"
echo  Serveur : http://127.0.0.1:8765/
echo  Ouvrez cette adresse dans Chrome / Edge
echo  Ctrl+C pour arreter
echo.
start "" "http://127.0.0.1:8765/"
python -m http.server 8765
if errorlevel 1 (
  echo.
  echo  Python introuvable — essayez: py -m http.server 8765
  py -m http.server 8765
)
pause
