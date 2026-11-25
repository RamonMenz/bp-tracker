# Read-only phone metadata; no capture, install, app opening or report file.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
function Assert-AferiInspectorIdleSession($Session) {
    if ($Session.Tool -cne 'inspector-session-1' -or $Session.Modo -cne 'consulta' -or
        $Session.PacoteAlvo -cne 'com.ramonmenz.afericapturetest' -or $Session.EstadoAdb -cne 'device' -or
        $Session.ModeloConfere -ne $true -or $Session.CoincideComCandidato -ne $true -or
        $Session.Sha256Instalado -cne '25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c') {
        throw 'inspector-idle-session-unexpected'
    }
}
$sessionJson = & (Join-Path $PSScriptRoot 'Update-AferiInspectorEvaluation.ps1') -ReadOnly
$session = $sessionJson | ConvertFrom-Json -ErrorAction Stop
Assert-AferiInspectorIdleSession $session
Import-Module (Join-Path $PSScriptRoot 'AferiEvaluationAdb.psm1') -ErrorAction Stop
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$bundle = Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('shell','run-as','com.ramonmenz.afericapturetest','sha256sum','files/DevLauncherApp-BridgelessReactNativeDevBundle.js')
if ($bundle.Code -ne 0 -or $bundle.Lines.Count -ne 1 -or
    $bundle.Lines[0] -notmatch '^([0-9a-fA-F]{64})\s') { throw 'inspector-bundle-hash-unavailable' }
$bundleHash = $Matches[1].ToLowerInvariant()
Import-Module (Join-Path $PSScriptRoot 'AferiPrivacyMetadata.psm1') -ErrorAction Stop
$before = New-AferiInventory -AdbPath $adb
Start-Sleep -Seconds 30
$after = New-AferiInventory -AdbPath $adb
[pscustomobject]@{
    Tool = 'inspector-idle-1'; Cenario = 'idle-candidato-inspector'
    Sha256ApkInstalado = $session.Sha256Instalado; Sha256Bundle = $bundleHash
    Antes = $before; Depois = $after
    Comparacao = Compare-AferiInventory -Before $before.Id -After $after.Id
} | ConvertTo-Json -Depth 6 -Compress
