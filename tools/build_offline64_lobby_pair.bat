@echo off
setlocal EnableExtensions
REM =============================================================================
REM Offline64 lobby: ALWAYS rebuild + deploy engine.dll + panorama.dll as a PAIR.
REM Solo deploy of one DLL over the other = crash / black lobby (see lobby_stable).
REM
REM Known-good live stack (do not overwrite blindly):
REM   backups\offline64_lobby_ok_2026-08-24_1904
REM   = nosteam_2238 engine/panorama/client + lobby_stable matsys/shader
REM
REM Forbidden regressions (will black-screen):
REM   - PanDx Ensure / ResolveDevice / Panorama_GetCreatedD3DDevice latch
REM   - Dual paint: client RenderWindow + engine PanoramaRenderFrame
REM   - Deploy panorama without matching engine (or only to bin\ without bin\x64)
REM   - Assume bin\x64\client_panorama.dll is GAMEBIN (csgo\bin\ wins first)
REM =============================================================================

call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

set "SRC=C:\Games\CSGO\csgo_src\csgo_scr\src"
set "DST64=C:\Games\CSGO\gameOffline64\bin\x64"
set "DST=C:\Games\CSGO\gameOffline64\bin"

echo.
echo === [1/2] engine.dll x64 ===
cd /d "%SRC%\engine"
msbuild engine_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 (
  echo FAIL: engine build
  exit /b 1
)

echo.
echo === [2/2] panorama.dll x64 ===
cd /d "%SRC%\panorama"
msbuild panorama_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 (
  echo FAIL: panorama build — engine NOT deployed (pair unbroken)
  exit /b 1
)

if not exist "%SRC%\engine\Release\x64\engine.dll" (
  echo FAIL: missing engine output
  exit /b 1
)
if not exist "%SRC%\panorama\Release\x64\panorama.dll" (
  echo FAIL: missing panorama output
  exit /b 1
)

echo.
echo === deploy PAIR to bin\x64 + bin\ ===
copy /Y "%SRC%\engine\Release\x64\engine.dll" "%DST64%\engine.dll" >nul
copy /Y "%SRC%\engine\Release\x64\engine.dll" "%DST%\engine.dll" >nul
copy /Y "%SRC%\panorama\Release\x64\panorama.dll" "%DST64%\panorama.dll" >nul
copy /Y "%SRC%\panorama\Release\x64\panorama.dll" "%DST%\panorama.dll" >nul

echo OK: engine+panorama pair staged
echo     %DST64%\engine.dll
echo     %DST64%\panorama.dll
echo     %DST%\engine.dll
echo     %DST%\panorama.dll
echo.
echo Reminder: GAMEBIN client is csgo\bin\client_panorama.dll first.
echo Reminder: live known-good = backups\offline64_lobby_ok_2026-08-24_1904
endlocal
exit /b 0
