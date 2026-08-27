// CS:GO March 2019 CJobMgr stubs — offline x64.
#include "stdafx.h"
#include "jobmgr.h"

namespace GCSDK
{

#ifdef DEBUG_JOB_LIST
CUtlLinkedList<CJob *, int> CJobMgr::sm_listAllJobs;
#endif

static CUtlVector<const JobType_t *> s_registeredJobTypes;

CJobMgr::CJobMgr()
: m_WorkThreadPool( "CJobMgr::m_WorkThreadPool" )
, m_unNextJobID( 0 )
, m_nCurrentYieldIterationRegPri( 0 )
, m_bProfiling( false )
, m_bIsShuttingDown( false )
, m_cErrorsToReport( 0 )
, m_unFrameFuncThreadID( 0 )
, m_bJobTimedOut( false )
{
}

CJobMgr::~CJobMgr()
{
	m_WorkThreadPool.StopWorkThreads();
}

JobID_t CJobMgr::GetNewJobID()
{
	return ++m_unNextJobID;
}

void CJobMgr::SetThreadPoolSize( uint cThreads, bool bPreCreateThreads )
{
	m_WorkThreadPool.SetWorkThreadAutoConstruct( (int)cThreads, NULL, bPreCreateThreads );
}

bool CJobMgr::BFrameFuncRunSleepingJobs( CLimitTimer & ) { return false; }
bool CJobMgr::BFrameFuncRunYieldingJobs( CLimitTimer & ) { return false; }

void CJobMgr::InsertJob( CJob &job )
{
	if ( job.m_JobID == k_GIDNil )
		job.m_JobID = GetNewJobID();
	m_MapJob.Insert( job.GetJobID(), &job );
#ifdef DEBUG_JOB_LIST
	sm_listAllJobs.AddToTail( &job );
#endif
}

void CJobMgr::RemoveJob( CJob &job )
{
	int idx = m_MapJob.Find( job.GetJobID() );
	if ( idx != m_MapJob.InvalidIndex() )
		m_MapJob.RemoveAt( idx );
#ifdef DEBUG_JOB_LIST
	sm_listAllJobs.FindAndRemove( &job );
#endif
}

void CJobMgr::AddDelayedJobToYieldList( CJob & ) {}

bool CJobMgr::BRouteMsgToJob( void *pParent, IMsgNetPacket *pNetPacket, const JobMsgInfo_t &jobMsgInfo, EGCMsgContext nCreateContext )
{
	if ( !pNetPacket )
		return false;

	if ( jobMsgInfo.m_JobIDTarget != k_GIDNil )
	{
		int iJob = m_MapJob.Find( jobMsgInfo.m_JobIDTarget );
		if ( iJob != m_MapJob.InvalidIndex() )
		{
			PassMsgToJob( *( m_MapJob[iJob] ), pNetPacket, jobMsgInfo );
			return true;
		}
	}

	bool bRet = BLaunchJobFromNetworkMsg( pParent, jobMsgInfo, pNetPacket, nCreateContext );
	if ( !bRet && jobMsgInfo.m_JobIDTarget != k_GIDNil )
	{
		RecordOrphanedMessage( jobMsgInfo.m_eMsg, jobMsgInfo.m_JobIDTarget );
		return true;
	}
	return bRet;
}

void CJobMgr::PassMsgToJob( CJob &job, IMsgNetPacket *pNetPacket, const JobMsgInfo_t & )
{
	if ( pNetPacket )
		job.AddPacketToList( pNetPacket, k_GIDNil );
}

void CJobMgr::PushDoNotYield( CJob &, const char * ) {}
void CJobMgr::PopDoNotYield( CJob & ) {}

bool CJobMgr::BIsJobRunning( const char * ) { return false; }
bool CJobMgr::BYieldingWaitForMsg( CJob & ) { return false; }
bool CJobMgr::BYieldingWaitForJob( CJob &, JobID_t ) { return false; }
bool CJobMgr::BYieldingWaitTime( CJob &, uint32 ) { return false; }
bool CJobMgr::BYield( CJob & ) { return false; }
bool CJobMgr::BYieldIfNeeded( CJob &, bool *pbYielded ) { if ( pbYielded ) *pbYielded = false; return false; }
bool CJobMgr::BYieldingWaitForWorkItem( CJob &, const char *, JobID_t ) { return false; }

void CJobMgr::AddThreadedJobWorkItem( CWorkItem *pWorkItem )
{
	if ( pWorkItem )
		m_WorkThreadPool.AddWorkItem( pWorkItem );
}

bool CJobMgr::HasOutstandingThreadPoolWorkItems()
{
	return m_WorkThreadPool.HasWorkItemsToProcess() || m_WorkThreadPool.GetCompletedWorkItemCount() > 0;
}

void CJobMgr::SetWaitForWorkItemJobOwner( JobID_t, JobID_t ) {}

bool CJobMgr::BRouteWorkItemCompletedInternal( JobID_t, bool, bool, bool ) { return false; }

void CJobMgr::RegisterJobType( const JobType_t *pJobType )
{
	if ( pJobType )
		s_registeredJobTypes.AddToTail( pJobType );
}

bool CJobMgr::BLaunchJobFromNetworkMsg( void *pParent, const JobMsgInfo_t &jobMsgInfo, IMsgNetPacket *pNetPacket, EGCMsgContext nCreateContext )
{
	if ( !pNetPacket )
		return false;

	FOR_EACH_VEC( s_registeredJobTypes, i )
	{
		const JobType_t *pType = s_registeredJobTypes[i];
		if ( pType->m_eCreationMsg != jobMsgInfo.m_eMsg )
			continue;
		if ( ( pType->m_nValidContexts & (uint32)nCreateContext ) == 0 )
			continue;

		CJob *pJob = pType->m_pJobFactory( pParent, NULL );
		if ( !pJob )
			continue;

		Job_SetJobType( *pJob, pType );
		pJob->StartJobFromNetworkMsg( pNetPacket, jobMsgInfo.m_JobIDSource, (uint32)nCreateContext );
		return true;
	}
	return false;
}

void CJobMgr::AddToYieldList( CJob & ) {}
bool CJobMgr::BGetIJob( JobID_t, EJobPauseReason, bool, int * ) { return false; }
bool CJobMgr::BResumeYieldingJobs( CLimitTimer & ) { return false; }
bool CJobMgr::BResumeYieldingJobsFromList( CUtlLinkedList<JobYielding_t, int> &, uint, CLimitTimer & ) { return false; }
bool CJobMgr::BResumeSleepingJobs( CLimitTimer & ) { return false; }
/*static*/ bool CJobMgr::JobSleepingLessFunc( JobSleeping_t const &, JobSleeping_t const & ) { return false; }

void CJobMgr::PauseJob( CJob &job, EJobPauseReason eReason, const char *pszResource )
{
	job.Pause( eReason, pszResource );
}

void CJobMgr::CheckForJobTimeouts( CLimitTimer & ) {}
void CJobMgr::TimeoutJob( CJob & ) {}
void CJobMgr::AccumulateStatsofJob( CJob & ) {}
void CJobMgr::RecordOrphanedMessage( MsgType_t, JobID_t ) {}
void CJobMgr::WakeupLockedJob( CJob & ) {}
void CJobMgr::WakeJobsWaitingOnJob( CJob & ) {}
bool CJobMgr::BJobExists( JobID_t jobID ) const { return m_MapJob.Find( jobID ) != m_MapJob.InvalidIndex(); }

int CJobMgr::ProfileSortFunc( void *, const int *, const int * ) { return 0; }
void CJobMgr::ProfileJobs( EJobProfileAction, EJobProfileSortOrder ) {}
int CJobMgr::DumpJobSummary() { return 0; }
void CJobMgr::DumpJob( JobID_t, int ) const {}
int CJobMgr::CountJobs() const { return m_MapJob.Count(); }
void CJobMgr::CheckThreadID() {}
void CJobMgr::DumpJobs( const char *, int, int ) const {}
/*static*/ void CJobMgr::DebugJob( int ) {}

#ifdef GC
JobRoutingFunc_t CJobMgr::GetRoutingForMsg( IMsgNetPacket * ) { return NULL; }
JobRoutingFunc_t CJobMgr::GetRoutingForMsg( MsgType_t ) { return NULL; }
bool CJobMgr::BResumeSQLJob( CGCSQLQueryGroup * ) { return false; }
bool CJobMgr::BYieldingRunQuery( CJob &, CGCSQLQueryGroup *, ESchemaCatalog ) { return false; }
void CJobMgr::StartSQLProfiling() {}
void CJobMgr::StopSQLProfiling() {}
void CJobMgr::DumpSQLProfile( ESQLProfileSort ) {}
void CJobMgr::DumpSQLInflight( int ) {}
void CJobMgr::DisplayPendingSQLJob( const PendingSQLJob_t & ) {}
int CJobMgr::SQLProfileSortFunc( void *, const int *, const int * ) { return 0; }
#endif

} // namespace GCSDK
