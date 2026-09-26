# samples

Known-good `.dpaint` / `.dpaint-anim` files for manually checking the file format and app
behavior (open them via the web app's "Open…" or the VSCode custom editor), and for
`packages/core/src/samples.test.ts`, which loads them through `deserialize()` as a
regression check against accidental file-format breakage.

| File | What it exercises |
| --- | --- |
| `heart.dpaint` | Single-frame document (v3 format), transparency, a 2-color palette padded out to the default 17-slot size. |
| `bounce.dpaint-anim` | Multi-frame animation, non-default `frameIntervalMs` (120), the `.dpaint-anim` extension. |

Both are generated - not hand-edited - by `generate.mjs`, so they always match whatever
`@dot-paint/core`'s `serialize()` currently produces:

```sh
pnpm --filter @dot-paint/core run build   # generate.mjs imports the built dist
node samples/generate.mjs
```

Re-run this after a `.dpaint` format change (see `FILE_FORMAT_VERSION` in
`packages/core/src/serialize.ts`) to keep the samples current.
