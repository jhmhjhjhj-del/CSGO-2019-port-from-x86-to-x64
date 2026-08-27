'use strict';


var EOM_Characters = ( function()
{
	var _m_cP = $.GetContextPanel();

	var _m_freeze_time = 7;

	var _m_arrAllPlayersMatchDataJSO = [];

	var _m_localPlayer;
	var _m_teamToShow;

	const ACCOLADE_START_TIME = 2.2;

	                                 
	const DELAY_PER_PLAYER = 1.0;
	const UNFREEZE_TIME = 1.6;

	var m_bNoGimmeAccolades = false;                                              

	                                                                                                      
	const CAMERA_POSITIONS =
		[
			10,
			11,
			12,
			13,
			14,
			15,
			22,
			23,
			24,
			25
		]

	function _GetSnippetForMode ( mode )
	{
		switch ( mode )
		{
			        
			case "scrimcomp2v2":
				return "snippet-eom-chars__layout--scrimcomp2v2";

			               
			case "competitive":
			case "gungametrbomb":
			case "cooperative":
			case "casual":
			case "teamdm":
				return "snippet-eom-chars__layout--classic";

			                    
			case "gungameprogressive":            
			case "training":
			case "deathmatch":
			case "ffadm":
				return "snippet-eom-chars__layout--ffa";

			default:
				return "snippet-eom-chars__layout--classic";
		}
	}

	function _SetMainTeamLogo ( teamName )
	{
		var elRoot = $( '#id-eom-characters-root' );

		var myTeamLogoPath = "file://{images}/icons/ui/" + ( teamName == "CT" ? "ct_logo_1c.svg" : "t_logo_1c.svg" );
		var elMyTeamLogo = elRoot.FindChildTraverse( "id-eom-chars__layout__logo--myteam" );

		if ( elMyTeamLogo )
		{
			elMyTeamLogo.SetImage( myTeamLogoPath );
		}
	}

	function _SetTeamLogo ( team )
	{
		var elRoot = $( '#id-eom-characters-root' );

		var teamLogoPath = "file://{images}/icons/ui/" + ( team == "ct" ? "ct_logo_1c.svg" : "t_logo_1c.svg" );
		var elTeamLogo = elRoot.FindChildTraverse( "id-eom-chars__layout__logo--" + team );

		if ( elTeamLogo )
		{
			elTeamLogo.SetImage( teamLogoPath );
		}
	}

	function _SetupPanel ( mode )
	{
		var elRoot = $( '#id-eom-characters-root' );

		var snippet = _GetSnippetForMode( mode );

		elRoot.BLoadLayoutSnippet( snippet );

		_SetMainTeamLogo( _m_teamToShow );

		_SetTeamLogo( 't' );
		_SetTeamLogo( 'ct' );

	}

	function _CollectPlayersForMode ( mode )
	{
		var arrPlayerList = [];

		switch ( mode )
		{
			case "casual":
			case "gungametrbomb":
			case "cooperative":
			case "teamdm":
			default:
				{
					arrPlayerList = _CollectPlayersOfTeam( _m_teamToShow );
					arrPlayerList = arrPlayerList.sort( _SortByScoreFn );
					m_bNoGimmeAccolades = false;
					break;
				}

				                                                    
			case "competitive":
				{
					arrPlayerList = _CollectPlayersOfTeam( _m_teamToShow );
					arrPlayerList = arrPlayerList.sort( _SortByScoreFn );

					                                                              
					if ( _m_localPlayer )
					{
						arrPlayerList = arrPlayerList.filter( player => player[ 'xuid' ] != _m_localPlayer[ 'xuid' ] );
						arrPlayerList.splice( 0, 0, _m_localPlayer );
					}

					m_bNoGimmeAccolades = false;
					break;
				}


			case "deathmatch":
			case "ffadm":
			case "gungameprogressive":            
				{
					var arrPlayerXuids = Scoreboard.GetFreeForAllTopThreePlayers();
					if ( MockAdapter.GetMockData() != undefined )
					{
						arrPlayerXuids = [ "1", "2", "3" ];
					}

					                                                                  
					arrPlayerList[ 0 ] = _m_arrAllPlayersMatchDataJSO.filter( o => o[ 'xuid' ] == arrPlayerXuids[ 0 ] )[ 0 ];
					arrPlayerList[ 1 ] = _m_arrAllPlayersMatchDataJSO.filter( o => o[ 'xuid' ] == arrPlayerXuids[ 1 ] )[ 0 ];
					arrPlayerList[ 2 ] = _m_arrAllPlayersMatchDataJSO.filter( o => o[ 'xuid' ] == arrPlayerXuids[ 2 ] )[ 0 ];
					
					m_bNoGimmeAccolades = true;

					break;
				}

			case "training":
			case "scrimcomp2v2":
				{
					var listCT = _CollectPlayersOfTeam( "CT" ).slice( 0, 2 );
					var listT = _CollectPlayersOfTeam( "TERRORIST" ).slice( 0, 2 );

					arrPlayerList = listCT.concat( listT );

					m_bNoGimmeAccolades = false;

					break;
				}
		}

		if ( arrPlayerList )
			arrPlayerList = arrPlayerList.slice( 0, _GetNumCharsToShowForMode( mode )  );

		return arrPlayerList;
	}

	function _CollectPlayersMatchingXuids ( arrXuids )
	{
		return _m_arrAllPlayersMatchDataJSO.filter( o => arrXuids.includes(  o[ 'xuid' ] ) );
	}

	function _CollectPlayersOfTeam ( teamName )
	{
		var teamNum = 0;
		switch ( teamName )
		{
			case "TERRORIST":
				teamNum = 2;
				break;

			case "CT":
				teamNum = 3;
				break;

		}

		return _m_arrAllPlayersMatchDataJSO.filter( o => o[ 'teamnumber' ] == teamNum );

	}


	function _GetNumCharsToShowForMode ( mode )
	{
		switch ( mode )
		{
			case "scrimcomp2v2":
				return 4;

			case "competitive":
				return 5;

			case "casual":
			case "gungametrbomb":
			case "teamdm":
				return 6;

			case "cooperative":
				return 2;

			case "gungameprogressive":            
			case "deathmatch":
			case "ffadm":
				return 3;

			case "training":
				return 1;

			default:
				return 6;

		}
	}

	function _ApplyFfaPlaceLabel ( elCharacter, index )
	{
		if ( !elCharacter || !elCharacter.IsValid() )
			return;

		var placeTokens = [ '#EOM_Position_2', '#EOM_Position_1', '#EOM_Position_3' ];
		var placeClasses = [ '2nd', '1st', '3rd' ];

		var elPos = elCharacter.FindChildTraverse( 'id-charlineup__player__position' );
		if ( !elPos )
			return;

		var placeClass = placeClasses[ index ] || '1st';

		elPos.RemoveClass( 'hidden' );
		elPos.text = $.Localize( placeTokens[ index ] || '#EOM_Position_1' );
		elPos.AddClass( 'charlineup__player__position--' + placeClass );
		elCharacter.AddClass( 'charlineup__player--place-' + placeClass );
	}

	function _IsFfaPodiumMode ( mode )
	{
		return ( mode === 'deathmatch' || mode === 'ffadm' || mode === 'gungameprogressive' );
	}

	function _ApplyWeaponAnimSettings ( settings, team, xuid, bRandomizeWeapon )
	{
		var itemId = 0;
		var loadoutSlot = '';
		var selectedWeapon = '';

		if ( bRandomizeWeapon && typeof LoadoutAPI !== 'undefined' && typeof ItemInfo !== 'undefined' )
		{
			var slots = [ 'melee', 'secondary0', 'secondary1', 'smg0', 'rifle0', 'rifle1', 'heavy0' ];

			for ( var attempt = 0; attempt < slots.length * 2; attempt++ )
			{
				var slotName = slots[ Math.floor( Math.random() * slots.length ) ];
				var candidateId = LoadoutAPI.GetItemID( team, slotName );

				if ( !candidateId || candidateId == 0 )
					continue;

				var candidateSlot = ItemInfo.GetSlotSubPosition( candidateId );
				if ( !candidateSlot || candidateSlot == 'c4' )
					continue;

				itemId = candidateId;
				loadoutSlot = candidateSlot;
				selectedWeapon = ItemInfo.GetItemDefinitionName( candidateId );
				break;
			}
		}

		if ( !itemId || itemId == 0 )
			itemId = GameStateAPI.GetPlayerActiveWeaponItemId( xuid ) || 0;

		if ( ( !itemId || itemId == 0 ) && typeof LoadoutAPI !== 'undefined' )
			itemId = LoadoutAPI.GetItemID( team, 'melee' );

		if ( typeof ItemInfo !== 'undefined' )
		{
			if ( ItemInfo.GetSlotSubPosition( itemId ) == 'c4' && typeof LoadoutAPI !== 'undefined' )
				itemId = LoadoutAPI.GetItemID( team, 'melee' );

			loadoutSlot = ItemInfo.GetSlotSubPosition( itemId );
			selectedWeapon = ItemInfo.GetItemDefinitionName( itemId );
		}

		settings.itemId = itemId;
		settings.loadoutSlot = loadoutSlot;
		settings.selectedWeapon = selectedWeapon;
	}

	function _AddModeSpecificSettings ( mode, settings, index, arrPlayerList )
	{
		var zDepth;

		settings.flashlightAmount = 1.5;

		switch ( mode )
		{
			                               
			case "scrimcomp2v2":
				zDepth = 1;
				break;

			              
			case "competitive":
			default:
				zDepth = Math.abs( Math.floor( arrPlayerList.length / 2 ) - index );
				break;
			
			                    
			case "casual":
			case "teamdm":
			case "gungametrbomb":
				                                              
				settings.flashlightAmount = 2 - index * ( 2 / arrPlayerList.length );;
				zDepth = index;
				break;

			                            
			case "cooperative":
				zDepth = 0;
				break;

			                                              
			case "gungameprogressive":            
			case "deathmatch":
			case "ffadm":
			case "training":
				var positions = [ 1, 0, 2 ];
				zDepth = positions[ index ];
				break;

		}

		                                                                                                     

		settings[ 'cameraPreset' ] = CAMERA_POSITIONS[ zDepth ];
		settings[ 'panelPosition' ] = -zDepth;

	}

	function _ShouldDisplayCommendsInMode ( mode )
	{
		if ( typeof MyPersonaAPI !== 'undefined' && typeof MyPersonaAPI.GetElevatedState === 'function' )
		{
			if ( MyPersonaAPI.GetElevatedState() !== "elevated" )
				return false;
		}
		
		switch ( mode )
		{
			case "scrimcomp2v2":
			case "competitive":
			case "casual":
			case "gungametrbomb":
			case "cooperative":
			case "teamdm":
				return true;

			case "gungameprogressive":            
			case "deathmatch":
			case "ffadm":
			case "training":
			default:
				return false;
		}
	}

	function _GetModeForEndOfMatchPurposes()
	{
		var mode = MockAdapter.GetGameModeInternalName( false );

		                                                                                                                       
		if ( mode == 'deathmatch' )
		{
			      
			if ( GameInterfaceAPI.GetSettingString( 'mp_teammates_are_enemies' ) !== '0' )
			{
				mode = 'ffadm';
			}
			else if ( GameInterfaceAPI.GetSettingString( 'mp_dm_teammode' ) !== '0' )
			{
				mode = 'teamdm';
			}
		}

		return mode;
	}

	function _ShowWinningTeam( mode )
	{
		var arrModesToForceLocalTeam =
			[
				"competitive",
				'gungametrbomb'
			];
		
		return ( !arrModesToForceLocalTeam.includes( mode ) )
	}

	var _DisplayMe = function()
	{
		var elRoot = $( "#id-eom-characters-root" );

		var data = MockAdapter.GetAllPlayersMatchDataJSO();

		if ( data && data.allplayerdata && data.allplayerdata.length > 0 )
		{
			_m_arrAllPlayersMatchDataJSO = data.allplayerdata;
		}
		else
		{
			EndOfMatch.ToggleBetweenScoreboardAndCharacters();                      
			return false;
		}

		EndOfMatch.EnableToggleBetweenScoreboardAndCharacters();

		var localPlayerSet = _m_arrAllPlayersMatchDataJSO.filter( oPlayer => oPlayer[ 'xuid' ] == MockAdapter.GetLocalPlayerXuid() );
		var localPlayer = ( localPlayerSet.length > 0 ) ? localPlayerSet[ 0 ] : undefined;

		var teamNumToShow = 3;

		var mode = _GetModeForEndOfMatchPurposes();
		if ( localPlayer && !_ShowWinningTeam( mode ) )
		{
			_m_localPlayer = localPlayer;
			teamNumToShow = _m_localPlayer[ 'teamnumber' ];
		}
		else
		{
			var oMatchEndData = MockAdapter.GetMatchEndWinDataJSO();
			if ( oMatchEndData )
				teamNumToShow = oMatchEndData[ "winning_team_number" ];
			
			                                                            
			if ( !teamNumToShow && localPlayer )
			{
				_m_localPlayer = localPlayer;
				teamNumToShow = _m_localPlayer[ 'teamnumber' ];
			}
		}

		if ( teamNumToShow == 2 )
		{
			_m_teamToShow = "TERRORIST";
		}
		else                                             
		{
			_m_teamToShow = "CT";
		}

		var mode = _GetModeForEndOfMatchPurposes();

		_SetupPanel( mode );

		var arrPlayerList = _CollectPlayersForMode( mode );
		arrPlayerList = _SortPlayers( mode, arrPlayerList );

		_m_freeze_time = arrPlayerList.length + 2;

		var elCLU = elRoot.FindChildTraverse( "id-eom-characters__player-container" );

		var oSettings =
		{
			'numCharacters': arrPlayerList.length,
			'characterShowDelay': DELAY_PER_PLAYER,
			'displayCommendButton': _ShouldDisplayCommendsInMode( mode ),
			'overrideCharacterSpacing': _IsFfaPodiumMode( mode ),
		}

		CharacterLineUp.Init( elCLU, oSettings );

		                        
		var mapCheers = {};                                          

		                                           
		if ( _m_localPlayer )
		{
			var arrLocalPlayer = ( _m_localPlayer.hasOwnProperty( 'items') && typeof ItemInfo !== 'undefined' && ItemInfo.IsCharacter ) ? _m_localPlayer.items.filter( oItem => ItemInfo.IsCharacter( oItem.itemid ) ) : [];
			var localPlayerModel = arrLocalPlayer.length > 0 ? arrLocalPlayer[0] : "";	
			var localPlayerCheer = localPlayerModel ? ItemInfo.GetDefaultCheer( localPlayerModel[ 'itemid' ] ) : "";
			mapCheers[ localPlayerCheer ] = 1;
		}

		arrPlayerList.forEach( function( oPlayer, index )
		{
			if ( oPlayer )
			{
				var settings =
				{
					display_immediately: false,                                                         
					cameraPreset: 10,
				}

				var cheer = "";
				var playerModelItem = '';
				
				if ( 'items' in oPlayer && typeof ItemInfo !== 'undefined' && ItemInfo.IsCharacter )
				{
					playerModelItem = oPlayer[ 'items' ].filter( oItem => ItemInfo.IsCharacter( oItem[ 'itemid' ] ) )[ 0 ];
				}

				cheer = playerModelItem ? ItemInfo.GetDefaultCheer( playerModelItem[ 'itemid' ] ) : "";

				if ( oPlayer != _m_localPlayer &&
					mapCheers[ cheer ] == 1 )                                         
				{
					cheer = "";
				}

				mapCheers[ cheer ] = 1;
				
				settings.arrModifiers = [ cheer ];
				settings.activity = cheer == "" ? 'ACT_CSGO_UIPLAYER_WALKUP' : 'ACT_CSGO_UIPLAYER_CELEBRATE';

				                                 
		  		                                                                                             

				_AddModeSpecificSettings( mode, settings, index, arrPlayerList );

				var xuid = oPlayer[ 'xuid' ];
				var teamNameStr = GameStateAPI.GetPlayerTeamName( xuid );
				settings.team = ( teamNameStr == "CT" ) ? 'ct' : 't';
				settings.model = 'models/' + GameStateAPI.GetPlayerModel( xuid );
				_ApplyWeaponAnimSettings( settings, settings.team, xuid, _IsFfaPodiumMode( mode ) );
				settings.playIntroAnim = false;
				settings.manifest = "resource/ui/econ/ItemModelPanelCharWeaponInspect.res";

				var label = oPlayer[ 'xuid' ];

				CharacterLineUp.AddPlayer( elCLU, label, oPlayer, settings );

				var elCharacter = CharacterLineUp.GetPlayerPanel( elCLU, label );
				elCharacter.AddClass( 'darkmodel' );

				if ( _IsFfaPodiumMode( mode ) )
					_ApplyFfaPlaceLabel( elCharacter, index );
			}

		} );

		CharacterLineUp.DisplayAll( elCLU );

		_CreatePlayerStatCards( elCLU, arrPlayerList, m_bNoGimmeAccolades );

		return true;
	}

	function _DisplayPlayerStatsCard ( elCardContainer, elCharacter, index )
	{
		if ( !elCharacter || !elCharacter.IsValid() )
			return;

		if ( elCardContainer && elCardContainer.IsValid() )
		{
			elCardContainer.AddClass( 'reveal' );
			var elCard = elCardContainer.FindChildTraverse( 'card' );
			$.Schedule( 0.3, function()
			{
				if ( typeof PlayerStatsCard !== 'undefined' && elCard && elCard.IsValid() )
					PlayerStatsCard.RevealStats( elCard );
			} );
		}

		var elEom = $( '#EndOfMatch' );
		if ( !elEom || !elEom.BHasClass( 'scoreboard-visible' ) )
		{
			$.DispatchEvent( 'PlaySoundEffect', 'UIPanorama.stats_reveal', 'MOUSE' );
		}

		elCharacter.AddClass( 'brightmodel' );

		$.Schedule( 0.1, function()
		{
			if ( elCharacter && elCharacter.IsValid() )
			{
				var elModel = elCharacter.FindChildTraverse( 'id-charlineup__model-preview-panel' );
				if ( elModel && elModel.IsValid() && typeof elModel.TriggerSlowmo === 'function' )
					elModel.TriggerSlowmo( _m_freeze_time - 1.5 * ( index * DELAY_PER_PLAYER ), UNFREEZE_TIME );
			}
		} );
	}

	function _GetPlayerCardStats ( xuid )
	{
		var o = { kills: 0, deaths: 0, assists: 0, adr: 0, hsp: 0, score: 0, mvps: 0 };
		try
		{
			var s = MockAdapter.GetPlayerStatsJSO( xuid );
			if ( typeof s === 'string' )
			{
				try { s = JSON.parse( s ); }
				catch ( e ) { s = {}; }
			}
			if ( s )
			{
				o.kills = Number( s.kills ) || 0;
				o.deaths = Number( s.deaths ) || 0;
				o.assists = Number( s.assists ) || 0;
				o.adr = Number( s.adr ) || 0;
				o.hsp = Number( s.hsp ) || 0;
			}
		}
		catch ( e ) {}

		try { o.score = Number( MockAdapter.GetPlayerScore( xuid ) ) || 0; } catch ( e ) {}
		try { o.kills = Math.max( o.kills, Number( MockAdapter.GetPlayerKills( xuid ) ) || 0 ); } catch ( e ) {}
		try { o.deaths = Math.max( o.deaths, Number( MockAdapter.GetPlayerDeaths( xuid ) ) || 0 ); } catch ( e ) {}
		try { o.assists = Math.max( o.assists, Number( MockAdapter.GetPlayerAssists( xuid ) ) || 0 ); } catch ( e ) {}
		try { o.mvps = Number( MockAdapter.GetPlayerMVPs( xuid ) ) || 0; } catch ( e ) {}
		return o;
	}

	function _PickBestStatPlayer ( arrPlayerList, taken, stat, minVal )
	{
		var best = null;
		var bestVal = minVal - 1;
		for ( var i = 0; i < arrPlayerList.length; i++ )
		{
			var p = arrPlayerList[ i ];
			if ( !p || taken[ p[ 'xuid' ] ] )
				continue;
			var v = Number( p._cardStats[ stat ] );
			if ( isNaN( v ) )
				continue;
			if ( v > bestVal )
			{
				bestVal = v;
				best = p;
			}
		}
		return best;
	}

	function _AssignFallbackAccolades ( arrPlayerList, mode )
	{
		var taken = {};
		var i;

		for ( i = 0; i < arrPlayerList.length; i++ )
		{
			var p = arrPlayerList[ i ];
			if ( !p )
				continue;
			p._cardStats = _GetPlayerCardStats( p[ 'xuid' ] );
			p._fallbackAccolade = null;

			var oTitle = p[ 'nomination' ];
			if ( oTitle != undefined && typeof GameStateAPI.GetAccoladeLocalizationString === 'function' )
			{
				var accoladeName = GameStateAPI.GetAccoladeLocalizationString( Number( oTitle[ 'eaccolade' ] ) );
				if ( accoladeName && !( m_bNoGimmeAccolades && accoladeName.indexOf( 'gimme_' ) !== -1 ) )
					taken[ p[ 'xuid' ] ] = true;
			}
		}

		var bFfa = _IsFfaPodiumMode( mode );

		var arrAwards = [
			{ stat: 'mvps', min: 1, title: '#eom_card_mvp', desc: '#eom_card_mvp_desc' },
			{ stat: 'kills', min: 1, title: '#eom_card_most_kills', desc: '#eom_card_most_kills_desc' },
			{ stat: 'hsp', min: 1, title: '#eom_card_headshots', desc: '#eom_card_headshots_desc' },
			{ stat: 'adr', min: 1, title: '#eom_card_adr', desc: '#eom_card_adr_desc' },
			{ stat: 'assists', min: 1, title: '#eom_card_playmaker', desc: '#eom_card_playmaker_desc' },
			{ stat: 'score', min: 1, title: '#eom_card_highscore', desc: '#eom_card_highscore_desc' }
		];

		for ( i = 0; i < arrAwards.length; i++ )
		{
			var award = arrAwards[ i ];
			var pick = _PickBestStatPlayer( arrPlayerList, taken, award.stat, award.min );
			if ( !pick )
				continue;
			pick._fallbackAccolade = { title: award.title, desc: award.desc };
			taken[ pick[ 'xuid' ] ] = true;
		}

		var ffaPlaceTokens = [ '#EOM_PositionPlace_2', '#EOM_PositionPlace_1', '#EOM_PositionPlace_3' ];
		for ( i = 0; i < arrPlayerList.length; i++ )
		{
			var leftover = arrPlayerList[ i ];
			if ( !leftover || taken[ leftover[ 'xuid' ] ] )
				continue;
			if ( bFfa )
				leftover._fallbackAccolade = { title: ffaPlaceTokens[ i ] || '#EOM_PositionPlace_1', desc: '#eom_card_highscore_desc' };
			else
				leftover._fallbackAccolade = { title: '#eom_card_highscore', desc: '#eom_card_highscore_desc' };
			taken[ leftover[ 'xuid' ] ] = true;
		}
	}

	function _ApplyCardAccolade ( elCard, oPlayer, bNoGimmes )
	{
		if ( !elCard || !oPlayer )
			return;

		var oTitle = oPlayer[ 'nomination' ];
		if ( oTitle != undefined && typeof GameStateAPI.GetAccoladeLocalizationString === 'function' )
		{
			var accoladeName = GameStateAPI.GetAccoladeLocalizationString( Number( oTitle[ 'eaccolade' ] ) );
			var showAccolade = !( bNoGimmes && accoladeName && accoladeName.indexOf( 'gimme_' ) !== -1 );
			if ( showAccolade && accoladeName )
			{
				PlayerStatsCard.SetAccolade(
					elCard,
					oTitle[ 'value' ].toString(),
					accoladeName,
					oTitle[ 'position' ].toString()
				);
				return;
			}
		}

		var fallback = oPlayer._fallbackAccolade;
		if ( !fallback )
			return;

		elCard.SetDialogVariableInt( 'eom-card-mvps', Number( oPlayer._cardStats && oPlayer._cardStats.mvps ) || 0 );
		PlayerStatsCard.SetAccoladeText(
			elCard,
			$.Localize( fallback.title, elCard ),
			$.Localize( fallback.desc, elCard )
		);
	}

	function _CreatePlayerStatCards ( elCLU, arrPlayerList, bNoGimmes )
	{
		if ( typeof PlayerStatsCard === 'undefined' )
			return;

		if ( !arrPlayerList || arrPlayerList.length == 0 )
			return;

		var mode = _GetModeForEndOfMatchPurposes();
		_AssignFallbackAccolades( arrPlayerList, mode );

		var arrBestStats = [
			{ stat: 'adr', value: null, elCard: null },
			{ stat: 'hsp', value: null, elCard: null },
			{ stat: 'enemiesflashed', value: null, elCard: null },
			{ stat: 'utilitydamage', value: null, elCard: null }
		];

		arrPlayerList.forEach( function( oPlayer, listIndex )
		{
			if ( !oPlayer )
				return;

			var xuid = oPlayer[ 'xuid' ];
			var elCharacter = CharacterLineUp.GetPlayerPanel( elCLU, xuid );
			if ( !elCharacter || !elCharacter.IsValid() )
				return;

			elCharacter.AddClass( 'has-stats-card' );

			var elCardContainer = $.CreatePanel( 'Panel', elCharacter, 'cardcontainer-' + xuid );
			elCardContainer.AddClass( 'player-stats-card-container' );

			var elCard = PlayerStatsCard.Init( elCardContainer, xuid, listIndex );

			PlayerStatsCard.SetStats( elCard, xuid, arrBestStats );
			_ApplyCardAccolade( elCard, oPlayer, bNoGimmes );
			PlayerStatsCard.SetFlair( elCard, xuid );
			PlayerStatsCard.SetSkillGroup( elCard, xuid );
			PlayerStatsCard.SetAvatar( elCard, xuid );
			PlayerStatsCard.SetTeammateColor( elCard, xuid );

			$.Schedule( ACCOLADE_START_TIME + ( listIndex * DELAY_PER_PLAYER ), _DisplayPlayerStatsCard.bind( undefined, elCardContainer, elCharacter, listIndex ) );
		} );

		for ( var i = 0; i < arrBestStats.length; i++ )
		{
			if ( arrBestStats[ i ].elCard )
				PlayerStatsCard.HighlightStat( arrBestStats[ i ].elCard, arrBestStats[ i ].stat );
		}
	}

	function _SortByTeamFn ( a, b )
	{
		var team_a = Number( a[ 'teamnumber' ] );
		var team_b = Number( b[ 'teamnumber' ] );

		var index_a = Number( a[ 'entindex' ] );
		var index_b = Number( b[ 'entindex' ] );

		if ( team_a != team_b )
		{
			return team_b - team_a;
		}
		else
		{
			return index_a - index_b;
		}
	}

	function _SortByScoreFn ( a, b )
	{
		var score_a = MockAdapter.GetPlayerScore( a[ 'xuid' ] );
		var score_b = MockAdapter.GetPlayerScore( b[ 'xuid' ] );

		var index_a = Number( a[ 'entindex' ] );
		var index_b = Number( b[ 'entindex' ] );

		if ( score_a != score_b )
		{
			return score_b - score_a;
		}
		else
		{
			return index_a - index_b;
		}
	}

	function _ReorderForPodium ( arrPlayerList )
	{
		var pos2 = arrPlayerList[ 1 ];
		arrPlayerList[ 1 ] = arrPlayerList[ 0 ];
		arrPlayerList[ 0 ] = pos2;
	}

	function _SortPlayers ( mode, arrPlayerList )
	{
		var midpoint;
		var localPlayerPosition;

		switch ( mode )
		{
			case "scrimcomp2v2":
				arrPlayerList.sort( _SortByTeamFn );
				break;

			                              
			case "competitive":
				if ( _m_localPlayer &&
					_m_localPlayer.hasOwnProperty( 'xuid' ) &&
					( arrPlayerList.filter( p => p.xuid == _m_localPlayer.xuid).length > 0 ) )
				{
					                                         
					midpoint = Math.floor( arrPlayerList.length / 2 );
					arrPlayerList = arrPlayerList.filter( player => player[ 'xuid' ] != _m_localPlayer[ 'xuid' ] );
					arrPlayerList.splice( midpoint, 0, _m_localPlayer );
				}
				break;
			
			case "no longer used but force player to have a spot":
				if ( _m_localPlayer && ( _m_localPlayer in arrPlayerList ) )
				{
					                                                 
					localPlayerPosition = Math.min( arrPlayerList.indexOf( _m_localPlayer ), 7 );
					arrPlayerList = arrPlayerList.filter( player => player[ 'xuid' ] != _m_localPlayer[ 'xuid' ] );
					arrPlayerList.splice( localPlayerPosition, 0, _m_localPlayer );
				}
				break;

			case "gungameprogressive":            
			case "deathmatch":
			case "ffadm":
				_ReorderForPodium( arrPlayerList );
				break;

			case "gungametrbomb":
			case "casual":
			case "teamdm":
			default:
				break;

		}

		return arrPlayerList;
	}

	function _Start () 
	{
		var elWinPlayers = $( '#EndOfMatch' ).FindChildTraverse( 'WinPlayers' );
		if ( elWinPlayers && elWinPlayers.IsValid() )
			elWinPlayers.AddClass( 'hidden' );

		_DisplayMe();
	}

	                      
	return {
		Start: _Start,

		GetModeForEndOfMatchPurposes: _GetModeForEndOfMatchPurposes,
		ShowWinningTeam				: _ShowWinningTeam
	};
} )();


                                                                                                    
                                           
                                                                                                    
( function()
{
} )();
