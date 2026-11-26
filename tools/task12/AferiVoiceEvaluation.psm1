Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot '../task07/AferiManifestMetadata.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot '../task07/AferiEvaluationAdb.psm1') -ErrorAction Stop

$package = 'com.ramonmenz.aferivoicetest'
$microphone = 'android.permission.RECORD_AUDIO'

function Get-VoiceSdk {
    if (-not $env:LOCALAPPDATA) { throw 'voice-sdk-unavailable' }
    $sdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
    if (-not (Test-Path -LiteralPath $sdk -PathType Container)) { throw 'voice-sdk-unavailable' }
    return $sdk
}

function Invoke-VoiceBuildCommand([string] $Program, [string[]] $Arguments, [string] $FailureCode) {
    try {
        $command = Get-Command $Program -CommandType Application -ErrorAction Stop | Select-Object -First 1
        $ErrorActionPreference = 'Continue'
        $PSNativeCommandUseErrorActionPreference = $false
        # Capture stdout to allow exact checks. Raw stderr and paths never enter the report.
        $output = @(& $command.Source @Arguments 2>$null)
        $code = $LASTEXITCODE
    } catch { throw $FailureCode }
    if ($code -ne 0) { throw $FailureCode }
    return $output
}

function Assert-VoiceCleanSource([string] $Commit) {
    $head = @(Invoke-VoiceBuildCommand 'git.exe' @('rev-parse','HEAD') 'voice-source-check-failed')
    $changes = @(Invoke-VoiceBuildCommand 'git.exe' @('--no-optional-locks','status','--porcelain=v1','--untracked-files=all') 'voice-source-check-failed')
    if ($head.Count -ne 1 -or $head[0] -cne $Commit -or $changes.Count -ne 0) { throw 'voice-source-not-clean' }
}

function Assert-VoiceInspectorProperty([string[]] $Lines) {
    $settings = @($Lines | Where-Object { $_ -match '^\s*EX_DEV_CLIENT_NETWORK_INSPECTOR(?=\s|=|:|$)' })
    if ($settings.Count -ne 1 -or $settings[0] -cnotmatch '^\s*EX_DEV_CLIENT_NETWORK_INSPECTOR\s*=\s*false\s*$') {
        throw 'voice-inspector-property-unexpected'
    }
}

function Get-VoiceApkHash([string] $ApkPath) {
    try { return (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'voice-apk-hash-unavailable' }
}

function Get-VoiceApkMetadata([string] $Aapt2Path, [string] $ApkPath, [string] $Hash) {
    $manifest = Get-AferiManifestMetadata -Aapt2Path $Aapt2Path -ApkPath $ApkPath -ExpectedSha256 $Hash -Project voice
    $record = @($manifest.Manifesto.PermissoesDeclaradas | Where-Object { $_.Permissao -ceq $microphone })
    $blocked = @($manifest.Manifesto.PermissoesDeclaradas | Where-Object { $_.Permissao -cnotin @($microphone, 'android.permission.INTERNET') })
    if ($record.Count -ne 1 -or $record[0].Tipo -cne 'uses-permission' -or
        $record[0].MaxSdkVersion -cne 'nao-declarado' -or $blocked.Count -ne 0) { throw 'voice-apk-permissions-unexpected' }
    $backup = Get-AferiBackupMetadata -Aapt2Path $Aapt2Path -ApkPath $ApkPath -ExpectedSha256 $Hash -Project voice
    [pscustomobject]@{ Manifesto = $manifest.Manifesto; Backup = $backup; Aapt2Version = $manifest.Aapt2Version }
}

function Build-VoiceEvaluation([string] $SourceRoot, [string] $Commit, [string] $BuildPath) {
    $destination = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($BuildPath)
    if (Test-Path -LiteralPath $destination) { throw 'voice-build-destination-exists' }
    $sdk = Get-VoiceSdk
    $aapt2 = Join-Path $sdk 'build-tools/36.0.0/aapt2.exe'
    if (-not (Test-Path -LiteralPath $aapt2 -PathType Leaf)) { throw 'voice-aapt2-unavailable' }
    $previousSdk = $env:ANDROID_HOME
    $previousTelemetry = $env:EXPO_NO_TELEMETRY
    $previousCI = $env:CI
    Push-Location -LiteralPath $SourceRoot
    try {
        $env:ANDROID_HOME = $sdk
        $env:EXPO_NO_TELEMETRY = '1'
        $env:CI = '1'
        $null = Invoke-VoiceBuildCommand 'git.exe' @('worktree','add','--detach',$destination,$Commit) 'voice-worktree-failed'
        Set-Location -LiteralPath $destination
        Assert-VoiceCleanSource $Commit
        $demo = Join-Path $destination 'demos/android-voice'
        try { $config = (Get-Content -LiteralPath (Join-Path $demo 'app.json') -Raw | ConvertFrom-Json).expo }
        catch { throw 'voice-source-config-unavailable' }
        if ($config.android.package -cne $package -or $config.android.allowBackup -ne $false) { throw 'voice-source-config-unexpected' }
        $null = Invoke-VoiceBuildCommand 'npm.cmd' @('ci','--ignore-scripts','--no-audit','--no-fund') 'voice-dependencies-failed'
        $null = Invoke-VoiceBuildCommand 'node.exe' @('tools/task07/AferiBackupRules.check.cjs','--voice') 'voice-backup-check-failed'
        $null = Invoke-VoiceBuildCommand 'node.exe' @('tools/task07/AferiNetworkInspector.check.cjs','--voice') 'voice-inspector-check-failed'
        Set-Location -LiteralPath $demo
        $null = Invoke-VoiceBuildCommand 'node.exe' @('../../node_modules/expo/bin/cli','prebuild','--platform','android','--no-install') 'voice-prebuild-failed'
        Set-Location -LiteralPath (Join-Path $demo 'android')
        try { $properties = @(Get-Content -LiteralPath 'gradle.properties') }
        catch { throw 'voice-gradle-properties-unavailable' }
        Assert-VoiceInspectorProperty $properties
        $null = Invoke-VoiceBuildCommand '.\gradlew.bat' @(':app:assembleDebug','--no-daemon','--console=plain','-PreactNativeArchitectures=arm64-v8a','-PEX_DEV_CLIENT_NETWORK_INSPECTOR=false') 'voice-assemble-failed'
        $apk = Join-Path $demo 'android/app/build/outputs/apk/debug/app-debug.apk'
        $hash = Get-VoiceApkHash $apk
        $metadata = Get-VoiceApkMetadata $aapt2 $apk $hash
        Set-Location -LiteralPath $destination
        Assert-VoiceCleanSource $Commit
        if ((Get-VoiceApkHash $apk) -cne $hash) { throw 'voice-apk-changed' }
        [pscustomobject]@{
            Fonte = $Commit; FonteLimpa = $true; Sha256Apk = $hash; ArquiteturaSolicitada = 'arm64-v8a'
            InspectorFalseNoGradleProperties = $true; FlagFalsePassadaAoGradle = $true
            Manifesto = $metadata.Manifesto; Backup = $metadata.Backup; Aapt2Version = $metadata.Aapt2Version
        }
    } finally {
        Pop-Location
        $env:ANDROID_HOME = $previousSdk
        $env:EXPO_NO_TELEMETRY = $previousTelemetry
        $env:CI = $previousCI
    }
}

function Get-VoiceAdbState($Result) {
    if ($Result.Code -eq 0 -and $Result.Lines.Count -eq 1 -and $Result.Lines[0].Trim() -ceq 'device') { return 'device' }
    $raw = ($Result.Lines + $Result.Errors) -join "`n"
    if ($raw -match 'unauthorized|not authorized') { return 'unauthorized' }
    if ($raw -match 'offline') { return 'offline' }
    if ($raw -match 'more than one|multiple devices') { return 'multiple-usb' }
    if ($raw -match 'no devices|no device|device.*not found') { return 'no-usb' }
    return 'adb-error'
}

function Invoke-VoiceAdb([string] $AdbPath, [string[]] $Arguments) {
    try { Invoke-AferiEvaluationAdbProcess -AdbPath $AdbPath -Arguments $Arguments }
    catch { throw 'voice-adb-query-unavailable' }
}

function Get-VoiceMicrophoneGrant([string[]] $Lines, [string] $UserId) {
    $packagePattern = '^\s*Package \[' + [regex]::Escape($package) + '\] \([^)]+\):$'
    $header = @($Lines | Select-String -CaseSensitive -Pattern $packagePattern)
    if ($header.Count -ne 1) { throw 'voice-permission-state-unverified' }
    $indent = $header[0].Line.Length - $header[0].Line.TrimStart().Length
    $packageLines = @($Lines | Select-Object -Skip $header[0].LineNumber)
    $requested = $false; $activeUser = $false; $section = ''
    $activeUserCount = 0; $grants = @()
    foreach ($line in $packageLines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $depth = $line.Length - $line.TrimStart().Length - $indent
        if ($depth -le 0) { break }
        if ($depth -eq 2) {
            $section = ''; $activeUser = $false
            if ($line.Trim() -ceq 'requested permissions:') { $section = 'requested' }
            elseif ($line.TrimStart().StartsWith('sharedUser=')) { throw 'voice-permission-state-unverified' }
            elseif ($line -cmatch ('^\s*User ' + $UserId + ':\s.*\binstalled=true(?:\s|$)')) {
                $activeUserCount++
                $activeUser = $true
            }
        } elseif ($depth -eq 4) {
            if ($section -ceq 'requested' -and $line.Trim() -ceq $microphone) { $requested = $true }
            if ($activeUser) { $section = if ($line.Trim() -ceq 'runtime permissions:') { 'runtime' } else { '' } }
        } elseif ($activeUser -and $line -cmatch 'android\.permission\.RECORD_AUDIO\b') {
            if ($section -cne 'runtime' -or $depth -ne 6 -or
                $line -cnotmatch '^\s*android\.permission\.RECORD_AUDIO:\s+granted=(true|false)(?:,|\s*$)') {
                throw 'voice-permission-state-unverified'
            }
            $grants += $Matches[1] -ceq 'true'
        }
    }
    if (-not $requested -or $activeUserCount -ne 1 -or $grants.Count -gt 1) { throw 'voice-permission-state-unverified' }
    # AOSP stores only nonzero permission flags. A new install can have no runtime entry.
    if ($grants.Count -eq 0) { return 'sem-entrada-runtime' }
    if ($grants[0]) { return 'concedida' }
    return 'negada'
}

function Get-VoiceInstalledIdentity([string] $AdbPath, [string] $ExpectedSha256) {
    $state = Get-VoiceAdbState (Invoke-VoiceAdb $AdbPath @('get-state'))
    if ($state -cne 'device') { throw "voice-adb-$state" }
    $user = Invoke-VoiceAdb $AdbPath @('shell','am','get-current-user')
    if ($user.Code -ne 0 -or $user.Lines.Count -ne 1 -or $user.Lines[0] -cnotmatch '^(0|[1-9][0-9]{0,8})$') { throw 'voice-current-user-unverified' }
    $userId = $Matches[1]
    $paths = Invoke-VoiceAdb $AdbPath @('shell','pm','path','--user',$userId,$package)
    $basePattern = '/data/app/(?:[A-Za-z0-9_+=~.-]+/)+base\.apk'
    if ($paths.Code -ne 0 -or $paths.Lines.Count -ne 1 -or $paths.Lines[0] -cnotmatch ('^package:(' + $basePattern + ')$')) {
        throw 'voice-installed-package-unverified'
    }
    $base = $Matches[1]
    if ($base -match '/\.{1,2}/') { throw 'voice-installed-path-unexpected' }
    $sum = Invoke-VoiceAdb $AdbPath @('shell','run-as',$package,'--user',$userId,'sha256sum',$base)
    if ($sum.Code -ne 0 -or $sum.Lines.Count -ne 1 -or $sum.Lines[0] -cnotmatch ('^([0-9a-fA-F]{64})\s+(' + $basePattern + ')$') -or $Matches[2] -cne $base) {
        throw 'voice-installed-hash-unverified'
    }
    $hash = $Matches[1].ToLowerInvariant()
    if ($hash -cne $ExpectedSha256.ToLowerInvariant()) { throw 'voice-installed-hash-mismatch' }
    $permissions = Invoke-VoiceAdb $AdbPath @('shell','dumpsys','package',$package)
    if ($permissions.Code -ne 0) { throw 'voice-permission-state-unverified' }
    $grant = Get-VoiceMicrophoneGrant $permissions.Lines $userId
    if ($grant -ceq 'concedida') { throw 'voice-microphone-already-granted' }
    [pscustomobject]@{
        Pacote = $package; Sha256Instalado = $hash; CoincideComBuild = $true
        RecordAudioConcedida = $false; EstadoRecordAudio = $grant
    }
}

function Invoke-VoiceMetroHttp([string] $ExpectedRoot) {
    $response = $null; $reader = $null
    $status = $null; $source = $false; $ready = $false
    try {
        $request = [Net.HttpWebRequest]::Create('http://127.0.0.1:8099/status')
        $request.Proxy = $null
        $request.AllowAutoRedirect = $false
        $request.Timeout = 3000; $request.ReadWriteTimeout = 3000
        $request.KeepAlive = $false
        $response = $request.GetResponse()
        $status = [int]$response.StatusCode
        $root = [Uri]::UnescapeDataString([string]$response.Headers['X-React-Native-Project-Root'])
        $source = $root.Replace('/', '\').TrimEnd('\') -ieq $ExpectedRoot.Replace('/', '\').TrimEnd('\')
        if ($status -eq 200 -and $source) {
            $reader = [IO.StreamReader]::new($response.GetResponseStream())
            $buffer = [char[]]::new(64)
            $count = $reader.ReadBlock($buffer, 0, $buffer.Length)
            $ready = [string]::new($buffer, 0, $count).Trim() -ceq 'packager-status:running'
        }
    } catch {
        # An unreachable endpoint or malformed response is reported by the three fields below.
        $ready = $false
    } finally {
        if ($null -ne $reader) { $reader.Dispose() }
        if ($null -ne $response) { $response.Close() }
    }
    [pscustomobject]@{ HttpStatus = $status; FonteEsperada = $source; MetroPronto = $ready }
}

function Get-VoiceMetroHealth([string] $AdbPath, [string] $ExpectedRoot) {
    $http = Invoke-VoiceMetroHttp $ExpectedRoot
    $state = Get-VoiceAdbState (Invoke-VoiceAdb $AdbPath @('get-state'))
    $reverse = $null
    if ($state -ceq 'device') {
        $list = Invoke-VoiceAdb $AdbPath @('reverse','--list')
        if ($list.Code -ne 0) { $reverse = 'unavailable' }
        elseif (@($list.Lines | Where-Object { $_ -cnotmatch '^\S+\s+\S+\s+\S+\s*$' }).Count -ne 0) { $reverse = 'unverified' }
        else {
            $mappings = @($list.Lines | Where-Object { $_ -cmatch '^\S+\s+tcp:8099\s+' })
            $reverse = if ($mappings.Count -eq 0) { 'missing' }
                elseif ($mappings.Count -eq 1 -and $mappings[0] -cmatch '^\S+\s+tcp:8099\s+tcp:8099\s*$') { 'ready' }
                else { 'conflict' }
        }
    }
    [pscustomobject]@{ Porta = 8099; Familia = 'IPv4'; Http = $http; EstadoAdb = $state; Reverse = $reverse; Pronto = ($http.MetroPronto -and $reverse -ceq 'ready') }
}

Export-ModuleMember -Function Build-VoiceEvaluation, Get-VoiceSdk, Get-VoiceInstalledIdentity, Get-VoiceMetroHealth
