$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateDir = Join-Path $repoRoot '.local-server'
$pidFile = Join-Path $stateDir 'http-server.pid.json'
$rootDir = Join-Path $repoRoot 'docs'
$pythonw = (Get-Command pythonw).Source

function Get-ManagedServerPid {
  if (!(Test-Path $pidFile)) {
    return $null
  }
  try {
    $info = Get-Content $pidFile -Raw | ConvertFrom-Json
    if ($info.pid -and (Get-Process -Id $info.pid -ErrorAction SilentlyContinue)) {
      return [int]$info.pid
    }
  } catch {
  }
  return $null
}

function Stop-ManagedServer {
  $serverPid = Get-ManagedServerPid
  if ($null -ne $serverPid) {
    Stop-Process -Id $serverPid -Force
    Start-Sleep -Milliseconds 500
  }
  if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
  }
}

$existing = Get-ManagedServerPid
if ($null -ne $existing) {
  Write-Output "Local replay viewer already running on http://127.0.0.1:8080/ (PID $existing)"
  exit 0
}

$listener = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $listener) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
  $cmd = [string]$proc.CommandLine
  $name = [string]$proc.Name
  $isReplaceable = $name -match '^pythonw?(\.exe)?$' -and ($cmd -match 'local_static_server\.py' -or $cmd -match 'http\.server')
  if ($isReplaceable) {
    Stop-Process -Id $listener.OwningProcess -Force
    Start-Sleep -Milliseconds 500
  } else {
    throw "Port 8080 is already in use by PID $($listener.OwningProcess) ($name). Refusing to replace it."
  }
}

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
Start-Process -FilePath $pythonw `
  -ArgumentList @(
    (Join-Path $repoRoot 'local_static_server.py'),
    '--host', '127.0.0.1',
    '--port', '8080',
    '--root', $rootDir,
    '--state-dir', $stateDir
  ) `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden | Out-Null

for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 250
  try {
    $response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8080/' -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $serverPid = Get-ManagedServerPid
      Write-Output "Local replay viewer running on http://127.0.0.1:8080/ (PID $serverPid)"
      exit 0
    }
  } catch {
  }
}

throw 'Timed out waiting for local replay viewer server to start.'
