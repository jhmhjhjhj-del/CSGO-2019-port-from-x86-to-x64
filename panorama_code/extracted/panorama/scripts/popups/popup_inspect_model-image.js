'use strict';

var InspectModelImage = ( function (){

	var m_elPanel = null;

	var _Init = function ( elPanel, itemId, funcGetSettingCallback)
	{
		var strViewFunc = funcGetSettingCallback ? funcGetSettingCallback( 'viewfunc', '' ) : '';

		if ( ItemInfo.ItemDefinitionNameSubstrMatch( itemId, 'tournament_journal_' ) )
			itemId = ( strViewFunc === 'primary' ) ? itemId : ItemInfo.GetFauxReplacementItemID( itemId, 'graffiti' );

		if ( !InventoryAPI.IsValidItemID( itemId ) )
			return;

		m_elPanel = elPanel;

		var model = ItemInfo.GetModelPathFromJSONOrAPI( itemId );
		if ( model )
			_SetModelScene( elPanel, model, itemId );
		else
			_SetImage( elPanel, itemId );
	};

	var _SetModelScene = function ( elParent, model, itemId )
	{
		var elPanel = elParent.FindChildInLayoutFile( 'InspectItemModel' );
		if ( !elPanel )
			return;

		elPanel.SetScene( "resource/ui/econ/ItemModelPanelCharWeaponInspect.res",
			model,
			false
		);

		elPanel.RemoveClass( 'hidden' );

		var elImage = elParent.FindChildInLayoutFile( 'InspectItemImage' );
		if ( elImage )
			elImage.AddClass( 'hidden' );

		_ShowHideItemPanel( elParent, true );
		_ShowHideCharPanel( elParent, false );
	};

	var _SetImage = function( elParent, itemId )
	{
		var elPanel = elParent.FindChildInLayoutFile( 'InspectItemImage' );
		if ( !elPanel )
			return;

		try { elPanel.itemid = itemId; } catch ( e ) {}

		elPanel.RemoveClass( 'hidden' );
		_TintSprayImage( itemId, elPanel );

		var elModel = elParent.FindChildInLayoutFile( 'InspectItemModel' );
		if ( elModel )
			elModel.AddClass( 'hidden' );

		_ShowHideItemPanel( elParent, true );
		_ShowHideCharPanel( elParent, false );
	};

	var _TintSprayImage = function( id, elImage )
	{
		try
		{
			TintSprayIcon.CheckIsSprayAndTint( id, elImage );
		}
		catch ( e ) {}
	};

	var _SetCharScene = function ( elParent, characterItemId, weaponItemId )
	{
		// March 2019 ItemInfo has no vanity character helpers — keep weapon solo inspect.
		if ( weaponItemId )
			_Init( elParent, weaponItemId, null );
	};

	var _CancelCharAnim = function( elParent )
	{
	};

	var _ShowHideItemPanel = function( elParent, bshow )
	{
		if ( !elParent || !elParent.IsValid() )
			return;

		var el = elParent.FindChildTraverse( 'InspectModelContainer' );
		if ( el )
			el.SetHasClass( 'hidden', !bshow );

		if ( bshow )
			$.DispatchEvent( "PlaySoundEffect", "weapon_showSolo", "MOUSE" );
	};

	var _ShowHideCharPanel = function( elParent, bshow )
	{
		if ( !elParent || !elParent.IsValid() )
			return;

		var el = elParent.FindChildTraverse( 'InspectModelCharContainer' );
		if ( el )
			el.SetHasClass( 'hidden', !bshow );

		if ( bshow )
			$.DispatchEvent( "PlaySoundEffect", "weapon_showOnChar", "MOUSE" );
	};

	var _GetModelPanel = function()
	{
		return m_elPanel ? m_elPanel.FindChildInLayoutFile( 'InspectItemModel' ) : null;
	};

	var _GetImagePanel = function()
	{
		return m_elPanel ? m_elPanel.FindChildInLayoutFile( 'InspectItemImage' ) : null;
	};

	return{
		Init: _Init,
		SetModelScene: _SetModelScene,
		SetCharScene: _SetCharScene,
		CancelCharAnim: _CancelCharAnim,
		ShowHideItemPanel: _ShowHideItemPanel,
		ShowHideCharPanel: _ShowHideCharPanel,
		GetModelPanel: _GetModelPanel,
		GetImagePanel: _GetImagePanel
	};
} )();
