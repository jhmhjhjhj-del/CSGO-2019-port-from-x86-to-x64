'use strict';

var PopupNews = ( function()
{
	function _HtmlBody( s )
	{
		return ( s || '' )
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /\r\n/g, '\n' )
			.replace( /\n/g, '<br/>' );
	}

	var _Init = function()
	{
		var p = $.GetContextPanel();
		var pending = ( typeof NewsPanel !== 'undefined' && typeof NewsPanel.GetPendingDetail === 'function' )
			? NewsPanel.GetPendingDetail()
			: null;

		var date = ( pending && pending.date ) ? pending.date : p.GetAttributeString( 'date', '' );
		var title = ( pending && pending.title ) ? pending.title : p.GetAttributeString( 'title', '' );
		var body = ( pending && ( pending.body || pending.description ) )
			? ( pending.body || pending.description )
			: p.GetAttributeString( 'body', '' );
		var image = ( pending && pending.imageUrl ) ? pending.imageUrl : p.GetAttributeString( 'image', '' );

		p.SetDialogVariable( 'news_date', date );
		p.SetDialogVariable( 'news_title', title );
		p.SetDialogVariable( 'news_body', _HtmlBody( body ) );

		var elImage = p.FindChildTraverse( 'id-news-image' );
		if ( elImage )
		{
			if ( image )
				elImage.SetImage( image );
			else
				elImage.visible = false;
		}
	};

	var _Close = function()
	{
		$.DispatchEvent( 'UIPopupButtonClicked', '' );
	};

	return {
		Init: _Init,
		Close: _Close
	};
} )();
