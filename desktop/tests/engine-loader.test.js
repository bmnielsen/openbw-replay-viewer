const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loader() {
  const canvas = {};
  const context = vm.createContext({
    Uint8Array, Int8Array, DataView, Promise, console,
    document: { getElementById: () => canvas },
    createClassicReplayEngine: config => {
      config._load_replay = () => {};
      config.UTF8ToString = () => "text";
      queueMicrotask(() => config.onRuntimeInitialized.call(config));
      return config;
    }
  });
  context.window = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../docs/v1.4/engine-loader.js"), "utf8"), context);
  return context;
}

function replay(magic = 0x53526572, zlibHeader = false) {
  const result = new Uint8Array(40);
  new DataView(result.buffer).setUint32(12, magic, true);
  result[28] = zlibHeader ? 0x78 : 0;
  result[29] = zlibHeader ? 0x9c : 4;
  return result;
}

test("selects classic, early zlib and modern Remastered replay formats", async () => {
  const context = loader();
  await context.replayEngineReady;
  assert.equal(context.replay_engine_format(replay()), "classic");
  assert.equal(context.replay_engine_format(replay(0x53526572, true)), "remastered");
  assert.equal(context.replay_engine_format(replay(0x53526573)), "remastered");
  const padded = new Uint8Array(60);
  padded.set(replay(0x53526573), 7);
  assert.equal(context.replay_engine_format(padded.subarray(7, 47)), "remastered");
  assert.throws(() => context.replay_engine_format(new Uint8Array(4)), /too short/);
  assert.throws(() => context.replay_engine_format(replay(123)), /Not a StarCraft replay/);
});

test("exposes the active runtime exports and keeps same-format loads in that runtime", async () => {
  const context = loader();
  await context.replayEngineReady;
  const runtime = context.Module;
  assert.equal(context._load_replay, runtime._load_replay);
  assert.equal(context.UTF8ToString, runtime.UTF8ToString);
  assert.equal(runtime.locateFile("openbw.wasm"), "v1.4/openbw.wasm");
  await context.prepare_replay_engine(replay());
  assert.equal(context.Module, runtime);
});
