@echo off
cd /d "%~dp0"
echo.
echo  Ambiance Video Generator (optionnel)
echo  Tu peux aussi ouvrir index.html directement, ou GitHub Pages.
echo  Serveur local de confort : http://127.0.0.1:8765/
echo.
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8765/
  python -m http.server 8765
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8765/
  py -3 -m http.server 8765
  goto :eof
)
echo Python non trouve — ouvre simplement index.html dans le navigateur.
start "" "%~dp0index.html"
pause
