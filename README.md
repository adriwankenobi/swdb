# SWDB — Star Wars EU Catalog

A personal browsable catalog of every work in the Star Wars Expanded Universe.

Live: <https://adriwankenobi.github.io/swdb/>

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

- `scripts/` — Python build pipeline
- `tests/` — pytest suite for the pipeline
- `frontend/` — React SPA
- `data/` — `.cache/` (HTTP cache, gitignored) and `unmatched.log`
- `docs/specs/` — design documents
- `docs/plans/` — implementation plans
