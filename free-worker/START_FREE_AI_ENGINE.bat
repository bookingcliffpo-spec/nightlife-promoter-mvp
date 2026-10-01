@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
title Cliff AI Video Engine

echo ==========================================================
echo CLIFF AI VIDEO - FREE LOCAL GENERATION ENGINE
echo ==========================================================
echo.
echo This window powers AI video generation for the public site.
echo Leave it open while you want the site to generate videos.
echo.

if not exist "WanGP\envs.json" (
  echo WanGP is not installed yet.
  echo Run free-wangp\install-and-run-windows.bat once, then run this again.
  pause
  exit /b 1
)

cd /d "%~dp0..\WanGP"

set "ENV_TYPE="
set "ENV_PATH="
for /f "tokens=1,2,3 delims=|" %%A in ('python setup.py get_env_info 2^>nul') do (
  if "%%A"=="ENV_INFO" (
    set "ENV_TYPE=%%B"
    set "ENV_PATH=%%C"
  )
)

if "!ENV_TYPE!"=="venv" (
  call "!ENV_PATH!\Scripts\activate.bat"
) else if "!ENV_TYPE!"=="uv" (
  call "!ENV_PATH!\Scripts\activate.bat"
) else if "!ENV_TYPE!"=="conda" (
  call conda activate "!ENV_PATH!"
)

echo Checking worker dependencies...
python -m pip install -q requests supabase
if errorlevel 1 (
  echo Could not install the small worker dependencies.
  pause
  exit /b 1
)

cd /d "%~dp0.."
python free-worker\cliff_ai_worker.py
pause
