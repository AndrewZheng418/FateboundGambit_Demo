# Fatebound Gambit local static server (PowerShell, no Python required)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = Split-Path -Parent $MyInvocation.MyCommand.Path
}
Set-Location -LiteralPath $Root
$preferredPorts = 8765, 8766, 8767, 8768, 8769, 8770

function Get-Mime([string]$ext) {
  switch ($ext.ToLower()) {
    ".html" { "text/html; charset=utf-8" }
    ".js"   { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".png"  { "image/png" }
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    ".gif"  { "image/gif" }
    ".mp3"  { "audio/mpeg" }
    ".svg"  { "image/svg+xml" }
    ".ico"  { "image/x-icon" }
    ".md"   { "text/plain; charset=utf-8" }
    ".txt"  { "text/plain; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Wait-Exit([string]$msg) {
  Write-Host $msg
  try { [void](Read-Host "Press Enter to exit") } catch { Start-Sleep -Seconds 4 }
}

Write-Host "========================================"
Write-Host " Fatebound Gambit"
Write-Host "========================================"
Write-Host "Folder: $Root"
Write-Host ""

if (-not (Test-Path -LiteralPath (Join-Path $Root "index.html"))) {
  Wait-Exit "[ERROR] index.html missing"
  exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $Root "data\config.json"))) {
  Wait-Exit "[ERROR] data\config.json missing"
  exit 1
}

$listener = $null
$url = $null

foreach ($tryPort in $preferredPorts) {
  $tryListener = $null
  try {
    $tryListener = New-Object System.Net.HttpListener
    # 只注册一个地址，避免 localhost + 127.0.0.1 双重注册冲突
    $prefix = "http://127.0.0.1:$tryPort/"
    $tryListener.Prefixes.Add($prefix)
    $tryListener.Start()
    $listener = $tryListener
    $url = $prefix
    break
  } catch {
    Write-Host "Port $tryPort unavailable, trying next..."
    if ($tryListener) {
      try { $tryListener.Abort() } catch {}
      try { $tryListener.Close() } catch {}
    }
  }
}

if (-not $listener) {
  Wait-Exit "[ERROR] Ports 8765-8770 all busy. Close other Fatebound black windows, then retry."
  exit 1
}

Write-Host "Server OK: $url"
Write-Host "Do NOT close this window while playing."
Write-Host "Press Ctrl+C to stop."
Write-Host ""
Start-Process $url

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
      $rel = $rel -replace "/", "\"
      $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
      $rootFull = [System.IO.Path]::GetFullPath($Root)
      if (-not $rootFull.EndsWith("\")) { $rootFull += "\" }
      if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
        $bytes = [Text.Encoding]::UTF8.GetBytes("Forbidden")
      } elseif (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        $res.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes("Not Found: $rel")
      } else {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $res.StatusCode = 200
        $res.ContentType = Get-Mime([System.IO.Path]::GetExtension($full))
      }
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      try {
        $res.StatusCode = 500
        $msg = [Text.Encoding]::UTF8.GetBytes("Server error")
        $res.OutputStream.Write($msg, 0, $msg.Length)
      } catch {}
    } finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
} finally {
  try { $listener.Stop() } catch {}
  try { $listener.Close() } catch {}
}
