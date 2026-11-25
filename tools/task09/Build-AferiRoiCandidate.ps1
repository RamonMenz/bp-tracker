# Prepare and Build are separate commands. Never installs, opens, signs or queries ADB.
param(
    [Parameter(Mandatory)][ValidateSet('Prepare','Build')][string] $Phase,
    [Parameter(Mandatory)][string] $RepositoryPath,
    [Parameter(Mandatory)][string] $BuildPath
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoiCandidate.psm1') -Force
$source = Get-AferiRoiSource
if (-not [IO.Path]::IsPathRooted($BuildPath)) { throw 'roi-build-path-must-be-absolute' }
if ($env:OS -cne 'Windows_NT') { throw 'roi-build-requires-windows' }
$priorAndroidHome = $env:ANDROID_HOME; $priorTelemetry = $env:EXPO_NO_TELEMETRY
Push-Location -LiteralPath $RepositoryPath
try {
    $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (-not (Test-Path -LiteralPath $sdk -PathType Container)) { throw 'roi-sdk-unavailable' }
    $env:ANDROID_HOME = $sdk; $env:EXPO_NO_TELEMETRY = '1'
    if ($Phase -ceq 'Prepare') {
        if (Test-Path -LiteralPath $BuildPath) { throw 'roi-build-destination-exists-preserve' }
        Invoke-AferiRoiBuildCommand 'git.exe' @('worktree','add','--detach',$BuildPath,$source) 'roi-worktree-failed'
        Set-Location -LiteralPath $BuildPath
        Assert-AferiRoiSource $BuildPath
        Invoke-AferiRoiBuildCommand 'npm.cmd' @('ci','--ignore-scripts','--no-audit','--no-fund') 'roi-dependencies-failed'
        Invoke-AferiRoiBuildCommand 'node.exe' @('tools/task07/AferiNetworkInspector.check.cjs') 'roi-inspector-mod-failed'
        Invoke-AferiRoiBuildCommand 'node.exe' @('tools/task07/AferiBackupRules.check.cjs') 'roi-backup-mod-failed'
        Set-Location -LiteralPath (Join-Path $BuildPath 'demos\android-capture')
        Invoke-AferiRoiBuildCommand 'node.exe' @('..\..\node_modules\expo\bin\cli','prebuild','--platform','android','--no-install') 'roi-prebuild-failed'
    }
    Assert-AferiRoiSource $BuildPath
    $android = Join-Path $BuildPath 'demos\android-capture\android'
    Assert-AferiRoiProperty @(Get-Content -LiteralPath (Join-Path $android 'gradle.properties'))
    $apk = Join-Path $android 'app\build\outputs\apk\debug\app-debug.apk'
    if ($Phase -ceq 'Build') {
        # An existing APK might be stale. Preserve it and stop; never silently reuse it.
        if (Test-Path -LiteralPath $apk) { throw 'roi-apk-already-exists-preserve' }
        Set-Location -LiteralPath $android
        Invoke-AferiRoiBuildCommand '.\gradlew.bat' @(':app:assembleDebug','--no-daemon','--console=plain','-PreactNativeArchitectures=arm64-v8a','-PEX_DEV_CLIENT_NETWORK_INSPECTOR=false') 'roi-assemble-failed'
        Assert-AferiRoiSource $BuildPath
        Assert-AferiRoiProperty @(Get-Content -LiteralPath (Join-Path $android 'gradle.properties'))
        try { $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant() }
        catch { throw 'roi-built-apk-unavailable' }
    } else { $hash = $null }
    [pscustomobject]@{
        Tool = 'roi-build-1'; Fase = $Phase; Fonte = $source; FonteLimpa = $true
        Sha256ApkNovo = $hash; InspectorFalseNoGradleProperties = $true
        FlagFalsePassadaAoGradle = ($Phase -ceq 'Build'); BytecodeInspecionado = $false
        InstalacaoExecutada = $false; AplicativoAberto = $false
    } | ConvertTo-Json
} finally {
    Pop-Location
    $env:ANDROID_HOME = $priorAndroidHome; $env:EXPO_NO_TELEMETRY = $priorTelemetry
}
