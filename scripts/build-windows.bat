@echo off
setlocal
cd /d "%~dp0.."
set ELECTRON_RUN_AS_NODE=

if "%~1"=="" set "MODE=installer"
if not "%~1"=="" set "MODE=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" -Mode %MODE%
if errorlevel 1 (
  echo Build failed.
  exit /b %errorlevel%
)
