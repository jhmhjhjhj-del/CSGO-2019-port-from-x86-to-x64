'use strict';

var RetakeLoadoutHUD = ( function()
{
	var _root = null;
	var _panel = null;
	var _backdrop = null;
	var _timer = null;
	var _selected = -1;
	var _wasOpen = false;
	var _keysBound = false;
	var _dismissed = false;
	var _lastSeq = -1;
	var _cardCount = 0;
	var _lastCardsRaw = '';

	var _OwnerPanel = function()
	{
		var p = $.GetContextPanel();
		while ( p && p.IsValid() )
		{
			if ( p.paneltype === 'CSGORetakeLoadout' )
				return p;
			p = p.GetParent();
		}
		return $.GetContextPanel().GetParent();
	};

	var _SetCapture = function( on )
	{
		try
		{
			var owner = _OwnerPanel();
			if ( owner && typeof owner.SetCaptureEnabled === 'function' )
				owner.SetCaptureEnabled( !!on );
		}
		catch ( e )
		{
		}
	};

	var _IsRetakesMode = function()
	{
		try
		{
			if ( typeof GameStateAPI === 'undefined' || !GameStateAPI )
				return false;
			if ( GameStateAPI.IsLocalPlayerPlayingOrSpectatingAnyGame && !GameStateAPI.IsLocalPlayerPlayingOrSpectatingAnyGame() )
				return false;
			var mode = GameInterfaceAPI.GetSettingString( 'game_mode' );
			var type = GameInterfaceAPI.GetSettingString( 'game_type' );
			return ( type === '0' || type === 0 ) && ( mode === '4' || mode === 4 );
		}
		catch ( e )
		{
			return false;
		}
	};

	var _IsOpen = function()
	{
		try
		{
			var v = GameInterfaceAPI.GetSettingString( 'sv_retake_loadout_open' );
			return v === '1' || v === 1;
		}
		catch ( e )
		{
			return false;
		}
	};

	var _ReadSeq = function()
	{
		try
		{
			var v = GameInterfaceAPI.GetSettingString( 'sv_retake_loadout_seq' );
			var n = parseInt( v, 10 );
			return isNaN( n ) ? 0 : n;
		}
		catch ( e )
		{
			return 0;
		}
	};

	var _IsCT = function()
	{
		try
		{
			var xuid = GameStateAPI.GetLocalPlayerXuid
				? GameStateAPI.GetLocalPlayerXuid()
				: MyPersonaAPI.GetXuid();
			if ( GameStateAPI.GetPlayerTeamNumber )
			{
				var n = parseInt( GameStateAPI.GetPlayerTeamNumber( xuid ), 10 );
				if ( n === 2 )
					return false;
				if ( n === 3 )
					return true;
			}
			var team = GameStateAPI.GetPlayerTeamName( xuid );
			if ( !team )
				return true;
			team = ( '' + team ).toUpperCase();
			if ( team === 'T' || team === 'TERRORIST' || team.indexOf( 'TERROR' ) >= 0 )
				return false;
			return true;
		}
		catch ( e )
		{
			return true;
		}
	};

	var _TierTitle = function()
	{
		try
		{
			var t = parseInt( GameInterfaceAPI.GetSettingString( 'sv_retake_loadout_tier' ), 10 );
			if ( t === 0 ) return 'РАЗМИНКА · СНАРЯЖЕНИЕ';
			if ( t === 1 ) return 'РАУНД 1 · ПИСТОЛИ';
			if ( t === 2 ) return 'РАУНД 2 · ПИСТОЛИ+';
			if ( t === 3 ) return 'РАУНД 3 · LIGHT';
			return 'РАУНД 4+ · FULL BUY';
		}
		catch ( e )
		{
			return 'ВЫБОР СНАРЯЖЕНИЯ';
		}
	};

	var _EqPath = function( icon )
	{
		return 'file://{images}/icons/equipment/' + icon + '.svg';
	};

	var _IsEmptyField = function( v )
	{
		return !v || v === '-' || v === '';
	};

	var _ParseTeamPack = function( pack )
	{
		// "N;Title|prim|sec|util|armor;..."  (legacy: Title|prim|Sub)
		var out = [];
		if ( !pack )
			return out;
		var parts = pack.split( ';' );
		var n = parseInt( parts[ 0 ], 10 );
		if ( isNaN( n ) || n <= 0 )
			return out;
		for ( var i = 1; i < parts.length && out.length < n && out.length < 6; ++i )
		{
			var bits = parts[ i ].split( '|' );
			if ( bits.length < 2 )
				continue;
			var card = {
				title: bits[ 0 ] || '',
				icon: bits[ 1 ] || 'hkp2000',
				sec: '',
				util: '',
				armor: false
			};
			if ( bits.length >= 5 )
			{
				card.sec = bits[ 2 ] || '';
				card.util = bits[ 3 ] || '';
				card.armor = ( bits[ 4 ] === '1' || bits[ 4 ] === 1 );
			}
			out.push( card );
		}
		return out;
	};

	var _ReadCards = function()
	{
		try
		{
			var cvar = _IsCT() ? 'sv_retake_loadout_cards_ct' : 'sv_retake_loadout_cards_t';
			var pack = GameInterfaceAPI.GetSettingString( cvar ) || '';
			return _ParseTeamPack( pack );
		}
		catch ( e )
		{
			return [];
		}
	};

	var _SetGearIcon = function( img, iconName, bias )
	{
		if ( !img )
			return;
		var show = !_IsEmptyField( iconName );
		img.SetHasClass( 'hidden', !show );
		img.SetHasClass( 'retake-loadout__gear-icon--bias', !!bias && show );
		if ( show )
			img.SetImage( _EqPath( iconName ) );
	};

	var _UpdateCards = function()
	{
		if ( !_panel || !_panel.IsValid() )
			return;

		var title = _panel.FindChildTraverse( 'RetakeLoadoutTitle' );
		if ( !title && _root )
			title = _root.FindChildTraverse( 'RetakeLoadoutTitle' );
		if ( title )
			title.text = _TierTitle();

		var cards = _ReadCards();
		_cardCount = cards.length;

		for ( var i = 0; i < 6; ++i )
		{
			var card = _panel.FindChildTraverse( 'RetakeCard' + i );
			if ( !card )
				continue;
			var show = i < cards.length;
			card.SetHasClass( 'hidden', !show );
			if ( !show )
				continue;

			var name = card.FindChildTraverse( 'RetakeCard' + i + 'Name' );
			if ( name )
				name.text = cards[ i ].title;

			var img = card.FindChildTraverse( 'RetakeCard' + i + 'Icon' );
			if ( img )
				img.SetImage( _EqPath( cards[ i ].icon ) );

			_SetGearIcon( card.FindChildTraverse( 'RetakeCard' + i + 'Sec' ), cards[ i ].sec, true );
			_SetGearIcon( card.FindChildTraverse( 'RetakeCard' + i + 'Util' ), cards[ i ].util, false );

			var armor = card.FindChildTraverse( 'RetakeCard' + i + 'Armor' );
			if ( armor )
			{
				armor.SetHasClass( 'hidden', !cards[ i ].armor );
				if ( cards[ i ].armor )
					armor.SetImage( _EqPath( 'kevlar_helmet' ) );
			}

			card.SetHasClass( 'selected', i === _selected );
		}
	};

	var _Highlight = function( role )
	{
		_selected = role;
		for ( var i = 0; i < 6; ++i )
		{
			var card = _panel ? _panel.FindChildTraverse( 'RetakeCard' + i ) : null;
			if ( card )
				card.SetHasClass( 'selected', i === role );
		}
	};

	var _ApplyVisible = function( show )
	{
		if ( !_panel || !_panel.IsValid() )
			return;

		_panel.SetHasClass( 'hidden', !show );
		if ( _backdrop && _backdrop.IsValid() )
			_backdrop.SetHasClass( 'hidden', !show );

		if ( show && !_wasOpen )
		{
			_UpdateCards();
			_SetCapture( true );
		}
		else if ( !show && _wasOpen )
		{
			_SetCapture( false );
		}
		_wasOpen = show;
	};

	var _Refresh = function()
	{
		if ( !_panel || !_panel.IsValid() )
			return;

		if ( !_IsRetakesMode() )
		{
			_dismissed = false;
			_lastSeq = -1;
			_lastCardsRaw = '';
			_ApplyVisible( false );
			return;
		}

		var seq = _ReadSeq();
		if ( seq !== _lastSeq )
		{
			_lastSeq = seq;
			_dismissed = false;
			_selected = -1;
			_lastCardsRaw = '';
		}

		var raw = '';
		try
		{
			var cvar = _IsCT() ? 'sv_retake_loadout_cards_ct' : 'sv_retake_loadout_cards_t';
			raw = GameInterfaceAPI.GetSettingString( cvar ) || '';
		}
		catch ( e ) {}
		if ( raw !== _lastCardsRaw )
		{
			_lastCardsRaw = raw;
			if ( _IsOpen() && !_dismissed )
				_UpdateCards();
		}

		var show = _IsOpen() && !_dismissed;
		if ( show && !_wasOpen )
			_UpdateCards();
		_ApplyVisible( show );
	};

	var _Pick = function( role )
	{
		role = parseInt( role, 10 );
		if ( isNaN( role ) || role < 0 || role > 5 )
			return;
		if ( !_IsRetakesMode() || !_IsOpen() || _dismissed )
			return;
		if ( _cardCount > 0 && role >= _cardCount )
			return;

		_Highlight( role );
		_dismissed = true;
		_ApplyVisible( false );

		try
		{
			var owner = _OwnerPanel();
			if ( owner && typeof owner.PickRole === 'function' )
				owner.PickRole( role );
			else
				GameInterfaceAPI.ConsoleCommand( 'retake_pick ' + role );
		}
		catch ( e )
		{
			try { GameInterfaceAPI.ConsoleCommand( 'retake_pick ' + role ); } catch ( e2 ) {}
		}
	};

	var _BindKeys = function()
	{
		if ( _keysBound || !_root || !_root.IsValid() )
			return;
		_keysBound = true;
		$.RegisterKeyBind( _root, 'key_1', function() { RetakeLoadoutHUD.Pick( 0 ); } );
		$.RegisterKeyBind( _root, 'key_2', function() { RetakeLoadoutHUD.Pick( 1 ); } );
		$.RegisterKeyBind( _root, 'key_3', function() { RetakeLoadoutHUD.Pick( 2 ); } );
		$.RegisterKeyBind( _root, 'key_4', function() { RetakeLoadoutHUD.Pick( 3 ); } );
		$.RegisterKeyBind( _root, 'key_5', function() { RetakeLoadoutHUD.Pick( 4 ); } );
		$.RegisterKeyBind( _root, 'key_6', function() { RetakeLoadoutHUD.Pick( 5 ); } );
	};

	var _OnLoad = function()
	{
		_root = $.GetContextPanel();
		_panel = _root.FindChildTraverse( 'RetakeLoadoutPanel' );
		_backdrop = _root.FindChildTraverse( 'RetakeLoadoutBackdrop' );
		if ( !_panel )
			_panel = _root;
		_BindKeys();
		if ( _timer )
			$.CancelScheduled( _timer );
		_timer = $.Schedule( 0.15, function _Tick()
		{
			_Refresh();
			_timer = $.Schedule( 0.15, _Tick );
		} );
		_Refresh();
	};

	return {
		OnLoad: _OnLoad,
		Pick: _Pick
	};
} )();
