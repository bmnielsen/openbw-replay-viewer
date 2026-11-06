const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..", "..");
const downloadSource = fs.readFileSync(
  path.join(repoRoot, "docs", "v1.4", "replay-download.js"),
  "utf8",
);

test("downloads the current replay with its original filename", () => {
  const links = [];
  const revokedUrls = [];
  const context = {
    Blob,
    URL: {
      createObjectURL(blob) {
        assert.equal(blob.size, 4);
        return "blob:current-replay";
      },
      revokeObjectURL(url) {
        revokedUrls.push(url);
      },
    },
    document: {
      body: {
        appendChild(link) {
          links.push(link);
        },
      },
      createElement(tagName) {
        assert.equal(tagName, "a");
        return {
          clickCalled: false,
          click() {
            this.clickCalled = true;
          },
          remove() {},
          style: {},
        };
      },
    },
    setTimeout(callback) {
      callback();
    },
  };
  context.window = context;
  vm.runInNewContext(downloadSource, context);

  context.ReplayDownload.setSource(new Uint8Array([1, 2, 3, 4]), "C:\\Replays\\Match #1.rep");

  assert.equal(context.ReplayDownload.downloadCurrent(), true);
  assert.equal(links.length, 1);
  assert.equal(links[0].download, "Match #1.rep");
  assert.equal(links[0].href, "blob:current-replay");
  assert.equal(links[0].clickCalled, true);
  assert.deepEqual(revokedUrls, ["blob:current-replay"]);
});

test("places Open and Download on top and Settings below Snip", () => {
  const html = fs.readFileSync(path.join(repoRoot, "docs", "index.html"), "utf8");
  const css = fs.readFileSync(path.join(repoRoot, "docs", "foundation.css"), "utf8");
  const infoBar = fs.readFileSync(
    path.join(repoRoot, "docs", "v1.4", "info-bar.js"),
    "utf8",
  );

  assert.match(html, /id="rv-rc-download-replay"[^>]+title="Download replay"/);
  assert.match(html, /src="v1\.4\/replay-download\.js\?ver=1\.4\.0"/);
  assert.match(
    infoBar,
    /\$\('#rv-rc-download-replay'\)\.on\('click',[\s\S]*ReplayDownload\.downloadCurrent\(\)/,
  );
  assert.match(css, /\.rv-rc-download-replay::before\s*{[^}]*content:\s*"\\f019"/s);
  assert.match(css, /#rv-rc-open-replay\s*{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1;/s);
  assert.match(css, /#rv-rc-download-replay\s*{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1;/s);
  assert.match(css, /#rv-rc-export\s*{[^}]*grid-column:\s*2;[^}]*grid-row:\s*2;/s);
  assert.match(css, /#rv-rc-export-settings\s*{[^}]*grid-column:\s*2;[^}]*grid-row:\s*3;/s);
});

test("captures replay bytes from file, URL, and desktop load paths", () => {
  const startSource = fs.readFileSync(
    path.join(repoRoot, "docs", "v1.4", "start.js"),
    "utf8",
  );
  const calls = startSource.match(/ReplayDownload\.setSource/g) || [];

  assert.equal(calls.length, 3);
});
