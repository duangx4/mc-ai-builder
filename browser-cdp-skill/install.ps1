# CDP 技能依赖安装脚本
$ErrorActionPreference = "Stop"

Write-Host "📦 安装 CDP 技能依赖..." -ForegroundColor Cyan

if (-not (Test-Path "tools")) {
    Write-Host "❌ 请在 browser-cdp-skill 目录下运行此脚本" -ForegroundColor Red
    exit 1
}

Write-Host "安装 chrome-remote-interface..." -ForegroundColor Yellow
npm install chrome-remote-interface --save-dev

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CDP 技能依赖已安装" -ForegroundColor Green
} else {
    Write-Host "❌ 安装失败" -ForegroundColor Red
    exit 1
}
