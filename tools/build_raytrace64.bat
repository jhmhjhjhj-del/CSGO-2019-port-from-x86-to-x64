@echo off
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src
devtools\bin\vpc.exe /win64 /2015 /no_steam /f +raytrace
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd raytrace
msbuild raytrace_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /m /v:minimal
exit /b %ERRORLEVEL%
