@echo off
chcp 65001 >nul
echo MC AI Builder - 复制最新 session 数据

set "OUTPUT_DIR=..\output\sessions"
set "DEST=%~dp0"

if not exist "%OUTPUT_DIR%" (
    echo [错误] sessions 目录不存在: %OUTPUT_DIR%
    pause
    exit /b 1
)

REM 找到最新的 session 目录
for /f "tokens=*" %%d in ('dir /b /ad /o-n "%OUTPUT_DIR%" 2^>nul') do (
    set "LATEST=%%d"
    goto :found
)

echo [错误] 没有找到 session 数据
pause
exit /b 1

:found
echo 最新 session: %LATEST%
if exist "%OUTPUT_DIR%\%LATEST%\blocks.json" (
    copy /y "%OUTPUT_DIR%\%LATEST%\blocks.json" "%DEST%blocks.json" >nul
    echo [完成] blocks.json 已复制到 tools\blocks.json
    echo [提示] 打开 3d-viewer.html 即可预览
) else (
    echo [错误] blocks.json 不存在
)
pause
