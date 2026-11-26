# Restricted evaluation update. Native output and private APK paths never leave this module.
Import-Module (Join-Path $PSScriptRoot 'AferiRoiCandidate.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Readiness.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot '../task07/AferiManifestMetadata.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot '../task07/AferiEvaluationAdb.psm1') -ErrorAction Stop

function ConvertFrom-AferiRoiVersion([object[]] $Lines) {
    $packages = @($Lines | Where-Object { $_ -is [string] -and $_ -cmatch '^package:' })
    if ($packages.Count -ne 1 -or $packages[0] -cnotmatch "^package: name='com\.ramonmenz\.afericapturetest' versionCode='([0-9]{1,10})' versionName='([0-9.]{1,32})'(?: |$)") {
        throw 'roi591-version-unrecognized'
    }
    $version = [long]$Matches[1]; $name = $Matches[2]
    if ($version -lt 1 -or $version -gt 2100000000) { throw 'roi591-version-unrecognized' }
    [pscustomobject]@{ Code = $version; Name = $name }
}
function Get-AferiRoiVersion([string] $Aapt2, [string] $Apk) {
    $result = & (Get-Module AferiManifestMetadata) {
        param($program,$apk)
        Invoke-AferiAapt2 $program ('dump badging "' + $apk + '"')
    } $Aapt2 $Apk
    if ($result.Code -ne 0) { throw 'roi591-version-unavailable' }
    ConvertFrom-AferiRoiVersion $result.Lines
}
function Get-AferiRoiUpdateSignatures([string] $OldApk, [string] $NewApk) {
    $id = Get-AferiRoi591Identity
    $json = & (Join-Path $PSScriptRoot '../task07/Compare-AferiApkSignatures.ps1') -OldApkPath $OldApk -OldExpectedSha256 $id.Baseline -NewApkPath $NewApk -NewExpectedSha256 $id.Candidate
    $json | ConvertFrom-Json -ErrorAction Stop
}
function Assert-AferiRoiUpdateFiles([string] $BuildPath, [string] $OldApk, [string] $NewApk) {
    $id = Get-AferiRoi591Identity
    Assert-AferiRoiSource $BuildPath
    $null = Get-AferiRoiHash $NewApk $id.Candidate
    $null = Get-AferiRoiHash $OldApk $id.Baseline
}
function Get-AferiRoiUpdateChecks([string] $BuildPath, [string] $OldApk, [string] $NewApk, [string] $Sdk) {
    $id = Get-AferiRoi591Identity
    Assert-AferiRoiUpdateFiles $BuildPath $OldApk $NewApk
    Assert-AferiRoiProperty @(Get-Content -LiteralPath (Join-Path $BuildPath 'demos/android-capture/android/gradle.properties'))
    $aapt2 = Join-Path $Sdk 'build-tools/36.0.0/aapt2.exe'
    $manifest = Get-AferiManifestMetadata -Aapt2Path $aapt2 -ApkPath $NewApk -ExpectedSha256 $id.Candidate
    $m = $manifest.Manifesto
    if ($m.Pacote -cne $id.Package -or $m.Sdk.minSdkVersion -cne '24' -or $m.Sdk.targetSdkVersion -cne '36' -or
        $m.Aplicacao.allowBackup -cne 'false' -or $m.Aplicacao.debuggable -cne 'true' -or $m.Aplicacao.usesCleartextTraffic -cne 'true') {
        throw 'roi591-manifest-unexpected'
    }
    $declared = @($m.PermissoesDeclaradas | ForEach-Object { $_.Permissao } | Sort-Object)
    if (($declared -join ',') -cne 'android.permission.CAMERA,android.permission.INTERNET') { throw 'roi591-selected-permissions-unexpected' }
    $backup = Get-AferiBackupMetadata -Aapt2Path $aapt2 -ApkPath $NewApk -ExpectedSha256 $id.Candidate
    if ($backup.AllowBackup -cne 'false' -or $backup.ReferenciasConferidas -ne $true) { throw 'roi591-backup-unexpected' }
    $oldVersion = Get-AferiRoiVersion $aapt2 $OldApk
    $newVersion = Get-AferiRoiVersion $aapt2 $NewApk
    if ($newVersion.Name -cne '0.1.0' -or $newVersion.Code -lt $oldVersion.Code) { throw 'roi591-version-downgrade-or-unexpected' }
    $signatures = Get-AferiRoiUpdateSignatures $OldApk $NewApk
    if ($signatures.AssinaturasVerificadas -ne $true -or $signatures.CertificadosIguais -ne $true -or
        $signatures.Sha256Anterior -cne $id.Baseline -or $signatures.Sha256Novo -cne $id.Candidate) { throw 'roi591-signature-unexpected' }
    if ((Get-AferiRoiBytecodeStatus $Sdk $NewApk) -cne 'metodo-build-sem-injecao-expo' -or
        (Get-AferiRoiBytecodeStatus $Sdk $NewApk -NativeConstants) -cne 'frame-transform-roi1-limite5760000') { throw 'roi591-bytecode-not-confirmed' }
    Assert-AferiRoiUpdateFiles $BuildPath $OldApk $NewApk
    [pscustomobject]@{ VersionCodeAnterior = $oldVersion.Code; VersionCodeNovo = $newVersion.Code; VersionNameNovo = $newVersion.Name }
}
function Invoke-AferiRoi591Update {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string] $BuildPath, [Parameter(Mandatory)][string] $PreviousApkPath, [ValidateSet('Inspect','Install')][string] $Phase = 'Inspect')
    $id = Get-AferiRoi591Identity
    $apk = Join-Path $BuildPath 'demos/android-capture/android/app/build/outputs/apk/debug/app-debug.apk'
    $sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
    $checks = Get-AferiRoiUpdateChecks $BuildPath $PreviousApkPath $apk $sdk
    $adb = Join-Path $sdk 'platform-tools/adb.exe'
    $before = Get-AferiRoiInstalledIdentity $adb
    $known = $before.EstadoAdb -ceq 'device' -and $before.ModeloConfere -eq $true -and
        ($before.Sha256Instalado -ceq $id.Baseline -or $before.Sha256Instalado -ceq $id.Candidate)
    $attempted = $false
    $after = $before
    if ($Phase -ceq 'Install') {
        if (-not $known) { throw 'roi591-installed-baseline-unexpected-preserve' }
        Assert-AferiRoiUpdateFiles $BuildPath $PreviousApkPath $apk
        # Reconfirm the device after static work; never continue across a changed baseline.
        $fresh = Get-AferiRoiInstalledIdentity $adb
        if ($fresh.EstadoAdb -cne 'device' -or $fresh.ModeloConfere -ne $true -or $fresh.Sha256Instalado -cne $before.Sha256Instalado) { throw 'roi591-installed-changed-preserve' }
        if ($before.Sha256Instalado -cne $id.Candidate) {
            $attempted = $true
            $install = Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('install','-r',$apk)
            if ($install.Code -ne 0 -or @($install.Lines | Where-Object { $_ -is [string] -and $_.Trim() -ceq 'Success' }).Count -ne 1) {
                throw 'roi591-install-not-confirmed-use-inspect'
            }
        }
        $after = Get-AferiRoiInstalledIdentity $adb
        if ($after.EstadoAdb -cne 'device' -or $after.ModeloConfere -ne $true -or $after.Sha256Instalado -cne $id.Candidate) { throw 'roi591-post-install-not-confirmed-use-inspect' }
        Assert-AferiRoiUpdateFiles $BuildPath $PreviousApkPath $apk
    }
    [pscustomobject]@{
        Tool='roi591-update-1'; Fase=$Phase; Fonte=$id.Source; Sha256Candidato=$id.Candidate; Pacote=$id.Package
        Verificacoes=$checks; InstaladoAntes=$before; InstaladoDepois=$after
        AtualizacaoDeAvaliacaoPermitida=$known; InstalacaoExecutada=$attempted
        CoincideComCandidato=($after.Sha256Instalado -ceq $id.Candidate)
        AplicativoAberto=$false; CapturaSolicitada=$false; HabilitacaoClinica=$false
    }
}
Export-ModuleMember -Function Invoke-AferiRoi591Update
