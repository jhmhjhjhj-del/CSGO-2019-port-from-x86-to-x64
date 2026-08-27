@echo off
setlocal EnableExtensions
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

set "SRC=C:\Games\CSGO\csgo_src\csgo_scr\src"
set "OUT=C:\Games\CSGO\csgo_src\csgo_scr\game\bin\x64"
set "STAGE=C:\Games\CSGO\gameOffline64\bin\x64"
set "EXE_STAGE=C:\Games\CSGO\gameOffline64"

if not exist "%OUT%" mkdir "%OUT%"
if not exist "%STAGE%" mkdir "%STAGE%"

echo === build launcher.dll x64 ===
cd /d "%SRC%\launcher"
msbuild launcher_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

echo === build csgo_win64.exe ===
cd /d "%SRC%\launcher_main"
msbuild launcher_main_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

echo === stage ===
copy /Y "%SRC%\launcher\Release\x64\launcher.dll" "%OUT%\launcher.dll" >nul
copy /Y "%OUT%\launcher.dll" "%STAGE%\launcher.dll" >nul
copy /Y "%SRC%\launcher_main\Release\x64\csgo_win64.exe" "%EXE_STAGE%\csgo_win64.exe" >nul
copy /Y "%SRC%\launcher_main\Release\x64\csgo_win64.exe" "C:\Games\CSGO\csgo_src\csgo_scr\game\csgo_win64.exe" >nul

echo OK: %STAGE%\launcher.dll
echo OK: %EXE_STAGE%\csgo_win64.exe
endlocal
exit /b 0
