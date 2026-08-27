'use strict';

var NewsPanel = (function () {

	var kFallbackFeed = {
		items: [
			{
				link: 'https://steamcommunity.com/app/730',
				imageUrl: 'file://{images}/map_icons/screenshots/1080p/de_dust2.png',
				date: '2026-08-17',
				title: 'Store sell + localization',
				description: 'Owned skins can be sold offline. Language files restored as UTF-16 LE.',
				body: 'Owned weapon skins can be sold from inventory. Language files were restored as UTF-16 LE. Edit cfg/offline_news.json to publish your own notes.'
			},
			{
				link: 'https://steamcommunity.com/app/730',
				imageUrl: 'file://{images}/map_icons/screenshots/1080p/de_mirage.png',
				date: '2026-08-17',
				title: 'Missions, Watch, Friends',
				description: 'Missions tab, local demo Watch lists, add-friend roster, news and overlay URLs.',
				body: 'Missions is a full offline tab with quest cards and progress from the local profile.\n\nWatch lists demos from disk. Add Friend uses the local roster. News is this panel — click a card for the full text.'
			},
			{
				link: 'https://steamcommunity.com/app/730',
				imageUrl: 'file://{images}/map_icons/screenshots/1080p/de_inferno.png',
				date: '2026-08-17',
				title: 'Offline CS:GO notes',
				description: 'Prime buy tile hidden. Workshop maps and streams use local catalogs.',
				body: 'The Prime purchase tile is hidden in the store. Workshop maps come from maps/workshop/. Streams come from cfg/offline_streams.txt.\n\nPut your own changelog in cfg/offline_news.json. Click a news card for the full text — nothing is loaded from Steam.'
			}
		]
	};

	function _ParseFeed( raw )
	{
		if ( !raw )
			return null;
		if ( typeof raw === 'object' && raw.items )
			return raw;
		if ( typeof raw !== 'string' )
			return null;
		try
		{
			if ( raw.charCodeAt( 0 ) === 0xFEFF )
				raw = raw.substring( 1 );
			var parsed = JSON.parse( raw );
			if ( parsed && parsed.items )
				return parsed;
		}
		catch ( e )
		{
		}
		return null;
	}

	function _ResolveFeed( feed )
	{
		var parsed = _ParseFeed( feed );
		if ( parsed )
			return parsed;
		if ( typeof BlogAPI !== 'undefined' && typeof BlogAPI.GetLastFeedJSON === 'function' )
		{
			parsed = _ParseFeed( BlogAPI.GetLastFeedJSON() );
			if ( parsed )
				return parsed;
		}
		return kFallbackFeed;
	}

	function _FindLister()
	{
		var ctx = $.GetContextPanel();
		if ( ctx )
		{
			var el = ctx.FindChildInLayoutFile( 'NewsPanelLister' );
			if ( el )
				return el;
		}
		var news = $( '#JsNewsPanel' );
		if ( news )
			return news.FindChildInLayoutFile( 'NewsPanelLister' );
		return null;
	}

	var m_busy = false;
	var m_filled = false;
	var m_pendingDetail = null;

	function _EncodeParam( s )
	{
		if ( typeof $.UrlEncode === 'function' )
			return $.UrlEncode( s || '' );
		return ( s || '' ).replace( /%/g, '%25' ).replace( /&/g, '%26' ).replace( /=/g, '%3D' ).replace( /\n/g, '%0A' );
	}

	function _OpenDetail( newsItem )
	{
		m_pendingDetail = newsItem || {};
		var body = m_pendingDetail.body || m_pendingDetail.description || '';
		UiToolkitAPI.ShowCustomLayoutPopupParameters(
			'offline_news_detail',
			'file://{resources}/layout/popups/popup_news.xml',
			'date=' + _EncodeParam( m_pendingDetail.date || '' ) +
			'&title=' + _EncodeParam( m_pendingDetail.title || '' ) +
			'&body=' + _EncodeParam( body ) +
			'&image=' + _EncodeParam( m_pendingDetail.imageUrl || '' )
		);
	}

	function _GetPendingDetail()
	{
		return m_pendingDetail;
	}

	function _BindOpenDetail( el, newsItem )
	{
		if ( !el )
			return;
		el.SetPanelEvent( 'onactivate', _OpenDetail.bind( undefined, newsItem ) );
	}

	var _GetRssFeed = function()
	{
		if ( m_busy )
			return;
		m_busy = true;
		if ( typeof BlogAPI !== 'undefined' && typeof BlogAPI.RequestRSSFeed === 'function' )
			BlogAPI.RequestRSSFeed();
		if ( !m_filled )
			_OnRssFeedReceived( null );
		m_busy = false;
	};

	var _OnRssFeedReceived = function( feed )
	{
		if ( m_filled )
			return;

		var resolved = _ResolveFeed( feed );
		var elLister = _FindLister();
		if ( !elLister || !resolved || !resolved.items )
			return;

		m_filled = true;
		elLister.RemoveAndDeleteChildren();

		resolved.items.forEach( function( item, i )
		{
			if ( !item )
				return;

			var elEntry = $.CreatePanel( 'Panel', elLister, 'NewEntry' + i, {
				acceptsinput: true
			} );
			elEntry.BLoadLayoutSnippet( 'news-full-entry' );

			var elImage = elEntry.FindChildInLayoutFile( 'NewsHeaderImage' );
			if ( elImage )
			{
				elImage.SetImage( item.imageUrl
					? item.imageUrl
					: 'file://{images}/map_icons/screenshots/1080p/default.png' );
			}

			var elEntryInfo = $.CreatePanel( 'Panel', elEntry, 'NewsInfo' + i );
			elEntryInfo.BLoadLayoutSnippet( 'news-info' );
			elEntryInfo.SetDialogVariable( 'news_item_date', item.date || '' );
			elEntryInfo.SetDialogVariable( 'news_item_title', item.title || '' );
			elEntryInfo.SetDialogVariable( 'news_item_body', item.description || '' );

			var elBlur = elEntry.FindChildInLayoutFile( 'NewsEntryBlurTarget' );
			if ( elBlur )
				elBlur.AddBlurPanel( elEntryInfo );

			_BindOpenDetail( elEntry, item );
			var elButtons = elEntry.FindChildrenWithClassTraverse( 'news-entry' );
			if ( elButtons )
			{
				elButtons.forEach( function( elBtn )
				{
					_BindOpenDetail( elBtn, item );
				} );
			}
		} );
	};

	var _OnSteamIsPlaying = function()
	{
		var ctx = $.GetContextPanel();
		if ( ctx && typeof EmbeddedStreamAPI !== 'undefined' && typeof EmbeddedStreamAPI.IsVideoPlaying === 'function' )
			ctx.SetHasClass( 'news-panel-style-short-entires', EmbeddedStreamAPI.IsVideoPlaying() );
	};

	var _ResetNewsEntryStyle = function()
	{
		var ctx = $.GetContextPanel();
		if ( ctx )
			ctx.RemoveClass( 'news-panel-style-short-entires' );
	};

	return {
		GetRssFeed: _GetRssFeed,
		OnRssFeedReceived: _OnRssFeedReceived,
		OnSteamIsPlaying: _OnSteamIsPlaying,
		ResetNewsEntryStyle: _ResetNewsEntryStyle,
		OpenDetail: _OpenDetail,
		GetPendingDetail: _GetPendingDetail
	};
})();


(function () {
	$.RegisterForUnhandledEvent( "PanoramaComponent_Blog_RSSFeedReceived", NewsPanel.OnRssFeedReceived );
	$.RegisterForUnhandledEvent( "PanoramaComponent_EmbeddedStream_VideoPlaying", NewsPanel.OnSteamIsPlaying );
	$.RegisterForUnhandledEvent( "StreamPanelClosed", NewsPanel.ResetNewsEntryStyle );
	NewsPanel.GetRssFeed();
})();
