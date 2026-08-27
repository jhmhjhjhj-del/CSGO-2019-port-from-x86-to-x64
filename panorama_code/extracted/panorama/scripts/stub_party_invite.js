'use strict';

/** Pending GC party invite — accept before lobby sync adds the member. */
var StubPartyInvite = ( function()
{
	var _shownForLobby = '0';

	var _TryShow = function()
	{
		if ( typeof LobbyAPI === 'undefined' || !LobbyAPI.HasPendingPartyInvite )
			return;

		if ( !LobbyAPI.HasPendingPartyInvite() )
			return;

		var fromName = LobbyAPI.GetPendingPartyInviteFromName() || 'Friend';
		var lobbyKey = LobbyAPI.GetPendingPartyInviteFromXuid() + '|' + fromName;
		if ( _shownForLobby === lobbyKey )
			return;
		_shownForLobby = lobbyKey;

		var title = 'Приглашение в группу';
		var body = fromName + ' приглашает тебя в группу. Принять?';
		UiToolkitAPI.ShowGenericPopupOkCancel(
			title,
			body,
			'',
			function()
			{
				LobbyAPI.AcceptPendingPartyInvite();
				_shownForLobby = '0';
			},
			function()
			{
				LobbyAPI.DeclinePendingPartyInvite();
				_shownForLobby = '0';
			}
		);
	};

	var _Poll = function()
	{
		_TryShow();
		$.Schedule( 1.0, _Poll );
	};

	return {
		Start: _Poll,
		OnInvite: _TryShow
	};
} )();

( function()
{
	StubPartyInvite.Start();
	$.RegisterForUnhandledEvent( 'PanoramaComponent_PartyBrowser_InviteReceived', StubPartyInvite.OnInvite );
} )();
