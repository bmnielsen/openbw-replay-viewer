const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const asar = require("@electron/asar");

function verifyBundle(root = path.resolve(__dirname, "..")) {
  const repo = path.resolve(root, "..");
  const archive = path.join(root, "dist/replay-viewer-desktop/resources.neu");
  const { header, headerSize } = asar.getRawHeader(archive);
  const tracked = execFileSync("git", ["ls-files", "-z", "docs", "desktop/www"], { cwd: repo })
    .toString().split("\0").filter(Boolean);
  const files = tracked.filter(file => file.startsWith("docs/") && !file.endsWith(".rep"));
  const expected = new Set(["neutralino.config.json", "www/neutralino.js",
    ...tracked.filter(file => file.startsWith("desktop/www/")).map(file => file.slice("desktop/".length)),
    ...files.map(file => "www/viewer/" + file.slice("docs/".length))]);
  function checkEntries(node, prefix) {
    for (const [name, entry] of Object.entries(node.files || {})) {
      const file = prefix + name;
      if (entry.files) checkEntries(entry, file + "/");
      else if (!expected.has(file)) throw new Error(`Unexpected bundled file: ${file}`);
    }
  }
  checkEntries(header, "");
  const fd = fs.openSync(archive, "r");
  let count = 0;
  try {
    for (const file of files) {
      const source = path.join(repo, file);
      if (!fs.statSync(source).isFile()) continue;
      // Walk archive components explicitly: packages built on Linux must also
      // be verifiable on Windows, whose native path separator differs.
      let entry = header;
      for (const part of ("www/viewer/" + file.slice(5)).split("/")) {
        entry = entry?.files?.[part];
      }
      if (!entry || entry.offset === undefined) throw new Error(`Missing bundled web asset: ${file}`);
      const bundled = Buffer.alloc(entry.size);
      fs.readSync(fd, bundled, 0, entry.size, 8 + headerSize + Number(entry.offset));
      if (!bundled.equals(fs.readFileSync(source))) {
        throw new Error(`Desktop bundle differs from local web asset: ${file}`);
      }
      count++;
    }
  } finally { fs.closeSync(fd); }
  if (!count) throw new Error("No web assets were verified");
  return count;
}

if (require.main === module) {
  console.log(`Verified ${verifyBundle()} bundled assets match the local web viewer.`);
}
module.exports = { verifyBundle };
