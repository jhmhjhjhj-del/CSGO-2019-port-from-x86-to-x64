@echo off
setlocal
cd /d "%~dp0"

set VS14=C:\Program Files (x86)\Microsoft Visual Studio 14.0\VC
call "%VS14%\vcvarsall.bat" x64
if errorlevel 1 (
  echo Failed to load VS2015 x64 env
  exit /b 1
)

set STEAM_INC=C:\Games\CSGO\csgo_src\csgo_scr\src\public
set OUTDIR=%~dp0out_x64
set LIBDIR=C:\Games\CSGO\csgo_src\csgo_scr\src\lib\public\x64
if not exist "%OUTDIR%" mkdir "%OUTDIR%"
if not exist "%LIBDIR%" mkdir "%LIBDIR%"

echo Generating grant UI data + inventory helpers...
py -3 gen_inventory.py
if errorlevel 1 exit /b 1

echo Generating interface stubs...
py -3 gen_stubs.py
if errorlevel 1 exit /b 1

echo Compiling steam_api64.dll (own stub)...
cl /nologo /O2 /MD /EHsc /LD /DWIN64 /D_WIN64 /DPLATFORM_64BITS /D_WINDOWS /DSTEAM_API_EXPORTS ^
  /I"%STEAM_INC%" ^
  steam_api_stub.cpp ^
  /Fe:"%OUTDIR%\steam_api64.dll" ^
  /Fo:"%OUTDIR%\steam_api_stub.obj" ^
  /link /IMPLIB:"%OUTDIR%\steam_api64.lib" /OUT:"%OUTDIR%\steam_api64.dll" user32.lib comdlg32.lib gdiplus.lib ole32.lib ws2_32.lib iphlpapi.lib
if errorlevel 1 (
  echo Build failed
  exit /b 1
)

copy /Y "%OUTDIR%\steam_api64.lib" "%LIBDIR%\steam_api64.lib"
if errorlevel 1 exit /b 1

echo.
echo OK: %OUTDIR%\steam_api64.dll + %LIBDIR%\steam_api64.lib
endlocal
