'use strict';

var RetakeHUD = ( function()
{
	var _root = null;
	var _timer = null;
	var _lastSite = -2;

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

	var _ReadSite = function()
	{
		try
		{
			var v = GameInterfaceAPI.GetSettingString( 'sv_retake_bombsite' );
			var n = parseInt( v, 10 );
			return isNaN( n ) ? -1 : n;
		}
		catch ( e )
		{
			return -1;
		}
	};

	var _Refresh = function()
	{
		if ( !_root || !_root.IsValid() )
			return;

		var active = _IsRetakesMode();
		var site = active ? _ReadSite() : -1;
		var show = active && site >= 0;
		_root.SetHasClass( 'hidden', !show );

		if ( !show )
		{
			_lastSite = -1;
			return;
		}

		if ( site === _lastSite )
			return;
		_lastSite = site;

		var el = _root.FindChildTraverse( 'RetakeSiteLabel' );
		if ( el )
		{
			var letter = ( site === 1 ) ? 'B' : 'A';
			el.text = 'Сайт ' + letter;
		}
	};

	var _OnLoad = function()
	{
		_root = $.GetContextPanel();
		if ( _timer )
			$.CancelScheduled( _timer );
		_timer = $.Schedule( 0.25, function _Tick()
		{
			_Refresh();
			_timer = $.Schedule( 0.25, _Tick );
		} );
		_Refresh();
	};

	return {
		OnLoad: _OnLoad
	};
} )();
