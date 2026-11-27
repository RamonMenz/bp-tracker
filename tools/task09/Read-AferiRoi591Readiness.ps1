# Explicit read-only phase. No install, clear, uninstall, reverse, launch or capture.
[CmdletBinding()]
param([Parameter(Mandatory)][string] $BuildPath)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoiCandidate.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Readiness.psm1') -Force
$id = Get-AferiRoi591Identity
Assert-AferiRoiSource $BuildPath
$android = Join-Path $BuildPath 'demos/android-capture/android'
Assert-AferiRoiProperty @(Get-Content -LiteralPath (Join-Path $android 'gradle.properties'))
$apk = Join-Path $android 'app/build/outputs/apk/debug/app-debug.apk'
$null = Get-AferiRoiHash $apk $id.Candidate
$sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$bytecode = Get-AferiRoiBytecodeStatus $sdk $apk
$native = Get-AferiRoiBytecodeStatus $sdk $apk -NativeConstants
# Static identity must still match before any device query.
$null = Get-AferiRoiHash $apk $id.Candidate
$installed = Get-AferiRoiInstalledIdentity (Join-Path $sdk 'platform-tools/adb.exe')
Assert-AferiRoiSource $BuildPath
$null = Get-AferiRoiHash $apk $id.Candidate
$isBaseline = $null -ne $installed.Sha256Instalado -and $installed.Sha256Instalado -ceq $id.Baseline
$isCandidate = $null -ne $installed.Sha256Instalado -and $installed.Sha256Instalado -ceq $id.Candidate
[pscustomobject]@{
    Tool = 'roi591-readiness-1'; Fonte = $id.Source; FonteLimpa = $true; Sha256ApkNovo = $id.Candidate
    EscopoBytecode = 'somente-okhttp3-OkHttpClient-Builder-build'; ResultadoBytecode = $bytecode
    BytecodeInspecionado = ($bytecode -ceq 'metodo-build-sem-injecao-expo' -or $bytecode -ceq 'injecao-expo-presente')
    InjecaoExpoAusenteNoMetodo = ($bytecode -ceq 'metodo-build-sem-injecao-expo')
    ConstantesFrameTransform = $native
    RevisaoELimiteNoApkConferidos = ($native -ceq 'frame-transform-roi1-limite5760000')
    Instalado = $installed; CoincideComBaseline259 = $isBaseline; CoincideComCandidato591 = $isCandidate
    AtualizacaoLiberada = $false; InstalacaoExecutada = $false; AplicativoAberto = $false
} | ConvertTo-Json -Depth 5
