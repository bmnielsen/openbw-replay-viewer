const fps = (1000 / 42);
let volumeSettings = JSON.parse(localStorage.volumeSettings || '{"level":0.5,"muted":false}');
let zoomLevel = parseInt(localStorage.zoomLevel || '0');

jQuery(document).ready( function($) {	
	
	var ctx = document.getElementById("infoChartCanvas");
	infoChart = new Chart(ctx, {
	    type: 'line',
	    animation: {duration: 0},
	    data: {
	        labels: [0],
	        datasets: [{
	            label: 'minerals 1',
	            data: [50],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#54b9b1'
	        }, {
	            label: 'gas 1',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#6ed279'
	        }, {
	            label: 'workers 1',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#e6fb73',
	            hidden: true
	        }, {
	            label: 'army size 1',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderWidth: 1,
	            borderColor: '#b07042',
	            hidden: true
	        }, {
	            label: 'minerals 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#54b9b1'
	        }, {
	            label: 'gas 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#6ed279'
	        }, {
	            label: 'workers 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#e6fb73',
	            hidden: true
	        }, {
	            label: 'army size 2',
	            data: [0],
	            pointRadius: 0,
	            lineTension: 0,
	            borderDash: [2, 2],
	            borderWidth: 1,
	            borderColor: '#b07042',
	            hidden: true
	        }
	        ]
	    },
	    options: {
	    	legend: {
	            display: true,
	            labels: {
	                fontColor: 'rgb(255, 255, 255)'
	            }
	        },
	        scales: {
	        	xAxes: [{
	                ticks: {
	                    display: false
	                }
	            }],
	            yAxes: [{
	                ticks: {
	                    fontColor: 'rgb(255, 255, 255)'
	                }
	            }]

	        }
	    }
	});

	// Ensure keyboard events on input elements are not swallowed by OpenBW
	$("input, textarea, select").on("keyup keydown keypress", function(e) {
		// Pressing enter should trigger submission if a submit button is attached
		if (e.type === 'keyup' && (e.keyCode || e.which) === 13) {
			let submitButtonId = $(e.target).data('submit-button');
			if (submitButtonId) {
				$('#' + submitButtonId).trigger('click');
			}
		}
		
		e.stopPropagation();
		return true;
	});
	
	$(document).keyup(function(e) {
		var code = e.keyCode || e.which;

		// Commands that work before and during a replay
		switch(code) {
			case 83:
				toggle_sound();
				return false;
			case 72: // h
				$('#quick_help').foundation($('#quick_help').is(':visible') ? 'close' : 'open');
				return false;
			case 78: // n
				$('.rv-rc-progress-bar>div').toggle();
				return false;
		}

		if (!main_has_been_called) return true;
			
		// Commands that only work during a replay
		switch(code) {
			case 32: // space
			case 80: // p
				toggle_pause();
				return false;
			case 65: // a
			case 85: // u
				play_faster();
				return false;
			case 90: // z
			case 68: // d
				play_slower();
				return false;
			case 81: // q
				ensure_paused();
				jump_frames(-10);
				return false;
			case 87: // w
				ensure_paused();
				jump_frames(-1);
				return false;
			case 69: // e
				ensure_paused();
				jump_frames(1);
				return false;
			case 82: // r
				ensure_paused();
				jump_frames(10);
				return false;
			case 88: // x
				jump_seconds(-30);
				return false;
			case 8: // backspace
			case 67: // c
				jump_seconds(-10);
				return false;
			case 86: // v
				jump_seconds(10);
				return false;
			case 66: // b
				jump_seconds(30);
				return false;
			case 71: // g
				if ($('#goto').is(':visible')) {
					$('#goto').foundation('close');
				} else {
					open_goto_modal();
				}
				return false;
			case 84: // t
				zoomOut();
				return false;
			case 89: // y
				zoomIn();
				return false;
			case 49: // 1
				toggle_info_tab(1);
				return false;
			case 50: // 2
				toggle_info_tab(2);
				return false;
			case 51: // 3
				toggle_info_tab(3);
				return false;
			case 52: // 4
				toggle_info_tab(4);
				return false;
			case 53: // 5
				toggle_graphs(1);
				return false;
		}			
		return true;
	});
	
	$('#game-slider-handle').mousedown(function(){
	    isDown = true;
	});
	$('#game-slider').click(function(){
	    isClicked = true;
	});

	$(document).mouseup(function(){
	    if(isDown){
	        isDown = false;
        	//set_replay_location(_replay_get_value(3));
	    }
	}); 
	
	$(window).on('resize', function(){
		document.getElementById("canvas").innerWidth = window.innerWidth;
		document.getElementById("canvas").innerHeight = window.innerHeight - 147;
	});

	$('#zoom-in').on('click', function() {
		zoomIn();
	})
	
	$('#zoom-out').on('click', function() {
		zoomOut();
	})
	
	$('#game-slider').on('moved.zf.slider', function() {
		if (isDown || isClicked) {
			var new_val = document.getElementById("sliderOutput").value / 200;
			_replay_set_value(6, new_val);
			isClicked = false;
		}
	});
	
	$('#rv-rc-play').on('click', function() {
		
		toggle_pause();
	});
	
	$('#rv-rc-sound').on('click', function() {
		
		toggle_sound();
	});
	
	$('#rv-rc-faster').on('click', function() {
		
		play_faster();
	});
	
	$('#rv-rc-slower').on('click', function() {
		
		play_slower();
	});
	
	$('#rv-rc-sound').mouseenter(function() {
		$('#volume-slider-wrapper').css("display", "block");
	});
	$('.volume').mouseleave(function() {
	    $('#volume-slider-wrapper').css("display", "none");
	});

	let volumeInitialized = false;
	$('#volume-slider').on('moved.zf.slider', function() {
		if (!volumeInitialized) return;

		volumeSettings.level = document.getElementById("volumeOutput").value / 100;
		volumeSettings.muted = (volumeSettings.level == 0);
		localStorage.volumeSettings = JSON.stringify(volumeSettings);

		if (volumeSettings.muted) {
			$('#rv-rc-sound').removeClass('rv-rc-sound');
			$('#rv-rc-sound').addClass('rv-rc-muted');
		} else {
			$('#rv-rc-sound').addClass('rv-rc-sound');
			$('#rv-rc-sound').removeClass('rv-rc-muted');
		}
		if (main_has_been_called) {
			Module.set_volume(volumeSettings.level);
		}
	});

	// Perform initial volume setup
	// We do this with a setTimeout because the Foundation slider seems to be borked - it doesn't correctly set the handle position and
	// resets it if we do this too early
	$('#volumeOutput').val(volumeSettings.level * 100).trigger('change');
	setTimeout(() => {
		$('#volume-slider-handle').css('top', '' + (88.8 * volumeSettings.level) + '%');
		if (volumeSettings.muted) {
			$('#rv-rc-sound').removeClass('rv-rc-sound');
			$('#rv-rc-sound').addClass('rv-rc-muted');
		} else {
			$('#rv-rc-sound').addClass('rv-rc-sound');
			$('#rv-rc-sound').removeClass('rv-rc-muted');
		}

		// Also pass to the BW engine if it's already been started (might happen when deep linking)
		if (main_has_been_called) {
			Module.set_volume(volumeSettings.muted ? 0 : volumeSettings.level);
		}
		volumeInitialized = true;
	}, 1000);
	
	function drag_start(event) {
	    var style = window.getComputedStyle(event.target, null);
	    event.dataTransfer.setData("text/plain", event.target.id + ',' +
	    (parseInt(style.getPropertyValue("left"),10) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top"),10) - event.clientY));
	} 
	
	function drop(event) {
	    var parameters = event.dataTransfer.getData("text/plain").split(',');
	    var dm = document.getElementById(parameters[0]);
	    dm.style.left = (event.clientX + parseInt(parameters[1],10)) + 'px';
	    dm.style.top = (event.clientY + parseInt(parameters[2],10)) + 'px';
	    event.preventDefault();
	    return false;
	}
	
	document.getElementById('info_tab').addEventListener('dragstart',drag_start,false);
	document.getElementById('graphs_tab').addEventListener('dragstart',drag_start,false);
	document.getElementById("canvas").addEventListener('drop', drop, false);
	update_army_tab([]);
	$('#volume-slider-wrapper').css("display", "none");
})	

function zoomOut() {
	if (zoomLevel >= -8) {
		zoomLevel--;
		localStorage.zoomLevel = '' + zoomLevel;
		resize_canvas(Module.canvas);
	}
}

function zoomIn() {
	zoomLevel++;
	localStorage.zoomLevel = '' + zoomLevel;
	resize_canvas(Module.canvas);
}

var infoChart;

function toggle_graphs(tab_nr) {
	
	 if ($('#graphs_tab').is(":visible")) {
		 
		 if ($('#graphs_tab_panel' + tab_nr).hasClass("is-active")) {
			 $('#graphs_tab').toggle();
		 } else {
			 $('#graphs_link' + tab_nr).click();
		 }
		 
	 } else {
		 $('#graphs_tab').toggle();
		 $('#graphs_link' + tab_nr).click();
	 }
}

function toggle_info_tab(tab_nr) {
	
	 if ($('#info_tab').is(":visible")) {
		 
		 if ($('#info_tab_panel' + tab_nr).hasClass("is-active")) {
			 $('#info_tab').toggle();
		 } else {
			 $('#tab_link' + tab_nr).click();
		 }
		 
	 } else {
		 $('#info_tab').toggle();
		 $('#tab_link' + tab_nr).click();
	 }
	 if (main_has_been_called) {
		 update_info_tab();
	 }
}

function jump_seconds(seconds) {
	
	var frame = Math.max(0, _replay_get_value(2) + Math.round(fps * seconds));
	_replay_set_value(3, frame);
}

function jump_frames(frames) {
	
	var frame = Math.max(0, _replay_get_value(2) + frames);
	_replay_set_value(3, frame);
}

var gotoModalBindingsDone = false;
var pauseStateBeforeModal;
function open_goto_modal() {
	pauseStateBeforeModal = _replay_get_value(1);
	ensure_paused();
	if (!gotoModalBindingsDone) {
		$('#goto').on('closed.zf.reveal', function () {
			_replay_set_value(1, pauseStateBeforeModal);
		});
		$('#goto-frame-submit').on('click', function () {
			_replay_set_value(3, Math.max(0, $('#goto-frame-value').val()));
			$('#goto').foundation('close');
		});
		$('#goto-time-submit').on('click', function () {
			let timeStr = '' + $('#goto-time-value').val();
			let matches = [...timeStr.matchAll(/^(?:([0-9]+):)?([0-5]{0,1}[0-9]):([0-5][0-9])$/g)][0];
			if (!matches || matches.length != 4) {
				// Would be nice to show an error to the user here
				console.error("Error parsing time", timeStr, matches);
				return;
			}

			let seconds = parseInt(matches[3]) + 60*parseInt(matches[2]);
			if (matches[1]) seconds += 3600*parseInt(matches[1]);
			_replay_set_value(3, Math.round(seconds * fps));

			$('#goto').foundation('close');
		});

		gotoModalBindingsDone = true;
	}
	$('#goto').foundation('open');
}

function play_faster() {
	
	var current_speed = _replay_get_value(0);
	if (current_speed < 1024) {
		_replay_set_value(0, current_speed * 2);
		update_speed(current_speed * 2);
	}
}

function play_slower() {
	
	var current_speed = _replay_get_value(0);
	_replay_set_value(0, current_speed / 2);
	update_speed(current_speed / 2);
}

function toggle_sound() {

	$('#rv-rc-sound').toggleClass('rv-rc-sound');
	$('#rv-rc-sound').toggleClass('rv-rc-muted');

	volumeSettings.muted = $('#rv-rc-sound').hasClass('rv-rc-muted');
	localStorage.volumeSettings = JSON.stringify(volumeSettings);
	
	if (main_has_been_called) {
		Module.set_volume(volumeSettings.muted ? 0 : volumeSettings.level);
	}
}

function toggle_pause() {
	
	$('#rv-rc-play').toggleClass('rv-rc-play');
	$('#rv-rc-play').toggleClass('rv-rc-pause');
	
	update_info_tab();
	
	_replay_set_value(1, (_replay_get_value(1) + 1)%2);
}

function ensure_paused() {
	_replay_set_value(1, 1);
}

function update_speed(speed) {
	
	document.getElementById("rv-rc-speed").innerHTML = "speed: " + speed + "x";
}

var IMG_URL1 = "images/production_icons/icon ";
var IMG_URL2 = ".bmp";
function set_icon(tab_nr, parent_element, child_nr, icon_id, percentage, info) {
	
	if (icon_id < 10) icon_id = "0" + icon_id;
	if (icon_id < 100) icon_id = "0" + icon_id;
	
	var img_src = IMG_URL1 + icon_id + IMG_URL2;
	var element = parent_element.children("div").eq(child_nr);
	var img_element = element.children("img");
	
	if (img_element.attr("src").localeCompare(img_src) != 0) {
		img_element.attr("src", img_src);
	}
	if (tab_nr == 2) {
		element.children("div").html(info);
	} else {
		element.children("div").css("width", Math.round(percentage * 36) + "px");
	}
	if (tab_nr == 3) {
		element.children("span").html(info);
	}
	element.css("display", "inline-block");
}

function clear_icon(parent_element, child_nr) {
	
	var element = parent_element.children("div").eq(child_nr).hide();
}

function update_army_tab(complete_units) {
	
	var unit_types = [[], [], [], [], [], [], [], [], [], [], [], []];
	for (var i = 0; i != complete_units.length; ++i) {
		
		var unit = complete_units[i];
		var type = unit.unit_type().id;
		if (type < 106 && type != 7 && type != 41 && type != 64) {
			
			// tank siege mode hack (assign id for tank tank mode)
			if (type == 30) {
				type = 5;
			}
			
			if (type in unit_types[unit.owner]) {
				unit_types[unit.owner][type] += 1;
			} else {
				unit_types[unit.owner][type] = 1;
			}
		}
	}
	
	var element;
    for (var i = 0; i < players.length; ++i) {
        
    	var type_count = 0;
    	element = $('#army_tab_content' + (i + 1));
    	for (type in unit_types[players[i]]) {
			
			var count = unit_types[players[i]][type];
			
			set_icon(2, element, type_count, type, 1, count);
			++type_count;
		}
    	for (var j = type_count; j < 20; j++) {
    		clear_icon(element, j);
    	}
    }
}

var relevant_research = [0,1,2,3,5,7,8,9,10,11,13,15,16,17,19,20,21,22,24,25,27,30,31,32];
var unused_research = [4, 6, 12, 14, 18, 23, 26, 28, 29, 33, 34];

function update_research_tab(researches) {
	
	var element;
	for (var i = 0; i < researches.length; i++) {
		
		element = $('#research_tab_content' + (i+1));
		var upgrade_count = 1;
		var complete = researches[i][1];
		var index = 0;
		for (var j = 0; j < complete.length; j++) {
			
			if ($.inArray(complete[j].id, unused_research) == -1) {
				set_icon(4, element, index, complete[j].icon, 1, null);
				index++;
			}
		}
		
		var incomplete = researches[i][2];
		for (var j = 0; j < incomplete.length; j++) {
			
			var build_percentage = 1 - incomplete[j].remaining_time / incomplete[j].total_time;
			set_icon(4, element, j + index, incomplete[j].icon, build_percentage, null);
		}
		
		 //clear the unused spots
	    for (var j = incomplete.length + index; j < 20; ++j) {
	    	clear_icon(element, j);
	    }
	}
}

function update_upgrades_tab(upgrades) {
	
	var element;
	for (var i = 0; i < upgrades.length; i++) {
		
		var upgrade_count = 1;
		var complete = upgrades[i][1];
		element = $('#upgrade_tab_content' + (i+1));
		
		for (var j = 0; j < complete.length; j++) {
			
			set_icon(3, element, j, complete[j].icon, 1, complete[j].level);
		}
		
		var incomplete = upgrades[i][2];
		for (var j = 0; j < incomplete.length; j++) {
			
			var build_percentage = 1 - incomplete[j].remaining_time / incomplete[j].total_time;
			set_icon(3, element, j + complete.length, incomplete[j].icon, build_percentage, incomplete[j].level);
		}
		
		 //clear the unused spots
	    for (var j = complete.length + incomplete.length; j < 20; ++j) {
	    	clear_icon(element, j);
	    }
	}
}

var productionUnit_compare = function (unit1, unit2) {
	
	var build_time1 = unit1.build_type() ? unit1.build_type().build_time : unit1.unit_type().build_time;
	var build_time2 = unit2.build_type() ? unit2.build_type().build_time : unit2.unit_type().build_time;
	
	return (build_time2 - unit2.remaining_build_time)  - (build_time1 - unit1.remaining_build_time);
}

function update_production_tab(incomplete_units) {
	
	incomplete_units.sort(productionUnit_compare);
	
	var unit_names = [[], [], [], [], [], [], [], [], [], [], [], []];
	
	for (var i = 0; i != incomplete_units.length; ++i) {
		var u = incomplete_units[i];
		var t;
		var build_time;
		if (u.build_type()) {
			t = u.build_type().id;
			build_time = u.build_type().build_time;
			
		} else {
			t = u.unit_type().id;
			build_time = u.unit_type().build_time;
		}
		
		var build_percentage = 1 - u.remaining_build_time / build_time;
		
		unit_names[u.owner].push([t, build_percentage]);
	}
	
	var element;
    for (var i = 0; i < players.length; ++i) {
        
    	element = $('#production_tab_content' + (i + 1));
    	
    	//fill the spots with all units in production for current player
	    for (var j = 0; j != unit_names[players[i]].length; ++j) {
	    	
	    	set_icon(1, element, j, unit_names[players[i]][j][0], unit_names[players[i]][j][1], null);
	    }
	    
	    //clear the unused spots
	    for (var j = unit_names[players[i]].length; j < 100; ++j) {
	    	clear_icon(element, j);
	    }
    }
}

function update_timer(frame) {
	
	var sec_num = frame  * 42 / 1000;
	var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = Math.floor(sec_num - (hours * 3600) - (minutes * 60));

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    
    var time = minutes+':'+seconds;
    if (hours > 0) {
    	time = hours + ':' + time;
    }
	document.getElementById("rv-rc-timer").innerHTML = "time: " + time;
	
	$("#goto-frame-value").val(frame);
	$("#goto-time-value").val(time);
}

var isDown = false;
var isClicked = false;

function update_handle_position(value) {
	
	if (!isDown && !isClicked) {
		document.getElementById("sliderOutput").value = value;
		$('#sliderOutput').trigger("change");
	}
}

function set_map_name(name) {
	document.getElementById("map1").innerHTML = name;
	document.getElementById("map2").innerHTML = name;
}

function set_color(player, color) {
		
	var rgb_color;
	switch(color) {
	case 0:
		rgb_color = "rgba(244, 4, 4, 1)";
		break;
	case 1:
		rgb_color = "rgba(12, 72, 204, 1)";
		break;
	case 2:
		rgb_color = "rgba(44, 180, 148, 1)";
		break;
	case 3:
		rgb_color = "rgba(136, 64, 156, 1)";
		break;
	case 4:
		rgb_color = "rgba(248, 140, 20, 1)";
		break;
	case 5:
		rgb_color = "rgba(112, 48, 20, 1)";
		break;
	case 6:
		rgb_color = "rgba(204, 224, 208, 1)";
		break;
	case 7:
		rgb_color = "rgba(252, 252, 56, 1)";
		break;
	case 8:
		rgb_color = "rgba(8, 128, 8, 1)";
		break;
	case 9:
		rgb_color = "rgba(252, 252, 124, 1)";
		break;
	case 10:
		rgb_color = "rgba(236, 196, 176, 1)";
		break;
	case 11:
		rgb_color = "rgba(64, 104, 212, 1)";
		break;
	}
	// infoChart.data.datasets[(player-1) * 4].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 1].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 1].backgroundColor = rgb_color.replace(/[\d\.]+\)$/g, '0.1)');
	// infoChart.data.datasets[(player-1) * 4 + 2].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 3].borderColor = rgb_color;
	
	$('.player_color' + player).css('border-color', rgb_color);
}

function set_nick(player, nick) {
	document.getElementById("nick" + player).innerHTML = nick;
}

function set_supply(player, supply) {
	document.getElementById("supply" + player).innerHTML = supply;
}

function set_minerals(player, minerals) {
	document.getElementById("minerals" + player).innerHTML = minerals;
}

function set_gas(player, gas) {
	document.getElementById("gas" + player).innerHTML = gas;
}

function set_workers(player, workers) {
	document.getElementById("workers" + player).innerHTML = workers;
}

function set_army(player, army) {
	document.getElementById("army" + player).innerHTML = army;
}

var player_race_cache  = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
function set_race(player, race) {
	
	if (player_race_cache[player] != race) {
		
		player_race_cache[player] = race;
		var race_name;
		if (race == 0) {
			race_name = "zerg";
		} else if (race == 1) {
			race_name = "terran";
		} else if (race == 2) {
			race_name = "protoss";
		}
		console.log("setting race emblem for player " + player);
		$('#race' + player).css("background-image", "url('images/race_emblems/" + race_name + ".png')");
	}
}

function set_apm(player, apm) {
	document.getElementById("apm" + player).innerHTML = apm;
}