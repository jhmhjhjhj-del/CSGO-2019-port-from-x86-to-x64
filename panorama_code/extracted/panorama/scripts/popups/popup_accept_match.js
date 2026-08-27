'use strict';


var PopupAcceptMatch = ( function(){

	var m_hasPressedAccept = false;
	var m_numPlayersReady = 0;
	var m_numTotalClientsInReservation = 0;
	var m_numSecondsRemaining = 0;
	var m_isReconnect= false;
	var m_isNqmmAnnouncementOnly = false;
	var m_isStubOffline = false;
	var m_stubAcceptToken = '';
	var m_lobbySettings;
	var m_elTimer = $.GetContextPanel().FindChildInLayoutFile ( 'AcceptMatchCountdown' );
	var m_jsTimerUpdateHandle = false;
	var m_stubFillHandle = false;
	var m_stubDeadline = 0;

	var _Init = function ()
	{
		m_hasPressedAccept = false;
		m_numPlayersReady = 0;
		m_numTotalClientsInReservation = 0;
		m_isStubOffline = false;
		m_stubFillHandle = false;

		var elPlayerSlots = $.GetContextPanel().FindChildInLayoutFile ( 'AcceptMatchSlots' );
		elPlayerSlots.RemoveAndDeleteChildren();

		var settings = $.GetContextPanel().GetAttributeString( 'map_and_isreconnect', '' );
		var settingsList = settings.split(',');

		var map = settingsList[0] || 'de_dust2';
		if ( map.charAt( 0 ) === '@' )
		{
			m_isNqmmAnnouncementOnly = true;
			m_hasPressedAccept = true;
			map = map.substr( 1 );
		}

		m_isReconnect = settingsList[1] === 'true' ? true : false;

		// stub:slots[:token] — offline auto-match (popup has its own JS scope, no StubAutoMm here)
		if ( settingsList.length >= 3 && settingsList[2].indexOf( 'stub:' ) === 0 )
		{
			m_isStubOffline = true;
			var stubParts = settingsList[2].substr( 5 ).split( ':' );
			m_numTotalClientsInReservation = parseInt( stubParts[0] || '10', 10 ) || 10;
			m_stubAcceptToken = stubParts[1] || '';
			m_stubDeadline = Date.now() + 30000;
			m_numSecondsRemaining = 30;
		}

		m_lobbySettings = LobbyAPI.GetSessionSettings().game;

		_SetMatchData( map );

		if ( m_isNqmmAnnouncementOnly )
		{
			$( '#AcceptMatchDataContainer' ).SetHasClass( 'auto', true );
			_UpdateUiState();
			m_jsTimerUpdateHandle = $.Schedule( 1.9, _OnNqmmAutoReadyUp );
			return;
		}

		// Unhide Accept BEFORE any optional notify — DispatchEvent throw aborts Init.
		_UpdateUiState();
		try
		{
			$.DispatchEvent( 'ShowReadyUpPanel', '' );
		}
		catch ( eReady ) {}

		m_jsTimerUpdateHandle = $.Schedule( 1.0, _OnTimerUpdate );
	};

	var _UpdateUiState = function()
	{
		var btnAccept = $.GetContextPanel().FindChildInLayoutFile ( 'AcceptMatchBtn' );
		var elPlayerSlots = $.GetContextPanel().FindChildInLayoutFile ( 'AcceptMatchSlots' );

		var bHideTimer = false;
		var bShowPlayerSlots = m_hasPressedAccept || m_isReconnect;
		if ( m_isNqmmAnnouncementOnly )
		{
			bShowPlayerSlots = false;
			bHideTimer = true;
		}

		btnAccept.SetHasClass( 'hidden', m_hasPressedAccept || m_isReconnect );
		elPlayerSlots.SetHasClass( 'hidden', !bShowPlayerSlots );

		if ( bShowPlayerSlots )
		{
			_UpdatePlayerSlots( elPlayerSlots );
			bHideTimer = true;
		}

		if ( m_elTimer && m_elTimer.GetChild( 0 ) )
		{
			m_elTimer.GetChild(0).text = "0:"+( (m_numSecondsRemaining<10) ? "0":"")+m_numSecondsRemaining;
			m_elTimer.SetHasClass( "hidden", bHideTimer || ( m_numSecondsRemaining <= 0 ) );
		}

		if( m_jsTimerUpdateHandle )
		{
			$.CancelScheduled( m_jsTimerUpdateHandle );
			m_jsTimerUpdateHandle = false;
		}
	};

	var _OnTimerUpdate = function()
	{
		m_jsTimerUpdateHandle = false;

		if ( m_isStubOffline )
			m_numSecondsRemaining = Math.max( 0, Math.ceil( ( m_stubDeadline - Date.now() ) / 1000 ) );
		else
			m_numSecondsRemaining = LobbyAPI.GetReadyTimeRemainingSeconds();

		_UpdateUiState();

		if ( m_numSecondsRemaining > 0 )
		{
			if ( m_hasPressedAccept )
				$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_waitquiet', 'MOUSE' );
			else
				$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_beep', 'MOUSE' );
			m_jsTimerUpdateHandle = $.Schedule( 1.0, _OnTimerUpdate );
		}
	};

	var _ReadyForMatch = function ( shouldShow, playersReadyCount, numTotalClientsInReservation )
	{
		if ( m_isStubOffline )
		{
			// Own the UI; ignore native close / 0-ready resets after Accept.
			if ( !shouldShow )
				return;
			if ( m_hasPressedAccept && playersReadyCount <= m_numPlayersReady )
				return;
		}

		if( !shouldShow )
		{
			if( m_jsTimerUpdateHandle )
			{
				$.CancelScheduled( m_jsTimerUpdateHandle );
				m_jsTimerUpdateHandle = false;
			}

			$.DispatchEvent( "CloseAcceptPopup" );
			$.DispatchEvent( 'UIPopupButtonClicked', '' );
			return;
		}

		if ( m_hasPressedAccept && m_numPlayersReady && ( playersReadyCount > m_numPlayersReady ) )
			$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_person', 'MOUSE' );

		if ( playersReadyCount == 1 && numTotalClientsInReservation == 1 && ( m_numTotalClientsInReservation > 1 ) )
		{
			numTotalClientsInReservation = m_numTotalClientsInReservation;
			playersReadyCount = m_numTotalClientsInReservation;
		}
		m_numPlayersReady = playersReadyCount;
		m_numTotalClientsInReservation = numTotalClientsInReservation;

		if ( m_isStubOffline )
			m_numSecondsRemaining = Math.max( 0, Math.ceil( ( m_stubDeadline - Date.now() ) / 1000 ) );
		else
			m_numSecondsRemaining = LobbyAPI.GetReadyTimeRemainingSeconds();

		_UpdateUiState();
		m_jsTimerUpdateHandle = $.Schedule( 1.0, _OnTimerUpdate );
	};

	var _UpdatePlayerSlots = function ( elPlayerSlots )
	{
		for( var i = 0; i < m_numTotalClientsInReservation; i++ )
		{
			var Slot = $.GetContextPanel().FindChildInLayoutFile( 'AcceptMatchSlot' + i );

			if( !Slot )
			{
				Slot = $.CreatePanel( 'Panel', elPlayerSlots, 'AcceptMatchSlot' + i );
				Slot.BLoadLayoutSnippet( 'AcceptMatchPlayerSlot' );
			}

			Slot.SetHasClass ( 'accept-match__slots__player--accepted', ( i < m_numPlayersReady ) );
		}

		var labelPlayersAccepted = $.GetContextPanel().FindChildInLayoutFile( 'AcceptMatchPlayersAccepted' );
		labelPlayersAccepted.SetDialogVariableInt( 'accepted', m_numPlayersReady );
		labelPlayersAccepted.SetDialogVariableInt( 'slots', m_numTotalClientsInReservation );
		labelPlayersAccepted.text = $.Localize( '#match_ready_players_accepted', labelPlayersAccepted );
	};

	var _SetMatchData = function ( map )
	{
		if ( m_lobbySettings === undefined )
			return;

		var mode = $.Localize ( '#SFUI_GameMode_' + m_lobbySettings.mode );
		var labelData = $.GetContextPanel().FindChildInLayoutFile ( 'AcceptMatchModeMap' );

		labelData.SetDialogVariable ( 'mode', mode );
		labelData.SetDialogVariable ( 'map', $.Localize ( '#SFUI_Map_' + map ));
		labelData.text = $.Localize( '#match_ready_match_data', labelData );

		var imgMap = $.GetContextPanel().FindChildInLayoutFile ( 'AcceptMatchMapImage' );
		imgMap.style.backgroundImage = 'url("file://{images}/map_icons/screenshots/360p/' + map + '.png")';
	};

	var _OnNqmmAutoReadyUp = function ()
	{
		m_jsTimerUpdateHandle = false;
		$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_confirmed', 'MOUSE' );
		LobbyAPI.SetLocalPlayerReady( 'deferred' );
		$.DispatchEvent( "CloseAcceptPopup" );
		$.DispatchEvent( 'UIPopupButtonClicked', '' );
	};

	var _SignalStubAccepted = function()
	{
		try
		{
			if ( typeof GameInterfaceAPI.OfflineBridgeAutoMmAccepted === 'function' )
				GameInterfaceAPI.OfflineBridgeAutoMmAccepted( m_stubAcceptToken || '' );
		}
		catch ( e ) {}

		try
		{
			if ( typeof StubAutoMm !== 'undefined' && StubAutoMm.OnUserAccepted )
				StubAutoMm.OnUserAccepted();
		}
		catch ( e2 ) {}

		$.Schedule( 2.5, function()
		{
			try
			{
				GameInterfaceAPI.SetSettingString( 'password', '' );
				GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
			}
			catch ( e5 ) {}
		} );
	};

	var _StubFillOthers = function()
	{
		m_stubFillHandle = false;
		if ( !m_isStubOffline || !m_hasPressedAccept )
			return;
		if ( m_numPlayersReady >= m_numTotalClientsInReservation )
		{
			_OnStubAllReady();
			return;
		}

		m_numPlayersReady += 1;
		$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_person', 'MOUSE' );
		_UpdateUiState();
		m_jsTimerUpdateHandle = $.Schedule( 1.0, _OnTimerUpdate );

		if ( m_numPlayersReady >= m_numTotalClientsInReservation )
			_OnStubAllReady();
		else
			m_stubFillHandle = $.Schedule( 0.35 + Math.random() * 0.45, _StubFillOthers );
	};

	var _OnStubAllReady = function()
	{
		$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_confirmed', 'MOUSE' );
		// Let 4/4 paint, then signal stub + close popup. Connect must not start earlier.
		$.Schedule( 0.85, function()
		{
			_SignalStubAccepted();
			$.Schedule( 0.25, function()
			{
				$.DispatchEvent( 'CloseAcceptPopup' );
				$.DispatchEvent( 'UIPopupButtonClicked', '' );
			} );
		} );
	};

	var _OnAcceptMatchPressed = function ()
	{
		if ( m_hasPressedAccept )
			return;

		m_hasPressedAccept = true;
		$.DispatchEvent( 'PlaySoundEffect', 'popup_accept_match_person', 'MOUSE' );

		if ( m_isStubOffline )
		{
			m_numPlayersReady = 1;
			if ( m_numTotalClientsInReservation < 1 )
				m_numTotalClientsInReservation = 10;
			_UpdateUiState();
			m_jsTimerUpdateHandle = $.Schedule( 1.0, _OnTimerUpdate );
			// Signal only after all fake accepts — not on first click.
			if ( m_numPlayersReady >= m_numTotalClientsInReservation )
				_OnStubAllReady();
			else
				m_stubFillHandle = $.Schedule( 0.45, _StubFillOthers );
			return;
		}

		LobbyAPI.SetLocalPlayerReady( 'accept' );
	};

	return {
		Init					: _Init,
		ReadyForMatch			: _ReadyForMatch,
		OnAcceptMatchPressed	: _OnAcceptMatchPressed
	};

})();

(function()
{
	$.RegisterForUnhandledEvent( 'PanoramaComponent_Lobby_ReadyUpForMatch', PopupAcceptMatch.ReadyForMatch );
	$.RegisterForUnhandledEvent( 'MatchAssistedAccept', PopupAcceptMatch.OnAcceptMatchPressed );
})();
