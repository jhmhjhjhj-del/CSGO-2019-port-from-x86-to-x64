@echo off
setlocal EnableExtensions
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

set "SRC=C:\Games\CSGO\csgo_src\thirdparty\video_stub_x64"
set "OUT=C:\Games\CSGO\csgo_src\thirdparty\video_stub_x64\out"
set "STAGE=C:\Games\CSGO\gameOffline64\bin\x64"

if not exist "%OUT%" mkdir "%OUT%"

cl /nologo /LD /EHsc /O2 /MD "%SRC%\video_stub.cpp" /Fe:"%OUT%\video.dll" /link /NOLOGO /DLL kernel32.lib user32.lib

if errorlevel 1 exit /b 1

copy /Y "%OUT%\video.dll" "%STAGE%\video.dll" >nul
echo OK: %STAGE%\video.dll
endlocal
exit /b 0
