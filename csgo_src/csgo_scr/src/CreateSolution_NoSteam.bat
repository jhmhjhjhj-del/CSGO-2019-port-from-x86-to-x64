@echo off
cd /d "%~dp0"
echo Generating csgo_partner.sln with /no_steam ...
devtools\bin\vpc.exe /csgo +csgo_partner /2015 /no_steam /nop4add /mksln csgo_partner_nosteam.sln
if errorlevel 1 (
  echo VPC failed.
  pause
  exit /b 1
)
echo.
echo Done: csgo_partner_nosteam.sln
echo Build with VS2015 / MSBuild 14.0 Win32 Release|Debug as needed.
pause
