"use strict";

var Chat = ( function ()
{
	var m_isContentPanelOpen = false;
	var m_ChatPanel = $( "#PartyChat" );
	var m_OriginalParent = m_ChatPanel.GetParent();
	var m_bInputFocused = false;

	function _FindMainMenuRoot()
	{
		var el = $.GetContextPanel();
		while ( el && el.GetParent() )
			el = el.GetParent();
		return el;
	}

	function _BlurInput()
	{
		var elInput = $( '#ChatInput' );
		if ( elInput )
		{
			// PANEL event — must target a panel or engine no-ops.
			$.DispatchEvent( 'DropInputFocus', elInput );
		}
		m_bInputFocused = false;
		_HideFocusCatcher();
	}

	function _HideFocusCatcher()
	{
		var elRoot = _FindMainMenuRoot();
		if ( !elRoot )
			return;
		var el = elRoot.FindChild( 'ChatInputFocusCatcher' );
		if ( el )
		{
			el.style.visibility = 'collapse';
			el.style.opacity = '0.0';
		}
		if ( m_ChatPanel )
			m_ChatPanel.style.zIndex = null;
	}

	function _ShowFocusCatcher()
	{
		var elRoot = _FindMainMenuRoot();
		if ( !elRoot )
			return;

		var el = elRoot.FindChild( 'ChatInputFocusCatcher' );
		if ( !el )
		{
			// Styles must be inline — catcher lives on MainMenuRoot, outside chat.css scope.
			el = $.CreatePanel( 'Button', elRoot, 'ChatInputFocusCatcher' );
			el.style.width = '100%';
			el.style.height = '100%';
			el.style.zIndex = '2';
			el.style.backgroundColor = '#00000000';
			el.SetPanelEvent( 'onactivate', function ()
			{
				_BlurInput();
			} );
		}

		// Under popups, above vanity; sidebars use z-index 3+.
		var elPopup = elRoot.FindChild( 'PopupManager' );
		if ( elPopup )
			elRoot.MoveChildBefore( el, elPopup );
		else
			elRoot.MoveChildAfter( el, elRoot.GetChild( 0 ) );

		el.style.visibility = 'visible';
		el.style.opacity = '1.0';
		// Keep party chat above the catcher so lines/input still work.
		if ( m_ChatPanel )
			m_ChatPanel.style.zIndex = '6';
	}

	function _OnChatInputFocus()
	{
		m_bInputFocused = true;
		_ShowFocusCatcher();
	}

	function _Init()
	{
		var elInput = $( '#ChatInput' );
		elInput.SetPanelEvent( 'oninputsubmit', Chat.ChatTextSubmitted );
		elInput.activationenabled = false;
		elInput.SetPanelEvent( 'onfocus', _OnChatInputFocus );
		elInput.SetPanelEvent( 'onblur', function ()
		{
			m_bInputFocused = false;
			_HideFocusCatcher();
		} );

		var elOpenChat = $.GetContextPanel().FindChildInLayoutFile( 'ChatContainer' );
		elOpenChat.SetPanelEvent( "onactivate", function ()
		{
			var elChatContainer = $( '#ChatContainer' );
			if ( !elChatContainer.BHasClass( "chat-open" ) )
			{
				_OpenChat();
				return;
			}
			// Already open: click on chat body (not the text field) releases keyboard focus.
			_BlurInput();
		} );

		var elCloseChat = $.GetContextPanel().FindChildInLayoutFile( 'ChatCloseButton' );
		elCloseChat.SetPanelEvent( "onactivate", function ()
		{
			_Close();
		} );
	}

	function _OpenChat()
	{
		var elChatContainer = $( '#ChatContainer' );

		if ( !elChatContainer.BHasClass( "chat-open" ) )
		{
			elChatContainer.RemoveClass( 'closed-minimized' );
			elChatContainer.AddClass( "chat-open" );
			// Enable field but do not focus — user clicks the TextEntry to type.
			$( "#ChatInput" ).activationenabled = true;
			$.Schedule( .1, _ScrollToBottom );
		}
	}

	function _Close()
	{
		var elChatContainer = $( '#ChatContainer' );
		if ( elChatContainer.BHasClass( "chat-open" ) )
		{
			elChatContainer.RemoveClass( "chat-open" );
			$( "#ChatInput" ).activationenabled = false;
			_BlurInput();
			$.Schedule( .1, _ScrollToBottom );

			_SetClosedHeight();
			return true;
		}

		_BlurInput();
		return false;
	}

	function _SetClosedHeight()
	{
		var elChatContainer = $( '#ChatContainer' );
		if ( !elChatContainer.BHasClass( "chat-open" ) )
		{
			elChatContainer.SetHasClass( 'closed-minimized', m_isContentPanelOpen );
			$.Schedule( .1, _ScrollToBottom );
		}
	}

	function _ChatTextSubmitted()
	{
		$.GetContextPanel().SubmitChatText();
		$( '#ChatInput' ).text = "";
		// Keep open; release focus so ~ / menu work after send.
		_BlurInput();
	}

	function _ShowPlayerCard( strSteamID )
	{
		var contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParameters(
			'',
			'',
			'file://{resources}/layout/context_menus/context_menu_playercard.xml',
			'xuid=' + strSteamID
		);
	}

	function _OnNewChatEntry()
	{
		$.Schedule( .1, _ScrollToBottom );
	}

	function _ScrollToBottom()
	{
		$( '#ChatLinesContainer' ).ScrollToBottom();
	}

	function _SessionUpdate( status )
	{
		var elChat = $.GetContextPanel().FindChildInLayoutFile( 'ChatPanelContainer' );

		if ( status === 'closed' )
			_ClearChatMessages();

		if ( !LobbyAPI.IsSessionActive() )
		{
			elChat.AddClass( 'hidden' );
			_BlurInput();
		}
		else
		{
			var numPlayersActuallyInParty = PartyListAPI.GetCount();
			var networkSetting = PartyListAPI.GetPartySessionSetting( "system/network" );
			var bShowPartyChat = ( networkSetting === 'LIVE' ) || ( numPlayersActuallyInParty > 1 );

			elChat.SetHasClass( 'hidden', !bShowPartyChat );

			if ( !bShowPartyChat )
			{
				_Close();
			}

			var elPlaceholder = $.GetContextPanel().FindChildInLayoutFile( 'PlaceholderText' );
			if ( elPlaceholder )
			{
				if ( numPlayersActuallyInParty > 1 )
					elPlaceholder.text = $.Localize( '#party_chat_placeholder' );
				else
					elPlaceholder.text = $.Localize( '#party_chat_placeholder_empty_lobby' );
			}
		}
	}

	function _ClearChatMessages()
	{
		var elMessagesContainer = $( '#ChatLinesContainer' );
		elMessagesContainer.RemoveAndDeleteChildren();
	}

	var _ClipPanelToNotOverlapSideBar = function ( noClip )
	{
		var panelToClip = $.GetContextPanel();
		if ( !panelToClip || panelToClip.BHasClass( 'hidden' ))
			return;

		if ( $.GetContextPanel().GetParent().id !== 'MainMenuFriendsAndParty' )
			return;

		var panelToClipWidth = panelToClip.actuallayoutwidth;
		var friendsListWidthWhenExpanded = panelToClip.GetParent().FindChildInLayoutFile( 'mainmenu-sidebar__blur-target' ).contentwidth;

		var sideBarWidth = noClip ? 0 : friendsListWidthWhenExpanded;
		var widthDiff = panelToClipWidth - sideBarWidth;
		var clipPercent = ( panelToClipWidth <= 0 || widthDiff <= 0 ? 1 : ( widthDiff / panelToClipWidth ) ) * 100;

		if ( clipPercent )
			panelToClip.style.clip = 'rect( 0%, ' + clipPercent + '%, 100%, 0% );';
	};

	var _OnHideContentPanel = function ()
	{
		m_isContentPanelOpen = false;
		_SetClosedHeight();
	};

	var _OnShowContentPanel = function ()
	{
		m_isContentPanelOpen = true;
		_SetClosedHeight();
	};

	var _OnShowAcceptPopup = function( popup )
	{
		m_ChatPanel.SetParent( popup.FindChild( 'id-accept-match' ) );

		var elChatContainer = $( '#ChatContainer' );
		if ( elChatContainer.BHasClass( "chat-open" ) )
		{
			$( "#ChatInput" ).activationenabled = true;
			$( "#ChatInput" ).SetFocus();
		}
	};

	var _OnCloseAcceptPopup = function()
	{
		m_ChatPanel.SetParent( m_OriginalParent );
		var elPreviousPeer = m_OriginalParent.FindChild( 'JsMainMenuSidebar' );
		m_OriginalParent.MoveChildAfter( m_ChatPanel, elPreviousPeer );

		m_ChatPanel.style.y = '0px';
		_Init();
	};

	return {
		Init 					: _Init,
		ChatTextSubmitted  		: _ChatTextSubmitted,
		ShowPlayerCard			: _ShowPlayerCard,
		SessionUpdate			: _SessionUpdate,
		NewChatEntry			: _OnNewChatEntry,
		OnSideBarHover:  _ClipPanelToNotOverlapSideBar,
		OnHideContentPanel: _OnHideContentPanel,
		OnShowContentPanel: _OnShowContentPanel,
		Close 					: _Close,
		BlurInput				: _BlurInput,
		OnShowAcceptPopup: _OnShowAcceptPopup,
		OnCloseAcceptPopup : _OnCloseAcceptPopup
	};
})();

(function()
{
	Chat.Init();
	$.RegisterForUnhandledEvent( "PanoramaComponent_Lobby_MatchmakingSessionUpdate", Chat.SessionUpdate );
	$.RegisterForUnhandledEvent( "OnNewChatEntry", Chat.NewChatEntry );
	$.RegisterEventHandler( "Cancelled", $.GetContextPanel(), Chat.Close );
	$.RegisterForUnhandledEvent( 'SidebarIsCollapsed', Chat.OnSideBarHover );
	$.RegisterForUnhandledEvent( 'HideContentPanel', Chat.OnHideContentPanel );
	$.RegisterForUnhandledEvent( 'ShowContentPanel', Chat.OnShowContentPanel );
	$.RegisterForUnhandledEvent( 'ShowAcceptPopup', Chat.OnShowAcceptPopup );
	$.RegisterForUnhandledEvent( 'CloseAcceptPopup', Chat.OnCloseAcceptPopup );
})();
