[CmdletBinding()]
param([Parameter(Mandatory)][string] $BuildPath)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Metro.psm1') -Force
Initialize-AferiRoi591Metro $BuildPath | ConvertTo-Json
