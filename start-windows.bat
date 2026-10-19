@echo off
title Rafiq Al-Muslim
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Please install the LTS version from https://nodejs.org then run this file again.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing libraries for the first time, please wait...
  call npm install
  if errorlevel 1 (
    echo Installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
echo.
echo Starting Rafiq Al-Muslim... the browser will open automatically.
echo To stop the app, close this window.
echo.
call npm run dev -- --open
pause
