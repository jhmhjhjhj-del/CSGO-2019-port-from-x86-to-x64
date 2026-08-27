// CS:GO March 2019 work thread pool stubs — offline x64 (no background workers).
#include "stdafx.h"
#include "workthreadpool.h"
#include "jobmgr.h"

namespace GCSDK
{

IWorkThreadPoolSignal *CWorkThreadPool::sm_pWorkItemsCompletedSignal = NULL;

CWorkThread::CWorkThread( CWorkThreadPool *pThreadPool )
: m_pThreadPool( pThreadPool )
, m_bExitThread( false )
, m_bFinished( false )
{}

CWorkThread::CWorkThread( CWorkThreadPool *pThreadPool, const char *pszName )
: m_pThreadPool( pThreadPool )
, m_bExitThread( false )
, m_bFinished( false )
{
	SetName( pszName );
}

int CWorkThread::Run()
{
	m_bFinished = true;
	return 0;
}

CWorkThreadPool::CWorkThreadPool( const char *pszThreadNamePfx )
{
	V_strncpy( m_szThreadNamePfx, pszThreadNamePfx ? pszThreadNamePfx : "WorkPool", sizeof( m_szThreadNamePfx ) );
	m_bThreadsInitialized = false;
	m_pTSQueueToProcess = NULL;
	m_pTSQueueCompleted = NULL;
	m_bEnsureOutputOrdering = false;
	m_ulLastUsedSequenceNumber = 0;
	m_ulLastCompletedSequenceNumber = 0;
	m_ulLastDispatchedSequenceNumber = 0;
	m_bMayHaveJobTimeouts = false;
	m_bExiting = false;
	m_bNeverSetOnAdd = false;
	m_bAutoCreateThreads = false;
	m_cMaxThreads = 0;
	m_pWorkThreadConstructor = NULL;
	m_cSuccesses = 0;
	m_cFailures = 0;
	m_cRetries = 0;
}

CWorkThreadPool::~CWorkThreadPool()
{
	StopWorkThreads();
}

void CWorkThreadPool::SetNeverSetEventOnAdd( bool bNeverSet )
{
	m_bNeverSetOnAdd = bNeverSet;
}

void CWorkThreadPool::SetWorkThreadAutoConstruct( int cMaxThreads, IWorkThreadFactory *pFactory, bool bPreCreateThreads )
{
	(void)bPreCreateThreads;
	m_bAutoCreateThreads = true;
	m_cMaxThreads = cMaxThreads;
	m_pWorkThreadConstructor = pFactory;
}

void CWorkThreadPool::StartWorkThreads() {}
void CWorkThreadPool::StopWorkThreads() { m_bExiting = true; }

bool CWorkThreadPool::HasWorkItemsToProcess() const { return false; }

bool CWorkThreadPool::AddWorkItem( CWorkItem *pWorkItem )
{
	if ( !pWorkItem )
		return false;
	pWorkItem->AddRef();
	pWorkItem->Release();
	return true;
}

CWorkItem *CWorkThreadPool::GetNextCompletedWorkItem() { return NULL; }
CWorkItem *CWorkThreadPool::GetNextWorkItemToProcess() { return NULL; }

int CWorkThreadPool::GetCompletedWorkItemCount() const { return 0; }
int CWorkThreadPool::GetWorkItemToProcessCount() const { return 0; }

bool CWorkThreadPool::BDispatchCompletedWorkItems( CLimitTimer &, CJobMgr * )
{
	return false;
}

bool CWorkThreadPool::BTryDeleteExitedWorkerThreads() { return false; }
bool CWorkThreadPool::BCreateWorkThread() { return false; }
void CWorkThreadPool::OnWorkItemCompleted( CWorkItem *pWorkItem ) { if ( pWorkItem ) pWorkItem->Release(); }
void CWorkThreadPool::StartWorkThread( CWorkThread *, int ) {}

bool CWorkItem::DispatchCompletedWorkItem( CJobMgr * )
{
	Release();
	return true;
}

} // namespace GCSDK
