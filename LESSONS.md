# Lessons

- A Neutralino application should keep bundled pages on its local resource
  server. Navigating from that origin to a `file://` viewer can be blocked by
  the embedded webview and also prevents reliable loading of WASM and other
  bundled resources.
- Local replay files should be passed as encoded filesystem paths and read
  through Neutralino's allow-listed filesystem API. A `file://` URL is not a
  reliable substitute for native file access in a webview.
- Neutralino's random local-server port gives the webview a different browser
  origin on later launches, so `localStorage` alone cannot provide desktop
  persistence. Hydrate it from Neutralino system storage before viewer startup
  and mirror setting writes back through the native API.
- On Windows, Neutralino system storage may not create its `.storage` directory
  before the first read, while creating an existing directory is also an error.
  Stat the directory and create it only when it is missing.
- On Windows-mounted filesystems, replacing the contents of a synchronized
  directory is more reliable than deleting and recreating the directory itself.
- Neutralino CLI 11.7.2 currently carries a high-severity denial-of-service
  advisory through its build-only glob stack. The affected code is not shipped
  in the application and receives only repository-controlled build paths, so
  install-time audit noise is disabled in `desktop/.npmrc` until Neutralino
  updates that dependency chain.

- Windows may select either `rep_auto_file` or the executable's Applications ProgID for `.rep` through protected UserChoice. Repair both viewer registrations when relocating a build, notify Explorer, and test ShellExecute on a replay; launching the executable directly does not verify a file association.
- Neutralino enables primary-window state restoration by default and can save
  Windows' minimized sentinel coordinates (`32767, -32768`) as a normal window
  position. Disable saved window state and explicitly unminimize, center, and
  show this viewer at startup so later launches cannot remain off-screen.
- Neutralino's window title does not brand its Windows executable. CLI 11.7.2
  reads top-level `description` for FileDescription and `applicationName` for
  ProductName; without them Task Manager shows the generic framework name.
  Verify the built PE resources, not only the configuration. Register
  FriendlyAppName for both owned replay handlers to label Windows Open with.
