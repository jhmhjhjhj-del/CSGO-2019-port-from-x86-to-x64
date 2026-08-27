// CS:GO-compatible CGCClientSharedObjectCache (March 2019 API).
// Adapted from Valve/Kisak logic to match public/gcsdk/gcclient_sharedobjectcache.h
// (owner CGCClient& signatures; no CGCClientSharedObjectContext).

#include "stdafx.h"
#include "gcsdk/gcclient_sharedobjectcache.h"
#include "gcsdk/gcclient.h"
#include "gcsdk_gcmessages.pb.h"

namespace GCSDK
{

#define SOCDebug(...) ((void)0)

CGCClientSharedObjectTypeCache::CGCClientSharedObjectTypeCache( int nTypeID )
	: CSharedObjectTypeCache( nTypeID )
{
}

CGCClientSharedObjectTypeCache::~CGCClientSharedObjectTypeCache()
{
}

bool CGCClientSharedObjectTypeCache::BParseCacheSubscribedMsg( const CMsgSOCacheSubscribed_SubscribedType & msg,
	CUtlVector<CSharedObject*> &vecCreatedObjects,
	CUtlVector<CSharedObject*> &vecUpdatedObjects,
	CUtlVector<CSharedObject*> &vecObjectsToDestroy )
{
	CSharedObjectVec vecUntouchedObjects;
	for ( uint32 i = 0; i < GetCount(); i++ )
		vecUntouchedObjects.AddToTail( GetObject( i ) );

	for ( int usObject = 0; usObject < msg.object_data_size(); usObject++ )
	{
		bool bUpdatedExisting = false;
		CSharedObject *pObject = BCreateFromMsg( msg.object_data( usObject ).data(), msg.object_data( usObject ).size(), &bUpdatedExisting );
		if ( !pObject )
			return false;

		if ( bUpdatedExisting )
		{
			int index = vecUntouchedObjects.Find( pObject );
			if ( index != vecUntouchedObjects.InvalidIndex() )
				vecUntouchedObjects[index] = NULL;
			vecUpdatedObjects.AddToTail( pObject );
		}
		else
		{
			vecCreatedObjects.AddToTail( pObject );
		}
	}

	for ( int i = 0; i < vecUntouchedObjects.Count(); i++ )
	{
		if ( !vecUntouchedObjects[i] )
			continue;
		CSharedObject *pObject = RemoveObject( *vecUntouchedObjects[i] );
		if ( pObject )
			vecObjectsToDestroy.AddToTail( pObject );
	}
	return true;
}

void CGCClientSharedObjectTypeCache::RemoveAllObjects( CUtlVector<CSharedObject*> &vecObjects )
{
	for ( int i = (int)GetCount() - 1; i >= 0; i-- )
	{
		CSharedObject *pObject = RemoveObjectByIndex( i );
		if ( pObject )
			vecObjects.AddToTail( pObject );
	}
}

CSharedObject *CGCClientSharedObjectTypeCache::BCreateFromMsg( const void *pvData, uint32 unSize, bool *bUpdatedExisting )
{
	CUtlBuffer bufCreate( pvData, unSize, CUtlBuffer::READ_ONLY );
	CSharedObject *pNewObj = CSharedObject::Create( GetTypeID() );
	if ( !pNewObj )
		return NULL;

	if ( !pNewObj->BParseFromMessage( bufCreate ) )
	{
		delete pNewObj;
		return NULL;
	}

	CSharedObject *pObj = FindSharedObject( *pNewObj );
	if ( pObj )
	{
		pObj->Copy( *pNewObj );
		delete pNewObj;
		if ( bUpdatedExisting )
			*bUpdatedExisting = true;
		return pObj;
	}

	AddObject( pNewObj );
	if ( bUpdatedExisting )
		*bUpdatedExisting = false;
	return pNewObj;
}

bool CGCClientSharedObjectTypeCache::BDestroyFromMsg( SOID_t /*owner*/, CGCClient & /*client*/, const void *pvData, uint32 unSize )
{
	CUtlBuffer bufDestroy( pvData, unSize, CUtlBuffer::READ_ONLY );
	CSharedObject *pIndexObj = CSharedObject::Create( GetTypeID() );
	if ( !pIndexObj )
		return false;
	if ( !pIndexObj->BParseFromMessage( bufDestroy ) )
	{
		delete pIndexObj;
		return false;
	}

	CSharedObject *pObject = RemoveObject( *pIndexObj );
	delete pIndexObj;
	if ( pObject )
		delete pObject;
	return true;
}

bool CGCClientSharedObjectTypeCache::BCreateOrUpdateFromMsg( SOID_t /*owner*/, CGCClient & /*client*/, const void *pvData, uint32 unSize )
{
	bool bUpdated = false;
	return BCreateFromMsg( pvData, unSize, &bUpdated ) != NULL;
}

CGCClientSharedObjectCache::CGCClientSharedObjectCache( SOID_t ID )
	: m_IDOwner( ID )
	, m_bInitialized( false )
	, m_bSubscribed( false )
{
}

CGCClientSharedObjectCache::~CGCClientSharedObjectCache()
{
}

bool CGCClientSharedObjectCache::BParseCacheSubscribedMsg( CGCClient & /*owner*/, const CMsgSOCacheSubscribed & msg )
{
	CUtlVector<CSharedObject*> vecCreatedObjects;
	CUtlVector<CSharedObject*> vecUpdatedObjects;
	CUtlVector<CSharedObject*> vecObjectsToDestroy;

	for ( int i = 0; i < msg.objects_size(); i++ )
	{
		const CMsgSOCacheSubscribed_SubscribedType & msgType = msg.objects( i );
		CGCClientSharedObjectTypeCache *pTypeCache = CreateTypeCache( msgType.type_id() );
		if ( !pTypeCache || !pTypeCache->BParseCacheSubscribedMsg( msgType, vecCreatedObjects, vecUpdatedObjects, vecObjectsToDestroy ) )
			return false;
	}

	if ( msg.has_version() )
		SetVersion( msg.version() );

	m_bInitialized = true;
	m_bSubscribed = true;

	FOR_EACH_VEC( vecObjectsToDestroy, i )
		delete vecObjectsToDestroy[i];

	return true;
}

void CGCClientSharedObjectCache::BuildCacheSubscribedMsg( CMsgSOCacheSubscribed & /*msg*/ ) const
{
	// Server→client subscribe builder not required for offline client/gameserver receive path.
}

bool CGCClientSharedObjectCache::BCreateFromMsg( CGCClient & owner, int nTypeID, const void *pvData, uint32 unSize )
{
	CGCClientSharedObjectTypeCache *pTypeCache = CreateTypeCache( nTypeID );
	if ( !pTypeCache )
		return false;
	return pTypeCache->BCreateOrUpdateFromMsg( GetOwner(), owner, pvData, unSize );
}

bool CGCClientSharedObjectCache::BDestroyFromMsg( CGCClient & owner, int nTypeID, const void *pvData, uint32 unSize )
{
	CGCClientSharedObjectTypeCache *pTypeCache = FindTypeCache( nTypeID );
	if ( !pTypeCache )
		return false;
	return pTypeCache->BDestroyFromMsg( GetOwner(), owner, pvData, unSize );
}

bool CGCClientSharedObjectCache::BUpdateFromMsg( CGCClient & /*owner*/, int nTypeID, const void *pvData, uint32 unSize )
{
	CGCClientSharedObjectTypeCache *pTypeCache = FindTypeCache( nTypeID );
	if ( !pTypeCache )
		return false;

	CUtlBuffer bufUpdate( pvData, unSize, CUtlBuffer::READ_ONLY );
	CSharedObject *pIndexObj = CSharedObject::Create( nTypeID );
	if ( !pIndexObj )
		return false;
	if ( !pIndexObj->BParseFromMessage( bufUpdate ) )
	{
		delete pIndexObj;
		return false;
	}

	CSharedObject *pObj = pTypeCache->FindSharedObject( *pIndexObj );
	bool bRet = false;
	if ( pObj )
	{
		bufUpdate.SeekGet( CUtlBuffer::SEEK_HEAD, 0 );
		bRet = pObj->BUpdateFromNetwork( *pIndexObj );
	}
	delete pIndexObj;
	return bRet;
}

void CGCClientSharedObjectCache::NotifyCreated( ISharedObjectListener & /*context*/ )
{
}

#ifdef DBGFLAG_VALIDATE
void CGCClientSharedObjectCache::Validate( CValidator &validator, const char *pchName )
{
	CSharedObjectCache::Validate( validator, pchName );
}
#endif

} // namespace GCSDK
