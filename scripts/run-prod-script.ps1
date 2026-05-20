# Run a tsx script against Vercel production DATABASE_URL.
# Usage: powershell -File scripts/run-prod-script.ps1 find-tg-artifacts.ts [-- extra args]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Script,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ExtraArgs
)
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root
. (Join-Path $PSScriptRoot "load-env-file.ps1") -Path ".env.production.local"
$scriptPath = Join-Path $Root "scripts" $Script
if (-not (Test-Path $scriptPath)) { throw "Script not found: $scriptPath" }
& npx tsx $scriptPath @ExtraArgs
