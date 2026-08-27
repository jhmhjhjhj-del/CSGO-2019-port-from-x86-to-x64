@echo off
setlocal

REM Builds + copies server.dll
set "ROOT=C:\Games\CSGO"
set "MSBUILD=%ProgramFiles(x86)%\MSBuild\14.0\Bin\MSBuild.exe"
set "PROPS=%ROOT%\csgo_src\disable_ltcg.props"
set "PROJ=%ROOT%\csgo_src\csgo_scr\src\game\server\server.vcxproj"

set "SRC_DLL=%ROOT%\csgo_src\csgo_scr\src\game\server\Release_csgo\server.dll"
set "DST_DLL=%ROOT%\game\csgo\bin\server.dll"

echo [build_server.dll] building server.vcxproj ...
"%MSBUILD%" "%PROJ%" /p:Configuration=Release /p:Platform=Win32 /p:ForceImportBeforeCppTargets="%PROPS%" /m /v:minimal
if errorlevel 1 exit /b 1

if not exist "%SRC_DLL%" (
  echo [build_server.dll] ERROR: source DLL not found:
  echo   %SRC_DLL%
  exit /b 2
)

echo [build_server.dll] copying to live bin ...
copy /Y "%SRC_DLL%" "%DST_DLL%"
echo [build_server.dll] done.

endlocal

