@echo off
chcp 65001 >nul
echo.
echo  ============================================
echo   Ambiance Animation Studio — demarrage
echo  ============================================
echo.
echo  NE PAS double-cliquer sur index.html
echo  NE FERMEZ PAS cette fenetre pendant l'usage
echo.
cd /d "%~dp0"
echo  Serveur : http://127.0.0.1:8765/
echo  Ctrl+C pour arreter
echo.
python serve.py
if errorlevel 1 (
  echo.
  echo  Python introuvable — essai avec py ...
  py serve.py
)
pause
