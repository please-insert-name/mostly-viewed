# Startet den lokalen Server und öffnet den Browser. Kein Internet nötig.
# Aufruf: .\start.ps1   (optional: -Port 5000)
param([int]$Port = 4173)

Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wurde nicht gefunden. Bitte von https://nodejs.org installieren.' -ForegroundColor Red
    exit 1
}

$env:PORT = $Port
node server.js --open
