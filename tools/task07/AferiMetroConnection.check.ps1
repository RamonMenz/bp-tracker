$ErrorActionPreference = 'Stop'
$tokens=$null; $errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Test-AferiMetroConnection.ps1'),[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'metro-health-syntax-failed' }
$function=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Convert-AferiReverseHealth'},$true)
Invoke-Expression $function.Extent.Text
function Assert($Condition) { if(-not $Condition){throw 'metro-health-check-failed'} }
$r=Convert-AferiReverseHealth @() 0
Assert ($r.Disponivel -and $r.Reverse8097Conhecido -eq 0 -and -not $r.Conflito8097)
$r=Convert-AferiReverseHealth @('PRIVATE tcp:8097 tcp:8097') 0
Assert ($r.Reverse8097Conhecido -eq 1 -and $r.OutrasLinhas -eq 0)
$r=Convert-AferiReverseHealth @('PRIVATE tcp:8097 tcp:1234','PRIVATE tcp:1234 tcp:1234') 0
Assert ($r.Conflito8097 -and $r.OutrasLinhas -eq 2)
$r=Convert-AferiReverseHealth @('PRIVATE failure') 1
Assert (-not $r.Disponivel -and $null -eq $r.Reverse8097Conhecido)
Assert (-not ($r | ConvertTo-Json).Contains('PRIVATE'))
'Metro health: syntax and reverse empty/known/conflict/unavailable/private-output cases passed; no network or device queried.'
