@echo off
setlocal

cd /d "%~dp0"

echo.
echo Occium local helper bootstrap
echo -----------------------------

where yt-dlp >nul 2>nul
if errorlevel 1 (
  echo [warning] yt-dlp was not found on PATH.
  echo           Metadata fallback can still work, but YouTube upload will stay blocked until yt-dlp is installed.
) else (
  for /f "delims=" %%i in ('yt-dlp --version 2^>nul') do set YTDLP_VERSION=%%i
  echo [ok] yt-dlp detected: %YTDLP_VERSION%
)

if not exist "local-helper\\node_modules" (
  echo.
  echo Installing local helper dependencies...
  call npm run install:helper
  if errorlevel 1 goto :failed
) else (
  echo.
  echo [ok] local helper dependencies already installed
)

echo.
echo Starting helper at http://127.0.0.1:4315
call npm run start:helper
if errorlevel 1 goto :failed

goto :eof

:failed
echo.
echo Failed to start the local helper.
echo Check the messages above, then try again.
pause
exit /b 1
