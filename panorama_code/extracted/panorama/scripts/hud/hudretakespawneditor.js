'use strict';

var RetakeSpawnEditorHUD = ( function()
{
	var _root = null;
	var _handler = null;

	var _Api = function()
	{
		return ( typeof RetakeSpawnEditorAPI !== 'undefined' ) ? RetakeSpawnEditorAPI : null;
	};

	var _Refresh = function()
	{
		if ( !_root || !_root.IsValid() )
			return;

		var api = _Api();
		var open = api && api.IsOpen && api.IsOpen();
		_root.SetHasClass( 'hidden', !open );
		if ( !open )
			return;

		var team = api.GetTeamLabel ? api.GetTeamLabel() : 'CT';
		var site = api.GetSiteLabel ? api.GetSiteLabel() : 'A';
		var map = api.GetMapName ? api.GetMapName() : '';

		var elMap = _root.FindChildTraverse( 'RseMap' );
		if ( elMap )
			elMap.text = map;

		var elTeam = _root.FindChildTraverse( 'RseTeamLabel' );
		if ( elTeam )
			elTeam.text = team;
		var btnTeam = _root.FindChildTraverse( 'RseTeamBtn' );
		if ( btnTeam )
		{
			btnTeam.SetHasClass( 'team-t', team === 'T' );
			btnTeam.SetHasClass( 'team-bomb', team === 'BOMB' );
		}

		var elSite = _root.FindChildTraverse( 'RseSiteLabel' );
		if ( elSite )
			elSite.text = site;
		var btnSite = _root.FindChildTraverse( 'RseSiteBtn' );
		if ( btnSite )
			btnSite.SetHasClass( 'site-b', site === 'B' );

		var cta = api.GetCountCTA ? api.GetCountCTA() : 0;
		var ctb = api.GetCountCTB ? api.GetCountCTB() : 0;
		var ta = api.GetCountTA ? api.GetCountTA() : 0;
		var tb = api.GetCountTB ? api.GetCountTB() : 0;
		var ba = api.GetCountBombA ? api.GetCountBombA() : 0;
		var bb = api.GetCountBombB ? api.GetCountBombB() : 0;
		var total = api.GetTotalCount ? api.GetTotalCount() : 0;

		var elCounts = _root.FindChildTraverse( 'RseCounts' );
		if ( elCounts )
			elCounts.text = 'CT·A ' + cta + '  CT·B ' + ctb + '  T·A ' + ta + '  T·B ' + tb + '  C4·A ' + ba + '  C4·B ' + bb;

		var elTotal = _root.FindChildTraverse( 'RseTotal' );
		if ( elTotal )
			elTotal.text = 'всего: ' + total;
	};

	var _OnUpdate = function()
	{
		_Refresh();
	};

	var _Init = function()
	{
		_root = $.GetContextPanel();
		if ( _handler == null )
			_handler = $.RegisterForUnhandledEvent( 'PanoramaComponent_RetakeSpawnEditor_Update', _OnUpdate );
		_Refresh();
	};

	var ToggleTeam = function()
	{
		var api = _Api();
		if ( api && api.ToggleTeam )
			api.ToggleTeam();
		_Refresh();
	};

	var ToggleSite = function()
	{
		var api = _Api();
		if ( api && api.ToggleSite )
			api.ToggleSite();
		_Refresh();
	};

	var Place = function()
	{
		var api = _Api();
		if ( api && api.Place )
			api.Place();
		_Refresh();
	};

	var Undo = function()
	{
		var api = _Api();
		if ( api && api.Undo )
			api.Undo();
		_Refresh();
	};

	var DeleteNearest = function()
	{
		var api = _Api();
		if ( api && api.DeleteNearest )
			api.DeleteNearest();
		_Refresh();
	};

	var Save = function()
	{
		var api = _Api();
		if ( api && api.Save )
			api.Save();
		_Refresh();
	};

	var Close = function()
	{
		var api = _Api();
		if ( api && api.Close )
			api.Close();
		_Refresh();
	};

	return {
		Init: _Init,
		ToggleTeam: ToggleTeam,
		ToggleSite: ToggleSite,
		Place: Place,
		Undo: Undo,
		DeleteNearest: DeleteNearest,
		Save: Save,
		Close: Close
	};
} )();

( function()
{
	RetakeSpawnEditorHUD.Init();
} )();
