//========= Copyright Valve Corporation, All rights reserved. ============//
//
// Purpose: Base class for objects that are kept in synch between client and server
//          CS:GO March 2019 API (sm_vecFactories / const char* node names).
//
//=============================================================================
#include "stdafx.h"

// memdbgon must be the last include file in a .cpp file!!!
#include "tier0/memdbgon.h"

namespace GCSDK
{

CSharedObject::TVecFactories CSharedObject::sm_vecFactories;

const CSharedObject::SharedObjectInfo_t *CSharedObject::FindSharedObjectInfo( int nTypeID )
{
	int nIndex = sm_vecFactories.Find( nTypeID );
	if ( !sm_vecFactories.IsValidIndex( nIndex ) )
		return NULL;
	return &sm_vecFactories[nIndex];
}

void CSharedObject::RegisterFactory( int nTypeID, SOCreationFunc_t fnFactory, uint32 unFlags, const char *pchClassName, const char *pszBuildCacheName, const char *pszCreateName, const char *pszUpdateName )
{
	SharedObjectInfo_t info;
	info.m_nID = nTypeID;
	info.m_unFlags = unFlags;
	info.m_pFactoryFunction = fnFactory;
	info.m_pchClassName = pchClassName;
	info.m_pchBuildCacheSubNodeName = pszBuildCacheName;
	info.m_pchCreateNodeName = pszCreateName;
	info.m_pchUpdateNodeName = pszUpdateName;

	int nExisting = sm_vecFactories.Find( nTypeID );
	if ( sm_vecFactories.IsValidIndex( nExisting ) )
		sm_vecFactories[nExisting] = info;
	else
		sm_vecFactories.Insert( info );
}

CSharedObject *CSharedObject::Create( int nTypeID )
{
	const SharedObjectInfo_t *pInfo = FindSharedObjectInfo( nTypeID );
	AssertMsg1( pInfo != NULL, "Probably failed to set object type (%d) on the server/client.\n", nTypeID );
	if ( !pInfo )
		return NULL;
	return pInfo->m_pFactoryFunction();
}

uint32 CSharedObject::GetTypeFlags( int nTypeID )
{
	const SharedObjectInfo_t *pInfo = FindSharedObjectInfo( nTypeID );
	return pInfo ? pInfo->m_unFlags : 0;
}

const char *CSharedObject::PchClassName( int nTypeID )
{
	const SharedObjectInfo_t *pInfo = FindSharedObjectInfo( nTypeID );
	return pInfo ? pInfo->m_pchClassName : NULL;
}

const char *CSharedObject::PchClassBuildCacheNodeName( int nTypeID )
{
	const SharedObjectInfo_t *pInfo = FindSharedObjectInfo( nTypeID );
	return pInfo ? pInfo->m_pchBuildCacheSubNodeName : NULL;
}

const char *CSharedObject::PchClassCreateNodeName( int nTypeID )
{
	const SharedObjectInfo_t *pInfo = FindSharedObjectInfo( nTypeID );
	return pInfo ? pInfo->m_pchCreateNodeName : NULL;
}

const char *CSharedObject::PchClassUpdateNodeName( int nTypeID )
{
	const SharedObjectInfo_t *pInfo = FindSharedObjectInfo( nTypeID );
	return pInfo ? pInfo->m_pchUpdateNodeName : NULL;
}

bool CSharedObject::BIsKeyEqual( const CSharedObject & soRHS ) const
{
	if ( GetTypeID() != soRHS.GetTypeID() )
		return false;
	return !BIsKeyLess( soRHS ) && !soRHS.BIsKeyLess( *this );
}

#ifdef DBGFLAG_VALIDATE
void CSharedObject::Validate( CValidator &validator, const char *pchName )
{
	VALIDATE_SCOPE();
}

void CSharedObject::ValidateStatics( CValidator & validator )
{
	CValidateAutoPushPop validatorAutoPushPop( validator, NULL, "CSharedObject::ValidateStatics", "CSharedObject::ValidateStatics" );
	ValidateObj( sm_vecFactories );
}
#endif

} // namespace GCSDK
