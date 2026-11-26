# Fixed SOURCE, unknown APK identity until the author's build. No ADB or installation.
$script:RoiSource = '45f7376a7ed2f7e04725866ffe98ff625f057566'
function Get-AferiRoiSource { return $script:RoiSource }
function Assert-AferiRoiProperty([string[]] $Lines) {
    $settings = @($Lines | Where-Object { $_ -match '^\s*EX_DEV_CLIENT_NETWORK_INSPECTOR\s*=' })
    if ($settings.Count -ne 1 -or $settings[0] -cnotmatch '^\s*EX_DEV_CLIENT_NETWORK_INSPECTOR\s*=\s*false\s*$') {
        throw 'roi-inspector-property-unexpected'
    }
}
function Assert-AferiRoiSource([string] $BuildPath) {
    try {
        $head = @(& git -C $BuildPath rev-parse HEAD 2>$null); $headCode = $LASTEXITCODE
        $changes = @(& git --no-optional-locks -C $BuildPath status --porcelain --untracked-files=all 2>$null); $statusCode = $LASTEXITCODE
    } catch { throw 'roi-source-check-unavailable' }
    if ($headCode -ne 0 -or $head.Count -ne 1 -or $head[0] -cne $script:RoiSource -or
        $statusCode -ne 0 -or $changes.Count -ne 0) { throw 'roi-source-not-clean-preserve' }
}
function Invoke-AferiRoiBuildCommand([string] $Program, [string[]] $Arguments, [string] $FailureCode) {
    try {
        $command = Get-Command $Program -CommandType Application -ErrorAction Stop | Select-Object -First 1
        # Native stderr warnings do not imply failure; require the real exit code.
        $ErrorActionPreference = 'Continue'
        & $command.Source @Arguments 2>&1 | ForEach-Object { Write-Host $_.ToString() }
        $code = $LASTEXITCODE
    } catch { throw $FailureCode }
    if ($code -ne 0) { throw $FailureCode }
}
function Get-AferiRoiHash([string] $ApkPath, [string] $ExpectedSha256) {
    try { $hash = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'roi-apk-hash-unavailable' }
    if ($ExpectedSha256 -cnotmatch '^[0-9a-fA-F]{64}$' -or $hash -cne $ExpectedSha256.ToLowerInvariant()) {
        throw 'roi-apk-identity-unexpected'
    }
    return $hash
}
Export-ModuleMember -Function Get-AferiRoiSource, Assert-AferiRoiProperty, Assert-AferiRoiSource, Invoke-AferiRoiBuildCommand, Get-AferiRoiHash
