# Serves the editor from the clone "ich" on http://localhost:8001/ and opens it
# in the browser. Ctrl+C in this window stops it.

$ErrorActionPreference = "Stop"
$ich = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path "trial-run/ich/docs"
if (-not (Test-Path $ich)) { throw "Erst .\tools\trial-run\setup.ps1 ausfuehren." }

Start-Process "http://localhost:8001/"
Write-Host "Editor laeuft auf http://localhost:8001/ (Chrome oder Edge). Beenden mit Strg+C."
python -m http.server 8001 --bind 127.0.0.1 --directory $ich
