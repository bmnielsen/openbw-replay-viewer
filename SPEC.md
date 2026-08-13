# OpenBW Replay Viewer Specification

## Purpose

The project provides a browser-based and standalone desktop viewer for
StarCraft: Brood War 1.16.1 replay files.

## Web viewer

- The static application is served from `docs/`.
- Users can browse for or drag replay files into the viewer.
- A `rep` URL parameter loads a remotely fetchable replay.
- Game data files are loaded from the configured hosted MPQ source.

## Standalone viewer

- The desktop application bundles the same `docs/` viewer used by the website.
- Starting the application without a replay opens the viewer home screen.
- Starting it with a `.rep` command-line argument opens that replay.
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
