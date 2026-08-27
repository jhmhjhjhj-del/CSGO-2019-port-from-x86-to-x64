@echo off
setlocal EnableExtensions
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 1

set "ROOT=C:\Games\CSGO\csgo_src\thirdparty\vaudio_x64"
set "FFMPEG=C:\Games\CSGO\csgo_src\thirdparty\ffmpeg_x64"
set "OUT=%ROOT%\out"
set "STAGE=C:\Games\CSGO\gameOffline64"

if not exist "%OUT%" mkdir "%OUT%"

pushd "%ROOT%"
cl /nologo /LD /EHsc /O2 /MD /std:c++17 ^
  /I"%FFMPEG%\include" ^
  vaudio_dll.cpp mp3_ffmpeg.cpp ^
  /Fe:"%OUT%\vaudio_miles.dll" ^
  /link /NOLOGO /DLL /LIBPATH:"%FFMPEG%\lib" avformat.lib avcodec.lib avutil.lib swresample.lib ^
  /OUT:"%OUT%\vaudio_miles.dll"
if errorlevel 1 (
  popd
  exit /b 1
)
popd

for %%D in (bin bin\x64) do (
  copy /Y "%OUT%\vaudio_miles.dll" "%STAGE%\%%D\vaudio_miles.dll" >nul
)

echo OK: vaudio_miles.dll staged to %STAGE%\bin and bin\x64
endlocal
exit /b 0
