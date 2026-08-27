//=========== Copyright Valve Corporation, All rights reserved. ===============//
//
// Purpose: 
//=============================================================================//

#include "stdafx.h"
#include "renderer/uirenderengine.h"
#include "input/uiinput.h"
#include "input/mousecursor.h"
#include "iuisoundsystem.h"
#include "pan_crash_bc.h"

// memdbgon must be the last include file in a .cpp file!!!
#include <tier0/memdbgon.h>

using namespace panorama;


ConVar s_convarShowPanoramaFPS( "@panorama_show_fps", "0" );
ConVar s_convarPanoramaClearFramesOnDeviceRestore( "@panorama_clear_frames_on_device_restore", "2" );
static ConVar s_convarPanoramaDisableDescendantFiltering( "@panorama_disable_descendant_filtering", "0", FCVAR_DEVELOPMENTONLY, "Disable descendant selector filtering" );
ConVar s_convarSuspendPaint( "@panorama_suspend_paint", "0" );
//-----------------------------------------------------------------------------
// Purpose: Constructor
//-----------------------------------------------------------------------------
CTopLevelWindow::CTopLevelWindow( CUIEngine *pUIEngineParent )
	: m_PanelPool( 64 )
{
	m_pInputEngine = new CUIWindowInput( this, (CUIInputEngine *)UIEngine()->UIInputEngine() );
	m_pUIEngineParent = pUIEngineParent;
	m_pContextPtr = NULL;
	m_eCursorCurrent = eMouseCursor_Arrow;
	m_eRenderTarget = IUIEngine::k_ERenderTargetUnset;
	m_unSurfaceWidth = 0;
	m_unSurfaceHeight = 0;
	m_pMouseCursor = NULL;
	m_pFastScrollSoundManager = NULL;
	m_flScaleFactor = 1.0f;
	m_bCursorWasVisibleLastFrame = true;
	m_unMouseWheelUpRepeats = 0;
	m_unMouseWheelDownRepeats = 0;
	m_flLastMouseWheelUp = 0.0f;
	m_flLastMouseWheelDown = 0.0f;
#if defined( SOURCE2_PANORAMA )
	m_pCursorRender = nullptr;
#else
	m_pCursorRender = new CMouseCursorRender( this );
#endif
	m_flMinFPS = 1.0f;
	m_bInPaintTraverse = false;
	m_bInLayoutTraverse = false;
	m_bFinishedInitialization = false;
	m_bInhibitInput = false;
	m_unFramesToClearGPUResourcesBeforeRepaint = 0;
	m_bDeviceLost = false;
	m_nWindowPriority = 0;

	// True initially, since everything has to repaint to start with anyway and if
	// we start invisible we don't even need the first panel recurse to mark for repaint
	m_bAlreadyForcedRepaintAllSinceLastPaint = true;

	for ( int i = 0; i < eDaisyWheelInputType_MAX; i++ )
	{
		m_flDaisyWheelWPM[i].flTime = 0.0f;
		m_flDaisyWheelWPM[i].nWords = 0;
	}
}


//-----------------------------------------------------------------------------
// Purpose: Destructor
//-----------------------------------------------------------------------------
CTopLevelWindow::~CTopLevelWindow()
{
	CTopLevelWindow::Shutdown();
	SAFE_DELETE( m_pInputEngine );
	SAFE_DELETE( m_pMouseCursor );
	SAFE_DELETE( m_pCursorRender );
}


//-----------------------------------------------------------------------------
// Purpose: Final step of initialization
//-----------------------------------------------------------------------------
bool CTopLevelWindow::FinishInitialization()
{
	m_pMouseCursor = new CMouseCursorTexture( AccessImageManager() );
	m_bFinishedInitialization = true;
	return true;
}


//-----------------------------------------------------------------------------
// Purpose: Window shutdown
//-----------------------------------------------------------------------------
void CTopLevelWindow::Shutdown()
{
	// make sure we dispatch this synchronously.. objects could still have pointers to our class
	DispatchEvent( TopLevelWindowClose(), (IUIPanel*)NULL, this );

	while( m_listInvisiblePanels.Count() )
	{
		// panels will remove themselves from the list in their destructor
		m_listInvisiblePanels[m_listInvisiblePanels.Head()]->ClientPtr()->OnDeletePanel();		
	}
	m_listInvisiblePanels.RemoveAll();

	while( m_listVisiblePanels.Count() )
	{
		// panels will remove themselves from the list in their destructor
		m_listVisiblePanels[m_listVisiblePanels.Head()]->ClientPtr()->OnDeletePanel();
	}
	m_listVisiblePanels.RemoveAll();

	SAFE_DELETE( m_pMouseCursor );
	SAFE_DELETE( m_pFastScrollSoundManager );

	// don't delete m_pInputEngine or m_pCursorRender here but wait till destruction, the render thread has a pointer to it and won't be shutdown yet
}


//-----------------------------------------------------------------------------
// Purpose: Set max FPS
//-----------------------------------------------------------------------------
void CTopLevelWindow::SetMaxFPS( float flMaxFPS )
{ 
	m_pRenderEngine->SetMaxFPS( MAX( flMaxFPS, m_flMinFPS ) ); 
}


//-----------------------------------------------------------------------------
// Purpose: Set scaling factor that applies to all x/y values in the UI for the window, 
// used so we can  author content at say 1080p but pass 0.6666666f for this to render in 
// 720p on cards with poor fill rates or TVs without 1080p support.
//-----------------------------------------------------------------------------
void CTopLevelWindow::SetWindowScaleFactor( float flScaleFactor )
{ 
	m_flScaleFactor = flScaleFactor;
	if ( m_pSurfaceInterface )
		m_pSurfaceInterface->SetWindowScaleFactor( flScaleFactor );

	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		m_listVisiblePanels[ i ]->InvalidateSizeAndPosition();
	}

	FOR_EACH_LL( m_listInvisiblePanels, i )
	{
		( ( CUIPanel* )m_listInvisiblePanels[ i ] )->InvalidateSizeAndPosition();
	}
}


//-----------------------------------------------------------------------------
// Purpose: Run frame
//-----------------------------------------------------------------------------
void CTopLevelWindow::RunPlatformFrame()
{
	static int s_nTlwBC = 0;
	const int nT = ++s_nTlwBC;
	const bool bT = false; // TLW crash BC off
	(void)nT;
	const int nPri = GetWindowPriority();
	if ( bT )
		PanCrashBCF( "PanCrashBC TLW::RPF ENTER #%d pri=%d vis=%d input=%p cursor=%p\n",
			nT, nPri, BIsVisible() ? 1 : 0, m_pInputEngine, m_pCursorRender );

	if ( BIsVisible() )
	{
		if ( m_pInputEngine )
		{
			if ( bT )
				PanCrashBCF( "PanCrashBC TLW::RPF before Input::RunFrame #%d pri=%d\n", nT, nPri );
			m_pInputEngine->RunFrame();
			if ( bT )
				PanCrashBCF( "PanCrashBC TLW::RPF after Input::RunFrame #%d pri=%d\n", nT, nPri );
		}

		if ( m_pCursorRender && m_pInputEngine )
		{
			Vector2D vecMousePos;
			m_pInputEngine->GetSurfaceMousePosition( vecMousePos.x, vecMousePos.y );
			IUIInput *pUIIn = UIInputEngine();
			if ( bT )
				PanCrashBCF( "PanCrashBC TLW::RPF before Cursor::RunFrame #%d pri=%d uiIn=%p mouse=%.1f,%.1f\n",
					nT, nPri, pUIIn, vecMousePos.x, vecMousePos.y );
			m_pCursorRender->RunFrame( vecMousePos, IsMouseOver(), m_pInputEngine->BWasMouseClickedOrScrolled(), m_pInputEngine->BWasMouseMoving(),
				pUIIn ? pUIIn->BWasGamepadOrSteamControllerActive() : false,
				m_pInputEngine->BWasKeyboardUsed() );
			if ( bT )
				PanCrashBCF( "PanCrashBC TLW::RPF after Cursor::RunFrame #%d pri=%d\n", nT, nPri );
		}
	}

	bool bCursorVisibleThisFrame = BCursorVisible();
	if ( bCursorVisibleThisFrame != m_bCursorWasVisibleLastFrame )
	{
		m_bCursorWasVisibleLastFrame = bCursorVisibleThisFrame;
		if ( bT )
			PanCrashBCF( "PanCrashBC TLW::RPF cursorVisFlip #%d pri=%d now=%d\n", nT, nPri, bCursorVisibleThisFrame ? 1 : 0 );
		if ( bCursorVisibleThisFrame )
			DispatchEvent( WindowCursorShown(), (IUIPanel*)NULL, this );
		else
			DispatchEvent( WindowCursorHidden(), (IUIPanel*)NULL, this );
		if ( bT )
			PanCrashBCF( "PanCrashBC TLW::RPF after cursorVis event #%d pri=%d\n", nT, nPri );
	}

	// Add classes from top level panels that have been added to this window.
	if( m_vecPanelsAddClasses.Count() != 0 )
	{
		if ( bT )
			PanCrashBCF( "PanCrashBC TLW::RPF AddClasses n=%d #%d pri=%d\n", m_vecPanelsAddClasses.Count(), nT, nPri );
		// This list could change as a result of calls to RemoveClasses(), so swap with an empty list first
		CUtlVector< CPanelPtr< IUIPanel > > vecPanels;
		m_vecPanelsAddClasses.Swap( vecPanels );

		// Add classes from each panel
		if( m_vecStyleClasses.Count() != 0 )
		{
			FOR_EACH_VEC( vecPanels, i )
			{
				if( vecPanels[i].Get() )
					vecPanels[i].Get()->AddClasses( m_vecStyleClasses.Base(), m_vecStyleClasses.Count() );
			}
		}
	}

	// Remove classes from top level panels that have been removed from this window.
	if ( m_vecPanelsRemoveClasses.Count() != 0 )
	{
		if ( bT )
			PanCrashBCF( "PanCrashBC TLW::RPF RemoveClasses n=%d #%d pri=%d\n", m_vecPanelsRemoveClasses.Count(), nT, nPri );
		// This list could change as a result of calls to RemoveClasses(), so swap with an empty list first
		CUtlVector< CPanelPtr< IUIPanel > > vecPanels;
		m_vecPanelsRemoveClasses.Swap( vecPanels );

		// Remove classes from each panel
		if ( m_vecStyleClasses.Count() != 0 )
		{
			FOR_EACH_VEC( vecPanels, i )
			{
				if ( vecPanels[ i ].Get() )
					vecPanels[ i ].Get()->RemoveClasses( m_vecStyleClasses.Base(), m_vecStyleClasses.Count() );
			}
		}
	}
	if ( bT )
		PanCrashBCF( "PanCrashBC TLW::RPF EXIT #%d pri=%d\n", nT, nPri );
}



void CTopLevelWindow::OnDeviceLost()
{
	m_bDeviceLost = true;
	ClearGPUResourcesBeforeNextFrame();
}

void CTopLevelWindow::OnDeviceRestored()
{
	m_bDeviceLost = false;
	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		m_listVisiblePanels[i]->SetRepaintRecursive( k_EPanelRepaintFull );
	}
}

bool CTopLevelWindow::BDeviceLost()
{
	return m_bDeviceLost;
}

//-----------------------------------------------------------------------------
// Purpose: Clears the GPU resources associated with the window before the next render frame
//-----------------------------------------------------------------------------
void CTopLevelWindow::ClearGPUResourcesBeforeNextFrame()
{
	m_unFramesToClearGPUResourcesBeforeRepaint = s_convarPanoramaClearFramesOnDeviceRestore.GetInt();

	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		m_listVisiblePanels[i]->SetRepaintRecursive( k_EPanelRepaintFull );
	}
}

//-----------------------------------------------------------------------------
// Purpose: Paint an empty frame so the animation/render threads will run but do nothing but LRU/clear data
//-----------------------------------------------------------------------------
void CTopLevelWindow::PaintEmptyFrameAndForceLaterRepaint()
{
	VPROF_BUDGET( "CTopLevelWindow - PaintEmptyFrame", VPROF_BUDGETGROUP_TENFOOT );

	static ConVarRef refChain( "panorama_render_chain" );
	const int nChain = refChain.IsValid() ? refChain.GetInt() : 0;
	static int s_nEmpty = 0;
	const int nEmpty = ++s_nEmpty;
	const int nPri = GetWindowPriority();
	const char *pszRole =
		( nPri == 1000 ) ? "match/hud" :
		( nPri == 1001 ) ? "intro" :
		( nPri == 1002 ) ? "lobby" :
		( nPri == 1003 ) ? "loading" :
		( nPri == 1004 ) ? "js" :
		( nPri == 1005 ) ? "popups" : "other";
	if ( nChain > 0 && ( nChain >= 2 || nEmpty <= 32 || ( nEmpty % 180 ) == 0 || nPri == 1002 ) )
	{
		Msg( "PanRenderChain PaintEmpty #%d role=%s pri=%d (no GPU — shared HWND safe)\n",
			nEmpty, pszRole, nPri );
	}

	// Drain paint queue: hidden shells skip RenderWindow, so anim never consumes lists →
	// PAINT_QUEUE_FULL on Hud/Loading, MainMenu chrome starves, fullscreen logo/movie remains.
	if ( m_pRenderEngine )
		m_pRenderEngine->DiscardQueuedPaintLists();

	// Mark for full repaint when this shell is shown again. Do NOT BeginFrame/EndFrame:
	// CSGO layers share one HWND + backbufferDirect. BeginFrame(empty, clearGpu=1) deletes
	// the shared composition layer → black lobby; empty EndFrame without clear still blits
	// a stale layer over MainMenu after it painted.
	if( !m_bAlreadyForcedRepaintAllSinceLastPaint )
	{
		m_bAlreadyForcedRepaintAllSinceLastPaint = true;
		FOR_EACH_LL( m_listVisiblePanels, i )
		{
			m_listVisiblePanels[i]->SetRepaintRecursive( k_EPanelRepaintFull );
		}
	}

	m_flLastLayoutAndPaintTime = UIEngine()->GetCurrentFrameTime();
}


//-----------------------------------------------------------------------------
// Purpose: paint a new frame for a panel
//-----------------------------------------------------------------------------
void CTopLevelWindow::LayoutAndPaintIfNeeded()
{
	static ConVarRef refChain( "panorama_render_chain" );
	const int nChain = refChain.IsValid() ? refChain.GetInt() : 0;
	static int s_nLap = 0;
	const int nLap = ++s_nLap;
	const int nPri = GetWindowPriority();
	const int nVisPanels = m_listVisiblePanels.Count();
	const int nInvPanels = m_listInvisiblePanels.Count();
	Color clear = GetClearColor();
	if ( nChain > 0 && ( nPri == 1002 || nChain >= 2 ) && ( nLap <= 40 || ( nLap % 120 ) == 0 || nVisPanels == 0 ) )
	{
		Msg( "PanPaint LayoutAndPaint ENTER #%d pri=%d visPanels=%d invPanels=%d size=%ux%u clear=%d,%d,%d,%d suspend=%d\n",
			nLap, nPri, nVisPanels, nInvPanels, m_unWindowWidth, m_unWindowHeight,
			clear.r(), clear.g(), clear.b(), clear.a(), s_convarSuspendPaint.GetBool() ? 1 : 0 );
	}

	{
		VPROF_BUDGET( "CTopLevelWindow - ApplyStyles", VPROF_BUDGETGROUP_TENFOOT );

		CUtlVectorFixedGrowable<CUIPanel*, 256> vecPanelsToApplyStyles;

		// Apply to all the invisible top-level panels that are dirty first, so they can move to visible if appropriate
		FOR_EACH_LL( m_listInvisiblePanels, i )
		{
			CUIPanel *pPanel = m_listInvisiblePanels[i];
			if ( pPanel->GetParent() == NULL && ( pPanel->BStylesDirty() || pPanel->BChildStylesDirty() ) )
			{
				vecPanelsToApplyStyles.AddToTail( pPanel );
			}
		}

		// Additionally apply to any that are already visible and dirty
		FOR_EACH_LL( m_listVisiblePanels, i )
		{
			CUIPanel *pPanel = m_listVisiblePanels[i];
			if ( pPanel->GetParent() == NULL && ( pPanel->BStylesDirty() || pPanel->BChildStylesDirty() ) )
			{
				vecPanelsToApplyStyles.AddToTail( pPanel );
			}
		}

		CStyleFileDescendantFilter::SetActive( !s_convarPanoramaDisableDescendantFiltering.GetBool() );
		FOR_EACH_VEC( vecPanelsToApplyStyles, i )
		{
			vecPanelsToApplyStyles[i]->ApplyStyles( true );
		}
		CStyleFileDescendantFilter::SetActive( false );
	}

	// Perform layout. Skip if forcing use of paint cmd caches as part of HUD alt-ticks
	if ( !UIEngine()->BShouldUseForceBuiltPaintCmdCaches() )
	{
		m_flLastLayoutAndPaintTime = UIEngine()->GetCurrentFrameTime();
		PerformLayout();
	}

	// Let image loader run frame
	AccessImageManager()->RunFrame();

	if ( !s_convarSuspendPaint.GetBool() )
	{
		VPROF_BUDGET( "CTopLevelWindow::PaintIfNeeded paint", VPROF_BUDGETGROUP_TENFOOT );

		if ( !s_convarSuspendPaint.GetBool() )
		{
			m_pRenderEngine->StartNewPaintBuffer();
		}

		// Start a frame
		m_pRenderEngine->BeginFrame( m_unWindowWidth, m_unWindowHeight, m_eRenderTarget, GetClearColor(), GetWindowScaleFactor(), false, m_unFramesToClearGPUResourcesBeforeRepaint > 0 ? true : false );
		if( m_unFramesToClearGPUResourcesBeforeRepaint > 0 )
			m_unFramesToClearGPUResourcesBeforeRepaint--;

		m_bAlreadyForcedRepaintAllSinceLastPaint = false;
		m_bInPaintTraverse = true;
		int nPainted = 0;
		auto CountPaintCmds = [this]() -> int
		{
			int n = 0;
			for ( RenderCommand_t *pCmd = m_pRenderEngine->GetCurrentCommandList().GetFirstCommand(); pCmd; pCmd = pCmd->pNextRenderCommand )
				++n;
			return n;
		};
		const int nCmdsBeforeRoots = CountPaintCmds();
		FOR_EACH_LL( m_listVisiblePanels, i )
		{
			UISoundSystem()->ServiceAudio();
			CUIPanel * pPanel = m_listVisiblePanels[i];
			// Diag spam freezes JS (DispatchAsyncEvent backlog / «Сохраняю…»).
			// Child dumps ONLY with panorama_render_chain >= 2 (never on boot nLap).
			const char *pszRootId = pPanel->GetID() ? pPanel->GetID() : "";
			const bool bMainMenuRoot = ( nPri == 1002 && !V_stricmp( pszRootId, "CSGOMainMenu" ) );
			const bool bLogRoot = bMainMenuRoot && ( nChain >= 2 );
			if ( bLogRoot )
			{
				float flOpacity = 1.0f;
				pPanel->AccessStyle()->GetOpacity( flOpacity );
				int nVisKids = 0, nKids = pPanel->GetChildCount();
				for ( int k = 0; k < nKids; ++k )
				{
					IUIPanel *pKid = pPanel->AccessChildren()[k];
					if ( pKid && pKid->BIsVisible() )
						++nVisKids;
				}
				Msg( "PanPaint ROOT before #%d pri=%d id=%s type=%s vis=%d size=%.0fx%.0f opacity=%.4f transparent=%d kids=%d visKids=%d cmds=%d\n",
					nLap, nPri,
					pPanel->GetID() ? pPanel->GetID() : "?",
					pPanel->GetPanelType().String(),
					pPanel->BIsVisible() ? 1 : 0,
					pPanel->GetActualLayoutWidth(), pPanel->GetActualLayoutHeight(),
					flOpacity,
					pPanel->AccessStyle()->BIsTransparentWithNoOpacityTransition() ? 1 : 0,
					nKids, nVisKids, CountPaintCmds() );
				// One-level child dump — MainMenu often has a single faded child that anim-culls the whole tree.
				for ( int k = 0; k < nKids && k < 8; ++k )
				{
					IUIPanel *pKidI = pPanel->AccessChildren()[k];
					CUIPanel *pKid = static_cast< CUIPanel * >( pKidI );
					if ( !pKid )
						continue;
					float flKidOp = 1.0f;
					pKid->AccessStyle()->GetOpacity( flKidOp );
					Msg( "PanPaint CHILD #%d parent=%s id=%s type=%s vis=%d size=%.0fx%.0f opacity=%.4f transparent=%d kids=%d\n",
						nLap,
						pPanel->GetID() ? pPanel->GetID() : "?",
						pKid->GetID() ? pKid->GetID() : "?",
						pKid->GetPanelType().String(),
						pKid->BIsVisible() ? 1 : 0,
						pKid->GetActualLayoutWidth(), pKid->GetActualLayoutHeight(),
						flKidOp,
						pKid->AccessStyle()->BIsTransparentWithNoOpacityTransition() ? 1 : 0,
						pKid->GetChildCount() );
					// Dump MainMenu's direct children (container / popups / …) — empty paint lives here.
					if ( pKid->GetID() && !V_stricmp( pKid->GetID(), "MainMenu" ) )
					{
						const int nGKids = pKid->GetChildCount();
						for ( int g = 0; g < nGKids && g < 12; ++g )
						{
							CUIPanel *pG = static_cast< CUIPanel * >( pKid->AccessChildren()[g] );
							if ( !pG )
								continue;
							float flGOp = 1.0f;
							pG->AccessStyle()->GetOpacity( flGOp );
							Msg( "PanPaint GCHILD #%d id=%s type=%s vis=%d size=%.0fx%.0f opacity=%.4f transparent=%d kids=%d classes?\n",
								nLap,
								pG->GetID() ? pG->GetID() : "?",
								pG->GetPanelType().String(),
								pG->BIsVisible() ? 1 : 0,
								pG->GetActualLayoutWidth(), pG->GetActualLayoutHeight(),
								flGOp,
								pG->AccessStyle()->BIsTransparentWithNoOpacityTransition() ? 1 : 0,
								pG->GetChildCount() );
							// One more level for the container (navbar / background live under MainMenuInput).
							if ( pG->GetID() && !V_stricmp( pG->GetID(), "MainMenuContainerPanel" ) )
							{
								const int nGG = pG->GetChildCount();
								for ( int gg = 0; gg < nGG && gg < 8; ++gg )
								{
									CUIPanel *pGG = static_cast< CUIPanel * >( pG->AccessChildren()[gg] );
									if ( !pGG )
										continue;
									float flGGOp = 1.0f;
									pGG->AccessStyle()->GetOpacity( flGGOp );
									Msg( "PanPaint GGCHILD #%d id=%s type=%s vis=%d size=%.0fx%.0f opacity=%.4f transparent=%d kids=%d\n",
										nLap,
										pGG->GetID() ? pGG->GetID() : "?",
										pGG->GetPanelType().String(),
										pGG->BIsVisible() ? 1 : 0,
										pGG->GetActualLayoutWidth(), pGG->GetActualLayoutHeight(),
										flGGOp,
										pGG->AccessStyle()->BIsTransparentWithNoOpacityTransition() ? 1 : 0,
										pGG->GetChildCount() );
									if ( pGG->GetID() && !V_stricmp( pGG->GetID(), "MainMenuInput" ) )
									{
										for ( int ggg = 0; ggg < pGG->GetChildCount() && ggg < 8; ++ggg )
										{
											CUIPanel *pIn = static_cast< CUIPanel * >( pGG->AccessChildren()[ggg] );
											if ( !pIn )
												continue;
											float flInOp = 1.0f;
											pIn->AccessStyle()->GetOpacity( flInOp );
											CUILength x, y, z;
											pIn->AccessStyle()->GetInterpolatedPosition( x, y, z, false );
											Msg( "PanPaint INPUTKID #%d id=%s type=%s vis=%d size=%.0fx%.0f desired=%.0fx%.0f opacity=%.4f transparent=%d kids=%d pos=%.1f,%.1f rawOff=%.1f,%.1f\n",
												nLap,
												pIn->GetID() ? pIn->GetID() : "?",
												pIn->GetPanelType().String(),
												pIn->BIsVisible() ? 1 : 0,
												pIn->GetActualLayoutWidth(), pIn->GetActualLayoutHeight(),
												pIn->GetDesiredLayoutWidth(), pIn->GetDesiredLayoutHeight(),
												flInOp,
												pIn->AccessStyle()->BIsTransparentWithNoOpacityTransition() ? 1 : 0,
												pIn->GetChildCount(),
												x.GetValue(), y.GetValue(),
												pIn->GetRawActualXOffset(), pIn->GetRawActualYOffset() );
											if ( pIn->GetID() && !V_stricmp( pIn->GetID(), "MainMenuCore" ) )
											{
												for ( int c = 0; c < pIn->GetChildCount() && c < 6; ++c )
												{
													CUIPanel *pCoreKid = static_cast< CUIPanel * >( pIn->AccessChildren()[c] );
													if ( !pCoreKid )
														continue;
													float flCOp = 1.0f;
													pCoreKid->AccessStyle()->GetOpacity( flCOp );
													Msg( "PanPaint COREKID #%d id=%s type=%s vis=%d size=%.0fx%.0f opacity=%.4f kids=%d\n",
														nLap,
														pCoreKid->GetID() ? pCoreKid->GetID() : "?",
														pCoreKid->GetPanelType().String(),
														pCoreKid->BIsVisible() ? 1 : 0,
														pCoreKid->GetActualLayoutWidth(), pCoreKid->GetActualLayoutHeight(),
														flCOp, pCoreKid->GetChildCount() );
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			const int nCmdsBefore = CountPaintCmds();
			bool bShouldUseForceBuiltCaches = UIEngine()->BShouldUseForceBuiltPaintCmdCaches();
			pPanel->PaintTraverse( NULL, bShouldUseForceBuiltCaches );
			++nPainted;
			if ( bLogRoot )
			{
				const int nCmdsAfter = CountPaintCmds();
				Msg( "PanPaint ROOT after  #%d pri=%d id=%s deltaCmds=%d totalCmds=%d\n",
					nLap, nPri, pPanel->GetID() ? pPanel->GetID() : "?", nCmdsAfter - nCmdsBefore, nCmdsAfter );
				if ( nCmdsAfter <= nCmdsBefore && pPanel->GetActualLayoutWidth() > 1.0f && pPanel->GetActualLayoutHeight() > 1.0f )
					Warning( "PanPaint ROOT emitted ZERO draw cmds id=%s (opacity/size/visibility skip?)\n",
						pPanel->GetID() ? pPanel->GetID() : "?" );
				// Dump command-type histogram for the slice this root added.
				if ( bMainMenuRoot )
				{
					int hist[64];
					V_memset( hist, 0, sizeof( hist ) );
					int idx = 0;
					for ( RenderCommand_t *pCmd = m_pRenderEngine->GetCurrentCommandList().GetFirstCommand(); pCmd; pCmd = pCmd->pNextRenderCommand, ++idx )
					{
						if ( pCmd->eCommandType < 64 )
							hist[pCmd->eCommandType]++;
					}
					Msg( "PanPaint CMDS #%d Begin=%d Clear=%d PushCtx=%d PopCtx=%d PushComp=%d PopComp=%d Fill=%d Tex=%d Text=%d Nested=%d NestedList=%d End=%d total=%d\n",
						nLap,
						hist[k_EBeginFrame], hist[k_EClearBackBuffer],
						hist[k_EPushAnimationAndTransformContext], hist[k_EPopAnimationAndTransformContext],
						hist[k_EPushCompositingLayer], hist[k_EPopCompositingLayer],
						hist[k_EDrawFilledRect], hist[k_ECmdDrawTexturedRect], hist[k_EDrawTextRegion],
						hist[k_ENestedCommand], hist[k_ENestedCommandList],
						hist[k_EEndFrame], nCmdsAfter );
				}
			}
		}
		m_bInPaintTraverse = false;
		if ( nChain > 0 && ( nPri == 1002 || nChain >= 2 ) && ( nLap <= 40 || ( nLap % 120 ) == 0 || nPainted == 0 ) )
		{
			const int nCmdsAfterRoots = CountPaintCmds();
			Msg( "PanPaint LayoutAndPaint TRAVERSE #%d pri=%d paintedRoots=%d cmdsBefore=%d cmdsAfter=%d\n",
				nLap, nPri, nPainted, nCmdsBeforeRoots, nCmdsAfterRoots );
		}

		if ( s_convarShowPanoramaFPS.GetBool())
		{
			float flPaint, flAnimate, flRender;
			m_pRenderEngine->GetFPSAverages( flPaint, flAnimate, flRender );

			char rgchFPS[10];

			CFmtStr strFPS( "Layout FPS:	%1.2f\n"
				"Animate FPS:	%1.2f\n"
				"Render FPS:	%1.2f\n",  flPaint, flAnimate, flRender );

			uint32 unTextColor = Color( 0xd2, 0x5f, 0x5f, 0xe0 ).AsUint32();

			m_pRenderEngine->PushAnimationAndTransformContext( 0, 0, 0, 1000, 1000, NULL, true, false, k_EPanelRepaintFull, false, false, false, false, true, false, nullptr, false, false, false, false, k_EFractionalPixelPositionsDefault );

			m_pRenderEngine->DrawSolidColorTextRegion( "Layout FPS:", "Arial", unTextColor, 
											 16.0, 16.0, k_EFontWeightBold, k_EFontStyleNormal, k_ETextAlignLeft, k_ETextDecorationNone, 
											 false, false, 0, 20.0f, 20.0f, 300.0f, 100.0f );

			V_snprintf( rgchFPS, V_ARRAYSIZE( rgchFPS ), "%1.1f", flPaint );
			for( uint32 i=0; i < (uint32)V_strlen( rgchFPS ); ++i )
			{
				m_pRenderEngine->DrawSolidColorTextRegion( CFmtStr( "%c", rgchFPS[ i ] ).String(), "Arial", unTextColor,
					16.0, 16.0, k_EFontWeightBold, k_EFontStyleNormal, k_ETextAlignLeft, k_ETextDecorationNone, 
					false, false, 0, 155.0f + i*10.0f, 20.0f, 300.0f, 100.0f );
			}

			m_pRenderEngine->DrawSolidColorTextRegion( "Animate FPS:", "Arial", unTextColor,
				16.0, 16.0, k_EFontWeightBold, k_EFontStyleNormal, k_ETextAlignLeft, k_ETextDecorationNone, 
				false, false, 0, 20.0f, 38.0f, 300.0f, 100.0f );

			V_snprintf( rgchFPS, V_ARRAYSIZE( rgchFPS ), "%1.1f", flAnimate );
			for( uint32 i=0; i < (uint32)V_strlen( rgchFPS ); ++i )
			{
				m_pRenderEngine->DrawSolidColorTextRegion( CFmtStr( "%c", rgchFPS[ i ] ).String(), "Arial", unTextColor,
					16.0, 16.0, k_EFontWeightBold, k_EFontStyleNormal, k_ETextAlignLeft, k_ETextDecorationNone, 
					false, false, 0, 155.0f + i*10.0f, 38.0f, 300.0f, 100.0f );
			}

			m_pRenderEngine->DrawSolidColorTextRegion( "Render FPS:", "Arial", unTextColor,
				16.0, 16.0, k_EFontWeightBold, k_EFontStyleNormal, k_ETextAlignLeft, k_ETextDecorationNone, 
				false, false, 0, 20.0f, 56.0f, 300.0f, 100.0f );

			V_snprintf( rgchFPS, V_ARRAYSIZE( rgchFPS ), "%1.1f", flRender );
			for( uint32 i=0; i < (uint32)V_strlen( rgchFPS ); ++i )
			{
				m_pRenderEngine->DrawSolidColorTextRegion( CFmtStr( "%c", rgchFPS[ i ] ).String(), "Arial", unTextColor,
					16.0, 16.0, k_EFontWeightBold, k_EFontStyleNormal, k_ETextAlignLeft, k_ETextDecorationNone, 
					false, false, 0, 155.0f + i*10.0f, 56.0f, 300.0f, 100.0f );
			}

			m_pRenderEngine->PopAnimationAndTransformContext( 0 );
		}

		m_pUIEngineParent->DrawEventStats(m_pRenderEngine);
		UIWindowInput()->DrawInputDebugInfo();

		// End the frame and swap buffers
		m_pRenderEngine->EndFrame();
	}	

}


//-----------------------------------------------------------------------------
// Purpose: Add a panel
//-----------------------------------------------------------------------------
int CTopLevelWindow::AddPanel( CUIPanel *pPanel, bool bVisible )
{
	AssertMsg( !m_bInPaintTraverse, "Should not add panels in paint traverse" );
	AssertMsg( !m_bInLayoutTraverse, "Should not add panels in layout traverse" );

	int iPanelIndex;
	if ( bVisible )
	{
		iPanelIndex = m_listVisiblePanels.AddToTail( pPanel );
	}
	else
	{
		iPanelIndex = m_listInvisiblePanels.AddToTail( pPanel );
	}

	m_vecPanelsAddClasses.AddToTail( pPanel );

	return iPanelIndex;
}


//-----------------------------------------------------------------------------
// Purpose: Remove a panel
//-----------------------------------------------------------------------------
void CTopLevelWindow::RemovePanel( int iPanelIndex, bool bVisible )
{
	AssertMsg( !m_bInPaintTraverse, "Should not remove panels in paint traverse" );
	AssertMsg( !m_bInLayoutTraverse, "Should not remove panels in layout traverse" );

	CUIPanel *pPanel;
	if ( bVisible )
	{
		pPanel = m_listVisiblePanels.Element( iPanelIndex );
		m_listVisiblePanels.Remove( iPanelIndex );
	}
	else
	{
		pPanel = m_listInvisiblePanels.Element( iPanelIndex );
		m_listInvisiblePanels.Remove( iPanelIndex );
	}

	// Classes have to be removed from panels asychronously since a call
	// to RemoveClasses() can result in SetPanelVisible() getting called.
	m_vecPanelsRemoveClasses.AddToTail( pPanel );
}


//-----------------------------------------------------------------------------
// Purpose: Change visibility of a panel
//-----------------------------------------------------------------------------
int CTopLevelWindow::SetPanelVisible( int iPanelIndex, bool bVisible )
{
	AssertMsg( !m_bInPaintTraverse, "Should not add/remove panels in paint traverse" );
	AssertMsg( !m_bInLayoutTraverse, "Should not add/remove panels in layout traverse" );

	if ( bVisible )
	{
		CUIPanel *pPanel = m_listInvisiblePanels.Element( iPanelIndex );
		m_listInvisiblePanels.Remove( iPanelIndex );
		return m_listVisiblePanels.AddToTail( pPanel );
	}
	else
	{
		CUIPanel *pPanel = m_listVisiblePanels.Element( iPanelIndex );
		m_listVisiblePanels.Remove( iPanelIndex );
		return m_listInvisiblePanels.AddToTail( pPanel );
	}
}


//-----------------------------------------------------------------------------
// Purpose: Add a class to all top level panels
//-----------------------------------------------------------------------------
void CTopLevelWindow::AddClass( const char *pchName )
{
	CPanoramaSymbol sym( pchName );
	if ( !m_vecStyleClasses.HasElement( sym ) )
	{
		m_vecStyleClasses.AddToTail( sym );

		int iList = m_listVisiblePanels.Head();
		while( iList != m_listVisiblePanels.InvalidIndex() )
		{
			CUIPanel *pPanel = m_listVisiblePanels[iList];

			// Get the next linked list item before we call AddClass, as adding class could cause the list to change
			iList = m_listVisiblePanels.Next( iList );

			pPanel->AddClass( sym );
		}

		iList = m_listInvisiblePanels.Head();
		while( iList != m_listInvisiblePanels.InvalidIndex() )
		{
			CUIPanel *pPanel = m_listInvisiblePanels[iList];

			// Get the next linked list item before we call AddClass, as adding class could cause the list to change
			iList = m_listInvisiblePanels.Next( iList );

			pPanel->AddClass( sym );
		}
	}
}


//-----------------------------------------------------------------------------
// Purpose: Remove a class from all top level panels
//-----------------------------------------------------------------------------
void CTopLevelWindow::RemoveClass( const char *pchName )
{
	CPanoramaSymbol sym( pchName );
	if ( m_vecStyleClasses.FindAndFastRemove( sym ) )
	{
		int iList = m_listVisiblePanels.Head();
		while( iList != m_listVisiblePanels.InvalidIndex() )
		{
			CUIPanel *pPanel = m_listVisiblePanels[iList];

			// Get the next linked list item before we call RemoveClass, as removing class could cause the list to change
			iList = m_listVisiblePanels.Next( iList );

			pPanel->RemoveClass( sym );
		}

		iList = m_listInvisiblePanels.Head();
		while( iList != m_listInvisiblePanels.InvalidIndex() )
		{
			CUIPanel *pPanel = m_listInvisiblePanels[iList];

			// Get the next linked list item before we call RemoveClass, as removing class could cause the list to change
			iList = m_listInvisiblePanels.Next( iList );

			pPanel->RemoveClass( sym );
		}
	}
}


//-----------------------------------------------------------------------------
// Purpose:
//-----------------------------------------------------------------------------
void CTopLevelWindow::SetHasClass( const char *pchName, bool bHasClass )
{
	if ( bHasClass )
	{
		AddClass( pchName );
	}
	else
	{
		RemoveClass( pchName );
	}
}


//-----------------------------------------------------------------------------
// Purpose: Get access to the fast scroll mgr
//-----------------------------------------------------------------------------
CFastScrollSoundManager * CTopLevelWindow::AccessFastScrollSoundMgr()
{
	if ( !m_pFastScrollSoundManager )
		m_pFastScrollSoundManager = new CFastScrollSoundManager();

	return m_pFastScrollSoundManager;
}

//-----------------------------------------------------------------------------
// Purpose: Performs a layout pass
//-----------------------------------------------------------------------------
void CTopLevelWindow::PerformLayout()
{
	VPROF_BUDGET( "CTopLevelWindow::PerformLayout", VPROF_BUDGETGROUP_TENFOOT );

	// layout pass
	m_bInLayoutTraverse = true;
	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		CUIPanel *pPanel = m_listVisiblePanels[i];

		// run both passes on the panel
		pPanel->DesiredLayoutSizeTraverse( GetSurfaceWidth(), GetSurfaceHeight() );
		pPanel->LayoutTraverse( 0, 0, GetSurfaceWidth(), GetSurfaceHeight() );

		UISoundSystem()->ServiceAudio();
	}
	m_bInLayoutTraverse = false;
}


//-----------------------------------------------------------------------------
// Purpose: Tells all panels to reload the specified layout file if needed
//-----------------------------------------------------------------------------
void CTopLevelWindow::ReloadLayoutFile( CPanoramaSymbol symPath )
{
	// style changes could change visibility, so copy lists
	CUtlVector< CPanelPtr< CUIPanel > > vecTopLevelPanels;
	vecTopLevelPanels.EnsureCapacity( m_listVisiblePanels.Count() + m_listInvisiblePanels.Count() );
	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		vecTopLevelPanels.AddToTail( m_listVisiblePanels.Element( i ) );
	}
	FOR_EACH_LL( m_listInvisiblePanels, i )
	{
		vecTopLevelPanels.AddToTail( m_listInvisiblePanels.Element( i ) );
	}

	// reload
	FOR_EACH_VEC_BACK( vecTopLevelPanels, i )
	{
		if ( vecTopLevelPanels[i].Get() )
			vecTopLevelPanels[i]->BReloadLayout( symPath );
	}
}


//-----------------------------------------------------------------------------
// Purpose: Tells all panels that a style file has been reloaded
//-----------------------------------------------------------------------------
void CTopLevelWindow::OnReloadStyleFile( CPanoramaSymbol symPath )
{
	// style changes could change visibility, so copy lists
	CUtlVector< CPanelPtr< CUIPanel > > vecTopLevelPanels;
	vecTopLevelPanels.EnsureCapacity( m_listVisiblePanels.Count() + m_listInvisiblePanels.Count() );
	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		vecTopLevelPanels.AddToTail( m_listVisiblePanels.Element( i ) );
	}
	FOR_EACH_LL( m_listInvisiblePanels, i )
	{
		vecTopLevelPanels.AddToTail( m_listInvisiblePanels.Element( i ) );
	}

	// reload
	FOR_EACH_VEC_BACK( vecTopLevelPanels, i )
	{
		if ( vecTopLevelPanels[i].Get() )
			vecTopLevelPanels[i]->ReloadStyleFileTraverse( symPath );
	}
}


//-----------------------------------------------------------------------------
// Purpose: Converts a coordinate from client coordinates to surface coordinates
//-----------------------------------------------------------------------------
void CTopLevelWindow::ConvertClientToSurfaceCoord( float *px, float *py )
{
	// convert
	ConvertClientCoordinatesToSurface( px, py, m_unWindowWidth, m_unWindowHeight, m_unSurfaceWidth, m_unSurfaceHeight, m_bEnforceWindowAspectRatio );
}


//-----------------------------------------------------------------------------
// Purpose: return the image for the current cursor
//-----------------------------------------------------------------------------
IImageSource *CTopLevelWindow::GetMouseCursorTexture( Vector2D *pptHotspot )
{
	return m_pMouseCursor->GetTexture( m_eCursorCurrent, pptHotspot );
}


//-----------------------------------------------------------------------------
// Purpose: programatically wakeup and reset timeout for mouse cursor
//-----------------------------------------------------------------------------
void CTopLevelWindow::WakeupMouseCursor()
{
	if ( !m_pRenderEngine )
		return;

	m_pRenderEngine->Access3DSurface()->WakeupMouseCursor();
}


//-----------------------------------------------------------------------------
// Purpose: programmatically fadeout mouse cursor now
//-----------------------------------------------------------------------------
void CTopLevelWindow::FadeOutCursorNow()
{
	if ( !m_pRenderEngine )
		return;

	m_pRenderEngine->Access3DSurface()->FadeOutCursorNow();
}

//-----------------------------------------------------------------------------
// Purpose: return the visibility of the mouse cursor
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BCursorVisible()
{
	if ( !m_pRenderEngine )
		return true; // render engine isn't initialized yet, lets just say it is visible

	return m_pRenderEngine->Access3DSurface()->BCursorVisible();
}

//-----------------------------------------------------------------------------
// Purpose: If the specified text region doesn't exist in the "text layout draw cache", 
// kick off an async job to populate it
//-----------------------------------------------------------------------------
void CTopLevelWindow::AsyncAddTextRegionToCache( const DrawTextRegionRenderCommand_t &renderCommand )
{
	if( !m_pRenderEngine )
		return;

	m_pRenderEngine->Access3DSurface()->AsyncAddTextRegionToCache( renderCommand );
}

//-----------------------------------------------------------------------------
// Purpose:
//-----------------------------------------------------------------------------
void CTopLevelWindow::EnableControllerCursor( bool bEnable )
{
	if( m_pCursorRender )
	{
		if( bEnable )
		{
			m_pCursorRender->SetHideOnGamepadActivity( false );
			m_pCursorRender->UseHardwareCursorPositionForRendering( false );
			m_pCursorRender->WakeupMouseCursor();
		}
		else
		{
			m_pCursorRender->SetHideOnGamepadActivity( true );
			m_pCursorRender->UseHardwareCursorPositionForRendering( true );
			m_pCursorRender->FadeOutCursorNow();
		}
	}
}


//-----------------------------------------------------------------------------
// Purpose:
//-----------------------------------------------------------------------------
void CTopLevelWindow::SetHideCursorOnInactivity( bool bHide )
{
	if( m_pCursorRender )
	{
		m_pCursorRender->SetHideOnInactivity( bHide );
	}
}


//-----------------------------------------------------------------------------
// Purpose:
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BIsControllerCursorEnabled()
{
	if( !m_pCursorRender )
		return true;
	
	return !m_pCursorRender->BHideOnGamepadActivity();
}

// Purpose: main engine is telling us a file changed
//-----------------------------------------------------------------------------
void CTopLevelWindow::ReloadChangedFile( const char *pchFile )
{
	m_pRenderEngine->ReloadChangedFile( pchFile );
}


//-----------------------------------------------------------------------------
// Purpose: Set the full screen hardware state, if render target supports it
//-----------------------------------------------------------------------------
bool CTopLevelWindow::SetFullscreen( bool bFullscreen )
{
	if ( m_eRenderTarget == IUIEngine::k_ERenderFullScreen )
	{
		if ( !bFullscreen )
			m_eRenderTarget = IUIEngine::k_ERenderToWindow;
		return true;
	}

	if ( m_eRenderTarget == IUIEngine::k_ERenderToWindow )
	{
		if ( bFullscreen )
			m_eRenderTarget = IUIEngine::k_ERenderFullScreen;
		return true;
	}

	return false;
}


//-----------------------------------------------------------------------------
// Purpose: Track mouse wheel repeats
//-----------------------------------------------------------------------------
void CTopLevelWindow::GetMouseWheelRepeats( bool bScrollUp, int lines, uint8 &unRepeats )
{
	uint8 repeats = 0;
	if ( bScrollUp )
	{
		if ( UIEngine()->GetCurrentFrameTime() - m_flLastMouseWheelUp < 0.45f )
		{
			repeats = m_unMouseWheelUpRepeats;
			m_unMouseWheelUpRepeats += 1;
		}
		else
		{
			repeats = m_unMouseWheelUpRepeats = 0;
		}
		m_flLastMouseWheelUp = UIEngine()->GetCurrentFrameTime();
	}
	else
	{
		if ( UIEngine()->GetCurrentFrameTime() - m_flLastMouseWheelDown < 0.45f )
		{
			repeats = m_unMouseWheelDownRepeats;
			m_unMouseWheelDownRepeats += 1;
		}
		else
		{
			repeats = m_unMouseWheelDownRepeats = 0;
		}
		m_flLastMouseWheelDown = UIEngine()->GetCurrentFrameTime();
	}
	unRepeats = repeats;
}


//-----------------------------------------------------------------------------
// Purpose: get current fps values
//-----------------------------------------------------------------------------
void CTopLevelWindow::GetFPSAverages( float &fpsPaint, float &fpsAnimation, float &fpsRender )
{ 
	m_pRenderEngine->GetFPSAverages( fpsPaint, fpsAnimation, fpsRender );
}


//-----------------------------------------------------------------------------
// Purpose: get fps values from the whole processes lifetime
//-----------------------------------------------------------------------------
void CTopLevelWindow::GetSessionFPSAverages( float &fpsPaint, float &fpsAnimation, float &fpsRender )
{ 
	m_pRenderEngine->GetSessionFPSAverages( fpsPaint, fpsAnimation, fpsRender );
}


//-----------------------------------------------------------------------------
// Purpose: return if a gamepad was plugged in at all this session
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BWasGamepadConnectedThisSession()
{
	return UIWindowInput()->BWasGamepadConnectedThisSession();
}


//-----------------------------------------------------------------------------
// Purpose: true if we saw input from a gamepad
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BWasGamepadUsedThisSession()
{
	return UIWindowInput()->BWasGamepadUsedThisSession();
}

//-----------------------------------------------------------------------------
// Purpose: return if a steam controller was plugged in at all this session
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BWasSteamControllerConnectedThisSession()
{
	return UIWindowInput()->BWasSteamControllerConnectedThisSession();
}


//-----------------------------------------------------------------------------
// Purpose: true if we saw input from a steam controller
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BWasSteamControllerUsedThisSession()
{
	return UIWindowInput()->BWasSteamControllerUsedThisSession();
}


//-----------------------------------------------------------------------------
// Purpose: get number of periods that saw an fps below our cutoff
//-----------------------------------------------------------------------------
void CTopLevelWindow::GetNumPeriodsBelowMinFPS( int &nSlowPeriods )
{ 
	m_pRenderEngine->GetNumPeriodsBelowMinFPS( nSlowPeriods );
}


//-----------------------------------------------------------------------------
// Purpose: accrue in the WPM measurement from using the daisywheel
//-----------------------------------------------------------------------------
void CTopLevelWindow::RecordDaisyWheelUsage( float flEntryTimeInSeconds, int nWordsEntered, bool bViaKeyboard, bool bViaGamepad )
{
	if ( bViaKeyboard && bViaGamepad )
	{
		m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardAndGamePad].nWords = nWordsEntered;
		m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardAndGamePad].flTime = flEntryTimeInSeconds;
	}
	else if ( bViaGamepad )
	{
		m_flDaisyWheelWPM[eDaisyWheelInputType_GamepadOnly].nWords = nWordsEntered;
		m_flDaisyWheelWPM[eDaisyWheelInputType_GamepadOnly].flTime = flEntryTimeInSeconds;
	}
	else
	{
		m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardOnly].nWords = nWordsEntered;
		m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardOnly].flTime = flEntryTimeInSeconds;
	}
}


//-----------------------------------------------------------------------------
// Purpose: report the daisy wheel wpm measurements
//-----------------------------------------------------------------------------
void CTopLevelWindow::GetDaisyWheelWPM( int &nWordsTyped, float &flMixedWPM, float &flKeyboardOnlyWPM, float &flGamepadOnlyWPM )
{
	nWordsTyped = m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardAndGamePad].nWords + m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardOnly].nWords + m_flDaisyWheelWPM[eDaisyWheelInputType_GamepadOnly].nWords;
	flMixedWPM = flKeyboardOnlyWPM = flGamepadOnlyWPM = 0.0f;
	if ( m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardAndGamePad].flTime > 0.0f )
		flMixedWPM = m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardAndGamePad].nWords/(m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardAndGamePad].flTime/60.0f);
	if ( m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardOnly].flTime > 0.0f )
		flKeyboardOnlyWPM = m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardOnly].nWords/(m_flDaisyWheelWPM[eDaisyWheelInputType_KeyboardOnly].flTime/60.0f);
	if ( m_flDaisyWheelWPM[eDaisyWheelInputType_GamepadOnly].flTime > 0.0f )
		flGamepadOnlyWPM =m_flDaisyWheelWPM[eDaisyWheelInputType_GamepadOnly].nWords/(m_flDaisyWheelWPM[eDaisyWheelInputType_GamepadOnly].flTime/60.0f);
}


//-----------------------------------------------------------------------------
// Purpose: another game has launched, an may be fullscreen, so do what you need
//-----------------------------------------------------------------------------
void CTopLevelWindow::SetInhibitInput( bool bInhibitInput )
{
	m_bInhibitInput = bInhibitInput;
}


//-----------------------------------------------------------------------------
// Purpose: all running games have quit, so put yourself back on top if wanted
//-----------------------------------------------------------------------------
void CTopLevelWindow::SetPreventForceWindowOnTop( bool bPreventForceTopLevel )
{
	REFERENCE( bPreventForceTopLevel ); // do nothing by default
}


//-----------------------------------------------------------------------------
// Purpose: Can be used to disable all input events temporarily, overriden
// for overlay for overlay window focused but inactive case
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BAllowInput( InputMessage_t &msg )
{
	// Always allow guide button input
	if ( BIsGuideButton( msg ) )
		return true;

	return !m_bInhibitInput;
}


//-----------------------------------------------------------------------------
// Purpose: Return true if guide button
//-----------------------------------------------------------------------------
bool CTopLevelWindow::BIsGuideButton( const InputMessage_t &msg )
{
	if ( msg.m_eInputType == k_eGamePadDown || msg.m_eInputType == k_eGamePadUp )
	{
		if ( msg.m_GamePadData.m_eSource == panorama::k_ePanelEventSourceGamepad )
		{
			if ( msg.m_GamePadData.m_GamePadCode == XK_BUTTON_GUIDE || msg.m_GamePadData.m_GamePadCode == STEAM_BUTTON_GUIDE )
				return true;
		}
	}
	return false;
}


//-----------------------------------------------------------------------------
// Purpose: Set window priority and update
//-----------------------------------------------------------------------------
void CTopLevelWindow::SetWindowPriority( int nPriority )
{
	m_nWindowPriority = nPriority;

	if ( m_pInputEngine )
	{
		m_pInputEngine->GotWindowFocus();
	}
}


//-----------------------------------------------------------------------------
// Purpose: Invalidate all top level panels
//-----------------------------------------------------------------------------
void CTopLevelWindow::ForceFullRepaint()
{
	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		m_listVisiblePanels[ i ]->SetRepaintRecursive( k_EPanelRepaintFull );
	}

	FOR_EACH_LL( m_listInvisiblePanels, i )
	{
		m_listInvisiblePanels[ i ]->SetRepaintRecursive( k_EPanelRepaintFull );
	}
}


//-----------------------------------------------------------------------------
// Purpose: Create a panel within this window
//-----------------------------------------------------------------------------
CUIPanel *CTopLevelWindow::CreatePanel()
{
	CUIPanel *pPanel = m_PanelPool.Alloc();
	//PANORAMA_USE_S1WRAPPER - Constructor called in CClassMemoryPool
	// Construct( pPanel );
	return pPanel;
}


//-----------------------------------------------------------------------------
// Purpose: Delete a panel from within this window
//-----------------------------------------------------------------------------
void CTopLevelWindow::FreePanel( CUIPanel *pPanel )
{
	//PANORAMA_USE_S1WRAPPER - Destructor called in CClassMemoryPool
	// Destruct( pPanel );
	m_PanelPool.Free( pPanel );
}

#ifdef DBGFLAG_VALIDATE
//-----------------------------------------------------------------------------
// Purpose: prepare to validate mem, pause some threads
//-----------------------------------------------------------------------------
bool CTopLevelWindow::PrepareForValidate()
{
	return m_pRenderEngine->PauseAnimationAndRenderThreadForValidate();
}


//-----------------------------------------------------------------------------
// Purpose: done validating, resume all threads	
//-----------------------------------------------------------------------------
bool CTopLevelWindow::ResumeFromValidate()
{
	return m_pRenderEngine->ResumeAnimationAndRenderThreadFromValidate();
}


//-----------------------------------------------------------------------------
// Purpose: validate mem
//-----------------------------------------------------------------------------
void CTopLevelWindow::Validate( CValidator &validator, const char *pchName )
{
	VALIDATE_SCOPE();

	ValidateObj( m_strTargetMonitor );
	ValidateObj( m_vecStyleClasses );
	ValidateObj( m_vecPanelsRemoveClasses );
	ValidateObj( m_vecPanelsAddClasses );

	ValidatePtr( m_pInputEngine );
	ValidatePtr( m_pRenderEngine );

	ValidateObj( m_listVisiblePanels );
	FOR_EACH_LL( m_listVisiblePanels, i )
	{
		ValidatePtr( m_listVisiblePanels[i] );
	}

	ValidateObj( m_listInvisiblePanels );
	FOR_EACH_LL( m_listInvisiblePanels, i )
	{
		ValidatePtr( m_listInvisiblePanels[i] );
	}

	validator.ClaimMemory( m_pMouseCursor );
	validator.ClaimMemory( m_pCursorRender );
	ValidatePtr( m_pImageResourceManager );

	validator.ClaimMemory( m_pFastScrollSoundManager );
}
#endif
