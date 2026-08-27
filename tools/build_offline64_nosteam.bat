@echo off
setlocal EnableExtensions
echo === gameOffline64 NO_STEAM core rebuild ===

call C:\Games\CSGO\steam_api_stub\build_offline_x64.bat
if errorlevel 1 exit /b 1

call C:\Games\CSGO\tools\build_launcher64.bat
if errorlevel 1 exit /b 1

call C:\Games\CSGO\tools\build_engine64.bat
if errorlevel 1 exit /b 1

call C:\Games\CSGO\tools\build_client_panorama64.bat
if errorlevel 1 exit /b 1

call C:\Games\CSGO\tools\build_panorama64.bat
if errorlevel 1 exit /b 1

copy /Y C:\Games\CSGO\gameOffline64\bin\x64\panorama.dll C:\Games\CSGO\gameOffline64\bin\panorama.dll >nul

echo.
echo OK: NO_STEAM stack staged (steam_api, launcher, engine, client_panorama, panorama)
endlocal
exit /b 0
