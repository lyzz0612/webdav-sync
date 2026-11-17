param(
  [ValidateSet('installer','portable','dir','all')]
  [string]$Mode = 'installer'
)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$env:ELECTRON_RUN_AS_NODE = $null

Write-Host '==> Installing dependencies' -ForegroundColor Cyan
pnpm install

Write-Host '==> Building frontend' -ForegroundColor Cyan
pnpm run build

switch ($Mode) {
  'installer' { pnpm exec electron-builder --win nsis }
  'portable'  { pnpm exec electron-builder --win portable }
  'dir'       { pnpm exec electron-builder --win dir }
  'all'       { pnpm exec electron-builder --win }
}

Write-Host "==> Done. Output: $(Join-Path (Get-Location) 'release')" -ForegroundColor Green
