# Metro remains running for source verification. This removes only its known USB reverse.
[CmdletBinding()]
param([Parameter(Mandatory)][string] $BuildPath)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Offline.psm1') -Force
Initialize-AferiRoi591Offline $BuildPath | ConvertTo-Json
