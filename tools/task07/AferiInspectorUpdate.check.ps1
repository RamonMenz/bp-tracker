$ErrorActionPreference = 'Stop'
if(-not $env:LOCALAPPDATA){$env:LOCALAPPDATA=[IO.Path]::GetTempPath()}
$path = Join-Path $PSScriptRoot 'Update-AferiInspectorEvaluation.ps1'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'inspector-update-syntax-failed'}
$attributeNames=@($ast.ParamBlock.Attributes|ForEach-Object{$_.TypeName.FullName})
if($attributeNames -notcontains 'CmdletBinding'){throw 'inspector-update-strict-parameters-required'}
$badParameterRejected=$false
try{ & $path -ReadOnlyBogus | Out-Null }
catch{$badParameterRejected=$_.FullyQualifiedErrorId -match 'NamedParameterNotFound'}
if(-not $badParameterRejected){throw 'inspector-update-unknown-parameter-accepted'}

$moduleFixturePath=Join-Path $PSScriptRoot 'AferiEvaluationAdb.psm1'
$body=[IO.File]::ReadAllText($path)
$definition=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-AferiInspectorAdb'},$true)
$mock = @'
function Invoke-AferiInspectorAdb {
    param([string[]]$Arguments,[switch]$Server)
    if($Server){ $prefix=@() }else{ $prefix=@('-d') }
    $lines=@(& $fixtureAdb @prefix @Arguments)
    [pscustomobject]@{ Lines=$lines; Code=$LASTEXITCODE; Errors=@() }
}
'@
$body=$body.Replace($definition.Extent.Text,$mock)
$body=$body.Replace("Import-Module (Join-Path `$PSScriptRoot 'AferiEvaluationAdb.psm1')", 'Import-Module $moduleFixturePath')
$logic=[ScriptBlock]::Create($body)
$baseline='edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed'
$candidate='25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c'
$fixture=@{Mode='normal';Installs=0;Calls=0;ReverseMode='empty';ReverseSets=0}
function Get-FileHash {
    param($LiteralPath,$Algorithm,$ErrorAction)
    if($LiteralPath -cne 'C:\dev\aferi-task07-inspector-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk' -or $Algorithm -cne 'SHA256'){throw 'fixture-wrong-file'}
    if($fixture.Mode -eq 'local-changed'){return [pscustomobject]@{Hash='a'*64}}
    [pscustomobject]@{Hash=$candidate}
}
$fixtureAdb={
    $global:LASTEXITCODE=0;$fixture.Calls++
    switch($args -join ' '){
        'start-server' {return}
        '-d get-state' {if($fixture.Mode -eq 'unauthorized'){$global:LASTEXITCODE=1;'error: device unauthorized';return};'device';return}
        '-d shell getprop ro.product.model' {if($fixture.Mode -eq 'model'){'OTHER'}else{'SM-S731B'};return}
        '-d shell pm path com.ramonmenz.afericapturetest' {
            if($fixture.Mode -eq 'split'){'package:/data/app/fixture/split.apk'}
            if($fixture.Mode -eq 'injection'){'package:/data/app/PRIVATE;base.apk';return}
            if($fixture.Mode -eq 'traversal'){'package:/data/app/../fixture/base.apk';return}
            'package:/data/app/fixture/base.apk';return
        }
        '-d shell run-as com.ramonmenz.afericapturetest sha256sum /data/app/fixture/base.apk' {
            if($fixture.Mode -eq 'malformed'){'PRIVATE';return}
            if($fixture.Mode -eq 'already' -or ($fixture.Installs -gt 0 -and $fixture.Mode -ne 'post-other')){$h=$candidate}
            elseif($fixture.Mode -in @('unknown','post-other') -and ($fixture.Installs -gt 0 -or $fixture.Mode -eq 'unknown')){$h='a'*64}
            else{$h=$baseline}
            $h+'  /data/app/fixture/base.apk';return
        }
        '-d install -r C:\dev\aferi-task07-inspector-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk' {
            $fixture.Installs++
            if($fixture.Mode -eq 'install-failed'){$global:LASTEXITCODE=1;'PRIVATE';return}
            'Performing Streamed Install';'Success';return
        }
        '-d reverse --list' {
            switch($fixture.ReverseMode){
                'other' {'PRIVATE tcp:8080 tcp:8080'}
                'conflict' {'PRIVATE tcp:8097 tcp:1234'}
                'bad-format' {'PRIVATE invalid'}
                'query-failed' {$global:LASTEXITCODE=1;'PRIVATE'}
            }
            return
        }
        '-d reverse tcp:8097 tcp:8097' {
            $fixture.ReverseSets++
            if($fixture.ReverseMode -eq 'set-failed'){$global:LASTEXITCODE=1;'PRIVATE'}else{'8097'}
            return
        }
        default {throw 'fixture-unexpected-command'}
    }
}.GetNewClosure()
foreach($mode in @('normal','already','post-other','local-changed','model','split','injection','traversal','unknown','malformed','install-failed')){
    $fixture.Mode=$mode;$fixture.Installs=0;$fixture.Calls=0
    $valid=$mode -in @('normal','already','post-other')
    try{
        $raw=&$logic
        if(-not $valid -or $raw -match 'PRIVATE|/data/app/'){throw 'fixture-unexpected-output'}
        $r=$raw|ConvertFrom-Json
        if($r.CoincideComCandidato -ne ($mode -ne 'post-other') -or $r.CandidatoJaEstavaInstalado -ne ($mode -eq 'already') -or $fixture.Installs -ne $(if($mode -eq 'already'){0}else{1})){throw 'fixture-wrong-result'}
    }catch{
        if($valid -or $_.ToString() -match 'fixture-|PRIVATE|/data/app/'){throw}
        if($mode -ne 'install-failed' -and $fixture.Installs -ne 0){throw 'fixture-unsafe-install'}
        if($mode -eq 'local-changed' -and $fixture.Calls -ne 0){throw 'fixture-device-before-local-guard'}
    }
}

foreach($mode in @('normal','already','unknown','unauthorized','local-changed')){
    $fixture.Mode=$mode;$fixture.Installs=0;$fixture.Calls=0
    $raw=&$logic -ReadOnly
    $r=$raw|ConvertFrom-Json
    if($fixture.Installs -ne 0 -or $r.InstalacaoExecutada -or $r.Modo -cne 'consulta' -or $raw -match 'PRIVATE|/data/app/'){throw 'fixture-readonly-mutated-or-private'}
    if($mode -eq 'unauthorized' -and ($r.EstadoAdb -cne 'unauthorized' -or $null -ne $r.Sha256Instalado)){throw 'fixture-state-unobserved-hash'}
    if($mode -in @('normal','local-changed') -and -not $r.CoincideComAnterior){throw 'fixture-readonly-baseline'}
    if($mode -eq 'already' -and -not $r.CoincideComCandidato){throw 'fixture-readonly-candidate'}
}
$stateFunction=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-AferiInspectorDeviceState'},$true)
Invoke-Expression $stateFunction.Extent.Text
foreach($entry in @(@('offline','error: device offline'),@('no-usb','error: no devices/emulators found'),@('multiple-usb','error: more than one device/emulator'),@('adb-error','PRIVATE'))){
    $r=Get-AferiInspectorDeviceState ([pscustomobject]@{Code=1;Lines=@();Errors=@($entry[1])})
    if($r -cne $entry[0]){throw 'fixture-state-category'}
}
$fixture.Mode='already';$fixture.Calls=0;$fixture.Installs=0
$rejected=$false
try{&$logic -ReadOnly -PrepareMetro|Out-Null}catch{$rejected=$_.ToString() -match 'inspector-mode-conflict'}
if(-not $rejected -or $fixture.Calls -ne 0){throw 'fixture-conflicting-modes-executed'}
foreach($mode in @('empty','other','conflict','bad-format','query-failed','set-failed')){
    $fixture.Mode='already';$fixture.ReverseMode=$mode;$fixture.ReverseSets=0;$fixture.Installs=0
    $valid=$mode -in @('empty','other')
    try{
        $raw=&$logic -PrepareMetro
        if(-not $valid -or $raw -match 'PRIVATE'){throw 'fixture-reverse-unexpected-output'}
        $r=$raw|ConvertFrom-Json
        if(-not $r.Reverse8097Configurado -or $r.InstalacaoExecutada -or $fixture.Installs -ne 0 -or $fixture.ReverseSets -ne 1){throw 'fixture-reverse-unsafe'}
    }catch{
        if($valid -or $_.ToString() -match 'fixture-|PRIVATE'){throw}
        if($mode -ne 'set-failed' -and $fixture.ReverseSets -ne 0){throw 'fixture-reverse-conflict-overwritten'}
    }
}
$fixture.Mode='normal';$fixture.ReverseSets=0;$fixture.Installs=0
$rejected=$false
try{&$logic -PrepareMetro|Out-Null}catch{$rejected=$_.ToString() -match 'inspector-metro-candidate-unexpected'}
if(-not $rejected -or $fixture.ReverseSets -ne 0 -or $fixture.Installs -ne 0){throw 'fixture-reverse-wrong-candidate'}
'Inspector update: update guards, no-op, read-only recovery and private state categories passed; no ADB/device executed.'

# Exercise real Process stdout/stderr separation with a dummy executable on Linux CI.
if($env:OS -ne 'Windows_NT') {
    $temp=Join-Path ([IO.Path]::GetTempPath()) ('aferi-adb-process-' + [Guid]::NewGuid().ToString('N'))
    [void](New-Item -ItemType Directory -Path $temp)
    try {
        $fakePath=Join-Path $temp 'fake-adb.exe'
        $python=@'
#!/usr/bin/env python3
import sys
args=sys.argv[1:]
if args==['start-server']:
    print('* daemon not running; starting now at tcp:5037 *',file=sys.stderr)
    print('* daemon started successfully *',file=sys.stderr)
elif args==['-d','get-state']:
    print('PRIVATE startup warning',file=sys.stderr)
    print('device')
elif args==['-d','shell','fixture-unauthorized']:
    print('error: device unauthorized PRIVATE',file=sys.stderr)
    sys.exit(1)
elif args==['-d','install','-r','C:\\dev\\file with spaces.apk']:
    print('Success')
else:
    sys.exit(9)
'@
        [IO.File]::WriteAllText($fakePath,$python)
        & chmod +x $fakePath
        if($LASTEXITCODE -ne 0){throw 'native-fixture-permissions'}
        Import-Module (Join-Path $PSScriptRoot 'AferiEvaluationAdb.psm1') -Force -ErrorAction Stop
        Invoke-Expression $definition.Extent.Text
        $script:AferiInspectorAdb=$fakePath
        $r=Invoke-AferiInspectorAdb -Arguments @('start-server') -Server
        if($r.Code -ne 0 -or $r.Lines.Count -ne 0 -or $r.Errors.Count -ne 2){throw 'native-startup-stderr-not-separated'}
        $r=Invoke-AferiInspectorAdb @('get-state')
        if($r.Code -ne 0 -or $r.Lines.Count -ne 1 -or $r.Lines[0] -cne 'device' -or $r.Errors.Count -ne 1){throw 'native-query-streams-not-separated'}
        $r=Invoke-AferiInspectorAdb @('shell','fixture-unauthorized')
        if($r.Code -ne 1 -or (Get-AferiInspectorDeviceState $r) -cne 'unauthorized'){throw 'native-failure-not-preserved'}
        $r=Invoke-AferiInspectorAdb @('install','-r','C:\dev\file with spaces.apk')
        if($r.Code -ne 0 -or $r.Lines[0] -cne 'Success'){throw 'native-argument-quoting'}
        'Native dummy-process regression passed: startup stderr, exit code and quoted path; no real ADB/device.'
    } finally {Remove-Item -LiteralPath $temp -Recurse -Force}
} else {'Native dummy-process fixture not executed on Windows; simulated checks above apply.'}
