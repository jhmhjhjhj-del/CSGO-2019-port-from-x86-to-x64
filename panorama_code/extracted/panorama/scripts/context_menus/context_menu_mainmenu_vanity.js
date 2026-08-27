'use strict';

var MainMenuVanityContextMenu = ( function()
{
	var WEAPON_SLOTS = [
		'secondary0', 'secondary1', 'secondary2', 'secondary3', 'secondary4',
		'smg0', 'smg1', 'smg2', 'smg3', 'smg4', 'smg5',
		'rifle0', 'rifle1', 'rifle2', 'rifle3', 'rifle4', 'rifle5',
		'heavy0', 'heavy1', 'heavy2', 'heavy3', 'heavy4', 'heavy5',
		'melee'
	];

	function _Init()
	{
		var team = $.GetContextPanel().GetAttributeString( 'team', 'ct' );
		if ( team !== 't' && team !== 'ct' )
			team = ( team === '2' ) ? 't' : 'ct';

		var elBody = $.GetContextPanel().FindChildTraverse( 'ContextMenuBodyNoScroll' );
		var elWeapons = $.GetContextPanel().FindChildTraverse( 'ContextMenuBodyWeapons' );
		elBody.RemoveAndDeleteChildren();
		elWeapons.RemoveAndDeleteChildren();

		var fnAddItem = function( parent, idString, strLabel, fnOnActivate )
		{
			var elItem = $.CreatePanel( 'Button', parent, idString );
			elItem.BLoadLayoutSnippet( 'snippet-vanity-item' );
			elItem.FindChildTraverse( 'id-vanity-item__label' ).text = strLabel;
			elItem.SetPanelEvent( 'onactivate', fnOnActivate );
			return elItem;
		};

		var otherTeam = ( team === 't' ) ? 'ct' : 't';
		var otherLabel = ( otherTeam === 'ct' ) ? $.Localize( '#counter-terrorists' ) : $.Localize( '#terrorists' );
		fnAddItem( elBody, 'switchTo_' + otherTeam, otherLabel, function()
		{
			$.DispatchEvent( 'MainMenuSwitchVanity', otherTeam );
			$.DispatchEvent( 'ContextMenuEvent', '' );
		} ).SetFocus();

		fnAddItem( elBody, 'GoToVanitySettings', $.Localize( '#tooltip_navbar_vanity' ), function()
		{
			$.DispatchEvent( 'ContextMenuEvent', '' );
			UiToolkitAPI.ShowCustomLayoutPopup(
				'',
				'file://{resources}/layout/popups/popup_mainmenu_vanity_settings.xml'
			);
		} ).AddClass( 'BottomSeparator' );

		for ( var i = 0; i < WEAPON_SLOTS.length; i++ )
		{
			var slot = WEAPON_SLOTS[i];
			var itemId = LoadoutAPI.GetItemID( team, slot );
			if ( !InventoryAPI.IsValidItemID( itemId ) || !InventoryAPI.IsItemInfoValid( itemId ) )
				continue;
			if ( ItemInfo.IsEquippalbleButNotAWeapon( itemId ) )
				continue;

			var elItem = $.CreatePanel( 'Button', elWeapons, slot );
			elItem.BLoadLayoutSnippet( 'snippet-vanity-item' );
			elItem.AddClass( 'vanity-item--weapon' );
			elItem.FindChildTraverse( 'id-vanity-item__label' ).text = ItemInfo.GetName( itemId );

			var rarityColor = ItemInfo.GetRarityColor( itemId );
			if ( rarityColor )
			{
				elItem.FindChildTraverse( 'id-vanity-item__rarity' ).style.backgroundColor =
					'gradient( linear, 0% 0%, 100% 0%, from(' + rarityColor + ' ), color-stop( 0.0125, #00000000 ), to( #00000000 ) );';
			}

			elItem.SetPanelEvent( 'onactivate', function( selectedId, selectedSlot )
			{
				GameInterfaceAPI.SetSettingString( 'ui_vanitysetting_itemid', selectedId );
				GameInterfaceAPI.SetSettingString( 'ui_vanitysetting_loadoutslot', selectedSlot );
				$.DispatchEvent( 'ForceRestartVanity' );
				$.DispatchEvent( 'ContextMenuEvent', '' );
			}.bind( undefined, itemId, slot ) );
		}
	}

	return {
		Init: _Init
	};
} )();
