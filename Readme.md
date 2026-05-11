# openbw-replay-viewer
Standalone copy of the OpenBW replay viewer webpage (originally/normally hosted at http://www.openbw.com/replay-viewer).

Available on GitHub Pages at https://dgant.github.io/openbw-replay-viewer.

## History

This copy originated as a pure mirror of the OpenBW version, with all assets taken from an [archived version of the OpenBW website](https://web.archive.org/web/20240116231013/http://www.openbw.com/replay-viewer/) on archive.org from January 16th 2024. The scripts for this version is still available in this repository under `docs/v1.0`.

After some fixes were made to OpenBW, the need arose to be able to build the actual OpenBW engine from source. At this point the build scripts were added with much assistance from [tscmoo](https://github.com/tscmoo).

## Local development

### Serving the website

The website consists only of static HTML/JS/CSS, so there are many options to serve the assets locally. A Dockerized version based on nginx is included and can be run through `./serve.sh`.

On Windows, you can also run the bundled background static server without keeping a console open:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local-server.ps1
```

To stop it later:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-local-server.ps1
```

### Building OpenBW

The OpenBW part of the website needs to be built using emscripten. A Dockerized build script is included and can be invoked through `./build_openbw.sh` in the project root. It will run the emscripten build script in the Docker container and export the `openbw.js` and `openbw.wasm` files to the project root when it's done.

## GitHub Pages

In the current workspace, the authoritative build comes from the sibling `openbw/` repository rather than the legacy standalone build flow in this repo.

To prepare this repo's `docs/` directory for GitHub Pages from the current OpenBW source tree, run:

```bash
/workspace/openbw/scripts/prepare_github_pages_site.sh
```

That will:

- build the current web artifacts from `openbw/`
- copy `openbw.js` and `openbw.wasm` into `docs/v1.4/`
- create `docs/.nojekyll`

For a full publish from the `openbw/` development repo into this Pages repo, run:

```bash
/workspace/openbw/scripts/publish_replay_viewer_pages.sh
```

On GitHub Pages, the viewer is configured to fetch MPQs from `/mpqs/<file>` on the same `github.io` host. Localhost development still uses `/bw/<file>`.

We are using an old version of emscripten (via its Docker image). tscmoo made an attempt to get it working on a new version of emscripten, but ran into some difficulties:

> i think i figured out that the choppy audio i was having is due to it using an emscripten-built native version of sdl mixer, whereas the one you built uses SDL1 mixer (even though we ask for sdl 2), which emscripten has an implementation of built in javascript (so it uses the browser api to play audio, and doesn't need to feed the chunks with specific timing since the browser takes care of it)

> this also gives worse performance - the native javascript api will always be faster than some native webassembly code

> there supposedly is a way to use the sdl 1 library in the newest version of emscripten, too, and i've tried but keep getting various linker errors and such that i haven't figured out

> the newer emscripten version also requires some small code changes

We will therefore stick with the old version of emscripten for the time being.

The OpenBW files are pulled in via a Git submodule. The other dependencies, SDL header files and dlmalloc, are included in this repo as they are also old versions to ensure interoperability with the version of emscripten being used.
