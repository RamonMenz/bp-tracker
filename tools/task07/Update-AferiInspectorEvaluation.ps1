# Fixed evaluation package/candidate only. No opening, clear, uninstall or permission bypass.
$ErrorActionPreference = 'Stop'
$script:AferiInspectorAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$candidatePath = 'C:\dev\aferi-task07-inspector-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
$candidateHash = '25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c'
$baselineHash = 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed'
function Invoke-AferiInspectorAdb([string[]] $Arguments) {
    try {
        $lines = @(& $script:AferiInspectorAdb -d @Arguments 2>&1)
        $code = $LASTEXITCODE
    } catch { throw 'inspector-update-adb-unavailable' }
    [pscustomobject]@{ Lines = $lines; Code = $code }
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
try { $localHash = (Get-FileHash -LiteralPath $candidatePath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
catch { throw 'inspector-update-local-hash-unavailable' }
if ($localHash -cne $candidateHash) { throw 'inspector-update-candidate-changed' }
$state = Invoke-AferiInspectorAdb @('get-state')
if ($state.Code -ne 0 -or $state.Lines.Count -ne 1 -or $state.Lines[0].ToString().Trim() -cne 'device') { throw 'inspector-update-device-unexpected' }
$model = Invoke-AferiInspectorAdb @('shell','getprop','ro.product.model')
if ($model.Code -ne 0 -or $model.Lines.Count -ne 1 -or $model.Lines[0].ToString().Trim() -cne 'SM-S731B') { throw 'inspector-update-model-unexpected' }
$before = Read-AferiInspectorInstalledHash
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
