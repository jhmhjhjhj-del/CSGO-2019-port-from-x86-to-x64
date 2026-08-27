@echo off
setlocal EnableExtensions
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

set "ROOT=C:\Games\CSGO\csgo_src\thirdparty\video_x64"
set "FFMPEG=C:\Games\CSGO\csgo_src\thirdparty\ffmpeg_x64"
set "SRC_INC=C:\Games\CSGO\csgo_src\csgo_scr\src"
set "OUT=%ROOT%\out"
set "STAGE=C:\Games\CSGO\gameOffline64"

if not exist "%OUT%" mkdir "%OUT%"

pushd "%ROOT%"
cl /nologo /LD /EHsc /O2 /MD /std:c++17 ^
  /I"%FFMPEG%\include" ^
  /I"%SRC_INC%" ^
  video_dll.cpp video_player.cpp ^
  /Fe:"%OUT%\video.dll" ^
  /link /NOLOGO /DLL /LIBPATH:"%FFMPEG%\lib" avformat.lib avcodec.lib avutil.lib swscale.lib swresample.lib ^
  /OUT:"%OUT%\video.dll"
if errorlevel 1 (
  popd
  exit /b 1
)
popd

for %%D in (bin bin\x64) do (
  copy /Y "%OUT%\video.dll" "%STAGE%\%%D\video.dll" >nul
  copy /Y "%FFMPEG%\bin\avcodec-63.dll" "%STAGE%\%%D\" >nul
  copy /Y "%FFMPEG%\bin\avformat-63.dll" "%STAGE%\%%D\" >nul
  copy /Y "%FFMPEG%\bin\avutil-61.dll" "%STAGE%\%%D\" >nul
  copy /Y "%FFMPEG%\bin\swscale-10.dll" "%STAGE%\%%D\" >nul
  copy /Y "%FFMPEG%\bin\swresample-7.dll" "%STAGE%\%%D\" >nul
)

echo OK: video.dll + FFmpeg staged to %STAGE%\bin and bin\x64
endlocal
exit /b 0
