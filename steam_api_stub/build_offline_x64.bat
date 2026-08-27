@echo off
setlocal
cd /d "%~dp0"

call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

set "CSGO_ROOT=C:\Games\CSGO"
set "OUTDIR=%~dp0out_forwarder_x64"
set "STAGE=%CSGO_ROOT%\gameOffline64"
set "PRE=%CSGO_ROOT%\offline_closed\prebuilt"
set "LIBDIR=%CSGO_ROOT%\csgo_src\csgo_scr\src\lib\public\x64"

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo Building closed modules first...
call "%CSGO_ROOT%\offline_closed\build_closed_x64.bat"
if errorlevel 1 exit /b 1

echo Building public steam_api64.dll forwarder...
cl /nologo /O2 /MD /EHsc /LD /DWIN64 /D_WIN64 /D_WINDOWS /DSTEAM_API_EXPORTS ^
  steam_api_forwarder.cpp ^
  /Fe:"%OUTDIR%\steam_api64.dll" ^
  /Fo:"%OUTDIR%\steam_api_forwarder.obj" ^
  /link /IMPLIB:"%OUTDIR%\steam_api64.lib" /OUT:"%OUTDIR%\steam_api64.dll" user32.lib
if errorlevel 1 exit /b 1

copy /Y "%OUTDIR%\steam_api64.lib" "%LIBDIR%\steam_api64.lib" >nul
for %%D in (bin bin\x64) do (
  copy /Y "%OUTDIR%\steam_api64.dll" "%STAGE%\%%D\steam_api64.dll" >nul
  copy /Y "%PRE%\offline_steam_x64.dll" "%STAGE%\%%D\offline_steam_x64.dll" >nul
  copy /Y "%PRE%\offline_inventory_x64.dll" "%STAGE%\%%D\offline_inventory_x64.dll" >nul
)
copy /Y "%OUTDIR%\steam_api64.dll" "%STAGE%\bin\steam_api.dll" >nul

echo OK: forwarder steam_api64.dll + closed DLLs staged
endlocal
exit /b 0
