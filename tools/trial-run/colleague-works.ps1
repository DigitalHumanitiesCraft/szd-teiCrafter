# Simulates a colleague working on another letter at the same time: pulls the
# latest state, resolves the first deletion in o_szd.504, rebuilds the document
# list, commits and pushes to the stand-in server.

$ErrorActionPreference = "Stop"
$kollegin = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path "trial-run/kollegin"
if (-not (Test-Path $kollegin)) { throw "Erst .\tools\trial-run\setup.ps1 ausfuehren." }

Push-Location $kollegin
try {
    git pull --quiet --ff-only
    node (Join-Path $PSScriptRoot "helpers/colleague-deletion.cjs")
    if ($LASTEXITCODE -eq 2) { exit 0 }
    if ($LASTEXITCODE) { throw "Bearbeitung fehlgeschlagen." }
    node tools/build-document-index.mjs | Out-Null
    git add data/korrespondenzen/o_szd.504.tei.xml data/index.json
    git commit --quiet -m "Resolve the first deletion in o_szd.504"
    git push --quiet
    Write-Host "Die Kollegin hat o_szd.504 bearbeitet und auf den Server geschoben:"
    git log --oneline -1
} finally { Pop-Location }
