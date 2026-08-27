"use strict";

var TeamColor = ( function ()
{
	// Hardcoded CS:GO teammate colors (match csgostyles.css). Settings may be empty offline.
	var kFallback = {
		default: "100,100,100",
		yellow: "248,246,45",
		purple: "161,25,240",
		green: "0,181,98",
		blue: "92,168,255",
		orange: "255,155,37"
	};

	var _GetColorString = function ( color, fallback )
	{
		if ( !color || typeof color !== "string" || !color.length )
			return fallback;
		var list = color.split( " " );
		if ( !list || !list.length || ( list.length === 1 && !list[0] ) )
			return fallback;
		return list.join( "," );
	};

	var _SafeSetting = function ( key )
	{
		try
		{
			if ( typeof GameInterfaceAPI === "undefined" || !GameInterfaceAPI.GetSettingString )
				return "";
			var v = GameInterfaceAPI.GetSettingString( key );
			return ( v === null || v === undefined ) ? "" : ( "" + v );
		}
		catch ( e )
		{
			return "";
		}
	};

	var colorRGB = {
		default: kFallback.default,
		yellow: _GetColorString( _SafeSetting( "cl_teammate_color_1" ), kFallback.yellow ),
		purple: _GetColorString( _SafeSetting( "cl_teammate_color_2" ), kFallback.purple ),
		green: _GetColorString( _SafeSetting( "cl_teammate_color_3" ), kFallback.green ),
		blue: _GetColorString( _SafeSetting( "cl_teammate_color_4" ), kFallback.blue ),
		orange: _GetColorString( _SafeSetting( "cl_teammate_color_5" ), kFallback.orange )
	};

	var _GetTeamColor = function ( teamColorInx )
	{
		var i = Number( teamColorInx );
		if ( isNaN( i ) || i < -1 )
			return colorRGB.yellow;
		if ( i === -1 )
			return colorRGB.default;
		if ( i === 0 )
			return colorRGB.yellow;
		if ( i === 1 )
			return colorRGB.purple;
		if ( i === 2 )
			return colorRGB.green;
		if ( i === 3 )
			return colorRGB.blue;
		if ( i === 4 )
			return colorRGB.orange;
		return colorRGB.default;
	};

	var _GetTeamColorLetter = function ( teamColorInx )
	{
		var i = Number( teamColorInx );
		if ( i === -1 )
			return "";
		if ( i === 0 )
			return "Y";
		if ( i === 1 )
			return "P";
		if ( i === 2 )
			return "G";
		if ( i === 3 )
			return "B";
		if ( i === 4 )
			return "O";
		return "";
	};

	return {
		GetTeamColor: _GetTeamColor,
		GetTeamColorLetter: _GetTeamColorLetter
	};
} )();
