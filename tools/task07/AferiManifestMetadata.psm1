Set-StrictMode -Version Latest

function Convert-AferiManifestScalar([string] $Value) {
    if ($Value -match '^(true|false)$') { return $Value.ToLowerInvariant() }
    if ($Value -match '^[0-9]{1,10}$') { return $Value }
    if ($Value -match '^@0x[0-9a-fA-F]+$') { return 'referencia-presente' }
    if ($Value -match '^\(type 0x10\)0x([0-9a-fA-F]{1,8})$') { return [Convert]::ToUInt32($Matches[1], 16).ToString() }
    if ($Value -match '^\(type 0x12\)0x([0-9a-fA-F]{1,8})$') {
        if ([Convert]::ToUInt32($Matches[1], 16) -eq 0) { return 'false' }
        return 'true'
    }
    return 'nao-interpretado'
}

function ConvertFrom-AferiManifestTree([object[]] $Lines) {
    if ($Lines.Count -gt 20000) { throw 'manifest-output-limit' }
    $wanted = @('CAMERA','INTERNET','RECORD_AUDIO','READ_EXTERNAL_STORAGE','WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES','READ_MEDIA_AUDIO','READ_MEDIA_VIDEO','READ_MEDIA_VISUAL_USER_SELECTED') |
        ForEach-Object { 'android.permission.' + $_ }
    $application = [ordered]@{ allowBackup = 'nao-declarado'; usesCleartextTraffic = 'nao-declarado';
        debuggable = 'nao-declarado'; fullBackupContent = 'nao-declarado';
        dataExtractionRules = 'nao-declarado'; networkSecurityConfig = 'nao-declarado' }
    $sdk = [ordered]@{ minSdkVersion = 'nao-declarado'; targetSdkVersion = 'nao-declarado' }
    $seen = @{}; $permissions = [System.Collections.Generic.List[object]]::new()
    $node = ''; $indent = -1; $pending = $null; $apps = 0; $manifests = 0; $packageOk = $false
    foreach ($line in $Lines) {
        if ($line -isnot [string] -or $line.Length -gt 16384 -or $line -match '[\x00-\x1f\x7f]') { throw 'manifest-output-invalid' }
        if ($line -match '^(\s*)E:\s+([^\s(]+)(?:\s|$)') {
            $indent = $Matches[1].Length; $node = $Matches[2]; $pending = $null
            if ($node -eq 'manifest') { $manifests++ }
            if ($node -eq 'application') { $apps++ }
            if ($node -match '^uses-permission(?:-sdk-(?:23|m))?$') {
                $pending = [pscustomobject]@{ Permissao = $null; Tipo = $node; MaxSdkVersion = 'nao-declarado' }
                $permissions.Add($pending)
            }
            continue
        }
        if ($line -notmatch '^(\s*)A:\s+(.+)$' -or $Matches[1].Length -ne $indent + 2) { continue }
        $attribute = $Matches[2]
        if ($node -eq 'manifest' -and $attribute -match '^package(?:\(0x[0-9a-fA-F]+\))?="([^"]+)"') {
            $packageOk = $Matches[1] -ceq 'com.ramonmenz.afericapturetest'
        }
        if ($attribute -notmatch '^(?:android:|http://schemas\.android\.com/apk/res/android:)([A-Za-z]+)(?:\(0x[0-9a-fA-F]+\))?=(.*)$') { continue }
        $key = $Matches[1]; $value = $Matches[2]
        if ($node -eq 'application' -and $application.Contains($key)) {
            if ($seen.ContainsKey($key)) { throw 'manifest-duplicate-attribute' }
            $seen[$key] = $true; $application[$key] = Convert-AferiManifestScalar $value
        }
        if ($node -eq 'uses-sdk' -and $sdk.Contains($key)) { $sdk[$key] = Convert-AferiManifestScalar $value }
        if ($null -ne $pending) {
            if ($key -eq 'name' -and $value -match '^"([^"]+)"') { $pending.Permissao = $Matches[1] }
            if ($key -eq 'maxSdkVersion') { $pending.MaxSdkVersion = Convert-AferiManifestScalar $value }
        }
    }
    if ($manifests -ne 1 -or $apps -ne 1 -or -not $packageOk) { throw 'manifest-structure-unexpected' }
    foreach ($permission in $permissions) {
        if ($null -eq $permission.Permissao) { throw 'manifest-permission-unparsed' }
    }
    $declaredNames = @($permissions | ForEach-Object { $_.Permissao })
    [pscustomobject]@{
        Pacote = 'com.ramonmenz.afericapturetest'
        Sdk = [pscustomobject]$sdk
        Aplicacao = [pscustomobject]$application
        PermissoesDeclaradas = @($permissions | Where-Object { $wanted -ccontains $_.Permissao })
        PermissoesNaoDeclaradas = @($wanted | Where-Object { $declaredNames -cnotcontains $_ })
    }
}

function Invoke-AferiAapt2([string] $Program, [string] $Arguments) {
    $process = [Diagnostics.Process]::new()
    $process.StartInfo.FileName = $Program
    $process.StartInfo.Arguments = $Arguments
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(30000)) {
            try { $process.Kill() } catch { throw 'aapt2-stop-unavailable' }
            throw 'aapt2-timeout'
        }
        $text = $stdout.GetAwaiter().GetResult() + "`n" + $stderr.GetAwaiter().GetResult()
        [pscustomobject]@{ Code = $process.ExitCode; Lines = @($text -split "`r?`n" | Where-Object { $_.Length -gt 0 }) }
    } catch { throw 'aapt2-execution-unavailable' }
    finally { $process.Dispose() }
}

function Get-AferiManifestMetadata {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $Aapt2Path,
        [Parameter(Mandatory)][string] $ApkPath,
        [Parameter(Mandatory)][ValidatePattern('^[0-9a-fA-F]{64}$')][string] $ExpectedSha256
    )
    if (-not (Test-Path -LiteralPath $Aapt2Path -PathType Leaf -ErrorAction SilentlyContinue) -or
        -not (Test-Path -LiteralPath $ApkPath -PathType Leaf -ErrorAction SilentlyContinue) -or
        [IO.Path]::GetExtension($ApkPath) -ine '.apk' -or $ApkPath -match '["\x00-\x1f]') { throw 'manifest-input-unavailable' }
    try { $hash = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'manifest-apk-hash-unavailable' }
    if ($hash -cne $ExpectedSha256.ToLowerInvariant()) { throw 'manifest-apk-changed' }
    $versionResult = Invoke-AferiAapt2 $Aapt2Path 'version'
    $version = $versionResult.Lines
    if ($versionResult.Code -ne 0 -or $version.Count -ne 1 -or
        $version[0] -notmatch '^Android Asset Packaging Tool \(aapt\) ([0-9]{1,4}\.[0-9]{1,4}(?:-[0-9]{1,16})?)$') { throw 'aapt2-version-unrecognized' }
    $safeVersion = $Matches[1]
    # UseShellExecute=false; APK path is quoted and embedded quotes/controls rejected.
    $dump = Invoke-AferiAapt2 $Aapt2Path ('dump xmltree --file AndroidManifest.xml "' + $ApkPath + '"')
    if ($dump.Code -ne 0) { throw 'manifest-dump-unavailable' }
    $lines = $dump.Lines
    $summary = ConvertFrom-AferiManifestTree $lines
    [pscustomobject]@{ Tool = 'manifesto-1'; Aapt2Version = $safeVersion; Sha256ApkLocal = $hash; Manifesto = $summary }
}

function Get-AferiBackupReferenceIds([object[]] $Lines) {
    $ids = @{}; $node = ''; $indent = -1
    foreach ($line in $Lines) {
        if ($line -match '^(\s*)E:\s+([^\s(]+)') { $indent = $Matches[1].Length; $node = $Matches[2]; continue }
        if ($node -eq 'application' -and $line -match '^(\s*)A:\s+(?:android:|http://schemas\.android\.com/apk/res/android:)(fullBackupContent|dataExtractionRules)(?:\(0x[0-9a-fA-F]+\))?=@(0x[0-9a-fA-F]{8})$') {
            if ($Matches[1].Length -ne $indent + 2 -or $ids.ContainsKey($Matches[2])) { throw 'backup-reference-unexpected' }
            $ids[$Matches[2]] = $Matches[3].ToLowerInvariant()
        }
    }
    if ($ids.Count -ne 2 -or @($ids.Values | Select-Object -Unique).Count -ne 2) { throw 'backup-reference-unavailable' }
    return $ids
}

function ConvertFrom-AferiBackupResources([object[]] $Lines, $Ids) {
    if ($Lines.Count -gt 100000) { throw 'backup-resources-limit' }
    $expected = @{ aferi_capture_backup_rules = 'fullBackupContent'; aferi_capture_data_extraction_rules = 'dataExtractionRules' }
    $found = @{}; $current = ''; $files = @{}
    foreach ($line in $Lines) {
        if ($line -isnot [string] -or $line.Length -gt 16384 -or $line -match '[\x00-\x1f\x7f]') { throw 'backup-resources-invalid' }
        if ($line -match '^\s*resource (0x[0-9a-fA-F]{8}) ([^\s]+)') {
            $id = $Matches[1].ToLowerInvariant(); $key = $Matches[2]; $current = ''
            foreach ($name in $expected.Keys) {
                if ($key -ceq ('xml/' + $name)) {
                    if ($found.ContainsKey($name) -or $id -cne $Ids[$expected[$name]]) { throw 'backup-resource-link-mismatch' }
                    $found[$name] = $true; $files[$name] = 0; $current = $name
                }
            }
            continue
        }
        if ($line -match '^\s*type ') { $current = ''; continue }
        if ($current -ne '' -and $line -match '^\s*\(') {
            $pattern = '^\s*\(\) \(file\) res/xml/' + $current + '\.xml type=XML$'
            if ($line -cnotmatch $pattern) { throw 'backup-resource-configuration-unexpected' }
            $files[$current]++
        }
    }
    if ($found.Count -ne 2 -or @($files.Values | Where-Object { $_ -ne 1 }).Count -ne 0) { throw 'backup-resources-incomplete' }
}

function ConvertFrom-AferiBackupRuleTree([object[]] $Lines, [string] $Kind) {
    if ($Lines.Count -gt 1000) { throw 'backup-rule-limit' }
    $stack = [Collections.Generic.List[object]]::new(); $roots = [Collections.Generic.List[object]]::new()
    foreach ($line in $Lines) {
        if ($line -isnot [string] -or $line.Length -gt 16384 -or $line -match '[\x00-\x1f\x7f]') { throw 'backup-rule-invalid' }
        if ($line -match '^( *)E: ([a-z-]+) \(line=[0-9]+\)$') {
            $depth = $Matches[1].Length; $name = $Matches[2]
            while ($stack.Count -gt 0 -and $stack[$stack.Count - 1].Depth -ge $depth) { $stack.RemoveAt($stack.Count - 1) }
            $node = [pscustomobject]@{ Name = $name; Depth = $depth; Attributes = @{}; Children = [Collections.Generic.List[object]]::new() }
            if ($stack.Count -eq 0) { if ($depth -ne 0) { throw 'backup-rule-structure-unexpected' }; $roots.Add($node) }
            else {
                $parent = $stack[$stack.Count - 1]
                if ($depth -ne $parent.Depth + 4) { throw 'backup-rule-structure-unexpected' }
                $parent.Children.Add($node)
            }
            $stack.Add($node); continue
        }
        if ($stack.Count -gt 0 -and $line -match '^( *)A: (domain|path)="([^"\r\n]+)"(?: \(Raw: "[^"\r\n]*"\))?$') {
            $depth = $Matches[1].Length; $key = $Matches[2]; $value = $Matches[3]; $node = $stack[$stack.Count - 1]
            if ($depth -ne $node.Depth + 2 -or $node.Attributes.ContainsKey($key)) { throw 'backup-rule-attribute-unexpected' }
            $node.Attributes[$key] = $value; continue
        }
        throw 'backup-rule-format-unexpected'
    }
    if ($roots.Count -ne 1) { throw 'backup-rule-structure-unexpected' }
    $root = $roots[0]; $sections = @()
    if ($Kind -ceq 'legado' -and $root.Name -ceq 'full-backup-content') { $sections = @($root) }
    elseif ($Kind -ceq 'moderno' -and $root.Name -ceq 'data-extraction-rules') {
        $sections = @($root.Children.ToArray())
        if ($sections.Count -ne 2 -or @($sections.Name | Sort-Object) -join ',' -cne 'cloud-backup,device-transfer') { throw 'backup-rule-sections-unexpected' }
    } else { throw 'backup-rule-root-unexpected' }
    if ($root.Attributes.Count -ne 0) { throw 'backup-rule-attribute-unexpected' }
    $domains = @('root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref')
    $summary = @()
    foreach ($section in $sections) {
        if ($section.Attributes.Count -ne 0 -or $section.Children.Count -ne 9) { throw 'backup-rule-exclusions-incomplete' }
        $seen = @{}
        foreach ($rule in $section.Children) {
            if ($rule.Name -cne 'exclude' -or $rule.Children.Count -ne 0 -or $rule.Attributes.Count -ne 2 -or
                -not $rule.Attributes.ContainsKey('domain') -or -not $rule.Attributes.ContainsKey('path')) { throw 'backup-rule-exclusion-unexpected' }
            $domain = $rule.Attributes['domain']
            if ($domains -cnotcontains $domain -or $rule.Attributes['path'] -cne '.' -or $seen.ContainsKey($domain)) { throw 'backup-rule-value-unexpected' }
            $seen[$domain] = $true
        }
        $summary += [pscustomobject]@{ Secao = $section.Name; DominiosExcluidos = 9; SomenteExclusoesRaiz = $true }
    }
    return $summary
}

function Get-AferiBackupMetadata {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string] $Aapt2Path,
        [Parameter(Mandatory)][string] $ApkPath,
        [Parameter(Mandatory)][ValidatePattern('^[0-9a-fA-F]{64}$')][string] $ExpectedSha256
    )
    $manifest = Get-AferiManifestMetadata -Aapt2Path $Aapt2Path -ApkPath $ApkPath -ExpectedSha256 $ExpectedSha256
    if ($manifest.Manifesto.Aplicacao.allowBackup -cne 'false') { throw 'backup-allow-backup-unexpected' }
    $dump = Invoke-AferiAapt2 $Aapt2Path ('dump xmltree --file AndroidManifest.xml "' + $ApkPath + '"')
    if ($dump.Code -ne 0) { throw 'backup-manifest-unavailable' }
    $null = ConvertFrom-AferiManifestTree $dump.Lines
    $ids = Get-AferiBackupReferenceIds $dump.Lines
    $table = Invoke-AferiAapt2 $Aapt2Path ('dump resources "' + $ApkPath + '"')
    if ($table.Code -ne 0) { throw 'backup-resources-unavailable' }
    ConvertFrom-AferiBackupResources $table.Lines $ids
    $rules = @()
    foreach ($entry in @(@{ File = 'aferi_capture_backup_rules'; Kind = 'legado' }, @{ File = 'aferi_capture_data_extraction_rules'; Kind = 'moderno' })) {
        $tree = Invoke-AferiAapt2 $Aapt2Path ('dump xmltree --file res/xml/' + $entry.File + '.xml "' + $ApkPath + '"')
        if ($tree.Code -ne 0) { throw 'backup-rule-unavailable' }
        $rules += @(ConvertFrom-AferiBackupRuleTree $tree.Lines $entry.Kind)
    }
    try { $after = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { throw 'backup-apk-hash-unavailable' }
    if ($after -cne $manifest.Sha256ApkLocal) { throw 'backup-apk-changed' }
    [pscustomobject]@{ Tool = 'backup-1'; Aapt2Version = $manifest.Aapt2Version; Sha256ApkLocal = $after;
        Pacote = $manifest.Manifesto.Pacote; AllowBackup = 'false'; ReferenciasConferidas = $true; Regras = $rules }
}

Export-ModuleMember -Function Get-AferiManifestMetadata, Get-AferiBackupMetadata
