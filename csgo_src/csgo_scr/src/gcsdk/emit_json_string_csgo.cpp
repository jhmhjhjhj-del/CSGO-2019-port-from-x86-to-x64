// Offline x64: EmitJSONString extracted from webapi_response.cpp (GC-only build).
#include "stdafx.h"

void EmitJSONString( CUtlBuffer &outputBuffer, const char *pchValue )
{
	outputBuffer.PutChar( '"' );

	if ( pchValue )
	{
		int i = 0;
		while( pchValue[i] )
		{
			switch ( pchValue[i] )
			{
			case '"':
				outputBuffer.Put( "\\\"", 2 );
				break;
			case '\\':
				outputBuffer.Put( "\\\\", 2 );
				break;
			case '\n':
				outputBuffer.Put( "\\n", 2 );
				break;
			case '\r':
				outputBuffer.Put( "\\r", 2 );
				break;
			case '\t':
				outputBuffer.Put( "\\t", 2 );
				break;
			default:
				if ( (uint8) pchValue[i] < 32 )
				{
					outputBuffer.Put( "\\u00", 4 );
					outputBuffer.PutChar( ( pchValue[i] & 16 ) ? '1' : '0' );
					outputBuffer.PutChar( "0123456789abcdef"[ pchValue[i] & 0xF ] );
				}
				else
				{
					outputBuffer.PutChar( pchValue[i] );
				}
			}
			++i;
		}
	}

	outputBuffer.PutChar( '"' );
}
