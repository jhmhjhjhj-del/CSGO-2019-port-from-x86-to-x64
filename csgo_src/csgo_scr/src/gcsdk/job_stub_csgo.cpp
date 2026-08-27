// CS:GO March 2019 job stubs — offline x64 (no coroutine scheduler).
#include "stdafx.h"
#include "job.h"
#include "jobmgr.h"

namespace GCSDK
{

CJob *g_pJobCur = NULL;
bool CJob::s_bStartDefaultJobsDelayed = false;

static const char * const k_prgchJobPauseReason[] =
{
	"active",
	"not started",
	"netmsg",
	"sleep for time",
	"waiting for lock",
	"yielding",
	"SQL",
	"work item",
	"job",
};

COMPILE_TIME_ASSERT( ARRAYSIZE( k_prgchJobPauseReason ) == k_EJobPauseReasonCount );

void CJob::DeleteJob( CJob *pJob )
{
	delete pJob;
}

CJob::CJob( CJobMgr &jobMgr, const char *pchJobName )
: m_JobMgr( jobMgr )
, m_pchJobName( pchJobName ? pchJobName : "" )
, m_JobID( k_GIDNil )
, m_hCoroutine( NULL )
, m_pvStartParam( NULL )
, m_cLocksAttempted( 0 )
, m_cLocksWaitedFor( 0 )
, m_ePauseReason( k_EJobPauseReasonNotStarted )
, m_pszPauseResourceName( NULL )
, m_unWaitMsgType( 0 )
, m_nContextMask( 0 )
, m_pJobPrev( NULL )
, m_pWaitingOnLock( NULL )
, m_pWaitingOnLockFilename( NULL )
, m_waitingOnLockLine( 0 )
, m_pJobToNotifyOnLockRelease( NULL )
, m_pWaitingOnWorkItem( NULL )
, m_jobIDWaitingOn( k_GIDNil )
, m_pFirstJobWaitingOnThis( NULL )
, m_pJobWaitingOnNext( NULL )
, m_pJobType( NULL )
{
	m_bRunFromMsg = false;
	m_bWorkItemCanceled = false;
	m_bIsTest = false;
	m_bIsLongRunning = false;
	m_flags.m_uFlags = 0;
	m_JobID = jobMgr.GetNewJobID();
	jobMgr.InsertJob( *this );
}

CJob::~CJob()
{
	FOR_EACH_VEC( m_vecNetPackets, i )
		m_vecNetPackets[i]->Release();
	m_vecNetPackets.RemoveAll();
}

void CJob::StartJob( void *pvStartParam )
{
	m_pvStartParam = pvStartParam;
	CJob *pPrev = g_pJobCur;
	g_pJobCur = this;
	if ( m_bRunFromMsg && m_vecNetPackets.Count() > 0 )
		(void)BYieldingRunJobFromMsg( m_vecNetPackets[0] );
	else
		(void)BYieldingRunJob( pvStartParam );
	g_pJobCur = pPrev;
}

void CJob::StartJobDelayed( void *pvStartParam )
{
	StartJob( pvStartParam );
}

void CJob::StartJobImmediate( void *pvStartParam )
{
	StartJob( pvStartParam );
}

void CJob::StartJobFromNetworkMsg( IMsgNetPacket *pNetPacket, const JobID_t &gidJobIDSrc, uint32 nContextMask )
{
	m_nContextMask = nContextMask;
	if ( pNetPacket )
		AddPacketToList( pNetPacket, gidJobIDSrc );
	SetFromFromMsg( true );
	StartJob( NULL );
}

CJobMgr &CJob::GetJobMgr() { return m_JobMgr; }

const char *CJob::GetName() const
{
	return m_pJobType ? m_pJobType->m_pchName : m_pchJobName;
}

const char *CJob::GetPauseReasonDescription() const
{
	if ( m_ePauseReason >= 0 && m_ePauseReason < k_EJobPauseReasonCount )
		return k_prgchJobPauseReason[m_ePauseReason];
	return "unknown";
}

void CJob::AddPacketToList( IMsgNetPacket *pNetPacket, const JobID_t expectedID )
{
	(void)expectedID;
	if ( pNetPacket )
	{
		pNetPacket->AddRef();
		m_vecNetPackets.AddToTail( pNetPacket );
	}
}

void CJob::ReleaseNetPacket( IMsgNetPacket *pNetPacket )
{
	int idx = m_vecNetPackets.Find( pNetPacket );
	if ( idx >= 0 )
	{
		pNetPacket->Release();
		m_vecNetPackets.Remove( idx );
	}
}

void CJob::EndPause( EJobPauseReason eExpectedState ) { (void)eExpectedState; m_ePauseReason = k_EJobPauseReasonNone; }
void CJob::GenerateAssert( const char *pchMsg ) { (void)pchMsg; Assert( false ); }
void CJob::Heartbeat() {}
void CJob::WaitForThreadFuncWorkItemBlocking() {}

bool CJob::BYield() { return false; }
bool CJob::BYieldIfNeeded( bool *pbYielded ) { if ( pbYielded ) *pbYielded = false; return false; }
bool CJob::BYieldingWaitTime( uint32 ) { return false; }
bool CJob::BYieldingWaitOneFrame() { return false; }
bool CJob::BYieldingWaitForMsg( IMsgNetPacket ** ) { return false; }
bool CJob::BYieldingWaitForMsg( CGCMsgBase *, MsgType_t ) { return false; }
bool CJob::BYieldingWaitForMsg( CProtoBufMsgBase *, MsgType_t ) { return false; }
bool CJob::BYieldingWaitForJob( JobID_t ) { return false; }
bool CJob::BYieldingWaitForJobs( const CUtlVector<JobID_t> & ) { return false; }
bool CJob::BYieldingWaitForWorkItem( const char *, JobID_t ) { return false; }
bool CJob::BYieldingWaitForThreadFuncWorkItem( CWorkItem * ) { return false; }
bool CJob::BYieldingWaitForThreadFuncWorkItems( CWorkItem **, int ) { return false; }
bool CJob::BYieldingWaitForThreadFunc( CFunctor * ) { return false; }
bool CJob::BYieldingWaitForThreadFuncs( CFunctor **, int ) { return false; }

bool CJob::_BYieldingAcquireLock( CLock *, const char *, int ) { return true; }
bool CJob::_BAcquireLockImmediate( CLock *, const char *, int ) { return true; }
void CJob::_ReleaseLock( CLock *, bool, const char *, int ) {}
void CJob::ReleaseLocks() {}
bool CJob::BJobHoldsLock( uint16, uint64 ) const { return false; }
bool CJob::BJobHoldsLock( const CLock * ) const { return false; }
void CJob::ShouldNotHoldAnyLocks() {}

void CJob::_SetLock( CLock *, const char *, int ) {}
void CJob::UnsetLock( CLock * ) {}
void CJob::PassLockToJob( CJob *, CLock * ) {}
void CJob::OnLockDeleted( CLock * ) {}
void CJob::AddJobToNotifyOnLockRelease( CJob * ) {}

uint32 CJob::CHeartbeatsBeforeTimeout() { return 0; }

void CJob::InitCoroutine() {}
void CJob::Continue() {}
void CJob::Debug() {}
void CJob::Pause( EJobPauseReason eReason, const char *pszResourceName )
{
	m_ePauseReason = eReason;
	m_pszPauseResourceName = pszResourceName;
}
void CJob::SetWaitingForJob( CJob * ) {}
/*static*/ void CJob::BRunProxy( void * ) {}

CLock::CLock()
: m_pJob( NULL )
, m_pJobToNotifyOnLockRelease( NULL )
, m_pJobWaitingQueueTail( NULL )
, m_pchConstStr( NULL )
, m_nRefCount( 0 )
, m_nWaitingCount( 0 )
, m_unLockSubType( 0 )
, m_pFilename( "unknown" )
, m_line( 0 )
, m_nsLockType( 0 )
{}

CLock::~CLock() {}
void CLock::AddToWaitingQueue( CJob * ) {}
void CLock::SetName( const char *pchName ) { m_pchConstStr = pchName; }
const char *CLock::GetName() const { return m_pchConstStr ? m_pchConstStr : "None"; }
void CLock::IncrementReference() { ++m_nRefCount; }
int CLock::DecrementReference() { return ( m_nRefCount > 0 ) ? --m_nRefCount : 0; }
void CLock::Dump( const char *, int, bool ) const {}

void CDoNotYieldScopeImpl::InternalPush( const char *pchLocation )
{
	if ( g_pJobCur )
		g_pJobCur->GetJobMgr().PushDoNotYield( *g_pJobCur, pchLocation );
}

void CDoNotYieldScopeImpl::InternalPop()
{
	if ( g_pJobCur )
		g_pJobCur->GetJobMgr().PopDoNotYield( *g_pJobCur );
}

} // namespace GCSDK
