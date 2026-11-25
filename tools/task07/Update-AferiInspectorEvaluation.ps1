# Fixed evaluation package/candidate only. No opening, clear, uninstall or permission bypass.
[CmdletBinding()]
param([switch] $ReadOnly, [switch] $PrepareMetro)
$ErrorActionPreference = 'Stop'
if ($ReadOnly -and $PrepareMetro) { throw 'inspector-mode-conflict' }
$script:AferiInspectorAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$candidatePath = 'C:\dev\aferi-task07-inspector-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
$candidateHash = '25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c'
$baselineHash = 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed'
Import-Module (Join-Path $PSScriptRoot 'AferiEvaluationAdb.psm1') -ErrorAction Stop
function Invoke-AferiInspectorAdb {
    param([string[]] $Arguments, [switch] $Server)
    Invoke-AferiEvaluationAdbProcess -AdbPath $script:AferiInspectorAdb -Arguments $Arguments -Server:$Server
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
if (-not $ReadOnly -and -not $PrepareMetro) {
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
if ($PrepareMetro) {
    if ($before -cne $candidateHash) { throw 'inspector-metro-candidate-unexpected' }
    $reverse = Invoke-AferiInspectorAdb @('reverse','--list')
    if ($reverse.Code -ne 0) { throw 'inspector-metro-reverse-unavailable' }
    $lines = @($reverse.Lines | Where-Object { $_.Trim().Length -gt 0 })
    if (@($lines | Where-Object { $_ -notmatch '^\S+\s+\S+\s+\S+\s*$' }).Count -ne 0) { throw 'inspector-metro-reverse-format-unexpected' }
    $conflicts = @($lines | Where-Object { $_ -match '^\S+\s+tcp:8097\s+' -and $_ -notmatch '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
    if ($conflicts.Count -gt 0) { throw 'inspector-metro-reverse-conflict-preserve' }
    $known = @($lines | Where-Object { $_ -match '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
    $set = Invoke-AferiInspectorAdb @('reverse','tcp:8097','tcp:8097')
    if ($set.Code -ne 0) { throw 'inspector-metro-reverse-set-unavailable' }
    [pscustomobject]@{ Tool = 'inspector-metro-1'; Modo = 'preparar-metro'; Pacote = 'com.ramonmenz.afericapturetest'
        Sha256Instalado = $before; Reverse8097Configurado = $true; OutrasLinhasAntes = $lines.Count - $known.Count
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
