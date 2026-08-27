@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
set PCRESRC=C:\Games\CSGO\tools\pcre-8.45\pcre-8.45
set BUILDDIR=%PCRESRC%\build64
if not exist "%BUILDDIR%" mkdir "%BUILDDIR%"
cd /d "%BUILDDIR%"
cmake .. -G "Visual Studio 17 2022" -A x64 -DCMAKE_BUILD_TYPE=Release -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded -DCMAKE_C_FLAGS="/d2FH4-" -DCMAKE_CXX_FLAGS="/d2FH4-" -DBUILD_SHARED_LIBS=OFF -DPCRE_BUILD_PCRE8=ON -DPCRE_BUILD_PCRE16=OFF -DPCRE_BUILD_PCRE32=OFF -DPCRE_BUILD_PCRECPP=ON -DPCRE_BUILD_PCREGREP=OFF -DPCRE_BUILD_TESTS=OFF -DPCRE_SUPPORT_JIT=OFF
if errorlevel 1 exit /b 1
powershell -NoProfile -Command "(Get-Content pcre.vcxproj) -replace 'MultiThreadedDLL','MultiThreaded' -replace 'MultiThreadedDebugDLL','MultiThreadedDebug' | Set-Content pcre.vcxproj"
powershell -NoProfile -Command "(Get-Content pcrecpp.vcxproj) -replace 'MultiThreadedDLL','MultiThreaded' -replace 'MultiThreadedDebugDLL','MultiThreadedDebug' | Set-Content pcrecpp.vcxproj"
cmake --build . --config Release --target pcre pcrecpp
if errorlevel 1 exit /b 1
set OUT=C:\Games\CSGO\csgo_src\csgo_scr\src\lib\common\win64
if not exist "%OUT%" mkdir "%OUT%"
copy /Y Release\pcre.lib "%OUT%\pcre.lib"
copy /Y Release\pcrecpp.lib "%OUT%\pcrecpp.lib"
exit /b 0
