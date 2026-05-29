@echo off
setlocal EnableExtensions

set "APP_NAME=pearson-dashboard"
set "APP_DIR=%~dp0.."
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"
set "STARTUP_DIR=%APPDATA%\PearsonDashboard"
set "STARTUP_SCRIPT=%STARTUP_DIR%\pm2-resurrect.bat"
set "TASK_NAME=PearsonDashboardPM2"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but was not found in PATH.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required but was not found in PATH.
  exit /b 1
)

where pm2 >nul 2>nul
if errorlevel 1 (
  echo Installing PM2 globally...
  call npm install -g pm2
  if errorlevel 1 exit /b 1
)

cd /d "%APP_DIR%"
if errorlevel 1 exit /b 1

if not exist "node_modules" (
  echo Installing application dependencies...
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 exit /b 1
)

echo Starting %APP_NAME% with PM2 on port 3000...
call pm2 delete "%APP_NAME%" >nul 2>nul
set "PORT=3000"
call pm2 start "%APP_DIR%\server.js" --name "%APP_NAME%" --cwd "%APP_DIR%" --update-env
if errorlevel 1 exit /b 1

call pm2 save
if errorlevel 1 exit /b 1

if not exist "%STARTUP_DIR%" mkdir "%STARTUP_DIR%"
(
  echo @echo off
  echo cd /d "%APP_DIR%"
  echo set "PORT=3000"
  echo call pm2 resurrect
) > "%STARTUP_SCRIPT%"

schtasks /Create /TN "%TASK_NAME%" /SC ONLOGON /TR "\"%STARTUP_SCRIPT%\"" /F >nul
if errorlevel 1 (
  echo Could not create the startup task. Run this script as Administrator and try again.
  exit /b 1
)

echo.
echo PM2 setup complete.
echo App: http://localhost:3000
echo Startup task: %TASK_NAME%
echo Useful commands:
echo   pm2 status
echo   pm2 logs %APP_NAME%
echo   pm2 restart %APP_NAME%

endlocal
