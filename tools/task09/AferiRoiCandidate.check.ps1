# Fixtures only: no Gradle, Android SDK, ADB, APK install or device.
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoiCandidate.psm1') -Force
function Assert-Check([bool] $Condition) { if (-not $Condition) { throw 'roi-fixture-failed' } }
function Assert-Rejected([scriptblock] $Action, [string] $Code) {
    try { & $Action } catch { Assert-Check ($_.Exception.Message -ceq $Code); return }
    throw 'roi-fixture-accepted-invalid'
}
Assert-Check ((Get-AferiRoiSource) -ceq '45f7376a7ed2f7e04725866ffe98ff625f057566')
Assert-AferiRoiProperty @('# comment', 'EX_DEV_CLIENT_NETWORK_INSPECTOR=false')
foreach ($lines in @(@(), @('EX_DEV_CLIENT_NETWORK_INSPECTOR=true'), @('EX_DEV_CLIENT_NETWORK_INSPECTOR=FALSE'),
    @('EX_DEV_CLIENT_NETWORK_INSPECTOR=false','EX_DEV_CLIENT_NETWORK_INSPECTOR=false'))) {
    Assert-Rejected { Assert-AferiRoiProperty $lines } 'roi-inspector-property-unexpected'
}
$module = Get-Module AferiRoiCandidate
& $module {
    function git {
        $global:LASTEXITCODE = $script:fixtureExit
        if ($args -contains 'rev-parse') { return $script:fixtureHead }
        return $script:fixtureChanges
    }
    $script:fixtureHead = Get-AferiRoiSource; $script:fixtureExit = 0; $script:fixtureChanges = @()
    Assert-AferiRoiSource 'fixture'
    $script:fixtureHead = 'wrong'
    Assert-Rejected { Assert-AferiRoiSource 'fixture' } 'roi-source-not-clean-preserve'
    $script:fixtureHead = Get-AferiRoiSource; $script:fixtureChanges = @(' M source.kt')
    Assert-Rejected { Assert-AferiRoiSource 'fixture' } 'roi-source-not-clean-preserve'
    $script:fixtureChanges = @('?? source.kt')
    Assert-Rejected { Assert-AferiRoiSource 'fixture' } 'roi-source-not-clean-preserve'
    $script:fixtureChanges = @(); $script:fixtureExit = 1
    Assert-Rejected { Assert-AferiRoiSource 'fixture' } 'roi-source-not-clean-preserve'
}
$fixture = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString() + '.apk')
try {
    [IO.File]::WriteAllBytes($fixture, [byte[]]@(1,2,3))
    $hash = (Get-FileHash -LiteralPath $fixture -Algorithm SHA256).Hash.ToLowerInvariant()
    Assert-Check ((Get-AferiRoiHash $fixture $hash) -ceq $hash)
    Assert-Rejected { Get-AferiRoiHash $fixture ('0' * 64) } 'roi-apk-identity-unexpected'
    [IO.File]::WriteAllBytes($fixture, [byte[]]@(1,2,4))
    Assert-Rejected { Get-AferiRoiHash $fixture $hash } 'roi-apk-identity-unexpected'
    $hostProgram = (Get-Process -Id $PID).Path
    Invoke-AferiRoiBuildCommand $hostProgram @('-NoLogo','-NoProfile','-Command','[Console]::Error.WriteLine("fixture-warning"); exit 0') 'fixture-command-failed'
    Assert-Rejected { Invoke-AferiRoiBuildCommand $hostProgram @('-NoLogo','-NoProfile','-Command','exit 7') 'fixture-command-failed' } 'fixture-command-failed'
    Assert-Rejected { Invoke-AferiRoiBuildCommand 'missing-aferi-fixture-executable' @() 'fixture-command-failed' } 'fixture-command-failed'
} finally { Remove-Item -LiteralPath $fixture -ErrorAction SilentlyContinue }
foreach ($name in @('Build-AferiRoiCandidate.ps1','Inspect-AferiRoiCandidate.ps1')) {
    $tokens = $null; $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $name), [ref] $tokens, [ref] $errors)
    Assert-Check ($errors.Count -eq 0)
    $commands = @($ast.FindAll({ param($node) $node -is [Management.Automation.Language.CommandAst] }, $true))
    foreach ($command in $commands) {
        Assert-Check ($command.GetCommandName() -notmatch '(?i)adb|uninstall|start-process|update-aferi|remove-item')
    }
}
'ROI candidate guards: source, property, identity and native exit codes passed (fixtures; no Android build)'
