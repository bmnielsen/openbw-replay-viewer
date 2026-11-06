$ErrorActionPreference = 'Stop'
$desktopRoot = Split-Path -Parent $PSScriptRoot
$expected = Join-Path $desktopRoot 'dist\replay-viewer-desktop\replay-viewer-desktop-win_x64.exe'
$expectedCommand = '"{0}" "%1"' -f $expected
foreach ($progId in @('Applications\replay-viewer-desktop-win_x64.exe', 'rep_auto_file')) {
    $friendlyName = (Get-Item -LiteralPath "Registry::HKEY_CLASSES_ROOT\$progId").GetValue('FriendlyAppName')
    if ($friendlyName -ne 'StarCraft Replay Viewer') { throw "Wrong $progId display name: $friendlyName" }
    $actual = (Get-Item -LiteralPath "Registry::HKEY_CLASSES_ROOT\$progId\shell\open\command").GetValue('')
    if ($actual -ne $expectedCommand) { throw "Stale $progId command: $actual" }
}
$choice = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.rep\UserChoice' -ErrorAction SilentlyContinue).ProgId
if (!$choice) { $choice = (Get-Item 'Registry::HKEY_CLASSES_ROOT\.rep').GetValue('') }
$actual = (Get-Item -LiteralPath "Registry::HKEY_CLASSES_ROOT\$choice\shell\open\command").GetValue('')
if ($actual -ne $expectedCommand) { throw "Effective .rep choice $choice does not launch the maintained viewer: $actual" }
if (!(Test-Path -LiteralPath $expected)) { throw "Associated executable does not exist" }
Write-Output "Both viewer registrations are named StarCraft Replay Viewer, and effective .rep choice ($choice) launches the maintained executable."
