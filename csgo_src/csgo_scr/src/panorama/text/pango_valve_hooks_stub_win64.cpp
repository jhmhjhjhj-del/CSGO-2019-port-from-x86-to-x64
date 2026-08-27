// Valve-patched pango/fontconfig hooks absent from vcpkg builds; no-op stubs for x64 offline.
#include <ft2build.h>
#include FT_FREETYPE_H

typedef FT_Error ( *PangoFT2NewFaceOverrideFunc )( FT_Library, const char *, FT_Long, FT_Face * );
typedef FT_Error ( *FontConfigFT2NewFaceOverrideFunc )( FT_Library, const char *, FT_Long, FT_Face * );

extern "C" void pango_ft2_new_face_substitute( PangoFT2NewFaceOverrideFunc func )
{
	(void)func;
}

extern "C" void fontconfig_ft2_new_face_substitute( FontConfigFT2NewFaceOverrideFunc func )
{
	(void)func;
}
