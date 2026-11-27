$ErrorActionPreference = 'Stop'
function Assert($Condition) { if(-not $Condition){throw 'inspector-build-check-failed'} }
$tokens=$null; $errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Build-AferiInspectorEvaluation.ps1'),[ref]$tokens,[ref]$errors)
Assert ($errors.Count -eq 0)
$definition=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-AferiInspectorProperty'},$true)
Invoke-Expression $definition.Extent.Text
Assert-AferiInspectorProperty @('unrelated=kept','EX_DEV_CLIENT_NETWORK_INSPECTOR=false')
foreach($lines in @(@(),@('EX_DEV_CLIENT_NETWORK_INSPECTOR=true'),@('EX_DEV_CLIENT_NETWORK_INSPECTOR=false','EX_DEV_CLIENT_NETWORK_INSPECTOR=false'),@('PRIVATE'))) {
    $rejected=$false
    try { Assert-AferiInspectorProperty $lines }
    catch { $rejected=$true;Assert (-not $_.ToString().Contains('PRIVATE')) }
    Assert $rejected
}

$commandDefinition=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-AferiLocalBuildCommand'},$true)
Invoke-Expression $commandDefinition.Extent.Text
$program=(Get-Process -Id $PID).Path
Invoke-AferiLocalBuildCommand $program @('-NoLogo','-NoProfile','-Command','[Console]::Error.WriteLine("fixture-warning"); exit 0') 'fixture-command-failed'
$rejected=$false
try { Invoke-AferiLocalBuildCommand $program @('-NoLogo','-NoProfile','-Command','exit 7') 'expected-native-failure' }
catch { $rejected=$_.ToString() -match 'expected-native-failure' }
Assert $rejected
'Inspector build: syntax, strict property and native exit-code/warning checks passed; full build/ADB not executed.'

