# Load KEY=VALUE lines from an env file into the current process (no output of secrets).
param([string]$Path = ".env.production.local")
if (-not (Test-Path $Path)) { throw "Missing $Path" }
Get-Content $Path | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $eq = $line.IndexOf("=")
  if ($eq -lt 1) { return }
  $key = $line.Substring(0, $eq).Trim()
  $val = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
  [Environment]::SetEnvironmentVariable($key, $val, "Process")
}
