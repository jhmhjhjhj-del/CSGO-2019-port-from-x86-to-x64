# Public Steam API forwarder (open)

- `steam_api_forwarder.cpp` → builds `steam_api64.dll` (loads closed `offline_steam_x64.dll`)
- `build_offline_x64.bat` → builds closed modules (if `../offline_closed` present) + forwarder

Closed GC / inventory / AutoMM sources live in `../offline_closed/` and are **not** published.

Open: accept UI (Panorama), fake bots pipeline elsewhere, this forwarder.
