$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'Update-AferiInspectorEvaluation.ps1'
$tokens=$null;$errors=$null
$null=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'inspector-update-syntax-failed'}
$body=[IO.File]::ReadAllText($path).Replace('$script:AferiInspectorAdb = Join-Path $env:LOCALAPPDATA ''Android\Sdk\platform-tools\adb.exe''','$script:AferiInspectorAdb = $fixtureAdb')
$logic=[ScriptBlock]::Create($body)
$baseline='edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed'
$candidate='25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c'
$fixture=@{Mode='normal';Installs=0;Calls=0}
function Get-FileHash {
    param($LiteralPath,$Algorithm,$ErrorAction)
    if($LiteralPath -cne 'C:\dev\aferi-task07-inspector-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk' -or $Algorithm -cne 'SHA256'){throw 'fixture-wrong-file'}
    if($fixture.Mode -eq 'local-changed'){return [pscustomobject]@{Hash='a'*64}}
    [pscustomobject]@{Hash=$candidate}
}
$fixtureAdb={
    $global:LASTEXITCODE=0;$fixture.Calls++
    switch($args -join ' '){
        '-d get-state' {'device';return}
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
'Inspector update: 11 simulated scenarios passed, fixed package/USB/replace only, no-op for installed candidate and private outputs; no ADB/device executed.'
