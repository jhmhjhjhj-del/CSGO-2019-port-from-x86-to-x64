// Open thin loader — Goldy closed inventory ops only (no Valve semantics documented).
#pragma once
#include <stdint.h>
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <string.h>

// Source uses these names as methods — undo Win32 A/W macro remaps.
#ifdef GetClassName
#undef GetClassName
#endif
#ifdef SendMessage
#undef SendMessage
#endif
#ifdef CreateEvent
#undef CreateEvent
#endif
#ifdef GetObject
#undef GetObject
#endif
#ifdef GetCurrentTime
#undef GetCurrentTime
#endif
#ifdef Yield
#undef Yield
#endif
#ifdef GetMessage
#undef GetMessage
#endif
#ifdef PostMessage
#undef PostMessage
#endif
#ifdef MessageBox
#undef MessageBox
#endif
#ifdef SetPort
#undef SetPort
#endif
#ifdef GetUserName
#undef GetUserName
#endif
#ifdef PlaySound
#undef PlaySound
#endif
#ifdef DrawText
#undef DrawText
#endif
#ifdef GetCharWidth
#undef GetCharWidth
#endif
#ifdef ReportEvent
#undef ReportEvent
#endif

enum { OFFLINE_OK = 0, OFFLINE_ERR = 1, OFFLINE_NO_MODULE = 2, OFFLINE_BAD_ARGS = 3, OFFLINE_UNSUPPORTED = 4 };

enum {
	OFFLINE_INV_OP_PING = 0,
	OFFLINE_INV_OP_QUEUE_BRIDGE = 1,
	OFFLINE_INV_OP_STUB_EQUIP = 2,
	OFFLINE_INV_OP_STUB_PAINT_DEFS = 3,
	OFFLINE_INV_OP_LOADOUT_SLOT = 4,
	OFFLINE_INV_OP_STUB_KNIFE = 5,
	OFFLINE_INV_OP_CMD = 10,
	OFFLINE_INV_OP_GRANT_BATCH = 11,
	OFFLINE_INV_OP_WALLET_GET = 20,
	OFFLINE_INV_OP_WALLET_ADD = 21,
	OFFLINE_INV_OP_WALLET_SET = 22
};

enum {
	OFFLINE_INV_CMD_RAW = 0,
	OFFLINE_INV_CMD_GRANT = 1,
	OFFLINE_INV_CMD_DEL = 2,
	OFFLINE_INV_CMD_ACK = 3,
	OFFLINE_INV_CMD_EQ = 4,
	OFFLINE_INV_CMD_UT = 5,
	OFFLINE_INV_CMD_UT_CLEARNAME = 6,
	OFFLINE_INV_CMD_UT_SPRAY = 7,
	OFFLINE_INV_CMD_UT_NAME = 8,
	OFFLINE_INV_CMD_UT_STICKER = 9,
	OFFLINE_INV_CMD_UT_STSWAP = 10,
	OFFLINE_INV_CMD_UT_STWEAR = 11,
	OFFLINE_INV_CMD_UT_DECODE = 12,
	OFFLINE_INV_CMD_UT_TRADEUP = 13,
	OFFLINE_INV_CMD_UT_SPRAYCH = 14,
	OFFLINE_INV_CMD_PROFILE_SAVE = 15,
	OFFLINE_INV_CMD_PROFILE_PICK = 16,
	OFFLINE_INV_CMD_AUTOMM_ACCEPT = 17
};

#pragma pack(push, 1)
struct OfflineInvStubEquipIn { uint32_t account_id; int32_t team; int32_t loadout_slot; char game_dir[260]; };
struct OfflineInvStubEquipOut { uint32_t found; uint32_t def; int32_t paint; float wear; int32_t stattrak; int32_t quality; char name[128]; };
struct OfflineInvStubDefsIn {
	uint32_t account_id; int32_t team; uint32_t prefer_equipped; uint32_t n_defs; uint32_t defs[64]; char game_dir[260];
};
struct OfflineInvStubDefsOut { uint32_t found; uint32_t def; int32_t paint; float wear; int32_t stattrak; int32_t quality; char name[128]; };
struct OfflineInvLoadoutIn { uint32_t account_id; int32_t team; int32_t loadout_slot; char game_dir[260]; };
struct OfflineInvLoadoutOut { uint32_t found; uint32_t def; };
struct OfflineInvCmdIn {
	uint32_t type; uint64_t a, b, c, d; int32_t i0, i1; float f0;
	char s0[512]; char s1[192]; char s2[192];
};
struct OfflineInvCmdOut { uint32_t flags; char mirror[256]; };
struct OfflineInvGrantBatchIn { uint32_t count; uint32_t first_seq; uint64_t faux[32]; };
struct OfflineInvGrantBatchOut { uint32_t flags; char mirror[256]; };
struct OfflineInvWalletIn { int32_t delta_or_value; char game_dir[260]; };
struct OfflineInvWalletOut { int32_t cents; };
#pragma pack(pop)

typedef int (__cdecl *OfflineInvO1Fn)( uint32_t, const void *, uint32_t, void *, uint32_t, uint32_t * );

static inline HMODULE OfflineInv_LoadDll()
{
	static HMODULE s_h; static int s_tried;
	if ( s_tried ) return s_h;
	s_tried = 1;
	char path[MAX_PATH];
	HMODULE self = NULL;
	GetModuleHandleExA( GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
		(LPCSTR)&OfflineInv_LoadDll, &self );
	if ( self && GetModuleFileNameA( self, path, MAX_PATH ) )
	{
		char *slash = strrchr( path, '\\' );
		if ( slash ) { slash[1] = 0; lstrcatA( path, "offline_inventory_x64.dll" ); s_h = LoadLibraryA( path ); }
	}
	if ( !s_h ) s_h = LoadLibraryA( "offline_inventory_x64.dll" );
	return s_h;
}

static inline int OfflineInv_Call( uint32_t op, const void *in_buf, uint32_t in_size,
	void *out_buf, uint32_t out_size, uint32_t *out_written )
{
	HMODULE h = OfflineInv_LoadDll();
	if ( !h ) { if ( out_written ) *out_written = 0; return OFFLINE_NO_MODULE; }
	OfflineInvO1Fn f = (OfflineInvO1Fn)GetProcAddress( h, "O1" );
	if ( !f ) { if ( out_written ) *out_written = 0; return OFFLINE_NO_MODULE; }
	return f( op, in_buf, in_size, out_buf, out_size, out_written );
}

static inline int OfflineInv_Cmd( uint32_t type, OfflineInvCmdIn *in, OfflineInvCmdOut *out )
{
	in->type = type;
	OfflineInvCmdOut local = {};
	if ( !out ) out = &local;
	uint32_t w = 0;
	return OfflineInv_Call( OFFLINE_INV_OP_CMD, in, sizeof( *in ), out, sizeof( *out ), &w );
}
