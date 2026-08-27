'use-strict';

var AcknowledgeItems = ( function()
{
	var m_isCapabliltyPopupOpen = false;

	var _OnLoad = function ()
	{
		$.RegisterForUnhandledEvent( 'PanoramaComponent_MyPersona_InventoryUpdated', AcknowledgeItems.Init );
		_Init();
	}

	var _Init = function()
	{
		var items = _GetItems();

		if ( items.length < 1 )
		{
			$.DispatchEvent( 'UIPopupButtonClicked', '' );
			return;
		}

		var numItems = items.length;
		_AcknowledgeAllItems.SetItemsToSaveAsNew( items );

		                                                                                                        
		var elParent = $.GetContextPanel().FindChildInLayoutFile( 'AcknowledgeItemsCarousel' );
		elParent.RemoveAndDeleteChildren();

		for ( var i = 0; i < items.length; i++ )
		{
			var elDelayLoadPanel = $.CreatePanel( 
				'DelayLoadPanel', 
				elParent, 
				'carousel_delay_load_' + i,
				{ class: 'Offscreen' } );

			elDelayLoadPanel.SetLoadFunction( _MakeItemPanel.bind( null, items[i], i, numItems ) );
			elDelayLoadPanel.ListenForClassRemoved( 'Offscreen' );
		}
	};

	var _MakeItemPanel = function( item, index, numItems, elParent )
	{
		var elItemTile = $.CreatePanel( 'Panel', elParent, item.id );
		elItemTile.BLoadLayoutSnippet( 'Item' );

		_ShowModelOrItem( elItemTile, item.id );

		var elLabel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemLabel' );
		elLabel.text = ItemInfo.GetName( item.id );

		var rarityColor = ItemInfo.GetRarityColor( item.id );

		var elTitle = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemTitle' );
		var titleKey = '#popup_title_' + item.type;
		var titleText = $.Localize( titleKey );
		// Failed localize often returns POPUP_TITLE_* (no #) — treat as missing.
		var titleMissing = !titleText || titleText === titleKey || titleText.charAt( 0 ) === '#'
			|| titleText.toLowerCase() === ( 'popup_title_' + item.type );
		if ( titleMissing )
		{
			if ( item.type === 'can_sticker' || item.type === 'sticker_apply' )
				titleText = $.Localize( '#popup_title_sticker_apply' ) || 'Sticker Applied';
			else if ( item.type === 'nameable' || item.type === 'nametag_add' )
				titleText = $.Localize( '#popup_title_nametag_add' ) || 'Name Tag Applied';
			else if ( item.type === 'nametag_remove' )
				titleText = $.Localize( '#popup_title_nametag_remove' ) || 'Name Tag Removed';
			else if ( item.type === 'stattrack_swap' )
				titleText = $.Localize( '#popup_title_stattrack_swap' ) || 'New StatTrak Value';
			else if ( item.type === 'scratch_sticker' )
			{
				titleText = $.Localize( '#popup_title_scratch_sticker' );
				if ( !titleText || titleText.charAt( 0 ) === '#' || titleText.toLowerCase() === 'popup_title_scratch_sticker' )
					titleText = 'Sticker Scratched';
			}
			else if ( item.type === 'sticker_remove' )
				titleText = $.Localize( '#popup_title_sticker_remove' ) || 'Removed Sticker';
			else if ( item.type === 'acknowledge' )
				titleText = $.Localize( '#popup_title_acknowledge' ) || 'New Item';
			else
				titleText = $.Localize( '#popup_title_acknowledge' ) || item.type;
		}
		elTitle.text = titleText;
		elTitle.style.washColor = rarityColor;

		var elMovie = elItemTile.FindChildInLayoutFile( 'AcknowledgeMovie' );
		elMovie.style.washColor = rarityColor;

		var elBar = elItemTile.FindChildInLayoutFile( 'AcknowledgeBar' );
		elBar.style.washColor = rarityColor;

		var elInfoBlock = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemInfo' );

		_ShowGiftPanel( elItemTile, item.id );
		_ShowQuestPanel( elItemTile, item.id );
		_ShowSetPanel( elItemTile, item.id );
		_ItemCount( elItemTile, index, numItems );
		                                   
	};

	var _ShowModelOrItem = function( elItemTile, id )
	{
		var elModel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemModel' );
		var elImage = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemImage' );

		// Prefer live ItemPreviewPanel (custom mats / same path as inspect).
		// ItemImage PNG/RT path was leaving empty purple glow for many grants.
		var modelPath = '';
		try { modelPath = ItemInfo.GetModelPathFromJSONOrAPI( id ); } catch ( e ) {}

		if ( modelPath && elModel )
		{
			try
			{
				elModel.SetScene( 'resource/ui/econ/ItemModelPanelCharWeaponInspect.res', modelPath, false );
				elModel.visible = true;
				if ( elImage )
					elImage.visible = false;
				return;
			}
			catch ( e2 ) {}
		}

		if ( elModel )
			elModel.visible = false;
		if ( elImage )
		{
			elImage.visible = true;
			elImage.itemid = id;
			try { elImage.large = true; } catch ( e3 ) {}
		}
	};

	var _ShowGiftPanel = function( elItemTile, id )
	{
		var elPanel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemGift' );
		var gifterId = ItemInfo.GetGifter( id );

		elPanel.SetHasClass( 'hidden', gifterId === '' );

		var elLabel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemGiftLabel' );
		elLabel.SetDialogVariable( 'name', FriendsListAPI.GetFriendName( gifterId ) );
		elLabel.text = $.Localize( '#acknowledge_gifter', elLabel );
	};

	var _ShowQuestPanel = function( elItemTile, id )
	{
		var elPanel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemQuest' );
		elPanel.SetHasClass( 'hidden', 'quest_reward' !== ItemInfo.GetItemPickUpMethod( id ) );
	};

	var _ShowSetPanel = function( elItemTile, id )
	{
		var elPanel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemSet' );
		var strSetName = InventoryAPI.GetTag( id, 'ItemSet' );
		if ( !strSetName || strSetName === '0' )
		{
		    elPanel.SetHasClass( 'hidden', true );
		    return;
		}

		var elLabel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemSetLabel' );
		elLabel.text = InventoryAPI.GetTagString( strSetName );

		var elImage = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemSetImage' );
		elImage.SetImage( 'file://{images_econ}/econ/set_icons/' + strSetName + '_small.png' );
		elPanel.SetHasClass( 'hidden', false );
	};

	var _ItemCount = function( elItemTile, index, numItems )
	{
		var elCountLabel = elItemTile.FindChildInLayoutFile( 'AcknowledgeItemCount' );
		if ( numItems < 2 )
		{
			elCountLabel.visible = false;
			return;
		}

		elCountLabel.visible = true;
		elCountLabel.text = ( index + 1 ) + ' / ' + numItems;
	};

	var _ShowEquipItem = function( elItemTile, id )
	{
		                                           
		var subSlot = ItemInfo.GetSlotSubPosition( id );

		if ( !subSlot || subSlot === '' )
			return;

		var elEquipBtn = elItemTile.FindChildInLayoutFile( 'AcknowledgeEquipBtn' );
		elEquipBtn.RemoveClass( 'hidden' );
	};

	var _GetItems = function()
	{
		var newItems = [];

		var itemCount = InventoryAPI.GetUnacknowledgeItemsCount();
		for ( var i = 0; i < itemCount; i++ )
		{
			var itemId = InventoryAPI.GetUnacknowledgeItemByIndex( i );
			var item = { type: 'acknowledge', id: itemId };

			                                                          
			if ( _ItemstoAcknowlegeRightAway( itemId ) )
				InventoryAPI.AcknowledgeNewItembyItemID( itemId );
			else
				newItems.push( item );
		}

		var getUpdateItem = _GetUpdatedItem();
		if ( getUpdateItem )
		{
			newItems.push( getUpdateItem );
		}

		return newItems;
	};

	var _GetUpdatedItem = function()
	{
		                                                  
		                                                
		                                                                             

		var itemidExplicitAcknowledge = $.GetContextPanel().GetAttributeString( "ackitemid", '' );
		if ( itemidExplicitAcknowledge === '' )
			return false;
		
		return {
			id: itemidExplicitAcknowledge,
			type: $.GetContextPanel().GetAttributeString( "acktype", '' )
		};
	};

	var _ItemstoAcknowlegeRightAway = function( id )
	{
		                                                                 
		                                                                   
		
		                                                                                           
		    
		   	                                                              
		   	            
		    

		var itemType = InventoryAPI.GetItemTypeFromEnum( id );
		if ( itemType === 'quest' || itemType === 'coupon_crate' || itemType === 'campaign' )
			return true;

		return false;
	};

	var _AcknowledgeAllItems = ( function()
	{
		var itemsToSave = [];

		var _SetItemsToSaveAsNew = function( items )
		{
			itemsToSave = items;
		};

		var _OnActivate = function()
		{
			itemsToSave.forEach( function( item )
			{
				if ( item.type === 'acknowledge' )
				{
					InventoryAPI.SetItemSessionPropertyValue( item.id, 'recent', '1' );
					InventoryAPI.AcknowledgeNewItembyItemID( item.id );
				}
				else
				{
					InventoryAPI.SetItemSessionPropertyValue( item.id, 'updated', '1' );
					$.DispatchEvent( 'RefreshActiveInventoryList' );
				}
			} );

			                                          
			                                     
			InventoryAPI.AcknowledgeNewBaseItems();

			var callbackResetAcknowlegePopupHandle = $.GetContextPanel().GetAttributeInt( "callback", -1 );
			if ( callbackResetAcknowlegePopupHandle != -1 )
			{
				                                                                                            
				                                                                                        
				UiToolkitAPI.InvokeJSCallback( callbackResetAcknowlegePopupHandle );
			}

			$.DispatchEvent( 'UIPopupButtonClicked', '' );
			$.DispatchEvent( 'PlaySoundEffect', 'UIPanorama.inventory_new_item_accept', 'MOUSE' );			
		};

		return {
			SetItemsToSaveAsNew: _SetItemsToSaveAsNew,
			OnActivate: _OnActivate
		};
	} )();

	var _SetIsCapabilityPopUpOpen = function( isOpen )
	{
		m_isCapabliltyPopupOpen = isOpen;
	};

	return {
		Init				: _Init,
		OnLoad 				: _OnLoad,
		GetItems			: _GetItems,
		AcknowledgeAllItems	: _AcknowledgeAllItems,
		SetIsCapabilityPopUpOpen: _SetIsCapabilityPopUpOpen
	};
} )();

( function()
{
	                                                                                                    
} )();

