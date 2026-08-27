'use strict';

var StubGrant = ( function()
{
	var _selectedFauxId = '';
	var _source = 'src_weapon';
	var _caseDef = 0;
	var _knifeDef = 0;
	var _weaponDef = 0;
	var _gloveDef = 0;
	var _wear = 0.01;
	var _statTrak = false;
	var _statusTimer = null;
	var _dragGhost = null;
	var _dragSched = null;

	var _Init = function()
	{
		_SetupDrag();
		_PopulateWearDropdown();
		_SetSource( 'src_weapon' );
	};

	var _PopulateWearDropdown = function()
	{
		var dd = $( '#StubGrantWear' );
		if ( !dd )
			return;
		dd.RemoveAllOptions();
		var presets = ( StubGrantData && StubGrantData.wearPresets ) || [
			{ id: 'fn', label: 'Factory New', wear: 0.01 }
		];
		for ( var i = 0; i < presets.length; i++ )
		{
			var p = presets[ i ];
			var entry = $.CreatePanel( 'Label', dd, 'wear_' + p.id, { class: 'DropDownMenu' } );
			entry.text = p.label;
			entry.SetAttributeString( 'wear-id', p.id );
			entry.SetAttributeString( 'wear-val', String( p.wear ) );
			dd.AddOption( entry );
		}
		if ( presets.length )
		{
			dd.SetSelected( 'wear_' + presets[ 0 ].id );
			_wear = presets[ 0 ].wear;
		}
	};

	var _OnWearChanged = function()
	{
		var dd = $( '#StubGrantWear' );
		if ( !dd )
			return;
		var sel = dd.GetSelected();
		if ( !sel )
			return;
		var w = parseFloat( sel.GetAttributeString( 'wear-val', '0.01' ) );
		if ( !isNaN( w ) )
			_wear = w;
	};

	var _ReadStatTrakChecked = function()
	{
		var btn = $( '#StubGrantStatTrak' );
		if ( !btn )
			return false;
		if ( btn.checked )
			return true;
		try
		{
			if ( typeof btn.IsSelected === 'function' && btn.IsSelected() )
				return true;
		}
		catch ( e ) {}
		return !!( btn.BHasClass && btn.BHasClass( 'selected' ) );
	};

	var _OnStatTrakToggle = function()
	{
		_statTrak = _ReadStatTrakChecked();
	};

	var _ReadPos = function( panel )
	{
		if ( !panel || !panel.IsValid() )
			return null;
		var pos = panel.GetPositionWithinWindow();
		if ( !pos )
			return null;
		if ( pos.x !== undefined )
			return { x: pos.x, y: pos.y };
		if ( pos[ 0 ] !== undefined )
			return { x: pos[ 0 ], y: pos[ 1 ] };
		return null;
	};

	var _ApplyPos = function( win, x, y )
	{
		win.AddClass( 'stub-grant-moved' );
		win.style.position = Math.floor( x ) + 'px ' + Math.floor( y ) + 'px 0px';
	};

	var _StopDragTick = function()
	{
		if ( _dragSched )
		{
			$.CancelScheduled( _dragSched );
			_dragSched = null;
		}
	};

	var _DragTick = function()
	{
		_dragSched = null;
		var win = $.GetContextPanel();
		if ( !win || !win.IsValid() || !_dragGhost || !_dragGhost.IsValid() )
			return;

		var pos = _ReadPos( _dragGhost );
		if ( pos )
			_ApplyPos( win, pos.x, pos.y );

		_dragSched = $.Schedule( 0.0, _DragTick );
	};

	var _SetupDrag = function()
	{
		var title = $( '#StubGrantTitleBar' );
		var win = $.GetContextPanel();
		if ( !title || !win )
			return;

		title.SetDraggable( true );
		title.IsDraggable = true;

		$.RegisterEventHandler( 'DragStart', title, function( _id, obj )
		{
			_StopDragTick();
			var ghost = $.CreatePanel( 'Panel', win.GetParent(), 'stub-grant-ghost' );
			ghost.AddClass( 'stub-grant-ghost' );
			ghost.style.width = Math.floor( win.actuallayoutwidth ) + 'px';
			ghost.style.height = Math.floor( win.actuallayoutheight ) + 'px';
			obj.displayPanel = ghost;
			obj.removePositionBeforeDrop = false;
			_dragGhost = ghost;
			win.AddClass( 'stub-grant-dragging' );
			var cur = _ReadPos( win );
			if ( cur )
				_ApplyPos( win, cur.x, cur.y );
			_dragSched = $.Schedule( 0.0, _DragTick );
			return true;
		} );

		$.RegisterEventHandler( 'DragEnd', title, function( _id, ghost )
		{
			_StopDragTick();
			win.RemoveClass( 'stub-grant-dragging' );
			var panel = ghost;
			if ( ( !panel || !panel.IsValid() ) && _dragGhost && _dragGhost.IsValid() )
				panel = _dragGhost;
			if ( panel && panel.IsValid() )
			{
				var pos = _ReadPos( panel );
				if ( pos )
					_ApplyPos( win, pos.x, pos.y );
				panel.DeleteAsync( 0.0 );
			}
			_dragGhost = null;
		} );
	};

	var _SortByName = function( rows )
	{
		rows.sort( function( a, b )
		{
			var an = ( a.name || '' ).toLowerCase();
			var bn = ( b.name || '' ).toLowerCase();
			if ( an < bn ) return -1;
			if ( an > bn ) return 1;
			return 0;
		} );
		return rows;
	};

	var _NameForDef = function( def, fallback )
	{
		var faux = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( def, 0 );
		return InventoryAPI.GetItemName( faux ) || fallback || ( 'def ' + def );
	};

	var _GetSideDef = function()
	{
		if ( _source === 'src_weapon' )
			return _weaponDef;
		if ( _source === 'src_knife' )
			return _knifeDef;
		if ( _source === 'src_glove' )
			return _gloveDef;
		if ( _source === 'src_case' )
			return _caseDef;
		return 0;
	};

	var _SetSideDef = function( def )
	{
		if ( _source === 'src_weapon' )
			_weaponDef = def;
		else if ( _source === 'src_knife' )
			_knifeDef = def;
		else if ( _source === 'src_glove' )
			_gloveDef = def;
		else
			_caseDef = def;
	};

	var _PopulateSideFromDefs = function( defs, idPrefix )
	{
		var list = $( '#StubGrantCaseList' );
		list.RemoveAndDeleteChildren();
		var rows = [];
		for ( var i = 0; i < defs.length; i++ )
			rows.push( { def: defs[ i ], name: _NameForDef( defs[ i ], idPrefix + ' ' + defs[ i ] ) } );
		_SortByName( rows );

		var selected = _GetSideDef();
		var picked = false;
		for ( var r = 0; r < rows.length; r++ )
		{
			var def = rows[ r ].def;
			var row = $.CreatePanel( 'Button', list, idPrefix + '_' + def );
			row.AddClass( 'stub-grant-item' );
			$.CreatePanel( 'Label', row, '', { text: rows[ r ].name } );
			row.SetPanelEvent( 'onactivate', function( sideDef, panel )
			{
				_SetSideDef( sideDef );
				_MarkSelected( $( '#StubGrantCaseList' ), panel );
				_RefreshList();
			}.bind( undefined, def, row ) );
			if ( def === selected )
			{
				row.AddClass( 'selected' );
				picked = true;
			}
		}
		if ( !picked && rows.length )
		{
			_SetSideDef( rows[ 0 ].def );
			if ( list.GetChild( 0 ) )
				list.GetChild( 0 ).AddClass( 'selected' );
		}
	};

	var _PopulateCases = function()
	{
		var defs = [];
		var cases = StubGrantData.cases;
		for ( var i = 0; i < cases.length; i++ )
			defs.push( cases[ i ].def );
		_PopulateSideFromDefs( defs, 'case' );
	};

	var _PopulateSide = function()
	{
		if ( _source === 'src_weapon' )
			_PopulateSideFromDefs( StubGrantData.weapons || [], 'wep' );
		else if ( _source === 'src_knife' )
			_PopulateSideFromDefs( StubGrantData.knives || [], 'knife' );
		else if ( _source === 'src_glove' )
			_PopulateSideFromDefs( StubGrantData.gloves || [], 'glove' );
		else
			_PopulateCases();
	};

	var _MarkSelected = function( list, panel )
	{
		var kids = list.Children();
		for ( var i = 0; i < kids.length; i++ )
			kids[ i ].SetHasClass( 'selected', kids[ i ] === panel );
	};

	var _WearOptsVisible = function()
	{
		return _source === 'src_weapon' || _source === 'src_knife' || _source === 'src_glove';
	};

	var _OptsRowVisible = function()
	{
		return _WearOptsVisible() || _source === 'src_music';
	};

	var _UpdateOptsVisibility = function()
	{
		var opts = $( '#StubGrantOpts' );
		if ( !opts )
			return;
		opts.SetHasClass( 'hidden', !_OptsRowVisible() );
		var wearLabel = opts.FindChildTraverse ? null : null;
		var dd = $( '#StubGrantWear' );
		var showWear = _WearOptsVisible();
		if ( dd )
			dd.SetHasClass( 'hidden', !showWear );
		var kids = opts.Children();
		for ( var i = 0; i < kids.length; i++ )
		{
			if ( kids[ i ].BHasClass && kids[ i ].BHasClass( 'stub-grant-opts-label' ) )
				kids[ i ].SetHasClass( 'hidden', !showWear );
		}
		var st = $( '#StubGrantStatTrak' );
		if ( st )
		{
			var allowSt = ( _source === 'src_weapon' || _source === 'src_knife' || _source === 'src_music' );
			st.enabled = allowSt;
			st.SetHasClass( 'hidden', !allowSt );
			if ( !allowSt )
			{
				st.checked = false;
				_statTrak = false;
			}
		}
	};

	var _SetSource = function( src )
	{
		_source = src;
		var showSide = ( src === 'src_case' || src === 'src_knife' || src === 'src_weapon' || src === 'src_glove' );
		$( '#StubGrantCaseCol' ).SetHasClass( 'hidden', !showSide );
		var head = 'Case';
		var itemsHead = 'Items';
		if ( src === 'src_knife' )
		{
			head = 'Knife';
			itemsHead = 'Skins';
		}
		else if ( src === 'src_weapon' )
		{
			head = 'Weapon';
			itemsHead = 'Skins';
		}
		else if ( src === 'src_glove' )
		{
			head = 'Gloves';
			itemsHead = 'Skins';
		}
		else if ( src === 'src_sticker' )
			itemsHead = 'Stickers';
		else if ( src === 'src_tool' )
			itemsHead = 'Tools';
		else if ( src === 'src_spray' )
			itemsHead = 'Sprays';
		else if ( src === 'src_music' )
			itemsHead = 'Music Kits';
		else if ( src === 'src_medal' )
			itemsHead = 'Medals';
		if ( $( '#StubGrantSideHead' ) )
			$( '#StubGrantSideHead' ).text = head;
		if ( $( '#StubGrantItemHead' ) )
			$( '#StubGrantItemHead' ).text = itemsHead;
		if ( showSide )
			_PopulateSide();
		_UpdateOptsVisibility();
		_RefreshList();
	};

	var _ClearList = function()
	{
		var list = $( '#StubGrantList' );
		list.RemoveAndDeleteChildren();
		_selectedFauxId = '';
	};

	var _AddRow = function( fauxId, text )
	{
		var list = $( '#StubGrantList' );
		var row = $.CreatePanel( 'Button', list, 'row_' + fauxId );
		row.AddClass( 'stub-grant-item' );
		$.CreatePanel( 'Label', row, '', { text: text } );
		row.SetPanelEvent( 'onactivate', function( id, panel )
		{
			_selectedFauxId = id;
			_MarkSelected( $( '#StubGrantList' ), panel );
		}.bind( undefined, fauxId, row ) );
	};

	var _AddKitRows = function( shellDef, kitIds )
	{
		var named = [];
		for ( var i = 0; i < kitIds.length; i++ )
		{
			var mid = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( shellDef, kitIds[ i ] );
			named.push( { id: String( mid ), name: InventoryAPI.GetItemName( mid ) || ( 'kit ' + kitIds[ i ] ) } );
		}
		_SortByName( named );
		for ( var n = 0; n < named.length; n++ )
			_AddRow( named[ n ].id, named[ n ].name );
	};

	var _RefreshList = function()
	{
		_ClearList();

		if ( _source === 'src_case' )
		{
			if ( !_caseDef )
				return;
			var caseFaux = String( InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( _caseDef, 0 ) );
			// Case itself is the grant target (left column pick). Loot rows below are optional skins.
			_AddRow( caseFaux, InventoryAPI.GetItemName( caseFaux ) || ( 'case ' + _caseDef ) );
			_selectedFauxId = caseFaux;
			var caseList = $( '#StubGrantList' );
			if ( caseList && caseList.GetChild( 0 ) )
				caseList.GetChild( 0 ).AddClass( 'selected' );

			var count = InventoryAPI.GetLootListItemsCount( caseFaux );
			for ( var i = 0; i < count; i++ )
			{
				var id = InventoryAPI.GetLootListItemIdByIndex( caseFaux, i );
				if ( !id || id === '0' || id === 0 )
					continue;
				id = String( id );
				if ( id === caseFaux )
					continue;
				_AddRow( id, InventoryAPI.GetItemName( id ) || id );
			}
			return;
		}

		if ( _source === 'src_weapon' || _source === 'src_knife' || _source === 'src_glove' )
		{
			var def = _GetSideDef();
			if ( !def )
				return;
			var map = StubGrantData.weaponSkins;
			if ( _source === 'src_knife' )
				map = StubGrantData.knifeSkins;
			else if ( _source === 'src_glove' )
				map = StubGrantData.gloveSkins;
			var paints = ( map && ( map[ String( def ) ] || map[ def ] ) ) || [];
			if ( _source === 'src_knife' )
			{
				var vanilla = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( def, 0 );
				_AddRow( String( vanilla ), InventoryAPI.GetItemName( vanilla ) );
			}
			var named = [];
			for ( var p = 0; p < paints.length; p++ )
			{
				var sid = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( def, paints[ p ] );
				named.push( { id: String( sid ), name: InventoryAPI.GetItemName( sid ) || ( 'paint ' + paints[ p ] ) } );
			}
			_SortByName( named );
			for ( var n = 0; n < named.length; n++ )
				_AddRow( named[ n ].id, named[ n ].name );
			return;
		}

		if ( _source === 'src_music' )
		{
			var mk = StubGrantData.musickitDef;
			var ids = StubGrantData.musicIds || [];
			_AddKitRows( mk, ids );
			return;
		}

		if ( _source === 'src_sticker' )
		{
			_AddKitRows( StubGrantData.stickerDef || 1209, StubGrantData.stickerIds || [] );
			return;
		}

		if ( _source === 'src_spray' )
		{
			_AddKitRows( StubGrantData.sprayDef || 1348, StubGrantData.sprayIds || [] );
			return;
		}

		if ( _source === 'src_tool' )
		{
			var tools = StubGrantData.tools || [];
			var trows = [];
			for ( var t = 0; t < tools.length; t++ )
				trows.push( { def: tools[ t ], name: _NameForDef( tools[ t ], 'tool ' + tools[ t ] ) } );
			_SortByName( trows );
			for ( var tr = 0; tr < trows.length; tr++ )
			{
				var tid = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( trows[ tr ].def, 0 );
				_AddRow( String( tid ), trows[ tr ].name );
			}
			return;
		}

		if ( _source === 'src_medal' )
		{
			var medals = StubGrantData.medals || [];
			var mrows = [];
			for ( var m = 0; m < medals.length; m++ )
				mrows.push( { def: medals[ m ], name: _NameForDef( medals[ m ], 'medal ' + medals[ m ] ) } );
			_SortByName( mrows );
			for ( var mr = 0; mr < mrows.length; mr++ )
			{
				var nid = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( mrows[ mr ].def, 0 );
				_AddRow( String( nid ), mrows[ mr ].name );
			}
		}
	};

	var _SetStatus = function( text )
	{
		$( '#StubGrantStatus' ).text = text;
		if ( _statusTimer )
			$.CancelScheduled( _statusTimer );
		_statusTimer = $.Schedule( 4.0, function()
		{
			$( '#StubGrantStatus' ).text = '';
			_statusTimer = null;
		} );
	};

	var _OnGrant = function()
	{
		if ( !_selectedFauxId )
		{
			_SetStatus( 'Select an item first.' );
			return;
		}

		_OnWearChanged();
		_statTrak = _ReadStatTrakChecked();

		var wear = 0;
		var st = 0;
		if ( _WearOptsVisible() )
		{
			wear = _wear;
			if ( _statTrak && _source !== 'src_glove' )
				st = 1;
		}
		else if ( _source === 'src_music' && _statTrak )
		{
			st = 1;
		}

		if ( typeof GameInterfaceAPI.OfflineBridgeGrantFaux === 'function' )
			GameInterfaceAPI.OfflineBridgeGrantFaux( '' + _selectedFauxId, '' + wear, '' + st );
		else
		{
			GameInterfaceAPI.SetSettingString( 'password', '' );
			GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
		}
		_SetStatus( 'Grant queued: ' + InventoryAPI.GetItemName( _selectedFauxId ) );

		$.Schedule( 1.0, function()
		{
			GameInterfaceAPI.SetSettingString( 'password', '' );
			GameInterfaceAPI.ConsoleCommand( 'host_writeconfig' );
		} );
		// Do not force ShowAcknowledgePopup here — unack badge is enough;
		// popup opens when entering Inventory (mainmenu_inventory.js).
	};

	return {
		Init: _Init,
		SetSource: _SetSource,
		OnGrant: _OnGrant,
		OnWearChanged: _OnWearChanged,
		OnStatTrakToggle: _OnStatTrakToggle
	};
} )();
