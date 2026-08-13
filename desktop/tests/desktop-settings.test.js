const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const bridgeSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "desktop-settings.js"),
  "utf8",
);

class FakeStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }

  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

function createBridge(savedSettings, options = {}) {
  const createdDirectories = [];
  const nativeWrites = [];
  const eventHandlers = {};
  let exited = false;
  const localStorage = new FakeStorage({
    exportSettings: "stale",
    unrelated: "preserved",
  });
  const context = {
    console,
    localStorage,
    NL_DATAPATH: "C:/Users/test/AppData/Roaming/io.github.dgant.replayviewer",
    Storage: FakeStorage,
    Neutralino: {
      app: {
        async exit() {
          exited = true;
        },
      },
      events: {
        on(name, handler) {
          eventHandlers[name] = handler;
        },
      },
      filesystem: {
        async createDirectory(directory) {
          createdDirectories.push(directory);
        },
        async getStats() {
          if (options.storageDirectoryMissing) {
            throw { code: "NE_FS_NOPATHE" };
          }
          return { isDirectory: true };
        },
      },
      init() {},
      storage: {
        async getData() {
          return JSON.stringify(savedSettings);
        },
        async getKeys() {
          return ["replayViewerSettings"];
        },
        async setData(key, data) {
          nativeWrites.push({ key, data });
        },
      },
    },
  };
  context.window = context;
  vm.runInNewContext(bridgeSource, context);
  return {
    context,
    createdDirectories,
    eventHandlers,
    hasExited: () => exited,
    localStorage,
    nativeWrites,
  };
}

test("creates the system storage directory on the first launch", async () => {
  const bridge = createBridge({}, { storageDirectoryMissing: true });

  await bridge.context.DesktopSettingsPersistence.hydrate();

  assert.deepEqual(bridge.createdDirectories, [
    "C:/Users/test/AppData/Roaming/io.github.dgant.replayviewer/.storage",
  ]);
});

test("hydrates desktop settings without touching unrelated browser data", async () => {
  const bridge = createBridge({
    settingsModalTab: "audio",
    volumeSettings: '{"level":0.25,"muted":false}',
  });

  await bridge.context.DesktopSettingsPersistence.hydrate();

  assert.equal(bridge.localStorage.getItem("exportSettings"), null);
  assert.equal(bridge.localStorage.getItem("settingsModalTab"), "audio");
  assert.equal(
    bridge.localStorage.getItem("volumeSettings"),
    '{"level":0.25,"muted":false}',
  );
  assert.equal(bridge.localStorage.getItem("unrelated"), "preserved");
});

test("persists changes immediately and flushes before closing", async () => {
  const bridge = createBridge({});
  await bridge.context.DesktopSettingsPersistence.hydrate();
  bridge.context.DesktopSettingsPersistence.start();

  bridge.localStorage.setItem("zoomLevel", "3");
  await bridge.context.DesktopSettingsPersistence.flush();

  const persisted = JSON.parse(bridge.nativeWrites.at(-1).data);
  assert.equal(persisted.zoomLevel, "3");

  await bridge.eventHandlers.windowClose();
  assert.equal(bridge.hasExited(), true);
});
