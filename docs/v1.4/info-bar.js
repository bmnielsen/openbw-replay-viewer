const fps = (1000 / 42);
function sanitize_unit_interval(value, fallback) {
	var parsed = parseFloat(value);
	return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function load_volume_settings() {
	try {
		var saved = JSON.parse(localStorage.volumeSettings || '{}');
		return {
			level: sanitize_unit_interval(saved.level, 0.5),
			muted: !!saved.muted
		};
	} catch (error) {
		return {
			level: 0.5,
			muted: false
		};
	}
}

const defaultAudioCategorySettings = {
	combat: { enabled: true, level: 1 },
	acknowledgements: { enabled: true, level: 1 },
	music: { enabled: true, level: 0.25 }
};

function load_audio_category_settings() {
	try {
		var saved = JSON.parse(localStorage.audioCategorySettings || '{}');
		return {
			combat: {
				enabled: saved.combat && typeof saved.combat.enabled !== 'undefined' ? !!saved.combat.enabled : true,
				level: sanitize_unit_interval(saved.combat && saved.combat.level, 1)
			},
			acknowledgements: {
				enabled: saved.acknowledgements && typeof saved.acknowledgements.enabled !== 'undefined' ? !!saved.acknowledgements.enabled : true,
				level: sanitize_unit_interval(saved.acknowledgements && saved.acknowledgements.level, 1)
			},
			music: {
				enabled: saved.music && typeof saved.music.enabled !== 'undefined' ? !!saved.music.enabled : true,
				level: sanitize_unit_interval(saved.music && saved.music.level, 0.25)
			}
		};
	} catch (error) {
		return JSON.parse(JSON.stringify(defaultAudioCategorySettings));
	}
}

let volumeSettings = load_volume_settings();
let zoomLevel = parseInt(localStorage.zoomLevel || '0');
const defaultViewerToggleSettings = {
	observerEnabled: true,
	fowEnabled: true,
	forceRedBlueEnabled: false
};
let viewerToggleSettings = (() => {
	try {
		return Object.assign({}, defaultViewerToggleSettings, JSON.parse(localStorage.viewerToggleSettings || '{}'));
	} catch (error) {
		return Object.assign({}, defaultViewerToggleSettings);
	}
})();
let audioCategorySettings = load_audio_category_settings();
let settingsModalTab = localStorage.settingsModalTab === 'audio' ? 'audio' : 'video';
let exportState = null;
let scrubPreviewFrame = null;
let isDraggingVolumeSlider = false;
let isSyncingOverallVolumeSlider = false;
let activeAudioSliderKey = null;
let audioSliderReleaseTimer = null;
let audioSliderInputSeen = {};
let audioSliderLastInputValue = {};
let audioSliderIgnoreNativeInputUntil = {};
let isPointerChangingAudioSlider = false;
let activeAudioSliderDrag = null;
let lastSliderPointerPageX = 0;
let lastSliderPointerPageY = 0;
let lastSliderPointerClientX = 0;
let lastSliderPointerClientY = 0;
let exportSettings = load_export_settings();
let modalPlaybackState = {
	openIds: {},
	resumeOnClose: false
};
const UNITTYPES_DISPLAY_NAMES = ["Terran Marine", "Terran Ghost", "Terran Vulture", "Terran Goliath", "Terran Goliath Turret", "Terran Siege Tank Tank Mode", "Terran Siege Tank Tank Mode Turret", "Terran SCV", "Terran Wraith", "Terran Science Vessel", "Hero Gui Montag", "Terran Dropship", "Terran Battlecruiser", "Terran Vulture Spider Mine", "Terran Nuclear Missile", "Terran Civilian", "Hero Sarah Kerrigan", "Hero Alan Schezar", "Hero Alan Schezar Turret", "Hero Jim Raynor Vulture", "Hero Jim Raynor Marine", "Hero Tom Kazansky", "Hero Magellan", "Hero Edmund Duke Tank Mode", "Hero Edmund Duke Tank Mode Turret", "Hero Edmund Duke Siege Mode", "Hero Edmund Duke Siege Mode Turret", "Hero Arcturus Mengsk", "Hero Hyperion", "Hero Norad II", "Terran Siege Tank Siege Mode", "Terran Siege Tank Siege Mode Turret", "Terran Firebat", "Spell Scanner Sweep", "Terran Medic", "Zerg Larva", "Zerg Egg", "Zerg Zergling", "Zerg Hydralisk", "Zerg Ultralisk", "Zerg Broodling", "Zerg Drone", "Zerg Overlord", "Zerg Mutalisk", "Zerg Guardian", "Zerg Queen", "Zerg Defiler", "Zerg Scourge", "Hero Torrasque", "Hero Matriarch", "Zerg Infested Terran", "Hero Infested Kerrigan", "Hero Unclean One", "Hero Hunter Killer", "Hero Devouring One", "Hero Kukulza Mutalisk", "Hero Kukulza Guardian", "Hero Yggdrasill", "Terran Valkyrie", "Zerg Cocoon", "Protoss Corsair", "Protoss Dark Templar", "Zerg Devourer", "Protoss Dark Archon", "Protoss Probe", "Protoss Zealot", "Protoss Dragoon", "Protoss High Templar", "Protoss Archon", "Protoss Shuttle", "Protoss Scout", "Protoss Arbiter", "Protoss Carrier", "Protoss Interceptor", "Hero Dark Templar", "Hero Zeratul", "Hero Tassadar Zeratul Archon", "Hero Fenix Zealot", "Hero Fenix Dragoon", "Hero Tassadar", "Hero Mojo", "Hero Warbringer", "Hero Gantrithor", "Protoss Reaver", "Protoss Observer", "Protoss Scarab", "Hero Danimoth", "Hero Aldaris", "Hero Artanis", "Critter Rhynadon", "Critter Bengalaas", "Special Cargo Ship", "Special Mercenary Gunship", "Critter Scantid", "Critter Kakaru", "Critter Ragnasaur", "Critter Ursadon", "Zerg Lurker Egg", "Hero Raszagal", "Hero Samir Duran", "Hero Alexei Stukov", "Special Map Revealer", "Hero Gerard DuGalle", "Zerg Lurker", "Hero Infested Duran", "Spell Disruption Web", "Terran Command Center", "Terran Comsat Station", "Terran Nuclear Silo", "Terran Supply Depot", "Terran Refinery", "Terran Barracks", "Terran Academy", "Terran Factory", "Terran Starport", "Terran Control Tower", "Terran Science Facility", "Terran Covert Ops", "Terran Physics Lab", "Unused Terran1", "Terran Machine Shop", "Unused Terran2", "Terran Engineering Bay", "Terran Armory", "Terran Missile Turret", "Terran Bunker", "Special Crashed Norad II", "Special Ion Cannon", "Powerup Uraj Crystal", "Powerup Khalis Crystal", "Zerg Infested Command Center", "Zerg Hatchery", "Zerg Lair", "Zerg Hive", "Zerg Nydus Canal", "Zerg Hydralisk Den", "Zerg Defiler Mound", "Zerg Greater Spire", "Zerg Queens Nest", "Zerg Evolution Chamber", "Zerg Ultralisk Cavern", "Zerg Spire", "Zerg Spawning Pool", "Zerg Creep Colony", "Zerg Spore Colony", "Unused Zerg1", "Zerg Sunken Colony", "Special Overmind With Shell", "Special Overmind", "Zerg Extractor", "Special Mature Chrysalis", "Special Cerebrate", "Special Cerebrate Daggoth", "Unused Zerg2", "Protoss Nexus", "Protoss Robotics Facility", "Protoss Pylon", "Protoss Assimilator", "Unused Protoss1", "Protoss Observatory", "Protoss Gateway", "Unused Protoss2", "Protoss Photon Cannon", "Protoss Citadel of Adun", "Protoss Cybernetics Core", "Protoss Templar Archives", "Protoss Forge", "Protoss Stargate", "Special Stasis Cell Prison", "Protoss Fleet Beacon", "Protoss Arbiter Tribunal", "Protoss Robotics Support Bay", "Protoss Shield Battery", "Special Khaydarin Crystal Form", "Special Protoss Temple", "Special XelNaga Temple", "Resource Mineral Field", "Resource Mineral Field Type 2", "Resource Mineral Field Type 3", "Unused Cave", "Unused Cave In", "Unused Cantina", "Unused Mining Platform", "Unused Independant Command Center", "Special Independant Starport", "Unused Independant Jump Gate", "Unused Ruins", "Unused Khaydarin Crystal Formation", "Resource Vespene Geyser", "Special Warp Gate", "Special Psi Disrupter", "Unused Zerg Marker", "Unused Terran Marker", "Unused Protoss Marker", "Special Zerg Beacon", "Special Terran Beacon", "Special Protoss Beacon", "Special Zerg Flag Beacon", "Special Terran Flag Beacon", "Special Protoss Flag Beacon", "Special Power Generator", "Special Overmind Cocoon", "Spell Dark Swarm", "Special Floor Missile Trap", "Special Floor Hatch", "Special Upper Level Door", "Special Right Upper Level Door", "Special Pit Door", "Special Right Pit Door", "Special Floor Gun Trap", "Special Wall Missile Trap", "Special Wall Flame Trap", "Special Right Wall Missile Trap", "Special Right Wall Flame Trap", "Special Start Location", "Powerup Flag", "Powerup Young Chrysalis", "Powerup Psi Emitter", "Powerup Data Disk", "Powerup Khaydarin Crystal", "Powerup Mineral Cluster Type 1", "Powerup Mineral Cluster Type 2", "Powerup Protoss Gas Orb Type 1", "Powerup Protoss Gas Orb Type 2", "Powerup Zerg Gas Sac Type 1", "Powerup Zerg Gas Sac Type 2", "Powerup Terran Gas Tank Type 1", "Powerup Terran Gas Tank Type 2", "None"];
const UPGRADETYPES_DISPLAY_NAMES = ["Terran Infantry Armor", "Terran Vehicle Plating", "Terran Ship Plating", "Zerg Carapace", "Zerg Flyer Carapace", "Protoss Ground Armor", "Protoss Air Armor", "Terran Infantry Weapons", "Terran Vehicle Weapons", "Terran Ship Weapons", "Zerg Melee Attacks", "Zerg Missile Attacks", "Zerg Flyer Attacks", "Protoss Ground Weapons", "Protoss Air Weapons", "Protoss Plasma Shields", "U 238 Shells", "Ion Thrusters", "Unknown 18", "Titan Reactor", "Ocular Implants", "Moebius Reactor", "Apollo Reactor", "Colossus Reactor", "Ventral Sacs", "Antennae", "Pneumatized Carapace", "Metabolic Boost", "Adrenal Glands", "Muscular Augments", "Grooved Spines", "Gamete Meiosis", "Metasynaptic Node", "Singularity Charge", "Leg Enhancements", "Scarab Damage", "Reaver Capacity", "Gravitic Drive", "Sensor Array", "Gravitic Boosters", "Khaydarin Amulet", "Apial Sensors", "Gravitic Thrusters", "Carrier Capacity", "Khaydarin Core", "Unknown 45", "Unknown 46", "Argus Jewel", "Unknown 48", "Argus Talisman", "Unknown 50", "Caduceus Reactor", "Chitinous Plating", "Anabolic Synthesis", "Charon Boosters"];
const TECHTYPES_DISPLAY_NAMES = ["Stim Packs", "Lockdown", "EMP Shockwave", "Spider Mines", "Scanner Sweep", "Tank Siege Mode", "Defensive Matrix", "Irradiate", "Yamato Gun", "Cloaking Field", "Personnel Cloaking", "Burrowing", "Infestation", "Spawn Broodlings", "Dark Swarm", "Plague", "Consume", "Ensnare", "Parasite", "Psionic Storm", "Hallucination", "Recall", "Stasis Field", "Archon Warp", "Restoration", "Disruption Web", "Unused 26", "Mind Control", "Dark Archon Meld", "Feedback", "Optical Flare", "Maelstrom", "Lurker Aspect", "Unused 33", "Healing"];

function sanitize_positive_integer(value, fallback) {
	var parsed = parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitize_positive_decimal(value, fallback) {
	var parsed = parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function base_export_settings() {
	var config = window.OPENBW_VIDEO_EXPORT_CONFIG || {};
	return {
		width: sanitize_positive_integer(config.width, 1920),
		height: sanitize_positive_integer(config.height, 1080),
		fps: sanitize_positive_integer(config.fps, 24),
		videoBitrateMbps: sanitize_positive_decimal(config.videoBitrateMbps, 12),
		replaySpeed: sanitize_positive_integer(config.replaySpeed, 1024),
		pollIntervalMs: sanitize_positive_integer(config.pollIntervalMs, 100),
		extension: config.extension || 'webm',
		mimeTypes: config.mimeTypes || ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
		modalTitle: config.modalTitle || "Exporting video",
		modalMessage: config.modalMessage || "Recording replay to WebM from the opening frame at maximum replay speed."
	};
}

function remember_slider_pointer_position(event) {
	if (!event) return;
	if (Number.isFinite(event.pageX)) lastSliderPointerPageX = event.pageX;
	else if (Number.isFinite(event.clientX)) lastSliderPointerPageX = event.clientX + window.scrollX;
	if (Number.isFinite(event.pageY)) lastSliderPointerPageY = event.pageY;
	else if (Number.isFinite(event.clientY)) lastSliderPointerPageY = event.clientY + window.scrollY;
	if (Number.isFinite(event.clientX)) lastSliderPointerClientX = event.clientX;
	if (Number.isFinite(event.clientY)) lastSliderPointerClientY = event.clientY;
}

function release_interrupted_slider_drag() {
	var gameSlider = $('#game-slider');
	var volumeSlider = $('#volume-slider');
	var foundationDragging =
		gameSlider.data('dragging') ||
		volumeSlider.data('dragging') ||
		$('#game-slider-handle').hasClass('is-dragging') ||
		$('#volume-slider-handle').hasClass('is-dragging');

	if (foundationDragging) {
		var syntheticMouseUp = $.Event('mouseup', {
			which: 1,
			button: 0,
			pageX: lastSliderPointerPageX,
			pageY: lastSliderPointerPageY,
			clientX: lastSliderPointerClientX,
			clientY: lastSliderPointerClientY
		});
		$('body').trigger(syntheticMouseUp);
	}

	gameSlider.data('dragging', false);
	volumeSlider.data('dragging', false);
	$('#game-slider-handle, #volume-slider-handle').removeClass('is-dragging');
	$('#game-slider .slider-fill, #volume-slider .slider-fill').removeClass('is-dragging');

	if (isDown || isClicked) {
		isDown = false;
		isClicked = false;
		scrubPreviewFrame = null;
		update_timer(_replay_get_value(2));
	}
	if (isDraggingVolumeSlider) {
		isDraggingVolumeSlider = false;
		hide_volume_slider();
	}
}

function display_name_for_icon(category, id) {
	if (category === 'unit') return UNITTYPES_DISPLAY_NAMES[id] || 'Unknown unit';
	if (category === 'upgrade') return UPGRADETYPES_DISPLAY_NAMES[id] || 'Unknown upgrade';
	if (category === 'tech') return TECHTYPES_DISPLAY_NAMES[id] || 'Unknown research';
	return '';
}

function format_clip_timestamp(frame) {
	var totalSeconds = Math.max(0, Math.floor(frame * 42 / 1000));
	var hours = Math.floor(totalSeconds / 3600);
	var minutes = Math.floor((totalSeconds % 3600) / 60);
	var seconds = totalSeconds % 60;
	if (hours > 0) {
		return hours + 'h' + String(minutes).padStart(2, '0') + 'm' + String(seconds).padStart(2, '0') + 's';
	}
	return String(minutes).padStart(2, '0') + 'm' + String(seconds).padStart(2, '0') + 's';
}

function persist_volume_settings() {
	localStorage.volumeSettings = JSON.stringify({
		level: volumeSettings.level,
		muted: volumeSettings.muted
	});
}

function persist_audio_category_settings() {
	localStorage.audioCategorySettings = JSON.stringify(audioCategorySettings);
}

function sync_audio_controls_ui(skipAudioSliderKey) {
	update_overall_volume_slider_ui();
	populate_audio_settings_form(skipAudioSliderKey);
}

function apply_overall_volume_state(level, muted, skipAudioSliderKey) {
	volumeSettings.level = sanitize_unit_interval(level, 0.5);
	volumeSettings.muted = !!muted;
	persist_volume_settings();
	sync_audio_controls_ui(skipAudioSliderKey);
	apply_audio_settings_to_runtime();
}

function effective_overall_volume() {
	return volumeSettings.muted ? 0 : sanitize_unit_interval(volumeSettings.level, 0.5);
}

function effective_category_volume(category) {
	var settings = audioCategorySettings[category];
	if (!settings || !settings.enabled) return 0;
	return effective_overall_volume() * sanitize_unit_interval(settings.level, 1);
}

function mix_category_volume(category) {
	var settings = audioCategorySettings[category];
	if (!settings || !settings.enabled) return 0;
	return sanitize_unit_interval(settings.level, 1);
}

function current_audio_setting_state(key) {
	if (key === 'overall') {
		return {
			enabled: !volumeSettings.muted,
			level: sanitize_unit_interval(volumeSettings.level, 0.5)
		};
	}
	return {
		enabled: !!audioCategorySettings[key].enabled,
		level: sanitize_unit_interval(audioCategorySettings[key].level, 1)
	};
}

function apply_music_volume() {
	if (!musicState || !musicState.audio) return;
	musicState.audio.volume = Math.max(0, Math.min(1, effective_category_volume('music')));
}

function apply_audio_settings_to_runtime() {
	if (main_has_been_called && typeof Module !== "undefined") {
		if (typeof Module.set_volume === "function") {
			Module.set_volume(effective_overall_volume());
		}
		if (typeof Module.set_combat_volume === "function") {
			Module.set_combat_volume(mix_category_volume('combat'));
		}
		if (typeof Module.set_acknowledgement_volume === "function") {
			Module.set_acknowledgement_volume(mix_category_volume('acknowledgements'));
		}
	}
	apply_music_volume();
	if (typeof sync_viewer_runtime_state === "function") {
		sync_viewer_runtime_state();
	} else if (typeof sync_music_playback_state === "function") {
		sync_music_playback_state();
	}
}

function update_sound_button_state() {
	$('#rv-rc-sound').toggleClass('rv-rc-sound', !volumeSettings.muted);
	$('#rv-rc-sound').toggleClass('rv-rc-muted', volumeSettings.muted);
}

function read_vertical_slider_height(element, fallbackValue) {
	if (!element) return fallbackValue;
	var computedHeight = parseFloat(window.getComputedStyle(element).height);
	if (isFinite(computedHeight) && computedHeight > 0) return computedHeight;
	var rectHeight = element.getBoundingClientRect().height;
	if (isFinite(rectHeight) && rectHeight > 0) return rectHeight;
	return fallbackValue;
}

function sync_overall_volume_slider_geometry() {
	var sliderElement = document.getElementById('volume-slider');
	var handleElement = document.getElementById('volume-slider-handle');
	if (!sliderElement || !handleElement) return;
	var fillElement = sliderElement.querySelector('[data-slider-fill]');
	var level = sanitize_unit_interval(volumeSettings.level, 0.5);
	var percent = Math.round(level * 100);
	var rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
	var sliderHeight = read_vertical_slider_height(sliderElement, 120);
	var handleHeight = read_vertical_slider_height(handleElement, rootFontSize * 1.4);
	var maxTravel = Math.max(0, sliderHeight - handleHeight);
	var topPercent = sliderHeight > 0 ? (maxTravel * level / sliderHeight) * 100 : 0;
	handleElement.style.top = topPercent.toFixed(2) + '%';
	handleElement.setAttribute('aria-valuenow', percent);
	if (fillElement) {
		fillElement.style.height = percent + '%';
	}
}

function update_overall_volume_slider_ui() {
	var percent = Math.round(sanitize_unit_interval(volumeSettings.level, 0.5) * 100);
	var volumeOutput = $('#volumeOutput');
	if (String(volumeOutput.val()) !== String(percent)) {
		volumeOutput.val(percent);
	}
	isSyncingOverallVolumeSlider = true;
	try {
		sync_overall_volume_slider_geometry();
	} finally {
		isSyncingOverallVolumeSlider = false;
	}
	update_sound_button_state();
}

function current_replay_player_names() {
	var names = [];
	for (var i = 1; i <= 8; ++i) {
		var nickElement = document.getElementById('nick' + i);
		if (!nickElement) continue;
		var rowElement = nickElement.closest('.infobar-player');
		if (rowElement && window.getComputedStyle(rowElement).display === 'none') continue;
		var fullName = nickElement.dataset.fullName || nickElement.textContent || '';
		if (fullName) names.push(fullName.trim());
	}
	return names.length ? names : ['openbw-replay'];
}

function load_export_settings() {
	var defaults = base_export_settings();
	try {
		var saved = JSON.parse(localStorage.exportSettings || '{}');
		return {
			width: sanitize_positive_integer(saved.width, defaults.width),
			height: sanitize_positive_integer(saved.height, defaults.height),
			fps: sanitize_positive_integer(saved.fps, defaults.fps),
			videoBitrateMbps: sanitize_positive_decimal(saved.videoBitrateMbps, defaults.videoBitrateMbps)
		};
	} catch (error) {
		return {
			width: defaults.width,
			height: defaults.height,
			fps: defaults.fps,
			videoBitrateMbps: defaults.videoBitrateMbps
		};
	}
}

function current_export_settings() {
	var defaults = base_export_settings();
	return {
		width: sanitize_positive_integer(exportSettings.width, defaults.width),
		height: sanitize_positive_integer(exportSettings.height, defaults.height),
		fps: sanitize_positive_integer(exportSettings.fps, defaults.fps),
		videoBitrateMbps: sanitize_positive_decimal(exportSettings.videoBitrateMbps, defaults.videoBitrateMbps),
		replaySpeed: defaults.replaySpeed,
		pollIntervalMs: defaults.pollIntervalMs,
		extension: defaults.extension,
		mimeTypes: defaults.mimeTypes,
		modalTitle: defaults.modalTitle,
		modalMessage: defaults.modalMessage
	};
}

function persist_export_settings() {
	localStorage.exportSettings = JSON.stringify({
		width: exportSettings.width,
		height: exportSettings.height,
		fps: exportSettings.fps,
		videoBitrateMbps: exportSettings.videoBitrateMbps
	});
}

function persist_settings_modal_tab() {
	localStorage.settingsModalTab = settingsModalTab;
}

function populate_export_settings_form() {
	var settings = current_export_settings();
	$('#export-width').val(settings.width);
	$('#export-height').val(settings.height);
	$('#export-fps').val(settings.fps);
	$('#export-bitrate').val(Number(settings.videoBitrateMbps).toFixed(1).replace(/\.0$/, ''));
}

function save_export_settings_from_form() {
	var defaults = base_export_settings();
	exportSettings = {
		width: sanitize_positive_integer($('#export-width').val(), defaults.width),
		height: sanitize_positive_integer($('#export-height').val(), defaults.height),
		fps: sanitize_positive_integer($('#export-fps').val(), defaults.fps),
		videoBitrateMbps: sanitize_positive_decimal($('#export-bitrate').val(), defaults.videoBitrateMbps)
	};
	persist_export_settings();
	populate_export_settings_form();
}

function reset_export_settings_to_defaults() {
	var defaults = base_export_settings();
	exportSettings = {
		width: defaults.width,
		height: defaults.height,
		fps: defaults.fps,
		videoBitrateMbps: defaults.videoBitrateMbps
	};
	delete localStorage.exportSettings;
	populate_export_settings_form();
}

function reset_audio_settings_to_defaults() {
	volumeSettings = load_volume_settings();
	audioCategorySettings = JSON.parse(JSON.stringify(defaultAudioCategorySettings));
	delete localStorage.volumeSettings;
	delete localStorage.audioCategorySettings;
	persist_audio_category_settings();
	apply_overall_volume_state(0.5, false);
}

function begin_audio_slider_change(key) {
	activeAudioSliderKey = key;
	audioSliderInputSeen[key] = false;
	delete audioSliderLastInputValue[key];
	isPointerChangingAudioSlider = true;
	if (audioSliderReleaseTimer) {
		clearTimeout(audioSliderReleaseTimer);
		audioSliderReleaseTimer = null;
	}
}

function mark_audio_slider_input(key, value) {
	activeAudioSliderKey = key;
	audioSliderInputSeen[key] = true;
	audioSliderLastInputValue[key] = String(value);
	if (audioSliderReleaseTimer) {
		clearTimeout(audioSliderReleaseTimer);
		audioSliderReleaseTimer = null;
	}
}

function finish_audio_slider_change(key) {
	isPointerChangingAudioSlider = false;
	audioSliderIgnoreNativeInputUntil[key] = performance.now() + 1500;
	if (audioSliderReleaseTimer) {
		clearTimeout(audioSliderReleaseTimer);
	}
	audioSliderReleaseTimer = setTimeout(function() {
		if (activeAudioSliderKey === key) {
			activeAudioSliderKey = null;
		}
		audioSliderInputSeen[key] = false;
		delete audioSliderLastInputValue[key];
		delete audioSliderIgnoreNativeInputUntil[key];
		populate_audio_settings_form();
		audioSliderReleaseTimer = null;
	}, 1500);
}

function maybe_finish_audio_slider_change_after_blur(key) {
	if (!isPointerChangingAudioSlider) {
		finish_audio_slider_change(key);
	}
}

function audio_slider_value_from_event(slider, event) {
	var originalEvent = event.originalEvent || event;
	var clientX = Number.isFinite(originalEvent.clientX) ? originalEvent.clientX : null;
	if (clientX === null && originalEvent.touches && originalEvent.touches.length) {
		clientX = originalEvent.touches[0].clientX;
	}
	if (clientX === null && originalEvent.changedTouches && originalEvent.changedTouches.length) {
		clientX = originalEvent.changedTouches[0].clientX;
	}
	var rect = slider.getBoundingClientRect();
	var min = parseFloat(slider.min || '0');
	var max = parseFloat(slider.max || '100');
	var step = parseFloat(slider.step || '1') || 1;
	var fraction = rect.width > 0 && clientX !== null ? (clientX - rect.left) / rect.width : 0;
	fraction = Math.max(0, Math.min(1, fraction));
	var rawValue = min + fraction * (max - min);
	return String(Math.round(rawValue / step) * step);
}

function apply_audio_slider_pointer_value(key, slider, event) {
	var value = audio_slider_value_from_event(slider, event);
	slider.value = value;
	mark_audio_slider_input(key, value);
	audioSliderIgnoreNativeInputUntil[key] = performance.now() + 1500;
	set_audio_setting_level(key, value);
}

function should_ignore_native_audio_slider_input(key, slider) {
	return (
		Object.prototype.hasOwnProperty.call(audioSliderLastInputValue, key) &&
		String(slider.value) !== audioSliderLastInputValue[key] &&
		performance.now() < (audioSliderIgnoreNativeInputUntil[key] || 0)
	);
}

function stop_audio_slider_drag() {
	if (!activeAudioSliderDrag) return;
	var key = activeAudioSliderDrag.key;
	activeAudioSliderDrag = null;
	$(document).off('.settingsAudioSlider');
	finish_audio_slider_change(key);
}

function start_audio_slider_drag(key, slider, event) {
	var originalEvent = event.originalEvent || event;
	if (activeAudioSliderDrag) {
		stop_audio_slider_drag();
	}
	activeAudioSliderDrag = { key: key, slider: slider };
	begin_audio_slider_change(key);
	apply_audio_slider_pointer_value(key, slider, event);
	if (originalEvent && typeof originalEvent.preventDefault === 'function') {
		originalEvent.preventDefault();
	}
	$(document)
		.on('pointermove.settingsAudioSlider mousemove.settingsAudioSlider touchmove.settingsAudioSlider', function(moveEvent) {
			if (!activeAudioSliderDrag) return;
			apply_audio_slider_pointer_value(activeAudioSliderDrag.key, activeAudioSliderDrag.slider, moveEvent);
			moveEvent.preventDefault();
		})
		.on('pointerup.settingsAudioSlider mouseup.settingsAudioSlider touchend.settingsAudioSlider touchcancel.settingsAudioSlider', function(upEvent) {
			if (activeAudioSliderDrag) {
				apply_audio_slider_pointer_value(activeAudioSliderDrag.key, activeAudioSliderDrag.slider, upEvent);
			}
			stop_audio_slider_drag();
		});
}

function populate_audio_settings_form(skipAudioSliderKey) {
	['overall', 'combat', 'acknowledgements', 'music'].forEach(function(key) {
		var state = current_audio_setting_state(key);
		$('#audio-' + key + '-toggle').toggleClass('rv-rc-sound', state.enabled);
		$('#audio-' + key + '-toggle').toggleClass('rv-rc-muted', !state.enabled);
		$('#audio-' + key + '-toggle').attr('aria-pressed', state.enabled ? 'true' : 'false');
		if (key !== skipAudioSliderKey && key !== activeAudioSliderKey) {
			$('#audio-' + key + '-slider').val(Math.round(state.level * 100));
		}
		$('#audio-' + key + '-value').text(Math.round(state.level * 100) + '%');
	});
}

function set_settings_modal_tab(tab) {
	settingsModalTab = tab === 'audio' ? 'audio' : 'video';
	persist_settings_modal_tab();
	$('#settings-tab-audio').toggleClass('is-active', settingsModalTab === 'audio');
	$('#settings-tab-video').toggleClass('is-active', settingsModalTab === 'video');
	$('[data-settings-panel]').removeClass('is-active').attr('hidden', true);
	$('[data-settings-panel="' + settingsModalTab + '"]').addClass('is-active').removeAttr('hidden');
}

function set_audio_setting_enabled(key, enabled) {
	if (key === 'overall') {
		apply_overall_volume_state(volumeSettings.level, !enabled);
		return;
	}
	audioCategorySettings[key].enabled = !!enabled;
	persist_audio_category_settings();
	populate_audio_settings_form();
	apply_audio_settings_to_runtime();
}

function set_audio_setting_level(key, value) {
	var normalized = sanitize_unit_interval(value / 100, 1);
	if (key === 'overall') {
		apply_overall_volume_state(normalized, normalized === 0, key);
		return;
	}
	audioCategorySettings[key].level = normalized;
	persist_audio_category_settings();
	populate_audio_settings_form(key);
	apply_audio_settings_to_runtime();
}

function open_export_settings_modal() {
	populate_audio_settings_form();
	populate_export_settings_form();
	set_settings_modal_tab(settingsModalTab);
	$('#export_settings').foundation('open');
}

function create_info_chart_config() {
	return {
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
	        }]
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
	};
}

function ensure_info_chart() {
	if (infoChart) return infoChart;
	if (typeof Chart === "undefined") return null;
	var ctx = document.getElementById("infoChartCanvas");
	if (!ctx) return null;
	infoChart = new Chart(ctx, create_info_chart_config());
	return infoChart;
}

function viewer_can_modal_pause_playback() {
	return main_has_been_called &&
		typeof _replay_get_value === "function" &&
		typeof _replay_set_value === "function" &&
		_replay_get_value(4) > 0 &&
		_replay_get_value(2) < _replay_get_value(4);
}

function handle_modal_open(modalId) {
	if (!modalId) return;
	if (modalPlaybackState.openIds[modalId]) return;
	var hadOpenModal = Object.keys(modalPlaybackState.openIds).length > 0;
	modalPlaybackState.openIds[modalId] = true;
	if (hadOpenModal || !viewer_can_modal_pause_playback()) return;
	modalPlaybackState.resumeOnClose = _replay_get_value(1) === 0;
	if (modalPlaybackState.resumeOnClose) {
		_replay_set_value(1, 1);
		if (typeof sync_viewer_runtime_state === "function") sync_viewer_runtime_state(true);
	}
}

function handle_modal_close(modalId) {
	if (!modalId || !modalPlaybackState.openIds[modalId]) return;
	delete modalPlaybackState.openIds[modalId];
	if (Object.keys(modalPlaybackState.openIds).length !== 0) return;
	var shouldResume = modalPlaybackState.resumeOnClose;
	modalPlaybackState.resumeOnClose = false;
	if (!shouldResume || !viewer_can_modal_pause_playback()) return;
	_replay_set_value(1, 0);
	if (typeof resume_viewer_main_loop === "function") resume_viewer_main_loop();
	if (typeof sync_viewer_runtime_state === "function") sync_viewer_runtime_state(true);
}

jQuery(document).ready( function($) {	

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
			case 19: // pause/break
				toggle_pause();
				return false;
			case 65: // a
				play_faster();
				return false;
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
			case 90: // z
				jump_seconds(-30);
				return false;
			case 88: // x
				jump_seconds(-10);
				return false;
			case 67: // c
				jump_seconds(10);
				return false;
			case 86: // v
				jump_seconds(30);
				return false;
			case 71: // g
				toggle_graphs(1);
				return false;
			case 74: // j
				if ($('#goto').is(':visible')) {
					$('#goto').foundation('close');
				} else {
					open_goto_modal();
				}
				return false;
			case 173: // -
			case 189: // -
				zoomOut();
				return false;
			case 61: // =
			case 187: // =
				zoomIn();
				return false;
			case 33: // PageUp
				load_previous_replay();
				return false;
			case 34: // PageDown
				load_next_replay();
				return false;
		}			
		return true;
	});
	
	$('#game-slider-handle').mousedown(function(){
	    remember_slider_pointer_position(arguments[0]);
	    if (typeof resume_viewer_main_loop === "function") {
	    	resume_viewer_main_loop();
	    }
	    isDown = true;
	});
	$('#game-slider').click(function(){
	    remember_slider_pointer_position(arguments[0]);
	    if (typeof resume_viewer_main_loop === "function") {
	    	resume_viewer_main_loop();
	    }
	    isClicked = true;
	});
	$(document).on('mousedown.info-bar-slider-drag mousemove.info-bar-slider-drag', function(event) {
		remember_slider_pointer_position(event);
	});

	$(document).mouseup(function(){
	    if(isDown){
	        isDown = false;
	        scrubPreviewFrame = null;
	        update_timer(_replay_get_value(2));
	    }
		if (isDraggingVolumeSlider) {
			isDraggingVolumeSlider = false;
			if (!$('.volume:hover').length) {
				hide_volume_slider();
			}
		}
	}); 
	$(window).on('blur.info-bar-slider-drag', function() {
		release_interrupted_slider_drag();
	});
	$(document).on('mouseout.info-bar-slider-drag', function(event) {
		if (event.relatedTarget || event.toElement) return;
		release_interrupted_slider_drag();
	});
	
	$(window).on('resize', function(){
		document.getElementById("canvas").innerWidth = window.innerWidth;
		document.getElementById("canvas").innerHeight = window.innerHeight - 147;
		apply_infobar_layout();
	});

	$('#rv_modal, #quick_help, #goto, #export_settings').on('open.zf.reveal', function() {
		handle_modal_open(this.id);
	});
	$('#rv_modal, #quick_help, #goto, #export_settings').on('closed.zf.reveal', function() {
		handle_modal_close(this.id);
	});

	$('#zoom-in').on('click', function() {
		zoomIn();
	})
	
	$('#zoom-out').on('click', function() {
		zoomOut();
	})
	
	$('#game-slider').on('moved.zf.slider', function() {
		if (isDown || isClicked) {
			if (typeof resume_viewer_main_loop === "function") {
				resume_viewer_main_loop();
			}
			var sliderValue = parseFloat(document.getElementById("sliderOutput").value);
			if (!Number.isFinite(sliderValue)) {
				isClicked = false;
				return;
			}
			var new_val = Math.max(0, Math.min(1, sliderValue / 200));
			scrubPreviewFrame = Math.round(_replay_get_value(4) * new_val);
			update_timer(_replay_get_value(2));
			_replay_set_value(6, new_val);
			if (isClicked) {
				setTimeout(function() {
					scrubPreviewFrame = null;
					update_timer(_replay_get_value(2));
				}, 0);
			}
			isClicked = false;
		}
	});
	
	$('#rv-rc-play').on('click', function() {
		
		toggle_pause();
	});
	
	$('#rv-rc-sound').on('click', function() {
		
		toggle_sound();
	});

	$('#rv-rc-observer').on('click', function() {
		toggle_observer();
	});
	$('#rv-rc-force-colors').on('click', function() {
		toggle_force_red_blue_colors();
	});

	$('#rv-rc-fow').on('click', function() {
		toggle_fow();
	});
	$('[id^="vision"]').on('click', function() {
		var playerIndex = parseInt(this.id.replace('vision', ''), 10) - 1;
		toggle_player_vision(playerIndex);
	});
	
	$('#rv-rc-faster').on('click', function() {
		
		play_faster();
	});

	$('#rv-rc-export').on('click', function() {
		if (exportState) {
			stop_video_export();
		} else {
			start_video_export();
		}
	});
	$('#rv-rc-copy-link').on('click', function() {
		copy_replay_link_for_current_frame();
	});
	$('#rv-rc-open-replay').on('click', function() {
		open_replay_picker();
	});
	$('#rv-rc-export-settings').on('click', function() {
		open_export_settings_modal();
	});
	$('#export-settings-reset').on('click', function() {
		reset_export_settings_to_defaults();
	});
	$('#audio-settings-reset').on('click', function() {
		reset_audio_settings_to_defaults();
	});
	$('#settings-tab-audio').on('click', function() {
		set_settings_modal_tab('audio');
	});
	$('#settings-tab-video').on('click', function() {
		set_settings_modal_tab('video');
	});
	$('#export-width, #export-height, #export-fps, #export-bitrate').on('input change', function() {
		save_export_settings_from_form();
	});
	['overall', 'combat', 'acknowledgements', 'music'].forEach(function(key) {
		$('#audio-' + key + '-toggle').on('click', function() {
			set_audio_setting_enabled(key, !current_audio_setting_state(key).enabled);
		});
		$('#audio-' + key + '-slider').on('pointerdown mousedown touchstart', function() {
			start_audio_slider_drag(key, this, arguments[0]);
		});
		$('#audio-' + key + '-slider').on('input', function() {
			var originalEvent = arguments[0].originalEvent || arguments[0];
			if (originalEvent && originalEvent.isTrusted !== false && should_ignore_native_audio_slider_input(key, this)) {
				this.value = audioSliderLastInputValue[key];
				return;
			}
			mark_audio_slider_input(key, this.value);
			set_audio_setting_level(key, this.value);
		});
		$('#audio-' + key + '-slider').on('change', function() {
			if (!audioSliderInputSeen[key]) {
				set_audio_setting_level(key, this.value);
			} else if (
				Object.prototype.hasOwnProperty.call(audioSliderLastInputValue, key) &&
				String(this.value) !== audioSliderLastInputValue[key]
			) {
				this.value = audioSliderLastInputValue[key];
			}
			finish_audio_slider_change(key);
		});
		$('#audio-' + key + '-slider').on('blur', function() {
			maybe_finish_audio_slider_change_after_blur(key);
		});
	});
	$('#playlist-prev').on('click', function() {
		load_previous_replay();
	});
	$('#playlist-next').on('click', function() {
		load_next_replay();
	});
	$('#rv-rc-next-embedded').on('click', function() {
		if (!embeddedReplayConfig.enabled || !embeddedReplayState.currentGameKey) return;
		embeddedReplayState.watchedKeys[embeddedReplayState.currentGameKey] = true;
		load_next_embedded_replay();
	});
	
	$('#rv-rc-slower').on('click', function() {
		
		play_slower();
	});
	
	$('#rv-rc-sound').mouseenter(function() {
		show_volume_slider();
	});
	$('.volume').mouseleave(function() {
		if (!isDraggingVolumeSlider) {
	    	hide_volume_slider();
		}
	});
	$('#volume-slider, #volume-slider-handle').on('mousedown', function() {
		remember_slider_pointer_position(arguments[0]);
		isDraggingVolumeSlider = true;
		show_volume_slider();
	});

	let volumeInitialized = false;
	$('#volume-slider').on('moved.zf.slider', function() {
		if (!volumeInitialized || isSyncingOverallVolumeSlider) return;

		var previousMuted = volumeSettings.muted;
		var nextLevel = document.getElementById("volumeOutput").value / 100;
		var nextMuted = previousMuted;
		if (nextLevel === 0) {
			nextMuted = true;
		} else if (isDraggingVolumeSlider) {
			nextMuted = false;
		}
		if (Math.abs(nextLevel - volumeSettings.level) < 0.0001 && nextMuted === volumeSettings.muted) {
			return;
		}
		apply_overall_volume_state(nextLevel, nextMuted);
	});

  // Perform initial volume setup
  // We do this with a setTimeout because the Foundation slider seems to be borked - it doesn't correctly set the handle position and
  // resets it if we do this too early
  $('#volumeOutput').val(Math.round(volumeSettings.level * 100));
  update_sound_button_state();
  populate_audio_settings_form();
  populate_export_settings_form();
  setTimeout(() => {
  	sync_audio_controls_ui();
  	apply_audio_settings_to_runtime();
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
	
	document.getElementById('graphs_tab').addEventListener('dragstart',drag_start,false);
document.getElementById("canvas").addEventListener('drop', drop, false);
update_army_tab([]);
hide_volume_slider();
update_observer_button();
update_fow_button();
update_force_red_blue_button();
  update_player_vision_buttons();
  update_zoom_buttons();
  apply_infobar_layout();
  })	

function zoomOut() {
	if (zoomLevel <= -4) return;
	var nextZoomLevel = zoomLevel - 1;
	if (!can_zoom_to(nextZoomLevel)) return;
	zoomLevel = nextZoomLevel;
	localStorage.zoomLevel = '' + zoomLevel;
	resize_canvas(Module.canvas);
	update_zoom_buttons();
}

function zoomIn() {
	if (zoomLevel >= 4) return;
	zoomLevel++;
	localStorage.zoomLevel = '' + zoomLevel;
	resize_canvas(Module.canvas);
	update_zoom_buttons();
}

var infoChart;

function toggle_graphs(tab_nr) {
	if (tab_nr === 1) {
		ensure_info_chart();
	}
	
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
	if (main_has_been_called) update_info_tab();
}

function apply_infobar_layout() {
	var container = document.querySelector('.infobar-container');
	var infobar = document.getElementById('infobar');
	var infoDock = document.getElementById('info-dock');
	var replayControl = document.querySelector('.replay-control');
	if (!container || !infobar) return;
	var hideOrder = ['hide-apm', 'hide-gas', 'hide-minerals', 'hide-army', 'hide-race', 'hide-workers', 'hide-supply'];
	var rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
	var widths = {
		vision: 2 * rootFontSize,
		race: 2.25 * rootFontSize,
		supply: 6.5 * rootFontSize,
		minerals: 4.75 * rootFontSize,
		gas: 3.75 * rootFontSize,
		workers: 4.25 * rootFontSize,
		army: 3.75 * rootFontSize,
		apm: 4.5 * rootFontSize
	};
	var preferredNameWidth = 224;
	var required_infobar_width = function() {
		var required = widths.vision + Math.min(preferredNameWidth, infobar.clientWidth || preferredNameWidth);
		if (!container.classList.contains('hide-race')) required += widths.race;
		if (!container.classList.contains('hide-supply')) required += widths.supply;
		if (!container.classList.contains('hide-minerals')) required += widths.minerals;
		if (!container.classList.contains('hide-gas')) required += widths.gas;
		if (!container.classList.contains('hide-workers')) required += widths.workers;
		if (!container.classList.contains('hide-army')) required += widths.army;
		if (!container.classList.contains('hide-apm')) required += widths.apm;
		return required;
	};
	var update_infobar_columns = function() {
		var infobarWidth = infobar.clientWidth || 0;
		var visibleStats = [];
		if (!container.classList.contains('hide-supply')) visibleStats.push(['supply', widths.supply]);
		if (!container.classList.contains('hide-minerals')) visibleStats.push(['minerals', widths.minerals]);
		if (!container.classList.contains('hide-gas')) visibleStats.push(['gas', widths.gas]);
		if (!container.classList.contains('hide-workers')) visibleStats.push(['workers', widths.workers]);
		if (!container.classList.contains('hide-army')) visibleStats.push(['army', widths.army]);
		if (!container.classList.contains('hide-apm')) visibleStats.push(['apm', widths.apm]);
		var fixedWidth = widths.vision + (container.classList.contains('hide-race') ? 0 : widths.race);
		var baseNameWidth = infobarWidth >= preferredNameWidth ? preferredNameWidth : Math.max(0, infobarWidth - fixedWidth);
		var baseVisibleWidth = baseNameWidth;
		for (var i = 0; i < visibleStats.length; ++i) {
			baseVisibleWidth += visibleStats[i][1];
		}
		var distributeCount = 1 + visibleStats.length;
		var spareWidth = Math.max(0, infobarWidth - fixedWidth - baseVisibleWidth);
		var sharedExtra = distributeCount ? Math.floor(spareWidth / distributeCount) : 0;
		var extraRemainder = distributeCount ? spareWidth % distributeCount : 0;
		var columns = [widths.vision + 'px'];
		if (!container.classList.contains('hide-race')) columns.push(widths.race + 'px');
		var nameWidth = baseNameWidth + sharedExtra + (extraRemainder > 0 ? 1 : 0);
		if (extraRemainder > 0) extraRemainder -= 1;
		columns.push('minmax(0, ' + nameWidth + 'px)');
		for (var j = 0; j < visibleStats.length; ++j) {
			var statWidth = visibleStats[j][1] + sharedExtra + (extraRemainder > 0 ? 1 : 0);
			if (extraRemainder > 0) extraRemainder -= 1;
			columns.push(statWidth + 'px');
		}
		infobar.style.setProperty('--infobar-columns', columns.join(' '));
	};

	var classes = ['hide-race', 'hide-apm', 'hide-army', 'hide-workers', 'hide-minerals', 'hide-gas', 'hide-supply', 'abbrev-names'];
	container.classList.remove('hide-info-dock');
	for (var i = 0; i < classes.length; ++i) {
		container.classList.remove(classes[i]);
	}

	var availableWidth = container.clientWidth;
	var minimumInfobarWidth = 500;
	var dockWidth = infoDock ? Math.ceil(infoDock.getBoundingClientRect().width || 760) : 760;
	var replayControlWidth = replayControl ? Math.ceil(replayControl.getBoundingClientRect().width || 224) : 224;
	if (availableWidth - dockWidth - replayControlWidth < minimumInfobarWidth) {
		container.classList.add('hide-info-dock');
	}

	if (window.innerWidth < 420) container.classList.add('abbrev-names');
	update_infobar_columns();

	for (var i = 0; i < hideOrder.length; ++i) {
		if (required_infobar_width() <= infobar.clientWidth && infobar.scrollWidth <= infobar.clientWidth) break;
		container.classList.add(hideOrder[i]);
		update_infobar_columns();
	}

	refresh_infobar_names();
	refresh_info_tab_scales();
}

function can_zoom_to(nextZoomLevel) {
	var canvasArea = document.getElementById('canvas-area');
	if (!canvasArea) return true;
	var unscaledSize = canvasArea.getBoundingClientRect();
	var scaledSize = current_scaled_render_size(unscaledSize.width, unscaledSize.height, nextZoomLevel);
	return can_allocate_render_surface(scaledSize.width, scaledSize.height);
}

function jump_seconds(seconds) {
	
	var frame = Math.max(0, _replay_get_value(2) + Math.round(fps * seconds));
	_replay_set_value(3, frame);
}

function apply_info_strip_scale(parent_element) {
	var element = parent_element && parent_element[0];
	if (!element) return;
	var visibleChildren = Array.prototype.filter.call(element.children, function(child) {
		return child.style.display !== 'none';
	});
	if (!visibleChildren.length) {
		element.setAttribute('data-scale', '1');
		element.style.removeProperty('--tile-width');
		element.style.removeProperty('--tile-height');
		element.style.removeProperty('--tile-image-height');
		element.style.removeProperty('--tile-bar-height');
		element.style.removeProperty('--tile-badge-font');
		element.style.removeProperty('--tile-badge-width');
		element.style.removeProperty('--tile-bar-max');
		return;
	}
	var availableWidth = Math.max(0, element.clientWidth || 0);
	var isArmyOrTech = /^(army|tech|upgrade)_tab_content/.test(element.id);
	var fullColumns = isArmyOrTech ? 5 : 10;
	var base = isArmyOrTech ? {
		width: 38,
		height: 38,
		imageHeight: 38,
		barHeight: 0,
		badgeFont: 0.65,
		badgeWidth: 0.9,
		barMax: 0
	} : {
		width: 36,
		height: 38,
		imageHeight: 33,
		barHeight: 5,
		badgeFont: 0.65,
		badgeWidth: 0.9,
		barMax: 36
	};
	var tileGap = 1;
	if (visibleChildren.length > fullColumns && visibleChildren.length < fullColumns * 2 && availableWidth > 0) {
		var dynamicWidth = Math.max(1, Math.floor((availableWidth - tileGap * (visibleChildren.length - 1)) / visibleChildren.length));
		var ratio = dynamicWidth / base.width;
		element.style.setProperty('--tile-width', dynamicWidth + 'px');
		element.style.setProperty('--tile-height', Math.max(1, Math.round(base.height * ratio)) + 'px');
		element.style.setProperty('--tile-image-height', Math.max(1, Math.round(base.imageHeight * ratio)) + 'px');
		element.style.setProperty('--tile-bar-height', Math.max(0, Math.round(base.barHeight * ratio)) + 'px');
		element.style.setProperty('--tile-badge-font', Math.max(0.34, base.badgeFont * ratio).toFixed(3) + 'rem');
		element.style.setProperty('--tile-badge-width', Math.max(0.45, base.badgeWidth * ratio).toFixed(3) + 'rem');
		element.style.setProperty('--tile-bar-max', Math.max(0, Math.round(base.barMax * ratio)) + 'px');
		element.setAttribute('data-scale', 'dynamic');
		return;
	}
	element.style.removeProperty('--tile-width');
	element.style.removeProperty('--tile-height');
	element.style.removeProperty('--tile-image-height');
	element.style.removeProperty('--tile-bar-height');
	element.style.removeProperty('--tile-badge-font');
	element.style.removeProperty('--tile-badge-width');
	element.style.removeProperty('--tile-bar-max');
	var scale = 4;
	var tileWidths = isArmyOrTech ? { 1: 38, 2: 18, 3: 12, 4: 9 } : { 1: 36, 2: 17, 3: 12, 4: 9 };
	if (availableWidth > 0) {
		[1, 2, 3, 4].some(function(candidate) {
			var rows = candidate === 1 ? 1 : candidate;
			var columns = Math.max(1, Math.floor((availableWidth + tileGap) / (tileWidths[candidate] + tileGap)));
			if (columns * rows >= visibleChildren.length) {
				scale = candidate;
				return true;
			}
			return false;
		});
	}
	element.setAttribute('data-scale', String(scale));
}

function refresh_info_tab_scales() {
	$('#info_tab .info_tab_content').each(function() {
		apply_info_strip_scale($(this));
	});
}

function jump_frames(frames) {
	
	var frame = Math.max(0, _replay_get_value(2) + frames);
	_replay_set_value(3, frame);
}

function open_goto_modal() {
	if (!$('#goto').data('goto-bindings-done')) {
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
		$('#goto').data('goto-bindings-done', true);
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
	if (current_speed <= 1 / 128) return;
	_replay_set_value(0, current_speed / 2);
	update_speed(current_speed / 2);
}

function update_observer_button() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._observer_get_value !== "function") {
		$('#rv-rc-observer').toggleClass('is-enabled', true);
		return;
	}
	$('#rv-rc-observer').toggleClass('is-enabled', _observer_get_value() !== 0);
}

function persist_viewer_toggle_settings() {
	localStorage.viewerToggleSettings = JSON.stringify(viewerToggleSettings);
}

function apply_persisted_viewer_toggle_settings() {
	if (!main_has_been_called || typeof Module === "undefined") return;
	if (typeof Module._observer_set_value === "function") {
		_observer_set_value(viewerToggleSettings.observerEnabled ? 1 : 0);
	}
	if (typeof Module._fog_of_war_set_value === "function") {
		_fog_of_war_set_value(viewerToggleSettings.fowEnabled ? 1 : 0);
	}
	if (typeof Module._force_red_blue_colors_set_value === "function") {
		_force_red_blue_colors_set_value(viewerToggleSettings.forceRedBlueEnabled ? 1 : 0);
	}
	update_observer_button();
	update_fow_button();
	update_force_red_blue_button();
	if (typeof sync_music_playback_state === "function") {
		sync_music_playback_state();
	}
}

function show_volume_slider() {
	$('#volume-slider-wrapper').css("display", "block");
	sync_overall_volume_slider_geometry();
	requestAnimationFrame(sync_overall_volume_slider_geometry);
}

function hide_volume_slider() {
	$('#volume-slider-wrapper').css("display", "none");
}

function update_zoom_buttons() {
	$('#zoom-in').toggleClass('zoom-active', zoomLevel > 0);
	$('#zoom-out').toggleClass('zoom-active', zoomLevel < 0);
}

function update_fow_button() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._fog_of_war_get_value !== "function") {
		$('#rv-rc-fow').toggleClass('is-enabled', true);
		return;
	}
	$('#rv-rc-fow').toggleClass('is-enabled', _fog_of_war_get_value() !== 0);
}

function update_force_red_blue_button() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._force_red_blue_colors_get_value !== "function") {
		$('#rv-rc-force-colors').toggleClass('is-enabled', false);
		return;
	}
	$('#rv-rc-force-colors').toggleClass('is-enabled', _force_red_blue_colors_get_value() !== 0);
}

function update_permalink_button(state) {
	if (!state && typeof get_viewer_runtime_state === "function") {
		state = get_viewer_runtime_state();
	}
	var enabled = !!(state && state.hasReplay && state.canCopyReplayLink);
	$('#rv-rc-copy-link').toggle(enabled);
}

function request_static_repaint_if_needed() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._ui_force_static_redraw !== "function" || typeof _replay_get_value !== "function") {
		return;
	}
	var endFrame = _replay_get_value(4);
	if (endFrame <= 0) return;
	var isPaused = _replay_get_value(1) === 1;
	var atOrPastEnd = _replay_get_value(2) >= endFrame;
	if (!isPaused && !atOrPastEnd) return;
	_ui_force_static_redraw();
}

function toggle_observer() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._observer_get_value !== "function" || typeof Module._observer_set_value !== "function") return;
	_observer_set_value(_observer_get_value() === 0 ? 1 : 0);
	viewerToggleSettings.observerEnabled = _observer_get_value() !== 0;
	persist_viewer_toggle_settings();
	update_observer_button();
	request_static_repaint_if_needed();
}

function toggle_fow() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._fog_of_war_get_value !== "function" || typeof Module._fog_of_war_set_value !== "function") return;
	_fog_of_war_set_value(_fog_of_war_get_value() === 0 ? 1 : 0);
	viewerToggleSettings.fowEnabled = _fog_of_war_get_value() !== 0;
	persist_viewer_toggle_settings();
	update_fow_button();
	update_player_vision_buttons();
	request_static_repaint_if_needed();
}

function toggle_force_red_blue_colors() {
	if (!main_has_been_called || typeof Module === "undefined" || typeof Module._force_red_blue_colors_get_value !== "function" || typeof Module._force_red_blue_colors_set_value !== "function") return;
	_force_red_blue_colors_set_value(_force_red_blue_colors_get_value() === 0 ? 1 : 0);
	viewerToggleSettings.forceRedBlueEnabled = _force_red_blue_colors_get_value() !== 0;
	persist_viewer_toggle_settings();
	update_force_red_blue_button();
	if (typeof update_info_bar === "function") {
		first_frame_played = false;
		update_info_bar(_replay_get_value(2));
	}
	request_static_repaint_if_needed();
}

function update_player_vision_buttons() {
	for (var i = 0; i < 12; ++i) {
		var button = $('#vision' + (i + 1));
		if (!button.length) continue;
		if (!main_has_been_called || typeof Module._fog_of_war_player_get_value !== "function" || i >= players.length) {
			button.hide();
			continue;
		}
		button.show();
		button.toggleClass('is-enabled', _fog_of_war_player_get_value(players[i]) !== 0);
	}
}

function toggle_player_vision(playerIndex) {
	if (!main_has_been_called || playerIndex < 0 || playerIndex >= players.length) return;
	if (typeof Module._fog_of_war_player_get_value !== "function" || typeof Module._fog_of_war_player_set_value !== "function") return;
	var player = players[playerIndex];
	var nextValue = _fog_of_war_player_get_value(player) === 0 ? 1 : 0;
	_fog_of_war_player_set_value(player, nextValue);
	update_player_vision_buttons();
}

async function copy_replay_link_for_current_frame() {
	if (!main_has_been_called || typeof _replay_get_value !== "function" || !currentReplaySourceUrl) return;
	var url = new URL(window.location.href);
	url.searchParams.set('rep', currentReplaySourceUrl);
	url.searchParams.set('frame', String(Math.max(0, Math.round(_replay_get_value(2)))));
	var text = url.toString();
	var copied = false;
	try {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
			copied = true;
		}
	} catch (error) {}
	if (!copied) {
		var textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', '');
		textarea.style.position = 'absolute';
		textarea.style.left = '-9999px';
		document.body.appendChild(textarea);
		textarea.select();
		copied = document.execCommand('copy');
		document.body.removeChild(textarea);
	}
	if (copied && typeof show_viewport_alert === "function") {
		show_viewport_alert('Link copied to clipboard', 5000);
	}
}

function toggle_sound() {
	apply_overall_volume_state(volumeSettings.level, !volumeSettings.muted);
}

function best_export_mime_type() {
	var config = current_export_settings();
	var mimeTypes = config.mimeTypes;
	for (var i = 0; i < mimeTypes.length; ++i) {
		if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeTypes[i])) {
			return mimeTypes[i];
		}
	}
	return '';
}

function set_export_button_state(isExporting) {
	$('#rv-rc-export').toggleClass('is-exporting', isExporting);
	$('#rv-rc-export-settings').prop('disabled', isExporting);
}

function download_export_blob(blob, startFrame, endFrame) {
	var url = URL.createObjectURL(blob);
	var link = document.createElement('a');
	var clipName = current_replay_player_names().join(' - ') + ', ' + format_clip_timestamp(startFrame) + ' - ' + format_clip_timestamp(endFrame);
	var safeClipName = clipName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'openbw-replay';
	var config = current_export_settings();
	var extension = config.extension;
	link.href = url;
	link.download = safeClipName + '.' + extension;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(function() {
		URL.revokeObjectURL(url);
	}, 1000);
}

function restore_export_state(saved) {
	if (typeof clear_export_render_size === "function") {
		clear_export_render_size();
		if (typeof resize_canvas === "function" && Module.canvas) {
			var restoreCanvasSize = function() {
				resize_canvas(Module.canvas);
			};
			if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
				window.requestAnimationFrame(restoreCanvasSize);
			} else {
				setTimeout(restoreCanvasSize, 0);
			}
		}
	}
	if (saved && typeof saved.speed !== 'undefined') {
		update_speed(saved.speed);
	}
	set_export_button_state(false);
	exportState = null;
}

function stop_video_export() {
	if (!exportState || !exportState.recorder) return;
	if (exportState.pollTimer) {
		clearInterval(exportState.pollTimer);
		exportState.pollTimer = null;
	}
	exportState.endFrame = _replay_get_value(2);
	if (exportState.recorder.state !== 'inactive') {
		exportState.recorder.stop();
	}
}

function start_video_export() {
	if (exportState || !main_has_been_called) return;
	var config = current_export_settings();
	var fps = config.fps;
	var replaySpeed = config.replaySpeed;
	var pollIntervalMs = config.pollIntervalMs;
	var videoBitsPerSecond = Math.round(config.videoBitrateMbps * 1000000);
	if (typeof MediaRecorder === "undefined" || !Module.canvas || typeof Module.canvas.captureStream !== "function") {
		print_to_modal("Video export unavailable", "This browser does not support canvas recording.");
		return;
	}

	if (typeof set_export_render_size === "function") {
		set_export_render_size(config.width, config.height);
		if (typeof resize_canvas === "function") {
			if (!resize_canvas(Module.canvas)) {
				clear_export_render_size();
				print_to_modal("Video export unavailable", "The selected render size is too large for the current browser memory budget.");
				return;
			}
		}
	}

	var mimeType = best_export_mime_type();
	var stream = Module.canvas.captureStream(fps);
	var chunks = [];
	var saved = {
		speed: _replay_get_value(0),
		startFrame: _replay_get_value(2)
	};

	set_export_button_state(true);

	var recorder;
	try {
		var recorderOptions = {};
		if (mimeType) recorderOptions.mimeType = mimeType;
		if (videoBitsPerSecond > 0) recorderOptions.videoBitsPerSecond = videoBitsPerSecond;
		recorder = Object.keys(recorderOptions).length ? new MediaRecorder(stream, recorderOptions) : new MediaRecorder(stream);
	} catch (error) {
		if (typeof clear_export_render_size === "function") {
			clear_export_render_size();
			if (typeof resize_canvas === "function") {
				resize_canvas(Module.canvas);
			}
		}
		set_export_button_state(false);
		print_to_modal("Video export unavailable", "Failed to initialize the browser recorder.");
		return;
	}

	exportState = {
		recorder: recorder,
		stream: stream,
		chunks: chunks,
		saved: saved,
		endFrame: saved.startFrame,
		pollTimer: null
	};

	recorder.ondataavailable = function(event) {
		if (event.data && event.data.size) {
			chunks.push(event.data);
		}
	};
	recorder.onerror = function() {
		if (!exportState) return;
		restore_export_state(exportState.saved);
		print_to_modal("Video export failed", "The browser recorder reported an error.");
	};
	recorder.onstop = function() {
		if (!exportState) return;
		var stoppedState = exportState;
		if (stoppedState.stream) {
			stoppedState.stream.getTracks().forEach(function(track) {
				track.stop();
			});
		}
		if (stoppedState.chunks.length) {
			download_export_blob(new Blob(stoppedState.chunks, { type: mimeType || 'video/webm' }), stoppedState.saved.startFrame, stoppedState.endFrame);
		}
		restore_export_state(stoppedState.saved);
	};

	recorder.start();
	if (_replay_get_value(1) !== 0) {
		_replay_set_value(1, 0);
	}
	update_speed(_replay_get_value(0));
}

function toggle_pause() {
	update_info_tab();
	_replay_set_value(1, (_replay_get_value(1) + 1)%2);
	if (typeof sync_viewer_runtime_state === "function") {
		sync_viewer_runtime_state();
	} else {
		update_play_pause_button();
	}
}

function ensure_paused() {
	_replay_set_value(1, 1);
	if (typeof sync_viewer_runtime_state === "function") {
		sync_viewer_runtime_state();
	} else {
		update_play_pause_button();
	}
}

function update_speed(speed) {
	document.getElementById("rv-rc-speed").innerHTML = "speed: " + Number(speed).toFixed(2) + "x";
}

function update_play_pause_button(state) {
	if (!state && typeof get_viewer_runtime_state === "function") {
		state = get_viewer_runtime_state();
	}
	var paused = !state ? (!main_has_been_called || _replay_get_value(1) !== 0) : (!state.hasReplay || state.isPaused);
	$('#rv-rc-play').toggleClass('rv-rc-play', paused);
	$('#rv-rc-play').toggleClass('rv-rc-pause', !paused);
}

var IMG_URL1 = "images/production_icons/icon ";
var IMG_URL2 = ".bmp";
function set_icon(tab_nr, parent_element, child_nr, icon_id, percentage, info, tooltip) {
	
	if (icon_id < 10) icon_id = "0" + icon_id;
	if (icon_id < 100) icon_id = "0" + icon_id;
	
	var img_src = IMG_URL1 + icon_id + IMG_URL2;
	while (parent_element.children("div").length <= child_nr) {
		parent_element.append('<div><img src="."><span></span><div class="prod_prog_bar"></div></div>');
	}
	var element = parent_element.children("div").eq(child_nr);
	var img_element = element.children("img");
	if (tab_nr === 2 && element.children("span").length === 0) {
		element.append('<span></span>');
	}
	
	if (img_element.attr("src").localeCompare(img_src) != 0) {
		img_element.attr("src", img_src);
	}
	img_element.attr("title", tooltip || "");
	img_element.attr("alt", tooltip || "");
	element.attr("title", tooltip || "");
	if (tab_nr == 2) {
		element.children("span").html(info);
		element.children("div").first().html("");
	} else {
		element.children("div").css("width", Math.round(percentage * 36) + "px");
	}
	if (tab_nr == 3) {
		element.children("span").html(info);
	}
	element.css("display", "inline-block");
}

function clear_icon(parent_element, child_nr) {
	
	var element = parent_element.children("div").eq(child_nr);
	if (element.length) {
		element.removeAttr("title");
		element.children("img").removeAttr("title").removeAttr("alt");
		element.hide();
	}
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
			
			set_icon(2, element, type_count, type, 1, count, display_name_for_icon('unit', type));
			++type_count;
		}
		for (var j = type_count; j < 20; j++) {
    		clear_icon(element, j);
    	}
    	apply_info_strip_scale(element);
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
				set_icon(4, element, index, complete[j].icon, 1, null, display_name_for_icon('tech', complete[j].id));
				index++;
			}
		}
		
		var incomplete = researches[i][2];
		for (var j = 0; j < incomplete.length; j++) {
			
			var build_percentage = 1 - incomplete[j].remaining_time / incomplete[j].total_time;
			set_icon(4, element, j + index, incomplete[j].icon, build_percentage, null, display_name_for_icon('tech', incomplete[j].id));
		}
		
		 //clear the unused spots
	    for (var j = incomplete.length + index; j < 20; ++j) {
	    	clear_icon(element, j);
	    }
	}
}

function update_tech_tab(upgrades, researches) {
	for (var i = 0; i < upgrades.length; i++) {
		var element = $('#upgrade_tab_content' + (i + 1));
		var slot = 0;
		var completeUpgrades = upgrades[i][1];
		for (var j = 0; j < completeUpgrades.length; j++) {
			var upgradeLevel = completeUpgrades[j].max_level && completeUpgrades[j].max_level <= 1 ? "" : completeUpgrades[j].level;
			set_icon(3, element, slot++, completeUpgrades[j].icon, 1, upgradeLevel, display_name_for_icon('upgrade', completeUpgrades[j].id));
		}

		var completeResearch = researches[i][1];
		for (var j = 0; j < completeResearch.length; j++) {
			if ($.inArray(completeResearch[j].id, unused_research) == -1) {
				set_icon(4, element, slot++, completeResearch[j].icon, 1, "", display_name_for_icon('tech', completeResearch[j].id));
			}
		}

		for (var j = slot; j < element.children("div").length; ++j) {
			clear_icon(element, j);
		}
		apply_info_strip_scale(element);
	}
}

function update_upgrades_tab(upgrades) {
	
	var element;
	for (var i = 0; i < upgrades.length; i++) {
		
		var upgrade_count = 1;
		var complete = upgrades[i][1];
		element = $('#upgrade_tab_content' + (i+1));
		
		for (var j = 0; j < complete.length; j++) {
			
			var completeLevel = complete[j].max_level && complete[j].max_level <= 1 ? "" : complete[j].level;
			set_icon(3, element, j, complete[j].icon, 1, completeLevel, display_name_for_icon('upgrade', complete[j].id));
		}
		
		var incomplete = upgrades[i][2];
		for (var j = 0; j < incomplete.length; j++) {
			
			var build_percentage = 1 - incomplete[j].remaining_time / incomplete[j].total_time;
			var incompleteLevel = incomplete[j].max_level && incomplete[j].max_level <= 1 ? "" : incomplete[j].level;
			set_icon(3, element, j + complete.length, incomplete[j].icon, build_percentage, incompleteLevel, display_name_for_icon('upgrade', incomplete[j].id));
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

function update_production_tab(incomplete_units, upgrades, researches) {
	
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
		
		unit_names[u.owner].push([t, build_percentage, display_name_for_icon('unit', t)]);
	}

	if (upgrades) {
		for (var i = 0; i < upgrades.length; ++i) {
			var incompleteUpgrades = upgrades[i][2];
			for (var j = 0; j < incompleteUpgrades.length; ++j) {
				var upgradeProgress = 1 - incompleteUpgrades[j].remaining_time / incompleteUpgrades[j].total_time;
				unit_names[upgrades[i][0]].push([incompleteUpgrades[j].icon, upgradeProgress, display_name_for_icon('upgrade', incompleteUpgrades[j].id)]);
			}
		}
	}

	if (researches) {
		for (var i = 0; i < researches.length; ++i) {
			var incompleteResearch = researches[i][2];
			for (var j = 0; j < incompleteResearch.length; ++j) {
				if ($.inArray(incompleteResearch[j].id, unused_research) == -1) {
					var researchProgress = 1 - incompleteResearch[j].remaining_time / incompleteResearch[j].total_time;
					unit_names[researches[i][0]].push([incompleteResearch[j].icon, researchProgress, display_name_for_icon('tech', incompleteResearch[j].id)]);
				}
			}
		}
	}
	
	var element;
    for (var i = 0; i < players.length; ++i) {
        
    	element = $('#production_tab_content' + (i + 1));
    	
    	//fill the spots with all units in production for current player
	    for (var j = 0; j != unit_names[players[i]].length; ++j) {
	    	
	    	set_icon(1, element, j, unit_names[players[i]][j][0], unit_names[players[i]][j][1], null, unit_names[players[i]][j][2]);
	    }
	    
	    //clear the unused spots
	    for (var j = unit_names[players[i]].length; j < 100; ++j) {
	    	clear_icon(element, j);
	    }
	    apply_info_strip_scale(element);
    }
}

function update_timer(frame) {
	var displayFrame = scrubPreviewFrame !== null ? scrubPreviewFrame : frame;
	if (!Number.isFinite(displayFrame)) displayFrame = 0;
	var sec_num = displayFrame  * 42 / 1000;
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
	var timerElement = document.getElementById("rv-rc-timer");
	timerElement.innerHTML = "time: " + time;
	timerElement.title = "Frame " + displayFrame;
	timerElement.classList.toggle("scrub-preview", scrubPreviewFrame !== null);
	
	$("#goto-frame-value").val(displayFrame);
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
	document.getElementById("map1").dataset.fullName = name;
	document.getElementById("map2").dataset.fullName = name;
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
	var forcedRedBlue = main_has_been_called && typeof Module._force_red_blue_colors_get_value === "function" && _force_red_blue_colors_get_value() !== 0 && players.length === 2;
	if (forcedRedBlue) {
		if (player === 1) rgb_color = "rgba(244, 4, 4, 1)";
		else if (player === 2) rgb_color = "rgba(12, 72, 204, 1)";
	}
	// infoChart.data.datasets[(player-1) * 4].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 1].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 1].backgroundColor = rgb_color.replace(/[\d\.]+\)$/g, '0.1)');
	// infoChart.data.datasets[(player-1) * 4 + 2].borderColor = rgb_color;
	// infoChart.data.datasets[(player-1) * 4 + 3].borderColor = rgb_color;
	
	$('.player_color' + player).css('border-color', rgb_color);
}

function set_nick(player, nick) {
	var element = document.getElementById("nick" + player);
	element.dataset.fullName = nick;
	element.innerHTML = nick;
	refresh_infobar_names();
}

function abbreviate_name(name) {
	if (!name) return "";
	if (name.length <= 8) return name;
	return name.slice(0, 7) + ".";
}

function refresh_infobar_names() {
	var container = document.querySelector('.infobar-container');
	if (!container) return;
	var abbreviate = container.classList.contains('abbrev-names');
	for (var i = 1; i <= 8; ++i) {
		var nickElement = document.getElementById("nick" + i);
		if (nickElement && nickElement.dataset.fullName) {
			nickElement.innerHTML = abbreviate ? abbreviate_name(nickElement.dataset.fullName) : nickElement.dataset.fullName;
		}
	}
	var map1 = document.getElementById("map1");
	var map2 = document.getElementById("map2");
	if (map1 && map1.dataset.fullName) map1.innerHTML = abbreviate ? abbreviate_name(map1.dataset.fullName) : map1.dataset.fullName;
	if (map2 && map2.dataset.fullName) map2.innerHTML = abbreviate ? abbreviate_name(map2.dataset.fullName) : map2.dataset.fullName;
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
