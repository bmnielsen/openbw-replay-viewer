const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const launcherSource = fs.readFileSync(
  path.join(__dirname, "..", "www", "launcher.js"),
  "utf8",
);

async function runLauncher(args) {
  let replacedUrl = "";
  let hydrated = false;
  const context = {
    DesktopSettingsPersistence: {
      async hydrate() {
        hydrated = true;
      },
    },
    document: {
      getElementById() {
        return { set textContent(_value) {} };
      },
    },
    Neutralino: {
      init() {},
    },
    window: {
      NL_ARGS: args,
      location: {
        replace(value) {
          replacedUrl = value;
        },
      },
    },
  };

  vm.runInNewContext(launcherSource, context);
  await new Promise((resolve) => setImmediate(resolve));
  return { hydrated, replacedUrl };
}

test("opens the bundled viewer through Neutralino's resource server", async () => {
  const result = await runLauncher(["replay-viewer-desktop.exe"]);

  assert.equal(result.hydrated, true);
  assert.equal(result.replacedUrl, "/viewer/index.html?desktop=1");
});

test("passes an associated replay as a local filesystem path", async () => {
  const replayPath = "E:\\Replays\\A match #1.rep";

  const result = await runLauncher(["replay-viewer-desktop.exe", replayPath]);

  assert.equal(result.hydrated, true);
  assert.equal(
    result.replacedUrl,
    "/viewer/index.html?desktop=1&desktopReplayPath=" +
      encodeURIComponent(replayPath),
  );
});
