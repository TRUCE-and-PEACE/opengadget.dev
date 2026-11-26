# Contributing a Tool to opengadget.dev

Every tool on **opengadget.dev** is a single folder in the repository root. There is no database.

## 1. Copy `_example/`

Create a lowercase folder `<tool-slug>/` matching `^[a-z0-9][a-z0-9_-]{0,63}$` with four files:

```text
<tool-slug>/
├── README.md       # YAML frontmatter + usage cheat sheet
├── releases.conf   # github_sources = owner/repo, tag_prefix = v
├── install.sh      # POSIX installer (overrides pkg_install / pkg_post_install)
└── install.ps1     # Windows PowerShell installer (overrides Pkg-Install / Pkg-PostInstall)
```

## 2. Rules for Installers

- **Zero `sudo` / admin rights:** Install only under `$WEBI_OPT_DIR` (`~/.local/opt/<tool>-<tag>`) and link/copy binaries into `$WEBI_BIN_DIR` (`~/.local/bin`).
- **Update `PATH` cleanly:** Call `webi_path_add` (POSIX) or `Webi-PathAdd` (PowerShell) in `pkg_post_install` / `Pkg-PostInstall`.
- **Safe URLs only:** `homepage` in `README.md` must use `https://` or `http://`.

## 3. Test Locally Before Opening a PR

```sh
npm install
npm run build
npm run verify
```

Once your PR is merged to `main`, Cloudflare Pages automatically rebuilds `catalog.json`, publishes `https://opengadget.dev/<tool-slug>` with OpenGraph cards, and activates `curl -sS https://opengadget.dev/<tool-slug> | sh` and `irm https://opengadget.dev/<tool-slug> | iex`.

