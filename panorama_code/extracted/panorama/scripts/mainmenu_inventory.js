'use strict';

var InventoryPanel = ( function (){

	var _m_activeCategory;
	                                                            
	var _m_elInventoryMain = $.GetContextPanel().FindChildInLayoutFile( 'InventoryMain' );
	var _m_elSelectItemForCapabilityPopup = $.GetContextPanel().FindChildInLayoutFile( 'SelectItemForCapabilityPopup' );
	var _m_elInventorySearch = $.GetContextPanel().FindChildInLayoutFile( 'InvSearchPanel' );
	var _m_isCapabliltyPopupOpen = false;

	var _m_HiddenContentClassname = 'mainmenu-content--hidden';

	var _Init = function()
	{
		_RunEveryTimeInventoryIsShown();
		_CreateCategoriesNavBar();
		_LoadEquipNotification();

		                                           	
		var vanityPanel = $( '#JsMainmenu_Vanity' );
		if ( vanityPanel && UiToolkitAPI.IsPanoramaInECOMode() )
		{
			vanityPanel.Pause( true );
		}
				
	};

	var _RunEveryTimeInventoryIsShown = function()
	{
		                                                                                                   
		                                                                                                 
		                               
		_OnShowAcknowledgePanel();

		if ( !MyPersonaAPI.IsInventoryValid() || !MyPersonaAPI.IsConnectedToGC() )
		{
			                                       
			UiToolkitAPI.ShowGenericPopupOk(
				$.Localize( '#SFUI_SteamConnectionErrorTitle' ),
				$.Localize( '#SFUI_Steam_Error_LinkUnexpected' ),
				'',
				function()
				{
					$.DispatchEvent( 'HideContentPanel' );
				},
				function()
				{
				}
			);
		}
	};

	                                                                                                    
	                                        
	                                                                                                    
	var _CreateCategoriesNavBar = function () {
		var categories = StripEmptyStringsFromArray(InventoryAPI.GetCategories().split(','));

		                                  
		var elDropDown = _CreateInvCategoryDropdown( categories );

		                                                                                           
		_CreateInventoryContentPanel();
		_CreateSubmenusAndListerPanelsForEachCategory( categories );
		
		                                                                      
		_AddTopRightExtraButtonsToInventory();

		                                  
		elDropDown.SetSelected( categories[ 0 ] );
		                                                                                      
	};

	var _CreateInvCategoryDropdown = function( categories )
	{
		var elNavBar = $.CreatePanel('Panel', _m_elInventoryMain, 'InvCategories-NavBarParent', {
			class: 'content-navbar content-navbar--dropdown content-navbar--short'
		});

		var elDropdownContainer = $.CreatePanel('Panel', elNavBar, 'InvDropdownContainer', {
			class: 'vertical-center left-right-flow'
		});

		var elDropDown = $.CreatePanel('DropDown', elDropdownContainer, 'InvCategoriesDropdown', { class:'PopupButton'} );
		var tag = '';

		for ( var i = 0; i < categories.length; i++ ) 
		{
			tag = categories[ i ];
			var newEntry = $.CreatePanel( 'Label', elDropDown, 'InvCategoryDropDown' + tag, {
				class: 'DropDownMenu Width-300'
			} );

			var metaData = _GetMetadata( tag, '', '' );
			var nameToken = _GetValueForKeyFromMetadata( 'nametoken', metaData );

			newEntry.text = $.Localize( '#' + nameToken );
			newEntry.SetAttributeString( 'tag', tag);
			elDropDown.AddOption( newEntry );
		}

		elDropDown.SetPanelEvent( 'oninputsubmit', _OnCategoryDropDownSubmit.bind( undefined, elDropDown ) );

		return elDropDown;
	};

	var _OnCategoryDropDownSubmit = function( elDropDown )
	{
		var tag = elDropDown.GetSelected().GetAttributeString( 'tag', '(not found)');
		_NavigateToTab( tag );
	};

	var _CreateInventoryContentPanel = function () {
		var elCategory = $.CreatePanel('Panel', _m_elInventoryMain, 'InventoryMenuContent', {
			class: 'inv-category__list-container'
		});
	};

	var _CreateNavBar = function (idForNavBar, elParent, useSmallStyle) {
		var elNavBar = $.CreatePanel('Panel', elParent, idForNavBar + '-NavBarParent', {
			class: 'content-navbar'
		});
		
		if( useSmallStyle )
			elNavBar.AddClass('content-navbar--short');

		var navBarClass = useSmallStyle ? 'content-navbar__tabs--small' + ' ' + 'content-navbar__tabs' : 'content-navbar__tabs';
		var elNavBarButtonsContainer = $.CreatePanel('Panel', elNavBar, idForNavBar + '-NavBar', {
			class: navBarClass
		});

		elNavBarButtonsContainer.SetAttributeString( 'data-type', idForNavBar );

		return elNavBarButtonsContainer;
	};

	var _MakeNavBarButtons = function( elNavBar, listOfTags, onActivate )
	{
		var groupName = elNavBar.id;
		listOfTags.forEach( function( tag, i )
		{
			var elButton = $.CreatePanel( 'RadioButton', elNavBar, tag + 'Btn', {
				group: groupName,
			} );

			var metaData = {};
			var catagory = elNavBar.GetAttributeString( 'data-type', '' );

			if ( catagory === "InvCategories" )
				metaData = _GetMetadata( tag, '', '' );
			else
				metaData = _GetMetadata( catagory, tag, '' );

			var nameToken = _GetValueForKeyFromMetadata( 'nametoken', metaData );

			if ( !nameToken )
			{
				nameToken = _GetValueForKeyFromMetadata( 'nameprefix', metaData );
				if ( nameToken !== '' )
					nameToken = nameToken + tag;
			}

			                                                                                                                       

			if ( nameToken )
			{
				$.CreatePanel( 'Label', elButton, '', {
					text: '#' + nameToken
				} );
			}
			else
			{
				                                                      
				var icon = _GetValueForKeyFromMetadata( 'usetournamenticons', metaData );
				if ( icon ) 
				{
					var imageIndex = tag.replace( /^\D+/g, '' );

					$.CreatePanel( 'Image', elButton, '', {
						src: 'file://{images}/tournaments/events/tournament_logo_' + imageIndex + '.svg',
						textureheight: '48',
						scaling: 'stretch-to-fit-preserve-aspect'
					} );

					nameToken = 'CSGO_Tournament_Event_NameShort_' + imageIndex;
					elButton.SetPanelEvent( 'onmouseover', function()
					{
						UiToolkitAPI.ShowTextTooltip( elButton.id, nameToken );
					} );

					elButton.SetPanelEvent( 'onmouseout', function()
					{
						UiToolkitAPI.HideTextTooltip();
					} );
				}
			}

			if ( onActivate )
				elButton.SetPanelEvent( 'onactivate', onActivate.bind( undefined, tag ) );

			elButton.SetAttributeString( 'data-type', tag );
			elButton.SetAttributeString( 'nice-name', nameToken );
		} );

		elNavBar.GetChild( 0 ).checked = true;
	};

	var _CreateSubmenusAndListerPanelsForEachCategory = function( categories )
	{
		var elContent = _m_elInventoryMain.FindChildInLayoutFile( 'InventoryMenuContent' );

		categories.forEach( function( tag, i )
		{
			if ( tag )
			{
				var subCategories = StripEmptyStringsFromArray( InventoryAPI.GetSubCategories( tag ).split( ',' ) );
				                                                         
				var elCategory = $.CreatePanel( 'Panel', elContent, tag, {
					class: 'inv-category'
				} );

				_AddTransitionEventToPanel( elCategory );

				                                                                                
				                                                       	
				var elNavBar = _CreateNavBar( tag, elCategory, true );
				_MakeNavBarButtons( elNavBar, subCategories, function( subCategory )
				{
					                                                                                      
					                                                        
					_UpdateActiveInventoryList();

				} );

				           
				_AddSortDropdownToNavBar( elNavBar.GetParent() );

				              
				$.CreatePanel( 'InventoryItemList', elCategory, tag + '-List' );
			}
		} );
	};

	var _AddTransitionEventToPanel = function( newPanel )
	{
		newPanel.OnPropertyTransitionEndEvent = function( panelName, propertyName )
		{
			if ( newPanel.id === panelName && propertyName === 'opacity' )
			{
				                                         
				if ( newPanel.visible === true && newPanel.BIsTransparent() )
				{
					                                               
					newPanel.visible = false;
					                                       
					return true;
				}
			}

			return false;
		};

		$.RegisterEventHandler( 'PropertyTransitionEnd', newPanel, newPanel.OnPropertyTransitionEndEvent );
	};

	var _UpdateActiveInventoryList = function()
	{
		var activePanel = _m_elInventoryMain.FindChildInLayoutFile( _m_activeCategory );
		InventoryPanel.UpdateActiveItemList(
			_GetActiveCategoryLister( activePanel ),
			_m_activeCategory,
			_GetSelectedSubCategory( activePanel ),
			_GetSelectedSort( activePanel ),
			''
		);
	};

	var _NameFromTag = function( tag )
	{
		var nameToken;

		if ( tag === 'any' )
			nameToken = '#Inv_Category_any';
		else
			nameToken = tag;

		if ( nameToken === '' || nameToken === undefined )
			nameToken = '#Inv_Error_No_Name';

		return nameToken;
	};

	                                                                                                    
	                
	                                                                                                    
	var _NavigateToTab = function( category )
	{
		                                                  
		if ( _m_activeCategory !== category )
		{
			if ( _m_activeCategory )
			{
				var panelToHide = _m_elInventoryMain.FindChildInLayoutFile( _m_activeCategory );
				panelToHide.RemoveClass( 'Active' );

				                                           
			}

			                   
			_m_activeCategory = category;
			var activePanel = _m_elInventoryMain.FindChildInLayoutFile( category );
			activePanel.AddClass( 'Active' );

			                                                                         
			activePanel.visible = true;
			activePanel.SetReadyForDisplay( true );
			                                           

			_UpdateActiveItemList(
				_GetActiveCategoryLister( activePanel ),
				category,
				_GetSelectedSubCategory( activePanel ),
				_GetSelectedSort( activePanel ),
				''
			);
		}
	};

	                                                                                                    
	                               
	                                                                                                    
	var _AddSortDropdownToNavBar = function( elNavBar )
	{
		var elDropdown = elNavBar.FindChildInLayoutFile( 'InvSortDropdown' );
		
		if ( !elDropdown )
		{
			var elDropdownParent = $.CreatePanel( 'Panel', elNavBar, 'InvExtraNavOptions' );
			elDropdownParent.BLoadLayoutSnippet( 'InvSortDropdownSnippet' );
			elDropdown = elDropdownParent.FindChildInLayoutFile( 'InvSortDropdown' );
			elDropdown.SetPanelEvent('oninputsubmit', _UpdateSort.bind( undefined, elDropdown ) );

			var count = InventoryAPI.GetSortMethodsCount();

			for (var i = 0; i < count; i++) 
			{
				var sort = InventoryAPI.GetSortMethodByIndex(i);
				var newEntry = $.CreatePanel('Label', elDropdownParent, sort, {
					class: 'DropDownMenu'
				});
	
				newEntry.text = $.Localize('#'+sort);
				elDropdown.AddOption(newEntry);
			}
	
			                        
			elDropdown.SetSelected( GameInterfaceAPI.GetSettingString( "cl_inventory_saved_sort2" ) );
		}
	};

	var _UpdateSort = function( elDropdown )
	{
		var activePanel = _m_elInventoryMain.FindChildInLayoutFile( _m_activeCategory );
		
		if ( activePanel )
		{
			_UpdateActiveItemList(
				_GetActiveCategoryLister( activePanel ),
				_m_activeCategory,
				_GetSelectedSubCategory( activePanel ),
				elDropdown.GetSelected().id,
				''
			);

			if ( typeof elDropdown.GetSelected().id === "string" && elDropdown.GetSelected().id !== GameInterfaceAPI.GetSettingString( "cl_inventory_saved_sort2" ) )
			{
				GameInterfaceAPI.SetSettingString( "cl_inventory_saved_sort2", elDropdown.GetSelected().id );
				GameInterfaceAPI.ConsoleCommand( "host_writeconfig" );
			}
		}
	};

	                                                                                                    
	              
	                                                                                                    
	var _AddTopRightExtraButtonsToInventory = function()
	{
		if ( !$( '#TopRightExtraButtons' ) )
		{
			var elParent = $( '#InvCategories-NavBarParent' );
			var elTopRightExtraButtons = $.CreatePanel( 'Panel', elParent, 'TopRightExtraButtons' );
			elTopRightExtraButtons.BLoadLayoutSnippet( "TopRightExtraButtonsSnippet" );

			var elInvLoadoutBtn = elTopRightExtraButtons.FindChild( "InvLoadoutBtn" );
			elInvLoadoutBtn.SetPanelEvent( 'onactivate', _ShowLoadout );
			_UpdateLoadoutButtonState();

			var elInvTradeUpBtn = elTopRightExtraButtons.FindChild( "InvCraftingBtn" );
			elInvTradeUpBtn.SetPanelEvent( 'onactivate', function ()
			{
				_UpdateCraftingPanelVisibility( true );
			} );

			var elInvSearchBtn = elTopRightExtraButtons.FindChild( "InvSearchBtn" );
			elInvSearchBtn.SetPanelEvent( 'onactivate', function ()
			{
				_HideInventoryMainListers();
				_UpdateSearchPanelVisibility( true );
			} );

			_AddMarketLink( elParent );
		}
	};

	var _AddMarketLink = function( elParent )
	{
		if ( MyPersonaAPI.GetLauncherType() === "perfectworld" )
		{
			return;
		}
		
		var elMarketLink = $.CreatePanel( 'Panel', elParent, 'MarketLink' );
		elMarketLink.BLoadLayoutSnippet( "MarketLinkSnippet" );
		elMarketLink.SetPanelEvent( 'onactivate', onActivate );

		var appId = SteamOverlayAPI.GetAppID();
		var communityUrl = SteamOverlayAPI.GetSteamCommunityURL();
		
		function onActivate ()
		{
			SteamOverlayAPI.OpenURL( communityUrl + "/market/search?q=&appid=" + appId + "&lock_appid=" + appId );
		}
	};

	var _EnsureLoadoutPanel = function()
	{
		var elParent = $.GetContextPanel().FindChildInLayoutFile( 'InvLoadoutPanel' );
		if ( !elParent )
			return null;
		var el = elParent.FindChild( 'Loadout' );
		if ( el && el.paneltype === 'CSGOLoadout' )
			return el;
		// Placeholder Panel in XML (CSGOLoadout at inventory parse crashes via ItemImage RT).
		// Replace lazily on first open of Снаряжение.
		if ( el )
		{
			el.id = 'Loadout_StubPlaceholder';
			el.DeleteAsync( 0.0 );
		}
		el = $.CreatePanel( 'CSGOLoadout', elParent, 'Loadout', {
			class: 'full-width full-height',
			registerforreadyevents: 'true',
			readyfordisplay: 'false'
		} );
		return el;
	};

	var _ShowLoadout = function ()
	{
		var elLoadoutContainer = $.GetContextPanel().FindChildInLayoutFile( 'InvLoadoutPanel' );
		var elLoadoutInner = _EnsureLoadoutPanel();
		if ( !elLoadoutContainer || !elLoadoutInner )
			return;

		elLoadoutContainer.RemoveClass( _m_HiddenContentClassname );
		if ( elLoadoutInner.SetReadyForDisplay )
			elLoadoutInner.SetReadyForDisplay( true );

		_HideInventoryMainListers();
		_CloseSelectItemForCapabilityPopup();
	};

	var _CloseLoadout = function()
	{
		var elLoadout = $.GetContextPanel().FindChildInLayoutFile( 'InvLoadoutPanel' );
		if ( elLoadout )
			elLoadout.AddClass( _m_HiddenContentClassname );
		var elLoadoutInner = $.GetContextPanel().FindChildInLayoutFile( 'Loadout' );
		if ( elLoadoutInner && elLoadoutInner.SetReadyForDisplay )
			elLoadoutInner.SetReadyForDisplay( false );

		_ShowInventoryMainListers();
		return true;
	};


	var _ShowLoadoutForItem = function( slot, subSlot, team )
	{
		_ShowLoadout();
	};

	                                                                                                    
	          
	                                                                                                    
	var _GetActiveCategoryLister = function( activePanel )
	{
		if ( activePanel )
		{
			var elList = activePanel.FindChildInLayoutFile( _m_activeCategory + '-List' );
			return ( elList ) ? elList : null;
		}

		return null;
	};

	var _GetSelectedSort = function( activePanel )
	{
		var elDropdown = null;
		
		if ( activePanel )
		{
			elDropdown = activePanel.FindChildInLayoutFile( 'InvSortDropdown' );
		}
		
		return ( elDropdown ) ? elDropdown.GetSelected().id : '';
	};

	var _GetSelectedSubCategoryPanel = function( activePanel )
	{
		var elSubCategoryNavBar = activePanel.FindChildInLayoutFile( _m_activeCategory + '-NavBar' );

		if ( !elSubCategoryNavBar )
		{
			return null;
		}

		var tabs = elSubCategoryNavBar.Children();

		tabs = tabs.filter( function( e )
		{
			return e.checked;
		} );

		return tabs;
	};

	var _GetSelectedSubCategory = function( activePanel )
	{
		var tabs = _GetSelectedSubCategoryPanel( activePanel );
		return ( tabs ) ? tabs[0].GetAttributeString( 'data-type', 'any' ) : 'any';
	};

	var StripEmptyStringsFromArray = function (dataRaw)
	{
		return dataRaw.filter(function (v) {
				return v !== '';
			});
	};

	var _GetValueForKeyFromMetadata = function (key, metaData) 
	{
		                 

		if (metaData.hasOwnProperty(key))
			return metaData[key];

		return '';
	};

	var _GetMetadata = function (category, subCategory, group) 
	{
		var metaData = JSON.parse(InventoryAPI.GetInventoryStructureJSON(category, subCategory, group));
		                                                                                                                                                          

		return metaData;
	};

	var _HideInventoryMainListers = function ()
	{
		if ( !_m_elInventoryMain.BHasClass( _m_HiddenContentClassname ) )
			_m_elInventoryMain.AddClass( _m_HiddenContentClassname );
		else if ( !_m_elInventorySearch.BHasClass( _m_HiddenContentClassname ) )
			_UpdateSearchPanelVisibility( false );
	};

	var _ShowInventoryMainListers = function ()
	{
		if ( !_m_elInventorySearch.BHasClass( _m_HiddenContentClassname ) )
			_UpdateSearchPanelVisibility( false );
		else
			_m_elInventoryMain.RemoveClass( _m_HiddenContentClassname );
	};

	var _IsSearchActivePanel = function( catergory )
	{
		return catergory === 'InvSearchPanel';
	};

	                                                                                                    
	var _StubPaintOf = function( id )
	{
		var names = [ 'set item texture prefab', '{float}set item texture prefab' ];
		for ( var i = 0; i < names.length; i++ )
		{
			try
			{
				var v = InventoryAPI.GetItemAttributeValue( id, names[ i ] );
				if ( v !== undefined && v !== null && v !== '' && Number( v ) )
					return Math.round( Number( v ) );
			}
			catch ( e ) {}
		}
		try
		{
			if ( typeof StubGrantData !== 'undefined' && StubGrantData.itemPaints )
			{
				var fromGrant = StubGrantData.itemPaints[ String( id ) ];
				if ( fromGrant )
					return Math.round( Number( fromGrant ) );
			}
		}
		catch ( e0 ) {}
		return 0;
	};

	var _StubResolveItemImagePath = function( id )
	{
		var def = 0;
		var paint = _StubPaintOf( id );
		try { def = InventoryAPI.GetItemDefinitionIndex( id ) || 0; } catch ( e2 ) { def = 0; }

		if ( def && typeof StubGrantData !== 'undefined' && StubGrantData.iconPaths )
		{
			var mapped = StubGrantData.iconPaths[ def + '_' + paint ];
			if ( mapped )
				return mapped;
			if ( paint === 0 )
			{
				mapped = StubGrantData.iconPaths[ def + '_0' ];
				if ( mapped )
					return mapped;
			}
		}

		try
		{
			var path = InventoryAPI.GetItemInventoryImage( id );
			if ( path )
				return path;
		}
		catch ( e ) {}

		try
		{
			if ( def )
			{
				var faux = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( def, paint || 0 );
				if ( faux )
				{
					var fp = InventoryAPI.GetItemInventoryImage( faux );
					if ( fp )
						return fp;
				}
			}
		}
		catch ( e3 ) {}
		return null;
	};

	var _FillStubItemList = function( elList, category, subCategory, sortString )
	{
		elList.RemoveAndDeleteChildren();
		elList.Data().count = 0;

		var sort = sortString || 'inv_sort_age';
		var filter = ( subCategory && subCategory !== 'any' ) ? subCategory : '';
		try
		{
			InventoryAPI.SetInventorySortAndFilters( sort, false, filter, '', '' );
		}
		catch ( e )
		{
			return;
		}

		var count = InventoryAPI.GetInventoryCount();
		if ( !count || count < 1 )
			return;

		var shown = 0;
		for ( var i = 0; i < count && shown < 400; i++ )
		{
			var id = InventoryAPI.GetInventoryItemIDByIndex( i );
			if ( !id || id === '0' || id === 0 )
				continue;
			if ( !InventoryAPI.IsValidItemID( id ) )
				continue;

			var tile = $.CreatePanel( 'Button', elList, 'stub_tile_' + String( id ), {
				class: 'item-tile',
				style: 'width: 192px; height: 218px; padding: 0px 13px; margin: 0px;'
			} );
			tile.SetAttributeString( 'itemid', String( id ) );

			$.CreatePanel( 'Panel', tile, 'ItemTileBg', { class: 'item-tile__bg' } );

			var img = $.CreatePanel( 'Image', tile, 'ItemImage', {
				class: 'item-tile__image',
				scaling: 'stretch-to-fit-preserve-aspect'
			} );
			var imagePath = _StubResolveItemImagePath( id );
			if ( imagePath )
				img.SetImage( 'file://{images_econ}/' + imagePath + '.png' );

			var name = $.CreatePanel( 'Label', tile, 'JsItemName', { class: 'item-tile__name', html: 'true' } );
			try { name.text = ItemInfo.GetName( id ) || ''; } catch ( e3 ) { name.text = ''; }

			var rarity = $.CreatePanel( 'Panel', tile, 'JsRarity', { class: 'item-tile__rarity' } );
			try
			{
				var color = ItemInfo.GetRarityColor( id );
				if ( color )
					rarity.style.backgroundColor = color;
			}
			catch ( e4 ) {}

			var eq = $.CreatePanel( 'Panel', tile, 'JsEquipped', { class: 'item-tile__equipped' } );
			var eqCt = $.CreatePanel( 'Panel', eq, 'ItemEquipped-ct', { class: 'item-tile__equipped__radiodot item-tile__equipped__radiodot--ct hidden' } );
			var eqT = $.CreatePanel( 'Panel', eq, 'ItemEquipped-t', { class: 'item-tile__equipped__radiodot item-tile__equipped__radiodot--t hidden' } );
			try
			{
				var subSlot = ItemInfo.GetSlotSubPosition( id );
				if ( ItemInfo.IsEquippedForNoTeam( id ) && ( subSlot === 'flair0' || subSlot === 'musickit' || subSlot === 'spray0' ) )
				{
					eqCt.RemoveClass( 'hidden' );
					eqCt.AddClass( 'item-tile__equipped__radiodot--filled' );
				}
				else if ( ItemInfo.IsItemAnyTeam( id ) )
				{
					if ( ItemInfo.IsEquippedForCT( id ) )
					{
						eqCt.RemoveClass( 'hidden' );
						eqCt.AddClass( 'item-tile__equipped__radiodot--filled' );
						eqT.RemoveClass( 'hidden' );
					}
					if ( ItemInfo.IsEquippedForT( id ) )
					{
						eqT.RemoveClass( 'hidden' );
						eqT.AddClass( 'item-tile__equipped__radiodot--filled' );
						eqCt.RemoveClass( 'hidden' );
					}
				}
				else if ( ItemInfo.IsEquippedForCT( id ) )
				{
					eqCt.RemoveClass( 'hidden' );
					eqCt.AddClass( 'item-tile__equipped__radiodot--filled' );
				}
				else if ( ItemInfo.IsEquippedForT( id ) )
				{
					eqT.RemoveClass( 'hidden' );
					eqT.AddClass( 'item-tile__equipped__radiodot--filled' );
				}
			}
			catch ( e5 ) {}

			( function( itemId )
			{
				var openMenu = function()
				{
					$.DispatchEvent( 'PlaySoundEffect', 'inventory_item_select', 'MOUSE' );
					try
					{
						if ( typeof InventoryPanel === 'object' && InventoryPanel.GetCapabilityInfo )
						{
							var capInfo = InventoryPanel.GetCapabilityInfo();
							if ( capInfo && capInfo.popupVisible )
								return;
						}
					}
					catch ( eCap ) {}

					var contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent(
						'',
						'',
						'file://{resources}/layout/context_menus/context_menu_inventory_item.xml',
						'itemid=' + itemId,
						function() {}
					);
					if ( contextMenuPanel )
						contextMenuPanel.AddClass( 'ContextMenu_NoArrow' );
				};
				tile.SetPanelEvent( 'onactivate', openMenu );
				tile.SetPanelEvent( 'oncontextmenu', openMenu );
			} )( String( id ) );

			shown++;
		}
		elList.Data().count = shown;
	};

	var _UpdateActiveItemList = function( elListerToUpdate, category, subCategory, sortString, capabilityFilter )
	{
		if ( !elListerToUpdate || !subCategory || !category )
		{
			return;
		}

		if ( _IsSearchActivePanel( category ) )
		{
			InventorySearch.UpdateItemList();
			return;
		}

		$.DispatchEvent('SetInventoryFilter',
			elListerToUpdate,
			category,
			subCategory,
			'any',
			sortString,
			capabilityFilter,
			''               
		);

		_ShowHideNoItemsMessage( elListerToUpdate, capabilityFilter );
	};

	var _ShowHideNoItemsMessage = function( elLister, capabilityFilter )
	{
		var count = elLister.count;
		var elParent = elLister.GetParent();

		var elEmpty = elParent.FindChildInLayoutFile( 'JsInvEmptyLister' );

		if ( count > 0 )
		{
			if ( elEmpty )
			{
				elEmpty.DeleteAsync( 0.0 );
			}
			return;
		}

		if ( !elEmpty )
		{
			var elEmpty = $.CreatePanel( 'Panel', elParent, 'JsInvEmptyLister' );
			elEmpty.BLoadLayoutSnippet( 'InvEmptyLister' );
			elParent.MoveChildBefore( elEmpty, elLister );
		}

		var activePanel = _m_elInventoryMain.FindChildInLayoutFile(_m_activeCategory);
		var elSubCat = _GetSelectedSubCategoryPanel( activePanel );

		var elLabel = elEmpty.FindChildInLayoutFile( 'JsInvEmptyListerLabel' );
	
		if ( ( capabilityFilter != '' ) && ( _SelectedCapabilityInfo.initialItemId != '' ) )
		{
			elLabel.SetDialogVariable( 'type', ItemInfo.GetName( _SelectedCapabilityInfo.initialItemId ) );
			if ( ( _SelectedCapabilityInfo.capability === 'can_stattrack_swap' ) && !InventoryAPI.IsTool( _SelectedCapabilityInfo.initialItemId ) )
				elLabel.text = $.Localize( '#inv_empty_lister_for_stattrackswap', elLabel );                                                   
			else
				elLabel.text = $.Localize( '#inv_empty_lister_for_use', elLabel );
		}
		else
		{
			elLabel.SetDialogVariable( 'type', $.Localize( elSubCat[ 0 ].GetAttributeString( 'nice-name', '' ) ) );
			elLabel.text = $.Localize( '#inv_empty_lister', elLabel );
		}
	};

	                                                                                                    
	var _OnReadyForDisplay = function ()
	{
		_RunEveryTimeInventoryIsShown();
		_UpdateActiveInventoryList();
		_UpdateLoadoutButtonState();

		                                           	
		var vanityPanel = $( '#JsMainmenu_Vanity' );
		if ( vanityPanel && UiToolkitAPI.IsPanoramaInECOMode() )
		{
			vanityPanel.Pause( true );
		}
	};

	var _InventoryUpdated = function()
	{
		                                           
		if( $.GetContextPanel().BHasClass( _m_HiddenContentClassname ) || _m_isCapabliltyPopupOpen )
			return;
	
		_OnShowAcknowledgePanel();

		if ( !_m_elInventorySearch.BHasClass( _m_HiddenContentClassname ) )
		{
			InventorySearch.UpdateItemList();
		}
		else if ( _m_activeCategory )
		{
			_UpdateActiveInventoryList();
		}
	};

	var _OnShowAcknowledgePanel = function()
	{
		var itemsToAcknowledge = AcknowledgeItems.GetItems();
		
		if ( itemsToAcknowledge.length > 0 )
		{
			$.DispatchEvent( 'ShowAcknowledgePopup', '', '' );
		}
	};

	var _UpdateLoadoutButtonState = function()
	{
		var elInvLoadoutBtn = $.GetContextPanel().FindChildTraverse( "InvLoadoutBtn" );
		if ( elInvLoadoutBtn )
		{
			elInvLoadoutBtn.enabled = LoadoutAPI.IsLoadoutAllowed();

			elInvLoadoutBtn.SetPanelEvent( 'onmouseover', elInvLoadoutBtn.enabled ? function() {} : function()
			{
				UiToolkitAPI.ShowTextTooltip( elInvLoadoutBtn.id, "#tooltip_loadout_disabled" );
			} );

			elInvLoadoutBtn.SetPanelEvent( 'onmouseout', elInvLoadoutBtn.enabled ? function() {} : function()
			{
				UiToolkitAPI.HideTextTooltip();
			} );
		}	
	}

	                                                                                                    
	                                
	                                                                                                    
	var _SelectedCapabilityInfo = {
		capability : '',
		initialItemId :'',
		secondaryItemId : '',
		popupVisible : false
	};

	var _GetCapabilityInfo = function ()
	{
		return _SelectedCapabilityInfo;
	};
	
	var _ShowSelectItemForCapabilityPopup = function( capability, itemid, itemid2 )
	{
		                                                                  
		$.DispatchEvent( 'PlaySoundEffect', 'tab_mainmenu_inventory', 'MOUSE' );

		_m_elSelectItemForCapabilityPopup.RemoveClass( _m_HiddenContentClassname );
		_m_elSelectItemForCapabilityPopup.SetFocus();

		_HideInventoryMainListers();

		_SelectedCapabilityInfo.capability = capability;
		_SelectedCapabilityInfo.initialItemId = itemid;
		_SelectedCapabilityInfo.secondaryItemId = itemid2;
		_SelectedCapabilityInfo.popupVisible = true;

		_UpdatePopup( itemid, capability );
	};
	
	var _CloseSelectItemForCapabilityPopup = function ()
	{
		                                      
		$.DispatchEvent( 'PlaySoundEffect', 'inventory_inspect_close', 'MOUSE' );

		if( _m_elSelectItemForCapabilityPopup.BHasClass( _m_HiddenContentClassname ))
		{
			return;
		}
		
		_m_elSelectItemForCapabilityPopup.AddClass( _m_HiddenContentClassname );
		_m_elInventoryMain.SetFocus();

		_SelectedCapabilityInfo.popupVisible = false;
		_ShowInventoryMainListers();
		return true;
	};

	var _FillCapabilityPartnerList = function( elList, seedId, capability )
	{
		elList.RemoveAndDeleteChildren();
		elList.Data().count = 0;

		var count = 0;
		try
		{
			count = InventoryAPI.GetChosenActionItemsCount( String( seedId ), capability ) || 0;
		}
		catch ( e )
		{
			count = 0;
		}

		var shown = 0;
		for ( var i = 0; i < count && shown < 400; i++ )
		{
			var id = '';
			try
			{
				id = InventoryAPI.GetChosenActionItemIDByIndex( String( seedId ), capability, i );
			}
			catch ( e2 )
			{
				continue;
			}
			if ( !id || id === '0' || id === 0 )
				continue;

			var tile = $.CreatePanel( 'Button', elList, 'cap_tile_' + String( id ), {
				class: 'item-tile',
				style: 'width: 192px; height: 218px; padding: 0px 13px; margin: 0px;'
			} );
			tile.SetAttributeString( 'itemid', String( id ) );
			$.CreatePanel( 'Panel', tile, 'ItemTileBg', { class: 'item-tile__bg' } );

			var img = $.CreatePanel( 'Image', tile, 'ItemImage', {
				class: 'item-tile__image',
				scaling: 'stretch-to-fit-preserve-aspect'
			} );
			var imagePath = _StubResolveItemImagePath( id );
			if ( imagePath )
				img.SetImage( 'file://{images_econ}/' + imagePath + '.png' );

			var name = $.CreatePanel( 'Label', tile, 'JsItemName', { class: 'item-tile__name', html: 'true' } );
			try { name.text = ItemInfo.GetName( id ) || ''; } catch ( e3 ) { name.text = ''; }

			var rarity = $.CreatePanel( 'Panel', tile, 'JsRarity', { class: 'item-tile__rarity' } );
			try
			{
				var color = ItemInfo.GetRarityColor( id );
				if ( color )
					rarity.style.backgroundColor = color;
			}
			catch ( e4 ) {}

			( function( partnerId, seed, cap )
			{
				tile.SetPanelEvent( 'onactivate', function()
				{
					$.DispatchEvent( 'PlaySoundEffect', 'inventory_item_select', 'MOUSE' );
					var toolId = InventoryAPI.IsTool( partnerId ) ? partnerId : seed;
					var itemId = InventoryAPI.IsTool( partnerId ) ? seed : partnerId;
					if ( !InventoryAPI.IsTool( toolId ) && InventoryAPI.IsTool( seed ) )
					{
						toolId = seed;
						itemId = partnerId;
					}

					if ( cap === 'nameable' )
					{
						UiToolkitAPI.ShowCustomLayoutPopupParameters(
							'',
							'file://{resources}/layout/popups/popup_capability_nameable.xml',
							'nametag-and-itemtoname=' + toolId + ',' + itemId +
							'&' + 'asyncworktype=nameable'
						);
					}
					else if ( cap === 'can_sticker' )
					{
						UiToolkitAPI.ShowCustomLayoutPopupParameters(
							'',
							'file://{resources}/layout/popups/popup_capability_can_sticker.xml',
							'sticker-and-itemtosticker=' + toolId + ',' + itemId +
							'&' + 'asyncworktype=can_sticker'
						);
					}
					else if ( cap === 'decodable' )
					{
						UiToolkitAPI.ShowCustomLayoutPopupParameters(
							'',
							'file://{resources}/layout/popups/popup_capability_decodable.xml',
							'key-and-case=' + toolId + ',' + itemId +
							'&' + 'asyncworktype=decodeable'
						);
					}
					_CloseSelectItemForCapabilityPopup();
				} );
			} )( String( id ), String( seedId ), capability );

			shown++;
		}
		elList.Data().count = shown;
		elList.count = shown;
	};

	var _UpdatePopup = function ( id, capability )
	{
		var elParent = _m_elSelectItemForCapabilityPopup;
		var elList = elParent.FindChildInLayoutFile( 'ItemListForCapability' );
		if ( elList )
			elList.DeleteAsync( 0.0 );

		// Bypass native InventoryItemList — it filters via view tiers and often drops tools.
		elList = $.CreatePanel( 'Panel', elParent, 'ItemListForCapability', {
			class: 'InvListPanel',
			style: 'width: 100%; height: 100%; flow-children: right-wrap; overflow: squish scroll;'
		} );

		_FillCapabilityPartnerList( elList, id, capability );
		_ShowHideNoItemsMessage( elList, capability + ':' + id );
		_SetCapabilityPopupTitle( id, capability );
	};

	var _SetCapabilityPopupTitle = function( id, capability )
	{
		                                      
		var elPrefixString = _m_elSelectItemForCapabilityPopup.FindChildInLayoutFile('CapPrefixItemLabel');
		var szPrefixString = '#inv_select_item_use';
		if ( capability === 'can_stattrack_swap' ) 
		{
			szPrefixString = InventoryAPI.IsTool( id ) ?
							'#inv_select_item_use' :
							'#inv_select_item_stattrack_swap';
		}
		elPrefixString.text = szPrefixString;

		                                             
		var elImage = _m_elSelectItemForCapabilityPopup.FindChildInLayoutFile('CapItemImage');
		elImage.itemid = id;

		var elLabel = _m_elSelectItemForCapabilityPopup.FindChildInLayoutFile('CapItemName');
		elLabel.text = ItemInfo.GetName(id);
	};

	var _SetIsCapabilityPopUpOpen = function( isOpen )
	{
		                                                                                                        
		                                                                                                       
		                                       
		_m_isCapabliltyPopupOpen = isOpen;

		if( isOpen === false )
		{
			_InventoryUpdated();
		}
	};

	                                                                                                    
	                                                                                                     
	                                                                     
	                                                                                                    
	var _ShowDeleteItemConfirmation = function( id )
	{
		UiToolkitAPI.ShowGenericPopupYesNo(
			'#inv_context_delete',
			'#inv_confirm_delete_desc',
			"", 
			function()
			{
				_DeleteItemAnim( id );
			},
			function() {} 
		);
	};

	var _DeleteItemAnim = function( id )
	{
		var activePanel = _m_elInventoryMain.FindChildInLayoutFile( _m_activeCategory );
		var elList = _GetActiveCategoryLister( activePanel );

		var childrenList = elList.Children();
		childrenList.forEach( element => { 
			if ( id === element.GetAttributeString( 'itemid', '0' ) )
			{
				element.AddClass( 'delete' );
			}
		});
		
		$.Schedule( .3, _DeleteItem.bind( undefined, id ) );
	};

	var _DeleteItem = function( id )
	{
		InventoryAPI.DeleteItem( id );
	};

	                             
	var _ShowUseItemOnceConfirmationPopup = function( id )
	{
		var pPopup = UiToolkitAPI.ShowGenericPopupYesNo(
			'#inv_context_useitem',
			'#inv_confirm_useitem_desc',
			"", 
			function()
			{
				InventoryAPI.UseTool( id, '' );
			},
			function() {} 
		);
		if ( pPopup != null )
		{
			pPopup.SetDialogVariable( 'type', ItemInfo.GetName( id ) );
		}
	};

	var _ShowResetMusicConfirmation = function( id )
	{
		UiToolkitAPI.ShowGenericPopupTwoOptions(
			$.Localize( '#inv_reset_volume_warning_title' ),
			$.Localize( '#inv_reset_volume_warning' ),
			'',
			$.Localize( '#SFUI_InvUse_Equip_MusicKit' ),
			function()
			{
				InventoryAPI.SetDefaultMusicVolume();
				LoadoutAPI.EquipItemInSlot( 'noteam', id, 'musickit' );
			},
			$.Localize( '#UI_Cancel' ),
			function() { }
		);
	};

	                                                                                                    
	                                           
	                                                                                                    
	var _LoadEquipNotification = function()
	{
		var elParent = $.GetContextPanel().FindChildInLayoutFile( 'InventoryMainContainer' );
		
		var elNotification = $.CreatePanel( 'Panel', elParent, 'InvNotificationEquip' );
		elNotification.BLoadLayout( 'file://{resources}/layout/notification/notification_equip.xml', false, false );
	};

	var _ShowNotification = function( slotInt, slotString, prevEquippedItemId, newEquippedItemId )
	{
		                                                                                                                                                             
		
		if ( _m_isCapabliltyPopupOpen )
		{
			return;
		}	
		
		var elNotification = $.GetContextPanel().FindChildInLayoutFile( 'InvNotificationEquip' );
		EquipNotification.ShowEquipNotification( elNotification, slotString, newEquippedItemId );
	};

	var _UpdateCraftingPanelVisibility = function( bShow, bPreserveIngredients )
	{
		var elCrafting = $( '#InvCraftingPanel' );
		if ( !elCrafting )
			return false;

		if ( bShow )
		{
			if ( elCrafting.BHasClass( _m_HiddenContentClassname ) )
			{
				if ( !elCrafting.FindChildTraverse( 'Crafting-Items' ) )
				{
					try { elCrafting.BLoadLayout( 'file://{resources}/layout/crafting.xml', false, false ); }
					catch ( e ) {}
				}
				elCrafting.RemoveClass( _m_HiddenContentClassname );
				elCrafting.SetFocus();

				_HideInventoryMainListers();
				_CloseSelectItemForCapabilityPopup();

				var elItems = $.GetContextPanel().FindChildTraverse( 'Crafting-Items' );
				var elIng = $.GetContextPanel().FindChildTraverse( 'Crafting-Ingredients' );
				if ( elItems && elItems.SetReadyForDisplay ) elItems.SetReadyForDisplay( true );
				if ( elIng && elIng.SetReadyForDisplay ) elIng.SetReadyForDisplay( true );

				try
				{
					var RecipeId = InventoryAPI.GetTradeUpContractItemID();
					var strCraftingFilter = InventoryAPI.GetItemAttributeValue( RecipeId, "recipe filter" );
					// Opening via "add ingredient" must keep the item just added.
					if ( !bPreserveIngredients )
						InventoryAPI.ClearCraftIngredients();
					InventoryAPI.SetCraftTarget( strCraftingFilter );
					$.DispatchEvent( 'UpdateTradeUpPanel' );
				}
				catch ( e2 ) {}
			}
		}
		else
		{
			elCrafting.AddClass( _m_HiddenContentClassname );

			_m_elInventoryMain.SetFocus();

			_ShowInventoryMainListers();

			var elItems2 = $.GetContextPanel().FindChildTraverse( 'Crafting-Items' );
			var elIng2 = $.GetContextPanel().FindChildTraverse( 'Crafting-Ingredients' );
			if ( elItems2 && elItems2.SetReadyForDisplay ) elItems2.SetReadyForDisplay( false );
			if ( elIng2 && elIng2.SetReadyForDisplay ) elIng2.SetReadyForDisplay( false );

			try { InventoryAPI.ClearCraftIngredients(); } catch ( e3 ) {}

			return true;
		}
	}

	var _UpdateSearchPanelVisibility = function( bShow )
	{
		var elSearch = $( '#InvSearchPanel' );
		if ( !elSearch )
			return false;

		if ( bShow )
		{
			if ( elSearch.BHasClass( _m_HiddenContentClassname ) )
			{
				if ( !elSearch.FindChildInLayoutFile( 'InvSearchPanel-List' ) )
				{
					try { elSearch.BLoadLayout( 'file://{resources}/layout/mainmenu_inv_search.xml', false, false ); }
					catch ( e ) {}
				}
				elSearch.RemoveClass( _m_HiddenContentClassname );
				elSearch.SetFocus();
				_CloseSelectItemForCapabilityPopup();
			}
		}
		else
		{
			elSearch.AddClass( _m_HiddenContentClassname );
			_m_elInventoryMain.SetFocus();
			return true;
		}
	};

	var _CloseSearchPanel = function( bShow )
	{
		_UpdateSearchPanelVisibility( false );
		_ShowInventoryMainListers();	
	};
	
	var _ClosePopups = function ()
	{
		if ( !$('#InvLoadoutPanel').BHasClass( _m_HiddenContentClassname ) )
		{
			_CloseLoadout();
			return true;
		}

		if ( !$( '#InvCraftingPanel' ).BHasClass( _m_HiddenContentClassname ) )
		{
			_UpdateCraftingPanelVisibility( false );
			return true;
		}

		if ( !$( '#InvSearchPanel' ).BHasClass( _m_HiddenContentClassname ) )
		{
			_CloseSearchPanel();
			return true;
		}

		if ( !_m_elSelectItemForCapabilityPopup.BHasClass( _m_HiddenContentClassname ) )
		{
			_CloseSelectItemForCapabilityPopup();
			return true;
		}
		return false;
	}

	return {
		Init: _Init,
		NavigateToTab: _NavigateToTab,
		UpdateActiveItemList: _UpdateActiveItemList,
		OnReadyForDisplay: _OnReadyForDisplay,
		ShowSelectItemForCapabilityPopup: _ShowSelectItemForCapabilityPopup,
		CloseSelectItemForCapabilityPopup: _CloseSelectItemForCapabilityPopup,
		CloseLoadout: _CloseLoadout,
		GetCapabilityInfo: _GetCapabilityInfo,
		InventoryUpdated: _InventoryUpdated,
		SetIsCapabilityPopUpOpen: _SetIsCapabilityPopUpOpen,
		ShowDeleteItemConfirmation: _ShowDeleteItemConfirmation,
		ShowUseItemOnceConfirmation : _ShowUseItemOnceConfirmationPopup,
		ShowResetMusicConfirmation: _ShowResetMusicConfirmation,
		ShowNotification: _ShowNotification,
		ShowLoadoutForItem: _ShowLoadoutForItem,
		UpdateCraftingPanelVisibility: _UpdateCraftingPanelVisibility,
		UpdateSearchPanelVisibility: _UpdateSearchPanelVisibility,
		CloseSearchPanel: _CloseSearchPanel,
		ClosePopups : _ClosePopups,
	};
})();

              
(function ()
{
	InventoryPanel.Init();

	var elJsInventory = $( '#JsInventory' );

	$.RegisterEventHandler( 'ReadyForDisplay', elJsInventory, InventoryPanel.OnReadyForDisplay );
	$.RegisterEventHandler( 'UnreadyForDisplay', elJsInventory, InventoryPanel.ClosePopups );
	$.RegisterEventHandler( 'Cancelled', elJsInventory, InventoryPanel.ClosePopups );

	$.RegisterForUnhandledEvent('ShowSelectItemForCapabilityPopup', InventoryPanel.ShowSelectItemForCapabilityPopup );
	$.RegisterForUnhandledEvent( 'HideSelectItemForCapabilityPopup', InventoryPanel.CloseSelectItemForCapabilityPopup );
	$.RegisterForUnhandledEvent( 'PanoramaComponent_MyPersona_InventoryUpdated', InventoryPanel.InventoryUpdated );
	$.RegisterForUnhandledEvent( 'CapabilityPopupIsOpen', InventoryPanel.SetIsCapabilityPopUpOpen );
	$.RegisterForUnhandledEvent( 'RefreshActiveInventoryList', InventoryPanel.InventoryUpdated );
	$.RegisterForUnhandledEvent( 'ShowDeleteItemConfirmationPopup', InventoryPanel.ShowDeleteItemConfirmation );
	$.RegisterForUnhandledEvent( 'ShowUseItemOnceConfirmationPopup', InventoryPanel.ShowUseItemOnceConfirmation );
	$.RegisterForUnhandledEvent( 'ShowResetMusicVolumePopup', InventoryPanel.ShowResetMusicConfirmation );
	$.RegisterForUnhandledEvent( 'PanoramaComponent_Inventory_PlayerEquipSlotChanged', InventoryPanel.ShowNotification );
	$.RegisterForUnhandledEvent( 'ShowLoadoutForItem', InventoryPanel.ShowLoadoutForItem );
	$.RegisterForUnhandledEvent( 'PanoramaComponent_Inventory_CraftIngredientAdded', function ()
	{
		// Panel already open: Crafting.js refreshes lists. Do NOT re-open (that used to ClearCraftIngredients).
		var elCrafting = $( '#InvCraftingPanel' );
		if ( !elCrafting || !elCrafting.BHasClass( 'mainmenu-content--hidden' ) )
			return;
		InventoryPanel.UpdateCraftingPanelVisibility( true, true );
	} );
	$.RegisterForUnhandledEvent( 'ShowTradeUpPanel', function () { InventoryPanel.UpdateCraftingPanelVisibility( true ); } );
})();
