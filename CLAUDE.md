# CLAUDE.md

Project-specific guidance for Claude Code working in this repo.

## What this is

SWDB — a personal browsable web catalog of every work in the Star Wars
Expanded Universe. Pipeline: Python (uv) reads `Star Wars EU.xlsx`, scrapes
Wookieepedia (cached), emits `frontend/public/data/works.json`. Frontend:
Vite + React + TypeScript + Tailwind 4 + shadcn/ui + zustand. Deploys to
GitHub Pages.

## Hard rules

1. **Never write "Legends" or any Disney-era Star Wars terminology** in code,
   comments, docs, UI copy, or commit messages. The user is an Expanded
   Universe purist; "Legends" is the Disney rebrand and is considered
   degrading. Use "Expanded Universe" or "EU".
2. **Never include a "Co-Authored-By: Claude" trailer** or any
   "Generated with Claude Code" line in git commits or PR bodies.
3. **Spec / plan paths are `docs/specs/` and `docs/plans/`** — never
   `docs/superpowers/...`. The "superpowers" namespace is Claude tooling and
   shouldn't appear in this repo.
4. **GitHub account is `adriwankenobi`** (personal account; repos can be
   public).

## Tech stack details

- **Python:** managed by [uv](https://docs.astral.sh/uv/). Located at
  `~/.local/bin/uv`. If `uv` is not on PATH in a fresh shell, run
  `source ~/.local/bin/env` first.
- **Node:** Node 25.9.0 from Homebrew (`/usr/local/Cellar/node/25.9.0_2/bin`).
  The user's nvm-installed Node (8.x) is too old for Vite 6. Always prepend
  the Homebrew node path when running `npm` commands:
  `PATH="/usr/local/Cellar/node/25.9.0_2/bin:$PATH" npm <cmd>`.

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
- `docs/specs/2026-04-29-star-wars-eu-catalog-design.md` — current design.
- `docs/plans/2026-04-29-star-wars-eu-catalog-plan.md` — current plan.
- `data/.cache/wookieepedia/` — HTTP cache (gitignored).
- `data/{unmatched,duplicates,missing_medium,ignored_no_year}.log` —
  build-time logs (gitignored).

## Commands

- `just scrape` — Excel → works.json (uses cache).
- `just dev` — frontend dev server.
- `just build` / `just deploy` — production build / publish to GitHub Pages.
- `just test-pipeline` / `just test-frontend` — test suites.
- `just --list` — all recipes.
