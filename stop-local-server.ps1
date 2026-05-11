$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateDir = Join-Path $repoRoot '.local-server'
$pidFile = Join-Path $stateDir 'http-server.pid.json'

if (!(Test-Path $pidFile)) {
  Write-Output 'Local replay viewer server is not running.'
  exit 0
}

$info = Get-Content $pidFile -Raw | ConvertFrom-Json
$serverPid = [int]$info.pid

if (Get-Process -Id $serverPid -ErrorAction SilentlyContinue) {
  Stop-Process -Id $serverPid -Force
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Output "Stopped local replay viewer server (PID $serverPid)"
