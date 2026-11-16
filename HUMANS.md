# OpenBW Replay Viewer

## Website

Serve `docs/` with a static HTTP server, or run `./serve.sh` for the Dockerized
server. The published viewer is hosted at https://dgant.github.io/openbw-replay-viewer/.

On Windows, start or stop the background local server with:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local-server.ps1
powershell -ExecutionPolicy Bypass -File .\stop-local-server.ps1
```

The browser and desktop viewer fetch game data from `https://dgant.github.io/mpqs`.

Loading a replay centers the view on the first player's starting position,
including when automatic camera is disabled or another replay was paused.
Your saved zoom is preserved; the camera is clamped at map edges.

Classic 1.16.1 and Remastered replays select separate engines automatically.
Standard multiplayer replay playback is supported; built-in AI and some
custom-map triggers are not implemented. Unsupported or malformed replays show
an error while leaving the file picker usable without a page refresh.
Both engines are maintained directly in
the sibling `openbw` repository, with Remastered built from its classic engine
and local compatibility changes. Additional terrain data, extracted from
StarCraft: Remastered, is fetched from the MPQ site's `remastered/` directory
only when loading a Remastered replay. You can switch formats
without refreshing the page; settings and controls remain shared.

Before publishing, run the sibling engine repository's source, native replay,
and complete browser tests, including Firefox/WebKit engine lifecycle checks,
then this repository's desktop tests and bundle verification. Check long games,
repeated loads, seek/rewind, rendering, and failure recovery. Check independent
simulation references for accuracy; reaching the last frame tests completion.

## Standalone desktop viewer

The Neutralino wrapper is in `desktop/`. Install and prepare it with:

```bash
cd desktop
npm install
npm run setup
```

Run its focused regression tests:

```bash
npm test
```

The regression suite covers the top-right replay-download behavior and control
layout as well as the desktop launcher and settings bridge.

Build all desktop packages:

```bash
npm run build
```

The Windows executable and its required `resources.neu` file are emitted under
`desktop/dist/replay-viewer-desktop/`. Keep those two files together.
The package includes both replay engines.

The application appears as **StarCraft Replay Viewer** in Task Manager, window
titles, executable properties, and Windows Open with (after registration).
The executable filename is `replay-viewer-desktop-win_x64.exe` for
compatibility. Close and reopen a running viewer after updating its build.
Every desktop build verifies both the bundled web assets and the Windows
executable's description/product name. To check the metadata separately:

```bash
node desktop/scripts/verify-windows-metadata.js
```

Desktop settings are stored outside the release directory under the operating
system's application-data directory for `io.github.dgant.replayviewer`, so
replacing or moving the application does not reset them.

The app intentionally does not restore Neutralino's saved window coordinates.
It restores, centers, and shows the window on every launch so a prior minimized
launch or disconnected monitor cannot leave the viewer off-screen.

To verify `.rep` launching end to end, associate `.rep` files with
`replay-viewer-desktop-win_x64.exe`, double-click a known replay, and confirm
the game viewport replaces the launcher screen and playback advances.

## Unified local build

From the sibling `openbw` repository, run `./scripts/build_replay_viewer.sh`
to compile the web runtime and package the standalone viewer together. The build
checks that the packaged web files match this repository's `docs/` files.
Running `npm run build` inside `desktop/` repackages the current `docs/` files
without recompiling the engine.

On Windows, run `desktop/scripts/register-file-association.ps1` after the first
build. It registers the executable in `desktop/dist/replay-viewer-desktop/`,
which subsequent builds update in place. Existing user defaults for other apps
may require choosing this viewer in Windows Default Apps.

To check Windows registration after running the registration script:

```powershell
./desktop/tests/file-association.test.ps1
```

This checks both handlers' display names, the legacy and current viewer
commands, and the effective user choice. For end-to-end validation, open a `.rep` through Windows ShellExecute
and verify that the maintained executable loads the replay.

## Publishing

Prepare the static site and desktop package from the development container:

```bash
/workspace/openbw/scripts/prepare_github_pages_site.sh
```

After local validation and approval to publish, run:

```bash
/workspace/openbw/scripts/publish_replay_viewer_pages.sh
```

The publish script requires `GH_TOKEN`, pushes this repository's `main` branch,
and configures GitHub Pages to serve `/docs`. It does not publish the currently
checked-out feature branch automatically.
