@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo ==========================================================
echo CLIFF FREE CINEMATIC STUDIO - POWERED BY WANGP
echo No API credits. Generation runs on this computer.
echo ==========================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git is required. Install Git for Windows, then run this again.
  pause
  exit /b 1
)

echo [1/4] Loading the official WanGP components...
git submodule update --init --recursive
if errorlevel 1 (
  echo Failed to initialize WanGP.
  pause
  exit /b 1
)

echo [2/4] Installing the Cliff Studio plugin...
if not exist "%ROOT%\WanGP\plugins\wan2gp-cliff-studio" mkdir "%ROOT%\WanGP\plugins\wan2gp-cliff-studio"
xcopy /E /I /Y "%ROOT%\free-wangp\wan2gp-cliff-studio\*" "%ROOT%\WanGP\plugins\wan2gp-cliff-studio\" >nul

cd /d "%ROOT%\WanGP"

if not exist "envs.json" (
  echo [3/4] WanGP is not installed yet. Starting the official installer...
  call scripts\install.bat
  if not exist "envs.json" (
    echo WanGP installation was not completed.
    pause
    exit /b 1
  )
) else (
  echo [3/4] Existing WanGP installation found.
)

echo Enabling Cliff Studio plugin...
python -c "import json,pathlib; p=pathlib.Path('wgp_config.json'); d=json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}; e=d.setdefault('enabled_plugins',[]); e.append('wan2gp-cliff-studio') if 'wan2gp-cliff-studio' not in e else None; p.write_text(json.dumps(d,indent=2),encoding='utf-8')" 2>nul

echo [4/4] Configuring local web access...
(
  echo --listen
  echo --server-port 7860
  echo --no-auth
  echo --open-browser
) > scripts\args.txt

echo Starting the full WanGP interface with Cliff Studio...
call scripts\run.bat
