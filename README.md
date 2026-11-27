# opengadget.dev

Zero-sudo, one-line terminal installer platform & catalog built on Cloudflare Pages + Pages Functions.

```sh
# macOS / Linux (sh, bash, zsh)
curl -sSL opengadget.dev/<tool> | sh

# Windows PowerShell
irm opengadget.dev/<tool> | iex
```

## Architecture (2-Repo Setup)

- **[`TRUCE-and-PEACE/og-tools`](https://github.com/TRUCE-and-PEACE/og-tools)** — Tool registry (`<tool>/README.md`, `releases.conf`, `install.sh`, `install.ps1`).
- **`TRUCE-and-PEACE/opengadget.dev`** (this repo) — Platform frontend, Cloudflare Pages Functions backend, and shared `_webi/` templates:
  - `frontend/` — React + Vite + Tailwind v4 UI (`https://opengadget.dev`).
  - `functions/` — Cloudflare Pages Functions:
    - `functions/[[path]].js` — Browser vs terminal dual-routing and per-tool OpenGraph tag injection.
    - `functions/api/installers/[pkg].js` — Stage 2 GitHub Releases resolution (edge-cached) and installer rendering.
  - `_webi/` — Shared Stage 1 bootstrap and Stage 2 base installer templates (`.sh` and `.ps1`).
  - `scripts/build-catalog.js` — Pulls `TRUCE-and-PEACE/og-tools` at build time (or `OG_TOOLS_DIR` locally), extracts git history (`Listed`, `Updates`, `Latest update`), and generates `catalog.json`, backend registry, and per-tool static OG HTML pages.

## Local Development

```sh
npm install
npm run build
npm run verify
```

To preview locally with Cloudflare Pages Functions:

```sh
npx wrangler pages dev dist
```

## License

MIT
