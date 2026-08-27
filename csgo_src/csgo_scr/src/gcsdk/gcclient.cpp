//========= Copyright Valve Corporation, All rights reserved. ============//
//
// Purpose: CGCClient — CS:GO March 2019 API, offline-friendly implementation.
//
//=============================================================================

#include "stdafx.h"
#include "gcclient.h"
#include "steam/isteamgamecoordinator.h"
#include "gcsdk_gcmessages.pb.h"
#include "gcsystemmsgs.pb.h"
#include "netpacketpool.h"
#include "msgbase.h"
#include "gcmsg.h"
#include "jobmgr.h"
#include <time.h>

namespace GCSDK
{

#define SOCDebug(...) ((void)0)

CGCClient::CGCClient( bool bGameserver )
: m_pSteamUser( NULL )
, m_pSteamGameserver( NULL )
, m_pSteamGameCoordinator( NULL )
, m_memMsg( 0, 1024 )
#ifndef STEAM
, m_callbackGCMessageAvailable( this, &CGCClient::OnGCMessageAvailable )
, m_CallbackSteamServersDisconnected( this, &CGCClient::OnSteamServersDisconnected )
, m_CallbackSteamServerConnectFailure( this, &CGCClient::OnSteamServerConnectFailure )
, m_CallbackSteamServersConnected( this, &CGCClient::OnSteamServersConnected )
#endif
, m_mapSOCache( DefLessFunc( SOID_t ) )
, m_timeLastSendHello( 0 )
, m_timeReceivedConnectionStatus( 0 )
, m_timeLoggedOn( 0 )
, m_unVersion( 0 )
, m_bGameserver( bGameserver )
, m_bSimulateGCConnectionFailure( false )
, m_nSessionNeed( 0 )
, m_nLastSessionNeed( 0 )
, m_bWantSession( false )
, m_nLauncherType( 0 )
, m_nLogonQueuePosition( -1 )
, m_nLogonQueueSize( -1 )
, m_timeLogonQueueApproxTimeEnteredQueue( 0 )
, m_timeLogonQueueEstimatedTimeExitQueue( 0 )
{
#ifndef STEAM
	if ( bGameserver )
		m_callbackGCMessageAvailable.SetGameserverFlag();
#endif
}

CGCClient::~CGCClient()
{
	Uninit();
	FOR_EACH_MAP_FAST( m_mapSOCache, i )
	{
		delete m_mapSOCache[i];
	}
	m_mapSOCache.RemoveAll();
}

bool CGCClient::BInit( uint32 unVersion, ISteamClient *pSteamClient, HSteamUser hSteamUser, HSteamPipe hSteamPipe )
{
	if ( !pSteamClient )
		return false;

	m_unVersion = unVersion;

	if ( m_bGameserver )
	{
		m_pSteamGameserver = (ISteamGameServer *)pSteamClient->GetISteamGenericInterface( hSteamUser, hSteamPipe, "SteamGameServer012" );
		m_pSteamUser = NULL;
	}
	else
	{
		m_pSteamUser = pSteamClient->GetISteamUser( hSteamUser, hSteamPipe, STEAMUSER_INTERFACE_VERSION );
		m_pSteamGameserver = NULL;
	}

	m_pSteamGameCoordinator = (ISteamGameCoordinator *)pSteamClient->GetISteamGenericInterface(
		hSteamUser, hSteamPipe, STEAMGAMECOORDINATOR_INTERFACE_VERSION );

	if ( !m_pSteamGameCoordinator )
	{
		// Offline / stub steam_api may still proceed without a live GC interface.
		Warning( "CGCClient::BInit — ISteamGameCoordinator unavailable (offline OK)\n" );
	}

#ifndef STEAM
	m_callbackGCMessageAvailable.Register( this, &CGCClient::OnGCMessageAvailable );
#endif

	ClearLogonQueueStats();
	return true;
}

void CGCClient::Uninit()
{
	m_pSteamGameCoordinator = NULL;
	m_pSteamUser = NULL;
	m_pSteamGameserver = NULL;
}

bool CGCClient::BMainLoop( uint64 ulLimitMicroseconds, uint64 ulFrameTimeMicroseconds )
{
	CLimitTimer limitTimer;
	limitTimer.SetLimit( ulLimitMicroseconds );
	CJobTime::UpdateJobTime( ulFrameTimeMicroseconds ? ulFrameTimeMicroseconds : k_cMicroSecPerShellFrame );

	bool bWorkRemaining = m_JobMgr.BFrameFuncRunSleepingJobs( limitTimer );
	bWorkRemaining |= m_JobMgr.BFrameFuncRunYieldingJobs( limitTimer );
	ThinkConnection();
	return bWorkRemaining;
}

void CGCClient::SetSessionNeed( uint32 nSessionNeed, bool bWantSession )
{
	m_nSessionNeed = nSessionNeed;
	m_bWantSession = bWantSession;
	UpdateLogonState();
}

bool CGCClient::BSendMessage( uint32 unMsgType, const uint8 *pubData, uint32 cubData )
{
	if ( !m_pSteamGameCoordinator )
		return false;
	return m_pSteamGameCoordinator->SendMessage( unMsgType, pubData, cubData ) == k_EGCResultOK;
}

bool CGCClient::BSendMessage( const CGCMsgBase & msg )
{
	return BSendMessage( msg.Hdr().m_eMsg, msg.PubPkt() + sizeof( GCMsgHdr_t ), msg.CubPkt() - sizeof( GCMsgHdr_t ) );
}

class CProtoBufGCClientSendHandler : public CProtoBufMsgBase::IProtoBufSendHandler
{
public:
	explicit CProtoBufGCClientSendHandler( CGCClient *pGCClient ) : m_pClient( pGCClient ) {}
	virtual bool BAsyncSend( MsgType_t eMsg, const uint8 *pubMsgBytes, uint32 cubSize )
	{
		return m_pClient->BSendMessage( eMsg | k_EMsgProtoBufFlag, pubMsgBytes, cubSize );
	}
private:
	CGCClient *m_pClient;
};

bool CGCClient::BSendMessage( const CProtoBufMsgBase & msg )
{
	CProtoBufGCClientSendHandler sender( this );
	return msg.BAsyncSend( sender );
}

CSharedObject *CGCClient::FindSharedObject( SOID_t ID, const CSharedObject & soIndex )
{
	CGCClientSharedObjectCache *pCache = FindSOCache( ID, false );
	if ( !pCache )
		return NULL;
	return pCache->FindSharedObject( soIndex );
}

CGCClientSharedObjectCache *CGCClient::FindSOCache( SOID_t ID, bool bCreateIfMissing )
{
	int i = m_mapSOCache.Find( ID );
	if ( m_mapSOCache.IsValidIndex( i ) )
		return m_mapSOCache[i];

	if ( !bCreateIfMissing )
		return NULL;

	CGCClientSharedObjectCache *pCache = new CGCClientSharedObjectCache( ID );
	m_mapSOCache.Insert( ID, pCache );
	return pCache;
}

bool CGCClient::FindSOCacheByType( uint32 type, ClientSOCacheVec_t & cacheList )
{
	cacheList.RemoveAll();
	FOR_EACH_MAP_FAST( m_mapSOCache, i )
	{
		if ( m_mapSOCache.Key( i ).m_type == type )
			cacheList.AddToTail( m_mapSOCache[i] );
	}
	return cacheList.Count() > 0;
}

bool CGCClient::AddSOCacheListener( ISharedObjectListener *pListener )
{
	if ( !pListener || m_vecListeners.HasElement( pListener ) )
		return false;
	m_vecListeners.AddToTail( pListener );

	FOR_EACH_MAP_FAST( m_mapSOCache, i )
	{
		m_mapSOCache[i]->NotifyCreated( *pListener );
	}
	return true;
}

bool CGCClient::RemoveSOCacheListener( ISharedObjectListener *pListener )
{
	return m_vecListeners.FindAndRemove( pListener );
}

void CGCClient::DispatchSOCreated( SOID_t owner, const CSharedObject *pObject, ESOCacheEvent eEvent )
{
	FOR_EACH_VEC( m_vecListeners, i )
		m_vecListeners[i]->SOCreated( owner, pObject, eEvent );
}

void CGCClient::DispatchSOUpdated( SOID_t owner, const CSharedObject *pObject, ESOCacheEvent eEvent )
{
	FOR_EACH_VEC( m_vecListeners, i )
		m_vecListeners[i]->SOUpdated( owner, pObject, eEvent );
}

void CGCClient::DispatchSODestroyed( SOID_t owner, const CSharedObject *pObject, ESOCacheEvent eEvent )
{
	FOR_EACH_VEC( m_vecListeners, i )
		m_vecListeners[i]->SODestroyed( owner, pObject, eEvent );
}

void CGCClient::DispatchSOCacheSubscribed( SOID_t owner, ESOCacheEvent eEvent )
{
	FOR_EACH_VEC( m_vecListeners, i )
		m_vecListeners[i]->SOCacheSubscribed( owner, eEvent );
}

void CGCClient::DispatchSOCacheUnsubscribed( SOID_t owner, ESOCacheEvent eEvent )
{
	FOR_EACH_VEC( m_vecListeners, i )
		m_vecListeners[i]->SOCacheUnsubscribed( owner, eEvent );
}

void CGCClient::OnGCMessageAvailable( GCMessageAvailable_t *pCallback )
{
	(void)pCallback;
	if ( !m_pSteamGameCoordinator )
		return;

	uint32 cubData = 0;
	uint32 unMsgType = 0;
	int nRouted = 0;
	while ( m_pSteamGameCoordinator->IsMessageAvailable( &cubData ) )
	{
		// Full packet = GCMsgHdr_t prefix + GC payload (Steam RetrieveMessage returns payload only).
		const uint32 unFullSize = cubData + sizeof( GCMsgHdr_t );
		m_memMsg.EnsureCapacity( unFullSize );
		uint8 *pFullPacket = m_memMsg.Base();
		uint8 *pPacketFromGC = pFullPacket + sizeof( GCMsgHdr_t );

		EGCResults eResult = m_pSteamGameCoordinator->RetrieveMessage(
			&unMsgType, pPacketFromGC, m_memMsg.Count() - sizeof( GCMsgHdr_t ), &cubData );
		if ( eResult != k_EGCResultOK )
		{
			Warning( "CGCClient::OnGCMessageAvailable RetrieveMessage failed eResult=%d\n", (int)eResult );
			break;
		}

		if ( unMsgType & k_EMsgProtoBufFlag )
		{
			CNetPacket *pGCPacket = CNetPacketPool::AllocNetPacket();
			pGCPacket->Init( cubData, pPacketFromGC );
			CIMsgNetPacketAutoRelease pMsgNetPacket( pGCPacket );

			if ( pMsgNetPacket.Get() != NULL )
			{
				const MsgType_t eMsg = pMsgNetPacket->GetEMsg();
				const bool bOk = GetJobMgr().BRouteMsgToJob(
					this,
					pMsgNetPacket.Get(),
					JobMsgInfo_t( eMsg, pMsgNetPacket->GetSourceJobID(), pMsgNetPacket->GetTargetJobID() ),
					k_eGCMsgContext_All );
				Msg( "CGCClient: route GC msg %u (%s) size=%u ok=%d\n",
					(uint32)eMsg, PchMsgNameFromEMsg( eMsg ), cubData, bOk ? 1 : 0 );
				++nRouted;
			}
			else
			{
				Warning( "CGCClient: malformed protobuf GC packet type=%u size=%u\n",
					unMsgType & ~k_EMsgProtoBufFlag, cubData );
			}
			pGCPacket->Release();
		}
		else
		{
			GCMsgHdrEx_t *pHdr = (GCMsgHdrEx_t *)pFullPacket;
			pHdr->m_eMsg = unMsgType;
			pHdr->m_ulSteamID = CSteamID().ConvertToUint64();

			CNetPacket *pGCPacket = CNetPacketPool::AllocNetPacket();
			pGCPacket->Init( unFullSize, pFullPacket );
			CIMsgNetPacketAutoRelease pMsgNetPacket( pGCPacket );

			if ( pMsgNetPacket.Get() != NULL )
			{
				GetJobMgr().BRouteMsgToJob(
					this,
					pMsgNetPacket.Get(),
					JobMsgInfo_t( pMsgNetPacket->GetEMsg(), pMsgNetPacket->GetSourceJobID(), pMsgNetPacket->GetTargetJobID() ),
					k_eGCMsgContext_All );
				++nRouted;
			}
			pGCPacket->Release();
		}
	}
	if ( nRouted > 0 )
		Msg( "CGCClient::OnGCMessageAvailable routed %d msg(s)\n", nRouted );
}

void CGCClient::DispatchPacket( IMsgNetPacket *pMsgNetPacket )
{
	if ( !pMsgNetPacket )
		return;
	m_JobMgr.BRouteMsgToJob( this, pMsgNetPacket, JobMsgInfo_t( pMsgNetPacket->GetEMsg(), pMsgNetPacket->GetSourceJobID(), pMsgNetPacket->GetTargetJobID() ) );
}

void CGCClient::NotifySOCacheUnsubscribed( SOID_t ID )
{
	CGCClientSharedObjectCache *pCache = FindSOCache( ID, false );
	if ( !pCache )
		return;
	pCache->SetSubscribed( false );
	DispatchSOCacheUnsubscribed( ID, eSOCacheEvent_Unsubscribed );
}

void CGCClient::NotifyResubscribedUpToDate( SOID_t ID )
{
	CGCClientSharedObjectCache *pCache = FindSOCache( ID, false );
	if ( pCache )
		pCache->SetSubscribed( true );
}

void CGCClient::SendHello()
{
	m_timeLastSendHello = time( NULL );
	if ( !m_pSteamGameCoordinator )
		return;

	// Offline stub steam_api needs a real ClientHello so it can reply with
	// ClientWelcome + SOCache (inventory skins). This was a no-op and skins never arrived.
	CProtoBufMsg<CMsgClientHello> msg( k_EMsgGCClientHello );
	msg.Body().set_version( m_unVersion );
	msg.Body().set_client_session_need( m_nSessionNeed );
	const bool ok = BSendMessage( msg );
	Msg( "CGCClient::SendHello ver=%u sessionNeed=%u ok=%d\n",
		m_unVersion, m_nSessionNeed, ok ? 1 : 0 );
}

void CGCClient::ProcessSOCacheSubscribedMsg( const CMsgSOCacheSubscribed & msg )
{
	SOID_t owner;
	if ( msg.has_owner_soid() )
	{
		owner.m_type = msg.owner_soid().type();
		owner.m_id = msg.owner_soid().id();
	}
	else
	{
		return;
	}

	CGCClientSharedObjectCache *pCache = FindSOCache( owner, true );
	if ( !pCache )
		return;

	if ( pCache->BParseCacheSubscribedMsg( *this, msg ) )
	{
		pCache->SetSubscribed( true );
		DispatchSOCacheSubscribed( owner, eSOCacheEvent_Subscribed );
	}
}

void CGCClient::ProcessWelcomeMsg( const CMsgClientWelcome & msg )
{
	m_timeLoggedOn = time( NULL );
	for ( int i = 0; i < msg.outofdate_subscribed_caches_size(); i++ )
	{
		ProcessSOCacheSubscribedMsg( msg.outofdate_subscribed_caches( i ) );
	}
}

void CGCClient::SetSimulateGCConnectionFailure( bool bForcedFailure )
{
	m_bSimulateGCConnectionFailure = bForcedFailure;
}

void CGCClient::MessageReplyTimedOut( uint32 /*nExpectedMsg*/, uint /*nTimeoutSecs*/ )
{
	UpdateLogonState();
}

int CGCClient::GetLogonQueueEstimatedSecondsRemaining() const
{
	if ( m_timeLogonQueueEstimatedTimeExitQueue == 0 )
		return -1;
	int64 nLeft = (int64)m_timeLogonQueueEstimatedTimeExitQueue - (int64)time( NULL );
	return nLeft > 0 ? (int)nLeft : 0;
}

int CGCClient::GetLogonQueueApproxWaitSeconds() const
{
	if ( m_timeLogonQueueApproxTimeEnteredQueue == 0 )
		return -1;
	return (int)( time( NULL ) - m_timeLogonQueueApproxTimeEnteredQueue );
}

void CGCClient::ClearLogonQueueStats()
{
	m_nLogonQueuePosition = -1;
	m_nLogonQueueSize = -1;
	m_timeLogonQueueApproxTimeEnteredQueue = 0;
	m_timeLogonQueueEstimatedTimeExitQueue = 0;
}

void CGCClient::UpdateLogonState()
{
	if ( m_bWantSession && m_pSteamGameCoordinator )
		SendHello();
}

void CGCClient::ThinkConnection()
{
	if ( !m_bWantSession || !m_pSteamGameCoordinator )
		return;
	// Resend Hello until Welcome (SOCache) arrives — offline stub may miss the first.
	if ( m_timeLoggedOn != 0 )
		return;
	const time_t now = time( NULL );
	if ( m_timeLastSendHello == 0 || ( now - m_timeLastSendHello ) >= 5 )
		SendHello();
}

#ifndef STEAM
void CGCClient::OnSteamServersDisconnected( SteamServersDisconnected_t * )
{
}

void CGCClient::OnSteamServerConnectFailure( SteamServerConnectFailure_t * )
{
}

void CGCClient::OnSteamServersConnected( SteamServersConnected_t * )
{
}
#endif

// ---- SO jobs (CS:GO job registration) ----

class CGCSOCreateJob : public CGCClientJob
{
public:
	CGCSOCreateJob( CGCClient *pClient ) : CGCClientJob( pClient ) {}
	virtual bool BYieldingRunGCJob( IMsgNetPacket *pNetPacket )
	{
		CProtoBufMsg<CMsgSOSingleObject> msg( pNetPacket );
		SOID_t owner( msg.Body().owner_soid().type(), msg.Body().owner_soid().id() );
		CGCClientSharedObjectCache *pCache = m_pGCClient->FindSOCache( owner, true );
		if ( pCache )
		{
			pCache->BCreateFromMsg( *m_pGCClient, msg.Body().type_id(), msg.Body().object_data().data(), msg.Body().object_data().size() );
			if ( msg.Body().has_version() )
				pCache->SetVersion( msg.Body().version() );
		}
		return true;
	}
};
GC_REG_CLIENT_JOB( CGCSOCreateJob, k_ESOMsg_Create );

class CGCSODestroyJob : public CGCClientJob
{
public:
	CGCSODestroyJob( CGCClient *pClient ) : CGCClientJob( pClient ) {}
	virtual bool BYieldingRunGCJob( IMsgNetPacket *pNetPacket )
	{
		CProtoBufMsg<CMsgSOSingleObject> msg( pNetPacket );
		SOID_t owner( msg.Body().owner_soid().type(), msg.Body().owner_soid().id() );
		CGCClientSharedObjectCache *pCache = m_pGCClient->FindSOCache( owner, false );
		if ( pCache )
		{
			pCache->BDestroyFromMsg( *m_pGCClient, msg.Body().type_id(), msg.Body().object_data().data(), msg.Body().object_data().size() );
			if ( msg.Body().has_version() )
				pCache->SetVersion( msg.Body().version() );
		}
		return true;
	}
};
GC_REG_CLIENT_JOB( CGCSODestroyJob, k_ESOMsg_Destroy );

class CGCSOUpdateJob : public CGCClientJob
{
public:
	CGCSOUpdateJob( CGCClient *pClient ) : CGCClientJob( pClient ) {}
	virtual bool BYieldingRunGCJob( IMsgNetPacket *pNetPacket )
	{
		CProtoBufMsg<CMsgSOSingleObject> msg( pNetPacket );
		SOID_t owner( msg.Body().owner_soid().type(), msg.Body().owner_soid().id() );
		CGCClientSharedObjectCache *pCache = m_pGCClient->FindSOCache( owner, false );
		if ( pCache )
		{
			pCache->BUpdateFromMsg( *m_pGCClient, msg.Body().type_id(), msg.Body().object_data().data(), msg.Body().object_data().size() );
			if ( msg.Body().has_version() )
				pCache->SetVersion( msg.Body().version() );
		}
		return true;
	}
};
GC_REG_CLIENT_JOB( CGCSOUpdateJob, k_ESOMsg_Update );

class CGCSOUpdateMultipleJob : public CGCClientJob
{
public:
	CGCSOUpdateMultipleJob( CGCClient *pClient ) : CGCClientJob( pClient ) {}
	virtual bool BYieldingRunGCJob( IMsgNetPacket *pNetPacket )
	{
		CProtoBufMsg<CMsgSOMultipleObjects> msg( pNetPacket );
		SOID_t owner( msg.Body().owner_soid().type(), msg.Body().owner_soid().id() );
		CGCClientSharedObjectCache *pCache = m_pGCClient->FindSOCache( owner, false );
		if ( pCache )
		{
			for ( int i = 0; i < msg.Body().objects_modified().size(); ++i )
			{
				const CMsgSOMultipleObjects_SingleObject &objMessage = msg.Body().objects_modified( i );
				pCache->BUpdateFromMsg( *m_pGCClient, objMessage.type_id(), objMessage.object_data().data(), objMessage.object_data().size() );
			}
			if ( msg.Body().has_version() )
				pCache->SetVersion( msg.Body().version() );
		}
		return true;
	}
};
GC_REG_CLIENT_JOB( CGCSOUpdateMultipleJob, k_ESOMsg_UpdateMultiple );

class CGCSOCacheSubscribedJob : public CGCClientJob
{
public:
	CGCSOCacheSubscribedJob( CGCClient *pClient ) : CGCClientJob( pClient ) {}
	virtual bool BYieldingRunGCJob( IMsgNetPacket *pNetPacket )
	{
		CProtoBufMsg<CMsgSOCacheSubscribed> msg( pNetPacket );
		m_pGCClient->ProcessSOCacheSubscribedMsg( msg.Body() );
		return true;
	}
};
GC_REG_CLIENT_JOB( CGCSOCacheSubscribedJob, k_ESOMsg_CacheSubscribed );

class CGCSOCacheUnsubscribedJob : public CGCClientJob
{
public:
	CGCSOCacheUnsubscribedJob( CGCClient *pClient ) : CGCClientJob( pClient ) {}
	virtual bool BYieldingRunGCJob( IMsgNetPacket *pNetPacket )
	{
		CProtoBufMsg<CMsgSOCacheUnsubscribed> msg( pNetPacket );
		SOID_t owner( msg.Body().owner_soid().type(), msg.Body().owner_soid().id() );
		m_pGCClient->NotifySOCacheUnsubscribed( owner );
		return true;
	}
};
GC_REG_CLIENT_JOB( CGCSOCacheUnsubscribedJob, k_ESOMsg_CacheUnsubscribed );

class CGCSOCacheSubscriptionCheck : public CGCClientJob
{
public:
	CGCSOCacheSubscriptionCheck( CGCClient *pClient ) : CGCClientJob( pClient ) {}
	virtual bool BYieldingRunGCJob( IMsgNetPacket *pNetPacket )
	{
		CProtoBufMsg<CMsgSOCacheSubscriptionCheck> msg( pNetPacket );
		SOID_t owner( msg.Body().owner_soid().type(), msg.Body().owner_soid().id() );
		CGCClientSharedObjectCache *pSOCache = m_pGCClient->FindSOCache( owner, false );
		if ( pSOCache == NULL || !pSOCache->BIsInitialized() || pSOCache->GetVersion() != msg.Body().version() )
		{
			CProtoBufMsg<CMsgSOCacheSubscriptionRefresh> msg_response( k_ESOMsg_CacheSubscriptionRefresh );
			*msg_response.Body().mutable_owner_soid() = msg.Body().owner_soid();
			m_pGCClient->BSendMessage( msg_response );
		}
		else if ( !pSOCache->BIsSubscribed() )
		{
			pSOCache->SetSubscribed( true );
		}
		return true;
	}
};
GC_REG_CLIENT_JOB( CGCSOCacheSubscriptionCheck, k_ESOMsg_CacheSubscriptionCheck );

} // namespace GCSDK
