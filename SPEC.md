# OpenBW Replay Viewer Specification

## Purpose

The project provides a browser-based and standalone desktop viewer for
StarCraft: Brood War 1.16.1 replay files.

## Web viewer

- The static application is served from `docs/`.
- Users can browse for or drag replay files into the viewer.
- While a replay is loaded, users can download its original `.rep` bytes and
  filename from the top-right Download button.
- A `rep` URL parameter loads a remotely fetchable replay.
- Each replay opens centered on the first participant's starting location in
  player-slot order, with map-edge clamping. This happens before playback,
  regardless of automatic-camera preference, and respects restored zoom.
- Game data files are loaded from the configured hosted MPQ source.

## Standalone viewer

- User-facing application names, including the window title, Windows executable
  description/product name, and Open with label, are `StarCraft Replay Viewer`.
  Keep the application ID and executable path stable to preserve settings and
  existing file associations. Release builds verify the executable metadata.
- The desktop application bundles the same `docs/` viewer used by the website.
- Starting the application without a replay opens the viewer home screen.
- Starting it with a `.rep` command-line argument opens that replay.
- Every launch restores the primary window from a minimized state, centers it
  on the current display, and makes it visible.
- Framework window-state restoration is disabled so minimized sentinel or
  disconnected-display coordinates cannot make later launches inaccessible.
- The bundled viewer remains on Neutralino's local HTTP resource origin.
- Local replay bytes are read through the explicitly allow-listed
  `filesystem.readBinaryFile` native API.
- Paths containing spaces, `#`, and other URL-significant characters must work.
- Audio, video-clip, zoom, toggle, and most-recent-settings-tab preferences must
  survive application restarts and release-directory replacement.
- Persistent settings must live in the operating system's application-data
  directory, not beside the executable.
- The desktop persistence layer must not change website storage behavior.
- Launch and replay-loading failures must replace the progress text with a
  human-readable error instead of hanging silently.
- The Windows executable and `resources.neu` are distributed together.

## Verification

- Launcher URL and desktop settings persistence behavior are covered by focused
  Node tests.
- A release build must complete without new errors.
- A packaged Windows build must open an associated replay, render the game and
  HUD, advance playback, and leave the Neutralino log free of errors.

- The default OpenBW build must also package the desktop viewer from the same local web assets and verify their equality.
- Windows file associations use the maintained `desktop/dist/replay-viewer-desktop` output.
