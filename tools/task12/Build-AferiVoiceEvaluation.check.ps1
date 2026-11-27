$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiVoiceEvaluation.psm1') -Force
$voice = Get-Module AferiVoiceEvaluation
$manifestModule = & $voice { Get-Module AferiManifestMetadata }
function Assert([bool] $Condition, [string] $Check) { if (-not $Condition) { throw "voice-build-check:$Check" } }
function Reject([scriptblock] $Action, [string] $Code) {
    try { $null = & $Action } catch { Assert ($_.Exception.Message -ceq $Code) $Code; return }
    throw "voice-build-check:expected-$Code"
}

$package = 'com.ramonmenz.aferivoicetest'
$manifest = @(
    'E: manifest (line=1)', "  A: package=`"$package`"",
    '    E: uses-permission (line=1)', '      A: android:name="android.permission.RECORD_AUDIO"',
    '    E: application (line=1)', '      A: android:allowBackup(0x01010280)=(type 0x12)0x0',
    '      A: android:fullBackupContent(0x010104eb)=@0x7f010000',
    '      A: android:dataExtractionRules(0x0101064e)=@0x7f010001'
)
$table = @(
    '  type xml id=01 entryCount=2',
    '    resource 0x7f010000 xml/aferi_voice_backup_rules',
    '      () (file) res/xml/aferi_voice_backup_rules.xml type=XML',
    '    resource 0x7f010001 xml/aferi_voice_data_extraction_rules',
    '      () (file) res/xml/aferi_voice_data_extraction_rules.xml type=XML'
)
function New-RuleTree([string] $Root, [string[]] $Sections) {
    "E: $Root (line=1)"
    foreach ($section in $Sections) {
        $indent = '    '
        if ($section) { "${indent}E: $section (line=2)"; $indent += '    ' }
        foreach ($domain in @('root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref')) {
            "${indent}E: exclude (line=3)"
            "${indent}  A: domain=`"$domain`""
            "${indent}  A: path=`".`""
        }
    }
}
& $manifestModule {
    param($Manifest, $Table, $Legacy, $Modern)
    $script:fixture = @{ Manifest = $Manifest; Table = $Table; Legacy = $Legacy; Modern = $Modern; Mode = 'ok' }
    function script:Invoke-AferiAapt2([string] $Program, [string] $Arguments) {
        $lines = switch -Regex ($Arguments) {
            '^version$' { 'Android Asset Packaging Tool (aapt) 2.20-13193326' }
            '^dump xmltree --file AndroidManifest.xml "' {
                if ($script:fixture.Mode -eq 'wrong-package') { $script:fixture.Manifest -replace 'aferivoicetest','afericapturetest' }
                elseif ($script:fixture.Mode -eq 'backup-on') { $script:fixture.Manifest -replace '0x12\)0x0','0x12)0xffffffff' }
                elseif ($script:fixture.Mode -eq 'no-mic') { $script:fixture.Manifest[0,1,4,5,6,7] }
                elseif ($script:fixture.Mode -in @('camera','media')) {
                    $permission = if ($script:fixture.Mode -eq 'camera') { 'CAMERA' } else { 'READ_MEDIA_VISUAL_USER_SELECTED' }
                    $script:fixture.Manifest + @('    E: uses-permission-sdk-23 (line=2)', "      A: android:name=`"android.permission.$permission`"")
                } else { $script:fixture.Manifest }
            }
            '^dump resources "' {
                if ($script:fixture.Mode -eq 'wrong-rules') { $script:fixture.Table -replace 'aferi_voice','aferi_capture' }
                else { $script:fixture.Table }
            }
            '^dump xmltree --file res/xml/aferi_voice_backup_rules.xml "' { $script:fixture.Legacy }
            '^dump xmltree --file res/xml/aferi_voice_data_extraction_rules.xml "' { $script:fixture.Modern }
            default { throw 'voice-build-check:unexpected-aapt2-command' }
        }
        [pscustomobject]@{ Code = 0; Lines = @($lines) }
    }
} $manifest $table @(New-RuleTree 'full-backup-content' @('')) @(New-RuleTree 'data-extraction-rules' @('cloud-backup','device-transfer'))

$temp = Join-Path ([IO.Path]::GetTempPath()) ('voice-build-check-' + [Guid]::NewGuid())
$null = New-Item -Path $temp -ItemType Directory
$previousLocal = $env:LOCALAPPDATA
try {
    $env:LOCALAPPDATA = $temp
    $sdkBin = Join-Path $temp 'Android/Sdk/build-tools/36.0.0'
    $null = New-Item -Path $sdkBin -ItemType Directory -Force
    [IO.File]::WriteAllText((Join-Path $sdkBin 'aapt2.exe'), 'synthetic')
    & $voice {
        param($Temp)
        $script:commit = 'a' * 40
        $script:build = Join-Path $Temp 'PRIVATE destination'
        $script:sourceMode = 'ok'
        $script:commands = [Collections.Generic.List[string]]::new()
        function script:Invoke-VoiceBuildCommand([string] $Program, [string[]] $Arguments, [string] $FailureCode) {
            $script:commands.Add(($Program + ' ' + ($Arguments -join ' ')))
            switch -Regex ($Arguments[0]) {
                '^worktree$' {
                    if (($Arguments -join '|') -cne "worktree|add|--detach|$script:build|$script:commit") { throw 'voice-build-check:worktree-arguments' }
                    $android = Join-Path $script:build 'demos/android-voice/android'
                    $apkDir = Join-Path $android 'app/build/outputs/apk/debug'
                    $null = New-Item -Path $apkDir -ItemType Directory -Force
                    [IO.File]::WriteAllText((Join-Path $android '../app.json'), '{"expo":{"android":{"package":"com.ramonmenz.aferivoicetest","allowBackup":false}}}')
                    $setting = if ($script:sourceMode -eq 'inspector') { 'true' } else { 'false' }
                    [IO.File]::WriteAllText((Join-Path $android 'gradle.properties'), "EX_DEV_CLIENT_NETWORK_INSPECTOR=$setting")
                    [IO.File]::WriteAllText((Join-Path $apkDir 'app-debug.apk'), 'synthetic')
                }
                '^rev-parse$' { if ($script:sourceMode -eq 'head') { 'b' * 40 } else { $script:commit } }
                '^--no-optional-locks$' { if ($script:sourceMode -eq 'dirty') { '?? PRIVATE' } }
                '^ci$' { Assert (($Arguments -join ' ') -ceq 'ci --ignore-scripts --no-audit --no-fund') 'npm' }
                '^tools/task07/Aferi(?:BackupRules|NetworkInspector)\.check\.cjs$' { Assert ($Arguments[1] -ceq '--voice') 'node-check' }
                '^../../node_modules/expo/bin/cli$' { Assert (($Arguments -join ' ') -cmatch 'prebuild --platform android --no-install$') 'prebuild' }
                '^:app:assembleDebug$' {
                    Assert ($Program -ceq '.\gradlew.bat' -and $Arguments -ccontains '-PreactNativeArchitectures=arm64-v8a' -and
                        $Arguments -ccontains '-PEX_DEV_CLIENT_NETWORK_INSPECTOR=false') 'assemble'
                }
                default { throw 'voice-build-check:unexpected-command' }
            }
        }
        Assert-VoiceInspectorProperty @('unrelated=true','EX_DEV_CLIENT_NETWORK_INSPECTOR=false')
        Reject { Assert-VoiceInspectorProperty @('EX_DEV_CLIENT_NETWORK_INSPECTOR=false','EX_DEV_CLIENT_NETWORK_INSPECTOR:true') } 'voice-inspector-property-unexpected'
        $summary = Build-VoiceEvaluation $Temp $script:commit $script:build
        Assert ($script:commands.Count -eq 10 -and $summary.FonteLimpa -and $summary.ArquiteturaSolicitada -ceq 'arm64-v8a') 'build-steps'
        Assert ($summary.Manifesto.Pacote -ceq 'com.ramonmenz.aferivoicetest' -and $summary.Backup.ReferenciasConferidas -and
            $summary.Backup.Regras.Count -eq 3 -and $summary.Sha256Apk -cmatch '^[0-9a-f]{64}$') 'metadata'
        Assert (($summary | ConvertTo-Json -Depth 10) -cnotmatch 'PRIVATE') 'sanitized'
        Reject { Build-VoiceEvaluation $Temp $script:commit $script:build } 'voice-build-destination-exists'
        foreach ($invalid in @('head','dirty','inspector')) {
            Remove-Item -LiteralPath $script:build -Recurse -Force
            $script:sourceMode = $invalid
            $script:commands.Clear()
            $code = if ($invalid -eq 'inspector') { 'voice-inspector-property-unexpected' } else { 'voice-source-not-clean' }
            Reject { Build-VoiceEvaluation $Temp $script:commit $script:build } $code
            Assert (@($script:commands | Where-Object { $_ -match 'assembleDebug' }).Count -eq 0) 'reject-before-assemble'
        }
        $apk = Join-Path $script:build 'demos/android-voice/android/app/build/outputs/apk/debug/app-debug.apk'
        $aapt = Join-Path (Get-VoiceSdk) 'build-tools/36.0.0/aapt2.exe'
        $hash = Get-VoiceApkHash $apk
        $metadataModule = Get-Module AferiManifestMetadata
        $cases = @{
            'wrong-package' = 'manifest-structure-unexpected'; 'no-mic' = 'voice-apk-permissions-unexpected'
            camera = 'voice-apk-permissions-unexpected'; media = 'voice-apk-permissions-unexpected'
            'backup-on' = 'backup-allow-backup-unexpected'; 'wrong-rules' = 'backup-resources-incomplete'
        }
        foreach ($mode in $cases.Keys) {
            & $metadataModule { param($Mode) $script:fixture.Mode = $Mode } $mode
            Reject { Get-VoiceApkMetadata $aapt $apk $hash } $cases[$mode]
        }
    } $temp
} finally {
    $env:LOCALAPPDATA = $previousLocal
    Remove-Item -LiteralPath $temp -Recurse -Force
}
$parseErrors = $null; $tokens = $null
$null = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Build-AferiVoiceEvaluation.ps1'), [ref]$tokens, [ref]$parseErrors)
Assert ($parseErrors.Count -eq 0) 'entrypoint-syntax'
'Voice build: worktree, commands, APK metadata and rejected policies passed with synthetic fixtures.'
