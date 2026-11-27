# Phase defaults to inspection. Install is explicit; no opening, capture or destructive recovery.
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $BuildPath,
    [Parameter(Mandatory)][string] $PreviousApkPath,
    [ValidateSet('Inspect','Install')][string] $Phase = 'Inspect'
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Update.psm1') -Force
Invoke-AferiRoi591Update -BuildPath $BuildPath -PreviousApkPath $PreviousApkPath -Phase $Phase | ConvertTo-Json -Depth 6
