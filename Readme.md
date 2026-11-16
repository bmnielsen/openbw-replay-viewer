# StarCraft Replay Viewer

Browser and standalone desktop viewer for StarCraft: Brood War 1.16.1 and
Remastered replays, built on [OpenBW](https://github.com/OpenBW/openbw).

Supports standard multiplayer playback. Built-in AI and some custom-map
triggers are not implemented.

[Open the viewer](https://dgant.github.io/openbw-replay-viewer/).

## Build

Use the development container and the sibling `openbw` repository:

```bash
cd /workspace/openbw
./scripts/build_replay_viewer.sh
```

This builds both replay engines into `docs/v1.4/`, packages the same web assets
into `desktop/dist/replay-viewer-desktop/`, and verifies that the bundles match.

## Documentation

- [HUMANS.md](HUMANS.md): local serving, testing, desktop setup, and publishing.
- [SPEC.md](SPEC.md): required behavior and verification.
- [LESSONS.md](LESSONS.md): implementation constraints and testing pitfalls.
- [UPDATES.md](UPDATES.md): ongoing collaboration practices.

The `docs/` tree contains the static website; `desktop/` contains its Neutralino
wrapper. Engine source, source provenance, and engine/browser tests live in the
sibling `openbw` repository.
