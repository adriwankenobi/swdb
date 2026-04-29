# SWDB — Star Wars EU Catalog

A personal browsable catalog of every work in the Star Wars Expanded Universe.

Live: <https://adriwankenobi.github.io/swdb/>

## Status

Live at <https://adriwankenobi.github.io/swdb/>. ~1933 works indexed across 10 eras of the Star Wars Expanded Universe, sourced from `Star Wars EU.xlsx` and enriched with Wookieepedia metadata via the MediaWiki API.

## Stack

- **Pipeline:** Python (uv, openpyxl, requests, beautifulsoup4) reads `Star Wars EU.xlsx` and enriches each row from Wookieepedia, emitting `frontend/public/data/works.json`.
- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui + zustand. Static deploy to GitHub Pages.

## Development

Requirements: Python 3.12+, [uv](https://docs.astral.sh/uv/), Node 20+, [just](https://just.systems/).

```bash
just scrape          # Excel + Wookieepedia -> works.json (cached)
just dev             # frontend dev server
just build           # production build
just deploy          # publish to GitHub Pages
just --list          # all commands
```

## Repo layout

- `Star Wars EU.xlsx` — source of truth for title / series / medium / # / year
- `scripts/` — Python build pipeline
- `tests/` — pytest suite for the pipeline
- `frontend/` — React SPA
- `data/` — `.cache/` (HTTP cache, gitignored) and build-time logs
- `ARCHITECTURE.md` — technical overview of the system
