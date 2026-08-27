@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1
msbuild "C:\Games\CSGO\csgo_src\csgo_scr\src\engine\engine_win64.vcxproj" /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\engine\Release\x64\engine.dll" "C:\Games\CSGO\gameOffline64\bin\x64\engine.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\engine\Release\x64\engine.dll" "C:\Games\CSGO\gameOffline64\bin\engine.dll" >nul
echo ENGINE_STAGED
exit /b 0
