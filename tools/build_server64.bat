@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src\game\server
msbuild server_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1
copy /Y Release_csgo\x64\server.dll C:\Games\CSGO\gameOffline64\csgo\bin\server.dll >nul
copy /Y Release_csgo\x64\server.dll C:\Games\CSGO\gameOffline64\csgo\bin\x64\server.dll >nul
echo OK: server.dll staged
exit /b 0
