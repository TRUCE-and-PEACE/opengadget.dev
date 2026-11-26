# opengadget.dev

Zero-sudo, one-line terminal installer platform & catalog built on Cloudflare Pages + Pages Functions.

```sh
# macOS / Linux
curl -sS https://opengadget.dev/bunpm | sh

# Windows PowerShell
irm https://opengadget.dev/bunpm | iex
```

## Architecture

- **`frontend/`** — React + Vite + Tailwind v4 UI (`opengadget.dev`).
- **`functions/`** — Cloudflare Pages Functions backend (`functions/[[path]].js` for browser vs terminal dual-routing and OG injection, `functions/api/installers/[pkg].js` for Stage 2 GitHub release resolution & installer rendering).
- **`_webi/`** — Shared Stage 1 bootstrap and Stage 2 base installer templates (`.sh` and `.ps1`).
- **`<tool>/`** — One folder per tool (e.g. `bunpm/`). See [CONTRIBUTING.md](./CONTRIBUTING.md).
- **`scripts/build-catalog.js`** — Build-time catalog, backend registry bundle, and per-tool static OG HTML generator.

## Local Development

```sh
npm install
npm run build
npm run verify
```

