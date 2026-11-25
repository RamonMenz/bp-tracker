$ErrorActionPreference = 'Stop'
function Assert($Condition, [string] $Name) { if (-not $Condition) { throw "check-failed:$Name" } }
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Compare-AferiApkSignatures.ps1'), [ref]$tokens, [ref]$errors)
Assert ($errors.Count -eq 0) 'syntax'
$definition = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Read-AferiSignerDigest' }, $true)
Assert ($null -ne $definition) 'function-present'
# Only the checked local function is loaded; fixed Windows paths/frontend are not executed.
Invoke-Expression $definition.Extent.Text
$temp = Join-Path ([IO.Path]::GetTempPath()) ('aferi-signature-check-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $temp)
try {
    $apk = Join-Path $temp 'synthetic.apk'
    [IO.File]::WriteAllText($apk, 'STATIC-FIXTURE')
    $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
    $signatureState = @{ Mode = 'good' }
    $aferiSigner = {
        param($Command, $Option, $Path)
        if ($Command -cne 'verify' -or $Option -cne '--print-certs' -or $Path -cne $apk) { throw 'unexpected-command' }
        $global:LASTEXITCODE = 0
        'Signer #1 certificate DN: PRIVATE'
        'Signer #1 public key SHA-256 digest: PRIVATE'
        if ($signatureState.Mode -eq 'bad-code') { $global:LASTEXITCODE = 1; 'PRIVATE'; return }
        if ($signatureState.Mode -eq 'bad-format') { 'Signer #1 certificate SHA-256 digest: PRIVATE'; return }
        'Signer #1 certificate SHA-256 digest: ' + ('a' * 64)
        if ($signatureState.Mode -eq 'multiple') { 'Signer #2 certificate SHA-256 digest: ' + ('b' * 64) }
        if ($signatureState.Mode -eq 'mutate') { [IO.File]::WriteAllText($apk, 'CHANGED') }
    }.GetNewClosure()
    $result = Read-AferiSignerDigest -ApkPath $apk -ExpectedSha256 $hash
    Assert ($result.Hash -eq $hash -and $result.Digest -ceq ('a' * 64)) 'private-certificate-metadata'
    Assert (-not ($result | ConvertTo-Json).Contains('PRIVATE')) 'private-output'
    foreach ($mode in @('bad-code','bad-format','multiple','mutate')) {
        $signatureState.Mode = $mode
        $rejected = $false
        try { Read-AferiSignerDigest -ApkPath $apk -ExpectedSha256 $hash | Out-Null }
        catch { $rejected = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'private-error' }
        Assert $rejected ('reject-' + $mode)
    }
    $signatureState.Mode = 'good'
    foreach ($badPath in @((Join-Path $temp 'missing.apk'), (Join-Path $temp 'unsafe%name.apk'))) {
        $rejected = $false
        try { Read-AferiSignerDigest -ApkPath $badPath -ExpectedSha256 $hash | Out-Null }
        catch { $rejected = $true }
        Assert $rejected 'missing-or-batch-metacharacter'
    }
} finally { Remove-Item -LiteralPath $temp -Recurse -Force }
'Signatures: syntax, private output/errors, fixed verify command, hash changes, multiple signer and batch path guards passed; no real apksigner/device executed.'
