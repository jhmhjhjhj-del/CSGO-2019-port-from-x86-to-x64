@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

echo === materialsystem ===
msbuild "C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem\materialsystem_win64.vcxproj" /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

echo === shaderapidx9 ===
msbuild "C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem\shaderapidx9\shaderapidx9_win64.vcxproj" /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

echo === panorama ===
msbuild "C:\Games\CSGO\csgo_src\csgo_scr\src\panorama\panorama_win64.vcxproj" /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

echo === engine ===
msbuild "C:\Games\CSGO\csgo_src\csgo_scr\src\engine\engine_win64.vcxproj" /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

echo === client_panorama ===
msbuild "C:\Games\CSGO\csgo_src\csgo_scr\src\game\client\client_panorama_win64.vcxproj" /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /p:PostBuildEventUseInBuild=false /m /v:minimal
if errorlevel 1 exit /b 1

set STAGE=C:\Games\CSGO\gameOffline64
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem\Release\x64\materialsystem.dll" "%STAGE%\bin\x64\materialsystem.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem\Release\x64\materialsystem.dll" "%STAGE%\bin\materialsystem.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem\shaderapidx9\Release\x64\shaderapidx9.dll" "%STAGE%\bin\x64\shaderapidx9.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\materialsystem\shaderapidx9\Release\x64\shaderapidx9.dll" "%STAGE%\bin\shaderapidx9.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\panorama\Release\x64\panorama.dll" "%STAGE%\bin\x64\panorama.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\panorama\Release\x64\panorama.dll" "%STAGE%\bin\panorama.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\engine\Release\x64\engine.dll" "%STAGE%\bin\x64\engine.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\engine\Release\x64\engine.dll" "%STAGE%\bin\engine.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\game\client\Release_client_panorama\x64\client_panorama.dll" "%STAGE%\csgo\bin\client_panorama.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\game\client\Release_client_panorama\x64\client_panorama.dll" "%STAGE%\csgo\bin\x64\client_panorama.dll" >nul
copy /Y "C:\Games\CSGO\csgo_src\csgo_scr\src\game\client\Release_client_panorama\x64\client_panorama.dll" "%STAGE%\bin\x64\client_panorama.dll" >nul

echo STAGED to %STAGE%\bin and bin\x64 and csgo\bin
exit /b 0
