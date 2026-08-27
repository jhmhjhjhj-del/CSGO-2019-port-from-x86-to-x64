@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src\game\client
msbuild client_panorama_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1
copy /Y Release_client_panorama\x64\client_panorama.dll C:\Games\CSGO\gameOffline64\csgo\bin\client_panorama.dll >nul
copy /Y Release_client_panorama\x64\client_panorama.dll C:\Games\CSGO\gameOffline64\csgo\bin\x64\client_panorama.dll >nul
copy /Y Release_client_panorama\x64\client_panorama.dll C:\Games\CSGO\gameOffline64\bin\x64\client_panorama.dll >nul
echo OK: client_panorama.dll staged
exit /b 0
