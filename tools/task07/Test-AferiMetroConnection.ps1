# Read-only health metadata for the fixed evaluation Metro and ADB reverse mappings.
param([ValidateSet('backup', 'inspector')][string] $Project = 'backup')
$ErrorActionPreference = 'Stop'
function Test-AferiMetroLoopback {
    param([ValidateSet('ipv4', 'ipv6')][string] $Family)
    $url = if ($Family -ceq 'ipv4') { 'http://127.0.0.1:8097/status' } else { 'http://[::1]:8097/status' }
    $response = $null; $reader = $null; $status = $null; $source = $false; $ready = $false; $failure = 'none'
    try {
        $request = [Net.HttpWebRequest]::Create($url)
        $request.Proxy = $null
        $request.AllowAutoRedirect = $false
        $request.Timeout = 3000
        $request.ReadWriteTimeout = 3000
        $request.KeepAlive = $false
        $response = $request.GetResponse()
        $status = [int]$response.StatusCode
        $header = [string]$response.Headers['X-React-Native-Project-Root']
        $root = [Uri]::UnescapeDataString($header).Replace('/', '\').TrimEnd('\')
        $expectedRoot = if ($Project -eq 'inspector') { 'C:\dev\aferi-task07-inspector-build\demos\android-capture' } else { 'C:\dev\aferi-task07-backup-build\demos\android-capture' }
        $source = $root -ieq $expectedRoot
        # /status is a static development health response. Do not read a different server's body.
        if ($status -eq 200 -and $source) {
            $reader = [IO.StreamReader]::new($response.GetResponseStream())
            $buffer = [char[]]::new(64)
            $count = $reader.ReadBlock($buffer, 0, $buffer.Length)
            $ready = [string]::new($buffer, 0, $count).Trim() -ceq 'packager-status:running'
        }
    } catch {
        $failure = 'http-unavailable'
        $errorObject = $_.Exception
        for ($i = 0; $i -lt 5 -and $null -ne $errorObject; $i++) {
            if ($errorObject -is [Net.WebException]) {
                $failure = $errorObject.Status.ToString()
                if ($null -ne $errorObject.Response) {
                    $status = [int]$errorObject.Response.StatusCode
                    $errorObject.Response.Close()
                }
                break
            }
            $errorObject = $errorObject.InnerException
        }
    } finally {
        if ($null -ne $reader) { $reader.Dispose() }
        if ($null -ne $response) { $response.Close() }
    }
    [pscustomobject]@{ Loopback = $Family; HttpStatus = $status; FonteEsperada = $source; MetroPronto = $ready; Falha = $failure }
}
function Convert-AferiReverseHealth {
    param([object[]] $Lines, [int] $Code)
    if ($Code -ne 0) {
        return [pscustomobject]@{ Disponivel = $false; Reverse8097Conhecido = $null; OutrasLinhas = $null; Conflito8097 = $null }
    }
    $nonempty = @($Lines | Where-Object { $_.ToString().Trim().Length -gt 0 })
    $known = @($nonempty | Where-Object { $_ -is [string] -and $_ -match '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
    $conflicts = @($nonempty | Where-Object { $_ -is [string] -and $_ -match '^\S+\s+tcp:8097\s+' -and $_ -notmatch '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
    [pscustomobject]@{ Disponivel = $true; Reverse8097Conhecido = $known.Count; OutrasLinhas = $nonempty.Count - $known.Count; Conflito8097 = ($conflicts.Count -gt 0) }
}
$metro = @(Test-AferiMetroLoopback 'ipv4'; Test-AferiMetroLoopback 'ipv6')
$reverse = Convert-AferiReverseHealth @() 1
$aferiAdbHealth = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (Test-Path -LiteralPath $aferiAdbHealth -PathType Leaf) {
    try {
        $raw = @(& $aferiAdbHealth -d reverse --list 2>&1)
        $reverse = Convert-AferiReverseHealth $raw $LASTEXITCODE
    } catch { $reverse = Convert-AferiReverseHealth @() 1 }
}
[pscustomobject]@{ Tool = 'metro-link-1'; Projeto = $Project; Metro = $metro; Reverse = $reverse } | ConvertTo-Json -Depth 6
