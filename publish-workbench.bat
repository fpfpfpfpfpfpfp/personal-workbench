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

set "PUSH_EXIT=1"
for /L %%A in (1,1,3) do (
  echo Push attempt %%A of 3...
  "%GIT_EXE%" -c http.version=HTTP/1.1 push origin main
  if not errorlevel 1 (
    set "PUSH_EXIT=0"
    goto :push_done
  )
  if not %%A==3 (
    echo Connection failed. Retrying in 5 seconds...
    timeout /t 5 /nobreak >nul
  )
)

:push_done

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
