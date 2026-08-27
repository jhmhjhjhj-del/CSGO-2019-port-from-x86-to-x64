@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem
msbuild materialsystem_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1
copy /Y Release\x64\materialsystem.dll C:\Games\CSGO\gameOffline64\bin\materialsystem.dll >nul
copy /Y Release\x64\materialsystem.dll C:\Games\CSGO\gameOffline64\bin\x64\materialsystem.dll >nul
echo OK: materialsystem.dll staged
exit /b 0
