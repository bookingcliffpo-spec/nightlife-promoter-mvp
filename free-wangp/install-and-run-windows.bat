@echo off
setlocal
cd /d "%~dp0.."

echo ==========================================================
echo CLIFF FREE AI STUDIO - POWERED BY WANGP
echo No API credits. Generation runs on this computer.
echo ==========================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git is required. Install Git for Windows, then run this again.
  pause
  exit /b 1
)

echo [1/3] Loading the official WanGP components...
git submodule update --init --recursive
if errorlevel 1 (
  echo Failed to initialize WanGP.
  pause
  exit /b 1
)

cd /d "%~dp0..\WanGP"

if not exist "envs.json" (
  echo [2/3] WanGP is not installed yet. Starting the official installer...
  call scripts\install.bat
  if not exist "envs.json" (
    echo WanGP installation was not completed.
    pause
    exit /b 1
  )
) else (
  echo [2/3] Existing WanGP installation found.
)

echo [3/3] Configuring local web access...
(
  echo --listen
  echo --server-port 7860
  echo --no-auth
  echo --open-browser
) > scripts\args.txt

echo Starting the full WanGP interface...
call scripts\run.bat
