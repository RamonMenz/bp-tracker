$ErrorActionPreference='Stop'
$t=$null;$e=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Collect-AferiInspectorIdle.ps1'),[ref]$t,[ref]$e)
if($e.Count){throw 'inspector-idle-syntax'}
$definition=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Assert-AferiInspectorIdleSession'},$true)
Invoke-Expression $definition.Extent.Text
$valid=[pscustomobject]@{Tool='inspector-session-1';Modo='consulta';PacoteAlvo='com.ramonmenz.afericapturetest';EstadoAdb='device';ModeloConfere=$true;CoincideComCandidato=$true;Sha256Instalado='25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c'}
Assert-AferiInspectorIdleSession $valid
foreach($entry in @(@('EstadoAdb','offline'),@('CoincideComCandidato',$false),@('Sha256Instalado',('a'*64)),@('PacoteAlvo','PRIVATE'),@('ModeloConfere',$null),@('Modo','other'))){
    $bad=$valid|ConvertTo-Json|ConvertFrom-Json
    $bad.($entry[0])=$entry[1]
    $rejected=$false
    try{Assert-AferiInspectorIdleSession $bad}catch{$rejected=$_.ToString() -match 'inspector-idle-session-unexpected' -and $_.ToString() -notmatch 'PRIVATE'}
    if(-not $rejected){throw 'inspector-idle-guard-failed'}
}
'Inspector idle: syntax and package/candidate/device/session guards passed; no phone, collection or timed wait executed.'
