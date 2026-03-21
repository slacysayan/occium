@echo off
setlocal

cd /d "%~dp0"

echo.
echo Occium local helper bootstrap
echo -----------------------------

where python >nul 2>nul
if errorlevel 1 goto :python_missing
echo [ok] Python detected

if not exist "local-helper\\.venv\\Scripts\\python.exe" (
  echo.
  echo Creating local helper virtual environment...
  python -m venv local-helper\.venv
  if errorlevel 1 goto :failed
) else (
  echo [ok] local helper virtual environment already exists
)

echo.
echo Installing Python helper dependencies...
call local-helper\.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto :failed
call local-helper\.venv\Scripts\python.exe -m pip install -r local-helper\requirements.txt
if errorlevel 1 goto :failed

echo.
for /f "delims=" %%i in ('local-helper\.venv\Scripts\python.exe -c "import sys, yt_dlp; print(getattr(getattr(yt_dlp, 'version', None), '__version__', getattr(yt_dlp, '__version__', 'unknown')))" 2^>nul') do set YTDLP_VERSION=%%i
if defined YTDLP_VERSION (
  echo [ok] yt-dlp detected via Python package: %YTDLP_VERSION%
) else (
  echo.
  echo [warning] yt-dlp could not be verified inside the Python environment yet.
)

echo.
echo Starting helper at http://127.0.0.1:4315
call local-helper\.venv\Scripts\python.exe local-helper\server.py
if errorlevel 1 goto :failed

goto :eof

:python_missing
echo.
echo Python was not found on PATH.
echo Install Python 3 and run this launcher again.
pause
exit /b 1

:failed
echo.
echo Failed to start the local helper.
echo Check the messages above, then try again.
pause
exit /b 1
