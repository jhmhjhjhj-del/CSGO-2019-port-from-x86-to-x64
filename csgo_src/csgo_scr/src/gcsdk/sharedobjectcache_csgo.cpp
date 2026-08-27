// CS:GO March 2019 CSharedObjectCache / TypeCache (vector-based)
#include "stdafx.h"
#include "sharedobjectcache.h"

namespace GCSDK
{

CSharedObjectTypeCache::CSharedObjectTypeCache( int nTypeID )
: m_nTypeID( nTypeID )
{
}

CSharedObjectTypeCache::~CSharedObjectTypeCache()
{
	RemoveAllObjectsWithoutDeleting();
}

bool CSharedObjectTypeCache::AddObject( CSharedObject *pObject )
{
	if ( !pObject || HasElement( pObject ) )
		return false;
	m_vecObjects.AddToTail( pObject );
	return true;
}

bool CSharedObjectTypeCache::AddObjectClean( CSharedObject *pObject )
{
	return AddObject( pObject );
}

CSharedObject *CSharedObjectTypeCache::RemoveObject( const CSharedObject & soIndex )
{
	int i = FindSharedObjectIndex( soIndex );
	if ( i < 0 )
		return NULL;
	return RemoveObjectByIndex( (uint32)i );
}

void CSharedObjectTypeCache::RemoveAllObjectsWithoutDeleting()
{
	m_vecObjects.RemoveAll();
}

void CSharedObjectTypeCache::EnsureCapacity( uint32 nItems )
{
	m_vecObjects.EnsureCapacity( (int)nItems );
}

int CSharedObjectTypeCache::FindSharedObjectIndex( const CSharedObject & soIndex ) const
{
	for ( int i = 0; i < m_vecObjects.Count(); i++ )
	{
		if ( m_vecObjects[i] && m_vecObjects[i]->BIsKeyEqual( soIndex ) )
			return i;
	}
	return -1;
}

CSharedObject *CSharedObjectTypeCache::FindSharedObject( const CSharedObject & soIndex )
{
	int i = FindSharedObjectIndex( soIndex );
	return i >= 0 ? m_vecObjects[i] : NULL;
}

const CSharedObject *CSharedObjectTypeCache::FindSharedObject( const CSharedObject & soIndex ) const
{
	int i = FindSharedObjectIndex( soIndex );
	return i >= 0 ? m_vecObjects[i] : NULL;
}

CSharedObject *CSharedObjectTypeCache::RemoveObjectByIndex( uint32 nObj )
{
	if ( nObj >= (uint32)m_vecObjects.Count() )
		return NULL;
	CSharedObject *p = m_vecObjects[nObj];
	m_vecObjects.Remove( nObj );
	return p;
}

void CSharedObjectTypeCache::Dump() const
{
	EmitInfo( SPEW_SHAREDOBJ, SPEW_ALWAYS, LOG_ALWAYS, "TypeCache type=%d count=%u\n", m_nTypeID, GetCount() );
}

CSharedObjectCache::CSharedObjectCache()
: m_ulVersion( 0 )
{
}

CSharedObjectCache::~CSharedObjectCache()
{
	for ( int i = 0; i < m_CacheObjects.Count(); i++ )
		delete m_CacheObjects[i];
	m_CacheObjects.RemoveAll();
}

bool CSharedObjectCache::AddObject( CSharedObject *pSharedObject )
{
	if ( !pSharedObject )
		return false;
	CSharedObjectTypeCache *pType = CreateBaseTypeCache( pSharedObject->GetTypeID() );
	return pType && pType->AddObject( pSharedObject );
}

bool CSharedObjectCache::AddObjectClean( CSharedObject *pSharedObject )
{
	return AddObject( pSharedObject );
}

CSharedObject *CSharedObjectCache::RemoveObject( const CSharedObject & soIndex )
{
	CSharedObjectTypeCache *pType = FindBaseTypeCache( soIndex.GetTypeID() );
	return pType ? pType->RemoveObject( soIndex ) : NULL;
}

bool CSharedObjectCache::RemoveAllObjectsWithoutDeleting()
{
	for ( int i = 0; i < m_CacheObjects.Count(); i++ )
		m_CacheObjects[i]->RemoveAllObjectsWithoutDeleting();
	return true;
}

const CSharedObjectTypeCache *CSharedObjectCache::FindBaseTypeCache( int nClassID ) const
{
	for ( int i = 0; i < m_CacheObjects.Count(); i++ )
	{
		if ( m_CacheObjects[i]->GetTypeID() == nClassID )
			return m_CacheObjects[i];
	}
	return NULL;
}

CSharedObjectTypeCache *CSharedObjectCache::FindBaseTypeCache( int nClassID )
{
	return const_cast<CSharedObjectTypeCache *>( static_cast<const CSharedObjectCache *>( this )->FindBaseTypeCache( nClassID ) );
}

CSharedObjectTypeCache *CSharedObjectCache::CreateBaseTypeCache( int nClassID )
{
	CSharedObjectTypeCache *p = FindBaseTypeCache( nClassID );
	if ( p )
		return p;
	p = AllocateTypeCache( nClassID );
	if ( p )
		m_CacheObjects.AddToTail( p );
	return p;
}

CSharedObject *CSharedObjectCache::FindSharedObject( const CSharedObject & soIndex )
{
	CSharedObjectTypeCache *pType = FindBaseTypeCache( soIndex.GetTypeID() );
	return pType ? pType->FindSharedObject( soIndex ) : NULL;
}

const CSharedObject *CSharedObjectCache::FindSharedObject( const CSharedObject & soIndex ) const
{
	const CSharedObjectTypeCache *pType = FindBaseTypeCache( soIndex.GetTypeID() );
	return pType ? pType->FindSharedObject( soIndex ) : NULL;
}

void CSharedObjectCache::Dump() const
{
	EmitInfo( SPEW_SHAREDOBJ, SPEW_ALWAYS, LOG_ALWAYS, "SOCache version=%llu types=%d\n", m_ulVersion, m_CacheObjects.Count() );
	for ( int i = 0; i < m_CacheObjects.Count(); i++ )
		m_CacheObjects[i]->Dump();
}

} // namespace GCSDK
