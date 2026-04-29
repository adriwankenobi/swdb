# CLAUDE.md

Project-specific guidance for Claude Code working in this repo.

## What this is

SWDB — a personal browsable web catalog of every work in the Star Wars
Expanded Universe. Pipeline: Python (uv) reads `Star Wars EU.xlsx`, scrapes
Wookieepedia (cached), emits `frontend/public/data/works.json`. Frontend:
Vite + React + TypeScript + Tailwind 4 + shadcn/ui + zustand. Deploys to
GitHub Pages.

## Personal rules

See `CLAUDE.local.md` (gitignored, not committed) for personal hard rules
specific to this user (terminology preferences, commit conventions, etc.).

## Tech stack details

- **Python:** managed by [uv](https://docs.astral.sh/uv/). Located at
  `~/.local/bin/uv`. If `uv` is not on PATH in a fresh shell, run
  `source ~/.local/bin/env` first.
- **Node:** Homebrew node at `/usr/local/opt/node/bin` (version-stable
  symlink). The user's nvm-installed Node (8.x) is too old for Vite 6. The
  `justfile` exports this path at the top, so every `just` recipe (`just dev`,
  `just build`, etc.) Just Works™. For raw `npm` invocations outside `just`,
  prepend it manually: `PATH="/usr/local/opt/node/bin:$PATH" npm <cmd>`.

## Schema (works.json)

Each work has the shape:

- `id`: stable uuid5 (canonical key: era|series|title|medium|number, with
  medium as canonical STRING, not the integer)
- `era`: int 0–9, index into `ERAS` constant
- `medium`: int 0–6, index into the 7-entry `MEDIUMS` constant
  (alphabetical: Comic, Junior Novel, Movie, Novel, Short Story, TV Show,
  Videogame)
- `title`: string (required)
- `year`: signed int (negative = BBY, non-negative = ABY) — required
- `series`, `number`, `release_date`, `authors[]`, `publisher`, `cover_url`,
  `wiki_url`: optional, omitted when empty (no nulls in the JSON)

Excel rows with no `YEAR` cell are intentional reference-only entries; the
pipeline excludes them from the JSON and logs them to
`data/ignored_no_year.log`.

## Repo layout (relevant bits)

- `Star Wars EU.xlsx` — source of truth for title/series/medium/#/year.
- `scripts/` — Python pipeline (`build_data.py` orchestrates).
- `tests/` — pytest suite for the pipeline.
- `frontend/` — React SPA.
- `ARCHITECTURE.md` — public technical overview of the shipped system.
- `docs/superpowers/specs/2026-04-29-star-wars-eu-catalog-design.md` — local-only design doc (gitignored).
- `docs/superpowers/plans/2026-04-29-star-wars-eu-catalog-plan.md` — local-only implementation plan (gitignored).
- `data/.cache/wookieepedia/` — HTTP cache (gitignored).
- `data/{unmatched,duplicates,missing_medium,ignored_no_year}.log` —
  build-time logs (gitignored).

## Commands

- `just scrape` — Excel → works.json (uses cache).
- `just dev` — frontend dev server.
- `just build` / `just deploy` — production build / publish to GitHub Pages.
- `just test-pipeline` / `just test-frontend` — test suites.
- `just --list` — all recipes.
- Bare `just` (no args) opens an fzf picker over the recipes.
