'use strict';


var EndOfMatch = ( function () {

    var _m_cP = $( "#EndOfMatch" );
    _m_cP.AddClass( "eom--fade-in-enabled" );

	var _m_arrPanelObjects = [];
	var _m_currentPanelIndex;
	var _m_jobStart = null;
	var _m_elActiveTab;
	var _m_scoreboardVisible = false;
	var _m_bEomActive = false;

	function _DefaultScoreboardVisibleForMode()
	{
		try
		{
			var mode = GameStateAPI.GetGameModeInternalName( false ) || '';
			return ( mode === 'cooperative' || mode === 'coopmission' );
		}
		catch ( e )
		{
			return false;
		}
	}

	function _SetScoreboardVisible( bVisible )
	{
		_m_scoreboardVisible = bVisible;
		_m_cP.SetHasClass( 'scoreboard-visible', _m_scoreboardVisible );
	}


	function _NavigateToTab( tab )
	{
		                                             

		if ( _m_elActiveTab )
		{
			_m_elActiveTab.RemoveClass( 'eom-panel--active' );
		}
	
		_m_elActiveTab = _m_cP.FindChildTraverse( tab );
	
		if( _m_elActiveTab )
		{
			_m_elActiveTab.AddClass( 'eom-panel--active' );
		}

		if ( _m_bEomActive && tab !== 'eom-win' )
			_SetScoreboardVisible( false );
		
	}

	function _SwitchToPanel( tab )
	{
		_m_cP.FindChildTraverse( 'rb--' + tab ).RemoveClass("hidden");
		_m_cP.FindChildTraverse( 'rb--' + tab ).checked = true;
		_NavigateToTab( tab );

		if ( tab === 'eom-win' )
			_SetScoreboardVisible( _DefaultScoreboardVisibleForMode() );
		else
			_SetScoreboardVisible( false );
	}

	function _RegisterPanelObject ( panel )
	{
		for ( var i = 0; i < _m_arrPanelObjects.length; i++ )
		{
			if ( _m_arrPanelObjects[ i ].name === panel.name )
				return;
		}
		_m_arrPanelObjects.push( panel );
	}


	function _Initialize()
	{

		if ( _m_arrPanelObjects )
			_m_arrPanelObjects.length = 0;
			
		_m_currentPanelIndex = -1;
		_m_elActiveTab = null;

		if ( _m_jobStart !== null )
		{
			$.CancelScheduled( _m_jobStart );
			_m_jobStart = null;
		}

                                                              
		var elLayout = _m_cP.FindChildTraverse( "id-eom-layout" );
		elLayout.RemoveAndDeleteChildren();
		elLayout.BLoadLayoutSnippet( "snippet-eom-layout--default" );

		_m_cP.FindChildrenWithClassTraverse( "timer" ).forEach( el => el.active = false );

		_SetScoreboardVisible( _DefaultScoreboardVisibleForMode() );

                          
		var elNavBar = _m_cP.FindChildTraverse( "id-content-navbar__tabs" );
		elNavBar.RemoveAndDeleteChildren();
		_m_cP.FindChildrenWithClassTraverse( "eom-panel" ).forEach( function ( elPanel )
		{
                                       
            var elRBtn = $.CreatePanel( "RadioButton", elNavBar, "rb--" + elPanel.id );
            elRBtn.BLoadLayoutSnippet( "snippet_navbar-button" );
            elRBtn.AddClass( "navbar-button");
            elRBtn.AddClass( "appear");

            elRBtn.SetPanelEvent( 'onactivate', _NavigateToTab.bind( undefined, elPanel.id ) );
            elRBtn.FindChildTraverse( "id-navbar-button__label" ).text = $.Localize( elPanel.id );
		} );
	}

	function _ToggleBetweenScoreboardAndCharacters ()
	{
		if ( !_m_bEomActive )
			return;

		_m_scoreboardVisible = !_m_scoreboardVisible;
		_SetScoreboardVisible( _m_scoreboardVisible );

		if ( _m_scoreboardVisible )
			$.DispatchEvent( 'Scoreboard_OnMouseActive' );
	}

	function _EnableToggleBetweenScoreboardAndCharacters ()
	{
		_SetScoreboardVisible( _m_scoreboardVisible );
	}

	function _ShowPanelStart()
	{
	    if ( !_m_cP || !_m_cP.IsValid() )
	        return;

	    var elBlur = _m_cP.GetParent().FindChildTraverse( "HudBlur" );
	    elBlur.AddClass( "eom-blur-fade-in" );
	    _m_cP.AddClass( "eom--reveal" );

		if ( typeof EOM_Characters !== 'undefined' && _m_cP.FindChildTraverse( 'id-eom-characters-root' ) )
		{
			EOM_Characters.Start();
		}

	    _m_cP.SetMouseCapture( true );
	}


	function _Start ( bHardCut ) 
	{
		_m_bEomActive = true;
	    _Initialize();

		if ( bHardCut )
		{
		                                                      
		                                                        
		                                                           
              
                                                                   
		    _m_jobStart = $.Schedule( 0.0, _ => {
		        _m_jobStart = null;
		        _m_cP.RemoveClass( "eom--fade-in-enabled" );
		        _ShowPanelStart();
		        _m_cP.AddClass( "eom--fade-in-enabled" );
		        _WaitForPanelsThenShow( 0 );
		    } );
		}
        else
		{
		    _m_jobStart = $.Schedule( 0.0, _ => {
		        _m_jobStart = null;
		        _ShowPanelStart();
		        $.Schedule( 1.25, function () { _WaitForPanelsThenShow( 0 ); } );
		    } );
		}
	}

	function _StartDisplayTimer ( time )
	{
		var elProgBar = _m_cP.FindChildTraverse( "id-display-timer-progress-bar" );

		        

		$.Schedule( 0.0, function()
		{
			if ( elProgBar && elProgBar.IsValid() )
			{
				elProgBar.style.transitionDuration = "0s";
			
				elProgBar.style.width = '0%';				
			}
		} );

		       

		
		$.Schedule( 0.0, function()
		{
			if ( elProgBar && elProgBar.IsValid() )
			{
				elProgBar.style.transitionDuration = time + "s";

				elProgBar.style.width = '100%';
			}
		} );

	}


	                                                                   

	var _ShouldReturnToLobbyAfterEom = function()
	{
		try
		{
			if ( GameStateAPI.IsDemoOrHltv() )
				return false;
			                                                                                        
			if ( GameStateAPI.IsQueuedMatchmaking && GameStateAPI.IsQueuedMatchmaking() )
				return false;
			var mode = GameStateAPI.GetGameModeInternalName( false ) || '';
			return ( mode === 'competitive' || mode === 'scrimcomp2v2' || mode === 'scrimcomp5v5' );
		}
		catch ( e )
		{
			return false;
		}
	};

	var _ReturnToLobby = function()
	{
		try
		{
			GameInterfaceAPI.ConsoleCommand( 'disconnect' );
		}
		catch ( e ) {}
	};

	var _WaitForPanelsThenShow = function ( attempt )
	{
		var nExpected = _m_cP.FindChildrenWithClassTraverse( "eom-panel" ).length;
		if ( ( nExpected > 0 && _m_arrPanelObjects.length >= nExpected ) || attempt >= 40 )
		{
			if ( _m_arrPanelObjects.length > 0 )
				_ShowNextPanel();
			return;
		}
		$.Schedule( 0.05, function () { _WaitForPanelsThenShow( attempt + 1 ); } );
	};

	var _ShowNextPanel = function ()
	{
	    _m_currentPanelIndex++;
        
		if ( _m_currentPanelIndex < _m_arrPanelObjects.length )
		{
			                                          
			if ( _m_currentPanelIndex === ( _m_arrPanelObjects.length - 1 ) &&
				!GameStateAPI.IsDemoOrHltv() &&
				!GameStateAPI.IsQueuedMatchmaking() )
			{
				_m_cP.FindChildrenWithClassTraverse( "timer" ).forEach( el => el.active = true );
			}	
			
			_m_arrPanelObjects[ _m_currentPanelIndex ].Start();
		}
		else if ( _ShouldReturnToLobbyAfterEom() )
		{
			                                                                 
			$.Schedule( 2.5, _ReturnToLobby );
		}
	}

	function _Shutdown ()
	{
		_m_bEomActive = false;
	    if ( _m_jobStart )
	    {
	        $.CancelScheduled( _m_jobStart );
	        _m_jobStart = null;
	    }

	    for ( var i in _m_arrPanelObjects )
		{
			if ( _m_arrPanelObjects[ i ].Shutdown )
				_m_arrPanelObjects[ i ].Shutdown();
		}	

		             
		var elBlur = _m_cP.GetParent().FindChildTraverse( "HudBlur" );
		elBlur.RemoveClass( "eom-blur-fade-in" );
		_m_cP.RemoveClass( "eom--reveal" );
	}


	                      
	return {

		Initialize			: _Initialize,
		Start				: _Start,
		ShowNextPanel		: _ShowNextPanel,
		SwitchToPanel		: _SwitchToPanel,
		RegisterPanelObject	: _RegisterPanelObject,
		SetScoreboardVisible: _SetScoreboardVisible,
		ToggleBetweenScoreboardAndCharacters: _ToggleBetweenScoreboardAndCharacters,
		EnableToggleBetweenScoreboardAndCharacters: _EnableToggleBetweenScoreboardAndCharacters,
		OnScoreboardOpen	: function ()
		{
			if ( !_m_bEomActive )
				return;
			_ToggleBetweenScoreboardAndCharacters();
		},
		OnScoreboardClose	: function ()
		{
			if ( _m_bEomActive )
				_SetScoreboardVisible( false );
		},
		Shutdown			: _Shutdown,
		StartDisplayTimer	: _StartDisplayTimer,
		
	};

})();


                                                                                                    
                                           
                                                                                                    
(function () {
	$.RegisterForUnhandledEvent( "EndOfMatch_Show", EndOfMatch.Start ); 
	$.RegisterForUnhandledEvent( "EndOfMatch_Shutdown", EndOfMatch.Shutdown );
	$.RegisterForUnhandledEvent( "EndOfMatch_ShowNext", EndOfMatch.ShowNextPanel );
	$.RegisterForUnhandledEvent( "OnOpenScoreboard", EndOfMatch.OnScoreboardOpen );
	$.RegisterForUnhandledEvent( "OnCloseScoreboard", EndOfMatch.OnScoreboardClose );
	$.RegisterForUnhandledEvent( "OnMouseEnableBinding", EndOfMatch.ToggleBetweenScoreboardAndCharacters );
})();
