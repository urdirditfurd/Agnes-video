# Lance Atelier Vidéo Pro sous Windows PowerShell
# Usage : clic droit → Exécuter avec PowerShell
#    ou : powershell -ExecutionPolicy Bypass -File .\start.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "Atelier Vidéo Pro — démarrage sur http://localhost:4173" -ForegroundColor Cyan
Write-Host "Collez votre clé Agnes dans l'écran 1 de l'app (pas ici)." -ForegroundColor DarkGray
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js introuvable. Installez-le depuis https://nodejs.org" -ForegroundColor Red
  exit 1
}

Write-Host "Tests Story Parser..." -ForegroundColor Yellow
node .\tests\story-parser.test.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Serveur local..." -ForegroundColor Yellow
npx --yes serve -p 4173
