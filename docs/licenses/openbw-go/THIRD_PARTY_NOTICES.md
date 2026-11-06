# Third-Party Notices

## Remastered replay compatibility

The replay decoder and replay-specific compatibility rules adapt work from
[marianogappa/openbw-go](https://github.com/marianogappa/openbw-go), copyright
2026 Mariano Gappa, particularly `downgrade/` and
`tools/scrharness/openbw-scr.patch`. That project distributes its work under
GNU LGPL version 3. Its notice and license texts are preserved in
`third_party/openbw-go/` and the viewer's `docs/licenses/openbw-go/` directory.

The modified engine source and build instructions are available at
https://github.com/dgant/openbw. The viewer loads the resulting `openbw.js`
and `openbw.wasm` files separately; rebuilding/replacing them is documented in
`HUMANS.md`. The standalone package bundles those same replaceable web assets.
This notice does not assign a new license to preexisting OpenBW code.

The [alexpineda/openbw](https://github.com/alexpineda/openbw) fork was also
consulted for per-replay object-pool and extended unit-tag behavior.
