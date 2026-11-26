# Artifact inspection only. No media, app execution, installation or network client.
Import-Module (Join-Path $PSScriptRoot '../task07/AferiEvaluationAdb.psm1') -ErrorAction Stop
function Get-AferiRoi591Identity {
    [pscustomobject]@{
        Source = '45f7376a7ed2f7e04725866ffe98ff625f057566'
        Candidate = '591555a24e8ba0d952c8dc93829c8204b3c731348764a61f80c29a79580038f6'
        Baseline = '25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c'
        Package = 'com.ramonmenz.afericapturetest'
    }
}
function ConvertFrom-AferiRoiBuilderCode([object[]] $Lines) {
    # A recognized, complete method is required. Empty/unknown output is NOT absence.
    if ($Lines.Count -eq 0 -or $Lines.Count -gt 20000) { return 'formato-nao-reconhecido' }
    foreach ($line in $Lines) {
        if ($line -isnot [string] -or $line.Length -gt 16384 -or $line -match '[\x00-\x08\x0b-\x1f\x7f]') { return 'formato-nao-reconhecido' }
    }
    $methods = @(); $body = $null
    foreach ($line in $Lines) {
        if ($line -cmatch '^\s*\.method\s+public(?:\s+final)?\s+build\(\)Lokhttp3/OkHttpClient;\s*$') {
            if ($null -ne $body) { return 'formato-nao-reconhecido' }
            $body = [System.Collections.Generic.List[string]]::new(); continue
        }
        if ($null -ne $body) {
            if ($line -match '^\s*\.method\b') { return 'formato-nao-reconhecido' }
            if ($line -match '^\s*\.end method\s*$') { $methods += ,$body.ToArray(); $body = $null }
            else { $body.Add($line.Trim()) }
        }
    }
    if ($null -ne $body -or $methods.Count -ne 1) { return 'formato-nao-reconhecido' }
    if (@($methods[0] | Where-Object { $_ -cmatch 'Lexpo/modules/kotlin/devtools/ExpoNetworkInspectOkHttp(?:App|Network)Interceptor;' }).Count -gt 0) {
        return 'injecao-expo-presente'
    }
    # The expected non-instrumented method constructs a client and returns it.
    # Accept only that exact instruction shape; any other implementation stays pending.
    $instructions = @($methods[0] | Where-Object { $_ -ne '' -and $_ -notmatch '^(#|\.|:)' })
    if ($instructions.Count -ne 3 -or
        $instructions[0] -cnotmatch '^new-instance\s+([vp][0-9]+),\s*Lokhttp3/OkHttpClient;$') { return 'estrutura-nao-prevista' }
    $register = [regex]::Escape($Matches[1])
    if ($instructions[1] -cnotmatch ('^invoke-direct\s+\{\s*' + $register + '\s*,\s*[vp][0-9]+\s*\},\s*Lokhttp3/OkHttpClient;-><init>\(Lokhttp3/OkHttpClient\$Builder;\)V$') -or
        $instructions[2] -cnotmatch ('^return-object\s+' + $register + '$')) { return 'estrutura-nao-prevista' }
    return 'metodo-build-sem-injecao-expo'
}
function ConvertFrom-AferiRoiNativeCode([object[]] $Lines) {
    if ($Lines.Count -eq 0 -or $Lines.Count -gt 20000) { return 'formato-nao-reconhecido' }
    foreach ($line in $Lines) {
        if ($line -isnot [string] -or $line.Length -gt 16384 -or $line -match '[\x00-\x08\x0b-\x1f\x7f]') { return 'formato-nao-reconhecido' }
    }
    $class = @($Lines | Where-Object { $_ -cmatch '^\s*\.class\s+public\s+final\s+Lexpo/modules/aferiphoto/FrameTransform;\s*$' })
    $revision = @($Lines | Where-Object { $_ -cmatch '^\s*\.field\s+public\s+static\s+final\s+REVISION:Ljava/lang/String;\s*=\s*"roi-1"\s*$' })
    $limit = @($Lines | Where-Object { $_ -cmatch '^\s*\.field\s+public\s+static\s+final\s+MAX_OWNED_PIXEL_BYTES:I\s*=\s*(?:0x57e400|5760000)\s*$' })
    if ($class.Count -ne 1 -or $revision.Count -ne 1 -or $limit.Count -ne 1) { return 'constantes-nao-confirmadas' }
    return 'frame-transform-roi1-limite5760000'
}
function Invoke-AferiRoiAnalyzer([string] $Program, [string] $ApkPath, [switch] $NativeConstants) {
    # Batch paths and APK arguments must not introduce cmd.exe expansion/metacharacters.
    if ($Program -match '[&|<>^%!"\x00-\x1f]' -or $ApkPath -match '[&|<>^%!"\x00-\x1f]') {
        return 'analisador-caminho-incompativel'
    }
    try {
        $ErrorActionPreference = 'Continue'
        if ($NativeConstants) { $raw = @(& $Program dex code --class 'expo.modules.aferiphoto.FrameTransform' $ApkPath 2>&1) }
        else { $raw = @(& $Program dex code --class 'okhttp3.OkHttpClient$Builder' --method build $ApkPath 2>&1) }
        $code = $LASTEXITCODE
    } catch { return 'analisador-falhou' }
    if ($code -ne 0) { return 'analisador-falhou' }
    # Native warnings/errors are private and cannot become evidence of absence.
    if ($NativeConstants) { return ConvertFrom-AferiRoiNativeCode $raw }
    return ConvertFrom-AferiRoiBuilderCode $raw
}
function Get-AferiRoiBytecodeStatus([string] $SdkPath, [string] $ApkPath, [switch] $NativeConstants) {
    $latest = Join-Path $SdkPath 'cmdline-tools/latest/bin/apkanalyzer.bat'
    $legacy = Join-Path $SdkPath 'tools/bin/apkanalyzer.bat'
    if (Test-Path -LiteralPath $latest -PathType Leaf) { $program = $latest }
    elseif (Test-Path -LiteralPath $legacy -PathType Leaf) { $program = $legacy }
    else {
        $root = Join-Path $SdkPath 'cmdline-tools'
        $programs = @()
        if (Test-Path -LiteralPath $root -PathType Container) {
            $programs = @(Get-ChildItem -LiteralPath $root -Directory | ForEach-Object {
                $candidate = Join-Path $_.FullName 'bin/apkanalyzer.bat'
                if (Test-Path -LiteralPath $candidate -PathType Leaf) { $candidate }
            })
        }
        if ($programs.Count -eq 0) { return 'analisador-indisponivel' }
        if ($programs.Count -ne 1) { return 'analisador-ambiguo' }
        $program = $programs[0]
    }
    Invoke-AferiRoiAnalyzer $program $ApkPath -NativeConstants:$NativeConstants
}
function Get-AferiRoiAdbState($Result) {
    if ($Result.Code -eq 0 -and $Result.Lines.Count -eq 1 -and $Result.Lines[0].Trim() -ceq 'device') { return 'device' }
    $raw = ($Result.Lines + $Result.Errors) -join "`n"
    if ($raw -match '(?i)unauthorized|not authorized') { return 'unauthorized' }
    if ($raw -match '(?i)offline') { return 'offline' }
    if ($raw -match '(?i)more than one|multiple devices') { return 'multiple-usb' }
    if ($raw -match '(?i)no devices|no device|device.*not found') { return 'no-usb' }
    return 'adb-error'
}
function Get-AferiRoiInstalledIdentity([string] $AdbPath) {
    $id = Get-AferiRoi591Identity
    $server = Invoke-AferiEvaluationAdbProcess -AdbPath $AdbPath -Arguments @('start-server') -Server
    if ($server.Code -ne 0) { throw 'roi-adb-server-unavailable' }
    $state = Get-AferiRoiAdbState (Invoke-AferiEvaluationAdbProcess -AdbPath $AdbPath -Arguments @('get-state'))
    if ($state -cne 'device') { return [pscustomobject]@{ EstadoAdb = $state; ModeloConfere = $null; Sha256Instalado = $null } }
    $model = Invoke-AferiEvaluationAdbProcess -AdbPath $AdbPath -Arguments @('shell','getprop','ro.product.model')
    if ($model.Code -ne 0 -or $model.Lines.Count -ne 1 -or $model.Lines[0].Trim() -cne 'SM-S731B') { throw 'roi-device-model-unexpected' }
    $paths = Invoke-AferiEvaluationAdbProcess -AdbPath $AdbPath -Arguments @('shell','pm','path',$id.Package)
    if ($paths.Code -ne 0 -or $paths.Lines.Count -ne 1 -or
        $paths.Lines[0] -cnotmatch '^package:(/data/app/[A-Za-z0-9_./=+~\-]+/base\.apk)$') { throw 'roi-installed-package-unexpected' }
    $base = $Matches[1]
    if ($base -match '/\.\./') { throw 'roi-installed-path-unexpected' }
    $sum = Invoke-AferiEvaluationAdbProcess -AdbPath $AdbPath -Arguments @('shell','run-as',$id.Package,'sha256sum',$base)
    if ($sum.Code -ne 0 -or $sum.Lines.Count -ne 1 -or
        $sum.Lines[0] -cnotmatch '^([0-9a-fA-F]{64})\s+(/data/app/[A-Za-z0-9_./=+~\-]+/base\.apk)$' -or
        $Matches[2] -cne $base) { throw 'roi-installed-hash-unavailable' }
    [pscustomobject]@{ EstadoAdb = 'device'; ModeloConfere = $true; Sha256Instalado = $Matches[1].ToLowerInvariant() }
}
Export-ModuleMember -Function Get-AferiRoi591Identity, ConvertFrom-AferiRoiBuilderCode, ConvertFrom-AferiRoiNativeCode, Get-AferiRoiBytecodeStatus, Get-AferiRoiAdbState, Get-AferiRoiInstalledIdentity
