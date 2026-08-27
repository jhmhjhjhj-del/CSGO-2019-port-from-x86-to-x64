'use strict';

/** Offline local nick — stub persona updates before name cvar / config catch up. */
var StubLocalProfile = ( function()
{
	var _savedNick = '';

	var _IsLocalXuid = function( xuid )
	{
		if ( typeof MyPersonaAPI === 'undefined' || !MyPersonaAPI.GetXuid )
			return false;
		return ( '' + xuid ) === ( '' + MyPersonaAPI.GetXuid() );
	};

	var _ValidNick = function( nick )
	{
		// Engine / PartyList often falls back to literal "Player" — never treat as real nick.
		return nick && nick !== '' && nick !== 'unnamed' && nick !== '...' && nick !== 'Player';
	};

	var _GetDisplayName = function( xuid )
	{
		// Live Friends/cvar first — stale _savedNick blocked right-panel updates until restart.
		if ( _IsLocalXuid( xuid ) )
		{
			try
			{
				if ( typeof PartyListAPI !== 'undefined' && PartyListAPI.GetPartyMemberSetting )
				{
					var fromParty = PartyListAPI.GetPartyMemberSetting( '' + xuid, 'name' );
					if ( _ValidNick( fromParty ) )
					{
						_savedNick = fromParty;
						return fromParty;
					}
				}
			}
			catch ( eParty ) {}

			if ( typeof FriendsListAPI !== 'undefined' && FriendsListAPI.GetFriendName )
			{
				var fromFriends = FriendsListAPI.GetFriendName( xuid );
				if ( _ValidNick( fromFriends ) )
				{
					_savedNick = fromFriends;
					return fromFriends;
				}
			}
			if ( typeof GameInterfaceAPI !== 'undefined' )
			{
				var fromCvar = GameInterfaceAPI.GetSettingString( 'name' );
				if ( _ValidNick( fromCvar ) )
				{
					_savedNick = fromCvar;
					return fromCvar;
				}
			}
		}

		if ( _IsLocalXuid( xuid ) && _ValidNick( _savedNick ) )
			return _savedNick;

		if ( typeof FriendsListAPI !== 'undefined' && FriendsListAPI.GetFriendName )
		{
			var fromFriends2 = FriendsListAPI.GetFriendName( xuid );
			if ( _ValidNick( fromFriends2 ) )
				return fromFriends2;
		}

		return '';
	};

	var _ApplyNameConvar = function( nick )
	{
		if ( !_ValidNick( nick ) )
			return;
		if ( typeof GameInterfaceAPI === 'undefined' )
			return;
		GameInterfaceAPI.SetSettingString( 'name', nick );
		GameInterfaceAPI.ConsoleCommand( 'name "' + ( '' + nick ).replace( /"/g, '' ) + '"' );
	};

	var _NotifyUiRefresh = function()
	{
		if ( typeof MyPersonaAPI === 'undefined' )
			return;
		var xuid = MyPersonaAPI.GetXuid();
		$.DispatchEvent( 'PanoramaComponent_MyPersona_NameChanged' );
		$.DispatchEvent( 'PanoramaComponent_FriendsList_NameChanged' );
		$.DispatchEvent( 'PanoramaComponent_MyPersona_InventoryUpdated' );
		$.DispatchEvent( 'StubProfile_Updated' );
	};

	var _OnNickSaved = function( nick )
	{
		if ( !_ValidNick( nick ) )
			return;
		_savedNick = nick;
		_ApplyNameConvar( nick );
		_NotifyUiRefresh();
		$.Schedule( 0.05, _NotifyUiRefresh );
		$.Schedule( 0.2, _NotifyUiRefresh );
	};

	var _SeedFromRuntime = function()
	{
		if ( typeof MyPersonaAPI === 'undefined' )
			return;
		var xuid = MyPersonaAPI.GetXuid();
		var nick = _GetDisplayName( xuid );
		if ( _ValidNick( nick ) )
			_savedNick = nick;
	};

	return {
		GetDisplayName: _GetDisplayName,
		OnNickSaved: _OnNickSaved,
		SeedFromRuntime: _SeedFromRuntime,
		NotifyUiRefresh: _NotifyUiRefresh
	};
} )();

( function()
{
	$.Schedule( 0.0, function() { StubLocalProfile.SeedFromRuntime(); } );
} )();
