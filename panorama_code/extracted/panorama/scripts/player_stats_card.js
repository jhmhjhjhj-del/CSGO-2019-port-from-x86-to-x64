'use strict';

var PlayerStatsCard = ( function()
{
	var CARD_ID = 'card';

	function _ParseStats ( xuid )
	{
		var oStats = {};
		var raw = null;

		try
		{
			if ( typeof MockAdapter !== 'undefined' && typeof MockAdapter.GetPlayerStatsJSO === 'function' )
				raw = MockAdapter.GetPlayerStatsJSO( xuid );
			else if ( typeof MatchStatsAPI !== 'undefined' && typeof MatchStatsAPI.GetPlayerStatsJSO === 'function' )
				raw = MatchStatsAPI.GetPlayerStatsJSO( xuid );
		}
		catch ( e ) {}

		if ( typeof raw === 'string' && raw.length > 1 )
		{
			try { oStats = JSON.parse( raw ); }
			catch ( e ) { oStats = {}; }
		}
		else if ( raw && typeof raw === 'object' )
		{
			oStats = raw;
		}

		if ( !oStats ) oStats = {};

		var kills = Number( oStats.kills );
		var assists = Number( oStats.assists );
		var deaths = Number( oStats.deaths );
		if ( isNaN( kills ) ) kills = 0;
		if ( isNaN( assists ) ) assists = 0;
		if ( isNaN( deaths ) ) deaths = 0;

		try
		{
			var gk = MockAdapter.GetPlayerKills( xuid );
			var ga = MockAdapter.GetPlayerAssists( xuid );
			var gd = MockAdapter.GetPlayerDeaths( xuid );
			if ( gk > kills ) kills = gk;
			if ( ga > assists ) assists = ga;
			if ( gd > deaths ) deaths = gd;
		}
		catch ( e ) {}

		oStats.kills = kills;
		oStats.assists = assists;
		oStats.deaths = deaths;
		if ( oStats.adr === undefined || oStats.adr === null ) oStats.adr = 0;
		var hsk = Number( oStats.headshotkills );
		if ( isNaN( hsk ) ) hsk = 0;
		var hsp = Number( oStats.hsp );
		if ( isNaN( hsp ) ) hsp = 0;
		if ( hsp <= 0 && kills > 0 && hsk > 0 )
			hsp = Math.floor( hsk * 100 / kills );
		oStats.hsp = hsp;
		oStats.headshotkills = hsk;
		if ( oStats.enemiesflashed === undefined ) oStats.enemiesflashed = 0;
		if ( oStats.utilitydamage === undefined ) oStats.utilitydamage = 0;
		if ( oStats.knifekills === undefined ) oStats.knifekills = 0;
		return oStats;
	}

	function _ModeName ()
	{
		try
		{
			if ( typeof EOM_Characters !== 'undefined' && typeof EOM_Characters.GetModeForEndOfMatchPurposes === 'function' )
				return EOM_Characters.GetModeForEndOfMatchPurposes();
			return MockAdapter.GetGameModeInternalName( false );
		}
		catch ( e )
		{
			return '';
		}
	}

	function Init ( elParent, xuid, index )
	{
		var elCard = $.CreatePanel( 'Panel', elParent, CARD_ID );
		elCard.BLoadLayout( 'file://{resources}/layout/player_stats_card.xml', false, false );
		elCard.SetDialogVariable( 'player_name', MockAdapter.GetPlayerName( xuid ) );
		elCard.SetHasClass( 'localplayer', xuid === MockAdapter.GetLocalPlayerXuid() );

		var snippet = 'snippet-banner-classic';
		var mode = _ModeName();
		if ( mode === 'training' || mode === 'deathmatch' || mode === 'ffadm' )
			snippet = 'snippet-banner-dm';
		else if ( mode === 'gungameprogressive' )
			snippet = 'snippet-banner-ar';

		var elBanner = elCard.FindChildTraverse( 'JsBanner' );
		if ( elBanner )
			elBanner.BLoadLayoutSnippet( snippet );

		return elCard;
	}

	function GetCard ( elParent )
	{
		return elParent.FindChildTraverse( CARD_ID );
	}

	function SetAccolade ( elCard, accValue, accName, accPosition )
	{
		if ( !elCard || !accName )
			return;

		if ( !isNaN( Number( accValue ) ) )
			accValue = String( Math.floor( Number( accValue ) ) );

		elCard.SetDialogVariable( 'accolade-value-string', accValue );
		elCard.SetDialogVariableTime( 'accolade-value-time', Number( accValue ) );
		elCard.SetDialogVariableInt( 'accolade-value-int', Number( accValue ) );

		var secondPlaceSuffix = ( accPosition != '1' ) ? '_2' : '';
		elCard.SetDialogVariable( 'accolade-the-title', $.Localize( '#accolade_' + accName + secondPlaceSuffix ) );
		elCard.SetDialogVariable( 'accolade-desc', $.Localize( '#accolade_' + accName + '_desc' + secondPlaceSuffix, elCard ) );

		var valueToken = '#accolade_' + accName + '_value';
		var valueLocalized = $.Localize( valueToken, elCard );
		if ( valueToken == valueLocalized )
			valueLocalized = '';
		elCard.SetDialogVariable( 'accolade-value', valueLocalized );
		elCard.SetHasClass( 'show-accolade', true );
	}

	function SetAccoladeText ( elCard, title, detail )
	{
		if ( !elCard )
			return;

		elCard.SetDialogVariable( 'accolade-the-title', title || '' );
		elCard.SetDialogVariable( 'accolade-desc', detail || '' );
		elCard.SetDialogVariable( 'accolade-value', '' );
		elCard.SetHasClass( 'show-accolade', !!( title || detail ) );
	}

	function SetAvatar ( elCard, xuid )
	{
		var elAvatarImage = elCard.FindChildTraverse( 'jsAvatar' );
		if ( !elAvatarImage )
			return;

		var team = MockAdapter.GetPlayerTeamName( xuid );
		var bIsBot = MockAdapter.IsFakePlayer( xuid );

		if ( !bIsBot )
		{
			elAvatarImage.steamid = xuid;
		}
		else
		{
			elAvatarImage.SetDefaultImage( 'file://{images}/icons/scoreboard/avatar-' + team + '.png' );
		}

		elAvatarImage.SwitchClass( 'teamstyle', 'team--' + team );
	}

	function SetFlair ( elCard, xuid )
	{
		if ( MockAdapter.IsFakePlayer( xuid ) )
			return;

		if ( typeof InventoryAPI === 'undefined' || typeof InventoryAPI.GetFlairItemId !== 'function' )
			return;

		if ( xuid !== MockAdapter.GetLocalPlayerXuid() )
			return;

		var flairItemId = InventoryAPI.GetFlairItemId( xuid );
		if ( flairItemId === '0' || !flairItemId )
			return;

		var imagePath = InventoryAPI.GetItemInventoryImage( flairItemId );
		if ( !imagePath )
			return;

		var elFlairImage = elCard.FindChildTraverse( 'jsFlairImage' );
		if ( !elFlairImage )
			return;

		elFlairImage.SetImage( 'file://{images}' + imagePath + '_small.png' );
		elCard.SetHasClass( 'show-flair', true );
	}

	function SetSkillGroup ( elCard, xuid )
	{
		var elImage = elCard.FindChildTraverse( 'jsSkillGroupImage' );
		if ( !elImage )
			return;

		var rank = -1;
		try
		{
			rank = GameStateAPI.GetPlayerCompetitiveRanking( xuid );
		}
		catch ( e )
		{
			rank = -1;
		}

		if ( rank === undefined || rank === null || rank < 1 )
		{
			elCard.RemoveClass( 'show-skillgroup' );
			return;
		}

		var mode = _ModeName();
		var prefix = ( mode === 'scrimcomp2v2' ) ? 'skillgroup_wingman' : 'skillgroup';
		elImage.SetImage( 'file://{images}/icons/skillgroups/' + prefix + '_' + rank + '.svg' );
		elCard.RemoveClass( 'show-skillgroup' );
		$.Schedule( 0.0, function()
		{
			if ( elCard && elCard.IsValid() )
				elCard.AddClass( 'show-skillgroup' );
		} );
	}

	function SetStats ( elCard, xuid, arrBestStats )
	{
		var oStats = _ParseStats( xuid );
		var score = 0;
		try { score = Number( MockAdapter.GetPlayerScore( xuid ) ) || 0; }
		catch ( e ) { score = 0; }

		var gglevel = score;
		try
		{
			if ( typeof MockAdapter.GetPlayerGungameLevel === 'function' )
				gglevel = Number( MockAdapter.GetPlayerGungameLevel( xuid ) ) || score;
		}
		catch ( e ) {}

		if ( arrBestStats )
		{
			for ( var i = 0; i < arrBestStats.length; i++ )
			{
				var oBest = arrBestStats[ i ];
				var stat = oBest.stat;
				var val = Number( oStats[ stat ] );
				if ( val > 0 && ( !oBest.value || val > oBest.value ) )
				{
					oBest.value = val;
					oBest.elCard = elCard;
				}
			}
		}

		elCard.SetDialogVariableInt( 'playercardstats-kills', Number( oStats.kills ) );
		elCard.SetDialogVariableInt( 'playercardstats-deaths', Number( oStats.deaths ) );
		elCard.SetDialogVariableInt( 'playercardstats-assists', Number( oStats.assists ) );
		elCard.SetDialogVariableInt( 'playercardstats-adr', Number( oStats.adr ) );
		elCard.SetDialogVariableInt( 'playercardstats-hsp', Number( oStats.hsp ) );
		elCard.SetDialogVariableInt( 'playercardstats-ef', Number( oStats.enemiesflashed ) );
		elCard.SetDialogVariableInt( 'playercardstats-ud', Number( oStats.utilitydamage ) );
		elCard.SetDialogVariableInt( 'playercardstats-score', score );
		elCard.SetDialogVariableInt( 'playercardstats-gglevel', gglevel );
		elCard.SetDialogVariableInt( 'playercardstats-knifekills', Number( oStats.knifekills ) );
		elCard.SetHasClass( 'show-stats', true );
	}

	function SetTeammateColor ( elCard, xuid )
	{
		var teammateColor = '';
		var teamName = '';
		try
		{
			teammateColor = MockAdapter.GetPlayerColor( xuid ) || '';
			teamName = MockAdapter.GetPlayerTeamName( xuid );
		}
		catch ( e ) {}

		var teamColor = teammateColor ? teammateColor : ( teamName == 'CT' ? '#5ab8f4' : '#f0c941' );
		var panels = elCard.FindChildrenWithClassTraverse( 'colorize-teammate-color' );
		for ( var i = 0; i < panels.length; i++ )
		{
			panels[ i ].style.washColor = ( teamColor !== '' ) ? teamColor : 'black';
		}
	}

	function RevealStats ( elCard )
	{
		if ( !elCard || !elCard.IsValid() )
			return;

		var delay = 0;
		var panels = elCard.FindChildrenWithClassTraverse( 'sliding-panel' );
		for ( var i = 0; i < panels.length; i++ )
		{
			( function( el, t )
			{
				$.Schedule( t, function()
				{
					if ( el && el.IsValid() )
						el.AddClass( 'slide' );
				} );
			} )( panels[ i ], delay );
			delay += 0.1;
		}
	}

	function HighlightStat ( elCard, stat )
	{
		if ( elCard && elCard.IsValid() )
			elCard.AddClass( 'highlight-' + stat );
	}

	return {
		Init: Init,
		GetCard: GetCard,
		SetAccolade: SetAccolade,
		SetAccoladeText: SetAccoladeText,
		SetAvatar: SetAvatar,
		SetFlair: SetFlair,
		SetSkillGroup: SetSkillGroup,
		SetStats: SetStats,
		SetTeammateColor: SetTeammateColor,
		RevealStats: RevealStats,
		HighlightStat: HighlightStat
	};
} )();
