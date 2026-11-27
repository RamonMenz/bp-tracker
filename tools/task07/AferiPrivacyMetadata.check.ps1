$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiPrivacyMetadata.psm1') -Force
$module = Get-Module AferiPrivacyMetadata
function Assert($Condition, [string] $Name) { if (-not $Condition) { throw "check-failed:$Name" } }

& $module {
    $a = ConvertFrom-AferiStat @('10:1:./files/DevLauncherApp-BridgelessReactNativeDevBundle.js',
        '20:2:./databases/com.google.android.datatransport.events', '30:3:./files/PRIVATE-SENTINEL space:colon')
    $b = ConvertFrom-AferiStat @('10:4:./files/DevLauncherApp-BridgelessReactNativeDevBundle.js',
        '20:2:./databases/com.google.android.datatransport.events', '1:5:./cache/PRIVATE-NEW')
    $script:AferiInventories[1] = $a; $script:AferiInventories[2] = $b
}
$diff = Compare-AferiInventory -Before 1 -After 2
Assert ($diff.ChangedEntries -eq 3) 'add-remove-modify'
Assert ($diff.BeforeFiles -eq 3 -and $diff.AfterFiles -eq 3) 'totals'
$json = $diff | ConvertTo-Json -Depth 5
Assert (-not $json.Contains('PRIVATE') -and -not $json.Contains('DevLauncherApp')) 'no-paths-in-report'
Assert ($diff.Changes.Count -eq 3) 'categories'
Assert ((Compare-AferiInventory 1 1).ChangedEntries -eq 0) 'unchanged'
& $module { $script:AferiInventories[3] = ConvertFrom-AferiStat @() }
Assert ((Compare-AferiInventory 3 3).BeforeFiles -eq 0) 'empty-inventory'

foreach ($bad in @('denied PRIVATE-SENTINEL', '1:2:./files/../PRIVATE', '1:2:/outside',
    '9223372036854775808:2:./overflow', "1:2:./bad`nPRIVATE", "1:2:./bad`tPRIVATE")) {
    $rejected = $false
    try { & $module { param($x) ConvertFrom-AferiStat @($x) } $bad | Out-Null }
    catch { $rejected = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'safe-error' }
    Assert $rejected 'reject-invalid-or-partial'
}
$duplicateRejected = $false
try { & $module { ConvertFrom-AferiStat @('1:2:./a','1:3:./a') } | Out-Null } catch { $duplicateRejected = $true }
Assert $duplicateRejected 'duplicate-path'
& $module {
    $upper = ConvertFrom-AferiStat @('1:2:./A','1:2:./a')
    if ($upper.Count -ne 2) { throw 'case-sensitive-paths' }
    $script:AferiNextId = 3
}
Clear-AferiInventories
$staleRejected = $false
try { Compare-AferiInventory 1 2 | Out-Null } catch { $staleRejected = $true }
Assert $staleRejected 'clear-invalidates-handles'
Assert ((& $module { $script:AferiNextId }) -eq 3) 'no-handle-reuse'
$exports = @($module.ExportedFunctions.Keys)
Assert ($exports.Count -eq 3 -and -not ($exports -contains 'ConvertFrom-AferiStat')) 'private-paths'
Write-Output 'Metadados: comparacao, descarte, nomes privados, erros e casos de borda aprovados; sem ADB/Samsung executados.'

# Exercise the public ADB boundary without a device or native tool.
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('aferi-metadata-check-' + [guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($temp)
try {
    $fake = Join-Path $temp 'adb-stub.ps1'
    @'
if ($args.Count -eq 2 -and $args[0] -eq '-d' -and $args[1] -eq 'get-state') {
    $global:LASTEXITCODE = 0
    'device'
} elseif ($args.Count -eq 3 -and $args[0] -eq '-d' -and $args[1] -eq 'shell' -and
    $args[2] -ceq 'run-as com.ramonmenz.afericapturetest find . -type f -exec stat -c %s:%Y:%n {} \;') {
    $global:LASTEXITCODE = 0
    '5:10:./files/PRIVATE-SENTINEL'
} else { $global:LASTEXITCODE = 1; 'PRIVATE-BAD-COMMAND' }
'@ | Set-Content -LiteralPath $fake
    $inventory = New-AferiInventory -AdbPath $fake
    Assert ($inventory.Files -eq 1 -and $inventory.Id -eq 4) 'adb-fixed-command'
    Assert (-not ($inventory | ConvertTo-Json -Depth 5).Contains('PRIVATE')) 'public-snapshot-hides-paths'
    @'
$global:LASTEXITCODE = 1
'PRIVATE-SENTINEL'
'@ | Set-Content -LiteralPath $fake
    $denied = $false
    try { New-AferiInventory -AdbPath $fake | Out-Null }
    catch { $denied = $true; Assert (-not $_.ToString().Contains('PRIVATE')) 'adb-error-sanitized' }
    Assert $denied 'adb-nonzero-rejected'
    Assert ((& $module { $script:AferiNextId }) -eq 4) 'no-partial-snapshot'
} finally {
    Clear-AferiInventories
    Remove-Module AferiPrivacyMetadata
    Remove-Item -LiteralPath $temp -Recurse -Force
}
Write-Output 'Fronteira ADB simulada: alvo USB/comando fixos, saida privada e erro sem snapshot parcial aprovados.'
