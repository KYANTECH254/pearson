@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "setup-local-domains.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo Script failed. Make sure you are running as Administrator.
    pause
)
