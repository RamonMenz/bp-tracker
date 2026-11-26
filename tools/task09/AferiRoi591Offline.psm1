Import-Module (Join-Path $PSScriptRoot 'AferiRoiCandidate.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Readiness.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Metro.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot '../task07/AferiEvaluationAdb.psm1') -ErrorAction Stop
function Read-Roi591Bundle([string] $Adb) {
    $r=Invoke-AferiEvaluationAdbProcess -AdbPath $Adb -Arguments @('shell','run-as','com.ramonmenz.afericapturetest','sha256sum','files/DevLauncherApp-BridgelessReactNativeDevBundle.js')
    if($r.Code -ne 0 -or $r.Lines.Count -ne 1 -or $r.Lines[0] -cnotmatch '^([0-9a-fA-F]{64})\s+files/DevLauncherApp-BridgelessReactNativeDevBundle\.js$'){throw 'roi591-bundle-hash-unavailable'}
    $Matches[1].ToLowerInvariant()
}
function Assert-Roi591OfflineInstalled([string] $Adb) {
    $r=Get-AferiRoiInstalledIdentity $Adb
    if($r.EstadoAdb -cne 'device' -or $r.ModeloConfere -ne $true -or $r.Sha256Instalado -cne (Get-AferiRoi591Identity).Candidate){throw 'roi591-offline-installed-unexpected'}
}
function Initialize-AferiRoi591Offline([string] $BuildPath) {
    $id=Get-AferiRoi591Identity
    Assert-AferiRoiSource $BuildPath
    $null=Get-AferiRoiHash (Join-Path $BuildPath 'demos/android-capture/android/app/build/outputs/apk/debug/app-debug.apk') $id.Candidate
    $root=(Resolve-Path -LiteralPath (Join-Path $BuildPath 'demos/android-capture')).Path
    $metro=Get-Module AferiRoi591Metro
    $ready=& $metro {param($path) Test-Roi591MetroSource $path} $root
    if(-not $ready){throw 'roi591-offline-metro-unexpected'}
    $adb=Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
    Assert-Roi591OfflineInstalled $adb
    $bundle=Read-Roi591Bundle $adb
    $list=Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('reverse','--list')
    $before=& $metro {param($lines,$code) Get-Roi591Reverse $lines $code} $list.Lines $list.Code
    if($before.Known -ne 1 -or $before.Other -ne 0){throw 'roi591-offline-reverse-unexpected-preserve'}
    $remove=Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('reverse','--remove','tcp:8097')
    if($remove.Code -ne 0){throw 'roi591-offline-remove-failed'}
    $list=Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('reverse','--list')
    $after=& $metro {param($lines,$code) Get-Roi591Reverse $lines $code} $list.Lines $list.Code
    if($after.Known -ne 0 -or $after.Other -ne 0){throw 'roi591-offline-reverse-remains-stop'}
    if((Read-Roi591Bundle $adb) -cne $bundle){throw 'roi591-offline-bundle-changed-stop'}
    Assert-Roi591OfflineInstalled $adb
    Assert-AferiRoiSource $BuildPath
    [pscustomobject]@{Tool='roi591-offline-1';Fonte=$id.Source;Sha256ApkInstalado=$id.Candidate
        Sha256Bundle=$bundle;BundleArquivoEstavel=$true;ReverseAtivosDepois=0
        RedesDoTelefoneVerificadas=$false;OfflineComprovado=$false
        InstalacaoExecutada=$false;AberturaSolicitada=$false;CapturaSolicitada=$false}
}
Export-ModuleMember -Function Initialize-AferiRoi591Offline
