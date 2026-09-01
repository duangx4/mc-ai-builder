@echo off
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not exist %CHROME_PATH% (
    echo Chrome not found
    pause
    exit /b 1
)

echo Starting Chrome with debug port 9222...
%CHROME_PATH% --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug" http://localhost:5175
