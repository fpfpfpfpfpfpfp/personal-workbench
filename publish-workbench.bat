@echo off
setlocal

cd /d "%~dp0"
set "GIT_EXE=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"

echo Publishing personal-workbench...
echo.

if not exist "%GIT_EXE%" (
  echo ERROR: Git was not found.
  echo Expected: %GIT_EXE%
  echo.
  pause
  exit /b 1
)

"%GIT_EXE%" push origin main
set "PUSH_EXIT=%ERRORLEVEL%"

echo.
if "%PUSH_EXIT%"=="0" (
  echo SUCCESS: GitHub push completed.
  echo Netlify will deploy the update automatically.
) else (
  echo ERROR: Push failed. Check the message above and try again.
)

echo.
pause
exit /b %PUSH_EXIT%
