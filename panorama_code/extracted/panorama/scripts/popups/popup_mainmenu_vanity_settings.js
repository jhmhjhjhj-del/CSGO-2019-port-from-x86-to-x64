'use strict';

var PopupVanitySettings = ( function()
{
	var _Init = function()
	{
		_PopulateModels();
		var subCategories = _StripEmptyStringsFromArray( InventoryAPI.GetSubCategories( 'Type:Equipment' ).split( ',' ) );
		_SetSubCategories( subCategories );
		_LoadFromConvars();

		$( '#VanityDropdownModels' ).SetPanelEvent( 'oninputsubmit', PopupVanitySettings.OnFactionChanged );
		$( '#VanityDropdownSubCatagories' ).SetPanelEvent( 'oninputsubmit', PopupVanitySettings.OnSubCategoryChanged );
	};

	var _ClearDropDown = function( elDropDown )
	{
		if ( !elDropDown )
			return;
		var children = elDropDown.Children();
		for ( var i = children.length - 1; i >= 0; i-- )
			children[i].DeleteAsync( 0 );
	};

	var _PopulateModels = function()
	{
		var elDropDown = $( '#VanityDropdownModels' );
		_ClearDropDown( elDropDown );

		var models = CharacterAnims.GetValidCharacterModels();
		for ( var i = 0; i < models.length; i++ )
		{
			var entry = models[i];
			if ( entry.team !== 'ct' && entry.team !== 't' )
				continue;

			var optionLabel = $.CreatePanel( 'Label', elDropDown, entry.model, {
				text: $.Localize( entry.label )
			} );
			optionLabel.SetAttributeString( 'data-team', entry.team );
			optionLabel.SetAttributeString( 'data-default-slot', entry.loadoutSlot );
			elDropDown.AddOption( optionLabel );
		}
	};

	var _LoadFromConvars = function()
	{
		var model = GameInterfaceAPI.GetSettingString( 'ui_vanitysetting_model' );
		var team = GameInterfaceAPI.GetSettingString( 'ui_vanitysetting_team' );
		var loadoutSlot = GameInterfaceAPI.GetSettingString( 'ui_vanitysetting_loadoutslot' );

		if ( model )
			$( '#VanityDropdownModels' ).SetSelected( model );
		else if ( team === 't' || team === 'ct' )
		{
			var models = CharacterAnims.GetValidCharacterModels();
			for ( var i = 0; i < models.length; i++ )
			{
				if ( models[i].team === team )
				{
					$( '#VanityDropdownModels' ).SetSelected( models[i].model );
					break;
				}
			}
		}

		var subCat = _SlotToSubCategory( loadoutSlot );
		if ( subCat )
			_SelectSubCategory( subCat );
		else if ( $( '#VanityDropdownSubCatagories' ).GetChild( 0 ) )
			$( '#VanityDropdownSubCatagories' ).SetSelected( $( '#VanityDropdownSubCatagories' ).GetChild( 0 ).id );

		_SetGroups( _GetSelectedSubCatagory() );

		var itemId = GameInterfaceAPI.GetSettingString( 'ui_vanitysetting_itemid' );
		if ( itemId && $( '#VanityDropdownGroups' ) )
		{
			var children = $( '#VanityDropdownGroups' ).Children();
			for ( var j = 0; j < children.length; j++ )
			{
				if ( children[j].GetAttributeString( 'data-item-id', '' ) === itemId )
				{
					$( '#VanityDropdownGroups' ).SetSelected( children[j].id );
					break;
				}
			}
		}
	};

	var _SlotToSubCategory = function( slot )
	{
		if ( !slot )
			return '';
		if ( slot.indexOf( 'rifle' ) === 0 ) return 'LoadoutSlot:rifle';
		if ( slot.indexOf( 'secondary' ) === 0 ) return 'LoadoutSlot:secondary';
		if ( slot.indexOf( 'smg' ) === 0 ) return 'LoadoutSlot:smg';
		if ( slot.indexOf( 'heavy' ) === 0 || slot.indexOf( 'shotgun' ) === 0 || slot.indexOf( 'machinegun' ) === 0 )
			return 'LoadoutSlot:heavy';
		if ( slot.indexOf( 'melee' ) === 0 ) return 'LoadoutSlot:melee';
		if ( slot.indexOf( 'clothing' ) === 0 ) return 'LoadoutSlot:clothing_hands';
		return '';
	};

	var _SelectSubCategory = function( subCategory )
	{
		var elDropDown = $( '#VanityDropdownSubCatagories' );
		var children = elDropDown.Children();
		for ( var i = 0; i < children.length; i++ )
		{
			if ( children[i].GetAttributeString( 'data-subcategory', '' ) === subCategory )
			{
				elDropDown.SetSelected( children[i].id );
				return;
			}
		}
	};

	var _SetSubCategories = function( subCategories )
	{
		var elDropDown = $( '#VanityDropdownSubCatagories' );
		_ClearDropDown( elDropDown );
		for ( var i = 0; i < subCategories.length; i++ )
		{
			var displayString = subCategories[i].substring( subCategories[i].indexOf( ':' ) + 1 );
			var optionLabel = $.CreatePanel( 'Label', elDropDown, 'VanitySubCat_' + displayString, {
				text: displayString
			} );
			optionLabel.SetAttributeString( 'data-subcategory', subCategories[i] );
			elDropDown.AddOption( optionLabel );
		}
	};

	var _SetGroups = function( subCategory )
	{
		var groups = _StripEmptyStringsFromArray( InventoryAPI.GetGroups( 'Type:Equipment', subCategory ).split( ',' ) );
		var elParent = $( '#VanityDropdownWeapons' );

		if ( $( '#VanityDropdownGroups' ) )
			$( '#VanityDropdownGroups' ).DeleteAsync( 0 );

		var elDropDown = $.CreatePanel( 'DropDown', elParent, 'VanityDropdownGroups', { class: 'PopupButton' } );
		var team = _GetSelectedTeam();

		if ( subCategory === 'LoadoutSlot:melee' )
		{
			var itemId = LoadoutAPI.GetItemID( team, 'melee' );
			_AddOptionToGroups( elDropDown, itemId, 'Weapon:knife' );
			elDropDown.SetSelected( 'Weapon:knife' );
		}
		else
		{
			for ( var i = 0; i < groups.length; i++ )
			{
				var itemIds = InventoryAPI.GetGroupItems( 'Type:Equipment', subCategory, groups[i] ).split( ',' );
				var itemId = itemIds[0];
				if ( !itemId )
					continue;
				var teamRestriction = InventoryAPI.GetItemTeam( itemId ).toLowerCase();
				if ( teamRestriction.indexOf( 'csgo_inventory_team_any' ) !== -1
					|| teamRestriction.indexOf( 'csgo_inventory_team_' + team ) !== -1 )
				{
					_AddOptionToGroups( elDropDown, itemId, groups[i] );
				}
			}
			if ( groups.length > 0 && elDropDown.GetChild( 0 ) )
				elDropDown.SetSelected( elDropDown.GetChild( 0 ).id );
		}

		elDropDown.SetPanelEvent( 'oninputsubmit', PopupVanitySettings.UpdatePlayerModel );
	};

	var _AddOptionToGroups = function( elDropDown, itemId, group )
	{
		var displayString = InventoryAPI.GetItemName( itemId );
		var optionLabel = $.CreatePanel( 'Label', elDropDown, group, { text: displayString } );
		optionLabel.SetAttributeString( 'data-slot', InventoryAPI.GetSlotSubPosition( itemId ).toString() );
		optionLabel.SetAttributeString( 'data-item-id', itemId );
		elDropDown.AddOption( optionLabel );
	};

	var _StripEmptyStringsFromArray = function( dataRaw )
	{
		return dataRaw.filter( function( v )
		{
			return v !== '' && v != 'any';
		} );
	};

	var _OnFactionChanged = function()
	{
		_SetGroups( _GetSelectedSubCatagory() );
		$.Schedule( 0.25, _UpdatePlayerModel );
	};

	var _OnSubCategoryChanged = function()
	{
		_SetGroups( _GetSelectedSubCatagory() );
		$.Schedule( 0.25, _UpdatePlayerModel );
	};

	var _UpdatePlayerModel = function()
	{
		var elModel = $( '#VanityDropdownModels' ).GetSelected();
		var elWeapon = $( '#VanityDropdownGroups' ) ? $( '#VanityDropdownGroups' ).GetSelected() : null;
		if ( !elModel || !elWeapon )
			return;

		var modelPath = elModel.id;
		var selectedWeapon = elWeapon.id;
		var loadoutSlot = elWeapon.GetAttributeString( 'data-slot', '' );
		var itemId = elWeapon.GetAttributeString( 'data-item-id', '' );
		var team = elModel.GetAttributeString( 'data-team', 'ct' );
		var playIntroAnim = $( '#VanityPlayIntroAnim' ).checked;

		var vanityPanel = $( '#JsMainmenu_Vanity' );
		if ( !vanityPanel )
			return;

		var settings = {
			panel: vanityPanel,
			team: team,
			model: modelPath,
			itemId: itemId,
			loadoutSlot: loadoutSlot,
			selectedWeapon: selectedWeapon,
			playIntroAnim: playIntroAnim
		};

		CharacterAnims.StoreModelPanelSettingsForSaving( settings );
		CharacterAnims.SaveModelPanelSettingsToConvars();
		CharacterAnims.PlayAnimsOnPanel( settings );

		if ( vanityPanel.BHasClass( 'hidden' ) )
			vanityPanel.RemoveClass( 'hidden' );
	};

	var _GetSelectedSubCatagory = function()
	{
		var sel = $( '#VanityDropdownSubCatagories' ).GetSelected();
		if ( !sel )
			return '';
		return sel.GetAttributeString( 'data-subcategory', '' );
	};

	var _GetSelectedTeam = function()
	{
		var sel = $( '#VanityDropdownModels' ).GetSelected();
		if ( !sel )
			return 'ct';
		return sel.GetAttributeString( 'data-team', 'ct' );
	};

	var _OnApply = function()
	{
		_UpdatePlayerModel();
		$.DispatchEvent( 'UIPopupButtonClicked', '' );
	};

	return {
		Init: _Init,
		UpdatePlayerModel: _UpdatePlayerModel,
		OnSubCategoryChanged: _OnSubCategoryChanged,
		OnFactionChanged: _OnFactionChanged,
		OnApply: _OnApply
	};
} )();
