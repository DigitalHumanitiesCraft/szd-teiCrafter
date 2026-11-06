# Takes one more document from the szd-htr pipeline into the clone "ich": an
# entry in tools/working-set.json, the byte-exact import with provenance in
# data/IMPORT.md and a rebuilt data/index.json. It does not commit, so the
# operator sees what changed.
#
# Example: .\tools\trial-run\import-document.ps1 -ObjektId o_szd.1207 -Sammlung korrespondenzen -Grund "Letter for the trial run"

param(
    [Parameter(Mandatory)][string]$ObjektId,
    [Parameter(Mandatory)][ValidateSet("korrespondenzen", "lebensdokumente", "werke", "aufsatzablage")][string]$Sammlung,
    [Parameter(Mandatory)][string]$Grund
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ich = Join-Path $repo "trial-run/ich"
$szdHtr = Join-Path (Split-Path $repo -Parent) "szd-htr"
if (-not (Test-Path $ich)) { throw "Erst .\tools\trial-run\setup.ps1 ausfuehren." }
if ($ObjektId -notmatch '^o_szd\.\d+$') { throw "Objekt-ID muss die Form o_szd.1234 haben." }
if (-not (Test-Path (Join-Path $szdHtr "results/$Sammlung/$ObjektId.tei.xml"))) { throw "$ObjektId liegt nicht in szd-htr/results/$Sammlung." }

node (Join-Path $PSScriptRoot "helpers/add-to-working-set.cjs") (Join-Path $ich "tools/working-set.json") $ObjektId $Sammlung $Grund
if ($LASTEXITCODE) { throw "Eintrag fehlgeschlagen." }

Push-Location $ich
try {
    node tools/import-working-set.mjs $szdHtr
    if ($LASTEXITCODE) { throw "Import fehlgeschlagen." }
    node tools/build-document-index.mjs
    if ($LASTEXITCODE) { throw "Dokumentliste nicht gebaut." }
    Write-Host ""
    Write-Host "Geaenderte Dateien in deiner Arbeitskopie:"
    git status --short
} finally { Pop-Location }
