'use strict';

var Avatar = ( function()
{
	
	var _avLogLeft = 8;

	var _Init = function( elAvatar, xuid, type )
	{
	  	                                      

		switch ( type )
		{
			case 'playercard':
				_SetImage( elAvatar, xuid );
				_SetFlair( elAvatar, xuid );
				_SetTeamColor( elAvatar, xuid );
				_SetLobbyLeader( elAvatar );
				break;
			default:
				_SetImage( elAvatar, xuid );
				_SetTeamColor( elAvatar, xuid );
		}
	};

	var _SetImage = function( elAvatar, xuid )
	{
		var elImage = elAvatar.FindChildTraverse( 'JsAvatarImage' );
		var elCustom = elAvatar.FindChildTraverse( 'JsAvatarCustom' );
		
		if ( xuid === '' || xuid === '0' || xuid === 0 )
		{
			elImage.AddClass( 'hidden' );
			if ( elCustom )
				elCustom.AddClass( 'hidden' );
			return;
		}

		// Local: keep CSGOAvatarImage.steamid (stub loads avatars/<xuid>.png into Steam RGBA).
		// Also paint JsAvatarCustom from disk — covers cases where CSGOAvatarImage stays blue.
		var sx = '' + xuid;
		var myXuid = '';
		var isLocal = false;
		try { myXuid = '' + MyPersonaAPI.GetXuid(); isLocal = ( sx === myXuid ); }
		catch ( eLoc ) {}

		if ( _avLogLeft > 0 )
		{
			_avLogLeft--;
			$.Msg( '[PartyAvatar] xuid=' + sx + ' my=' + myXuid + ' local=' + ( isLocal ? 1 : 0 )
				+ ' hasImg=' + ( elImage ? 1 : 0 ) + ' hasCustom=' + ( elCustom ? 1 : 0 ) );
		}

		if ( elCustom )
		{
			if ( isLocal )
			{
				elCustom.SetImage( 'file://{images}/stub_avatar.png' );
				elCustom.RemoveClass( 'hidden' );
			}
			else
				elCustom.AddClass( 'hidden' );
		}

		if ( elImage )
		{
			elImage.steamid = sx;
			elImage.RemoveClass( 'hidden' );
		}
	};

	var _SetFlair = function( elAvatar, xuid )
	{
		var elFlair = elAvatar.FindChildTraverse( 'JsAvatarFlair' );
	
		if ( xuid === '' || xuid === '0' || xuid === 0 )
		{
			elFlair.AddClass( 'hidden' );
			return;
		}

		// Bots must not inherit local flair (GetFlairItemId is local-only offline).
		try
		{
			if ( typeof GameStateAPI !== 'undefined' && GameStateAPI.IsFakePlayer && GameStateAPI.IsFakePlayer( xuid ) )
			{
				elFlair.AddClass( 'hidden' );
				return;
			}
			if ( typeof MockAdapter !== 'undefined' && MockAdapter.IsFakePlayer && MockAdapter.IsFakePlayer( xuid ) )
			{
				elFlair.AddClass( 'hidden' );
				return;
			}
		}
		catch ( e ) {}

		elFlair.RemoveClass( 'hidden' );

		var flairId = InventoryAPI.GetFlairItemId( xuid );

		var isIdFromInventory = true;

		                                                                                   
		if ( flairId === "0" || !flairId )
		{
			isIdFromInventory = false;
			var flairDefIdx = Number( FriendsListAPI.GetFriendDisplayItemDefFeatured( xuid ) );
			flairId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( flairDefIdx, 0 );
		}
		
		if ( flairId === "0" || !flairId )
			return;

		var imagePath = InventoryAPI.GetItemInventoryImage( flairId );
		if ( !imagePath && !isIdFromInventory )
			imagePath = ItemDataAPI.GetItemInventoryImage( flairId );

		
		elFlair.SetImage( 'file://{images_econ}' + imagePath + '_small.png' );
	};

	var _SetTeamColor = function( elAvatar, xuid )
	{
		var elTeamColor = elAvatar.FindChildTraverse( 'JsAvatarTeamColor' );
		if ( !elTeamColor )
			return;

		var teamColor = PartyListAPI.GetPartyMemberSetting( xuid, 'game/teamcolor' );
		// Missing / empty → no outline. "0" is valid yellow.
		if ( teamColor === '' || teamColor === null || teamColor === undefined )
		{
			elTeamColor.AddClass( 'hidden' );
			return;
		}

		var idx = Number( teamColor );
		if ( isNaN( idx ) )
		{
			elTeamColor.AddClass( 'hidden' );
			return;
		}

		var rgbColor = '248,246,45';
		if ( typeof TeamColor !== 'undefined' && TeamColor.GetTeamColor )
			rgbColor = TeamColor.GetTeamColor( idx );

		elTeamColor.RemoveClass( 'hidden' );
		elTeamColor.style.washColor = 'rgb(' + rgbColor + ')';
	};

	var _SetTeamLetter = function( elAvatar, xuid )
	{
		var teamColor = PartyListAPI.GetPartyMemberSetting( xuid, 'game/teamcolor' );
		var elTeamLetter = elAvatar.FindChildTraverse( 'JsAvatarTeamLetter' );
		var useLetters = false;

		if ( teamColor == '' && useLetters )
		{
			if ( elTeamLetter )
				elTeamLetter.AddClass( 'hidden' );

			return;
		}

		var teamLetter = elTeamLetter._GetTeamColorLetter( Number( teamColor ) );
		elTeamLetter.RemoveClass( 'hidden' );
		elTeamLetter.text = teamLetter;
	};

	var _SetLobbyLeader = function( elAvatar )
	{
		if ( !elAvatar.hasOwnProperty( "GetAttributeString" ) )
			return;
		
		var show = elAvatar.GetAttributeString( 'showleader', '' );
		var elLeader = elAvatar.FindChildTraverse( 'JsAvatarLeader' );
		
		if ( elLeader )
		{
			if ( show === 'show' )
				elLeader.RemoveClass( 'hidden' );
			else
				elLeader.AddClass( 'hidden' );
		}
	};

	var _UpdateTalkingState = function( elAvatar, xuid, bCalledFromScheduledFunction )
	{
		if ( !elAvatar || !elAvatar.IsValid() )
			return;

		var elSpeaking = elAvatar.FindChildTraverse( 'JsAvatarSpeaking' );
		if ( !elSpeaking )
			return;

		var bFriendIsTalking = PartyListAPI.GetFriendIsTalking( xuid );
		elSpeaking.SetHasClass( 'hidden', !bFriendIsTalking );

		if ( bFriendIsTalking && ( bCalledFromScheduledFunction || !elAvatar.GetAttributeString( 'updatetalkingstate', '' ) ) )
		{
			var schfn = $.Schedule( .1, _UpdateTalkingState.bind( this, elAvatar, xuid, true ) );
			elAvatar.SetAttributeString( 'updatetalkingstate', '' + schfn );
		}

		if ( !bFriendIsTalking )
		{
			elAvatar.SetAttributeString( 'updatetalkingstate', '' );
		}
	};

	return {
		Init: _Init,
		UpdateTalkingState : _UpdateTalkingState
	};
})();

(function()
{
	                                                                           
	                                                                                                          
})();