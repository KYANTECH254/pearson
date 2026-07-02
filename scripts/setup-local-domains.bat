@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if /i "%~1"=="help" goto :usage
if /i "%~1"=="/?" goto :usage
if /i "%~1"=="-h" goto :usage

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-local-domains.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo Script failed. Make sure you are running as Administrator.
    echo.
    goto :usage
)
exit /b 0

:usage
echo Usage:
echo   setup-local-domains.bat enable [NginxDir] [UpstreamUrl]
echo   setup-local-domains.bat disable [NginxDir]
echo   setup-local-domains.bat status
echo.
echo Defaults:
echo   NginxDir:    C:\nginx or detected nginx.exe path
echo   UpstreamUrl: https://pearson-d.my.to
echo.
echo Run this BAT as Administrator.
if not "%~1"=="" (
    pause
)
exit /b 1
