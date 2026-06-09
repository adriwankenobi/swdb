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

- **Python:** `>=3.12` (per `pyproject.toml`; ruff `target-version = "py312"`).
  Managed by [uv](https://docs.astral.sh/uv/), located at `~/.local/bin/uv`.
  If `uv` is not on PATH in a fresh shell, run `source ~/.local/bin/env` first.
- **TypeScript:** `~5.8.3` (pinned in `frontend/package.json`).
- **Node:** Homebrew node at `/usr/local/opt/node/bin` (version-stable
  symlink, currently v25.x). Vite 6 requires Node `^18.0.0 || ^20.0.0 || >=22.0.0`,
  so the user's nvm-installed Node (8.x) is too old. The `justfile` exports this
  path at the top, so every `just` recipe (`just dev`, `just build`, etc.) Just
  Works™. For raw `npm` invocations outside `just`, prepend it manually:
  `PATH="/usr/local/opt/node/bin:$PATH" npm <cmd>`.

## Schema (works.json)

Top level: `{ generated_at, works: [...] }`. The JSON contains **works only** —
collections and ownership are per-user (Supabase), not baked into the JSON.

**Each work** has the shape:

- `id`: a **stable, frozen** uuid stored in the Excel `ID` column. The
  pipeline reads it verbatim; if the cell is blank it generates one (seeded
  from the legacy `era|series|title|medium|number` uuid5) and **writes it
  back** to the Excel. Once stamped, the id never changes — editing a title,
  era, series, etc. does NOT change the id (so per-user data keyed on the id
  stays valid).
- `era`: canonical STRING from the 10-entry `ERAS` list, UPPERCASE
  (e.g. `"REBELLION"`). Internally also an int index 0–9; the emitted JSON
  uses the string form.
- `medium`: canonical STRING from the `MEDIUMS` list, Title Case.
- `title`: string (required).
- `year`: signed int (negative = BBY, non-negative = ABY) — required.
- `series`, `series_number`: optional **parallel string arrays** — one work
  may belong to multiple series with corresponding series issue numbers (e.g.
  comic cross-series). `series_number` was formerly called `number`.
- `number`: optional **scalar** string — the work's position within its own
  story arc (e.g. parts 1–4 of "The Battle of Jabiim", which are Republic
  55–58). Distinct from `series_number`.
- `release_date`, `release_precision`, `authors[]`, `publisher`,
  `cover_url`, `wiki_url`, `year_end`: all optional, omitted when empty
  (no nulls). `release_precision` is `"day" | "month" | "year"`, always
  emitted alongside `release_date`. `year_end` is present only when the item
  spans a year range (e.g. multi-year TV runs).

There is no `color` field and no `collection_ids` on works any more (removed
when collections became per-user; item background is now driven by the
signed-in user's ownership, and collection membership lives in Supabase).

**Excel sheet layout** (one sheet per era; the old `COLLECTED` column and
`COLLECTIONS` sheet were removed): columns are read by absolute position —
`A`=YEAR `B`=MEDIUM `C`=SERIES `D`=SERIES # `E`=TITLE `F`=# `G`=AUTHOR
`H`=PUBLISHER `I`=RELEASE `J`=INFO/wiki `K`=COVER `L`=ID. Excel rows with no `YEAR` cell are
intentional reference-only entries; the pipeline excludes them and logs them
to `data/ignored_no_year.log`.

## Per-user features (frontend + Supabase)

Auth, ownership, and collections are entirely client-side against Supabase —
the static site on GitHub Pages talks to Supabase directly; the Python
pipeline knows nothing about them.

- **Auth:** Supabase email+password (`userStore`). Anonymous users browse the
  full catalog; owned/collections are gated behind sign-in.
- **Ownership:** an `owned` table (per `user_id` + `work_id`). Owned works get
  a green background; unowned/logged-out get the default.
- **Collections:** per-user `collections` + `collection_members` tables
  (RLS-guarded). Display/sort fields (eras, mediums, series, authors,
  publishers, year range, anchor era, release date) are **derived
  client-side** from member works (`deriveCollection`). A few fields are
  **user-set** on the collection itself (NOT derived): `title`, `number`, and
  the optional `type` — a physical/media format from `COLLECTION_TYPES`
  (`Hardcover`, `Softcover`, `Single Issue`, `TPB`, `Omnibus`, `DVD`,
  `Blu-ray`). `type` is a plain `text` column with no DB constraint; the
  frontend enum is the source of truth. Covers upload to a public `covers`
  Storage bucket. A work with no cover borrows one from a user collection it
  belongs to.
- **Config:** `frontend/.env.local` (gitignored) holds `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_PUBLISHABLE_KEY` (the browser-safe `sb_publishable_…`
  key; RLS protects data).

## Repo layout (relevant bits)

- `Star Wars EU.xlsx` — source of truth for title/series/medium/#/year.
- `scripts/` — Python pipeline (`build_data.py` orchestrates).
- `tests/` — pytest suite for the pipeline.
- `frontend/` — React SPA.
- `ARCHITECTURE.md` — public technical overview of the shipped system.
- `docs/superpowers/specs/2026-04-29-star-wars-eu-catalog-design.md` — local-only design doc (gitignored).
- `docs/superpowers/plans/2026-04-29-star-wars-eu-catalog-plan.md` — local-only implementation plan (gitignored).
- `data/.cache/wookieepedia/` — HTTP cache (gitignored).
- `data/{unmatched,duplicates,missing_medium,ignored_no_year,dead_links}.log`
  — build-time logs (gitignored).

## Commands

- `just scrape` — Excel → works.json (uses cache).
- `just dev` — frontend dev server.
- `just build` / `just deploy` — production build / publish to GitHub Pages.
- `just test-pipeline` / `just test-frontend` — test suites.
- `just --list` — all recipes.
- Bare `just` (no args) opens an fzf picker over the recipes.
