# Contributing a Tool to opengadget.dev

Tool definitions live in the separate registry repository: **[github.com/TRUCE-and-PEACE/og-tools](https://github.com/TRUCE-and-PEACE/og-tools)**.

To add a tool, open a PR on `TRUCE-and-PEACE/og-tools` (copying `_example/` into `<tool-slug>/`). Once merged to `main`, `opengadget.dev` automatically rebuilds its catalog, web UI, OpenGraph cards, and one-line `curl`/`irm` installers.
