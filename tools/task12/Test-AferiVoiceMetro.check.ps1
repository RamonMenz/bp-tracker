$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiVoiceEvaluation.psm1') -Force
$voice = Get-Module AferiVoiceEvaluation
function Assert([bool] $Condition, [string] $Check) { if (-not $Condition) { throw "voice-metro-check:$Check" } }

& $voice {
    $script:mode = 'ready'
    $script:queries = [Collections.Generic.List[string]]::new()
    function script:Invoke-VoiceMetroHttp([string] $ExpectedRoot) {
        Assert ($ExpectedRoot -ceq 'PRIVATE expected demo') 'root-forwarded'
        if ($script:mode -eq 'ipv4-down') { return [pscustomobject]@{ HttpStatus = $null; FonteEsperada = $false; MetroPronto = $false } }
        $matches = $script:mode -ne 'wrong-root'
        [pscustomobject]@{ HttpStatus = 200; FonteEsperada = $matches; MetroPronto = $matches }
    }
    function script:Invoke-AferiEvaluationAdbProcess {
        param([string] $AdbPath, [string[]] $Arguments)
        $query = $Arguments -join ' '
        $script:queries.Add($query)
        $result = @{ Code = 0; Lines = @(); Errors = @('PRIVATE') }
        switch -CaseSensitive ($query) {
            'get-state' {
                if ($script:mode -eq 'unauthorized') { $result.Code = 1; $result.Errors = @('error: unauthorized PRIVATE') }
                else { $result.Lines = @('device') }
            }
            'reverse --list' {
                $result.Lines = @('PRIVATE tcp:8097 tcp:8097')
                switch ($script:mode) {
                    'missing' {}
                    'conflict' { $result.Lines += 'PRIVATE tcp:8099 tcp:8888' }
                    'duplicate' { $result.Lines += @('PRIVATE tcp:8099 tcp:8099','PRIVATE tcp:8099 tcp:8099') }
                    'bad-list' { $result.Lines += 'PRIVATE' }
                    'list-failure' { $result.Code = 1 }
                    default { $result.Lines += 'PRIVATE tcp:8099 tcp:8099' }
                }
            }
            default { throw 'voice-metro-check:unexpected-adb-command' }
        }
        [pscustomobject]$result
    }
    $expected = @{
        ready = 'ready'; missing = 'missing'; conflict = 'conflict'; duplicate = 'conflict'
        'bad-list' = 'unverified'; 'list-failure' = 'unavailable'; unauthorized = $null
        'ipv4-down' = 'ready'; 'wrong-root' = 'ready'
    }
    foreach ($mode in $expected.Keys) {
        $script:mode = $mode
        $script:queries.Clear()
        $health = Get-VoiceMetroHealth 'fixture-adb' 'PRIVATE expected demo'
        Assert ($health.Porta -eq 8099 -and $health.Familia -ceq 'IPv4' -and $health.Reverse -ceq $expected[$mode]) $mode
        Assert ($health.Pronto -eq ($mode -eq 'ready') -and ($health | ConvertTo-Json -Depth 4) -cnotmatch 'PRIVATE') 'health-sanitized'
        Assert ($script:queries.Count -eq $(if ($mode -eq 'unauthorized') { 1 } else { 2 })) 'read-only-queries'
    }
}
$parseErrors = $null; $tokens = $null
$null = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'Test-AferiVoiceMetro.ps1'), [ref]$tokens, [ref]$parseErrors)
Assert ($parseErrors.Count -eq 0) 'entrypoint-syntax'
'Voice Metro: IPv4 status and fixed read-only reverse with HTTP and ADB fixtures passed.'
