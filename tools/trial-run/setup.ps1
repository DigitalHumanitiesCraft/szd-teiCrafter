# Sets up the trial run: a local bare repository standing in for GitHub and two
# clones, "ich" (the operator) and "kollegin" (a simulated colleague), under the
# git-ignored folder trial-run/ of this repository. -Neu discards an existing
# trial and rebuilds it from the current main of this repository, which is only read.

param([switch]$Neu)

$ErrorActionPreference = "Stop"
$quelle = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$root = Join-Path $quelle "trial-run"
$teile = @("server.git", "ich", "kollegin")

if (-not (Test-Path (Join-Path $quelle ".git"))) { throw "szd-teiCrafter nicht gefunden unter $quelle" }
New-Item -ItemType Directory -Force $root | Out-Null

$vorhanden = $teile | Where-Object { Test-Path (Join-Path $root $_) }
if ($vorhanden -and -not $Neu) {
    Write-Host "Der Probelauf existiert schon. Mit '.\tools\trial-run\setup.ps1 -Neu' wird er verworfen und neu aufgebaut."
    exit 1
}
# Only the three named parts directly under trial-run/ are removed, never the folder itself.
foreach ($t in $vorhanden) { Remove-Item -Recurse -Force (Join-Path $root $t) -Confirm:$false }

git clone --quiet --bare --branch main $quelle (Join-Path $root "server.git")
git clone --quiet (Join-Path $root "server.git") (Join-Path $root "ich")
git clone --quiet (Join-Path $root "server.git") (Join-Path $root "kollegin")

# The colleague gets her own identity, so her commits are recognisable in the history.
git -C (Join-Path $root "kollegin") config user.name "Kollegin (Probelauf)"
git -C (Join-Path $root "kollegin") config user.email "kollegin@probelauf.invalid"

Write-Host "Probelauf eingerichtet unter $root"
Write-Host "  server.git  vertritt GitHub"
Write-Host "  ich         deine Arbeitskopie"
Write-Host "  kollegin    die Arbeitskopie einer Kollegin"
Write-Host "Weiter mit .\tools\trial-run\start.ps1"
