# Fixed evaluation package/candidate only. No opening, clear, uninstall or permission bypass.
[CmdletBinding()]
param([switch] $ReadOnly)
$ErrorActionPreference = 'Stop'
$script:AferiInspectorAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$candidatePath = 'C:\dev\aferi-task07-inspector-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
$candidateHash = '25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c'
$baselineHash = 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed'
function Invoke-AferiInspectorAdb {
    param([string[]] $Arguments, [switch] $Server)
    if ($Server -and ($Arguments.Count -ne 1 -or $Arguments[0] -cne 'start-server')) { throw 'inspector-adb-server-command-unexpected' }
    if (-not (Test-Path -LiteralPath $script:AferiInspectorAdb -PathType Leaf)) { throw 'inspector-adb-executable-unavailable' }
    $parts = @()
    if (-not $Server) { $parts += '-d' }
    $parts += $Arguments
    $quoted = @($parts | ForEach-Object {
        if ($_ -match '["\x00-\x1f]') { throw 'inspector-adb-argument-unexpected' }
        '"' + $_ + '"'
    })
    $process = [Diagnostics.Process]::new()
    $process.StartInfo.FileName = $script:AferiInspectorAdb
    $process.StartInfo.Arguments = $quoted -join ' '
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        # Do not kill an installation automatically; its result must be recovered by read-only inspection.
        if ($Arguments[0] -ceq 'install') { $process.WaitForExit() }
        elseif (-not $process.WaitForExit(30000)) {
            try { $process.Kill() } catch { throw 'inspector-adb-client-stop-unavailable' }
            throw 'inspector-adb-query-timeout'
        }
        if (-not $stdout.Wait(5000) -or -not $stderr.Wait(5000)) { throw 'inspector-adb-output-unavailable' }
        [pscustomobject]@{
            Lines = @($stdout.GetAwaiter().GetResult() -split "`r?`n" | Where-Object { $_.Length -gt 0 })
            Errors = @($stderr.GetAwaiter().GetResult() -split "`r?`n" | Where-Object { $_.Length -gt 0 })
            Code = $process.ExitCode
        }
    } catch {
        if (@('inspector-adb-client-stop-unavailable','inspector-adb-query-timeout','inspector-adb-output-unavailable') -ccontains $_.Exception.Message) { throw }
        throw 'inspector-update-adb-unavailable'
    }
    finally { $process.Dispose() }
}
function Get-AferiInspectorDeviceState($Result) {
    if ($Result.Code -eq 0 -and $Result.Lines.Count -eq 1 -and $Result.Lines[0].Trim() -ceq 'device') { return 'device' }
    $text = ($Result.Lines + $Result.Errors) -join "`n"
    if ($text -match '(?i)unauthorized|not authorized') { return 'unauthorized' }
    if ($text -match '(?i)offline') { return 'offline' }
    if ($text -match '(?i)more than one|multiple devices') { return 'multiple-usb' }
    if ($text -match '(?i)no devices|no device|device.*not found') { return 'no-usb' }
    return 'adb-error'
}
function Read-AferiInspectorInstalledHash {
    $paths = Invoke-AferiInspectorAdb @('shell','pm','path','com.ramonmenz.afericapturetest')
    if ($paths.Code -ne 0 -or $paths.Lines.Count -ne 1 -or $paths.Lines[0] -isnot [string] -or
        $paths.Lines[0].Trim() -notmatch '^package:(/data/app/[A-Za-z0-9_./=+~\-]+/base\.apk)$') {
        throw 'inspector-update-package-unexpected'
    }
    $base = $Matches[1]
    if ($base -match '/\.\./') { throw 'inspector-update-path-unexpected' }
    $hashResult = Invoke-AferiInspectorAdb @('shell','run-as','com.ramonmenz.afericapturetest','sha256sum',$base)
    if ($hashResult.Code -ne 0 -or $hashResult.Lines.Count -ne 1 -or $hashResult.Lines[0] -isnot [string] -or
        $hashResult.Lines[0] -notmatch '^([0-9a-fA-F]{64})\s') { throw 'inspector-update-installed-hash-unavailable' }
    return $Matches[1].ToLowerInvariant()
}
if (-not $ReadOnly) {
    try { $localHash = (Get-FileHash -LiteralPath $candidatePath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'inspector-update-local-hash-unavailable' }
    if ($localHash -cne $candidateHash) { throw 'inspector-update-candidate-changed' }
}
$server = Invoke-AferiInspectorAdb -Arguments @('start-server') -Server
if ($server.Code -ne 0) { throw 'inspector-adb-server-unavailable' }
$state = Invoke-AferiInspectorAdb @('get-state')
$deviceState = Get-AferiInspectorDeviceState $state
if ($ReadOnly -and $deviceState -cne 'device') {
    [pscustomobject]@{ Tool = 'inspector-session-1'; Modo = 'consulta'; PacoteAlvo = 'com.ramonmenz.afericapturetest'; EstadoAdb = $deviceState
        AvisosServidorStderr = ($server.Errors.Count -gt 0); ModeloConfere = $null; Sha256Instalado = $null
        CoincideComAnterior = $null; CoincideComCandidato = $null; InstalacaoExecutada = $false } | ConvertTo-Json
    return
}
if ($deviceState -cne 'device') { throw 'inspector-update-device-unexpected' }
$model = Invoke-AferiInspectorAdb @('shell','getprop','ro.product.model')
if ($model.Code -ne 0 -or $model.Lines.Count -ne 1 -or $model.Lines[0].ToString().Trim() -cne 'SM-S731B') { throw 'inspector-update-model-unexpected' }
$before = Read-AferiInspectorInstalledHash
if ($ReadOnly) {
    [pscustomobject]@{ Tool = 'inspector-session-1'; Modo = 'consulta'; PacoteAlvo = 'com.ramonmenz.afericapturetest'; EstadoAdb = 'device'
        AvisosServidorStderr = ($server.Errors.Count -gt 0); ModeloConfere = $true; Sha256Instalado = $before
        CoincideComAnterior = ($before -ceq $baselineHash); CoincideComCandidato = ($before -ceq $candidateHash)
        InstalacaoExecutada = $false } | ConvertTo-Json
    return
}
$alreadyCandidate = $before -ceq $candidateHash
$attempted = $false; $success = $null
if (-not $alreadyCandidate) {
    if ($before -cne $baselineHash) { throw 'inspector-update-baseline-unexpected-preserve' }
    $attempted = $true
    $install = Invoke-AferiInspectorAdb @('install','-r',$candidatePath)
    if ($install.Code -ne 0 -or @($install.Lines | Where-Object { $_.ToString().Trim() -ceq 'Success' }).Count -ne 1) { throw 'inspector-update-not-confirmed-stop' }
    $success = $true
}
$after = Read-AferiInspectorInstalledHash
[pscustomobject]@{
    Tool = 'inspector-update-1'; Modelo = 'SM-S731B'; Pacote = 'com.ramonmenz.afericapturetest'
    InstalacaoExecutada = $attempted; InstalacaoRetornouSucesso = $success; CandidatoJaEstavaInstalado = $alreadyCandidate
    Sha256Antes = $before; Sha256Depois = $after; CoincideComCandidato = ($after -ceq $candidateHash)
} | ConvertTo-Json
