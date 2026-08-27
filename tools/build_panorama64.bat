@echo off
setlocal EnableExtensions
REM WARNING: deploying ONLY panorama.dll breaks lobby (must match engine.dll).
REM Prefer: tools\build_offline64_lobby_pair.bat
if /I not "%ALLOW_SOLO_PANORAMA%"=="1" (
  echo ERROR: use build_offline64_lobby_pair.bat ^(engine+panorama^).
  echo Set ALLOW_SOLO_PANORAMA=1 to override ^(crash/black risk^).
  exit /b 2
)
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

set "SRC=C:\Games\CSGO\csgo_src\csgo_scr\src"
set "STAGE=C:\Games\CSGO\gameOffline64\bin\x64"

echo === build panorama.dll x64 ===
cd /d "%SRC%\panorama"
msbuild panorama_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

copy /Y "%SRC%\panorama\Release\x64\panorama.dll" "%STAGE%\panorama.dll" >nul
copy /Y "%SRC%\panorama\Release\x64\panorama.dll" "C:\Games\CSGO\gameOffline64\bin\panorama.dll" >nul
echo OK: %STAGE%\panorama.dll (+ bin\panorama.dll)
endlocal
exit /b 0
