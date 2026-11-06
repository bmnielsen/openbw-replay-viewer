const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const config = require("../neutralino.config.json");
const { verifyWindowsMetadata } = require("../scripts/verify-windows-metadata");
const displayName = "StarCraft Replay Viewer";

test("desktop display names agree without changing persistent identity or executable paths", () => {
  assert.equal(config.applicationName, displayName);
  assert.equal(config.description, displayName);
  assert.equal(config.modes.window.title, displayName);
  assert.equal(config.applicationId, "io.github.dgant.replayviewer");
  assert.equal(config.cli.binaryName, "replay-viewer-desktop");
  const launcher = fs.readFileSync(path.join(__dirname, "../www/index.html"), "utf8");
  assert.ok(launcher.includes(`<title>${displayName}</title>`));
});

test("Windows metadata verification rejects generic or missing names", async () => {
  const { NtExecutable, NtExecutableResource } = await import("pe-library");
  const { Resource } = await import("resedit");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "viewer-name-"));
  const executable = path.join(directory, "viewer.exe");
  try {
    for (const values of [
      {},
      { FileDescription: "A Neutralinojs application", ProductName: displayName },
      { FileDescription: displayName, ProductName: "replay-viewer-desktop" },
      { FileDescription: displayName, ProductName: displayName }
    ]) {
      const exe = NtExecutable.createEmpty(true);
      const resources = NtExecutableResource.from(exe);
      const version = Resource.VersionInfo.createEmpty();
      version.setStringValues({ lang: 1033, codepage: 1200 }, values);
      version.outputToResourceEntries(resources.entries);
      resources.outputResource(exe);
      fs.writeFileSync(executable, Buffer.from(exe.generate()));
      if (values.FileDescription === displayName && values.ProductName === displayName) {
        assert.equal(await verifyWindowsMetadata(executable, displayName), 1);
      } else {
        await assert.rejects(verifyWindowsMetadata(executable, displayName), /expected|no display-name metadata/);
      }
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
