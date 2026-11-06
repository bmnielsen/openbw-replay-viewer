const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const asar = require("@electron/asar");
const { verifyBundle } = require("../scripts/verify-bundle");

test("bundle verification accepts matching assets and rejects stale or missing assets", async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "viewer-bundle-"));
  try {
    const desktop = path.join(repo, "desktop");
    const dist = path.join(desktop, "dist/replay-viewer-desktop");
    const input = path.join(repo, "input");
    fs.mkdirSync(path.join(repo, "docs"), { recursive: true });
    fs.mkdirSync(path.join(input, "www/viewer"), { recursive: true });
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(path.join(repo, "docs/index.html"), "current");
    fs.writeFileSync(path.join(input, "www/viewer/index.html"), "current");
    execFileSync("git", ["init", "-q"], { cwd: repo });
    execFileSync("git", ["add", "docs"], { cwd: repo });
    await asar.createPackage(input, path.join(dist, "resources.neu"));
    assert.equal(verifyBundle(desktop), 1);
    fs.writeFileSync(path.join(repo, "docs/index.html"), "newer");
    assert.throws(() => verifyBundle(desktop), /differs.*docs\/index.html/);
    fs.writeFileSync(path.join(repo, "docs/another.js"), "new");
    execFileSync("git", ["add", "docs"], { cwd: repo });
    assert.throws(() => verifyBundle(desktop), /Missing bundled web asset/);
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});
