# SWDB — Star Wars EU Catalog

A personal browsable catalog of every work in the Star Wars Expanded Universe.

Live: <https://adriwankenobi.github.io/swdb/>

## Status

Live at <https://adriwankenobi.github.io/swdb/>. ~2100 works indexed across 10 eras of the Star Wars Expanded Universe, sourced from `Star Wars EU.xlsx` and enriched with Wookieepedia metadata via the MediaWiki API. Signed-in users can mark works they **own** and group them into their own **collections** (stored in Supabase, per user); see [ARCHITECTURE.md](ARCHITECTURE.md).

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
just small-cover F   # shrink a cover image to an upload-sized 800px WebP (needs cwebp)
just --list          # all commands
```

Supabase config lives in `frontend/.env.local` (gitignored): `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Provision a new project with `supabase/setup.sql`.

### When to run `just scrape`

Column letters: `A`=YEAR `B`=MEDIUM `C`=SERIES `D`=SERIES # `E`=TITLE `F`=# `G`=AUTHOR `H`=PUBLISHER `I`=RELEASE `J`=INFO/wiki `K`=COVER `L`=ID.

- **New row added to Excel** (with YEAR, MEDIUM, TITLE, `J`=wiki URL; leave G/H/I/K empty): `just scrape` then `just deploy`.
- **Existing row's wiki link is dead**: replace `J` with the new URL AND clear G/H/I/K (else `excel_full=true` skips re-parsing), then `just scrape` then `just deploy`.

## Repo layout

- `Star Wars EU.xlsx` — source of truth for title / series / medium / series # / # / year
- `scripts/` — Python build pipeline
- `tests/` — pytest suite for the pipeline
- `frontend/` — React SPA
- `supabase/setup.sql` — provisions the Supabase tables, RLS, `covers` bucket, and keepalive heartbeat
- `.github/workflows/supabase-keepalive.yml` — scheduled job that keeps the free-tier Supabase project from pausing
- `data/` — `.cache/` (HTTP cache, gitignored) and build-time logs
- `ARCHITECTURE.md` — technical overview of the system
