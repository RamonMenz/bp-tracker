$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Metro.psm1') -Force
$module=Get-Module AferiRoi591Metro
function Assert-M([bool]$Value){if(-not $Value){throw 'roi591-metro-fixture'}}
& $module {
    foreach($bad in @(@('PRIVATE'),@('PRIVATE tcp:8097 tcp:1234'),@('PRIVATE tcp:8097 tcp:8097','PRIVATE tcp:8097 tcp:8097'))){
        $rejected=$false;try{Get-Roi591Reverse $bad 0|Out-Null}catch{$rejected=$true}
        Assert-M $rejected
    }
    $script:f=@{Mode='ok';Sets=0;Calls=0}
    function script:Assert-AferiRoiSource {param($Path) if($script:f.Mode -eq 'source'){throw 'fixture-source'}}
    function script:Get-AferiRoiHash {param($Path,$Hash) if($script:f.Mode -eq 'hash'){throw 'fixture-hash'} $Hash}
    function script:Test-Roi591MetroSource {param($Path) $script:f.Mode -ne 'http'}
    function script:Get-AferiRoiInstalledIdentity {
        param($Adb)
        $id=Get-AferiRoi591Identity
        [pscustomobject]@{EstadoAdb='device';ModeloConfere=$true;Sha256Instalado=$(if($script:f.Mode -eq 'baseline'){$id.Baseline}else{$id.Candidate})}
    }
    function script:Invoke-AferiEvaluationAdbProcess {
        param($AdbPath,[string[]]$Arguments)
        $script:f.Calls++
        switch($Arguments -join ' '){
            'reverse --list' {
                $lines=@('PRIVATE tcp:8080 tcp:8080')
                if($script:f.Mode -eq 'conflict'){$lines+='PRIVATE tcp:8097 tcp:1234'}
                elseif($script:f.Mode -eq 'known' -or $script:f.Sets -gt 0){$lines+='PRIVATE tcp:8097 tcp:8097'}
                return [pscustomobject]@{Code=0;Lines=$lines}
            }
            'reverse tcp:8097 tcp:8097' {$script:f.Sets++;return [pscustomobject]@{Code=0;Lines=@('8097')}}
            default {throw 'fixture-unexpected-action'}
        }
    }
    $prior=$env:LOCALAPPDATA
    try{
        $env:LOCALAPPDATA=[IO.Path]::GetTempPath()
        foreach($mode in @('ok','known','source','hash','http','baseline','conflict')){
            $script:f.Mode=$mode;$script:f.Sets=0;$script:f.Calls=0
            try{
                $r=Initialize-AferiRoi591Metro (Join-Path $PSScriptRoot '../..')
                Assert-M ($mode -in @('ok','known'))
                Assert-M ($r.OutrasLinhas -eq 1 -and $r.Reverse8097Conhecido -eq 1 -and -not $r.AberturaSolicitada -and -not $r.InstalacaoExecutada -and -not $r.CapturaSolicitada)
                Assert-M (($r|ConvertTo-Json) -notmatch 'PRIVATE')
                Assert-M ($script:f.Sets -eq $(if($mode -eq 'known'){0}else{1}))
            }catch{if($mode -in @('ok','known') -or $_.Exception.Message -match 'fixture-unexpected|roi591-metro-fixture'){throw};Assert-M ($script:f.Sets -eq 0)}
        }
    }finally{$env:LOCALAPPDATA=$prior}
}
'ROI591 Metro: source/hash/health/installed gates, reverse conflict/reuse/preservation and private output passed (fixtures; no HTTP/ADB)'
