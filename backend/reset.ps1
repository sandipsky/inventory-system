$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$dbPath = Join-Path $root 'inventory_system.db'
$sqlPath = Join-Path $root 'database.sql'
$sqliteExe = Join-Path $root 'sqlite3.exe'

if (Test-Path $dbPath) {
    Remove-Item $dbPath -Force
    Write-Host "Deleted existing $dbPath"
}

New-Item -ItemType File -Path $dbPath | Out-Null
Write-Host "Created $dbPath"

& $sqliteExe $dbPath ".read '$sqlPath'"
if ($LASTEXITCODE -ne 0) { throw "sqlite3 failed with exit code $LASTEXITCODE" }
Write-Host "Loaded schema from $sqlPath"
