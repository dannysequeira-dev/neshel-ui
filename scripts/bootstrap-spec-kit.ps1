# Official Spec Kit bootstrap for a non-empty Neshel-UI repository.
# PowerShell 7 recommended. Does NOT install the CLI automatically.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$constitutionFile = Join-Path $repoRoot '.specify/memory/constitution.md'

if (-not (Get-Command specify -ErrorAction SilentlyContinue)) {
  throw 'Spec Kit CLI not found. Run: uv tool install specify-cli; then: specify version'
}

$constitutionBackup = $null
if (Test-Path $constitutionFile) {
  $constitutionBackup = [System.IO.File]::ReadAllText($constitutionFile)
}

Push-Location $repoRoot
try {
  & specify init --here --force --non-interactive --integration claude --script ps --ignore-agent-tools
  if ($LASTEXITCODE -ne 0) { throw "Spec Kit setup failed (exit $LASTEXITCODE)." }
}
finally {
  if ($null -ne $constitutionBackup) {
    [System.IO.File]::WriteAllText($constitutionFile, $constitutionBackup)
  }
  Pop-Location
}
Write-Host 'Spec Kit initialized. Review git diff and inspect .claude/skills and .specify/scripts/powershell.'
