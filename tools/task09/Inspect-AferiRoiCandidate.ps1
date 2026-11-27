# Read-only static inspection. Explicit identities for BOTH APKs; no historical defaults.
param(
    [Parameter(Mandatory)][string] $BuildPath,
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-fA-F]{64}$')][string] $ExpectedSha256,
    [Parameter(Mandatory)][string] $PreviousApkPath,
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-fA-F]{64}$')][string] $PreviousExpectedSha256
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoiCandidate.psm1') -Force
Assert-AferiRoiSource $BuildPath
$android = Join-Path $BuildPath 'demos\android-capture\android'
Assert-AferiRoiProperty @(Get-Content -LiteralPath (Join-Path $android 'gradle.properties'))
$apk = Join-Path $android 'app\build\outputs\apk\debug\app-debug.apk'
$hash = Get-AferiRoiHash $apk $ExpectedSha256
$priorTools = Join-Path $PSScriptRoot '..\task07'
Import-Module (Join-Path $priorTools 'AferiManifestMetadata.psm1') -Force
$aapt2 = Join-Path $env:LOCALAPPDATA 'Android\Sdk\build-tools\36.0.0\aapt2.exe'
$manifest = Get-AferiManifestMetadata -Aapt2Path $aapt2 -ApkPath $apk -ExpectedSha256 $hash
$backup = Get-AferiBackupMetadata -Aapt2Path $aapt2 -ApkPath $apk -ExpectedSha256 $hash
# Certificates and private paths stay local; the helper only emits booleans and APK hashes.
$signatureJson = & (Join-Path $priorTools 'Compare-AferiApkSignatures.ps1') -OldApkPath $PreviousApkPath -OldExpectedSha256 $PreviousExpectedSha256 -NewApkPath $apk -NewExpectedSha256 $hash
$signatures = $signatureJson | ConvertFrom-Json -ErrorAction Stop
Assert-AferiRoiSource $BuildPath
$null = Get-AferiRoiHash $apk $ExpectedSha256
[pscustomobject]@{
    Tool = 'roi-inspect-1'; Fonte = Get-AferiRoiSource; FonteLimpa = $true; Sha256ApkNovo = $hash
    Manifesto = $manifest; Backup = $backup; Assinaturas = $signatures
    InspectorFalseNoGradleProperties = $true; BytecodeInspecionado = $false
    InstaladoReconfirmado = $false; AtualizacaoLiberada = $false
    InstalacaoExecutada = $false; AplicativoAberto = $false
} | ConvertTo-Json -Depth 10
