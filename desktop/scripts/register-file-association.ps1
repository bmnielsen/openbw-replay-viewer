$ErrorActionPreference = 'Stop'

$desktopRoot = Split-Path -Parent $PSScriptRoot
$config = Get-Content -LiteralPath (Join-Path $desktopRoot 'neutralino.config.json') -Raw | ConvertFrom-Json
$displayName = $config.applicationName
$releaseDir = Join-Path $desktopRoot 'dist/replay-viewer-desktop'
$executable = Join-Path $releaseDir 'replay-viewer-desktop-win_x64.exe'
foreach ($file in @($executable, (Join-Path $releaseDir 'resources.neu'))) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Build the desktop viewer before registering it: missing $file"
    }
}

$progId = 'Applications\replay-viewer-desktop-win_x64.exe'
$classes = 'HKCU:\Software\Classes'
# Windows can retain either viewer ProgID as its protected UserChoice.
# Repair both owned registrations without rewriting the UserChoice hash.
foreach ($viewerProgId in @($progId, 'rep_auto_file')) {
    $commandKey = "$classes\$viewerProgId\shell\open\command"
    New-Item -Path $commandKey -Force | Out-Null
    Set-Item -LiteralPath $commandKey -Value ('"{0}" "%1"' -f $executable)
    New-ItemProperty -Path "$classes\$viewerProgId" -Name 'FriendlyAppName' -Value $displayName -PropertyType String -Force | Out-Null
}
New-Item -Path "$classes\.rep" -Force | Out-Null
Set-Item -LiteralPath "$classes\.rep" -Value $progId
New-Item -Path "$classes\.rep\OpenWithProgids" -Force | Out-Null
New-ItemProperty -Path "$classes\.rep\OpenWithProgids" -Name $progId -Value '' -PropertyType String -Force | Out-Null
# Tell Explorer to discard cached association information.
if (!('ReplayViewer.AssociationNotifications' -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
namespace ReplayViewer {
    public static class AssociationNotifications {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(uint eventId, uint flags, IntPtr item1, IntPtr item2);
    }
}
"@
}
[ReplayViewer.AssociationNotifications]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
Write-Output "Registered .rep viewer: $executable"
