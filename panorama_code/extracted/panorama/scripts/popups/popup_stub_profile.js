'use strict';

var StubProfile = ( function()
{
	var _pendingClearAvatar = false;
	var _xuid = '';
	var _busy = false;
	var _pollToken = 0;

	var _Clamp = function( v, lo, hi )
	{
		if ( v < lo ) return lo;
		if ( v > hi ) return hi;
		return v;
	};

	var _ReadNick = function()
	{
		var elName = $( '#StubProfileName' );
		if ( !elName )
			return '';
		var nick = '';
		if ( typeof elName.GetText === 'function' )
			nick = elName.GetText() || '';
		if ( !nick )
			nick = elName.text || '';
		return ( nick || '' ).replace( /^\s+|\s+$/g, '' );
	};

	var _ProgressionSnapshot = function()
	{
		var level = FriendsListAPI.GetFriendLevel( _xuid );
		var xp = FriendsListAPI.GetFriendXp( _xuid );
		var rank = FriendsListAPI.GetFriendCompetitiveRank( _xuid, 'competitive' );
		var wins = FriendsListAPI.GetFriendCompetitiveWins( _xuid, 'competitive' );
		var rankW = FriendsListAPI.GetFriendCompetitiveRank( _xuid, 'wingman' );
		var winsW = FriendsListAPI.GetFriendCompetitiveWins( _xuid, 'wingman' );
		return {
			level: _Clamp( level || 1, 1, 40 ),
			xp: _Clamp( xp || 0, 0, 4999 ),
			rank: _Clamp( rank || 0, 0, 18 ),
			wins: _Clamp( wins || 0, 0, 99999 ),
			rankW: _Clamp( rankW || 0, 0, 18 ),
			winsW: _Clamp( winsW || 0, 0, 99999 ),
		};
	};

	var _Init = function()
	{
		_xuid = MyPersonaAPI.GetXuid();
		_busy = false;
		_pollToken++;

		var name = GameInterfaceAPI.GetSettingString( 'name' );
		if ( !name || name === '' || name === 'unnamed' )
			name = FriendsListAPI.GetFriendName( _xuid );
		if ( !name )
			name = 'Player';

		var elName = $( '#StubProfileName' );
		if ( elName )
			elName.text = name;

		_pendingClearAvatar = false;
		_RefreshAvatarPreview();
		_SetStatus( '' );
	};

	var _SetStatus = function( text )
	{
		var el = $( '#StubProfileStatus' );
		if ( el )
			el.text = text;
	};

	var _RefreshAvatarPreview = function()
	{
		var el = $( '#StubProfileAvatar' );
		if ( !el )
			return;
		el.SetImage( 'file://{images}/icons/ui/player.svg' );
		$.Schedule( 0.05, function()
		{
			if ( el && el.IsValid() )
				el.SetImage( 'file://{images}/stub_avatar.png' );
		} );
	};

	var _OnNameChanged = function() {};

	var _ClearPassword = function()
	{
		GameInterfaceAPI.SetSettingString( 'password', '' );
		GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
	};

	var _SendBridge = function( cmd )
	{
		// Legacy raw queue — prefer typed OfflineBridge* from call sites.
		if ( typeof GameInterfaceAPI.QueueStubBridgeCommand === 'function' )
		{
			GameInterfaceAPI.QueueStubBridgeCommand( cmd );
			return;
		}
		GameInterfaceAPI.SetSettingString( 'password', cmd );
		GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
	};

	var _SendProfileSave = function( body )
	{
		if ( typeof GameInterfaceAPI.OfflineBridgeProfileSave === 'function' )
			GameInterfaceAPI.OfflineBridgeProfileSave( body );
		else
			_SendBridge( body );
	};

	var _SendPickAvatar = function( tok )
	{
		if ( typeof GameInterfaceAPI.OfflineBridgePickAvatar === 'function' )
			GameInterfaceAPI.OfflineBridgePickAvatar( tok );
		else
			_SendBridge( tok );
	};

	/** Wait for stub_ack — re-exec stub_ack.cfg every tick so async stub writes are seen. */
	var _SendBridgeWait = function( sendFn, ackNeedle, timeoutSec, onOk, onFail, onWaitStatus )
	{
		var myToken = ++_pollToken;

		_ClearPassword();
		if ( typeof sendFn === 'function' )
			sendFn();
		else
			_SendBridge( sendFn );

		var left = Math.max( 8, Math.floor( timeoutSec / 0.25 ) );

		var tick = function()
		{
			if ( myToken !== _pollToken )
				return;

			GameInterfaceAPI.ConsoleCommand( 'exec stub_ack.cfg' );

			var ack = GameInterfaceAPI.GetSettingString( 'password' ) || '';
			if ( ack.indexOf( ackNeedle ) >= 0 )
			{
				if ( ack.indexOf( '|ok|' ) >= 0 )
				{
					_ClearPassword();
					if ( onOk )
						onOk( ack );
					return;
				}
				if ( ack.indexOf( '|fail|' ) >= 0 || ack.indexOf( '|cancel|' ) >= 0 || ack.indexOf( '|busy|' ) >= 0 )
				{
					_ClearPassword();
					if ( onFail )
						onFail( ack );
					return;
				}
				if ( ack.indexOf( '|wait|' ) >= 0 && onWaitStatus && ( left % 4 ) === 0 )
					onWaitStatus( ack );
			}

			left--;
			if ( left <= 0 )
			{
				_ClearPassword();
				if ( onFail )
					onFail( 'timeout' );
				return;
			}

			$.Schedule( 0.25, tick );
		};

		$.Schedule( 0.15, tick );
	};

	var _NotifyUiRefresh = function( nick )
	{
		if ( typeof StubLocalProfile !== 'undefined' )
		{
			if ( nick )
				StubLocalProfile.OnNickSaved( nick );
			else
				StubLocalProfile.NotifyUiRefresh();
		}
		// Always fire persona/friends events — right panel may not listen to StubLocalProfile alone.
		$.DispatchEvent( 'PanoramaComponent_MyPersona_NameChanged' );
		$.DispatchEvent( 'PanoramaComponent_FriendsList_NameChanged' );
		$.DispatchEvent( 'PanoramaComponent_MyPersona_InventoryUpdated' );
		$.DispatchEvent( 'StubProfile_Updated' );
		$.DispatchEvent( 'PanoramaComponent_MyPersona_PipRankUpdate' );
	};

	var _PickAvatar = function()
	{
		if ( _busy )
			return;
		_busy = true;
		_pendingClearAvatar = false;
		_SetStatus( 'Выбери файл в окне Windows…' );

		var tok = '' + Date.now();
		_SendBridgeWait(
			function() { _SendPickAvatar( tok ); },
			'|' + tok,
			180,
			function()
			{
				_busy = false;
				GameInterfaceAPI.ConsoleCommand( 'sv_cheats 1' );
				GameInterfaceAPI.ConsoleCommand( 'cl_avatar_convert_rgb' );
				_RefreshAvatarPreview();
				_SetStatus( 'Аватар выбран.' );
				$.DispatchEvent( 'StubProfile_Updated' );
			},
			function( reason )
			{
				_busy = false;
				if ( reason === 'timeout' )
					_SetStatus( 'Таймаут выбора аватара.' );
				else if ( ( '' + reason ).indexOf( 'cancel' ) >= 0 )
					_SetStatus( 'Выбор аватара отменён.' );
				else
					_SetStatus( 'Не удалось выбрать аватар.' );
			},
			function()
			{
				_SetStatus( 'Жду выбор файла…' );
			}
		);
	};

	var _ClearAvatar = function()
	{
		_pendingClearAvatar = true;
		_SetStatus( 'Аватар будет сброшен после сохранения.' );
		var el = $( '#StubProfileAvatar' );
		if ( el )
			el.SetImage( 'file://{images}/icons/ui/player.svg' );
	};

	var _FinishSave = function( nick )
	{
		_busy = false;
		GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
		_NotifyUiRefresh( nick );
		_RefreshAvatarPreview();
		_SetStatus( 'Сохранено.' );
		$.Schedule( 0.35, function() { $.DispatchEvent( 'UIPopupButtonClicked', '' ); } );
	};

	var _Save = function()
	{
		if ( _busy )
		{
			_SetStatus( 'Подожди: ещё выполняется предыдущая операция.' );
			return;
		}

		var nick = _ReadNick();
		if ( !nick )
		{
			_SetStatus( 'Ник не может быть пустым.' );
			return;
		}
		nick = nick.replace( /[\|\"\r\n]/g, '' ).substring( 0, 32 );

		var prog = _ProgressionSnapshot();
		var clearAv = _pendingClearAvatar ? 1 : 0;
		var tok = '' + Date.now();
		var payload = tok + '|' + clearAv + '|' + nick + '|' + prog.level + '|' + prog.xp + '|'
			+ prog.rank + '|' + prog.wins + '|' + prog.rankW + '|' + prog.winsW;

		_busy = true;
		_SetStatus( 'Сохраняю…' );

		// Optimistic UI refresh — don't wait for ACK (right panel stayed stale until restart).
		_NotifyUiRefresh( nick );
		$.Msg( '[StubProfile] save nick="' + nick + '" bridge queued' );

		_SendBridgeWait(
			function() { _SendProfileSave( payload ); },
			'|' + tok,
			6,
			function()
			{
				if ( clearAv )
					_pendingClearAvatar = false;
				_FinishSave( nick );
			},
			function( reason )
			{
				// Offline x64: stub bridge may miss ACK — still persist nick via host_writeconfig.
				_busy = false;
				if ( reason === 'timeout' )
				{
					GameInterfaceAPI.SetSettingString( 'name', nick );
					_FinishSave( nick );
					_SetStatus( 'Сохранено (локально, без ACK stub).' );
					return;
				}
				_SetStatus( 'Ошибка сохранения (' + reason + '). Попробуй ещё раз.' );
			}
		);
	};

	return {
		Init: _Init,
		OnNameChanged: _OnNameChanged,
		PickAvatar: _PickAvatar,
		ClearAvatar: _ClearAvatar,
		Save: _Save
	};
} )();
