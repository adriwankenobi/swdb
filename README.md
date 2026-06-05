# SWDB — Star Wars EU Catalog

A personal browsable catalog of every work in the Star Wars Expanded Universe.

Live: <https://adriwankenobi.github.io/swdb/>

## Status

Live at <https://adriwankenobi.github.io/swdb/>. ~1960 works indexed across 10 eras of the Star Wars Expanded Universe, sourced from `Star Wars EU.xlsx` and enriched with Wookieepedia metadata via the MediaWiki API. Signed-in users can mark works they **own** and group them into their own **collections** (stored in Supabase, per user); see [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

- **Pipeline:** Python (uv, openpyxl, requests, beautifulsoup4) reads `Star Wars EU.xlsx` and enriches each row from Wookieepedia, emitting `frontend/public/data/works.json` (works only — collections and ownership are per-user).
- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui + zustand, with Supabase for auth + per-user ownership/collections. Static deploy to GitHub Pages.

## Development

Requirements: Python 3.12+, [uv](https://docs.astral.sh/uv/), Node 20+, [just](https://just.systems/).

```bash
just scrape          # Excel + Wookieepedia -> works.json (cached)
just dev             # frontend dev server
just build           # production build
just deploy          # publish to GitHub Pages
just --list          # all commands
```

### When to run `just scrape`

Column letters (the `COLLECTED` column was removed): `A`=YEAR `B`=MEDIUM `C`=SERIES `D`=TITLE `E`=# `F`=AUTHOR `G`=PUBLISHER `H`=RELEASE `I`=INFO/wiki `J`=COVER `K`=ID.

- **New row added to Excel** (with YEAR, MEDIUM, TITLE, `I`=wiki URL; leave F/G/H/J empty): `just scrape` then `just deploy`.
- **Existing row's wiki link is dead**: replace `I` with the new URL AND clear F/G/H/J (else `excel_full=true` skips re-parsing), then `just scrape` then `just deploy`.

## Repo layout

- `Star Wars EU.xlsx` — source of truth for title / series / medium / # / year
- `scripts/` — Python build pipeline
- `tests/` — pytest suite for the pipeline
- `frontend/` — React SPA
- `data/` — `.cache/` (HTTP cache, gitignored) and build-time logs
- `ARCHITECTURE.md` — technical overview of the system
