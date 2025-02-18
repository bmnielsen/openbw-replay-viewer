$(document).foundation();

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
var C_SPECIFY_MPQS_MESSAGE = "Please select StarDat.mpq, BrooDat.mpq and patch_rt.mpq from your StarCraft directory.";

/*****************************
 * Globals
 *****************************/
var Module = {
    preRun: [],
    postRun: [],
    canvas: null,
    setWindowTitle: function() {},
	print: console.log,
	printErr: console.error,
	//filePackagePrefixURL: "../bw/"
};

var db_handle;
var main_has_been_called = false;
var load_replay_data_arr = null;

var files = [];
var js_read_buffers = [];
var is_reading = false;

var players = [];

/*****************************
 * Functions
 *****************************/

/**
 * Sets the drop box area depending on whether a replay URL is provided or not.
 * Adds the drag and drop functionality.
 */
jQuery(document).ready( function($) {
	
	Module.canvas = document.getElementById("canvas");
	var canvas = Module.canvas;
	
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
	
	add_drag_and_drop_listeners(document.body, canvas);
	document.getElementById("mpq_files").addEventListener("change", on_mpq_specify_select, false);
	document.getElementById("select_rep_file").addEventListener("change", on_rep_file_select, false);
	
	
	// $('#play_demo_button').on('click', function(e){
		
	// 	if (has_all_files()) {
	// 		load_replay_url("/bw/flash_vs_jaedong.rep");
	// 	}
	// });
	
	$('#specify_mpqs_button').on('click', function(e){
		
		print_to_modal("Specify MPQ files", C_SPECIFY_MPQS_MESSAGE, true);
	});
})

/**
 * Sets up the initial canvas look.
 */
function initialize_canvas(canvas) {
	
	canvas.height = '300';
	canvas.style.height = '300px';
	canvas.width = '400';
	canvas.style.width = '400px';
	canvas.style.position = 'relative';
	canvas.style.top = 'calc(40% - 120px)';
	
	if (ajax_object.replay_file == null) {
		
		var context = canvas.getContext("2d");
		context.fillStyle = "black";
		context.font = "24px Arial";
		context.textAlign = "center";
		context.fillText("Drop a replay file", 200, 130);
		context.fillText("anywhere on the page", 200, 160);
	// } else {
		
	// 	resize_canvas(canvas);
	// 	print_to_modal("Loading...", ajax_object.replay_file.substring(27));
	}
}

var resource_count = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

function update_graphs(frame) {
	
	if ($('#graphs_tab').is(":visible")) {
		if ($('#graphs_tab_panel1').hasClass("is-active")) {
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

	if ($('#info_tab').is(":visible")) {
		 
		var funcs = Module.get_util_funcs();
		
		if ($('#info_tab_panel1').hasClass("is-active")) {
			update_production_tab(funcs.get_all_incomplete_units());
		} else if ($('#info_tab_panel2').hasClass("is-active")) {
			update_army_tab(funcs.get_all_completed_units());
		} else if ($('#info_tab_panel3').hasClass("is-active")) {
			
			var upgrades = [];
			for (var i = 0; i < players.length; i++) {
				upgrades.push([players[i], funcs.get_completed_upgrades(players[i]), funcs.get_incomplete_upgrades(players[i])]);
			}
			update_upgrades_tab(upgrades);
		} else if ($('#info_tab_panel4').hasClass("is-active")) {
			
			var researches = [];
			for (var i = 0; i < players.length; i++) {
				researches.push([players[i], funcs.get_completed_research(players[i]), funcs.get_incomplete_research(players[i])]);
			}
			update_research_tab(researches);
		}
	}
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
	        set_map_name(Pointer_stringify(_replay_get_value(5)));
	        set_nick(		i + 1, Pointer_stringify(_player_get_value(players[i], C_NICK)));
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
}

/*****************************
 * Listener functions
 *****************************/

function on_rep_file_select(e) {
	
	var input_files = e.target.files;
	load_replay_file(input_files, Module.canvas);
}

function on_mpq_specify_select(e) {
	
    var input_files = e.target.files;
    
    var unrecognized_files = 0;
    for (var i = 0; i != input_files.length; ++i) {
    	
        var index = index_by_name(input_files[i].name);
        if (index != -1) {
            files[index] = input_files[i];
        } else {
        	++unrecognized_files;
        }
    }
    
    var status = "";
    if (has_all_files()) {
        status = "Loading, please wait...";
    } else if (unrecognized_files != 0) {
        status = C_SPECIFY_MPQS_MESSAGE + "<br/>Unrecognized files selected";
    } else {
    	status = C_SPECIFY_MPQS_MESSAGE;
    }

    var ul = document.getElementById("list");
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    for (var i = 0; i != C_MPQ_FILENAMES.length; ++i) {
        if (files[i]) {
            var li = document.createElement("li");
            li.appendChild(document.createTextNode(C_MPQ_FILENAMES[i] + " OK"));
            ul.appendChild(li);
        }
    }
    
    print_to_modal("Specify MPQ files", status, true);
    
    if (has_all_files()) {
    	
    	parse_mpq_files();
    	store_mpq_in_db();
    	
    	// $('#play_demo_button').removeClass('disabled');
    	$('#select_replay_label').removeClass('disabled');
    	close_modal();
    }
}

function add_drag_and_drop_listeners(element, canvas) {

	element.addEventListener("dragover", function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	    e.dataTransfer.dropEffect = "move";
	}, false);

	element.addEventListener("drop", function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	    var files = e.dataTransfer.files;
	    load_replay_file(files, canvas);
	}, false);
}

/*****************************
 * Helper functions
 *****************************/
function load_replay_file(files, canvas) {
	if (files.length != 1) return;
    Module.print("loading replay from file " + files[0].name);
    var reader = new FileReader();
        (function() {
            reader.onloadend = function(e) {
                if (!e.target.error && e.target.readyState != FileReader.DONE) throw "read failed with no error!?";
                if (e.target.error) throw "read failed: " + e.target.error;
                var arr = new Int8Array(e.target.result);
                if (main_has_been_called) {
                    var buf = allocate(arr, 'i8', ALLOC_NORMAL);
                    start_replay(buf, arr.length);
                    _free(buf);
                } else {
                    load_replay_data_arr = arr;
                    print_to_canvas(files[0].name, 15, 80, canvas);
                    if (has_all_files()) {
                    	on_read_all_done();
                    }
                }
            };
        })();
        reader.readAsArrayBuffer(files[0]);
}

let currentSize = {
	width: 0,
	height: 0,
	zoomLevel: 0,
};

function resize_canvas(canvas) {

	const canvasArea = document.getElementById('canvas-area');
	const unscaledSize = canvasArea.getBoundingClientRect();
	if (currentSize.width === unscaledSize.width && currentSize.height === unscaledSize.height && currentSize.zoomLevel === zoomLevel) {
		return;
	}

	let zoomFactor = 1.0 * Math.pow(1.1, zoomLevel);

	currentSize = {
		width: unscaledSize.width,
		height: unscaledSize.height,
	};

    canvas.style.border = 0;
    canvas.parentElement.style.position = "relative";
    canvas.style.position = "absolute";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
	canvas.style.top = "";

	// Reset zoom scale before setting the canvas size, since otherwise emscripten/OpenBW will see the size difference and override it
	$('#canvas-zoom-outer').css({
		'transform': 'scale(1.0)',
		'transform-origin': 'top left',
	});

	let scaledWidth = Math.ceil(unscaledSize.width / zoomFactor);
	let scaledHeight = Math.ceil(unscaledSize.height / zoomFactor);

	$('#canvas-zoom-inner').css({
		'width': scaledWidth,
		'height': scaledHeight,
	});

    _ui_resize(scaledWidth, scaledHeight);

	$('#canvas-zoom-outer').css({
		'transform': 'scale(' + zoomFactor + ')',
		'transform-origin': 'top left',
	});

	var ctx = document.getElementById("graphs_tab");
	ctx.style.width = "70%";
	ctx.style.height = "70%";
}

function js_fatal_error(ptr) {
	
    var str = Pointer_stringify(ptr);

    print_to_modal("Fatal error: Unimplemented", "Please file a bug report.<br/>" +
    		"Only 1v1 replays currently work. Protoss is not supported yet<br/>" +
    		"fatal error: " + str);
}

function print_to_canvas(text, posx, posy, canvas) {
	
	var context = canvas.getContext("2d");
	context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillText(text, posx, posy);
}

function print_to_modal(title, text, mpqspecify) {
	
	$('#rv_modal h3').html(title);
	$('#rv_modal p').html(text);
	if (mpqspecify) {
		$('#mpq_specify').css('display', 'inline-block');
	} else {
		$('#mpq_specify').css('display', 'none');
	}
	
	$('#rv_modal').foundation('open');
}

function close_modal() {
	
	$('#rv_modal').foundation('close');
}

function index_by_name(name) {
	
    for (var i = 0; i != C_MPQ_FILENAMES.length; ++i) {
        if (C_MPQ_FILENAMES[i].toLowerCase() == name.toLowerCase()) {
        	return i;
        }
    }
    return -1;
}

function has_all_files() {
	
    for (var i = 0; i != C_MPQ_FILENAMES.length; ++i) {
        if (!files[i]) return false;
    }
    return true;
}

/*****************************
 * Callback functions
 *****************************/

function js_pre_main_loop() {
	
	resize_canvas(Module.canvas);
}

var last_update_frame = 0;
function js_post_main_loop() {
	var frame = _replay_get_value(2);
	if (Math.abs(frame - last_update_frame) >= (_replay_get_value(1) === 1 ? 1 : Math.max(1, Math.min(8, 4 * _replay_get_value(0))))) {
	    update_info_bar(frame);
	    update_info_tab();
	    update_graphs(frame);
	    last_update_frame = frame;
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
}

/*****************************
 * Database Functions
 *****************************/

function set_db_handle(success_callback) {

	if (window.indexedDB) {
		
		var request = window.indexedDB.open("OpenBW_DB", 1);
		
		request.onerror = function(event) {
			
		  console.log("Could not open OpenBW_DB.");
		  print_to_modal("Specify MPQ files", C_SPECIFY_MPQS_MESSAGE, true);
		};
		
		request.onsuccess = success_callback;
		
		request.onupgradeneeded = function(event) {
			
			db_handle = event.target.result;
			var objectStore = db_handle.createObjectStore("mpqs", { keyPath: "mpqkp" });
			console.log("Database update/create done.");
		};
	} else {
		console.log("indexedDB not supported.");
	}
}

function get_blob(store, key, file_index, callback) {
	
	var request = store.get(key);
	request.onerror = function(event) {
	
	  console.log("Could not retrieve " + key + " from DB.");
	  print_to_modal("Loading MPQs", key + ": failed.");
	};
	request.onsuccess = function(event) {
	  
		files[file_index] = request.result.blob;
		console.log("read " + request.result.mpqkp + "; size: " + request.result.blob.length + ": success.");
		print_to_modal("Loading MPQs", key + ": success.");
		callback(file_index);
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
	
	var callback = function(index) {
		
		if (index == 2) {
			if (has_all_files()) {
				console.log("all files read.");
				close_modal();
				parse_mpq_files();
			} else {
				print_to_modal("Specify MPQ files", C_SPECIFY_MPQS_MESSAGE, true);
			}
		}
	}

	for(var file_index = 0; file_index < 3; file_index++) {
		
		get_blob(objectStore, C_MPQ_FILENAMES[file_index], file_index, callback);
	}
}

/*****************************
 * Other
 *****************************/

function load_replay_url(url) {
	
    print_to_modal("Status", "Downloading " + url + "...");
    
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
    	
        if (req.readyState == XMLHttpRequest.DONE && req.status == 200) {
        	
	        var arr = new Int8Array(req.response);
	        var buf = allocate(arr, 'i8', ALLOC_NORMAL);
	        start_replay(buf, arr.length);
	        _free(buf);
        } else {
        	print_to_modal("Status", "fetching " + url + ": " + req.statusText);
        }
    }
    req.responseType = "arraybuffer";
    req.open("GET", url, true);
    req.send();
}

var first_frame_played = false;

function start_replay(buffer, length) {
	
	$('#top').css('display', 'none');
	$('#zoom-buttons').css('display', 'flex');
	$('.widget_replay_viewer_widget').css({
		'position': 'absolute',
		'width': '100%',
		'height': '100%',
	})

    close_modal();
    
	let zoom = zoomLevel;
	zoomLevel = 0;
	resize_canvas(Module.canvas);

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
		Module.set_volume(volumeSettings.muted ? 0 : volumeSettings.level);
    }
    
    _load_replay(buffer, length);
    
    first_frame_played = false;
    
    players = [];
    for (var i = 0; i != 12; ++i) {
    	
        if (_player_get_value(i, C_PLAYER_ACTIVE)) {
        
	        var race 				= _player_get_value(i, C_RACE)
	        var used_supply 		= _player_get_value(i, C_USED_ZERG_SUPPLY + race);
	        var available_supply 	= _player_get_value(i, C_AVAILABLE_ZERG_SUPPLY + race);
	        
	        if (used_supply == 4 && available_supply > 0) {
	        	console.log(used_supply + " / " + available_supply)
	        	players.push(i);
	        	$('.per-player-info' + players.length).show();
	        }
        }
    }
    for (var i = players.length + 1; i <= 12; i++) {
    	$('.per-player-info' + i).hide();
    }
    if (players.length > 4) {
    	$('.2player').hide();
    	$('.5player').show();
    	$('.infobar-player div').css("padding", "0px 5px 0px 5px");
    } else {
    	$('.2player').show();
    	$('.5player').hide();
    	$('.infobar-player div').css("padding", "5px 5px 5px 5px");
    }
}

function on_read_all_done() {
	
	// if a replay is specified, then run it. else do nothing
    
    if (load_replay_data_arr) {
        var arr = load_replay_data_arr;
        load_replay_data_arr = null;
        var buf = allocate(arr, 'i8', ALLOC_NORMAL);
        start_replay(buf, arr.length);
        _free(buf);
    } else {
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
        } else {
        	// $('#play_demo_button').removeClass('disabled');
        	$('#select_replay_label').removeClass('disabled');
        }
    }
}


function parse_mpq_files() {
    
    if (is_reading) return;
    is_reading = true;
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

                if (reads_in_progress == 0) on_read_all_done();
            };
        })();
        reader.readAsArrayBuffer(files[i]);
    }
}
