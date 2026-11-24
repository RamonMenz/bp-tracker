Set-StrictMode -Version Latest

# Only sandbox file metadata. Raw paths stay private in module memory.
$script:AferiInventories = @{}
$script:AferiNextId = 0
$script:AferiInventoryCommand = 'run-as com.ramonmenz.afericapturetest find . -type f -exec stat -c %s:%Y:%n {} \;'

function Get-AferiCategory([string] $Path) {
    if ($Path -eq './files/DevLauncherApp-BridgelessReactNativeDevBundle.js') { return 'bundle-dev-client-nome' }
    if ($Path -match '^\./databases/com\.google\.android\.datatransport\.events(?:-(?:journal|wal|shm))?$') { return 'datatransport-nome' }
    if ($Path -eq './shared_prefs/com.google.mlkit.internal.xml') { return 'preferencia-mlkit-nome' }
    if ($Path.StartsWith('./code_cache/')) { return 'code-cache-nao-inspecionado' }
    if ($Path.StartsWith('./cache/')) { return 'cache-nao-inspecionado' }
    return 'outro-nao-classificado'
}

function ConvertFrom-AferiStat([object[]] $Lines) {
    $files = [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::Ordinal)
    if ($Lines.Count -gt 5000) { throw 'inventory-limit' }
    foreach ($line in $Lines) {
        # Never forward adb stderr, paths or arbitrary text in errors.
        if ($line -isnot [string] -or $line.Length -gt 8192 -or $line -match '[\x00-\x1f\x7f]' -or
            $line -notmatch '^(?<Size>[0-9]+):(?<Modified>-?[0-9]+):(?<Path>\./.+)$') { throw 'inventory-invalid' }
        $path = $Matches.Path
        $size = 0L; $modified = 0L
        if (-not [long]::TryParse($Matches.Size, [ref] $size) -or
            -not [long]::TryParse($Matches.Modified, [ref] $modified) -or
            $path -match '(^|/)\.\.(/|$)' -or $files.ContainsKey($path)) { throw 'inventory-invalid' }
        $files.Add($path, [pscustomobject]@{ Size = $size; Modified = $modified; Category = (Get-AferiCategory $path) })
    }
    # Avoid PowerShell enumerating an empty dictionary into no output.
    return ,$files
}

function Get-AferiSummary($Files) {
    foreach ($group in @($Files.Values | Group-Object Category | Sort-Object Name)) {
        [pscustomobject]@{ Category = $group.Name; Files = $group.Count }
    }
}

function New-AferiInventory {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string] $AdbPath)
    if (-not (Test-Path -LiteralPath $AdbPath -PathType Leaf)) { throw 'adb-unavailable' }
    try {
        $state = @(& $AdbPath -d get-state 2>&1)
        if ($LASTEXITCODE -ne 0 -or $state.Count -ne 1 -or $state[0] -cne 'device') { throw 'device-unavailable' }
        $lines = @(& $AdbPath -d shell $script:AferiInventoryCommand 2>&1)
        if ($LASTEXITCODE -ne 0) { throw 'inventory-unavailable' }
    } catch { throw 'inventory-unavailable' }
    $files = ConvertFrom-AferiStat $lines
    $script:AferiNextId++
    $id = $script:AferiNextId
    $script:AferiInventories[$id] = $files
    [pscustomobject]@{ Tool = 'inventario-1'; Id = $id; Files = $files.Count; Categories = @(Get-AferiSummary $files) }
}

function Compare-AferiInventory {
    [CmdletBinding()]
    param([Parameter(Mandatory)][int] $Before, [Parameter(Mandatory)][int] $After)
    if (-not $script:AferiInventories.ContainsKey($Before) -or -not $script:AferiInventories.ContainsKey($After)) { throw 'inventory-id-unavailable' }
    $a = $script:AferiInventories[$Before]; $b = $script:AferiInventories[$After]
    $events = @(
        foreach ($path in $a.Keys) {
            if (-not $b.ContainsKey($path)) { [pscustomobject]@{ Category = $a[$path].Category; Change = 'removed' } }
            elseif ($a[$path].Size -ne $b[$path].Size -or $a[$path].Modified -ne $b[$path].Modified) {
                [pscustomobject]@{ Category = $b[$path].Category; Change = 'size-or-mtime' }
            }
        }
        foreach ($path in $b.Keys) {
            if (-not $a.ContainsKey($path)) { [pscustomobject]@{ Category = $b[$path].Category; Change = 'added' } }
        }
    )
    $changes = @($events | Group-Object Category, Change | ForEach-Object {
        [pscustomobject]@{ Category = $_.Group[0].Category; Change = $_.Group[0].Change; Files = $_.Count }
    } | Sort-Object Category, Change)
    [pscustomobject]@{ Tool = 'inventario-1'; Before = $Before; After = $After;
        BeforeFiles = $a.Count; AfterFiles = $b.Count; ChangedEntries = $events.Count; Changes = $changes }
}

function Clear-AferiInventories {
    $script:AferiInventories.Clear()
    # IDs remain monotonic so stale handles cannot refer to new snapshots.
}

Export-ModuleMember -Function New-AferiInventory, Compare-AferiInventory, Clear-AferiInventories
