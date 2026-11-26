$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Offline.psm1') -Force
$m=Get-Module AferiRoi591Offline
function Assert-O([bool]$Value){if(-not $Value){throw 'roi591-offline-fixture'}}
& $m {
    $script:f=@{Mode='ok';Removes=0;Hashes=0}
    function script:Assert-AferiRoiSource {param($Path) if($script:f.Mode -eq 'source'){throw 'fixture-source'}}
    function script:Get-AferiRoiHash {param($Path,$Hash) if($script:f.Mode -eq 'hash'){throw 'fixture-hash'} $Hash}
    function script:Get-AferiRoiInstalledIdentity {param($Adb) [pscustomobject]@{EstadoAdb='device';ModeloConfere=$true;Sha256Instalado=$(if($script:f.Mode -eq 'old'){(Get-AferiRoi591Identity).Baseline}else{(Get-AferiRoi591Identity).Candidate})}}
    & (Get-Module AferiRoi591Metro) {function script:Test-Roi591MetroSource {param($Path) $true}}
    function script:Invoke-AferiEvaluationAdbProcess {
        param($AdbPath,[string[]]$Arguments)
        $lines=@();$code=0
        switch($Arguments -join ' '){
            'shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js' {
                $script:f.Hashes++
                $hash=if($script:f.Mode -eq 'changed' -and $script:f.Hashes -gt 1){'b'*64}else{'a'*64}
                $lines=@($hash+'  files/DevLauncherApp-BridgelessReactNativeDevBundle.js')
                if($script:f.Mode -eq 'bad-hash'){$lines=@('PRIVATE')}
            }
            'reverse --list' {
                if($script:f.Removes -eq 0 -or $script:f.Mode -eq 'remains'){$lines=@('PRIVATE tcp:8097 tcp:8097')}
                if($script:f.Mode -eq 'other'){$lines+='PRIVATE tcp:8080 tcp:8080'}
                if($script:f.Mode -eq 'conflict'){$lines=@('PRIVATE tcp:8097 tcp:1234')}
            }
            'reverse --remove tcp:8097' {$script:f.Removes++;if($script:f.Mode -eq 'remove-fail'){$code=1;$lines=@('PRIVATE')}}
            default {throw 'fixture-unexpected-command'}
        }
        [pscustomobject]@{Code=$code;Lines=$lines;Errors=@()}
    }
    $prior=$env:LOCALAPPDATA
    try{
        $env:LOCALAPPDATA=[IO.Path]::GetTempPath()
        foreach($mode in @('ok','source','hash','old','bad-hash','other','conflict','remove-fail','remains','changed')){
            $script:f.Mode=$mode;$script:f.Removes=0;$script:f.Hashes=0
            try{
                $r=Initialize-AferiRoi591Offline (Join-Path $PSScriptRoot '../..')
                Assert-O ($mode -eq 'ok' -and $r.ReverseAtivosDepois -eq 0 -and $r.BundleArquivoEstavel -and -not $r.OfflineComprovado -and -not $r.CapturaSolicitada)
                Assert-O (($r|ConvertTo-Json) -notmatch 'PRIVATE|files/')
            }catch{
                if($mode -eq 'ok' -or $_.Exception.Message -match 'roi591-offline-fixture|fixture-unexpected'){throw}
                Assert-O ($script:f.Removes -eq $(if($mode -in @('remove-fail','remains','changed')){1}else{0}))
            }
        }
    }finally{$env:LOCALAPPDATA=$prior}
}
'ROI591 offline: fixed artifact, private stable bundle hash, exact reverse removal, conflicts and no network-proof claim passed (fixtures only)'
