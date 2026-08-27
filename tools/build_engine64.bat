@echo off
setlocal EnableExtensions
REM WARNING: deploying ONLY engine.dll breaks lobby (must match panorama.dll).
REM Prefer: tools\build_offline64_lobby_pair.bat
if /I not "%ALLOW_SOLO_ENGINE%"=="1" (
  echo ERROR: use build_offline64_lobby_pair.bat ^(engine+panorama^).
  echo Set ALLOW_SOLO_ENGINE=1 to override ^(crash/black risk^).
  exit /b 2
)
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src\engine
msbuild engine_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1
copy /Y Release\x64\engine.dll C:\Games\CSGO\gameOffline64\bin\x64\engine.dll >nul
copy /Y Release\x64\engine.dll C:\Games\CSGO\gameOffline64\bin\engine.dll >nul
echo OK: engine.dll staged
endlocal
exit /b 0
