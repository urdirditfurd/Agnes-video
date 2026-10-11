# Serveur HTTP Windows (TcpListener) — PAS besoin d'admin ni de Python
# Evite les erreurs HttpListener / URL ACL sur Windows.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) { $Root = Get-Location }
Set-Location $Root

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
  Write-Host $line
  try { Add-Content -Path (Join-Path $Root "demarrer-log.txt") -Value $line -Encoding UTF8 } catch {}
}

Write-Log "Dossier: $Root"

$Index = Join-Path $Root "index.html"
$Ffmpeg = Join-Path $Root "lib\ffmpeg\ffmpeg.js"
if (-not (Test-Path -LiteralPath $Index)) {
  Write-Host ""
  Write-Host "ERREUR: index.html introuvable." -ForegroundColor Red
  Write-Host "Placez ce script DANS le dossier ambiance-animation-studio"
  Write-Host ""
  exit 1
}
if (-not (Test-Path -LiteralPath $Ffmpeg)) {
  Write-Host ""
  Write-Host "ERREUR: lib\ffmpeg\ manquant (dossier incomplet)." -ForegroundColor Red
  Write-Host "Telechargez le ZIP complet depuis GitHub, pas seulement index.html"
  Write-Host ""
  exit 1
}
Write-Log "Pack OK (index.html + lib/ffmpeg)"

$Mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript"
  ".mjs"  = "text/javascript"
  ".css"  = "text/css"
  ".json" = "application/json"
  ".wasm" = "application/wasm"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
  ".mp3"  = "audio/mpeg"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
  ".ico"  = "image/x-icon"
  ".txt"  = "text/plain; charset=utf-8"
  ".map"  = "application/json"
}

function Get-FreePort {
  foreach ($p in 8765, 8766, 8767, 8768, 8769, 8770) {
    try {
      $l = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback), $p
      $l.Start()
      $l.Stop()
      return $p
    } catch {}
  }
  return $null
}

$Port = Get-FreePort
if (-not $Port) {
  Write-Host "ERREUR: ports 8765-8770 tous occupes." -ForegroundColor Red
  Write-Host "Fermez les anciennes fenetres noires / serveurs."
  exit 1
}

$Listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback), $Port
try {
  $Listener.Start()
} catch {
  Write-Host "ERREUR demarrage port $Port : $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

$Url = "http://127.0.0.1:$Port/"
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Ambiance Animation Studio — SERVEUR OK" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Copiez cette adresse dans Chrome :" -ForegroundColor Yellow
Write-Host ""
Write-Host "     $Url" -ForegroundColor Green
Write-Host ""
Write-Host "  NE FERMEZ PAS cette fenetre !" -ForegroundColor Yellow
Write-Host "  Pour arreter : Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Log "Serveur ecoute sur $Url"

try {
  Start-Process $Url
  Write-Log "Navigateur ouvert"
} catch {
  Write-Log "Ouverture navigateur ignoree"
}

function Send-Response($stream, $status, $contentType, $bytes) {
  $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $hdrBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($hdrBytes, 0, $hdrBytes.Length)
  if ($bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
  $stream.Flush()
}

try {
  while ($true) {
    $client = $Listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 15000
      $client.SendTimeout = 60000
      $stream = $client.GetStream()
      $buffer = New-Object byte[] 8192
      $read = $stream.Read($buffer, 0, $buffer.Length)
      if ($read -le 0) { $client.Close(); continue }
      $reqText = [Text.Encoding]::ASCII.GetString($buffer, 0, $read)
      $first = ($reqText -split "`r`n")[0]
      if ($first -notmatch "^(GET|HEAD) (.+) HTTP/") {
        Send-Response $stream "400 Bad Request" "text/plain" ([Text.Encoding]::UTF8.GetBytes("Bad Request"))
        $client.Close(); continue
      }
      $rawPath = $Matches[2].Split("?")[0]
      $rel = [Uri]::UnescapeDataString($rawPath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
      $rel = $rel -replace "/", [IO.Path]::DirectorySeparatorChar
      if ($rel.Contains("..")) {
        Send-Response $stream "403 Forbidden" "text/plain" ([Text.Encoding]::UTF8.GetBytes("Forbidden"))
        $client.Close(); continue
      }
      $path = Join-Path $Root $rel
      if (-not (Test-Path -LiteralPath $path) -or (Get-Item -LiteralPath $path).PSIsContainer) {
        Write-Log "404 $rawPath"
        Send-Response $stream "404 Not Found" "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("404 Not Found"))
        $client.Close(); continue
      }
      $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
      $ctype = $Mime[$ext]
      if (-not $ctype) { $ctype = "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($path)
      Write-Log ("200 {0} ({1} o)" -f $rawPath, $bytes.Length)
      Send-Response $stream "200 OK" $ctype $bytes
      $client.Close()
    } catch {
      Write-Log ("ERR requete: {0}" -f $_.Exception.Message)
      try { $client.Close() } catch {}
    }
  }
} finally {
  try { $Listener.Stop() } catch {}
  Write-Log "Serveur arrete"
}
