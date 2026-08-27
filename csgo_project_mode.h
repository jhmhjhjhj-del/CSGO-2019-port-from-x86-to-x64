#ifndef CSGO_PROJECT_MODE_H
#define CSGO_PROJECT_MODE_H

// Official offline fork flag: define NO_STEAM on all gameOffline64 binaries + steam_api stub.
// Replaces runtime -insecure and the separate CSGO_PROJECT_OFFLINE=1 stub build switch.
#ifdef NO_STEAM
#ifndef CSGO_PROJECT_OFFLINE
#define CSGO_PROJECT_OFFLINE 1
#endif
#endif

#ifndef CSGO_PROJECT_OFFLINE
#define CSGO_PROJECT_OFFLINE 0
#endif

#endif
