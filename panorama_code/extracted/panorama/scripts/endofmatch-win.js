'use strict';

var EOM_Win = ( function () {


	var _m_pauseBeforeEnd = 5.0;
	var _m_cP = $.GetContextPanel();

	var _m_oMatchEndData = {};
	var _m_oScoreData = {};

	function _GetTeamScore ( teamName )
	{
		if ( !_m_oScoreData || !_m_oScoreData[ 'teamdata' ] )
			return 0;

		var oTeam = _m_oScoreData[ 'teamdata' ][ teamName ];
		if ( !oTeam )
			return 0;

		return Number( oTeam[ 'score' ] ) || 0;
	}

	function _AnimStart ()
	{
		var elPanel = _m_cP.FindChildTraverse( 'WinTeam' );
		if ( elPanel )
			elPanel.AddClass( 'show' );
	}

	function _SetVictoryStatement()
	{
		if ( !_m_cP || !_m_cP.IsValid() )
			return false;

		if ( !_m_oMatchEndData || !_m_oScoreData )
			return false;

		if ( !_m_oScoreData[ 'teamdata' ] ||
			!_m_oScoreData[ 'teamdata' ][ 'CT' ] ||
			!_m_oScoreData[ 'teamdata' ][ 'TERRORIST' ] )
			return false;

		var winningTeamNumber = _m_oMatchEndData[ 'winning_team_number' ];
		var teamTScore = _GetTeamScore( 'TERRORIST' );
		var teamCTScore = _GetTeamScore( 'CT' );
		var localPlayerTeamScore = teamTScore;
		var otherTeamScore = teamCTScore;
		var result = '#eom-tie';

		_m_cP.RemoveClass( 'eom-win_won' );
		_m_cP.RemoveClass( 'eom-win_lost' );

		if ( winningTeamNumber )
		{
			var localPlayerTeamNumber = 0;
			try
			{
				localPlayerTeamNumber = MockAdapter.GetPlayerTeamNumber( MockAdapter.GetLocalPlayerXuid() );
			}
			catch ( e ) {}

			var mode = '';
			try
			{
				if ( typeof EOM_Characters !== 'undefined' )
					mode = EOM_Characters.GetModeForEndOfMatchPurposes();
			}
			catch ( e ) {}

			var bForceShowWinningTeam = false;
			try
			{
				if ( typeof EOM_Characters !== 'undefined' )
					bForceShowWinningTeam = EOM_Characters.ShowWinningTeam( mode );
			}
			catch ( e ) {}

			if ( GameStateAPI.IsDemoOrHltv() || ( localPlayerTeamNumber != 2 && localPlayerTeamNumber != 3 ) || bForceShowWinningTeam )
			{
				localPlayerTeamScore = winningTeamNumber == 2 ? teamTScore : teamCTScore;
				otherTeamScore = winningTeamNumber == 2 ? teamCTScore : teamTScore;
				result = '#eom-victory';
				_m_cP.SetHasClass( 'eom-win_won', true );
			}
			else
			{
				localPlayerTeamScore = localPlayerTeamNumber == 2 ? teamTScore : teamCTScore;
				otherTeamScore = localPlayerTeamNumber == 2 ? teamCTScore : teamTScore;
				var bWon = ( winningTeamNumber == localPlayerTeamNumber );
				result = bWon ? '#eom-victory' : '#eom-defeat';
				_m_cP.SetHasClass( 'eom-win_won', bWon );
				_m_cP.SetHasClass( 'eom-win_lost', !bWon );
			}
		}

		$.DispatchEvent( 'PlaySoundEffect', 'UIPanorama.gameover_show', 'MOUSE' );

		_m_cP.SetDialogVariable( 'win-result', $.Localize( result ) );
		_m_cP.SetDialogVariableInt( 'score_local_player', localPlayerTeamScore );
		_m_cP.SetDialogVariableInt( 'score_other', otherTeamScore );
		_AnimStart();
		return true;
	}

	function _ShouldSkipWinPanel()
	{
		if ( !_m_oMatchEndData )
			return true;

		if ( _m_oMatchEndData[ 'winning_player' ] != 0 )
			return true;

		var mode = '';
		try
		{
			if ( typeof EOM_Characters !== 'undefined' )
				mode = EOM_Characters.GetModeForEndOfMatchPurposes();
			else
				mode = GameStateAPI.GetGameModeInternalName( false );
		}
		catch ( e )
		{
			mode = GameStateAPI.GetGameModeInternalName( false );
		}

		return ( mode === 'deathmatch' || mode === 'ffadm' || mode === 'gungameprogressive' || mode === 'training' );
	}

	function _DisplayMe()
	{
		_m_oMatchEndData = GameStateAPI.GetMatchEndWinDataJSO();
		_m_oScoreData = GameStateAPI.GetScoreDataJSO();

		if ( !_m_oMatchEndData )
			return false;

		if ( _ShouldSkipWinPanel() )
			return false;

		return _SetVictoryStatement();
	}

	function _Start()
	{
		if ( _DisplayMe() )
		{
			EndOfMatch.SwitchToPanel( 'eom-win' );
			EndOfMatch.StartDisplayTimer( _m_pauseBeforeEnd );
			$.Schedule( _m_pauseBeforeEnd, _End );
		}
		else
		{
			_End();
		}
	}

	function _End()
	{
		$.DispatchEvent( 'EndOfMatch_ShowNext' );
	}

	function _Shutdown()
	{
	}

	return {
		name: 'eom-win',
		Start: _Start,
		Shutdown: _Shutdown,
	};
})();


(function () {
	EndOfMatch.RegisterPanelObject( EOM_Win );
})();
