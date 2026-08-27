@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
cd /d C:\Games\CSGO\csgo_src\csgo_scr\src\panorama
msbuild panorama_text_pango_win64.vcxproj /p:Configuration=Release /p:Platform=x64 /p:PreBuildEventUseInBuild=false /m /v:minimal
exit /b %ERRORLEVEL%
