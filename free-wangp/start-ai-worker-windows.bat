@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

echo ==========================================================
echo CLIFF AI VIDEO - LOCAL GPU WORKER
echo This connects the public website to your WanGP computer.
echo ==========================================================
echo.

git submodule update --init --recursive
if errorlevel 1 (
  echo Could not load WanGP.
  pause
  exit /b 1
)

cd /d "%~dp0..\WanGP"

if not exist "envs.json" (
  echo WanGP is not installed yet. Starting the official installer...
  call scripts\install.bat
)

set "ENV_TYPE="
set "ENV_PATH="
for /f "tokens=1,2,3 delims=|" %%A in ('python setup.py get_env_info 2^>nul') do (
  if "%%A"=="ENV_INFO" (
    set "ENV_TYPE=%%B"
    set "ENV_PATH=%%C"
  )
)

if "!ENV_TYPE!"=="venv" call "!ENV_PATH!\Scripts\activate.bat"
if "!ENV_TYPE!"=="uv" call "!ENV_PATH!\Scripts\activate.bat"

if "!ENV_TYPE!"=="conda" (
  set "CONDA_BAT="
  where conda >nul 2>nul
  if !errorlevel! equ 0 set "CONDA_BAT=conda"
  if "!CONDA_BAT!"=="" if exist "%USERPROFILE%\Miniconda3\condabin\conda.bat" set "CONDA_BAT=%USERPROFILE%\Miniconda3\condabin\conda.bat"
  if "!CONDA_BAT!"=="" if exist "%USERPROFILE%\Anaconda3\condabin\conda.bat" set "CONDA_BAT=%USERPROFILE%\Anaconda3\condabin\conda.bat"
  if "!CONDA_BAT!"=="" (
    echo Could not find Conda.
    pause
    exit /b 1
  )
  call "!CONDA_BAT!" activate "!ENV_PATH!"
)

echo.
echo Worker is ON.
echo Keep this window open while you generate from your phone or computer.
echo Open the website, upload a flyer, type a prompt, and press GENERATE.
echo.

python "%~dp0cloud_worker.py" --root "%~dp0..\WanGP"

pause
