# Native streams stay private; callers enforce fixed evaluation actions and reports.
function Invoke-AferiEvaluationAdbProcess {
    param([Parameter(Mandatory)][string] $AdbPath, [string[]] $Arguments, [switch] $Server)
    if ($Server -and ($Arguments.Count -ne 1 -or $Arguments[0] -cne 'start-server')) { throw 'inspector-adb-server-command-unexpected' }
    if (-not (Test-Path -LiteralPath $AdbPath -PathType Leaf)) { throw 'inspector-adb-executable-unavailable' }
    $parts = @()
    if (-not $Server) { $parts += '-d' }
    $parts += $Arguments
    $quoted = @($parts | ForEach-Object {
        if ($_ -match '["\x00-\x1f]') { throw 'inspector-adb-argument-unexpected' }
        '"' + $_ + '"'
    })
    $process = [Diagnostics.Process]::new()
    $process.StartInfo.FileName = $AdbPath
    $process.StartInfo.Arguments = $quoted -join ' '
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        # Do not kill an installation automatically; its result must be recovered by read-only inspection.
        if ($Arguments[0] -ceq 'install') { $process.WaitForExit() }
        elseif (-not $process.WaitForExit(30000)) {
            try { $process.Kill() } catch { throw 'inspector-adb-client-stop-unavailable' }
            throw 'inspector-adb-query-timeout'
        }
        if (-not $stdout.Wait(5000) -or -not $stderr.Wait(5000)) { throw 'inspector-adb-output-unavailable' }
        [pscustomobject]@{
            Lines = @($stdout.GetAwaiter().GetResult() -split "`r?`n" | Where-Object { $_.Length -gt 0 })
            Errors = @($stderr.GetAwaiter().GetResult() -split "`r?`n" | Where-Object { $_.Length -gt 0 })
            Code = $process.ExitCode
        }
    } catch {
        if (@('inspector-adb-client-stop-unavailable','inspector-adb-query-timeout','inspector-adb-output-unavailable') -ccontains $_.Exception.Message) { throw }
        throw 'inspector-update-adb-unavailable'
    }
    finally { $process.Dispose() }
}

Export-ModuleMember -Function Invoke-AferiEvaluationAdbProcess
