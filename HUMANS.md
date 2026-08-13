# OpenBW Replay Viewer

## Website

Serve `docs/` with a static HTTP server. The published viewer is hosted at
https://dgant.github.io/openbw-replay-viewer/.

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

Build all desktop packages:

```bash
npm run build
```

The Windows executable and its required `resources.neu` file are emitted under
`desktop/dist/replay-viewer-desktop/`. Keep those two files together.

Desktop settings are stored outside the release directory under the operating
system's application-data directory for `io.github.dgant.replayviewer`, so
replacing or moving the application does not reset them.

To verify `.rep` launching end to end, associate `.rep` files with
`replay-viewer-desktop-win_x64.exe`, double-click a known replay, and confirm
the game viewport replaces the launcher screen and playback advances.
