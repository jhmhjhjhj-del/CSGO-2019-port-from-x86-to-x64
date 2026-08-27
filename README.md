# CS:GO Offline x64 (sources)

Offline / NO_STEAM fork work by **Goldy** — engine, Panorama, client/server gameplay, public Steam API forwarder, bots / bot-skins pipeline, accept UI, etc.

This repository is meant for collaboration on the **open** parts (FPS, UI, Premier experiments, bots, …).

## Closed modules (not source)

Working inventory, local GC, Steam fake-login, and AutoMM server launch ship as binaries only:

| File | Role |
|------|------|
| `offline_steam_x64.dll` | Local GC + Steam interfaces + AutoMM pipeline |
| `offline_inventory_x64.dll` | Inventory / store / loadout / vanity bridge (opaque API) |
| `steam_api64.dll` | **Open** thin forwarder → loads `offline_steam_x64.dll` |

Without the closed DLLs the tree still builds: Steam forwarder returns empty/fail (`OFFLINE_NO_CLOSED_LIBS` behavior). Inventory / vanity / GC / AutoMM will not work.

Do **not** reverse the closed DLLs. See `LICENSE` (MIT + Additional Terms).

## Layout (public)

- `csgo_src/` — game/engine/panorama sources (open)
- `panorama_code/` — Panorama UI sources (open)
- `steam_api_stub/` — public forwarder + build scripts (open)
- `offline_bridge/` — opaque call headers / loaders (open)
- `prebuilt/` or `gameOffline64/bin/` — place closed DLLs next to `steam_api64.dll`
- `tools/export_github_tree.ps1` — builds a clean folder for GitHub (excludes private sources)

## Build (x64 offline)

1. Put closed DLLs into `gameOffline64/bin` and `gameOffline64/bin/x64` (from release or your private build).
2. Build forwarder: `steam_api_stub/build_offline_x64.bat` (also rebuilds closed modules if you have `offline_closed/` locally — **that folder is not published**).
3. Build client/server/engine with existing `CSGO/tools/build_*64.bat` scripts.

## License

MIT for published sources, with **Additional Terms**: keep author **Goldy**, no stripping credit, no reverse-engineering of closed DLLs. See `LICENSE`.
