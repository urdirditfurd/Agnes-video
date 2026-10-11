# Ambiance Animation Studio — serveur HTTP Windows (sans Python)
# Usage: powershell -ExecutionPolicy Bypass -File serve.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Index = Join-Path $Root "index.html"
$Ffmpeg = Join-Path $Root "lib\ffmpeg\ffmpeg.js"
if (-not (Test-Path $Index)) {
  Write-Host "ERREUR: index.html introuvable dans $Root" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $Ffmpeg)) {
  Write-Host "ERREUR: lib\ffmpeg\ manquant — dossier incomplet." -ForegroundColor Red
  exit 1
}

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

function Test-PortFree([int]$Port) {
  try {
    $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $l.Start()
    $l.Stop()
    return $true
  } catch {
    return $false
  }
}

$Port = $null
foreach ($p in 8765, 8766, 8767, 8768, 8769, 8770) {
  if (Test-PortFree $p) { $Port = $p; break }
}
if (-not $Port) {
  Write-Host "ERREUR: aucun port libre (8765-8770)." -ForegroundColor Red
  exit 1
}

$Prefix = "http://127.0.0.1:$Port/"
$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add($Prefix)
try {
  $Listener.Start()
} catch {
  Write-Host ""
  Write-Host "ERREUR: impossible d'ecouter $Prefix" -ForegroundColor Red
  Write-Host $_.Exception.Message
  Write-Host "Astuce: ouvrez PowerShell en Administrateur une fois, ou utilisez un autre port."
  Write-Host ""
  exit 1
}

Write-Host ""
Write-Host "============================================"
Write-Host " Ambiance Animation Studio — serveur OK"
Write-Host "============================================"
Write-Host ""
Write-Host "  Ouvrez dans Chrome / Edge :"
Write-Host ""
Write-Host "     $Prefix" -ForegroundColor Green
Write-Host ""
Write-Host "  NE FERMEZ PAS cette fenetre."
Write-Host "  Ctrl+C pour arreter."
Write-Host ""

try {
  Start-Process $Prefix
} catch {}

try {
  while ($Listener.IsListening) {
    $ctx = $Listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
      $rel = $rel -replace "/", "\"
      if ($rel.Contains("..")) {
        $res.StatusCode = 403
        $res.Close()
        continue
      }
      $path = Join-Path $Root $rel
      if (-not (Test-Path $path) -or (Get-Item $path).PSIsContainer) {
        $res.StatusCode = 404
        $bytes404 = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $res.ContentLength64 = $bytes404.Length
        $res.OutputStream.Write($bytes404, 0, $bytes404.Length)
        $res.Close()
        continue
      }
      $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
      $ctype = $Mime[$ext]
      if (-not $ctype) { $ctype = "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($path)
      $res.StatusCode = 200
      $res.ContentType = $ctype
      $res.Headers.Add("Cache-Control", "no-cache")
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      Write-Host ("{0} {1}" -f $res.StatusCode, $req.Url.AbsolutePath)
    } catch {
      try {
        $res.StatusCode = 500
        $res.Close()
      } catch {}
      Write-Host ("500 {0}" -f $_.Exception.Message)
    }
  }
} finally {
  $Listener.Stop()
  $Listener.Close()
}
