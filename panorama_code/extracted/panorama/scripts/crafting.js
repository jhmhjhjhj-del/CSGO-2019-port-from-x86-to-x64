'use strict';

var Crafting = ( function ()
{
	var m_pendingUpdate = null;

    var _Init = function()
    {
        _AddSort();
    }    

    var _AddSort = function()
	{
		var elDropdown = $.GetContextPanel().FindChildInLayoutFile( 'CraftingSortDropdown' );
		if ( !elDropdown )
			return;
		var count = InventoryAPI.GetSortMethodsCount();

		for ( var i = 0; i < count; i++ ) 
		{
			var sort = InventoryAPI.GetSortMethodByIndex( i );
			var newEntry = $.CreatePanel( 'Label', elDropdown, sort, {
				class: 'DropDownMenu'
			} );

			newEntry.text = $.Localize( '#' + sort );
			elDropdown.AddOption( newEntry );
		}

		                        
		elDropdown.SetSelected( InventoryAPI.GetSortMethodByIndex( 1 ) );
	};

    var _UpdateButtons = function ()
    {
        var elTradeUpConfirmBtn = $.GetContextPanel().FindChildTraverse( 'TradeUpConfirmBtn' );
		if ( !elTradeUpConfirmBtn )
			return;
        elTradeUpConfirmBtn.enabled = InventoryAPI.IsCraftReady();
        if ( !elTradeUpConfirmBtn.enabled )
        {
            elTradeUpConfirmBtn.checked = false;
        }    

        var elClearIngredientsBtn = $.GetContextPanel().FindChildTraverse( 'ClearIngredientsBtn' );
		if ( elClearIngredientsBtn )
	        elClearIngredientsBtn.enabled = InventoryAPI.GetCraftIngredientCount() > 0;

        var elCraftItemBtn = $.GetContextPanel().FindChildTraverse( 'CraftItemBtn' );
		if ( elCraftItemBtn )
	        elCraftItemBtn.enabled = elTradeUpConfirmBtn.checked;
    }

    var _UpdateItemList = function()
    {
        var elDropdown = $.GetContextPanel().FindChildInLayoutFile( 'CraftingSortDropdown' );
		if ( !elDropdown || !elDropdown.GetSelected() )
			return;
		var sortType = elDropdown.GetSelected().id;
		var elItems = $( '#Crafting-Items' );
		if ( !elItems )
			return;

        $.DispatchEvent( 'SetInventoryFilter',
            elItems,
            'inv_group_equipment',
            'any',
            'any',
            sortType,
            'recipe',                                 
            ''               
        );
    }

	var _UpdateCraftingPanelDisplayNow = function()
	{
        _UpdateButtons();

		var elItems = $( '#Crafting-Items' );
		var elIng = $( '#Crafting-Ingredients' );
		if ( elItems )
			_UpdateItemList();

		if ( elIng )
		{
			$.DispatchEvent( 'SetInventoryFilter',
				elIng,
				'inv_group_equipment',
				'any',
				'any',
				'',
				'ingredient',                            
				''               
			);
		}
        
		function _UpdateItemCount( ItemListName, LabelName )
		{
			var elItemList = $.GetContextPanel().FindChildTraverse( ItemListName );
			var elLabel = $.GetContextPanel().FindChildTraverse( LabelName );
			if ( !elItemList || !elLabel )
				return;
			elLabel.SetDialogVariableInt( 'count', elItemList.count );
		}

		_UpdateItemCount( 'Crafting-Items', 'CraftingItemsText' );
		_UpdateItemCount( 'Crafting-Ingredients', 'CraftingIngredientsText' );
	};

    var _UpdateCraftingPanelDisplay = function()
	{
		// Coalesce add/remove spam — sync double SetInventoryFilter was blowing the async event queue.
		if ( m_pendingUpdate )
		{
			$.CancelScheduled( m_pendingUpdate );
			m_pendingUpdate = null;
		}
		m_pendingUpdate = $.Schedule( 0.05, function ()
		{
			m_pendingUpdate = null;
			_UpdateCraftingPanelDisplayNow();
		} );
    }

                          
    return {
        Init: _Init,
        UpdateCraftingPanelDisplay: _UpdateCraftingPanelDisplay,
        UpdateButtons: _UpdateButtons,
        UpdateItemList: _UpdateItemList
    };

} )();

                                                                                                    
                                           
                                                                                                    
(function ()
{
    Crafting.Init();
    
    $.RegisterForUnhandledEvent( 'UpdateTradeUpPanel', Crafting.UpdateCraftingPanelDisplay );
    $.RegisterForUnhandledEvent( 'PanoramaComponent_Inventory_CraftIngredientAdded', Crafting.UpdateCraftingPanelDisplay );
	$.RegisterForUnhandledEvent( 'PanoramaComponent_Inventory_CraftIngredientRemoved', Crafting.UpdateCraftingPanelDisplay );
})();
