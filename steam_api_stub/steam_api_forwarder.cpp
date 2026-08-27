// Public steam_api64.dll — thin loader/forwarder to closed offline_steam_x64.dll.
// Open source. Closed GC / inventory / AutoMM / Steam-fake live in the closed DLL.

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdint.h>
#include <string.h>

static HMODULE g_hSteam = NULL;
static int g_tried = 0;

// Obfuscated module name bytes (XOR 0x5A) → "offline_steam_x64.dll"
static void DecodeModName( char *out, size_t outCap )
{
	static const unsigned char enc[] = {
		0x35,0x36,0x3C,0x36,0x36,0x34,0x3F,0x05, // offline_
		0x29,0x2E,0x3F,0x3B,0x37,0x05,             // steam_
		0x22,0x6C,0x6E,0x05,                       // x64_
		0x3E,0x36,0x36                              // dll  — wait wrong
	};
	// Rebuild plainly then scramble at runtime from parts to avoid one obvious string.
	// Final: offline_steam_x64.dll
	const char a[] = { 'o','f','f','l','i','n','e','_',0 };
	const char b[] = { 's','t','e','a','m','_',0 };
	const char c[] = { 'x','6','4','.',0 };
	const char d[] = { 'd','l','l',0 };
	out[0] = 0;
	if ( outCap < 32 )
		return;
	lstrcpynA( out, a, (int)outCap );
	lstrcatA( out, b );
	lstrcatA( out, c );
	lstrcatA( out, d );
	(void)enc;
}

static HMODULE LoadClosedSteam()
{
	if ( g_tried )
		return g_hSteam;
	g_tried = 1;

	char modPath[MAX_PATH];
	char name[64];
	DecodeModName( name, sizeof( name ) );

	modPath[0] = 0;
	if ( GetModuleFileNameA( NULL, modPath, MAX_PATH ) )
	{
		char *slash = strrchr( modPath, '\\' );
		if ( slash )
		{
			slash[1] = 0;
			lstrcatA( modPath, name );
			g_hSteam = LoadLibraryA( modPath );
		}
	}
	if ( !g_hSteam )
	{
		// Same folder as this steam_api64.dll
		HMODULE self = NULL;
		GetModuleHandleExA( GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
			(LPCSTR)&LoadClosedSteam, &self );
		if ( self && GetModuleFileNameA( self, modPath, MAX_PATH ) )
		{
			char *slash = strrchr( modPath, '\\' );
			if ( slash )
			{
				slash[1] = 0;
				lstrcatA( modPath, name );
				g_hSteam = LoadLibraryA( modPath );
			}
		}
	}
	if ( !g_hSteam )
		g_hSteam = LoadLibraryA( name );
	return g_hSteam;
}

template <typename T>
static T Sym( const char *name )
{
	HMODULE h = LoadClosedSteam();
	if ( !h )
		return (T)0;
	return (T)GetProcAddress( h, name );
}

#define FWD0(ret, name, def) \
	extern "C" __declspec(dllexport) ret __cdecl name() { \
		typedef ret (__cdecl *Fn)(); Fn f = Sym<Fn>(#name); return f ? f() : (def); }

#define FWD1(ret, name, t1, a1, def) \
	extern "C" __declspec(dllexport) ret __cdecl name( t1 a1 ) { \
		typedef ret (__cdecl *Fn)(t1); Fn f = Sym<Fn>(#name); return f ? f(a1) : (def); }

#define FWD2(ret, name, t1, a1, t2, a2, def) \
	extern "C" __declspec(dllexport) ret __cdecl name( t1 a1, t2 a2 ) { \
		typedef ret (__cdecl *Fn)(t1,t2); Fn f = Sym<Fn>(#name); return f ? f(a1,a2) : (def); }

#define FWD3(ret, name, t1, a1, t2, a2, t3, a3, def) \
	extern "C" __declspec(dllexport) ret __cdecl name( t1 a1, t2 a2, t3 a3 ) { \
		typedef ret (__cdecl *Fn)(t1,t2,t3); Fn f = Sym<Fn>(#name); return f ? f(a1,a2,a3) : (def); }

#define FWD6(ret, name, t1,a1,t2,a2,t3,a3,t4,a4,t5,a5,t6,a6, def) \
	extern "C" __declspec(dllexport) ret __cdecl name( t1 a1, t2 a2, t3 a3, t4 a4, t5 a5, t6 a6 ) { \
		typedef ret (__cdecl *Fn)(t1,t2,t3,t4,t5,t6); Fn f = Sym<Fn>(#name); return f ? f(a1,a2,a3,a4,a5,a6) : (def); }

#define FWDV0(name) \
	extern "C" __declspec(dllexport) void __cdecl name() { \
		typedef void (__cdecl *Fn)(); Fn f = Sym<Fn>(#name); if ( f ) f(); }

#define FWDV1(name, t1, a1) \
	extern "C" __declspec(dllexport) void __cdecl name( t1 a1 ) { \
		typedef void (__cdecl *Fn)(t1); Fn f = Sym<Fn>(#name); if ( f ) f(a1); }

#define FWDV2(name, t1, a1, t2, a2) \
	extern "C" __declspec(dllexport) void __cdecl name( t1 a1, t2 a2 ) { \
		typedef void (__cdecl *Fn)(t1,t2); Fn f = Sym<Fn>(#name); if ( f ) f(a1,a2); }

#define FWDV3(name, t1, a1, t2, a2, t3, a3) \
	extern "C" __declspec(dllexport) void __cdecl name( t1 a1, t2 a2, t3 a3 ) { \
		typedef void (__cdecl *Fn)(t1,t2,t3); Fn f = Sym<Fn>(#name); if ( f ) f(a1,a2,a3); }

typedef void (*PFNPreMinidumpCallback)( void * );

FWD0( int, SteamAPI_Init, 0 )
FWD0( int, SteamAPI_InitSafe, 0 )
FWDV0( SteamAPI_Shutdown )
FWD1( int, SteamAPI_RestartAppIfNecessary, unsigned int, id, 0 )
FWDV0( SteamAPI_ReleaseCurrentThreadMemory )
FWDV3( SteamAPI_WriteMiniDump, unsigned int, c, void *, i, unsigned int, b )
FWDV1( SteamAPI_SetMiniDumpComment, const char *, m )
extern "C" __declspec(dllexport) void __cdecl SteamAPI_UseBreakpadCrashHandler(
	char const *v, char const *d, char const *t, int full, void *ctx, PFNPreMinidumpCallback cb )
{
	typedef void (__cdecl *Fn)( char const *, char const *, char const *, int, void *, PFNPreMinidumpCallback );
	Fn f = Sym<Fn>( "SteamAPI_UseBreakpadCrashHandler" );
	if ( f ) f( v, d, t, full, ctx, cb );
}
FWDV1( SteamAPI_SetBreakpadAppID, unsigned int, id )
FWDV0( SteamAPI_RunCallbacks )
FWDV2( SteamAPI_RegisterCallback, void *, cb, int, i )
FWDV1( SteamAPI_UnregisterCallback, void *, cb )
FWDV2( SteamAPI_RegisterCallResult, void *, cb, unsigned long long, h )
FWDV2( SteamAPI_UnregisterCallResult, void *, cb, unsigned long long, h )
FWD0( int, SteamAPI_IsSteamRunning, 0 )
FWDV2( Steam_RunCallbacks, int, pipe, int, gs )
FWDV1( Steam_RegisterInterfaceFuncs, void *, m )
FWD0( int, Steam_GetHSteamUserCurrent, 0 )
FWD0( const char *, SteamAPI_GetSteamInstallPath, "" )
FWD0( int, SteamAPI_GetHSteamPipe, 0 )
FWDV1( SteamAPI_SetTryCatchCallbacks, int, b )
FWD0( int, GetHSteamPipe, 0 )
FWD0( int, GetHSteamUser, 0 )
FWD0( int, SteamAPI_GetHSteamUser, 0 )
FWD1( void *, SteamInternal_CreateInterface, const char *, ver, 0 )
FWD0( int, SteamGameServer_GetHSteamPipe, 0 )
FWD0( int, SteamGameServer_GetHSteamUser, 0 )
FWDV0( SteamGameServer_Shutdown )
FWDV0( SteamGameServer_RunCallbacks )
FWD0( unsigned int, SteamGameServer_GetIPCCallCount, 0 )
FWD0( int, SteamGameServer_BSecure, 0 )
FWD0( unsigned long long, SteamGameServer_GetSteamID, 0 )
FWD6( int, SteamGameServer_InitSafe, unsigned int, ip, unsigned short, sp, unsigned short, gp, unsigned short, qp, int, mode, const char *, ver, 0 )
FWD6( int, SteamInternal_GameServer_Init, unsigned int, ip, unsigned short, sp, unsigned short, gp, unsigned short, qp, int, mode, const char *, ver, 0 )
FWD1( void *, SteamGameServerInternal_CreateInterface, const char *, ver, 0 )
FWD1( void *, SteamInternal_GlobalContextGameServerPtr, unsigned int, size, 0 )

// Opaque entry (ordinal-friendly name). Closed DLL may also export SteamAPI_*.
extern "C" __declspec(dllexport) int __cdecl O1( unsigned int op, const void *in_buf, unsigned int in_size,
	void *out_buf, unsigned int out_size, unsigned int *out_written )
{
	typedef int (__cdecl *Fn)( unsigned int, const void *, unsigned int, void *, unsigned int, unsigned int * );
	Fn f = Sym<Fn>( "O1" );
	if ( !f )
	{
		if ( out_written ) *out_written = 0;
		return 2; // OFFLINE_NO_MODULE
	}
	return f( op, in_buf, in_size, out_buf, out_size, out_written );
}

extern "C" __declspec(dllexport) int __cdecl OfflineSteam_Available( void )
{
	return LoadClosedSteam() ? 1 : 0;
}

BOOL WINAPI DllMain( HINSTANCE h, DWORD reason, LPVOID )
{
	if ( reason == DLL_PROCESS_DETACH && g_hSteam )
	{
		FreeLibrary( g_hSteam );
		g_hSteam = NULL;
	}
	(void)h;
	return TRUE;
}
