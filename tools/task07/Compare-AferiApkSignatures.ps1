# Explicit local evaluation APKs; defaults preserve the original comparison.
param(
    [string] $OldApkPath = 'C:\dev\aferi-task07-integracao\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk',
    [ValidatePattern('^[0-9a-fA-F]{64}$')][string] $OldExpectedSha256 = '69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c',
    [string] $NewApkPath = 'C:\dev\aferi-task07-backup-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk',
    [ValidatePattern('^[0-9a-fA-F]{64}$')][string] $NewExpectedSha256 = 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed'
)
$ErrorActionPreference = 'Stop'
$aferiSigner = Join-Path $env:LOCALAPPDATA 'Android\Sdk\build-tools\36.0.0\apksigner.bat'
if ($aferiSigner -match '[&|<>^%!"\x00-\x1f]' -or
    -not (Test-Path -LiteralPath $aferiSigner -PathType Leaf)) {
    throw 'apksigner-unavailable'
}
try { $aferiSignerVersionRaw = @(& $aferiSigner version 2>&1); $aferiSignerVersionCode = $LASTEXITCODE }
catch { throw 'apksigner-version-unavailable' }
if ($aferiSignerVersionCode -ne 0 -or $aferiSignerVersionRaw.Count -ne 1 -or
    $aferiSignerVersionRaw[0].ToString().Trim() -notmatch '^[0-9]+\.[0-9]+(?:\.[0-9]+)?$') {
    throw 'apksigner-version-unrecognized'
}
$aferiSignerVersion = $aferiSignerVersionRaw[0].ToString().Trim()

function Read-AferiSignerDigest {
    param([string] $ApkPath, [string] $ExpectedSha256)
    if ([IO.Path]::GetExtension($ApkPath) -ine '.apk' -or $ApkPath -match '[&|<>^%!"\x00-\x1f]' -or
        -not (Test-Path -LiteralPath $ApkPath -PathType Leaf)) {
        throw 'signature-apk-unavailable'
    }
    try { $before = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'signature-hash-unavailable' }
    if ($before -cne $ExpectedSha256.ToLowerInvariant()) { throw 'signature-apk-changed' }
    try { $raw = @(& $aferiSigner verify --print-certs $ApkPath 2>&1); $code = $LASTEXITCODE }
    catch { throw 'signature-verification-unavailable' }
    if ($code -ne 0) { throw 'signature-verification-failed' }
    $certificates = @($raw | Where-Object { $_.ToString() -match '^Signer #[0-9]+ certificate SHA-256 digest:' })
    if ($certificates.Count -ne 1 -or
        $certificates[0].ToString() -notmatch '^Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]{64})\s*$') {
        throw 'signature-signer-format-unexpected'
    }
    $digest = $Matches[1].ToLowerInvariant()
    try { $after = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'signature-hash-unavailable' }
    if ($after -cne $before) { throw 'signature-apk-changed' }
    [pscustomobject]@{ Hash = $after; Digest = $digest }
}

$aferiAnterior = Read-AferiSignerDigest -ApkPath $OldApkPath -ExpectedSha256 $OldExpectedSha256
$aferiNovo = Read-AferiSignerDigest -ApkPath $NewApkPath -ExpectedSha256 $NewExpectedSha256

[pscustomobject]@{
    Tool = 'assinatura-1'
    ApkSignerVersion = $aferiSignerVersion
    Sha256Anterior = $aferiAnterior.Hash
    Sha256Novo = $aferiNovo.Hash
    AssinaturasVerificadas = $true
    CertificadosIguais = ($aferiAnterior.Digest -ceq $aferiNovo.Digest)
} | ConvertTo-Json
