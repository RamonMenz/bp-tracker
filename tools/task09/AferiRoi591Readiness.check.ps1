# Synthetic smali, fake ADB and fixture entrypoint. No APK, SDK or device execution.
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'AferiRoi591Readiness.psm1') -Force
function Assert-Roi591([bool] $Value) { if (-not $Value) { throw 'roi591-fixture-failed' } }
function Reject-Roi591([scriptblock] $Action, [string] $Code) {
    try { & $Action | Out-Null } catch { Assert-Roi591 ($_.Exception.Message -ceq $Code); return }
    throw 'roi591-invalid-fixture-accepted'
}
$method = @'
.class public final Lokhttp3/OkHttpClient$Builder;
.method public final build()Lokhttp3/OkHttpClient;
    .registers 2
    .line 1
    new-instance v0, Lokhttp3/OkHttpClient;
    invoke-direct {v0, p0}, Lokhttp3/OkHttpClient;-><init>(Lokhttp3/OkHttpClient$Builder;)V
    return-object v0
.end method
'@ -split "`n"
Assert-Roi591 ((ConvertFrom-AferiRoiBuilderCode $method) -ceq 'metodo-build-sem-injecao-expo')
$otherMethods = @'
.method public other()V
    new-instance v0, Lexpo/modules/kotlin/devtools/ExpoNetworkInspectOkHttpAppInterceptor;
    return-void
.end method
'@ -split "`n"
Assert-Roi591 ((ConvertFrom-AferiRoiBuilderCode ($method + $otherMethods)) -ceq 'metodo-build-sem-injecao-expo')
Assert-Roi591 ((ConvertFrom-AferiRoiBuilderCode ($method -replace '^\.class.*$', '.class public final LOTHER;')) -ceq 'formato-nao-reconhecido')
$native = @'
.class public final Lexpo/modules/aferiphoto/FrameTransform;
.field public static final REVISION:Ljava/lang/String; = "roi-1"
.field public static final MAX_OWNED_PIXEL_BYTES:I = 0x57e400
'@ -split "`n"
Assert-Roi591 ((ConvertFrom-AferiRoiNativeCode $native) -ceq 'frame-transform-roi1-limite5760000')
foreach ($bad in @(@($native + $native), @($native -replace 'roi-1','other'), @($native -replace '0x57e400','0x1'), @($native -replace 'FrameTransform','Other'))) {
    Assert-Roi591 ((ConvertFrom-AferiRoiNativeCode $bad) -ceq 'constantes-nao-confirmadas')
}
Assert-Roi591 ((ConvertFrom-AferiRoiNativeCode @()) -ceq 'formato-nao-reconhecido')
foreach ($name in @('App','Network')) {
    $injected = $method -replace 'new-instance v0, Lokhttp3/OkHttpClient;', ('new-instance v0, Lexpo/modules/kotlin/devtools/ExpoNetworkInspectOkHttp' + $name + 'Interceptor;')
    Assert-Roi591 ((ConvertFrom-AferiRoiBuilderCode $injected) -ceq 'injecao-expo-presente')
}
foreach ($invalid in @(@(), @('PRIVATE'), @('.method public final build()Lokhttp3/OkHttpClient;'),
    @($method + $method), @($method -replace 'build\(', 'other('),
    @($method -replace 'public final build','public static build'), @($method + [char]0))) {
    Assert-Roi591 ((ConvertFrom-AferiRoiBuilderCode $invalid) -ceq 'formato-nao-reconhecido')
}
foreach ($invalid in @(
    @($method -replace 'return-object v0','return-object v1'),
    @($method -replace 'new-instance v0','new-instance v1'),
    @($method -replace 'invoke-direct','invoke-static'),
    @($method -replace '    return-object', "    nop`n    return-object"),
    @($method -replace 'Lokhttp3/OkHttpClient;-><init>', 'LPRIVATE;-><init>'))) {
    Assert-Roi591 ((ConvertFrom-AferiRoiBuilderCode $invalid) -ceq 'estrutura-nao-prevista')
}
$id = Get-AferiRoi591Identity
Assert-Roi591 ($id.Candidate -ceq '591555a24e8ba0d952c8dc93829c8204b3c731348764a61f80c29a79580038f6')
Assert-Roi591 ($id.Baseline -ceq '25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c')
$module = Get-Module AferiRoi591Readiness
& $module {
    $script:RealAnalyzer = (Get-Command Invoke-AferiRoiAnalyzer).ScriptBlock
    $script:fixture = @{ Mode='baseline'; Calls=0 }
    function script:Invoke-AferiEvaluationAdbProcess {
        param($AdbPath, [string[]] $Arguments, [switch] $Server)
        $script:fixture.Calls++
        $id = Get-AferiRoi591Identity
        $lines = @(); $code = 0; $errors = @()
        switch ($Arguments -join ' ') {
            'start-server' { if (-not $Server) { throw 'fixture-server-required' }; $errors = @('PRIVATE startup warning') }
            'get-state' {
                if ($script:fixture.Mode -in @('offline','unauthorized','multiple-usb','no-usb','adb-error')) {
                    $code=1; $errors=@(@{ 'offline'='offline PRIVATE'; 'unauthorized'='unauthorized PRIVATE'; 'multiple-usb'='more than one device PRIVATE'; 'no-usb'='no devices PRIVATE'; 'adb-error'='PRIVATE' }[$script:fixture.Mode])
                } else { $lines=@('device') }
            }
            'shell getprop ro.product.model' { $lines=@('SM-S731B'); if ($script:fixture.Mode -eq 'model') { $lines=@('PRIVATE') } }
            'shell pm path com.ramonmenz.afericapturetest' {
                $lines=@('package:/data/app/fixture/base.apk')
                if ($script:fixture.Mode -eq 'split') { $lines+= 'package:/data/app/fixture/split.apk' }
                if ($script:fixture.Mode -eq 'traversal') { $lines=@('package:/data/app/../fixture/base.apk') }
                if ($script:fixture.Mode -eq 'path') { $lines=@('package:/data/app/PRIVATE;base.apk') }
            }
            'shell run-as com.ramonmenz.afericapturetest sha256sum /data/app/fixture/base.apk' {
                $hash=$id.Baseline
                if ($script:fixture.Mode -eq 'candidate') { $hash=$id.Candidate }
                if ($script:fixture.Mode -eq 'other') { $hash='a'*64 }
                $lines=@($hash + '  /data/app/fixture/base.apk')
                if ($script:fixture.Mode -eq 'hash') { $lines=@('PRIVATE') }
                if ($script:fixture.Mode -eq 'hash-path') { $lines=@($hash + '  /data/app/OTHER/base.apk') }
            }
            default { throw 'fixture-mutating-or-unexpected-command' }
        }
        [pscustomobject]@{ Code=$code; Lines=$lines; Errors=$errors }
    }
    foreach ($mode in @('baseline','candidate','other','offline','unauthorized','multiple-usb','no-usb','adb-error')) {
        $script:fixture.Mode=$mode
        $r=Get-AferiRoiInstalledIdentity 'fixture'
        $raw=$r|ConvertTo-Json
        Assert-Roi591 ($raw -notmatch 'PRIVATE|/data/app/')
        if ($mode -in @('baseline','candidate','other')) { Assert-Roi591 ($r.EstadoAdb -ceq 'device' -and $r.ModeloConfere) }
        else { Assert-Roi591 ($r.EstadoAdb -ceq $mode -and $null -eq $r.Sha256Instalado) }
        if ($mode -eq 'baseline') { Assert-Roi591 ($r.Sha256Instalado -ceq $id.Baseline) }
        if ($mode -eq 'candidate') { Assert-Roi591 ($r.Sha256Instalado -ceq $id.Candidate) }
    }
    foreach ($mode in @('model','split','traversal','path','hash','hash-path')) {
        $script:fixture.Mode=$mode
        $expected=@{model='roi-device-model-unexpected';split='roi-installed-package-unexpected';traversal='roi-installed-path-unexpected';path='roi-installed-package-unexpected';hash='roi-installed-hash-unavailable';'hash-path'='roi-installed-hash-unavailable'}[$mode]
        Reject-Roi591 { Get-AferiRoiInstalledIdentity 'fixture' } $expected
    }
    function script:Invoke-AferiRoiAnalyzer([string] $Program, [string] $ApkPath, [switch] $NativeConstants) { return 'fixture-analyzer-selected' }
}
$temp=Join-Path ([IO.Path]::GetTempPath()) ('roi591-' + [guid]::NewGuid().ToString('N'))
try {
    [void][IO.Directory]::CreateDirectory($temp)
    Assert-Roi591 ((Get-AferiRoiBytecodeStatus $temp 'fixture.apk') -ceq 'analisador-indisponivel')
    foreach ($version in @('1','2')) {
        $folder=Join-Path $temp "cmdline-tools/$version/bin"
        [void][IO.Directory]::CreateDirectory($folder)
        [IO.File]::WriteAllText((Join-Path $folder 'apkanalyzer.bat'),'fixture only')
    }
    Assert-Roi591 ((Get-AferiRoiBytecodeStatus $temp 'fixture.apk') -ceq 'analisador-ambiguo')
    $folder=Join-Path $temp 'cmdline-tools/latest/bin'
    [void][IO.Directory]::CreateDirectory($folder)
    [IO.File]::WriteAllText((Join-Path $folder 'apkanalyzer.bat'),'fixture only')
    Assert-Roi591 ((Get-AferiRoiBytecodeStatus $temp 'fixture.apk') -ceq 'fixture-analyzer-selected')
    if ($env:OS -ne 'Windows_NT') {
        $fixtureProgram=Join-Path $temp 'fixture-analyzer'
        $fixtureBody=@'
#!/usr/bin/env python3
import sys
expected=['dex','code','--class','okhttp3.OkHttpClient$Builder','fixture.apk']
native=['dex','code','--class','expo.modules.aferiphoto.FrameTransform','fixture.apk']
if sys.argv[1:] == native:
    print('''NATIVE_FIXTURE''')
    sys.exit(0)
for name, message in [('jvm.apk','UnsupportedClassVersionError PRIVATE'), ('class.apk','Class PRIVATE not found'), ('args.apk','Unknown option PRIVATE')]:
    if sys.argv[-1] == name:
        print(message,file=sys.stderr)
        sys.exit(7)
if sys.argv[1:] != expected:
    print('PRIVATE',file=sys.stderr)
    sys.exit(7)
print('''METHOD_FIXTURE''')
'@
        $fixtureBody=$fixtureBody.Replace('METHOD_FIXTURE',($method -join "`n"))
        $fixtureBody=$fixtureBody.Replace('NATIVE_FIXTURE',($native -join "`n"))
        [IO.File]::WriteAllText($fixtureProgram,$fixtureBody)
        & chmod +x $fixtureProgram
        if ($LASTEXITCODE -ne 0) { throw 'roi591-fixture-executable' }
        $result=& $module { param($program) & $script:RealAnalyzer $program 'fixture.apk' } $fixtureProgram
        Assert-Roi591 ($result -ceq 'metodo-build-sem-injecao-expo')
        $result=& $module { param($program) & $script:RealAnalyzer $program 'fixture.apk' -NativeConstants } $fixtureProgram
        Assert-Roi591 ($result -ceq 'frame-transform-roi1-limite5760000')
        $result=& $module { param($program) & $script:RealAnalyzer $program 'wrong.apk' } $fixtureProgram
        Assert-Roi591 ($result -ceq 'analisador-falhou')
        foreach ($case in @(@('jvm.apk','analisador-jvm-incompativel'),@('class.apk','analisador-classe-nao-encontrada'),@('args.apk','analisador-argumentos-incompativeis'))) {
            $result=& $module { param($program,$apk) & $script:RealAnalyzer $program $apk } $fixtureProgram $case[0]
            Assert-Roi591 ($result -ceq $case[1] -and $result -notmatch 'PRIVATE')
        }
        $result=& $module { param($program) & $script:RealAnalyzer $program 'unsafe%path.apk' } $fixtureProgram
        Assert-Roi591 ($result -ceq 'analisador-caminho-incompativel')
    }
} finally { Remove-Item -LiteralPath $temp -Recurse -Force }
$tokens=$null; $errors=$null
$path=Join-Path $PSScriptRoot 'Read-AferiRoi591Readiness.ps1'
$ast=[Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errors)
Assert-Roi591 ($errors.Count -eq 0)
Assert-Roi591 (@($ast.ParamBlock.Attributes | Where-Object { $_.TypeName.FullName -eq 'CmdletBinding' }).Count -eq 1)
# Every ADB command in this module was exercised above against a strict read-only allowlist.
# The entrypoint exposes only BuildPath, so no caller can select a different hash/package.
Assert-Roi591 ($ast.ParamBlock.Parameters.Count -eq 1 -and $ast.ParamBlock.Parameters[0].Name.VariablePath.UserPath -ceq 'BuildPath')
# Execute the actual orchestration with synthetic boundary functions. Hash/source
# failures must happen before ADB; a pending or positive static result never installs.
$logicText=[IO.File]::ReadAllText($path) -replace '(?m)^Import-Module .+$',''
foreach ($name in @('Assert-AferiRoiSource','Assert-AferiRoiProperty','Get-AferiRoiHash','Get-AferiRoiBytecodeStatus','Get-AferiRoiInstalledIdentity','Get-Content')) {
    $logicText=$logicText.Replace($name,('Fixture-' + $name))
}
$logic=[scriptblock]::Create($logicText)
$orchestration=@{Mode='normal';AdbCalls=0;Hashes=0}
function Fixture-Assert-AferiRoiSource { param($BuildPath) if ($orchestration.Mode -eq 'source') { throw 'fixture-source-blocked' } }
function Fixture-Assert-AferiRoiProperty { param($Lines) }
function Fixture-Get-Content { param($LiteralPath) 'EX_DEV_CLIENT_NETWORK_INSPECTOR=false' }
function Fixture-Get-AferiRoiHash {
    param($ApkPath,$ExpectedSha256)
    Assert-Roi591 ($ExpectedSha256 -ceq $id.Candidate)
    $orchestration.Hashes++
    if ($orchestration.Mode -eq 'hash' -or ($orchestration.Mode -eq 'changed' -and $orchestration.Hashes -eq 2)) { throw 'fixture-hash-blocked' }
    $id.Candidate
}
function Fixture-Get-AferiRoiBytecodeStatus {
    param($SdkPath,$ApkPath,[switch]$NativeConstants)
    if ($orchestration.Mode -eq 'pending') { 'formato-nao-reconhecido' }
    elseif ($NativeConstants) { 'frame-transform-roi1-limite5760000' }
    else { 'metodo-build-sem-injecao-expo' }
}
function Fixture-Get-AferiRoiInstalledIdentity {
    param($AdbPath)
    $orchestration.AdbCalls++
    [pscustomobject]@{EstadoAdb='device';ModeloConfere=$true;Sha256Instalado=$id.Baseline}
}
$priorLocalAppData=$env:LOCALAPPDATA
try {
    $env:LOCALAPPDATA=[IO.Path]::GetTempPath()
    foreach ($mode in @('normal','pending')) {
        $orchestration.Mode=$mode; $orchestration.AdbCalls=0; $orchestration.Hashes=0
        $r=(&$logic -BuildPath ([IO.Path]::GetTempPath()))|ConvertFrom-Json
        Assert-Roi591 ($r.CoincideComBaseline259 -and -not $r.CoincideComCandidato591 -and
            -not $r.AtualizacaoLiberada -and -not $r.InstalacaoExecutada -and -not $r.AplicativoAberto -and $orchestration.AdbCalls -eq 1)
        Assert-Roi591 ($r.BytecodeInspecionado -eq ($mode -ceq 'normal'))
        Assert-Roi591 ($r.RevisaoELimiteNoApkConferidos -eq ($mode -ceq 'normal'))
    }
    foreach ($mode in @('source','hash','changed')) {
        $orchestration.Mode=$mode; $orchestration.AdbCalls=0; $orchestration.Hashes=0
        $expected=if ($mode -ceq 'source') { 'fixture-source-blocked' } else { 'fixture-hash-blocked' }
        Reject-Roi591 { &$logic -BuildPath ([IO.Path]::GetTempPath()) } $expected
        Assert-Roi591 ($orchestration.AdbCalls -eq 0)
    }
} finally { $env:LOCALAPPDATA=$priorLocalAppData }
'ROI591: fixed identity, complete method/unknown/injected shapes, private read-only ADB and tool discovery passed (fixtures; no APK/device)'
