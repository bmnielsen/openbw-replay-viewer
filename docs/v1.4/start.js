/*
 * Replay value mappings: _replay_get_value(x):
 * 
 * 0: game speed [2^n], n in [-oo, 8192]
 * 1: paused [0, 1]
 * 2: current frame that is being displayed (integer)
 * 3: target frame to which the replay viewer will fast-forward (integer)
 * 4: end frame (integer)
 * 5: map name (string)
 * 6: percentage of frame / end frame used to position the slider handle [0..1] (double)
 */

/*****************************
 * Constants
 *****************************/
var C_PLAYER_ACTIVE = 0;
var C_COLOR = 1;
var C_NICK = 2;
var C_USED_ZERG_SUPPLY = 3;
var C_USED_TERRAN_SUPPLY = 4;
var C_USED_PROTOSS_SUPPLY = 5;
var C_AVAILABLE_ZERG_SUPPLY = 6;
var C_AVAILABLE_TERRAN_SUPPLY = 7;
var C_AVAILABLE_PROTOSS_SUPPLY = 8;
var C_CURRENT_MINERALS = 9;
var C_CURRENT_GAS = 10;
var C_CURRENT_WORKERS = 11;
var C_CURRENT_ARMY_SIZE = 12;
var C_RACE = 13;
var C_APM = 14;

var C_MPQ_FILENAMES = ["StarDat.mpq", "BrooDat.mpq", "Patch_rt.mpq"];
var C_MPQ_BASE_URL = (window.OPENBW_MPQ_BASE_URL || "/bw").replace(/\/$/, "");
var C_DEFAULT_MPQ_SOURCES = [C_MPQ_BASE_URL + "/STARDAT.MPQ", C_MPQ_BASE_URL + "/BROODAT.MPQ", C_MPQ_BASE_URL + "/patch_rt.mpq"];
var C_MUSIC_BASE_URL = (window.OPENBW_MUSIC_BASE_URL || (
	(window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
		? "https://dgant.github.io/mpqs/Music"
		: "/mpqs/Music"
)).replace(/\/$/, "");
var C_MUSIC_TRACKS_BY_RACE = {
	0: ["17. Zerg 1.mp3", "18. Zerg 2.mp3", "19. Zerg 3.mp3", "20. Zerg (Brood War).mp3"],
	1: ["03. Terran 1.mp3", "04. Terran 2.mp3", "05. Terran 3.mp3", "06. Terran (Brood War).mp3"],
	2: ["10. Protoss 1.mp3", "11. Protoss 2.mp3", "12. Protoss 3.mp3", "13. Protoss (Brood War).mp3"]
};

/*****************************
 * Globals
 *****************************/
var Module = {
    preRun: [],
    postRun: [],
    canvas: null,
	print: console.log,
	printErr: console.error,
	//filePackagePrefixURL: "../bw/"
};

var db_handle;
var main_has_been_called = false;
var load_replay_data_arr = null;
var replayPlaylist = [];
var replayPlaylistIndex = -1;
var remoteReplayStatus = null;
var query_params = new URLSearchParams(window.location.search);
var requestedReplayFrame = (() => {
	var value = parseInt(query_params.get('frame') || '', 10);
	return Number.isFinite(value) && value >= 0 ? value : null;
})();
var embeddedReplayConfig = {
	enabled: query_params.get('embedded') === '1',
	playerFilter: (query_params.get('player') || '').trim().toLowerCase(),
	maxMinutes: parseFloat(query_params.get('maxMinutes') || '')
};
var embeddedReplayState = {
	watchedKeys: {},
	currentGameKey: null,
	pendingGameKey: null,
	advanceScheduled: false,
	advanceTimer: null,
	fetchInProgress: false,
	loadingReplay: false,
	retryTimer: null
};

var files = [];
var js_read_buffers = [];
var is_reading = false;
var mpq_data_ready = false;
var is_fetching_default_mpqs = false;
var mpq_retry_timer = null;
var mpq_retry_attempt = 0;
var mpq_status_lines = [];

var players = [];
var C_BASIL_DATA_BASE_URL = "https://data.basil-ladder.net/";
var musicState = {
	audio: null,
	playlist: [],
	index: 0,
	unlocked: false,
	activeReplayKey: null,
	suppressPauseSync: false
};
var viewerWindowFocused = true;
var currentReplaySourceUrl = query_params.get('rep') || null;
var pendingRequestedReplayFrame = null;
var playbackStateMonitor = {
	lastFrame: null,
	lastAdvanceAt: 0,
	lastSeenAt: 0
};
var viewerRuntimeUiStateCache = null;
var viewerRuntimeUiLastSyncAt = 0;
var viewerMainLoopPausedForIdle = false;
var viewerStaticRepaintToken = 0;
var viewerInteractionHoldUntil = 0;
var viewerPointerInteractionActive = false;
var viewerLastDoneState = false;
var viewportAlertState = {
	lastNuclearLaunchAlertCount: 0,
	pendingNuclearLaunch: false,
	text: '',
	hideAt: 0
};

/*****************************
 * Functions
 *****************************/

/**
 * Sets the drop box area depending on whether a replay URL is provided or not.
 * Adds the drag and drop functionality.
 */
jQuery(document).ready( function($) {
	$('#rv_modal, #quick_help, #goto, #export_settings').foundation();
	
	Module.canvas = document.getElementById("canvas");
	var canvas = Module.canvas;
	var infoTab = document.getElementById("info_tab");
	var infoDock = document.getElementById("info-dock-body");
	if (infoTab && infoDock) {
		infoTab.draggable = false;
		infoDock.appendChild(infoTab);
		infoTab.style.display = "block";
	}
	
	set_db_handle(function(event) {
		  
		db_handle = event.target.result;
		db_handle.onerror = function(event) {
			
			  // Generic error handler for all errors targeted at this database's requests!
			  console.log("Database error: " + event.target.errorCode);
			};
		
		// the db_handle has successfully been obtained. Now attempt to load the MPQs.
		load_mpq_from_db();	
	});
	
	initialize_canvas(canvas);
	install_canvas_resize_watcher();
	install_mobile_camera_controls(canvas);
	
	add_drag_and_drop_listeners(document.body, canvas);
	document.getElementById("select_rep_file").addEventListener("change", on_rep_file_select, false);
	register_music_unlock_handlers();
	register_playback_visibility_handlers();

	if (typeof apply_infobar_layout === "function") {
		apply_infobar_layout();
	}
})

/**
 * Sets up the initial canvas look.
 */
function initialize_canvas(canvas) {
	document.title = window.OPENBW_WINDOW_TITLE || "StarCraft Replay Viewer";
	Module.setWindowTitle = function() {
		document.title = window.OPENBW_WINDOW_TITLE || "StarCraft Replay Viewer";
	};
	
	canvas.height = '300';
	canvas.style.height = '300px';
	canvas.width = '400';
	canvas.style.width = '400px';
	canvas.style.position = 'relative';
	canvas.style.top = 'calc(40% - 120px)';
	
	if (ajax_object.replay_file == null) {
		return;
	// } else {
		
	// 	resize_canvas(canvas);
	// 	print_to_modal("Loading...", ajax_object.replay_file.substring(27));
	}
}

function set_pregame_dropzone_status(title, message) {
	var dropzone = document.querySelector('.pregame-dropzone');
	if (!dropzone) return;
	if (!remoteReplayStatus) {
		remoteReplayStatus = {
			html: dropzone.innerHTML
		};
	}
	dropzone.innerHTML =
		(title ? '<div class="pregame-status-title">' + title + '</div>' : '') +
		'<div class="pregame-status-message">' + message + '</div>';
	dropzone.classList.add('pregame-dropzone-status');
}

function reveal_pregame_homepage() {
	document.body.classList.remove('pregame-boot-pending');
}

function reset_pregame_dropzone() {
	var dropzone = document.querySelector('.pregame-dropzone');
	if (!dropzone || !remoteReplayStatus) return;
	dropzone.innerHTML = remoteReplayStatus.html;
	dropzone.classList.remove('pregame-dropzone-status');
	var notes = document.querySelector('.pregame-notes');
	if (notes) notes.style.display = '';
	var overlay = document.getElementById('pregame-overlay');
	if (overlay) overlay.classList.remove('pregame-loading');
	document.getElementById("select_rep_file").addEventListener("change", on_rep_file_select, false);
}

function show_loading_replay_screen(url) {
	var overlay = document.getElementById('pregame-overlay');
	var notes = document.querySelector('.pregame-notes');
	if (overlay) {
		overlay.style.display = 'grid';
		overlay.classList.add('pregame-loading');
	}
	$('body').addClass('pregame-active');
	if (notes) notes.style.display = 'none';
	set_pregame_dropzone_status("Loading replay", url);
}

function show_loading_files_screen(message) {
	var overlay = document.getElementById('pregame-overlay');
	var notes = document.querySelector('.pregame-notes');
	if (overlay) {
		overlay.style.display = 'grid';
		overlay.classList.add('pregame-loading');
	}
	$('body').addClass('pregame-active');
	if (notes) notes.style.display = 'none';
	set_pregame_dropzone_status("Loading files", message);
}

function reset_loading_files_screen() {
	reset_pregame_dropzone();
	$('body').removeClass('pregame-active');
}

function update_mpq_loading_status(extraLine) {
	if (extraLine) {
		mpq_status_lines.push(extraLine);
	}
	show_loading_files_screen(mpq_status_lines.join('<br>') || 'Preparing bundled files...');
}

function schedule_mpq_retry() {
	if (mpq_retry_timer) return;
	var delayMs = 5000;
	mpq_retry_timer = setTimeout(function() {
		mpq_retry_timer = null;
		fetch_default_mpqs();
	}, delayMs);
	update_mpq_loading_status("Retrying bundled files in " + (delayMs / 1000) + "s...");
}

function shuffle_array(values) {
	var arr = values.slice();
	for (var i = arr.length - 1; i > 0; --i) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
	return arr;
}

function current_replay_music_key() {
	return players.map(function(player) {
		return _player_get_value(player, C_NICK);
	}).join(':') + ':' + _replay_get_value(5);
}

function build_music_playlist_for_current_replay() {
	var tracks = [];
	if (!players.length) return tracks;
	var raceTracks = C_MUSIC_TRACKS_BY_RACE[_player_get_value(players[0], C_RACE)];
	if (!raceTracks) return tracks;
	raceTracks.forEach(function(track) {
		tracks.push(C_MUSIC_BASE_URL + '/' + encodeURIComponent(track));
	});
	return shuffle_array(tracks);
}

function stop_music_playback() {
	if (!musicState.audio) return;
	musicState.suppressPauseSync = true;
	musicState.audio.pause();
	musicState.suppressPauseSync = false;
	musicState.audio.src = '';
	musicState.audio = null;
}

function is_music_enabled() {
	return !!(typeof audioCategorySettings !== "undefined" &&
		audioCategorySettings.music &&
		audioCategorySettings.music.enabled);
}

function reset_playback_state_monitor() {
	playbackStateMonitor.lastFrame = main_has_been_called && typeof _replay_get_value === "function" ? _replay_get_value(2) : null;
	playbackStateMonitor.lastAdvanceAt = 0;
	playbackStateMonitor.lastSeenAt = Date.now();
}

function note_viewer_frame_progress(frame) {
	var now = Date.now();
	if (playbackStateMonitor.lastFrame === null || frame !== playbackStateMonitor.lastFrame) {
		playbackStateMonitor.lastAdvanceAt = now;
		playbackStateMonitor.lastFrame = frame;
	}
	playbackStateMonitor.lastSeenAt = now;
}

function playback_expected_frame_interval_ms(speed) {
	var safeSpeed = Math.max(1 / 128, Number(speed) || 1);
	return 42 / safeSpeed;
}

function resume_viewer_main_loop() {
	if (!viewerMainLoopPausedForIdle) return;
	if (typeof Module === "undefined" || typeof Module.resumeMainLoop !== "function") {
		viewerMainLoopPausedForIdle = false;
		return;
	}
	viewerMainLoopPausedForIdle = false;
	try {
		Module.resumeMainLoop();
	} catch (error) {}
	reset_playback_state_monitor();
}

function hold_viewer_main_loop_awake(ms) {
	viewerInteractionHoldUntil = Math.max(viewerInteractionHoldUntil, Date.now() + Math.max(0, ms || 0));
}

function schedule_static_repaint_if_needed(delays) {
	if (typeof request_static_repaint_if_needed !== "function") return;
	var repaintToken = ++viewerStaticRepaintToken;
	(delays || [0]).forEach(function(delay) {
		window.setTimeout(function() {
			if (repaintToken !== viewerStaticRepaintToken) return;
			request_static_repaint_if_needed();
		}, Math.max(0, delay || 0));
	});
}

function pause_viewer_main_loop_if_idle(state) {
	if (viewerMainLoopPausedForIdle) return;
	if (!state || !state.hasReplay || !state.windowActive) return;
	if (state.advancingFrames || state.isCatchingUp) return;
	if (viewerPointerInteractionActive) return;
	if (Date.now() < viewerInteractionHoldUntil) return;
	if (!(state.isPaused || state.isDone)) return;
	if (state.currentFrame !== state.targetFrame) return;
	if (typeof Module === "undefined" || typeof Module.pauseMainLoop !== "function") return;
	try {
		Module.pauseMainLoop();
		viewerMainLoopPausedForIdle = true;
	} catch (error) {
		viewerMainLoopPausedForIdle = false;
	}
}

function get_viewer_runtime_state() {
	var hasReplay = main_has_been_called && typeof _replay_get_value === "function" && _replay_get_value(4) > 0;
	var state = {
		hasReplay: hasReplay,
		windowActive: !document.hidden && viewerWindowFocused,
		currentFrame: 0,
		targetFrame: 0,
		endFrame: 0,
		speed: 1,
		isPaused: true,
		isDone: false,
		isCatchingUp: false,
		playbackRequested: false,
		advancingFrames: false,
		canCopyReplayLink: !!currentReplaySourceUrl
	};
	if (!hasReplay) return state;
	state.currentFrame = _replay_get_value(2);
	state.targetFrame = _replay_get_value(3);
	state.endFrame = _replay_get_value(4);
	state.speed = _replay_get_value(0);
	state.isPaused = _replay_get_value(1) !== 0;
	state.isDone = state.endFrame > 0 && state.currentFrame >= state.endFrame;
	state.isCatchingUp = state.currentFrame < state.targetFrame;
	state.playbackRequested = !state.isPaused && !state.isDone;
	var graceMs = Math.max(750, playback_expected_frame_interval_ms(state.speed) * 2 + 250);
	state.advancingFrames = state.playbackRequested &&
		playbackStateMonitor.lastAdvanceAt > 0 &&
		(Date.now() - playbackStateMonitor.lastAdvanceAt) <= graceMs;
	return state;
}

function viewer_runtime_ui_signature(state) {
	return [
		state.hasReplay ? 1 : 0,
		state.windowActive ? 1 : 0,
		state.isPaused ? 1 : 0,
		state.isDone ? 1 : 0,
		state.isCatchingUp ? 1 : 0,
		state.targetFrame,
		state.canCopyReplayLink ? 1 : 0,
		state.advancingFrames ? 1 : 0
	].join('|');
}

function sync_viewer_runtime_state(force) {
	var state = get_viewer_runtime_state();
	window.__openbwViewerRuntimeState = state;
	var now = Date.now();
	var signature = viewer_runtime_ui_signature(state);
	if (!force && viewerRuntimeUiStateCache === signature && (now - viewerRuntimeUiLastSyncAt) < 100) {
		return state;
	}
	viewerRuntimeUiStateCache = signature;
	viewerRuntimeUiLastSyncAt = now;
	if (typeof update_play_pause_button === "function") {
		update_play_pause_button(state);
	}
	if (typeof update_permalink_button === "function") {
		update_permalink_button(state);
	}
	if (typeof sync_music_playback_state === "function") {
		sync_music_playback_state(state);
	}
	update_viewport_alert(state);
	if (state.hasReplay && state.isDone && !viewerLastDoneState) {
		schedule_static_repaint_if_needed([0, 120, 360]);
	}
	viewerLastDoneState = state.hasReplay ? state.isDone : false;
	pause_viewer_main_loop_if_idle(state);
	return state;
}

function play_next_music_track() {
	if (!is_music_enabled() || !musicState.unlocked) return;
	if (!musicState.playlist.length) return;
	if (musicState.audio) {
		musicState.audio.pause();
		musicState.audio = null;
	}
	var trackUrl = musicState.playlist[musicState.index % musicState.playlist.length];
	musicState.index = (musicState.index + 1) % musicState.playlist.length;
	var audio = new Audio(trackUrl);
	audio.preload = 'auto';
	audio.addEventListener('ended', function() {
		play_next_music_track();
	});
	audio.addEventListener('pause', function() {
		if (musicState.suppressPauseSync) return;
		if (audio.ended) return;
		setTimeout(function() {
			if (musicState.audio === audio && typeof sync_viewer_runtime_state === "function") {
				sync_viewer_runtime_state(true);
			}
		}, 0);
	});
	musicState.audio = audio;
	if (typeof apply_music_volume === "function") {
		apply_music_volume();
	}
	sync_music_playback_state(get_viewer_runtime_state());
}

function sync_music_playback_state(state) {
	state = state || get_viewer_runtime_state();
	if (!is_music_enabled()) {
		stop_music_playback();
		return;
	}
	if (!musicState.unlocked || !musicState.playlist.length) return;
	if (!musicState.audio) {
		play_next_music_track();
		return;
	}
	if (typeof effective_category_volume === "function" && effective_category_volume('music') <= 0) {
		if (!musicState.audio.paused) {
			musicState.suppressPauseSync = true;
			musicState.audio.pause();
			musicState.suppressPauseSync = false;
		}
		return;
	}
	if (!state.advancingFrames) {
		if (!musicState.audio.paused) {
			musicState.suppressPauseSync = true;
			musicState.audio.pause();
			musicState.suppressPauseSync = false;
		}
		return;
	}
	if (typeof apply_music_volume === "function") {
		apply_music_volume();
	}
	if (musicState.audio.paused) {
		var playPromise = musicState.audio.play();
		if (playPromise && typeof playPromise.catch === 'function') {
			playPromise.catch(function() {});
		}
	}
}

function initialize_music_for_current_replay() {
	var replayKey = current_replay_music_key();
	if (musicState.activeReplayKey === replayKey) {
		sync_music_playback_state(get_viewer_runtime_state());
		return;
	}
	stop_music_playback();
	musicState.activeReplayKey = replayKey;
	musicState.playlist = build_music_playlist_for_current_replay();
	musicState.index = 0;
	sync_music_playback_state(get_viewer_runtime_state());
}

function register_music_unlock_handlers() {
	var unlock = function() {
		musicState.unlocked = true;
		if (typeof Module !== "undefined") {
			Module.__openbwAudioUnlocked = true;
		}
		sync_viewer_runtime_state(true);
	};
	window.addEventListener('pointerdown', unlock, true);
	window.addEventListener('keydown', unlock, true);
	window.addEventListener('touchstart', unlock, true);
}

function register_playback_visibility_handlers() {
	var syncPlaybackState = function() {
		if (document.hidden || !viewerWindowFocused) {
			viewerPointerInteractionActive = false;
			viewerInteractionHoldUntil = 0;
		}
		if (document.hidden || !viewerWindowFocused) {
			reset_playback_state_monitor();
		}
		sync_viewer_runtime_state(true);
	};
	var resumeOnInteraction = function() {
		hold_viewer_main_loop_awake(750);
		resume_viewer_main_loop();
	};
	var markPointerActive = function() {
		viewerPointerInteractionActive = true;
		hold_viewer_main_loop_awake(1000);
		resume_viewer_main_loop();
	};
	var markPointerInactive = function() {
		viewerPointerInteractionActive = false;
		hold_viewer_main_loop_awake(500);
	};
	window.addEventListener('mousedown', resumeOnInteraction, true);
	window.addEventListener('pointerdown', resumeOnInteraction, true);
	window.addEventListener('click', resumeOnInteraction, true);
	window.addEventListener('keydown', resumeOnInteraction, true);
	window.addEventListener('touchstart', resumeOnInteraction, true);
	window.addEventListener('wheel', resumeOnInteraction, true);
	window.addEventListener('mousedown', markPointerActive, true);
	window.addEventListener('pointerdown', markPointerActive, true);
	window.addEventListener('touchstart', markPointerActive, true);
	window.addEventListener('mousemove', function() {
		if (!viewerPointerInteractionActive) return;
		hold_viewer_main_loop_awake(1000);
	}, true);
	window.addEventListener('pointermove', function() {
		if (!viewerPointerInteractionActive) return;
		hold_viewer_main_loop_awake(1000);
	}, true);
	window.addEventListener('touchmove', function() {
		if (!viewerPointerInteractionActive) return;
		hold_viewer_main_loop_awake(1000);
	}, true);
	window.addEventListener('mouseup', markPointerInactive, true);
	window.addEventListener('pointerup', markPointerInactive, true);
	window.addEventListener('pointercancel', markPointerInactive, true);
	window.addEventListener('touchend', markPointerInactive, true);
	window.addEventListener('touchcancel', markPointerInactive, true);
	document.addEventListener('visibilitychange', syncPlaybackState, true);
	window.addEventListener('focus', function() {
		viewerWindowFocused = true;
		syncPlaybackState();
	}, true);
	window.addEventListener('blur', function() {
		viewerWindowFocused = false;
		syncPlaybackState();
	}, true);
	window.addEventListener('pageshow', function() {
		viewerWindowFocused = true;
		syncPlaybackState();
	}, true);
	window.addEventListener('pagehide', function() {
		viewerWindowFocused = false;
		syncPlaybackState();
	}, true);
}

var resource_count = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

function update_graphs(frame) {
	
	if ($('#graphs_tab').is(":visible")) {
		if ($('#graphs_tab_panel1').hasClass("is-active")) {
			if (!infoChart && typeof ensure_info_chart === "function") {
				ensure_info_chart();
			}
			if (!infoChart) return;
			var arrayIndex = Math.round(frame / 16);

			infoChart.data.labels = resource_count[0].slice(0, arrayIndex);
			infoChart.data.datasets[0].data = resource_count[1].slice(0, arrayIndex);
			infoChart.data.datasets[1].data = resource_count[2].slice(0, arrayIndex);
			infoChart.data.datasets[2].data = resource_count[3].slice(0, arrayIndex);
			infoChart.data.datasets[3].data = resource_count[4].slice(0, arrayIndex);
			infoChart.data.datasets[4].data = resource_count[5].slice(0, arrayIndex);
			infoChart.data.datasets[5].data = resource_count[6].slice(0, arrayIndex);
			infoChart.data.datasets[6].data = resource_count[7].slice(0, arrayIndex);
			infoChart.data.datasets[7].data = resource_count[8].slice(0, arrayIndex);
			infoChart.update();
		}
	}
}

/**
 * updates values for the replay viewer info tab (production, army, killed units, etc.).
 */
function update_info_tab() {

	if (!$('#info_tab').is(":visible")) return;

	var funcs = Module.get_util_funcs();
	var upgrades = [];
	var researches = [];
	for (var i = 0; i < players.length; i++) {
		upgrades.push([players[i], funcs.get_completed_upgrades(players[i]), funcs.get_incomplete_upgrades(players[i])]);
		researches.push([players[i], funcs.get_completed_research(players[i]), funcs.get_incomplete_research(players[i])]);
	}
	update_production_tab(funcs.get_all_incomplete_units(), upgrades, researches);
	update_army_tab(funcs.get_all_completed_units());
	update_tech_tab(upgrades, researches);
}
	
/**
 * updates values for the replay viewer info bar
 */
function update_info_bar(frame) {
	
	update_handle_position(_replay_get_value(6) * 200);
    update_timer(_replay_get_value(2));
    update_speed(_replay_get_value(0));
    
    var array_index = Math.round(frame / 16);
    if (array_index >= resource_count[0].length) {
    	resource_count[0].length = array_index + 1;
    }
    resource_count[0][array_index] = _replay_get_value(2);
    
    for (var i = 0; i < players.length; ++i) {
        
        var race 				= _player_get_value(players[i], C_RACE)
        var used_supply 		= _player_get_value(players[i], C_USED_ZERG_SUPPLY + race);
        var available_supply 	= _player_get_value(players[i], C_AVAILABLE_ZERG_SUPPLY + race);
        
        var minerals			= _player_get_value(players[i], C_CURRENT_MINERALS);
        var gas 				= _player_get_value(players[i], C_CURRENT_GAS);
        var workers				= _player_get_value(players[i], C_CURRENT_WORKERS);
        var army_size			= _player_get_value(players[i], C_CURRENT_ARMY_SIZE);
        
        if (array_index >= resource_count[0].length) {
	        resource_count[i * 4 + 1].length = array_index + 1;
	        resource_count[i * 4 + 2].length = array_index + 1;
	        resource_count[i * 4 + 3].length = array_index + 1;
	        resource_count[i * 4 + 4].length = array_index + 1;
        }
        resource_count[i * 4 + 1][array_index] = minerals;
        resource_count[i * 4 + 2][array_index] = gas;
        resource_count[i * 4 + 3][array_index] = workers;
        resource_count[i * 4 + 4][array_index] = army_size;
        
        if (!first_frame_played) {
	        set_map_name(UTF8ToString(_replay_get_value(5)));
	        set_nick(		i + 1, UTF8ToString(_player_get_value(players[i], C_NICK)));
	        set_color(		i + 1, _player_get_value(players[i], C_COLOR));
	        set_race(		i + 1, race);
        }
        
    	set_supply(		i + 1, used_supply + " / " + available_supply);
        set_minerals(	i + 1, minerals);
        set_gas(		i + 1, gas);
        set_workers(	i + 1, workers);
        set_army(		i + 1, army_size);
    	set_apm(		i + 1, _player_get_value(players[i], C_APM));
    }

    first_frame_played = true;
	if (typeof apply_infobar_layout === "function") {
		apply_infobar_layout();
	}
}

/*****************************
 * Listener functions
 *****************************/

function on_rep_file_select(e) {
	
	var input_files = e.target.files;
	load_replay_file(input_files, Module.canvas);
}

function add_drag_and_drop_listeners(element, canvas) {

	element.addEventListener("dragover", function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	    e.dataTransfer.dropEffect = "move";
	}, false);

	element.addEventListener("drop", async function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	    await load_replay_drop(e.dataTransfer, canvas);
	}, false);
}

function install_mobile_camera_controls(canvas) {
	if (!canvas) return;
	var touchState = null;
	var suppressMouseUntil = 0;
	var isTouchViewport = function() {
		return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
	};
	var isMinimapTouch = function(clientX, clientY, rect) {
		var localX = clientX - rect.left;
		var localY = clientY - rect.top;
		var minimapSize = 128;
		return localX >= 0 && localX <= minimapSize && localY >= rect.height - minimapSize && localY <= rect.height;
	};
	var updateCameraFromTouch = function(clientX, clientY) {
		if (!touchState || typeof _ui_set_screen_center_manual !== "function" || typeof _ui_get_screen_pos !== "function") return;
		var rect = canvas.getBoundingClientRect();
		var scaleX = rect.width ? Module.canvas.width / rect.width : 1;
		var scaleY = rect.height ? Module.canvas.height / rect.height : 1;
		var deltaX = Math.round((clientX - touchState.startX) * scaleX);
		var deltaY = Math.round((clientY - touchState.startY) * scaleY);
		_ui_set_screen_center_manual(
			touchState.screenPosX - deltaX + Math.round(Module.canvas.width / 2),
			touchState.screenPosY - deltaY + Math.round(Module.canvas.height / 2)
		);
	};

	canvas.style.touchAction = 'none';
	canvas.addEventListener("touchstart", function(e) {
		if (!isTouchViewport() || !e.touches.length) return;
		var touch = e.touches[0];
		var rect = canvas.getBoundingClientRect();
		if (isMinimapTouch(touch.clientX, touch.clientY, rect)) return;
		suppressMouseUntil = Date.now() + 700;
		touchState = {
			startX: touch.clientX,
			startY: touch.clientY,
			screenPosX: typeof _ui_get_screen_pos === "function" ? _ui_get_screen_pos(0) : 0,
			screenPosY: typeof _ui_get_screen_pos === "function" ? _ui_get_screen_pos(1) : 0
		};
		e.preventDefault();
	}, { passive: false });
	canvas.addEventListener("touchmove", function(e) {
		if (!touchState || !isTouchViewport() || !e.touches.length) return;
		suppressMouseUntil = Date.now() + 700;
		updateCameraFromTouch(e.touches[0].clientX, e.touches[0].clientY);
		e.preventDefault();
	}, { passive: false });
	canvas.addEventListener("touchend", function(e) {
		if (!touchState || !isTouchViewport()) return;
		suppressMouseUntil = Date.now() + 700;
		if (e.changedTouches.length) {
			updateCameraFromTouch(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
		}
		touchState = null;
		e.preventDefault();
	}, { passive: false });
	canvas.addEventListener("touchcancel", function() {
		touchState = null;
	}, { passive: true });
	["mousedown", "mouseup", "click", "dblclick", "contextmenu"].forEach(function(type) {
		canvas.addEventListener(type, function(e) {
			if (!isTouchViewport()) return;
			if (Date.now() >= suppressMouseUntil) return;
			e.preventDefault();
			e.stopPropagation();
		}, true);
	});
}

/*****************************
 * Helper functions
 *****************************/
function is_replay_file_name(name) {
	return /\.rep$/i.test(name || "");
}

function create_playlist_entry(file, label) {
	return {
		file: file,
		label: label || file.name,
		displayName: file.name
	};
}

function update_replay_playlist_controls() {
	var controls = $('#playlist-controls');
	if (!controls.length) return;
	var isReplayVisible = !document.body.classList.contains('pregame-active') && typeof Module !== "undefined" && Module.canvas && Module.canvas.style.position === "absolute";
	var canvasArea = document.getElementById('canvas-area');
	var minimap = document.getElementById('canvas');
	if (canvasArea && minimap) {
		var areaRect = canvasArea.getBoundingClientRect();
		var minimapLeft = 16;
		var minimapWidth = 128;
		if (typeof Module !== "undefined" && Module.canvas) {
			var canvasRect = Module.canvas.getBoundingClientRect();
			minimapLeft = Math.max(16, Math.round(canvasRect.left - areaRect.left));
		}
		controls.css('left', (minimapLeft + minimapWidth + 8) + 'px');
	}
	var hasPlaylist = replayPlaylist.length > 1 && replayPlaylistIndex >= 0 && isReplayVisible;
	controls.css('display', hasPlaylist ? 'flex' : 'none');
	if (!hasPlaylist) return;
	$('#playlist-position').text('#' + (replayPlaylistIndex + 1) + ' of ' + replayPlaylist.length);
	$('#playlist-name').text(replayPlaylist[replayPlaylistIndex].displayName);
	$('#playlist-prev').prop('disabled', replayPlaylist.length <= 1);
	$('#playlist-next').prop('disabled', replayPlaylist.length <= 1);
}

function show_embedded_home_message(title, message) {
	$('#pregame-overlay').css('display', 'grid');
	var overlay = document.getElementById('pregame-overlay');
	if (overlay) overlay.classList.add('pregame-loading');
	$('body').addClass('pregame-active');
	var notes = document.querySelector('.pregame-notes');
	if (notes) notes.style.display = 'none';
	set_pregame_dropzone_status(title || "", message);
}

function clear_embedded_advance_timer() {
	if (embeddedReplayState.advanceTimer) {
		clearTimeout(embeddedReplayState.advanceTimer);
		embeddedReplayState.advanceTimer = null;
	}
	embeddedReplayState.advanceScheduled = false;
}

function begin_embedded_replay_load(gameKey) {
	clear_embedded_advance_timer();
	embeddedReplayState.loadingReplay = true;
	embeddedReplayState.pendingGameKey = gameKey || null;
}

function abort_embedded_replay_load() {
	clear_embedded_advance_timer();
	embeddedReplayState.loadingReplay = false;
	embeddedReplayState.pendingGameKey = null;
}

function finish_embedded_replay_load() {
	clear_embedded_advance_timer();
	if (embeddedReplayState.pendingGameKey) {
		embeddedReplayState.currentGameKey = embeddedReplayState.pendingGameKey;
	}
	embeddedReplayState.pendingGameKey = null;
	embeddedReplayState.loadingReplay = false;
}

function schedule_embedded_advance_for_current_replay(delayMs) {
	if (!embeddedReplayConfig.enabled || embeddedReplayState.loadingReplay || embeddedReplayState.advanceScheduled || !embeddedReplayState.currentGameKey) {
		return false;
	}
	var scheduledGameKey = embeddedReplayState.currentGameKey;
	embeddedReplayState.advanceScheduled = true;
	embeddedReplayState.watchedKeys[scheduledGameKey] = true;
	embeddedReplayState.advanceTimer = setTimeout(function() {
		embeddedReplayState.advanceTimer = null;
		if (!embeddedReplayConfig.enabled || embeddedReplayState.loadingReplay || embeddedReplayState.currentGameKey !== scheduledGameKey) {
			embeddedReplayState.advanceScheduled = false;
			return;
		}
		embeddedReplayState.advanceScheduled = false;
		load_next_embedded_replay();
	}, Math.max(0, delayMs || 0));
	return true;
}

function format_basil_replay_url(botName, opponentName, mapName, gameHash) {
	return C_BASIL_DATA_BASE_URL + "bots/" + botName + "/" + botName + " vs " + opponentName + " " + mapName + " " + gameHash + ".rep";
}

function embedded_replay_matches(entry, bots, maps) {
	if (!entry || entry.invalidGame || entry.realTimeout) return false;
	var botA = bots[entry.botA.botIndex];
	var botB = bots[entry.botB.botIndex];
	if (!botA || !botB) return false;
	if (embeddedReplayConfig.playerFilter) {
		var haystack = (botA.name + " " + botB.name).toLowerCase();
		if (haystack.indexOf(embeddedReplayConfig.playerFilter) === -1) return false;
	}
	if (!Number.isNaN(embeddedReplayConfig.maxMinutes)) {
		if (!entry.frameCount) return false;
		if ((entry.frameCount / 24 / 60) > embeddedReplayConfig.maxMinutes) return false;
	}
	return !!maps[entry.mapIndex];
}

function fetch_embedded_replay_candidates() {
	return fetch(C_BASIL_DATA_BASE_URL + "stats/games_24h.json")
		.then(function(response) {
			if (!response.ok) throw new Error("Failed to fetch BASIL replay list");
			return response.json();
		})
		.then(function(payload) {
			var bots = payload.bots || [];
			var maps = payload.maps || [];
			var results = payload.results || [];
			return results
				.filter(function(entry) {
					return embedded_replay_matches(entry, bots, maps);
				})
				.map(function(entry) {
					var botA = bots[entry.botA.botIndex];
					var botB = bots[entry.botB.botIndex];
					var mapName = maps[entry.mapIndex];
					return {
						key: entry.gameHash,
						replayUrl: format_basil_replay_url(botA.name, botB.name, mapName, entry.gameHash),
						endedAt: entry.endedAt || 0
					};
				})
				.sort(function(a, b) {
					return b.endedAt - a.endedAt;
				});
		});
}

function schedule_embedded_retry() {
	if (embeddedReplayState.retryTimer) return;
	embeddedReplayState.retryTimer = setTimeout(function() {
		embeddedReplayState.retryTimer = null;
		load_next_embedded_replay();
	}, 60000);
}

function load_next_embedded_replay() {
	if (!embeddedReplayConfig.enabled || embeddedReplayState.fetchInProgress || embeddedReplayState.loadingReplay) return;
	embeddedReplayState.fetchInProgress = true;
	begin_embedded_replay_load(null);
	show_embedded_home_message("Loading replay list", "Fetching recent BASIL replays...");
	fetch_embedded_replay_candidates()
		.then(function(candidates) {
			embeddedReplayState.fetchInProgress = false;
			if (!candidates.length) {
				abort_embedded_replay_load();
				show_embedded_home_message("Replay stream unavailable", "No replays available");
				schedule_embedded_retry();
				return;
			}
			var selected = candidates.find(function(candidate) {
				return !embeddedReplayState.watchedKeys[candidate.key];
			});
			if (!selected) {
				embeddedReplayState.watchedKeys = {};
				selected = candidates[0];
			}
			begin_embedded_replay_load(selected.key);
			load_replay_url(selected.replayUrl);
		})
		.catch(function(error) {
			embeddedReplayState.fetchInProgress = false;
			abort_embedded_replay_load();
			show_embedded_home_message("Replay stream unavailable", error && error.message ? error.message : "Failed to load replay list");
			schedule_embedded_retry();
		});
}

function set_replay_playlist(entries, activeIndex) {
	replayPlaylist = entries.slice().map(function(entry) {
		return {
			file: entry.file,
			label: entry.label || (entry.file ? entry.file.name : ""),
			displayName: entry.displayName || (entry.file ? entry.file.name : entry.label || "")
		};
	}).sort(function(a, b) {
		return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
	});
	replayPlaylistIndex = replayPlaylist.length ? Math.max(0, Math.min(activeIndex || 0, replayPlaylist.length - 1)) : -1;
	update_replay_playlist_controls();
}

function read_replay_entry(entry, canvas) {
	if (!entry || !entry.file) return;
	currentReplaySourceUrl = null;
	Module.print("loading replay from file " + entry.label);
	var reader = new FileReader();
	(function() {
		reader.onloadend = function(e) {
			if (!e.target.error && e.target.readyState != FileReader.DONE) throw "read failed with no error!?";
			if (e.target.error) throw "read failed: " + e.target.error;
			var arr = new Int8Array(e.target.result);
			if (main_has_been_called) {
				var buf = allocate_replay_buffer(arr);
				start_replay(buf, arr.length);
				_free(buf);
			} else {
				load_replay_data_arr = arr;
				print_to_canvas(entry.label, 15, 80, canvas);
				if (mpq_data_ready) {
					on_read_all_done();
				}
			}
		};
	})();
	reader.readAsArrayBuffer(entry.file);
}

function load_replay_playlist_index(index, canvas) {
	if (index < 0 || index >= replayPlaylist.length) return;
	replayPlaylistIndex = index;
	update_replay_playlist_controls();
	read_replay_entry(replayPlaylist[index], canvas);
}

function load_previous_replay() {
	if (replayPlaylist.length <= 1) return;
	load_replay_playlist_index((replayPlaylistIndex - 1 + replayPlaylist.length) % replayPlaylist.length, Module.canvas);
}

function load_next_replay() {
	if (replayPlaylist.length <= 1) return;
	load_replay_playlist_index((replayPlaylistIndex + 1) % replayPlaylist.length, Module.canvas);
}

function normalize_replay_entries(fileList) {
	return Array.prototype.slice.call(fileList || [])
		.filter(function(file) { return is_replay_file_name(file.name); })
		.map(function(file) { return create_playlist_entry(file, file.webkitRelativePath || file.name); });
}

function read_file_entry(entry) {
	return new Promise(function(resolve, reject) {
		entry.file(resolve, reject);
	});
}

function read_directory_entries(reader) {
	return new Promise(function(resolve, reject) {
		reader.readEntries(resolve, reject);
	});
}

async function collect_replay_entries_from_entry(entry, results) {
	if (!entry) return;
	if (entry.isFile) {
		var file = await read_file_entry(entry);
		if (is_replay_file_name(file.name)) {
			results.push(create_playlist_entry(file, entry.fullPath ? entry.fullPath.replace(/^\/+/, '') : (file.webkitRelativePath || file.name)));
		}
		return;
	}
	if (!entry.isDirectory) return;
	var reader = entry.createReader();
	while (true) {
		var entries = await read_directory_entries(reader);
		if (!entries.length) break;
		for (var i = 0; i < entries.length; ++i) {
			await collect_replay_entries_from_entry(entries[i], results);
		}
	}
}

async function load_replay_drop(dataTransfer, canvas) {
	var results = [];
	if (dataTransfer && dataTransfer.items && dataTransfer.items.length) {
		for (var i = 0; i < dataTransfer.items.length; ++i) {
			var item = dataTransfer.items[i];
			if (!item) continue;
			var entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
			if (entry) {
				await collect_replay_entries_from_entry(entry, results);
			}
		}
	}
	if (!results.length) {
		results = normalize_replay_entries(dataTransfer && dataTransfer.files ? dataTransfer.files : []);
	}
	if (!results.length) return;
	set_replay_playlist(results, 0);
	load_replay_playlist_index(0, canvas);
}

function load_replay_file(files, canvas) {
	var entries = normalize_replay_entries(files);
	if (!entries.length) return;
	set_replay_playlist(entries, 0);
	load_replay_playlist_index(0, canvas);
}

function open_replay_picker() {
	var input = document.getElementById("select_rep_file");
	if (!input) return;
	input.value = '';
	input.click();
}

let currentSize = {
	width: 0,
	height: 0,
	zoomLevel: 0,
	renderWidth: 0,
	renderHeight: 0,
};
let exportRenderSize = null;
let canvasResizePending = true;
let canvasAreaResizeObserver = null;
const RESIZE_SURFACE_BUDGET_BYTES = 80 * 1024 * 1024;
const RESIZE_BYTES_PER_PIXEL_ESTIMATE = 12;

function invalidate_canvas_size_cache() {
	currentSize = {
		width: 0,
		height: 0,
		zoomLevel: 0,
		renderWidth: 0,
		renderHeight: 0,
	};
	canvasResizePending = true;
}

function set_export_render_size(width, height) {
	if (width > 0 && height > 0) {
		exportRenderSize = {
			width: width,
			height: height
		};
	} else {
		exportRenderSize = null;
	}
	canvasResizePending = true;
}

function clear_export_render_size() {
	exportRenderSize = null;
	canvasResizePending = true;
}

function current_scaled_render_size(renderWidth, renderHeight, zoom) {
	let zoomFactor = 1.0 * Math.pow(1.1, zoom);
	return {
		width: Math.ceil(renderWidth / zoomFactor),
		height: Math.ceil(renderHeight / zoomFactor)
	};
}

function can_allocate_render_surface(width, height) {
	if (!(width > 0 && height > 0)) return false;
	if (typeof _ui_can_resize === "function") {
		return !!_ui_can_resize(width, height);
	}
	return width * height <= Math.floor(RESIZE_SURFACE_BUDGET_BYTES / RESIZE_BYTES_PER_PIXEL_ESTIMATE);
}

function find_safe_zoom_level(renderWidth, renderHeight, requestedZoomLevel) {
	let safeZoomLevel = requestedZoomLevel;
	while (safeZoomLevel < 4) {
		let scaledSize = current_scaled_render_size(renderWidth, renderHeight, safeZoomLevel);
		if (can_allocate_render_surface(scaledSize.width, scaledSize.height)) {
			return safeZoomLevel;
		}
		safeZoomLevel += 1;
	}
	return 4;
}

function get_canvas_area_live_size() {
	const canvasArea = document.getElementById('canvas-area');
	if (!canvasArea) {
		return { width: 0, height: 0 };
	}
	const rect = canvasArea.getBoundingClientRect();
	return {
		width: Math.max(0, Math.round(rect.width)),
		height: Math.max(0, Math.round(rect.height))
	};
}

function schedule_canvas_resize(forceInvalidate) {
	if (forceInvalidate) {
		invalidate_canvas_size_cache();
	} else {
		canvasResizePending = true;
	}
}

function install_canvas_resize_watcher() {
	const canvasArea = document.getElementById('canvas-area');
	if (!canvasArea) return;
	if (canvasAreaResizeObserver) {
		canvasAreaResizeObserver.disconnect();
		canvasAreaResizeObserver = null;
	}
	if (typeof ResizeObserver === 'function') {
		canvasAreaResizeObserver = new ResizeObserver(function() {
			schedule_canvas_resize();
		});
		canvasAreaResizeObserver.observe(canvasArea);
	}
	window.addEventListener('resize', function() {
		schedule_canvas_resize(true);
	}, true);
	if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
		window.visualViewport.addEventListener('resize', function() {
			schedule_canvas_resize(true);
		}, true);
	}
}

function resize_canvas(canvas) {

	const canvasArea = document.getElementById('canvas-area');
	const liveSize = get_canvas_area_live_size();
	const renderWidth = exportRenderSize ? exportRenderSize.width : liveSize.width;
	const renderHeight = exportRenderSize ? exportRenderSize.height : liveSize.height;
	let effectiveZoomLevel = exportRenderSize ? zoomLevel : find_safe_zoom_level(renderWidth, renderHeight, zoomLevel);
	if (effectiveZoomLevel !== zoomLevel && !exportRenderSize) {
		zoomLevel = effectiveZoomLevel;
		localStorage.zoomLevel = '' + zoomLevel;
		if (typeof update_zoom_buttons === "function") update_zoom_buttons();
	}
	if (currentSize.width === liveSize.width && currentSize.height === liveSize.height && currentSize.zoomLevel === effectiveZoomLevel && currentSize.renderWidth === renderWidth && currentSize.renderHeight === renderHeight) {
		canvasResizePending = false;
		return true;
	}

	let zoomFactor = 1.0 * Math.pow(1.1, effectiveZoomLevel);
	let previousScaledSize = current_scaled_render_size(currentSize.renderWidth || liveSize.width, currentSize.renderHeight || liveSize.height, typeof currentSize.zoomLevel === 'number' ? currentSize.zoomLevel : effectiveZoomLevel);
	let currentCenter = null;
	if (typeof _ui_get_screen_pos === "function" && currentSize.renderWidth && currentSize.renderHeight) {
		currentCenter = {
			x: Math.round(_ui_get_screen_pos(0) + previousScaledSize.width / 2),
			y: Math.round(_ui_get_screen_pos(1) + previousScaledSize.height / 2)
		};
	}

	currentSize = {
		width: liveSize.width,
		height: liveSize.height,
		zoomLevel: effectiveZoomLevel,
		renderWidth: renderWidth,
		renderHeight: renderHeight,
	};

	let scaledWidth = Math.ceil(renderWidth / zoomFactor);
	let scaledHeight = Math.ceil(renderHeight / zoomFactor);
	if (!can_allocate_render_surface(scaledWidth, scaledHeight)) {
		if (exportRenderSize) {
			return false;
		}
		return false;
	}

    canvas.style.border = 0;
    canvas.parentElement.style.position = "relative";
    canvas.style.position = "absolute";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
	canvas.style.top = exportRenderSize ? "0" : "";
	canvas.style.left = exportRenderSize ? "0" : "";
	canvas.style.transform = exportRenderSize ? "none" : "";
	canvasArea.style.backgroundColor = exportRenderSize ? "#000000" : "";

	// Reset zoom scale before setting the canvas size, since otherwise emscripten/OpenBW will see the size difference and override it
	$('#canvas-zoom-outer').css({
		'position': exportRenderSize ? 'absolute' : 'relative',
		'width': exportRenderSize ? scaledWidth + 'px' : '100%',
		'height': exportRenderSize ? scaledHeight + 'px' : '100%',
		'left': exportRenderSize ? '50%' : '0',
		'top': exportRenderSize ? '50%' : '0',
		'transform': exportRenderSize ? 'translate(-50%, -50%) scale(1.0)' : 'scale(1.0)',
		'transform-origin': 'top left',
	});

	if (typeof _ui_set_minimap_reference_size === "function") {
		_ui_set_minimap_reference_size(Math.ceil(renderWidth), Math.ceil(renderHeight));
	}

	$('#canvas-zoom-inner').css({
		'width': scaledWidth,
		'height': scaledHeight,
	});

    _ui_resize(scaledWidth, scaledHeight);
	if (currentCenter && typeof _ui_set_screen_center === "function") {
		_ui_set_screen_center(currentCenter.x, currentCenter.y);
	}

	$('#canvas-zoom-outer').css({
		'transform': exportRenderSize ? 'translate(-50%, -50%) scale(' + zoomFactor + ')' : 'scale(' + zoomFactor + ')',
		'transform-origin': 'top left',
	});

	var ctx = document.getElementById("graphs_tab");
	ctx.style.width = "70%";
	ctx.style.height = "70%";
	if (viewportAlertState.hideAt) {
		position_viewport_alert();
	}
	canvasResizePending = false;
	return true;
}

function js_fatal_error(ptr) {
	
    var str = UTF8ToString(ptr);

    print_to_modal("Fatal error", str);
}

function print_to_canvas(text, posx, posy, canvas) {
	
	var context = canvas.getContext("2d");
	context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillText(text, posx, posy);
}

function apply_player_row_layout(playerCount) {
	if (playerCount > 2) {
		$('.infobar-container').addClass('multiplayer-labels-top');
		$('.2player').hide();
		$('.5player').show();
	} else {
		$('.infobar-container').removeClass('multiplayer-labels-top');
		$('.2player').show();
		$('.5player').hide();
	}
}

function set_modal_presentation(options) {
	options = options || {};
	var modal = $('#rv_modal');
	var overlay = modal.closest('.reveal-overlay');
	modal.removeClass('rv-modal-bottom');
	overlay.removeClass('rv-modal-overlay-clear');
	if (options.bottomViewport) {
		modal.addClass('rv-modal-bottom');
		overlay.addClass('rv-modal-overlay-clear');
	}
}

function print_to_modal(title, text, options) {
	set_modal_presentation(options);
	var showSpinner = title === "Loading files";
	$('#rv_modal h3').html((showSpinner ? '<span class="loading-spinner" aria-hidden="true"></span>' : '') + title);
	$('#rv_modal p').html(text);
	
	$('#rv_modal').foundation('open');
}

function close_modal() {
	set_modal_presentation();
	$('#rv_modal').foundation('close');
}

function has_all_files() {
	
    for (var i = 0; i != C_MPQ_FILENAMES.length; ++i) {
        if (!files[i]) return false;
    }
    return true;
}

function allocate_replay_buffer(arr) {
	if (!Module.HEAPU8) throw new Error("OpenBW heap is not initialized");
	var buf = _malloc(arr.length);
	Module.HEAPU8.set(arr, buf);
	return buf;
}

/*****************************
 * Callback functions
 *****************************/

function js_pre_main_loop() {
	if (canvasResizePending) {
		resize_canvas(Module.canvas);
	}
}

var last_update_frame = 0;
function js_post_main_loop() {
	if (pendingRequestedReplayFrame !== null && typeof _replay_get_value === "function") {
		_replay_set_value(3, Math.min(pendingRequestedReplayFrame, _replay_get_value(4)));
		pendingRequestedReplayFrame = null;
	}
	var frame = _replay_get_value(2);
	note_viewer_frame_progress(frame);
	sync_viewer_runtime_state();
	if (Math.abs(frame - last_update_frame) >= (_replay_get_value(1) === 1 ? 1 : Math.max(1, Math.min(8, 4 * _replay_get_value(0))))) {
	    update_info_bar(frame);
	    update_info_tab();
	    update_graphs(frame);
	    last_update_frame = frame;
	}
	if (embeddedReplayConfig.enabled && embeddedReplayState.currentGameKey && !embeddedReplayState.loadingReplay && !embeddedReplayState.advanceScheduled && !document.body.classList.contains('pregame-active')) {
		var endFrame = _replay_get_value(4);
		if (endFrame > 0 && frame >= endFrame) {
			schedule_embedded_advance_for_current_replay(1000);
		}
	}
}

function js_read_data(index, dst, offset, size) {
	
    var data = js_read_buffers[index];
    for (var i2 = 0; i2 != size; ++i2) {
        Module.HEAP8[dst + i2] = data[offset + i2];
    }
}

function js_file_size(index) {
	
    return files[index].size;
}

function js_load_done() {
	
    js_read_buffers = null;
    $('#pregame-overlay').hide();
    $('body').removeClass('pregame-active');
}

function position_viewport_alert() {
	var alert = document.getElementById('viewport-alert');
	var canvasArea = document.getElementById('canvas-area');
	var canvas = typeof Module !== "undefined" ? Module.canvas : null;
	if (!alert || !canvasArea || !canvas) {
		return;
	}
	var canvasRect = canvas.getBoundingClientRect();
	var areaRect = canvasArea.getBoundingClientRect();
	if (!canvasRect.width || !canvasRect.height || !areaRect.width || !areaRect.height) {
		return;
	}
	var centerX = canvasRect.left - areaRect.left + canvasRect.width / 2;
	var baselineY = canvasRect.top - areaRect.top + canvasRect.height - 24;
	alert.style.left = centerX + 'px';
	alert.style.top = baselineY + 'px';
}

function format_frame_time(frame) {
	var sec_num = frame * 42 / 1000;
	var hours = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = Math.floor(sec_num - (hours * 3600) - (minutes * 60));
	if (hours < 10) { hours = "0" + hours; }
	if (minutes < 10) { minutes = "0" + minutes; }
	if (seconds < 10) { seconds = "0" + seconds; }
	return hours > 0 ? (hours + ':' + minutes + ':' + seconds) : (minutes + ':' + seconds);
}

function show_viewport_alert(text, durationMs) {
	viewportAlertState.text = text;
	viewportAlertState.hideAt = Date.now() + durationMs;
	$('#viewport-alert').text(text).addClass('is-visible');
	position_viewport_alert();
}

function update_viewport_alert(state) {
	state = state || get_viewer_runtime_state();
	var alert = $('#viewport-alert');
	if (!state.hasReplay) {
		viewportAlertState.lastNuclearLaunchAlertCount = 0;
		viewportAlertState.pendingNuclearLaunch = false;
		viewportAlertState.text = '';
		viewportAlertState.hideAt = 0;
		alert.removeClass('is-visible').text('');
		return;
	}
	if (typeof Module !== "undefined" && typeof Module.get_nuclear_launch_alert_count === "function") {
		var nuclearLaunchAlertCount = Module.get_nuclear_launch_alert_count();
		if (nuclearLaunchAlertCount > viewportAlertState.lastNuclearLaunchAlertCount) {
			viewportAlertState.pendingNuclearLaunch = true;
		}
		viewportAlertState.lastNuclearLaunchAlertCount = nuclearLaunchAlertCount;
	}
	if (state.isCatchingUp) {
		var fastForwardText = 'Fast-forwarding to ' + format_frame_time(state.targetFrame);
		alert.text(fastForwardText).addClass('is-visible');
		position_viewport_alert();
		return;
	}
	if (viewportAlertState.pendingNuclearLaunch) {
		viewportAlertState.pendingNuclearLaunch = false;
		show_viewport_alert('Nuclear launch detected.', 4500);
	}
	if (viewportAlertState.hideAt && Date.now() >= viewportAlertState.hideAt) {
		viewportAlertState.hideAt = 0;
		viewportAlertState.text = '';
		alert.removeClass('is-visible').text('');
	} else if (viewportAlertState.hideAt) {
		position_viewport_alert();
	} else if (alert.hasClass('is-visible')) {
		alert.removeClass('is-visible').text('');
	}
}

/*****************************
 * Database Functions
 *****************************/

function set_db_handle(success_callback) {

	if (window.indexedDB) {
		
		var request = window.indexedDB.open("OpenBW_DB", 1);
		
		request.onerror = function(event) {
			
		  console.log("Could not open OpenBW_DB.");
		  fetch_default_mpqs();
		};
		
		request.onsuccess = success_callback;
		
		request.onupgradeneeded = function(event) {
			
			db_handle = event.target.result;
			var objectStore = db_handle.createObjectStore("mpqs", { keyPath: "mpqkp" });
			console.log("Database update/create done.");
		};
	} else {
		console.log("indexedDB not supported.");
		fetch_default_mpqs();
	}
}

function get_blob(store, key, file_index, callback) {
	
	var request = store.get(key);
	request.onerror = function(event) {
	
	  console.log("Could not retrieve " + key + " from DB.");
	  callback(file_index, false);
	};
	request.onsuccess = function(event) {
		if (!request.result || !request.result.blob) {
			callback(file_index, false);
			return;
		}

		files[file_index] = request.result.blob;
		console.log("read " + request.result.mpqkp + "; size: " + request.result.blob.length + ": success.");
		update_mpq_loading_status(key + ": cached.");
		callback(file_index, true);
	};
}

function store_blob(store, key, file) {
	
	console.log("Attempting to store " + key);
	var obj = {mpqkp: key};
	obj.blob = file;
	
	var request = store.add(obj);
	request.onerror = function(event) {
		console.log("Could not store " + key + " to DB.");
	};
	request.onsuccess = function (evt) {
		console.log("Storing " + key + ": successful.");
	};
	
}

function store_mpq_in_db() {
	
	if (db_handle != null) {
		var transaction = db_handle.transaction(["mpqs"], "readwrite");
		var store = transaction.objectStore("mpqs");
		
		for(var file_index = 0; file_index < 3; file_index++) {
			
			store.delete(C_MPQ_FILENAMES[file_index]);
			store_blob(store, C_MPQ_FILENAMES[file_index], files[file_index]);
		}
	} else {
		console.log("Cannot store MPQs because DB handle is not available.");
	}
}

function load_mpq_from_db() {

	var transaction = db_handle.transaction(["mpqs"]);
	var objectStore = transaction.objectStore("mpqs");
	console.log("attempting to retrieve files from db...");
	mpq_status_lines = ["Checking cached files..."];
	show_loading_files_screen(mpq_status_lines[0]);
	
	var completed = 0;
	var callback = function(index, ok) {
		++completed;
		if (completed !== C_MPQ_FILENAMES.length) return;

		if (has_all_files()) {
			console.log("all files read.");
			reset_loading_files_screen();
			parse_mpq_files();
		} else {
			fetch_default_mpqs();
		}
	}

	for(var file_index = 0; file_index < 3; file_index++) {
		
		get_blob(objectStore, C_MPQ_FILENAMES[file_index], file_index, callback);
	}
}

function fetch_default_mpqs() {
	if (is_fetching_default_mpqs || has_all_files()) return;
	is_fetching_default_mpqs = true;
	if (mpq_retry_timer) {
		clearTimeout(mpq_retry_timer);
		mpq_retry_timer = null;
	}
	mpq_retry_attempt += 1;
	mpq_status_lines = ["Downloading bundled files...", "Attempt " + mpq_retry_attempt + "."];
	show_loading_files_screen(mpq_status_lines.join('<br>'));

	var loaded = 0;
	var failed = false;

	var on_complete = function() {
		loaded += 1;
		if (loaded !== C_MPQ_FILENAMES.length) return;

		is_fetching_default_mpqs = false;
		if (failed || !has_all_files()) {
			schedule_mpq_retry();
			return;
		}

		store_mpq_in_db();
		parse_mpq_files();
		$('#select_replay_label').removeClass('disabled');
		reset_loading_files_screen();
	};

	for (var i = 0; i < C_MPQ_FILENAMES.length; ++i) {
		(function(index) {
			var req = new XMLHttpRequest();
			req.onreadystatechange = function() {
				if (req.readyState !== XMLHttpRequest.DONE) return;

				if (req.status === 200) {
					files[index] = new File([req.response], C_MPQ_FILENAMES[index]);
					update_mpq_loading_status(C_MPQ_FILENAMES[index] + ": success.");
				} else {
					failed = true;
					console.log("Failed to fetch bundled MPQ " + C_DEFAULT_MPQ_SOURCES[index] + ": " + req.status);
					update_mpq_loading_status(C_MPQ_FILENAMES[index] + ": failed (" + req.status + ").");
				}
				on_complete();
			};
			req.onerror = function() {
				failed = true;
				update_mpq_loading_status(C_MPQ_FILENAMES[index] + ": failed (network error).");
				on_complete();
			};
			req.responseType = "arraybuffer";
			req.open("GET", C_DEFAULT_MPQ_SOURCES[index], true);
			req.send();
		})(i);
	}
}

/*****************************
 * Other
 *****************************/

function load_replay_url(url) {
	resume_viewer_main_loop();
	currentReplaySourceUrl = url;
	show_loading_replay_screen(url);
    
    var req = new XMLHttpRequest();
	    req.onreadystatechange = function() {
	    	
	        if (req.readyState == XMLHttpRequest.DONE && req.status == 200) {
	        	
		        var arr = new Int8Array(req.response);
		        var buf = allocate_replay_buffer(arr);
		        start_replay(buf, arr.length);
		        _free(buf);
	        } else if (req.readyState == XMLHttpRequest.DONE) {
	        	if (embeddedReplayConfig.enabled) {
	        		abort_embedded_replay_load();
	        	}
	        	set_pregame_dropzone_status("Loading replay", "fetching " + url + ": " + req.statusText);
	        }
	    }
    req.responseType = "arraybuffer";
    req.open("GET", url, true);
    req.send();
}

var first_frame_played = false;

function start_replay(buffer, length) {
	resume_viewer_main_loop();
	reveal_pregame_homepage();
	
	$('#top').css('display', 'none');
	$('#pregame-overlay').css('display', 'none');
	$('body').removeClass('pregame-active');
	if (embeddedReplayState.retryTimer) {
		clearTimeout(embeddedReplayState.retryTimer);
		embeddedReplayState.retryTimer = null;
	}
	if (embeddedReplayConfig.enabled) finish_embedded_replay_load();
	else clear_embedded_advance_timer();
	reset_pregame_dropzone();
	reset_playback_state_monitor();
	$('#zoom-buttons').css('display', 'grid');
	$('#viewport-export').css('display', 'grid');
	$('#rv-rc-next-embedded-wrap').css('display', embeddedReplayConfig.enabled ? 'flex' : 'none');
	$('.widget_replay_viewer_widget').css({
		'position': 'absolute',
		'width': '100%',
		'height': '100%',
	})

    close_modal();
    
	let zoom = zoomLevel;
	zoomLevel = 0;
	resize_canvas(Module.canvas);
	update_replay_playlist_controls();

	// For some reason the zoom level can't be correctly on the first resize, so schedule another one if we need to zoom
	if (zoom !== 0) {
		setTimeout(function() {
			zoomLevel = zoom;
			resize_canvas(Module.canvas);
		}, 0);
	}

    Module.print("calling main");
	    if (!main_has_been_called) {
	    	Module.callMain();
	    	main_has_been_called = true;
			if (typeof apply_audio_settings_to_runtime === "function") {
				apply_audio_settings_to_runtime();
			} else {
				Module.set_volume(volumeSettings.muted ? 0 : volumeSettings.level);
			}
	    }
		if (typeof update_observer_button === "function") {
			update_observer_button();
		}
		if (typeof update_fow_button === "function") {
			update_fow_button();
		}
		if (typeof update_force_red_blue_button === "function") {
			update_force_red_blue_button();
		}
		if (typeof update_player_vision_buttons === "function") {
			update_player_vision_buttons();
		}
	    
	    _load_replay(buffer, length);
		pendingRequestedReplayFrame = requestedReplayFrame !== null && currentReplaySourceUrl
			? requestedReplayFrame
			: null;
    
    first_frame_played = false;
    
    players = [];
    for (var i = 0; i != 12; ++i) {
    	if (_player_get_value(i, C_PLAYER_ACTIVE)) {
	    	players.push(i);
	    	$('.per-player-info' + players.length).show();
    	}
    }
    for (var i = players.length + 1; i <= 12; i++) {
    	$('.per-player-info' + i).hide();
    }
	apply_player_row_layout(players.length);
	if (typeof update_player_vision_buttons === "function") {
		update_player_vision_buttons();
	}
	viewerRuntimeUiStateCache = null;
	viewerRuntimeUiLastSyncAt = 0;
	sync_viewer_runtime_state(true);
	if (typeof apply_persisted_viewer_toggle_settings === "function") {
		apply_persisted_viewer_toggle_settings();
		if (typeof update_player_vision_buttons === "function") {
			update_player_vision_buttons();
		}
	}
	if (typeof Module !== "undefined" && typeof Module.set_primary_perspective_player === "function") {
		Module.set_primary_perspective_player(players.length ? players[0] : -1);
	}
	initialize_music_for_current_replay();
}

function on_read_all_done() {
	
	// if a replay is specified, then run it. else do nothing
    
    if (load_replay_data_arr) {
        var arr = load_replay_data_arr;
        load_replay_data_arr = null;
        var buf = allocate_replay_buffer(arr);
        start_replay(buf, arr.length);
        _free(buf);
    } else {
        replayPlaylist = [];
        replayPlaylistIndex = -1;
        update_replay_playlist_controls();
        var inputs = {}
        var optstr = document.location.search.substr(1);
        if (optstr) {
                var s = optstr.split("&");
                for (var i = 0; i != s.length; ++i) {
                        var str = s[i];
                        var t = str.split("=");
                        if (t[0] && t[1]) {
                                inputs[decodeURIComponent(t[0])] = decodeURIComponent(t[1]);
                        }
                }
        }
        if (inputs.url) {
        	load_replay_url(inputs.url);
        } else if (ajax_object.replay_file != null) {
        	load_replay_url(ajax_object.replay_file);
        } else if (embeddedReplayConfig.enabled) {
        	load_next_embedded_replay();
        } else {
        	reveal_pregame_homepage();
        	// $('#play_demo_button').removeClass('disabled');
        	$('#select_replay_label').removeClass('disabled');
        }
    }
}


function parse_mpq_files() {
    
    if (is_reading) return;
    is_reading = true;
    mpq_data_ready = false;
    var reads_in_progress = 3;
    for (var i = 0; i != 3; ++i) {
        var reader = new FileReader();
        (function() {
            var index = i;
            reader.onloadend = function(e) {
                if (!e.target.error && e.target.readyState != FileReader.DONE) throw "read failed with no error!?";
                if (e.target.error) throw "read failed: " + e.target.error;
                js_read_buffers[index] = new Int8Array(e.target.result);
                --reads_in_progress;

                if (reads_in_progress == 0) {
                	mpq_data_ready = true;
                	is_reading = false;
                	on_read_all_done();
                }
            };
        })();
        reader.readAsArrayBuffer(files[i]);
    }
}
