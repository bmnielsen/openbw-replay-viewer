var activeReplayEngine = null;
var replayEngineReady;
var replayLoadQueue = Promise.resolve();
var remasteredTerrainPromise;
var remasteredFactoryPromise;

function replay_engine_format(bytes) {
    if (bytes.length < 30) throw new Error("Replay file is too short");
    var data = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var magic = new DataView(data.buffer, data.byteOffset).getUint32(12, true);
    if (magic !== 0x53526572 && magic !== 0x53526573) throw new Error("Not a StarCraft replay");
    return magic === 0x53526573 || (data[28] === 0x78 && (data[28] * 256 + data[29]) % 31 === 0)
        ? "remastered" : "classic";
}

function initialize_replay_engine(format, factory) {
    var canvas = document.getElementById("canvas");
    return new Promise(function(resolve, reject) {
        Module = factory({
            canvas: canvas,
            print: console.log,
            printErr: console.error,
            setWindowTitle: function() { document.title = window.OPENBW_WINDOW_TITLE || "StarCraft Replay Viewer"; },
            locateFile: function(name) {
                return "v1.4/" + (format === "remastered" ? "remastered/" : "") + name;
            },
            onAbort: function(reason) { reject(new Error(String(reason))); },
            onRuntimeInitialized: function() {
                Module = this;
                Module.replayFormat = format;
                Object.keys(Module).forEach(function(name) {
                    if (name[0] === "_" && typeof Module[name] === "function") window[name] = Module[name];
                });
                window.UTF8ToString = Module.UTF8ToString;
                activeReplayEngine = format;
                resolve();
            }
        });
    });
}

function get_remastered_factory() {
    if (!remasteredFactoryPromise) {
        remasteredFactoryPromise = new Promise(function(resolve, reject) {
            var script = document.createElement("script");
            script.src = "v1.4/remastered/openbw.js";
            script.onload = function() { resolve(createRemasteredReplayEngine); };
            script.onerror = function() { reject(new Error("Could not load the Remastered engine")); };
            document.head.appendChild(script);
        }).catch(function(error) { remasteredFactoryPromise = null; throw error; });
    }
    return remasteredFactoryPromise;
}

async function prepare_replay_engine(bytes) {
    await replayEngineReady;
    var format = replay_engine_format(bytes);
    if (format === activeReplayEngine) return;
    var factory = createClassicReplayEngine;
    if (format === "remastered") {
        factory = await get_remastered_factory();
        if (!remasteredTerrainPromise) {
            remasteredTerrainPromise = fetch(C_MPQ_BASE_URL + "/remastered/terrain.mpq")
                .then(function(response) {
                    if (!response.ok) throw new Error("Could not load Remastered terrain: " + response.status);
                    return response.blob();
                }).catch(function(error) { remasteredTerrainPromise = null; throw error; });
        }
        files[3] = await remasteredTerrainPromise;
    }
    var buffers = await Promise.all(files.slice(0, format === "remastered" ? 4 : 3)
        .map(function(file) { return file.arrayBuffer(); }));
    if (main_has_been_called) {
        Module.set_volume(0);
        Module.disposeReplayEngine();
    }
    main_has_been_called = false;
    viewerMainLoopPausedForIdle = false;
    js_read_buffers = buffers.map(function(buffer) { return new Int8Array(buffer); });
    replayEngineReady = initialize_replay_engine(format, factory);
    await replayEngineReady;
}

function load_replay_bytes(bytes) {
    replayLoadQueue = replayLoadQueue.then(async function() {
        await prepare_replay_engine(bytes);
        var buffer = allocate_replay_buffer(bytes);
        try { start_replay(buffer, bytes.length); }
        finally { _free(buffer); }
    }).catch(function(error) {
        handle_replay_error(error.message || String(error));
    });
    return replayLoadQueue;
}

function handle_replay_error(message) {
    if (main_has_been_called) {
        Module.set_volume(0);
        Module.disposeReplayEngine();
    }
    main_has_been_called = false;
    activeReplayEngine = null;
    replayEngineReady = Promise.resolve();
    reset_playback_state_monitor();
    stop_music_playback();
    reset_pregame_dropzone();
    reveal_pregame_homepage();
    document.body.classList.add("pregame-active");
    document.getElementById("pregame-overlay").style.display = "grid";
    var dropzone = document.querySelector(".pregame-dropzone");
    var previous = dropzone.querySelector(".replay-load-error");
    if (previous) previous.remove();
    var error = document.createElement("div");
    error.className = "replay-load-error";
    error.setAttribute("role", "alert");
    if (message === "ComputerAI" || message === "AIPatrol") message = "Built-in AI is not supported.";
    if (message === "disable thingy unit") message = "This custom map uses an unsupported trigger.";
    error.textContent = "Could not play replay: " + message;
    dropzone.prepend(error);
    if (embeddedReplayConfig.enabled) abort_embedded_replay_load();
}

replayEngineReady = initialize_replay_engine("classic", createClassicReplayEngine);
