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

## status

Early scaffold — see the repo's [issues](https://github.com/jiebanh/dot-paint/issues) for
what's implemented vs. still planned.
