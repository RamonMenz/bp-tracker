# Fixtures only. Never calls aapt2/apksigner/apkanalyzer/ADB or installs an APK.
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Update.psm1') -Force
$module=Get-Module AferiRoi591Update
function Assert-U([bool]$Value) { if (-not $Value) { throw 'roi591-update-fixture' } }
function Reject-U([scriptblock]$Action,[string]$Expected) {
    try { &$Action | Out-Null } catch { Assert-U ($_.Exception.Message -ceq $Expected); return }
    throw 'roi591-update-fixture-invalid-accepted'
}
& $module {
    Assert-U ($null -ne (Get-Module AferiManifestMetadata))
    & (Get-Module AferiManifestMetadata) {
        function script:Invoke-AferiAapt2([string]$Program,[string]$Arguments) {
            Assert-U ($Program -ceq 'fixture-aapt' -and $Arguments -ceq 'dump badging "fixture file.apk"')
            [pscustomobject]@{Code=0;Lines=@("package: name='com.ramonmenz.afericapturetest' versionCode='1' versionName='0.1.0'")}
        }
    }
    $wrapped=Get-AferiRoiVersion 'fixture-aapt' 'fixture file.apk'
    Assert-U ($wrapped.Code -eq 1 -and $wrapped.Name -ceq '0.1.0')
    $v=ConvertFrom-AferiRoiVersion @("package: name='com.ramonmenz.afericapturetest' versionCode='1' versionName='0.1.0' platformBuildVersionName='36'")
    Assert-U ($v.Code -eq 1 -and $v.Name -ceq '0.1.0')
    foreach ($lines in @(@(),@('PRIVATE'),@("package: name='PRIVATE' versionCode='1' versionName='0.1.0'"),
        @("package: name='com.ramonmenz.afericapturetest' versionCode='1' versionName='PRIVATE'"),
        @("package: name='com.ramonmenz.afericapturetest' versionCode='0' versionName='0.1.0'"))) {
        Reject-U { ConvertFrom-AferiRoiVersion $lines } 'roi591-version-unrecognized'
    }
    $script:f=@{Mode='ok'; Installs=0; Queries=0; Hashes=0}
    function script:Assert-AferiRoiSource { param($BuildPath) if($script:f.Mode -eq 'source'){throw 'fixture-source'} }
    function script:Get-AferiRoiHash {
        param($Path,$Expected)
        $id=Get-AferiRoi591Identity
        Assert-U ($Expected -ceq $(if($Path -ceq 'old.apk'){$id.Baseline}else{$id.Candidate}))
        $script:f.Hashes++
        if($script:f.Mode -eq 'hash' -or ($script:f.Mode -eq 'hash-late' -and $script:f.Hashes -gt 4)){throw 'fixture-hash'}
        $Expected
    }
    function script:Get-Content { param($LiteralPath) 'EX_DEV_CLIENT_NETWORK_INSPECTOR=false' }
    function script:Assert-AferiRoiProperty { param($Lines) if($script:f.Mode -eq 'property'){throw 'fixture-property'} }
    function script:Get-AferiManifestMetadata {
        param($Aapt2Path,$ApkPath,$ExpectedSha256)
        $m=[pscustomobject]@{Pacote='com.ramonmenz.afericapturetest';Sdk=[pscustomobject]@{minSdkVersion='24';targetSdkVersion='36'}
            Aplicacao=[pscustomobject]@{allowBackup='false';debuggable='true';usesCleartextTraffic='true'}
            PermissoesDeclaradas=@([pscustomobject]@{Permissao='android.permission.CAMERA'},[pscustomobject]@{Permissao='android.permission.INTERNET'})}
        if($script:f.Mode -eq 'manifest'){$m.Pacote='PRIVATE'}
        if($script:f.Mode -eq 'permissions'){$m.PermissoesDeclaradas+= [pscustomobject]@{Permissao='android.permission.RECORD_AUDIO'}}
        [pscustomobject]@{Manifesto=$m}
    }
    function script:Get-AferiBackupMetadata { param($Aapt2Path,$ApkPath,$ExpectedSha256) [pscustomobject]@{AllowBackup='false';ReferenciasConferidas=($script:f.Mode -ne 'backup')} }
    function script:Get-AferiRoiVersion {
        param($Aapt2,$Apk)
        [pscustomobject]@{Code=$(if($Apk -ceq 'old.apk' -and $script:f.Mode -eq 'downgrade'){2}else{1}); Name=$(if($script:f.Mode -eq 'version'){'OTHER'}else{'0.1.0'})}
    }
    function script:Get-AferiRoiUpdateSignatures {
        param($OldApk,$NewApk)
        $id=Get-AferiRoi591Identity
        [pscustomobject]@{AssinaturasVerificadas=$true;CertificadosIguais=($script:f.Mode -ne 'signatures');Sha256Anterior=$id.Baseline;Sha256Novo=$id.Candidate}
    }
    function script:Get-AferiRoiBytecodeStatus {
        param($Sdk,$Apk,[switch]$NativeConstants)
        if($script:f.Mode -eq 'bytecode'){return 'formato-nao-reconhecido'}
        if($NativeConstants){return 'frame-transform-roi1-limite5760000'}
        'metodo-build-sem-injecao-expo'
    }
    function script:Get-AferiRoiInstalledIdentity {
        param($Adb)
        $script:f.Queries++
        $id=Get-AferiRoi591Identity
        $state='device';$model=$true;$hash=$id.Baseline
        if($script:f.Mode -eq 'already' -or $script:f.Installs -gt 0){$hash=$id.Candidate}
        if($script:f.Mode -eq 'unknown' -or ($script:f.Mode -eq 'changed' -and $script:f.Queries -gt 1) -or ($script:f.Mode -eq 'post' -and $script:f.Installs -gt 0)){$hash='a'*64}
        if($script:f.Mode -in @('offline','multiple-usb','unauthorized','no-usb')){$state=$script:f.Mode;$hash=$null;$model=$null}
        if($script:f.Mode -eq 'model'){$model=$false}
        [pscustomobject]@{EstadoAdb=$state;ModeloConfere=$model;Sha256Instalado=$hash}
    }
    function script:Invoke-AferiEvaluationAdbProcess {
        param($AdbPath,[string[]]$Arguments)
        Assert-U ($Arguments.Count -eq 3 -and $Arguments[0] -ceq 'install' -and $Arguments[1] -ceq '-r' -and $Arguments[2] -match 'app-debug\.apk$')
        $script:f.Installs++
        if($script:f.Mode -eq 'install-fail'){return [pscustomobject]@{Code=1;Lines=@('PRIVATE');Errors=@('PRIVATE')}}
        if($script:f.Mode -eq 'ambiguous'){return [pscustomobject]@{Code=0;Lines=@('Success','Success');Errors=@()}}
        [pscustomobject]@{Code=0;Lines=@('Performing Streamed Install','Success');Errors=@()}
    }
    $prior=$env:LOCALAPPDATA
    try {
        $env:LOCALAPPDATA=[IO.Path]::GetTempPath()
        foreach($mode in @('ok','already','unknown','offline','multiple-usb','unauthorized','no-usb','model')){
            $script:f.Mode=$mode;$script:f.Installs=0;$script:f.Queries=0;$script:f.Hashes=0
            $r=Invoke-AferiRoi591Update -BuildPath 'fixture' -PreviousApkPath 'old.apk'
            Assert-U ($r.Fase -ceq 'Inspect' -and -not $r.InstalacaoExecutada -and $script:f.Installs -eq 0 -and -not $r.AplicativoAberto -and -not $r.HabilitacaoClinica)
            Assert-U ($r.AtualizacaoDeAvaliacaoPermitida -eq ($mode -in @('ok','already')))
        }
        $cases=@{source='fixture-source';hash='fixture-hash';'hash-late'='fixture-hash';property='fixture-property';manifest='roi591-manifest-unexpected';permissions='roi591-selected-permissions-unexpected';backup='roi591-backup-unexpected';downgrade='roi591-version-downgrade-or-unexpected';version='roi591-version-downgrade-or-unexpected';signatures='roi591-signature-unexpected';bytecode='roi591-bytecode-not-confirmed';unknown='roi591-installed-baseline-unexpected-preserve';offline='roi591-installed-baseline-unexpected-preserve';'multiple-usb'='roi591-installed-baseline-unexpected-preserve';unauthorized='roi591-installed-baseline-unexpected-preserve';'no-usb'='roi591-installed-baseline-unexpected-preserve';model='roi591-installed-baseline-unexpected-preserve';changed='roi591-installed-changed-preserve'}
        foreach($mode in $cases.Keys){
            $script:f.Mode=$mode;$script:f.Installs=0;$script:f.Queries=0;$script:f.Hashes=0
            Reject-U { Invoke-AferiRoi591Update -BuildPath 'fixture' -PreviousApkPath 'old.apk' -Phase Install } $cases[$mode]
            Assert-U ($script:f.Installs -eq 0)
        }
        foreach($mode in @('ok','already')){
            $script:f.Mode=$mode;$script:f.Installs=0;$script:f.Queries=0;$script:f.Hashes=0
            $r=Invoke-AferiRoi591Update -BuildPath 'fixture' -PreviousApkPath 'old.apk' -Phase Install
            Assert-U ($r.CoincideComCandidato -and $r.InstalacaoExecutada -eq ($mode -ceq 'ok') -and -not $r.AplicativoAberto -and -not $r.CapturaSolicitada -and -not $r.HabilitacaoClinica)
            Assert-U (($r|ConvertTo-Json -Depth 6) -notmatch 'PRIVATE|old.apk|/data/app/')
        }
        foreach($mode in @('install-fail','ambiguous','post')){
            $script:f.Mode=$mode;$script:f.Installs=0;$script:f.Queries=0;$script:f.Hashes=0
            $expected=if($mode -ceq 'post'){'roi591-post-install-not-confirmed-use-inspect'}else{'roi591-install-not-confirmed-use-inspect'}
            Reject-U { Invoke-AferiRoi591Update -BuildPath 'fixture' -PreviousApkPath 'old.apk' -Phase Install } $expected
            Assert-U ($script:f.Installs -eq 1) # No retry, clear or uninstall on failure.
        }
    } finally {$env:LOCALAPPDATA=$prior}
}
$entry=Join-Path $PSScriptRoot 'Update-AferiRoi591Evaluation.ps1'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($entry,[ref]$tokens,[ref]$errors)
Assert-U ($errors.Count -eq 0 -and $ast.ParamBlock.Parameters.Count -eq 3)
$bad=$false
try { &$entry -BuildPath 'fixture' -PreviousApkPath 'old.apk' -Phase Unsafe } catch { $bad=$_.FullyQualifiedErrorId -match 'ParameterArgumentValidation' }
Assert-U $bad
'ROI591 update: exact identities, static gates, no downgrade, inspect/no-op/install, changed baseline and private failure recovery passed (fixtures only)'
