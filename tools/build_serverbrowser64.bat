@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src\serverbrowser
msbuild serverbrowser_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1
if not exist "C:\Games\CSGO\gameOffline64\bin" mkdir "C:\Games\CSGO\gameOffline64\bin"
if not exist "C:\Games\CSGO\gameOffline64\bin\x64" mkdir "C:\Games\CSGO\gameOffline64\bin\x64"
copy /Y Release\serverbrowser.dll C:\Games\CSGO\gameOffline64\csgo\bin\x64\serverbrowser.dll >nul
copy /Y Release\serverbrowser.dll C:\Games\CSGO\gameOffline64\bin\serverbrowser.dll >nul
copy /Y Release\serverbrowser.dll C:\Games\CSGO\gameOffline64\bin\x64\serverbrowser.dll >nul
copy /Y Release\serverbrowser.dll C:\Games\CSGO\gameOffline64\platform\servers\serverbrowser.dll >nul
echo OK: serverbrowser.dll staged to gameOffline64
exit /b 0
