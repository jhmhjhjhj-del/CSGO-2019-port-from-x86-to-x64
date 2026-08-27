@echo off
setlocal

set "ROOT=C:\Games\CSGO"
set "MSBUILD=%ProgramFiles(x86)%\MSBuild\14.0\Bin\MSBuild.exe"
set "PROPS=%ROOT%\csgo_scr_offline\disable_ltcg.props"
set "PROJ=%ROOT%\csgo_scr_offline\csgo_scr\src\game\server\server.vcxproj"

set "SRC_DLL=%ROOT%\csgo_scr_offline\csgo_scr\src\game\server\Release_csgo\server.dll"
set "DST_DLL=%ROOT%\gameOffline\csgo\bin\server.dll"

echo [build_offline_server] building server ...
"%MSBUILD%" "%PROJ%" /p:Configuration=Release /p:Platform=Win32 /p:ForceImportBeforeCppTargets="%PROPS%" /m /v:minimal
if errorlevel 1 exit /b 1

if not exist "%SRC_DLL%" (
  echo [build_offline_server] ERROR: source DLL not found:
  echo   %SRC_DLL%
  exit /b 2
)

echo [build_offline_server] copying to gameOffline ...
copy /Y "%SRC_DLL%" "%DST_DLL%"
echo [build_offline_server] done: %DST_DLL%

endlocal
