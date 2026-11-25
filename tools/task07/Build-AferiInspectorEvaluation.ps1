# Local build/static checks only. Never installs, opens the app, signs or queries ADB.
$ErrorActionPreference = 'Stop'
function Assert-AferiInspectorProperty([string[]] $Lines) {
    $settings = @($Lines | Where-Object { $_ -match '^\s*EX_DEV_CLIENT_NETWORK_INSPECTOR\s*=' })
    if ($settings.Count -ne 1 -or $settings[0] -cnotmatch '^\s*EX_DEV_CLIENT_NETWORK_INSPECTOR\s*=\s*false\s*$') {
        throw 'inspector-property-unexpected'
    }
}
function Invoke-AferiLocalBuildCommand([string] $Program, [string[]] $Arguments, [string] $FailureCode) {
    try {
        $command = Get-Command $Program -CommandType Application -ErrorAction Stop | Select-Object -First 1
        # Native build warnings on stderr are not failures; check the actual exit code.
        $ErrorActionPreference = 'Continue'
        & $command.Source @Arguments 2>&1 | ForEach-Object { Write-Host $_.ToString() }
        $code = $LASTEXITCODE
    } catch { throw $FailureCode }
    if ($code -ne 0) { throw $FailureCode }
}
$buildRoot = 'C:\dev\aferi-task07-inspector-build'
$sourceCommit = 'ca786ed743bac6132216e554e47a41b5e7372813'
$toolsRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (Test-Path -LiteralPath $buildRoot) { throw 'inspector-build-destination-exists-preserve' }
$priorAndroidHome = $env:ANDROID_HOME; $priorTelemetry = $env:EXPO_NO_TELEMETRY
Push-Location -LiteralPath $toolsRoot
try {
    $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (-not (Test-Path -LiteralPath $sdk -PathType Container)) { throw 'inspector-sdk-unavailable' }
    $env:ANDROID_HOME = $sdk; $env:EXPO_NO_TELEMETRY = '1'
    Invoke-AferiLocalBuildCommand 'git.exe' @('worktree','add','--detach',$buildRoot,$sourceCommit) 'inspector-worktree-failed'
    Set-Location -LiteralPath $buildRoot
    Invoke-AferiLocalBuildCommand 'npm.cmd' @('ci','--ignore-scripts','--no-audit','--no-fund') 'inspector-dependencies-failed'
    Invoke-AferiLocalBuildCommand 'node.exe' @('tools/task07/AferiNetworkInspector.check.cjs') 'inspector-mod-check-failed'
    Invoke-AferiLocalBuildCommand 'node.exe' @('tools/task07/AferiBackupRules.check.cjs') 'inspector-backup-check-failed'
    Set-Location -LiteralPath (Join-Path $buildRoot 'demos\android-capture')
    Invoke-AferiLocalBuildCommand 'node.exe' @('..\..\node_modules\expo\bin\cli','prebuild','--platform','android','--no-install') 'inspector-prebuild-failed'
    $propertiesPath = Join-Path $buildRoot 'demos\android-capture\android\gradle.properties'
    try { $generatedProperties = @(Get-Content -LiteralPath $propertiesPath -ErrorAction Stop) }
    catch { throw 'inspector-properties-unavailable' }
    Assert-AferiInspectorProperty $generatedProperties
    Set-Location -LiteralPath (Join-Path $buildRoot 'demos\android-capture\android')
    Invoke-AferiLocalBuildCommand '.\gradlew.bat' @(':app:assembleDebug','--no-daemon','--console=plain','-PreactNativeArchitectures=arm64-v8a','-PEX_DEV_CLIENT_NETWORK_INSPECTOR=false') 'inspector-assemble-failed'
    $apk = Join-Path $buildRoot 'demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
    if (-not (Test-Path -LiteralPath $apk -PathType Leaf)) { throw 'inspector-apk-missing' }
    try { $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'inspector-apk-hash-unavailable' }
    Import-Module (Join-Path $PSScriptRoot 'AferiManifestMetadata.psm1') -Force -ErrorAction Stop
    $aapt2 = Join-Path $sdk 'build-tools\36.0.0\aapt2.exe'
    $manifest = Get-AferiManifestMetadata -Aapt2Path $aapt2 -ApkPath $apk -ExpectedSha256 $hash
    $backup = Get-AferiBackupMetadata -Aapt2Path $aapt2 -ApkPath $apk -ExpectedSha256 $hash
    $signatureJson = & (Join-Path $PSScriptRoot 'Compare-AferiApkSignatures.ps1') -OldApkPath 'C:\dev\aferi-task07-backup-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk' -OldExpectedSha256 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed' -NewApkPath $apk -NewExpectedSha256 $hash
    $signatures = $signatureJson | ConvertFrom-Json -ErrorAction Stop
    try {
        $sourceCheck = & {
            $ErrorActionPreference = 'Continue'
            $actualHead = @(& git.exe -C $buildRoot rev-parse HEAD 2>$null); $headCode = $LASTEXITCODE
            $changes = @(& git.exe --no-optional-locks -C $buildRoot status --porcelain 2>$null); $statusCode = $LASTEXITCODE
            [pscustomobject]@{ Head = $actualHead; HeadCode = $headCode; Changes = $changes; StatusCode = $statusCode }
        }
    } catch { throw 'inspector-source-check-unavailable' }
    if ($sourceCheck.HeadCode -ne 0 -or $sourceCheck.Head.Count -ne 1 -or $sourceCheck.Head[0] -cne $sourceCommit -or $sourceCheck.StatusCode -ne 0 -or $sourceCheck.Changes.Count -ne 0) {
        throw 'inspector-source-not-clean-preserve'
    }
    try { $after = (Get-FileHash -LiteralPath $apk -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'inspector-apk-hash-unavailable' }
    if ($after -cne $hash) { throw 'inspector-apk-changed' }
    [pscustomobject]@{
        Tool = 'build-inspector-1'; Fonte = $sourceCommit; FonteLimpa = $true
        Sha256ApkNovo = $hash; InspectorFalseNoGradleProperties = $true; FlagFalsePassadaAoGradle = $true
        BytecodeInspecionado = $false; Manifesto = $manifest; Backup = $backup; Assinaturas = $signatures
    } | ConvertTo-Json -Depth 10
} finally {
    Pop-Location
    $env:ANDROID_HOME = $priorAndroidHome; $env:EXPO_NO_TELEMETRY = $priorTelemetry
}
