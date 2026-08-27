// Open loader for offline_inventory_x64.dll (opaque O1).
#include "offline_opaque.h"
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <string.h>

static HMODULE g_hInv = NULL;
static int g_tried = 0;
static OfflineCallFn g_call = NULL;

static HMODULE LoadInv()
{
	if ( g_tried )
		return g_hInv;
	g_tried = 1;

	char path[MAX_PATH];
	const char name[] = { 'o','f','f','l','i','n','e','_','i','n','v','e','n','t','o','r','y','_','x','6','4','.','d','l','l',0 };

	path[0] = 0;
	HMODULE self = NULL;
	GetModuleHandleExA( GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
		(LPCSTR)&LoadInv, &self );
	if ( self && GetModuleFileNameA( self, path, MAX_PATH ) )
	{
		char *slash = strrchr( path, '\\' );
		if ( slash )
		{
			slash[1] = 0;
			lstrcatA( path, name );
			g_hInv = LoadLibraryA( path );
		}
	}
	if ( !g_hInv )
		g_hInv = LoadLibraryA( name );
	if ( g_hInv )
		g_call = (OfflineCallFn)GetProcAddress( g_hInv, "O1" );
	return g_hInv;
}

int OfflineInv_Call( uint32_t op, const void *in_buf, uint32_t in_size,
	void *out_buf, uint32_t out_size, uint32_t *out_written )
{
	if ( !LoadInv() || !g_call )
	{
		if ( out_written ) *out_written = 0;
		return OFFLINE_NO_MODULE;
	}
	return g_call( op, in_buf, in_size, out_buf, out_size, out_written );
}

int OfflineInv_Available( void )
{
	return LoadInv() && g_call ? 1 : 0;
}

int OfflineSteam_Call( uint32_t op, const void *in_buf, uint32_t in_size,
	void *out_buf, uint32_t out_size, uint32_t *out_written )
{
	typedef int (__cdecl *Fn)( uint32_t, const void *, uint32_t, void *, uint32_t, uint32_t * );
	HMODULE h = GetModuleHandleA( "offline_steam_x64.dll" );
	if ( !h )
		h = LoadLibraryA( "offline_steam_x64.dll" );
	if ( !h )
	{
		if ( out_written ) *out_written = 0;
		return OFFLINE_NO_MODULE;
	}
	Fn f = (Fn)GetProcAddress( h, "O1" );
	if ( !f )
	{
		if ( out_written ) *out_written = 0;
		return OFFLINE_NO_MODULE;
	}
	return f( op, in_buf, in_size, out_buf, out_size, out_written );
}

int OfflineSteam_Available( void )
{
	return GetModuleHandleA( "offline_steam_x64.dll" ) || LoadLibraryA( "offline_steam_x64.dll" ) ? 1 : 0;
}
