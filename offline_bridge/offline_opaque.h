// Thin contract for closed offline modules (inventory / steam).
// No semantic names for ops — numbers only. Do not document op meaning in public docs.
#pragma once

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#if defined(OFFLINE_BRIDGE_EXPORTS)
#define OFFLINE_BRIDGE_API __declspec(dllexport)
#else
#define OFFLINE_BRIDGE_API __declspec(dllimport)
#endif

// Return codes
enum {
	OFFLINE_OK = 0,
	OFFLINE_ERR = 1,
	OFFLINE_NO_MODULE = 2,
	OFFLINE_BAD_ARGS = 3,
	OFFLINE_UNSUPPORTED = 4
};

// Single entry — implementations live in closed DLLs (ordinal 1 preferred).
typedef int (__cdecl *OfflineCallFn)( uint32_t op, const void *in_buf, uint32_t in_size,
	void *out_buf, uint32_t out_size, uint32_t *out_written );

// Public open helpers (implemented in offline_bridge / forwarder sources).
int OfflineSteam_Call( uint32_t op, const void *in_buf, uint32_t in_size,
	void *out_buf, uint32_t out_size, uint32_t *out_written );
int OfflineInv_Call( uint32_t op, const void *in_buf, uint32_t in_size,
	void *out_buf, uint32_t out_size, uint32_t *out_written );

// 1 if closed DLL loaded, 0 if stub path.
int OfflineSteam_Available( void );
int OfflineInv_Available( void );

#ifdef __cplusplus
}
#endif
