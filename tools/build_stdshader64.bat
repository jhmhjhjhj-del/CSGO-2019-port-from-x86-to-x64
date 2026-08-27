@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem\stdshaders
msbuild stdshader_dx9_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1
copy /Y Release_dx9\x64\stdshader_dx9.dll C:\Games\CSGO\gameOffline64\bin\stdshader_dx9.dll >nul
copy /Y Release_dx9\x64\stdshader_dx9.dll C:\Games\CSGO\gameOffline64\bin\x64\stdshader_dx9.dll >nul
echo OK: stdshader_dx9.dll staged
exit /b 0
