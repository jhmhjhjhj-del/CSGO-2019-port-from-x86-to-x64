# Lean public GitHub export (no private sources, no huge third-party/tool binaries)
$ErrorActionPreference = "Stop"
$Root = "C:\Games\CSGO"
$Out  = Join-Path $Root "_github_export"

if (Test-Path $Out) { Remove-Item $Out -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Out | Out-Null

function Copy-Tree($rel, $excludeDirs, $excludeFiles) {
  $src = Join-Path $Root $rel
  if (-not (Test-Path $src)) { Write-Host "skip missing $rel"; return }
  $dst = Join-Path $Out $rel
  Write-Host "copy $rel ..."
  $xd = @($excludeDirs)
  $xf = @($excludeFiles)
  & robocopy $src $dst /E /XD $xd /XF $xf /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$srcExDirs = @(
  "Release","Release_client_panorama","Debug","x64","ipch","obj",".vs","_Backup",
  "Release_client","Hammer___Win32_Release","linux64","linux32","osx64","osx32",
  "x86_64-linux","MacOS-x86_64","iOS","Android","PS4","XboxOne"
)

$srcExFiles = @(
  "*.pdb","*.obj","*.lib","*.exp","*.ilk","*.pch","*.a","*.so","*.dylib","*.jar",
  "*.zip","*.tar","*.gz","*.7z","*.fidbf"
)

Copy-Tree "csgo_src\csgo_scr\src" $srcExDirs $srcExFiles
Copy-Tree "panorama_code\extracted" @() @("*.pdb")
# No Python tooling / RE / gen / patch scripts in public tree
Copy-Tree "steam_api_stub" @("out_offline_x64","out_forwarder_x64","out","out_x64","__pycache__") @("*.pdb","*.obj","*.lib","*.exp","*.ilk","*.py","*.pyc","*.txt","*.bak","_goldberg_ref.dll")
Copy-Tree "offline_bridge" @() @()

# Only useful build scripts from tools (NOT ghidra / dumps)
$toolsOut = Join-Path $Out "tools"
New-Item -ItemType Directory -Force -Path $toolsOut | Out-Null
Get-ChildItem (Join-Path $Root "tools") -File -Filter "build_*.bat" | Copy-Item -Destination $toolsOut -Force
Copy-Item (Join-Path $Root "tools\export_github_tree.ps1") $toolsOut -Force -ErrorAction SilentlyContinue

Copy-Item (Join-Path $Root "LICENSE") (Join-Path $Out "LICENSE") -Force
Copy-Item (Join-Path $Root "README_GITHUB.md") (Join-Path $Out "README.md") -Force
if (Test-Path (Join-Path $Root "csgo_project_mode.h")) {
  Copy-Item (Join-Path $Root "csgo_project_mode.h") (Join-Path $Out "csgo_project_mode.h") -Force
}
if (Test-Path (Join-Path $Root ".gitignore_github")) {
  Copy-Item (Join-Path $Root ".gitignore_github") (Join-Path $Out ".gitignore") -Force
}

$stub = Join-Path $Out "steam_api_stub"
$privateStub = @(
  "steam_api_stub.cpp","gc_and_callbacks.inl","gc_remote.inl","gc_social.inl",
  "inventory_catalog.inl","rarity_lookup.inl","stub_progression.inl","stub_auto_mm.inl",
  "persona_profile.inl","stub_hwid.inl","stub_gameserver_auth.inl","gns_bridge.inl",
  "networking_sockets_serialized.inl","generated_stubs.inl",
  "_goldberg_ref.dll"
)
foreach ($f in $privateStub) {
  $p = Join-Path $stub $f
  if (Test-Path $p) { Remove-Item $p -Force }
}
# Belt-and-suspenders: wipe any leftover scripts in exported stub
Get-ChildItem $stub -File -Include *.py,*.pyc -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem $stub -File -Filter "*.py" -ErrorAction SilentlyContinue | Remove-Item -Force

$pre = Join-Path $Root "offline_closed\prebuilt"
$preOut = Join-Path $Out "prebuilt"
New-Item -ItemType Directory -Force -Path $preOut | Out-Null
foreach ($dll in @("offline_steam_x64.dll","offline_inventory_x64.dll","steam_api64.dll")) {
  $candidates = @(
    (Join-Path $pre $dll),
    (Join-Path $Root "steam_api_stub\out_forwarder_x64\$dll"),
    (Join-Path $Root "gameOffline64\bin\x64\$dll")
  )
  $copied = $false
  foreach ($p in $candidates) {
    if (Test-Path $p) {
      Copy-Item $p (Join-Path $preOut $dll) -Force
      $copied = $true
      break
    }
  }
  if (-not $copied) { Write-Host "WARN: missing $dll" }
}

# Drop any remaining files over 95MB (GitHub hard limit 100MB)
Get-ChildItem $Out -Recurse -File | Where-Object { $_.Length -gt 95MB } | ForEach-Object {
  Write-Host ("DROP oversized: {0} MB {1}" -f [math]::Round($_.Length/1MB,1), $_.FullName)
  Remove-Item $_.FullName -Force
}

$mb = [math]::Round(((Get-ChildItem $Out -Recurse -File | Measure-Object Length -Sum).Sum)/1MB, 1)
$cnt = (Get-ChildItem $Out -Recurse -File | Measure-Object).Count
Write-Host "DONE: $Out  size=${mb}MB files=$cnt"
Write-Host "Push ONLY _github_export - never offline_closed"
