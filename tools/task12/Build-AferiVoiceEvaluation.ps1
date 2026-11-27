# Windows local build. No ADB, install, launch or separate signing command.
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-fA-F]{40}$')][string] $Commit,
    [Parameter(Mandatory)][string] $BuildPath
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiVoiceEvaluation.psm1') -ErrorAction Stop
Build-VoiceEvaluation (Join-Path $PSScriptRoot '../..') $Commit.ToLowerInvariant() $BuildPath | ConvertTo-Json -Depth 10
