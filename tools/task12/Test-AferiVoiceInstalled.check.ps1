$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiVoiceEvaluation.psm1') -Force
$voice = Get-Module AferiVoiceEvaluation
function Assert([bool] $Condition, [string] $Check) { if (-not $Condition) { throw "voice-identity-check:$Check" } }

& $voice {
    $script:mode = 'ok'
    $script:base = '/data/app/~~PRIVATE==/com.ramonmenz.aferivoicetest-located==/base.apk'
    $script:hash = 'a' * 64
    $script:queries = [Collections.Generic.List[string]]::new()
    function script:Invoke-AferiEvaluationAdbProcess {
        param([string] $AdbPath, [string[]] $Arguments)
        $joined = $Arguments -join ' '
        $script:queries.Add($joined)
        $result = @{ Code = 0; Lines = @(); Errors = @() }
        switch -CaseSensitive ($joined) {
            'get-state' {
                if ($script:mode -eq 'offline') { $result.Code = 1; $result.Errors = @('error: device offline PRIVATE') }
                else { $result.Lines = @('device'); $result.Errors = @('daemon startup PRIVATE') }
            }
            'shell am get-current-user' { $result.Lines = @(if ($script:mode -eq 'user') { 'PRIVATE' } else { '10' }) }
            'shell pm path --user 10 com.ramonmenz.aferivoicetest' {
                $result.Lines = @("package:$script:base")
                if ($script:mode -eq 'split') { $result.Lines += 'package:/data/app/PRIVATE/split.apk' }
                if ($script:mode -eq 'traversal') { $result.Lines = @('package:/data/app/PRIVATE/../base.apk') }
            }
            "shell run-as com.ramonmenz.aferivoicetest --user 10 sha256sum $script:base" {
                $hash = if ($script:mode -eq 'other') { 'b' * 64 } else { $script:hash.ToUpperInvariant() }
                $path = if ($script:mode -eq 'other-path') { '/data/app/PRIVATE/base.apk' } else { $script:base }
                $result.Lines = @("$hash  $path")
            }
            'shell dumpsys package com.ramonmenz.aferivoicetest' {
                $grant = if ($script:mode -eq 'granted') { 'true' } else { 'false' }
                $result.Lines = @('Packages:', '  Package [com.ramonmenz.aferivoicetest] (PRIVATE):',
                    '    requested permissions:', '      android.permission.RECORD_AUDIO',
                    '    User 0: installed=true', '      runtime permissions:',
                    '        android.permission.RECORD_AUDIO: granted=true, flags=[ USER_SET ]',
                    '    User 10: installed=true')
                if ($script:mode -ne 'fresh') {
                    $result.Lines += '      runtime permissions:'
                    if ($script:mode -eq 'bad-grant') { $grant = 'PRIVATE' }
                    $result.Lines += "        android.permission.RECORD_AUDIO: granted=$grant, flags=[ ]"
                }
                if ($script:mode -eq 'uninstalled-user') { $result.Lines = @($result.Lines -replace 'User 10: installed=true','User 10: installed=false') }
            }
            default { throw 'voice-identity-check:unexpected-adb-command' }
        }
        [pscustomobject]$result
    }

    $identity = Get-VoiceInstalledIdentity 'fixture-adb' $script:hash
    Assert ($script:queries.Count -eq 5 -and $identity.Pacote -ceq 'com.ramonmenz.aferivoicetest' -and
        $identity.Sha256Instalado -ceq $script:hash -and $identity.CoincideComBuild -and -not $identity.RecordAudioConcedida) 'identity'
    Assert (($identity | ConvertTo-Json) -cnotmatch 'PRIVATE') 'sanitized'

    $script:mode = 'fresh'
    $fresh = Get-VoiceInstalledIdentity 'fixture-adb' $script:hash
    Assert (-not $fresh.RecordAudioConcedida -and $fresh.EstadoRecordAudio -ceq 'sem-entrada-runtime') 'clean-install-without-runtime-entry'

    $cases = @{
        offline = 'voice-adb-offline'; user = 'voice-current-user-unverified'; split = 'voice-installed-package-unverified'
        traversal = 'voice-installed-path-unexpected'; other = 'voice-installed-hash-mismatch'
        'other-path' = 'voice-installed-hash-unverified'; 'bad-grant' = 'voice-permission-state-unverified'
        'uninstalled-user' = 'voice-permission-state-unverified'
        granted = 'voice-microphone-already-granted'
    }
    foreach ($mode in $cases.Keys) {
        $script:mode = $mode
        $script:queries.Clear()
        $reason = $null
        try { $null = Get-VoiceInstalledIdentity 'fixture-adb' $script:hash } catch { $reason = $_.Exception.Message }
        Assert ($reason -ceq $cases[$mode]) $mode
        if ($mode -eq 'other') { Assert ($script:queries.Count -eq 4) 'reject-before-permission-query' }
    }
}
$parseErrors = $null; $tokens = $null
$null = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Test-AferiVoiceInstalled.ps1'), [ref]$tokens, [ref]$parseErrors)
Assert ($parseErrors.Count -eq 0) 'entrypoint-syntax'
'Voice identity: exact package, installed hash, active-user permission and private output passed with ADB fixtures.'
