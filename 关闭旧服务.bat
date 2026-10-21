@echo off
chcp 65001 >nul
echo Closing old Fatebound Gambit server windows...
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$n=0; Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'powershell|pwsh' -and $_.CommandLine -match 'start_game\.ps1' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $n++; Write-Host ('Closed PID ' + $_.ProcessId) }; if ($n -eq 0) { Write-Host 'No old server found.' } else { Write-Host ('Done. Closed ' + $n + ' process(es).') }"
echo.
pause
