@echo off
setlocal

REM Builds + copies client.dll (your "panorama_client.dll")
set "ROOT=C:\Games\CSGO"
set "MSBUILD=%ProgramFiles(x86)%\MSBuild\14.0\Bin\MSBuild.exe"
set "PROPS=%ROOT%\csgo_src\disable_ltcg.props"
set "PROJ=%ROOT%\csgo_src\csgo_scr\src\game\client\client_panorama.vcxproj"

set "SRC_DLL1=%ROOT%\csgo_src\csgo_scr\src\game\client\Release_client_panorama\client_panorama.dll"
set "DST_DLL=%ROOT%\game\csgo\bin\client_panorama.dll"

echo [build_panorama_client.dll] building client.vcxproj ...
"%MSBUILD%" "%PROJ%" /p:Configuration=Release /p:Platform=Win32 /p:ForceImportBeforeCppTargets="%PROPS%" /m /v:minimal
if errorlevel 1 exit /b 1

if exist "%SRC_DLL1%" (
  echo [build_panorama_client.dll] copying to live bin ...
  copy /Y "%SRC_DLL1%" "%DST_DLL%"
  echo [build_panorama_client.dll] done.
  endlocal
  exit /b 0
)

echo [build_panorama_client.dll] ERROR: source DLL not found:
echo   %SRC_DLL1%
exit /b 2

