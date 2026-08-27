#pragma once

// Crash breadcrumbs — OFF by default (Msg spam was covering the lobby).
// Set panorama_crash_bc 1 to re-enable console+file logging.
#include <stdio.h>
#include <stdarg.h>

#ifndef PANORAMA_CRASH_BC_H_
#define PANORAMA_CRASH_BC_H_

class ConVar;
// Avoid pulling convar headers into every TU: runtime gate via weak default.
inline int &PanCrashBCEnabledRef()
{
	static int s_n = 0; // 0 = off
	return s_n;
}

inline void PanCrashBCF( const char *fmt, ... )
{
	if ( !PanCrashBCEnabledRef() )
		return;

	char buf[1024];
	va_list ap;
	va_start( ap, fmt );
	_vsnprintf_s( buf, sizeof( buf ), _TRUNCATE, fmt, ap );
	va_end( ap );

	Msg( "%s", buf );

	static FILE *s_f = NULL;
	static int s_state = 0;
	if ( s_state == 0 )
	{
		s_f = fopen( "csgo/pan_crash_bc.log", "wb" );
		if ( !s_f )
			s_f = fopen( "pan_crash_bc.log", "wb" );
		s_state = s_f ? 1 : 2;
	}
	if ( s_f )
	{
		fputs( buf, s_f );
		fflush( s_f );
	}
}

#endif
