@echo off
setlocal
cd /d "%~dp0..\WanGP"
if not exist "envs.json" (
  echo Run free-wangp\install-and-run-windows.bat first.
  pause
  exit /b 1
)
echo WARNING: anyone with the temporary share link can use your GPU.
(
  echo --share
  echo --no-auth
  echo --lock-config
) > scripts\args.txt
call scripts\run.bat
