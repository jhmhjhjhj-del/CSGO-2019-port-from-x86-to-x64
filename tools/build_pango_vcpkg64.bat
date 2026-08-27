@echo off
set VCPKG=C:\Games\CSGO\third_party\GameNetworkingSockets\vcpkg\vcpkg.exe
:waitlock
tasklist /FI "IMAGENAME eq vcpkg.exe" 2>nul | find /I "vcpkg.exe" >nul
if not errorlevel 1 (
  echo waiting for existing vcpkg...
  powershell -NoProfile -Command "Start-Sleep -Seconds 30"
  goto waitlock
)
"%VCPKG%" install pango:x64-windows fontconfig:x64-windows freetype:x64-windows glib:x64-windows --recurse
if errorlevel 1 exit /b 1
call C:\Games\CSGO\tools\stage_pango_vcpkg64.bat
exit /b %ERRORLEVEL%
