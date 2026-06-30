# ============================================================
# Windows 系统运行库/组件 一键修复脚本
# 必须以管理员身份运行！
# ============================================================
# 修复内容:
#   1. VC++ 2012 Redistributable (x64 + x86)
#   2. VC++ 2013 Redistributable (x64 + x86)
#   3. DirectX End-User Runtime (June 2010)
#   4. .NET Core 6.0 Runtime (x64)
#   5. SFC / DISM 系统文件修复
# ============================================================

$ErrorActionPreference = "Stop"
$TempDir = "$env:TEMP\RuntimeFix"
$LogFile = "$PSScriptRoot\fix_runtime_log.txt"

# 管理员权限检查
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "[错误] 请以管理员身份运行此脚本！" -ForegroundColor Red
    Write-Host "右键点击此脚本 -> 以管理员身份运行" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  系统运行库一键修复工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 创建临时目录
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

# 记录日志
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LogFile -Append
    Write-Host "[$timestamp] $Message"
}

# ============================================================
# 第1步: VC++ 2012 Redistributable (x64)
# ============================================================
Write-Host "`n[1/7] 安装 VC++ 2012 Redistributable (x64)..." -ForegroundColor Green
$vc2012x64Url = "https://download.microsoft.com/download/1/6/B/16B06F60-3B20-4FF2-B699-5E9B7962F9AE/VSU_4/vcredist_x64.exe"
$vc2012x64Path = "$TempDir\vcredist_2012_x64.exe"

try {
    Write-Log "下载 VC++ 2012 x64..."
    Invoke-WebRequest -Uri $vc2012x64Url -OutFile $vc2012x64Path -UseBasicParsing
    Write-Log "安装 VC++ 2012 x64..."
    Start-Process -FilePath $vc2012x64Path -ArgumentList "/install", "/quiet", "/norestart" -Wait -NoNewWindow
    Write-Log "VC++ 2012 x64 安装完成"
} catch {
    Write-Log "VC++ 2012 x64 安装失败: $_"
}

# ============================================================
# 第2步: VC++ 2012 Redistributable (x86)
# ============================================================
Write-Host "[2/7] 安装 VC++ 2012 Redistributable (x86)..." -ForegroundColor Green
$vc2012x86Url = "https://download.microsoft.com/download/1/6/B/16B06F60-3B20-4FF2-B699-5E9B7962F9AE/VSU_4/vcredist_x86.exe"
$vc2012x86Path = "$TempDir\vcredist_2012_x86.exe"

try {
    Write-Log "下载 VC++ 2012 x86..."
    Invoke-WebRequest -Uri $vc2012x86Url -OutFile $vc2012x86Path -UseBasicParsing
    Write-Log "安装 VC++ 2012 x86..."
    Start-Process -FilePath $vc2012x86Path -ArgumentList "/install", "/quiet", "/norestart" -Wait -NoNewWindow
    Write-Log "VC++ 2012 x86 安装完成"
} catch {
    Write-Log "VC++ 2012 x86 安装失败: $_"
}

# ============================================================
# 第3步: VC++ 2013 Redistributable (x64)
# ============================================================
Write-Host "[3/7] 安装 VC++ 2013 Redistributable (x64)..." -ForegroundColor Green
$vc2013x64Url = "https://download.microsoft.com/download/2/E/6/2E61CFA4-993B-4DD4-91DA-3737CD5CD6E3/vcredist_x64.exe"
$vc2013x64Path = "$TempDir\vcredist_2013_x64.exe"

try {
    Write-Log "下载 VC++ 2013 x64..."
    Invoke-WebRequest -Uri $vc2013x64Url -OutFile $vc2013x64Path -UseBasicParsing
    Write-Log "安装 VC++ 2013 x64..."
    Start-Process -FilePath $vc2013x64Path -ArgumentList "/install", "/quiet", "/norestart" -Wait -NoNewWindow
    Write-Log "VC++ 2013 x64 安装完成"
} catch {
    Write-Log "VC++ 2013 x64 安装失败: $_"
}

# ============================================================
# 第4步: VC++ 2013 Redistributable (x86)
# ============================================================
Write-Host "[4/7] 安装 VC++ 2013 Redistributable (x86)..." -ForegroundColor Green
$vc2013x86Url = "https://download.microsoft.com/download/2/E/6/2E61CFA4-993B-4DD4-91DA-3737CD5CD6E3/vcredist_x86.exe"
$vc2013x86Path = "$TempDir\vcredist_2013_x86.exe"

try {
    Write-Log "下载 VC++ 2013 x86..."
    Invoke-WebRequest -Uri $vc2013x86Url -OutFile $vc2013x86Path -UseBasicParsing
    Write-Log "安装 VC++ 2013 x86..."
    Start-Process -FilePath $vc2013x86Path -ArgumentList "/install", "/quiet", "/norestart" -Wait -NoNewWindow
    Write-Log "VC++ 2013 x86 安装完成"
} catch {
    Write-Log "VC++ 2013 x86 安装失败: $_"
}

# ============================================================
# 第5步: DirectX End-User Runtime (June 2010)
# ============================================================
Write-Host "[5/7] 安装 DirectX 最终用户运行时..." -ForegroundColor Green
$dxUrl = "https://download.microsoft.com/download/8/4/A/84A35BF1-DAFE-4AE8-82AF-AD2AE20B6B14/directx_Jun2010_redist.exe"
$dxPath = "$TempDir\directx_Jun2010_redist.exe"

try {
    Write-Log "下载 DirectX Runtime..."
    Invoke-WebRequest -Uri $dxUrl -OutFile $dxPath -UseBasicParsing
    Write-Log "解压 DirectX Runtime..."
    $dxExtractDir = "$TempDir\DirectX"
    Start-Process -FilePath $dxPath -ArgumentList "/Q", "/T:$dxExtractDir" -Wait -NoNewWindow
    Write-Log "安装 DirectX Runtime..."
    Start-Process -FilePath "$dxExtractDir\DXSETUP.exe" -ArgumentList "/silent" -Wait -NoNewWindow
    Write-Log "DirectX Runtime 安装完成"
} catch {
    Write-Log "DirectX Runtime 安装失败: $_"
}

# ============================================================
# 第6步: .NET Core 6.0 Runtime (x64)
# ============================================================
Write-Host "[6/7] 安装 .NET Core 6.0 Runtime (x64)..." -ForegroundColor Green
$dotnet6Url = "https://download.visualstudio.microsoft.com/download/pr/7b2e5ed6-3f8a-4c76-9462-2ef6510f3652/a70b085e2d0eeb9585f595f2b5f61cae/dotnet-runtime-6.0.36-win-x64.exe"
$dotnet6Path = "$TempDir\dotnet-runtime-6.0.36-win-x64.exe"

try {
    Write-Log "下载 .NET 6.0 Runtime..."
    Invoke-WebRequest -Uri $dotnet6Url -OutFile $dotnet6Path -UseBasicParsing
    Write-Log "安装 .NET 6.0 Runtime..."
    Start-Process -FilePath $dotnet6Path -ArgumentList "/install", "/quiet", "/norestart" -Wait -NoNewWindow
    Write-Log ".NET 6.0 Runtime 安装完成"
} catch {
    Write-Log ".NET 6.0 Runtime 安装失败: $_"
}

# ============================================================
# 第7步: SFC + DISM 系统文件修复
# ============================================================
Write-Host "[7/7] 系统文件扫描与修复 (可能需要10-20分钟)..." -ForegroundColor Green

Write-Log "运行 DISM 修复系统映像..."
Write-Host "  7a. 运行 DISM /RestoreHealth（修复组件存储）..." -ForegroundColor Yellow
try {
    dism /Online /Cleanup-Image /RestoreHealth
    Write-Log "DISM 修复完成"
} catch {
    Write-Log "DISM 修复出错: $_"
}

Write-Host "  7b. 运行 SFC /ScanNow（修复系统文件）..." -ForegroundColor Yellow
try {
    sfc /scannow
    Write-Log "SFC 扫描完成"
} catch {
    Write-Log "SFC 扫描出错: $_"
}

# ============================================================
# 完成
# ============================================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  修复完成！" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "请重启电脑使所有修复生效。" -ForegroundColor Yellow
Write-Host "日志文件: $LogFile" -ForegroundColor Gray
Write-Host ""
Write-Host "如果仍有问题，建议运行以下额外步骤:" -ForegroundColor Yellow
Write-Host "  1. 安装 VC++ 2005/2008 运行库（同上官网下载）" -ForegroundColor White
Write-Host "  2. 在 Windows更新中检查可选更新" -ForegroundColor White
Write-Host "  3. 使用 DirectX Web 安装器: https://www.microsoft.com/en-us/download/details.aspx?id=35" -ForegroundColor White
Write-Host ""

# 清理临时文件（可选）
Write-Host "清理临时安装文件？(Y/N): " -ForegroundColor Gray -NoNewline
$choice = Read-Host
if ($choice -eq "Y" -or $choice -eq "y") {
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
    Write-Host "临时文件已清理" -ForegroundColor Green
} else {
    Write-Host "临时文件保留在: $TempDir" -ForegroundColor Gray
}

pause
