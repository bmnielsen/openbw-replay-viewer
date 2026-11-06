const fs = require("node:fs");
const path = require("node:path");

async function verifyWindowsMetadata(executable, expectedName) {
  // Use the same PE resource readers as the locked Neutralino build tool.
  const { NtExecutable, NtExecutableResource } = await import("pe-library");
  const { Resource } = await import("resedit");
  const exe = NtExecutable.from(fs.readFileSync(executable));
  const resources = NtExecutableResource.from(exe);
  const versions = Resource.VersionInfo.fromEntries(resources.entries);
  let checked = 0;
  for (const version of versions) {
    for (const language of version.getAllLanguagesForStringValues()) {
      const values = version.getStringValues(language);
      for (const field of ["FileDescription", "ProductName"]) {
        if (values[field] !== expectedName) {
          throw new Error(`${path.basename(executable)} ${field}: expected ${JSON.stringify(expectedName)}, got ${JSON.stringify(values[field])}`);
        }
      }
      checked++;
    }
  }
  if (!checked) throw new Error("Windows executable has no display-name metadata");
  return checked;
}

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const config = require(path.join(root, "neutralino.config.json"));
  const executable = path.join(root, "dist", config.cli.binaryName, `${config.cli.binaryName}-win_x64.exe`);
  verifyWindowsMetadata(executable, config.modes.window.title).then(() => {
    console.log(`Verified Windows executable display name: ${config.modes.window.title}`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { verifyWindowsMetadata };
