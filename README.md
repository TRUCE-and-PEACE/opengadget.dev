# opengadget.dev

Zero-sudo, one-line terminal installer platform & catalog built on Cloudflare Pages + Pages Functions.

```sh
# macOS / Linux
curl -sS https://opengadget.dev/<tool> | sh

# Windows PowerShell
irm https://opengadget.dev/<tool> | iex
```

## Architecture (2-Repo Setup)

- **[`yv3000/og-tools`](https://github.com/yv3000/og-tools)** — Tool registry (`<tool>/README.md`, `releases.conf`, `install.sh`, `install.ps1`).
- **`yv3000/opengadget.dev`** (this repo) — Platform frontend, Cloudflare Pages Functions backend, and shared `_webi/` templates:
  - `frontend/` — React + Vite + Tailwind v4 UI (`opengadget.dev`).
  - `functions/` — Cloudflare Pages Functions (`functions/[[path]].js` for browser vs terminal dual-routing and OG injection, `functions/api/installers/[pkg].js` for Stage 2 GitHub release resolution & installer rendering).
  - `_webi/` — Shared Stage 1 bootstrap and Stage 2 base installer templates (`.sh` and `.ps1`).
  - `scripts/build-catalog.js` — Pulls `yv3000/og-tools` at build time (or `OG_TOOLS_DIR` locally) and generates `catalog.json`, backend registry, and per-tool static OG HTML pages.

## Local Development

```sh
npm install
npm run build
npm run verify
```
