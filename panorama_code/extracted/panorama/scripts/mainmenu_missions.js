'use strict';

var mainmenu_missions = ( function()
{
	function _SetIconVisible( elMission, id, visible )
	{
		var el = elMission.FindChildInLayoutFile( id );
		if ( el )
			el.visible = visible;
	}

	function _FillQuests()
	{
		var list = $( '#JsMissionsList' );
		if ( !list )
			return;
		list.RemoveAndDeleteChildren();

		var n = MissionsAPI.GetQuestCount();
		var done = 0;
		var activeId = 0;
		if ( typeof MissionsAPI.GetActiveQuestID === 'function' )
			activeId = MissionsAPI.GetActiveQuestID();

		for ( var i = 0; i < n; i++ )
		{
			var id = MissionsAPI.GetQuestIDByIndex( i );
			var name = MissionsAPI.GetQuestDefinitionField( id, 'loc_name' );
			var desc = MissionsAPI.GetQuestDefinitionField( id, 'loc_description' );
			var cur = MissionsAPI.GetQuestProgress( id );
			var goal = MissionsAPI.GetQuestGoal( id );
			if ( goal <= 0 )
				goal = 1;
			var complete = cur >= goal;
			if ( complete )
				done++;

			var elMission = $.CreatePanel( 'Button', list, 'id-mission-' + id );
			elMission.BLoadLayout( 'file://{resources}/layout/operation/operation_mission_snippets.xml', false, false );
			elMission.SetHasClass( 'complete', complete );

			var elName = elMission.FindChildInLayoutFile( 'id-mission-name' );
			if ( elName )
				elName.text = name;
			var elDesc = elMission.FindChildInLayoutFile( 'id-mission-desc' );
			if ( elDesc )
				elDesc.text = desc;
			var elUncommitted = elMission.FindChildInLayoutFile( 'id-mission-desc-uncommitted' );
			if ( elUncommitted )
				elUncommitted.visible = false;

			_SetIconVisible( elMission, 'id-mission-card-icon-play', !complete && ( id == activeId ) );
			_SetIconVisible( elMission, 'id-mission-card-icon-complete', complete );
			_SetIconVisible( elMission, 'id-mission-card-icon-locked', false );
			_SetIconVisible( elMission, 'id-mission-card-icon-replay', !complete && ( id != activeId ) );
			_SetIconVisible( elMission, 'id-mission-card-spinner', false );

			var elParent = elMission.FindChildInLayoutFile( 'id-mission-segments-container' );
			if ( elParent )
			{
				elParent.RemoveAndDeleteChildren();
				var elProgress = $.CreatePanel( 'Panel', elParent, 'id-mission-bar-' + id );
				elProgress.AddClass( 'op-mission-card__mission-progress' );
				var elBarWrap = $.CreatePanel( 'Panel', elProgress, '' );
				elBarWrap.AddClass( 'op-mission-card__mission__bar-container' );
				var elOuter = $.CreatePanel( 'Panel', elBarWrap, 'id-mission-card-bar-outer' );
				elOuter.AddClass( 'op_mission-card__bar' );
				var elInner = $.CreatePanel( 'Panel', elOuter, 'id-mission-card-bar' );
				elInner.AddClass( 'op_mission-card__bar__inner' );
				var pct = Math.min( 100, Math.floor( ( cur / goal ) * 100 ) );
				elInner.style.width = pct + '%';

				var elStar = $.CreatePanel( 'Panel', elProgress, '' );
				elStar.AddClass( 'op_mission-card__mission__star-container' );
				if ( complete )
					elStar.AddClass( 'complete' );
				var elCount = $.CreatePanel( 'Label', elStar, '' );
				elCount.AddClass( 'op_mission-card__mission-section-count' );
				elCount.text = cur + ' / ' + goal;
			}
		}

		var elStars = $( '#JsMissionsStars' );
		if ( elStars )
			elStars.text = done + ' / ' + n + ' complete';
	}

	function _Init()
	{
		_FillQuests();
	}

	return { Init: _Init };
} )();
