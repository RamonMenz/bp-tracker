# Run after the author's separate install and before opening the evaluation client.
[CmdletBinding()]
param([Parameter(Mandatory)][ValidatePattern('^[0-9a-fA-F]{64}$')][string] $ExpectedSha256)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiVoiceEvaluation.psm1') -ErrorAction Stop
$adb = Join-Path (Get-VoiceSdk) 'platform-tools/adb.exe'
Get-VoiceInstalledIdentity $adb $ExpectedSha256 | ConvertTo-Json
