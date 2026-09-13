# dot-paint

Dot art (pixel art) editor that runs both as a standalone web app and as a VSCode custom
editor. See [docs/direction.md](docs/direction.md) for the feature direction and
[docs/architecture.md](docs/architecture.md) for the design (data model, package layout,
web/VSCode integration).

## packages

pnpm workspace with three packages:

- `packages/core` — framework-agnostic engine (document model, undo/redo, brushes,
  rendering, `.dpaint` serialization)
- `packages/web` — React + Vite web app
- `packages/vscode-extension` — VSCode custom editor for `.dpaint` files

## development

Requires Node.js and [pnpm](https://pnpm.io/).

```sh
# install workspace dependencies
pnpm install

# run the web app locally (packages/web)
pnpm run dev:web

# run tests across all packages
pnpm run test

# typecheck all packages
pnpm run typecheck

# build all packages
pnpm run build
```

## VSCode extension

`packages/vscode-extension`'s `build`/`dev` scripts build `packages/web` and copy its
output into `packages/vscode-extension/dist/webview` before bundling the extension itself,
so building the extension is enough on its own:

```sh
# build the extension (also builds and copies the packages/web bundle)
pnpm --filter dot-paint-vscode run build
```

Then, in VSCode:

1. Open this repo as the workspace root.
2. Press `F5` (or Run and Debug → "Run dot-paint Extension") to build and launch an
   Extension Development Host window with the extension loaded (`.vscode/launch.json` and
   `.vscode/tasks.json` are already set up for this).
3. In that window, open or create a `.dpaint` file — it opens in the dot-paint custom
   editor.

`pnpm --filter dot-paint-vscode run dev` runs the extension's own build in `--watch` mode,
but it only builds `packages/web` once at startup — after changing web source, re-run it (or
`pnpm --filter @dot-paint/web run build`) to pick up the change in the webview.

## status

Early scaffold — see the repo's [issues](https://github.com/jiebanh/dot-paint/issues) for
what's implemented vs. still planned.
