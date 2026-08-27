@echo off
setlocal EnableExtensions
set "VCVARS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set "GNS=C:\Games\CSGO\third_party\GameNetworkingSockets"
set "VCPKG=%GNS%\build\vcpkg_installed\x64-windows"
set "SRC=C:\Games\CSGO\csgo_src\csgo_scr\src"
set "ROOT=C:\Games\CSGO\steamnetworkingsockets_win64"
set "OUT=C:\Games\CSGO\csgo_src\csgo_scr\game\bin\x64"
set "STAGE=C:\Games\CSGO\gameOffline64\bin\x64"

if not exist "%VCVARS%" (
  echo Missing VS2022 BuildTools
  exit /b 1
)
if not exist "%GNS%\build\src\GameNetworkingSockets_s.lib" (
  echo Missing GameNetworkingSockets_s.lib — run build_gns.bat first
  exit /b 1
)

call "%VCVARS%"
if errorlevel 1 exit /b 1

if not exist "%OUT%" mkdir "%OUT%"
if not exist "%STAGE%" mkdir "%STAGE%"

set "INCLUDES=/I"%ROOT%" /I"%SRC%\public" /I"%SRC%\public\tier0" /I"%SRC%\public\tier1" /I"%GNS%\include" /I"%GNS%\src\public" /I"%GNS%\build\src" /I"%VCPKG%\include""
set "LIBS=%GNS%\build\src\GameNetworkingSockets_s.lib %SRC%\lib\public\x64\steam_api64.lib %VCPKG%\lib\libprotobuf.lib %VCPKG%\lib\utf8_validity.lib %VCPKG%\lib\abseil_dll.lib %VCPKG%\lib\libcrypto.lib ws2_32.lib crypt32.lib winmm.lib Iphlpapi.lib"

echo === build steamnetworkingsockets.dll ===
cl /nologo /LD /O2 /MD /EHsc /std:c++17 /W3 ^
  /DWIN32 /D_WIN32 /DWIN64 /D_WIN64 /DPLATFORM_64BITS /DCOMPILER_MSVC /DCOMPILER_MSVC64 ^
  /DVALVE_CALLBACK_PACK_LARGE /DSTEAMNETWORKINGSOCKETS_STATIC_LINK /DSTEAMDATAGRAMLIB_FOREXPORT ^
  %INCLUDES% ^
  "%ROOT%\gns_backend.cpp" "%ROOT%\csgo_sns.cpp" ^
  /Fe"%OUT%\steamnetworkingsockets.dll" ^
  /link /DEF:"%ROOT%\steamnetworkingsockets.def" %LIBS% /OUT:"%OUT%\steamnetworkingsockets.dll"
if errorlevel 1 exit /b 1

echo === stage DLL + GNS runtime deps ===
copy /Y "%OUT%\steamnetworkingsockets.dll" "%STAGE%\steamnetworkingsockets.dll" >nul
for %%D in (abseil_dll.dll libprotobuf.dll libcrypto-3-x64.dll libssl-3-x64.dll) do (
  if exist "%VCPKG%\bin\%%D" copy /Y "%VCPKG%\bin\%%D" "%STAGE%\%%D" >nul
)

echo OK: %STAGE%\steamnetworkingsockets.dll
endlocal
exit /b 0
