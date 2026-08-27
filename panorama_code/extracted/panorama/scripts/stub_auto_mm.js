'use strict';

// Offline auto-match v2: search → accept popup → connect to hidden local dedicated.
var StubAutoMm = ( function()
{
	var _armed = false;
	var _timer = null;
	var _map = '';
	var _slots = 10;
	var _acceptToken = '';
	var _acceptDeadline = 0;
	var _launchConsumed = false;
	var _acceptShown = false;
	var _accepted = false;
	var _acceptSignalTries = 0;

	var _ReadGo = function()
	{
		try
		{
			if ( typeof LobbyAPI !== 'undefined' && LobbyAPI.GetStubAutoMmGo )
				return LobbyAPI.GetStubAutoMmGo() || '0';
		}
		catch ( e0 ) {}
		try
		{
			// Legacy fallback (avoid unless API missing — exec floods console).
			GameInterfaceAPI.ConsoleCommand( 'exec stub_auto_mm_ready.cfg' );
			return GameInterfaceAPI.GetSettingString( 'stub_automm_go' ) || '0';
		}
		catch ( e1 ) {}
		return '0';
	};

	var _ParseGo = function( go )
	{
		if ( !go || go === '0' )
			return { phase: '' };
		if ( go.indexOf( 'accept|' ) === 0 )
		{
			var parts = go.split( '|' );
			return {
				phase: 'accept',
				map: parts[1] || 'de_dust2',
				slots: parseInt( parts[2] || '10', 10 ) || 10,
				token: parts[3] || ''
			};
		}
		if ( go.indexOf( 'connect|' ) === 0 )
		{
			var c = go.split( '|' );
			return {
				phase: 'connect',
				ip: c[1] || '127.0.0.1',
				port: c[2] || '27025',
				map: c[3] || ''
			};
		}
		if ( go === 'waiting_server' )
			return { phase: 'waiting_server' };
		if ( go === '1' )
			return { phase: 'connect_legacy' };
		return { phase: '' };
	};

	var _ShowAccept = function( map, slots, token )
	{
		if ( _acceptShown )
			return;

		_map = map;
		_slots = slots;
		_acceptToken = token || '';
		_acceptDeadline = Date.now() + 30000;
		_accepted = false;

		try
		{
			var popup = UiToolkitAPI.ShowGlobalCustomLayoutPopupParameters(
				'',
				'file://{resources}/layout/popups/popup_accept_match.xml',
				'map_and_isreconnect=' + map + ',false,stub:' + slots + ':' + _acceptToken
			);
			if ( !popup )
				return;

			_acceptShown = true;

			try
			{
				$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_beep', 'MOUSE' );
			}
			catch ( e0 ) {}

			$.DispatchEvent( 'ShowAcceptPopup', popup );
			try
			{
				$.DispatchEvent( 'PanoramaComponent_Lobby_MatchmakingSessionUpdate', 'accept' );
			}
			catch ( e2 ) {}
		}
		catch ( e1 ) {}
	};

	var _WriteAcceptedSignal = function()
	{
		try
		{
			if ( typeof GameInterfaceAPI.OfflineBridgeAutoMmAccepted === 'function' )
				GameInterfaceAPI.OfflineBridgeAutoMmAccepted( _acceptToken || '' );
			else
			{
				GameInterfaceAPI.SetSettingString( 'password', '' );
				GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
			}
		}
		catch ( e ) {}
	};

	var _ClearAcceptedSignal = function()
	{
		try
		{
			GameInterfaceAPI.SetSettingString( 'password', '' );
			GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
		}
		catch ( e ) {}
	};

	var _OnUserAccepted = function()
	{
		if ( _accepted )
			return;
		_accepted = true;
		_acceptSignalTries = 0;

		// One write is enough; repeated host_writeconfig tanks FPS.
		_WriteAcceptedSignal();
		$.Schedule( 2.5, function()
		{
			if ( !_launchConsumed )
				_ClearAcceptedSignal();
		} );
	};

	var _DoConnect = function()
	{
		if ( _launchConsumed )
			return;
		_launchConsumed = true;
		_ClearAcceptedSignal();

		var ip = '127.0.0.1';
		var port = '27025';
		try
		{
			var go = _ReadGo();
			var parsed = _ParseGo( go );
			if ( parsed.phase === 'connect' )
			{
				if ( parsed.ip ) ip = parsed.ip;
				if ( parsed.port ) port = String( parsed.port );
			}
		}
		catch ( e0 ) {}

		// Dedicated answers on LAN NIC; keep whatever stub put in the flag.
		if ( !port || port === '0' )
			port = '27025';
		if ( !ip )
			ip = '127.0.0.1';

		try
		{
			$.DispatchEvent( 'CloseAcceptPopup' );
			$.DispatchEvent( 'UIPopupButtonClicked', '' );
		}
		catch ( e2 ) {}

		// Connect first. ONLY ip:port — space form drops port → engine default 27015.
		try
		{
			GameInterfaceAPI.ConsoleCommand( 'net_steamcnx_enabled 0' );
			GameInterfaceAPI.ConsoleCommand( 'net_steamcnx_allowrelay 0' );
			GameInterfaceAPI.ConsoleCommand( 'password ""' );
			GameInterfaceAPI.ConsoleCommand( 'connect ' + ip + ':' + port );
		}
		catch ( e3 ) {}

		$.Schedule( 0.4, function()
		{
			try
			{
				GameInterfaceAPI.ConsoleCommand( 'exec stub_auto_mm.cfg' );
			}
			catch ( e4 ) {}
		} );

		$.Schedule( 1.2, function()
		{
			try
			{
				if ( typeof LobbyAPI !== 'undefined' && LobbyAPI.StopMatchmaking )
					LobbyAPI.StopMatchmaking();
			}
			catch ( e1 ) {}
			try
			{
				GameInterfaceAPI.ConsoleCommand( 'exec stub_mm_state.cfg' );
			}
			catch ( e5 ) {}
		} );
	};

	var _Tick = function()
	{
		_timer = null;
		try
		{
			var go = _ReadGo();
			var parsed = _ParseGo( go );

			if ( parsed.phase === 'accept' && !_acceptShown )
				_ShowAccept( parsed.map, parsed.slots, parsed.token );

			if ( parsed.phase === 'connect' || parsed.phase === 'connect_legacy' )
				_DoConnect();

			var playing = false;
			try
			{
				if ( typeof GameStateAPI !== 'undefined' && GameStateAPI.IsLocalPlayerPlayingMatch )
					playing = GameStateAPI.IsLocalPlayerPlayingMatch();
			}
			catch ( ePlay ) {}

			if ( ( go === '0' || parsed.phase === '' ) && !playing )
			{
				// Ignore a brief lobby wipe of accept| while the popup is still live.
				if ( _acceptShown && !_accepted && Date.now() < _acceptDeadline )
				{
					/* keep accept UI */
				}
				else
				{
					// Only notify UI when leaving accept/connect — not every idle tick
					// (continuous MatchmakingSessionUpdate rebuilds Play and closes dropdowns).
					var hadSession = _acceptShown || _accepted || _launchConsumed || _acceptToken;
					_acceptShown = false;
					_accepted = false;
					_launchConsumed = false;
					_acceptToken = '';
					if ( hadSession )
					{
						try
						{
							$.DispatchEvent( 'PanoramaComponent_Lobby_MatchmakingSessionUpdate', 'idle' );
						}
						catch ( eIdle ) {}
					}
				}
			}
		}
		catch ( e ) {}

		var delay = _launchConsumed ? 2.0 : ( _acceptShown ? 0.35 : 0.25 );
		_timer = $.Schedule( delay, _Tick );
	};

	var _OnSessionUpdate = function( reason )
	{
		try
		{
			var go = _ReadGo();
			var parsed = _ParseGo( go );
			if ( parsed.phase === 'accept' && !_acceptShown )
				_ShowAccept( parsed.map, parsed.slots, parsed.token );
		}
		catch ( e ) {}
	};

	var _Start = function()
	{
		if ( _armed )
			return;
		_armed = true;

		$.RegisterForUnhandledEvent( 'PanoramaComponent_Lobby_MatchmakingSessionUpdate', _OnSessionUpdate );
		$.RegisterForUnhandledEvent( 'ServerReserved', _OnSessionUpdate );

		_Tick();
	};

	var ShouldSkipTeamSelect = function()
	{
		try
		{
			if ( typeof StubMm !== 'undefined' && StubMm.IsActive && StubMm.IsActive() )
				return true;
		}
		catch ( e ) {}
		return _launchConsumed || _acceptShown;
	};

	var IsAcceptPending = function()
	{
		return _acceptShown && !_launchConsumed;
	};

	var GetAcceptSecondsLeft = function()
	{
		if ( !_acceptShown )
			return 0;
		return Math.max( 0, Math.ceil( ( _acceptDeadline - Date.now() ) / 1000 ) );
	};

	var GetAcceptSlots = function()
	{
		return _slots;
	};

	var GetOfficialServerWarning = function()
	{
		// "Official" in this build = our hidden dedicated. Never use Valve NewsAPI.
		try
		{
			var go = _ReadGo();
			if ( go === 'server_fail' || go.indexOf( 'server_fail' ) === 0 )
				return '#SFUI_UserAlert_Unreachable';
		}
		catch ( e ) {}
		return '';
	};

	return {
		Start: _Start,
		ShouldSkipTeamSelect: ShouldSkipTeamSelect,
		IsAcceptPending: IsAcceptPending,
		GetAcceptSecondsLeft: GetAcceptSecondsLeft,
		GetAcceptSlots: GetAcceptSlots,
		OnUserAccepted: _OnUserAccepted,
		OnSessionUpdate: _OnSessionUpdate,
		GetOfficialServerWarning: GetOfficialServerWarning
	};
} )();

( function()
{
	try
	{
		if ( $.GetContextPanel() && $.GetContextPanel().paneltype === 'CSGOTeamSelectMenu' )
			return;
	}
	catch ( e0 ) {}

	$.Schedule( 0.15, function()
	{
		if ( typeof StubAutoMm !== 'undefined' )
			StubAutoMm.Start();
	} );
} )();
