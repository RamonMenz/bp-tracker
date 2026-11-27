# Read-only status for the evaluation Metro and a single USB device.
[CmdletBinding()]
param([Parameter(Mandatory)][string] $BuildPath)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiVoiceEvaluation.psm1') -ErrorAction Stop
$adb = Join-Path (Get-VoiceSdk) 'platform-tools/adb.exe'
try { $demo = (Resolve-Path -LiteralPath (Join-Path $BuildPath 'demos/android-voice')).Path }
catch { throw 'voice-metro-source-unavailable' }
Get-VoiceMetroHealth $adb $demo | ConvertTo-Json -Depth 4
