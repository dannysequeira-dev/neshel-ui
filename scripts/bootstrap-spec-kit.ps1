# Convenience wrapper for existing Windows maintainers.
# The portable Node entrypoint is the single source of truth.
$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'bootstrap-spec-kit.mjs'
& node $scriptPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
