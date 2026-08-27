'use strict';

// Fake MM personas for scoreboard (mask A). Mirrors stub_fake_mm.inl PRNG + nick pool.
// Keep a singleton: scoreboard.xml + teamselectmenu.xml both include this file.
var StubMm = ( typeof StubMm !== 'undefined' ) ? StubMm : ( function()
{
	var kNickPool = [
		"neo", "s1mple", "ZywOo", "device", "NiKo", "electronic", "rain", "flusha",
		"KennyS", "coldzera", "fer", "FalleN", "shox", "apEX", "NBK", "Happy",
		"Guardian", "seized", "flamie", "Hobbit", "Ax1Le", "interz", "nafany", "sh1ro",
		"b1t", "YEKINDAR", "jL", "donk", "m0NESY", "ropz", "huNter-", "karrigan",
		"B1ad3", "BlameF", "stavn", "cadiaN", "jabbi", "HooXi", "Spinx", "flameZ",
		"broky", "k0nfig", "Magisk", "gla1ve", "XANTARES", "woxic", "Jame", "Qikert",
		"SANJI", "YEK1", "mir", "Boombl4", "Perfecto", "Degoy", "chopper", "magixx",
		"ArtFr0st", "sjuush", "TeSeS", "sAw", "refrezh", "torzsi", "xertioN", "Jimpphat",
		"siuhy", "xfl0ud", "jks", "Vexite", "INS", "aliStair", "Liazz", "Hatz",
		"Sico", "Grim", "oSee", "ELiGE", "FalleN2", "kio", "YEK", "naf",
		"Twistzz", "Stewie2K", "autimatic", "Skadoodle", "tarik", "Rush", "daps", "stanislaw",
		"LEGIJA", "tabseN", "syrsoN", "kryptos", "faveN", "mirbit", "Krimbo", "prosus",
		"rigoN", "sinnopsyy", "gxx-", "juanflatroo", "SENER1", "v1c", "sinnopsyy2", "rigoN2",
		"Kaze", "somebody", "Attacker", "Summer", "advent", "ZhokiMo", "Jee", "Mercury",
		"Moseyuh", "EmiliaQAQ", "JamYoung", "ChildKing", "Starry", "L1haNg", "westmelon", "z4kr",
		"SENER", "xertion", "jimpphat2", "torzsi2", "siuhy2", "xfl0ud2", "isak", "maxster",
		"nilo", "ztr", "KRIMZ", "JW", "flusha2", "Lekr0", "Brollan", "REZ",
		"hampus", "friberg", "f0rest", "GeT_RiGhT", "Xizt", "forest", "RobbaN", "pittner"
	];

	var _active = false;
	var _seed = 0;
	var _playerLevel = 1;
	var _rankComp = 0;
	var _rankWing = 0;
	var _personas = [];
	var _assign = {}; // xuid string -> slot
	var _lastRefresh = 0;

	var _rng = function( st )
	{
		st.s = ( Math.imul( st.s >>> 0, 1664525 ) + 1013904223 ) >>> 0;
		return st.s;
	};

	var _pickRank = function( st, playerRank )
	{
		if ( playerRank === 0 )
		{
			var roll = _rng( st ) % 100;
			if ( roll < 75 )
				return 0;
			if ( roll < 90 )
				return 1 + ( _rng( st ) % 3 );
			return 1 + ( _rng( st ) % 6 );
		}
		var roll2 = _rng( st ) % 100;
		var r = playerRank;
		if ( roll2 < 45 )
			r = playerRank;
		else if ( roll2 < 70 )
			r = playerRank + ( _rng( st ) % 3 );
		else if ( roll2 < 85 )
			r = playerRank + 3 + ( _rng( st ) % 2 );
		else
			r = playerRank - 1 - ( _rng( st ) % 3 );
		if ( r < 1 )
			r = 1;
		if ( r > 18 )
			r = 18;
		var cap = playerRank + 4;
		if ( r > cap )
			r = cap;
		return r;
	};

	var _pickLevel = function( st, playerLevel )
	{
		var lvl = playerLevel + ( _rng( st ) % 7 ) - 3;
		if ( lvl < 1 )
			lvl = 1;
		if ( lvl > 40 )
			lvl = 40;
		return lvl;
	};

	var _rebuildPersonas = function()
	{
		_personas = [];
		if ( !_active || !_seed )
			return;

		var st = { s: _seed >>> 0 };
		var used = {};
		// Keep PRNG aligned with C++ stub (always uses competitive rank for generation).
		var playerRankForRng = _rankComp;
		var mode = '';
		try
		{
			mode = MockAdapter.GetGameModeInternalName( false ) || '';
		}
		catch ( e ) {}
		var displayRankBase = ( mode === 'scrimcomp2v2' ) ? _rankWing : _rankComp;

		for ( var i = 0; i < 16; i++ )
		{
			var nickIdx = _rng( st ) % kNickPool.length;
			var t;
			for ( t = 0; t < kNickPool.length; t++ )
			{
				var idx = ( nickIdx + t ) % kNickPool.length;
				if ( !used[idx] )
				{
					nickIdx = idx;
					used[idx] = true;
					break;
				}
			}
			var name = kNickPool[nickIdx];
			while ( name.length && name.charAt( 0 ) === ' ' )
				name = name.substring( 1 );

			var level = _pickLevel( st, _playerLevel );
			_pickRank( st, playerRankForRng ); // consume like C++
			_rng( st ); // avatar color rng

			var rankSt = { s: ( _seed ^ ( 0xA5A5A5A5 + i * 9973 ) ) >>> 0 };
			var rank = _pickRank( rankSt, displayRankBase );

			_personas.push( {
				slot: i,
				name: name,
				level: level,
				rank: rank,
				ping: 18 + ( ( _seed % 17 ) + i * 13 ) % 55,
				accountId: 22000001 + ( _seed % 100000 ) + i,
				avatar: 'file://{images}/stub_mm/p' + i + '.png'
			} );
		}
	};

	var _parseState = function( raw )
	{
		// Closed steam writes "seed|level|rankComp|rankWing"
		if ( !raw )
			return false;
		var parts = raw.split( '|' );
		if ( parts.length < 4 )
			return false;
		var seed = parseInt( parts[0], 10 ) || 0;
		var level = parseInt( parts[1], 10 ) || 1;
		var rc = parseInt( parts[2], 10 ) || 0;
		var rw = parseInt( parts[3], 10 ) || 0;
		// seed==0 means FakeMM off
		var on = seed > 0;
		if ( on === _active && seed === _seed && level === _playerLevel && rc === _rankComp && rw === _rankWing )
			return _active;
		_active = on;
		_seed = seed;
		_playerLevel = level;
		_rankComp = rc;
		_rankWing = rw;
		_assign = {};
		_rebuildPersonas();
		return _active;
	};

	var _applyBlob = function()
	{
		var blob = GameInterfaceAPI.GetSettingString( 'stub_mm_blob' ) || '';
		_parseState( blob );
	};

	var _refreshFromCfg = function()
	{
		var now = Date.now();
		try
		{
			// Prefer live convar; only re-exec cfg occasionally (file written by steam_api stub).
			var existing = GameInterfaceAPI.GetSettingString( 'stub_mm_blob' ) || '';
			if ( existing && existing.indexOf( '|' ) >= 0 )
			{
				_applyBlob();
				if ( now - _lastRefresh < 30000 )
					return;
			}
			if ( now - _lastRefresh < 5000 )
			{
				_applyBlob();
				return;
			}
			_lastRefresh = now;
			GameInterfaceAPI.ConsoleCommand( 'exec stub_mm_state.cfg' );
			_applyBlob();
		}
		catch ( e ) {}
	};

	var IsActive = function()
	{
		_refreshFromCfg();
		if ( !_active || _personas.length <= 0 )
			return false;
		try
		{
			var mode = MockAdapter.GetGameModeInternalName( false ) || '';
			if ( mode === 'training' )
				return false;
		}
		catch ( e ) {}
		return true;
	};

	var _ensureAssign = function( xuid )
	{
		var key = '' + xuid;
		if ( _assign.hasOwnProperty( key ) )
			return _assign[key];

		var usedSlots = {};
		var k;
		for ( k in _assign )
		{
			if ( _assign.hasOwnProperty( k ) )
				usedSlots[_assign[k]] = true;
		}

		var slot = 0;
		while ( usedSlots[slot] && slot < _personas.length )
			slot++;
		if ( slot >= _personas.length )
			slot = ( parseInt( key, 10 ) || 0 ) % _personas.length;
		_assign[key] = slot;
		return slot;
	};

	// SteamID64 does not fit in JS Number (2^53). Never parseInt the whole id.
	var kSteamId64Base = '76561197960265728';
	var _subtractDec = function( a, b )
	{
		a = String( a ).replace( /[^0-9]/g, '' );
		b = String( b ).replace( /[^0-9]/g, '' );
		if ( !a )
			return 0;
		while ( b.length < a.length )
			b = '0' + b;
		while ( a.length < b.length )
			a = '0' + a;
		var res = '';
		var borrow = 0;
		var i;
		for ( i = a.length - 1; i >= 0; --i )
		{
			var d = ( a.charCodeAt( i ) - 48 ) - ( b.charCodeAt( i ) - 48 ) - borrow;
			if ( d < 0 )
			{
				d += 10;
				borrow = 1;
			}
			else
				borrow = 0;
			res = String.fromCharCode( 48 + d ) + res;
		}
		res = res.replace( /^0+/, '' );
		return parseInt( res || '0', 10 );
	};
	var _accountIdFromXuid = function( xuid )
	{
		var s = ( '' + xuid ).replace( /\.0$/, '' );
		if ( !s || s === '0' )
			return 0;
		if ( s.length < 16 )
			return parseInt( s, 10 ) || 0;
		return _subtractDec( s, kSteamId64Base );
	};

	var PersonaFor = function( xuid )
	{
		if ( !IsActive() )
			return null;

		var key = '' + xuid;
		var accountId = _accountIdFromXuid( key );
		if ( accountId >= 22000001 )
		{
			var slot = accountId - ( 22000001 + ( _seed % 100000 ) );
			if ( slot >= 0 && slot < _personas.length )
			{
				_assign[key] = slot;
				return _personas[slot];
			}
		}

		try
		{
			if ( typeof MockAdapter !== 'undefined' && MockAdapter.IsFakePlayer && !MockAdapter.IsFakePlayer( xuid ) )
				return null;
		}
		catch ( eFake ) {}

		var slot2 = _ensureAssign( xuid );
		return _personas[slot2] || null;
	};

	return {
		IsActive: IsActive,
		PersonaFor: PersonaFor,
		Refresh: _refreshFromCfg
	};
} )();
