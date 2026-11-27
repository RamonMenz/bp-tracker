Import-Module (Join-Path $PSScriptRoot 'AferiRoiCandidate.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Readiness.psm1') -ErrorAction Stop
Import-Module (Join-Path $PSScriptRoot '../task07/AferiEvaluationAdb.psm1') -ErrorAction Stop
function Get-Roi591Reverse([object[]] $Lines, [int] $Code) {
    if ($Code -ne 0) { throw 'roi591-reverse-unavailable' }
    $valid=@($Lines | Where-Object { $_ -is [string] -and $_ -match '^\S+\s+tcp:[0-9]+\s+tcp:[0-9]+\s*$' })
    if ($valid.Count -ne $Lines.Count) { throw 'roi591-reverse-format-unexpected' }
    $known=@($valid | Where-Object { $_ -match '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
    $conflicts=@($valid | Where-Object { $_ -match '^\S+\s+tcp:8097\s+' -and $_ -notmatch '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
    if ($conflicts.Count -gt 0 -or $known.Count -gt 1) { throw 'roi591-reverse-conflict-preserve' }
    [pscustomobject]@{ Known=$known.Count; Other=$valid.Count-$known.Count }
}
function Test-Roi591MetroSource([string] $ExpectedRoot) {
    $response=$null;$reader=$null
    try {
        $request=[Net.HttpWebRequest]::Create('http://127.0.0.1:8097/status')
        $request.Proxy=$null;$request.AllowAutoRedirect=$false;$request.Timeout=3000;$request.ReadWriteTimeout=3000
        $response=$request.GetResponse()
        $root=[Uri]::UnescapeDataString([string]$response.Headers['X-React-Native-Project-Root']).Replace('/','\').TrimEnd('\')
        if ([int]$response.StatusCode -ne 200 -or $root -ine $ExpectedRoot.Replace('/','\').TrimEnd('\')) { return $false }
        $reader=[IO.StreamReader]::new($response.GetResponseStream())
        $buffer=[char[]]::new(64);$count=$reader.ReadBlock($buffer,0,64)
        return [string]::new($buffer,0,$count).Trim() -ceq 'packager-status:running'
    } catch { return $false }
    finally { if($reader){$reader.Dispose()};if($response){$response.Close()} }
}
function Initialize-AferiRoi591Metro([string] $BuildPath) {
    $id=Get-AferiRoi591Identity
    Assert-AferiRoiSource $BuildPath
    $null=Get-AferiRoiHash (Join-Path $BuildPath 'demos/android-capture/android/app/build/outputs/apk/debug/app-debug.apk') $id.Candidate
    $expected=(Resolve-Path -LiteralPath (Join-Path $BuildPath 'demos/android-capture')).Path
    if(-not (Test-Roi591MetroSource $expected)){throw 'roi591-metro-source-or-status-unexpected'}
    $adb=Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
    $installed=Get-AferiRoiInstalledIdentity $adb
    if($installed.EstadoAdb -cne 'device' -or $installed.ModeloConfere -ne $true -or $installed.Sha256Instalado -cne $id.Candidate){throw 'roi591-metro-installed-unexpected'}
    $list=Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('reverse','--list')
    $before=Get-Roi591Reverse $list.Lines $list.Code
    if($before.Known -eq 0){
        $set=Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('reverse','tcp:8097','tcp:8097')
        if($set.Code -ne 0){throw 'roi591-reverse-set-failed'}
    }
    $list=Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('reverse','--list')
    $after=Get-Roi591Reverse $list.Lines $list.Code
    if($after.Known -ne 1 -or $after.Other -ne $before.Other){throw 'roi591-reverse-after-unexpected'}
    Assert-AferiRoiSource $BuildPath
    [pscustomobject]@{Tool='roi591-metro-1';Fonte=$id.Source;Sha256Instalado=$installed.Sha256Instalado
        FonteEsperada=$true;MetroPronto=$true;Reverse8097Conhecido=1;OutrasLinhas=$after.Other
        InstalacaoExecutada=$false;AberturaSolicitada=$false;CapturaSolicitada=$false}
}
Export-ModuleMember -Function Initialize-AferiRoi591Metro
