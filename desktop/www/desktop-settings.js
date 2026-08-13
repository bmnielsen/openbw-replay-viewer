(function(global) {
  const STORAGE_KEY = "replayViewerSettings";
  const SETTING_KEYS = [
    "audioCategorySettings",
    "exportSettings",
    "settingsModalTab",
    "viewerToggleSettings",
    "volumeSettings",
    "zoomLevel",
  ];

  let started = false;
  let lastQueuedSnapshot = "";
  let writeChain = Promise.resolve();

  function captureSettings() {
    const settings = {};
    for (const key of SETTING_KEYS) {
      const value = global.localStorage.getItem(key);
      if (value !== null) settings[key] = value;
    }
    return settings;
  }

  function serializedSettings() {
    return JSON.stringify(captureSettings());
  }

  async function ensureStorageDirectory() {
    const storageDirectory = NL_DATAPATH + "/.storage";
    try {
      const stats = await Neutralino.filesystem.getStats(storageDirectory);
      if (!stats.isDirectory) {
        throw new Error("Desktop settings storage path is not a directory");
      }
    } catch (error) {
      if (!error || error.code !== "NE_FS_NOPATHE") throw error;
      await Neutralino.filesystem.createDirectory(storageDirectory);
    }
  }

  async function hydrate() {
    Neutralino.init();
    await ensureStorageDirectory();
    const storedKeys = await Neutralino.storage.getKeys();
    if (!storedKeys.includes(STORAGE_KEY)) {
      const initialSnapshot = serializedSettings();
      await Neutralino.storage.setData(STORAGE_KEY, initialSnapshot);
      lastQueuedSnapshot = initialSnapshot;
      return;
    }

    const savedSettings = JSON.parse(
      await Neutralino.storage.getData(STORAGE_KEY),
    );
    for (const key of SETTING_KEYS) {
      global.localStorage.removeItem(key);
      if (Object.prototype.hasOwnProperty.call(savedSettings, key)) {
        global.localStorage.setItem(key, savedSettings[key]);
      }
    }
    lastQueuedSnapshot = serializedSettings();
  }

  function queueCurrentSettings() {
    const snapshot = serializedSettings();
    if (snapshot === lastQueuedSnapshot) return writeChain;
    lastQueuedSnapshot = snapshot;
    writeChain = writeChain
      .then(function() {
        return Neutralino.storage.setData(STORAGE_KEY, snapshot);
      })
      .catch(function(error) {
        lastQueuedSnapshot = "";
        console.error("Failed to persist desktop viewer settings", error);
      });
    return writeChain;
  }

  function start() {
    if (started) return;
    started = true;
    Neutralino.init();
    lastQueuedSnapshot = serializedSettings();

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (this === global.localStorage && SETTING_KEYS.includes(String(key))) {
        queueCurrentSettings();
      }
    };
    Storage.prototype.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (this === global.localStorage && SETTING_KEYS.includes(String(key))) {
        queueCurrentSettings();
      }
    };

    Neutralino.events.on("windowClose", async function() {
      await queueCurrentSettings();
      await Neutralino.app.exit();
    });
  }

  global.DesktopSettingsPersistence = {
    hydrate: hydrate,
    start: start,
    flush: queueCurrentSettings,
  };
})(window);
