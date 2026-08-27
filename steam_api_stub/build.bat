@echo off
setlocal
cd /d "%~dp0"

set VS14=C:\Program Files (x86)\Microsoft Visual Studio 14.0\VC
call "%VS14%\vcvarsall.bat" x86
if errorlevel 1 (
  echo Failed to load VS2015 x86 env
  exit /b 1
)

set STEAM_INC=C:\Games\CSGO\csgo_src\csgo_scr\src\public
set OUTDIR=%~dp0out
if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo Generating grant UI data + inventory helpers...
py -3 gen_inventory.py
if errorlevel 1 exit /b 1

echo Building skin icon .iic cache from CDN...
py -3 gen_icon_cache.py
if errorlevel 1 (
  echo WARNING: icon cache incomplete — painted ItemImage may be blank
)

echo Generating interface stubs...
py -3 gen_stubs.py
if errorlevel 1 exit /b 1

echo Compiling steam_api.dll (own stub)...
cl /nologo /O2 /MD /EHsc /LD /DWIN32 /D_WINDOWS /DSTEAM_API_EXPORTS ^
  /I"%STEAM_INC%" ^
  steam_api_stub.cpp ^
  /Fe:"%OUTDIR%\steam_api.dll" ^
  /Fo:"%OUTDIR%\steam_api_stub.obj" ^
  /link /IMPLIB:"%OUTDIR%\steam_api.lib" /OUT:"%OUTDIR%\steam_api.dll" user32.lib comdlg32.lib gdiplus.lib ole32.lib ws2_32.lib iphlpapi.lib
if errorlevel 1 (
  echo Build failed
  exit /b 1
)

echo Installing to game\bin...
copy /Y "%OUTDIR%\steam_api.dll" "C:\Games\CSGO\game\bin\steam_api.dll"
if errorlevel 1 exit /b 1

echo Packing code.pbin...
py -3 pack_pbin.py
if errorlevel 1 exit /b 1

echo.
echo OK: installed steam_api.dll + code.pbin
endlocal
