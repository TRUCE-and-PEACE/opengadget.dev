# Contributing a Tool to opengadget.dev

Tool definitions live in the separate registry repository: **[github.com/yv3000/og-tools](https://github.com/yv3000/og-tools)**.

To add a tool, open a PR on `yv3000/og-tools` (copying `_example/` into `<tool-slug>/`). Once merged to `main`, `opengadget.dev` automatically rebuilds its catalog, web UI, OpenGraph cards, and one-line `curl`/`irm` installers.
