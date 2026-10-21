@echo off
cd /d "%~dp0"
echo Starting Fatebound Gambit...
echo If a window opens then closes instantly, use right-click - Run with PowerShell on start_game.ps1
echo.
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_game.ps1"
echo.
echo Server stopped.
pause
