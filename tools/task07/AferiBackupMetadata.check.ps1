$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiManifestMetadata.psm1') -Force
$module = Get-Module AferiManifestMetadata
function Assert($Condition, [string] $Name) { if (-not $Condition) { throw "check-failed:$Name" } }
$domains = @('root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref')
function New-RuleFixture([bool] $Modern) {
    $lines = [Collections.Generic.List[string]]::new()
    if ($Modern) { $lines.Add('E: data-extraction-rules (line=1)'); $sections = @('cloud-backup','device-transfer') }
    else { $lines.Add('E: full-backup-content (line=1)'); $sections = @('legacy') }
    foreach ($section in $sections) {
        $indent = 4
        if ($Modern) { $lines.Add("    E: $section (line=1)"); $indent = 8 }
        foreach ($domain in $domains) {
            $lines.Add((' ' * $indent) + 'E: exclude (line=1)')
            $lines.Add((' ' * ($indent + 2)) + 'A: domain="' + $domain + '" (Raw: "' + $domain + '")')
            $lines.Add((' ' * ($indent + 2)) + 'A: path="." (Raw: ".")')
        }
    }
    return $lines.ToArray()
}
$legacy = @(New-RuleFixture $false); $modern = @(New-RuleFixture $true)
$manifest = @'
E: manifest (line=1)
  A: package="com.ramonmenz.afericapturetest" (Raw: "com.ramonmenz.afericapturetest")
    E: application (line=1)
      A: http://schemas.android.com/apk/res/android:allowBackup(0x01010280)=false
      A: http://schemas.android.com/apk/res/android:fullBackupContent(0x010104eb)=@0x7f010000
      A: http://schemas.android.com/apk/res/android:dataExtractionRules(0x0101064e)=@0x7f010001
        E: activity (line=1)
          A: android:dataExtractionRules(0x0101064e)=@0x7f010099
'@ -split "`n"
$table = @'
Binary APK
Package name=com.ramonmenz.afericapturetest id=7f
  type xml id=01 entryCount=2
    resource 0x7f010000 xml/aferi_capture_backup_rules
      () (file) res/xml/aferi_capture_backup_rules.xml type=XML
      Flag disabled values:
    resource 0x7f010001 xml/aferi_capture_data_extraction_rules
      () (file) res/xml/aferi_capture_data_extraction_rules.xml type=XML
      Flag disabled values:
'@ -split "`n"
$ids = & $module { param($lines) Get-AferiBackupReferenceIds $lines } $manifest
Assert ($ids.Count -eq 2 -and $ids['dataExtractionRules'] -eq '0x7f010001') 'application-scope'
foreach ($bad in @(@($manifest -replace '7f010001', '7f010000'), @($manifest | Where-Object { $_ -notmatch 'fullBackupContent' }))) {
    $rejected = $false
    try { & $module { param($lines) Get-AferiBackupReferenceIds $lines } $bad | Out-Null }
    catch { $rejected = $true }
    Assert $rejected 'distinct-direct-references-required'
}
& $module { param($lines, $ids) ConvertFrom-AferiBackupResources $lines $ids } $table $ids
$summary = @(& $module { param($lines) ConvertFrom-AferiBackupRuleTree $lines 'legado' } $legacy)
Assert ($summary.Count -eq 1 -and $summary[0].DominiosExcluidos -eq 9) 'legacy'
$summary = @(& $module { param($lines) ConvertFrom-AferiBackupRuleTree $lines 'moderno' } $modern)
Assert ($summary.Count -eq 2 -and @($summary | Where-Object { -not $_.SomenteExclusoesRaiz }).Count -eq 0) 'modern'
function Reject-Rule($Lines, $Kind) {
    $rejected = $false
    try { & $module { param($lines, $kind) ConvertFrom-AferiBackupRuleTree $lines $kind } $Lines $Kind | Out-Null }
    catch { $rejected = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'private-rule-error' }
    Assert $rejected 'bad-rule-rejected'
}
Reject-Rule @() 'legado'
Reject-Rule @($legacy[0..($legacy.Count - 4)]) 'legado'
Reject-Rule @($legacy -replace 'domain="file"', 'domain="root"') 'legado'
Reject-Rule @($legacy -replace 'E: exclude', 'E: include') 'legado'
Reject-Rule @($legacy -replace 'path="\."', 'path="PRIVATE"') 'legado'
Reject-Rule @($legacy -replace 'full-backup-content', 'PRIVATE') 'legado'
Reject-Rule @($modern -replace 'device-transfer', 'cloud-backup') 'moderno'
Reject-Rule @($modern + '    E: cross-platform-transfer (line=1)') 'moderno'
Reject-Rule @($legacy + '      A: PRIVATE="PRIVATE"') 'legado'
Reject-Rule @($legacy + 'PRIVATE') 'legado'
foreach ($bad in @(
    @($table -replace 'resource 0x7f010001', 'resource 0x7f010099'),
    @($table -replace 'res/xml/aferi_capture_backup_rules.xml', 'res/xml/PRIVATE.xml'),
    @($table -replace '\(\) \(file\)', '(v31) (file)'),
    @($table + '    resource 0x7f010000 xml/aferi_capture_backup_rules'),
    @($table | Where-Object { $_ -notmatch '\(file\)' })
)) {
    $rejected = $false
    try { & $module { param($lines, $ids) ConvertFrom-AferiBackupResources $lines $ids } $bad $ids }
    catch { $rejected = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'private-table-error' }
    Assert $rejected 'bad-table-rejected'
}
$temp = Join-Path ([IO.Path]::GetTempPath()) ('aferi-backup-metadata-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $temp)
try {
    $apk = Join-Path $temp 'synthetic.apk'; $fake = Join-Path $temp 'fake-aapt2'
    [IO.File]::WriteAllText($apk, 'STATIC-FIXTURE'); [IO.File]::WriteAllText($fake, 'STATIC-FIXTURE')
    $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
    & $module {
        param($manifest, $table, $legacy, $modern, $apk)
        $script:BackupManifest = $manifest; $script:BackupTable = $table
        $script:BackupLegacy = $legacy; $script:BackupModern = $modern
        $script:BackupApk = $apk; $script:BackupMutate = $false
        function script:Invoke-AferiAapt2([string] $Program, [string] $Arguments) {
            if ($Arguments -eq 'version') { return [pscustomobject]@{ Code = 0; Lines = @('Android Asset Packaging Tool (aapt) 2.20-13193326') } }
            $suffix = ' "' + $script:BackupApk + '"'
            if ($Arguments -ceq ('dump xmltree --file AndroidManifest.xml' + $suffix)) { $lines = $script:BackupManifest }
            elseif ($Arguments -ceq ('dump resources' + $suffix)) { $lines = $script:BackupTable }
            elseif ($Arguments -ceq ('dump xmltree --file res/xml/aferi_capture_backup_rules.xml' + $suffix)) { $lines = $script:BackupLegacy }
            elseif ($Arguments -ceq ('dump xmltree --file res/xml/aferi_capture_data_extraction_rules.xml' + $suffix)) {
                $lines = $script:BackupModern
                if ($script:BackupMutate) { [IO.File]::WriteAllText($script:BackupApk, 'CHANGED') }
            } else { throw 'unexpected-native-command' }
            return [pscustomobject]@{ Code = 0; Lines = $lines }
        }
    } $manifest $table $legacy $modern $apk
    $actual = Get-AferiBackupMetadata -Aapt2Path $fake -ApkPath $apk -ExpectedSha256 $hash
    Assert ($actual.Tool -eq 'backup-1' -and $actual.ReferenciasConferidas -and $actual.Regras.Count -eq 3) 'public-boundary'
    Assert (-not ($actual | ConvertTo-Json -Depth 6).Contains($temp)) 'no-private-paths'
    & $module { $script:BackupMutate = $true }
    $rejected = $false
    try { Get-AferiBackupMetadata -Aapt2Path $fake -ApkPath $apk -ExpectedSha256 $hash | Out-Null }
    catch { $rejected = $true; Assert ($_.ToString() -match 'backup-apk-changed') 'post-read-hash' }
    Assert $rejected 'changed-during-analysis-rejected'
} finally { Remove-Item -LiteralPath $temp -Recurse -Force; Remove-Module AferiManifestMetadata }
'Backup metadata: references, resource linkage, exact sections/exclusions, rejection and private output passed; no device or real APK.'
