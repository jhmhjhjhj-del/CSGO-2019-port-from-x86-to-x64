@echo off
setlocal EnableExtensions
set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "ROOT=C:\Games\CSGO\phonon_win64"
set "OUT=C:\Games\CSGO\csgo_src\csgo_scr\game\bin\x64"
set "STAGE=C:\Games\CSGO\gameOffline64\bin\x64"
set "CORE_SRC=C:\Games\CSGO\third_party\steamaudio_api_2.0-beta.17\steamaudio_api\bin\Windows\x64\phonon.dll"
set "INC=C:\Games\CSGO\csgo_src\csgo_scr\src\public"

if not exist "%VCVARS%" (
  echo Missing VS2022 BuildTools
  exit /b 1
)
if not exist "%CORE_SRC%" (
  echo Missing phonon_core source: %CORE_SRC%
  exit /b 1
)

call "%VCVARS%"
if errorlevel 1 exit /b 1

if not exist "%OUT%" mkdir "%OUT%"
if not exist "%STAGE%" mkdir "%STAGE%"

echo === build phonon.dll (CSGO 2017 API shim) ===
cl /nologo /LD /O2 /EHsc /W3 ^
  /I"%INC%" ^
  "%ROOT%\phonon_shim.cpp" ^
  /Fe"%OUT%\phonon.dll" ^
  /link /DEF:"%ROOT%\phonon.def" /OUT:"%OUT%\phonon.dll"
if errorlevel 1 exit /b 1

echo === stage phonon_core.dll + phonon.dll ===
copy /Y "%CORE_SRC%" "%OUT%\phonon_core.dll" >nul
copy /Y "%OUT%\phonon.dll" "%STAGE%\phonon.dll" >nul
copy /Y "%OUT%\phonon_core.dll" "%STAGE%\phonon_core.dll" >nul

echo OK: %STAGE%\phonon.dll
endlocal
exit /b 0
