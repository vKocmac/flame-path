# Τοπικός server δοκιμής — δεξί κλικ > Run with PowerShell, μετά άνοιξε
# http://localhost:8080 στον browser. Ctrl+C για τερματισμό.
param([int]$Port = 8080)

$root = $PSScriptRoot
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".woff2" = "font/woff2"
  ".mp3"  = "audio/mpeg"
  ".txt"  = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Ο Δρόμος της Φλόγας -> http://localhost:$Port  (Ctrl+C για τερματισμό)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
      $file = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
        $ctx.Response.Headers.Add("Cache-Control", "no-cache")
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $ctx.Response.StatusCode = 404
      }
    } catch {
      # Πεσμένη σύνδεση client ή άλλο σφάλμα request — ο server συνεχίζει.
      try { $ctx.Response.StatusCode = 500 } catch {}
    }
    try { $ctx.Response.Close() } catch {}
  }
} finally {
  $listener.Stop()
}
