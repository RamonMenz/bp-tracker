$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiManifestMetadata.psm1') -Force
$module = Get-Module AferiManifestMetadata
function Assert($Condition, [string] $Name) { if (-not $Condition) { throw "check-failed:$Name" } }
$tree = @'
N: android=http://schemas.android.com/apk/res/android (line=1)
  E: manifest (line=1)
    A: package="com.ramonmenz.afericapturetest" (Raw: "com.ramonmenz.afericapturetest")
      E: uses-sdk (line=1)
        A: http://schemas.android.com/apk/res/android:targetSdkVersion(0x01010270)=36
      E: uses-permission (line=1)
        A: http://schemas.android.com/apk/res/android:name(0x01010003)="android.permission.CAMERA"
        A: http://schemas.android.com/apk/res/android:maxSdkVersion(0x01010271)=32
      E: uses-permission (line=1)
        A: http://schemas.android.com/apk/res/android:name(0x01010003)="PRIVATE-PERMISSION"
      E: application (line=1)
        A: http://schemas.android.com/apk/res/android:allowBackup(0x01010280)=false
        A: http://schemas.android.com/apk/res/android:usesCleartextTraffic(0x010104ec)=true
        A: http://schemas.android.com/apk/res/android:label(0x01010001)="PRIVATE-LABEL"
        A: http://schemas.android.com/apk/res/android:debuggable(0x0101000f)=(type 0x12)0xffffffff
        A: http://schemas.android.com/apk/res/android:dataExtractionRules(0x0101064e)=@0x7f030001
        A: http://schemas.android.com/apk/res/android:fullBackupContent(0x010104eb)="PRIVATE-VALUE"
          E: activity (line=1)
            A: http://schemas.android.com/apk/res/android:networkSecurityConfig(0x01010527)=@0x7f030002
'@ -split "`n"
$result = & $module { param($lines) ConvertFrom-AferiManifestTree $lines } $tree
Assert ($result.Aplicacao.allowBackup -eq 'false' -and $result.Aplicacao.usesCleartextTraffic -eq 'true') 'booleans'
Assert ($result.Aplicacao.debuggable -eq 'true') 'typed-boolean'
Assert ($result.Aplicacao.networkSecurityConfig -eq 'nao-declarado') 'nested-attribute-ignored'
Assert ($result.Aplicacao.fullBackupContent -eq 'nao-interpretado') 'unknown-not-false'
Assert ($result.Aplicacao.dataExtractionRules -eq 'referencia-presente') 'reference'
Assert ($result.PermissoesDeclaradas.Count -eq 1 -and $result.PermissoesDeclaradas[0].MaxSdkVersion -eq '32') 'permission-and-maxsdk'
Assert ($result.PermissoesNaoDeclaradas -contains 'android.permission.INTERNET') 'missing-declaration'
Assert (-not ($result | ConvertTo-Json -Depth 8).Contains('PRIVATE')) 'no-private-values'
foreach ($bad in @(
    ($tree -replace 'com.ramonmenz.afericapturetest','PRIVATE-PACKAGE'),
    ($tree | Where-Object { $_ -notmatch 'E: application' }),
    ($tree -replace ':name\(',':unparsedName('),
    ($tree -replace 'E: activity','E: application'),
    ((($tree -join "`n") -replace 'A: http://schemas.android.com/apk/res/android:usesCleartextTraffic', ('A: http://schemas.android.com/apk/res/android:allowBackup(0x01010280)=false' + "`n        A: http://schemas.android.com/apk/res/android:usesCleartextTraffic")) -split "`n")
)) {
    $rejected = $false
    try { & $module { param($lines) ConvertFrom-AferiManifestTree $lines } $bad | Out-Null }
    catch { $rejected = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'safe-parser-error' }
    Assert $rejected 'reject-partial-or-mismatched-tree'
}
$captured = & $module {
    param($program)
    Invoke-AferiAapt2 $program '-NoLogo -NoProfile -Command "[Console]::Out.WriteLine(''PUBLIC-OUT''); [Console]::Error.WriteLine(''PRIVATE-ERR'')"'
} (Get-Process -Id $PID).Path
Assert ($captured.Code -eq 0 -and $captured.Lines.Count -eq 2) 'capture-both-native-streams'
Assert ($captured.Lines -contains 'PUBLIC-OUT' -and $captured.Lines -contains 'PRIVATE-ERR') 'stderr-not-console'
$temp = Join-Path ([IO.Path]::GetTempPath()) ('aferi-manifest-check-' + [guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($temp)
try {
    $apk = Join-Path $temp 'synthetic.apk'; 'synthetic-only' | Set-Content -LiteralPath $apk
    $hash = (Get-FileHash $apk -Algorithm SHA256).Hash
    $fixture = Join-Path $temp 'tree.txt'; $tree | Set-Content -LiteralPath $fixture
    $fake = Join-Path $temp 'aapt2-stub.ps1'
    'fixture-program' | Set-Content -LiteralPath $fake
    & $module {
        param($fixtureLines)
        $script:AferiManifestFixture = $fixtureLines
        $script:AferiManifestNativeFailure = $false
        $script:AferiManifestBadVersion = $false
        function script:Invoke-AferiAapt2([string] $Program, [string] $Arguments) {
            if ($script:AferiManifestNativeFailure) { return [pscustomobject]@{ Code = 1; Lines = @('PRIVATE-ERROR') } }
            if ($Arguments -eq 'version' -and $script:AferiManifestBadVersion) { return [pscustomobject]@{ Code = 0; Lines = @('Android Asset Packaging Tool (aapt) PRIVATE-VERSION') } }
            if ($Arguments -eq 'version') { return [pscustomobject]@{ Code = 0; Lines = @('Android Asset Packaging Tool (aapt) 2.19-12345') } }
            if ($Arguments -notmatch '^dump xmltree --file AndroidManifest.xml ".+\.apk"$') { throw 'bad-command' }
            [pscustomobject]@{ Code = 0; Lines = $script:AferiManifestFixture }
        }
    } $tree
    $actual = Get-AferiManifestMetadata -Aapt2Path $fake -ApkPath $apk -ExpectedSha256 $hash
    Assert ($actual.Tool -eq 'manifesto-1' -and $actual.Aapt2Version -eq '2.19-12345') 'fixed-native-commands'
    Assert (-not ($actual | ConvertTo-Json -Depth 8).Contains('PRIVATE')) 'safe-public-output'
    & $module { $script:AferiManifestBadVersion = $true }
    $rejected = $false
    try { Get-AferiManifestMetadata -Aapt2Path $fake -ApkPath $apk -ExpectedSha256 $hash | Out-Null }
    catch { $rejected = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'safe-version-error' }
    Assert $rejected 'unrecognized-version-rejected'
    & $module { $script:AferiManifestBadVersion = $false }

    $rejected = $false
    try { Get-AferiManifestMetadata -Aapt2Path $fake -ApkPath $apk -ExpectedSha256 ('0' * 64) | Out-Null }
    catch { $rejected = $true }
    Assert $rejected 'changed-apk-rejected'
    & $module { $script:AferiManifestNativeFailure = $true }
    $rejected = $false
    try { Get-AferiManifestMetadata -Aapt2Path $fake -ApkPath $apk -ExpectedSha256 $hash | Out-Null }
    catch { $rejected = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'safe-native-error' }
    Assert $rejected 'native-failure-rejected'
} finally { Remove-Item -LiteralPath $temp -Recurse -Force; Remove-Module AferiManifestMetadata }
'Manifesto: whitelist, escopo application, ausencias, valores desconhecidos, identidade e fronteira nativa simulada aprovados.'
