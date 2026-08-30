param(
    [string]$Url = "http://localhost:5177"
)

$ErrorActionPreference = "Stop"

$config = Get-Content ".cdp-config.json" | ConvertFrom-Json
$edgePath = $config.edgePath
$userDataDir = $config.userDataDir
$cdpPort = $config.cdpPort

Write-Host "🚀 启动 Edge CDP 模式..." -ForegroundColor Cyan
Write-Host "   URL: $Url" -ForegroundColor Gray
Write-Host "   CDP Port: $cdpPort" -ForegroundColor Gray

if (-not (Test-Path $userDataDir)) {
    New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
}

$args = @(
    "--remote-debugging-port=$cdpPort",
    "--user-data-dir=$userDataDir",
    $Url
)

Start-Process -FilePath $edgePath -ArgumentList $args

Write-Host "✅ Edge 已启动，CDP 端口 $cdpPort" -ForegroundColor Green
Write-Host "   使用 node toolscheck-render.cjs 检查状态" -ForegroundColor Yellow
