@echo off
setlocal
cd /d "%~dp0\.."

echo === OFFLINE build: steam_api.dll ===
call steam_api_stub\build_offline.bat
if errorlevel 1 exit /b 1

echo.
echo === OFFLINE build: client_panorama.dll ===
call tools\build_offline_client.dll.bat
if errorlevel 1 exit /b 1

echo.
echo === OFFLINE build: server.dll ===
call tools\build_offline_server.dll.bat
if errorlevel 1 exit /b 1

echo.
echo All OFFLINE DLLs installed to gameOffline\
endlocal
