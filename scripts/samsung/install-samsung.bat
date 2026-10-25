@echo off
REM Rafiq Al-Muslim TV screen - install on a Samsung (Tizen) TV from a Windows PC.
REM Needs: Tizen Studio (with "TV Extensions" + Samsung Certificate Extension), a Samsung certificate
REM profile created in Certificate Manager, and the TV in Developer Mode with this PC's IP.
REM Put this file next to RafiqAlMuslim-Samsung.wgt and double-click it.
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "TIZEN_HOME="
for %%D in ("C:\tizen-studio" "%USERPROFILE%\tizen-studio" "D:\tizen-studio") do if exist "%%~D\tools\sdb.exe" if not defined TIZEN_HOME set "TIZEN_HOME=%%~D"
if not defined TIZEN_HOME (
  echo [!] Tizen Studio was not found in C:\tizen-studio or %USERPROFILE%\tizen-studio
  echo     Install it from https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html
  pause & exit /b 1
)
set "SDB=%TIZEN_HOME%\tools\sdb.exe"
set "CLI=%TIZEN_HOME%\tools\ide\bin\tizen.bat"
if not exist "RafiqAlMuslim-Samsung.wgt" (
  echo [!] RafiqAlMuslim-Samsung.wgt must be in the same folder as this file.
  pause & exit /b 1
)

set /p TVIP=TV IP address (TV: Settings ^> General ^> Network ^> Network Status ^> IP Settings): 
set /p PROFILE=Certificate profile name from Certificate Manager (press Enter for the active one): 

echo.
echo [1/4] Connecting to the TV...
"%SDB%" disconnect %TVIP% >nul 2>&1
"%SDB%" connect %TVIP%
set "SERIAL="
for /f "tokens=1" %%S in ('"%SDB%" devices ^| findstr /b /c:"%TVIP%"') do set "SERIAL=%%S"
if not defined SERIAL (
  echo [!] Could not connect. Check: Developer Mode is ON with this PC's IP, the TV was restarted, same Wi-Fi.
  pause & exit /b 1
)
echo     Connected: !SERIAL!

echo [2/4] Preparing the package...
set "WORK=%TEMP%\rafiq-samsung"
if exist "%WORK%" rmdir /s /q "%WORK%"
mkdir "%WORK%\app"
copy /y "RafiqAlMuslim-Samsung.wgt" "%WORK%\pkg.zip" >nul
powershell -NoProfile -Command "Expand-Archive -Force '%WORK%\pkg.zip' '%WORK%\app'" || (echo [!] Could not unpack. & pause & exit /b 1)

echo [3/4] Signing with your Samsung certificate...
if "%PROFILE%"=="" (
  call "%CLI%" package -t wgt -- "%WORK%\app"
) else (
  call "%CLI%" package -t wgt -s "%PROFILE%" -- "%WORK%\app"
)
set "WGT="
for %%F in ("%WORK%\app\*.wgt") do set "WGT=%%~nxF"
if not defined WGT (
  echo [!] Signing failed. Open Tizen Studio ^> Tools ^> Certificate Manager and create a Samsung certificate
  echo     ^(TV type, add the TV's DUID^), then run this file again.
  pause & exit /b 1
)

echo [4/4] Installing on the TV...
call "%CLI%" install -n "!WGT!" -s !SERIAL! -- "%WORK%\app"
echo.
echo Done. On the TV open Apps and look for "Rafiq Al-Muslim screen".
pause
