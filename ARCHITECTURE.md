# SWDB — Architecture

SWDB is a personal browsable web catalog of every work in the Star Wars
Expanded Universe. A Python pipeline reads `Star Wars EU.xlsx`, enriches each
row with Wookieepedia metadata, and emits a single static JSON file consumed
by a React SPA deployed to GitHub Pages. On top of the static catalog, the
frontend talks directly to **Supabase** for per-user accounts: signed-in users
mark works they **own** and group them into their own **collections**.

The static pipeline and the per-user layer are independent: the pipeline emits
only **works**; ownership and collections live entirely in Supabase and are
never baked into the JSON.

## Repo layout

| Path | Contents |
|---|---|
| `Star Wars EU.xlsx` | Source of truth for title / series / medium / series # / # / year |
| `scripts/` | Python pipeline (`build_data.py` orchestrates) |
| `tests/` | pytest suite for the pipeline |
| `frontend/` | React SPA (Vite + TS), incl. Supabase client + stores |
| `supabase/` | `setup.sql` — one-shot script to provision tables, RLS, and the `covers` bucket |
| `data/` | `.cache/wookieepedia/` (gitignored) and build-time log files |

## Pipeline (Python)

Entry point: `scripts/build_data.py`, managed by `uv`.

**Data flow:**

```
Star Wars EU.xlsx  +  Wookieepedia (MediaWiki API)
        │                        │
        └──────────┬─────────────┘
                   ▼
         build_data.py  (on demand)
                   │
                   ▼
   frontend/public/data/works.json   (works only)
```

**Trusted vs. fetched fields:**

- Excel is the sole authority for `title`, `series`, `medium`, `series_number, number`, and
  `year`. These are never overwritten by Wookieepedia data.
- Wookieepedia (via the MediaWiki `action=parse` API, bypassing Cloudflare) is
  the sole source for `authors`, `publisher`, `release_date`, `cover_url`, and
  `wiki_url`.

**Excel sheet layout** (one sheet per era; columns read by absolute position):

```
A=YEAR B=MEDIUM C=SERIES D=SERIES # E=TITLE F=# G=AUTHOR H=PUBLISHER I=RELEASE J=INFO K=COVER L=ID
```

**Stable IDs:** each work's `id` is read verbatim from the `ID` column (`K`).
When a cell is blank the pipeline generates an id — seeded from the legacy
`era|series|title|medium|series#` uuid5, with `|#` appended when the per-work
`#` column has a value — and **writes it back** to the Excel. Once
stamped, the id is frozen: editing a title, era, series, etc. does not change
it. This matters because per-user data in Supabase is keyed on `work_id`.
The `#` is appended only when present so that rows without one keep the ids
they were already stamped with, while issues of a mini-series — which differ by
`#` alone — get distinct ids instead of collapsing onto one.

**Excel writeback:** after enrichment, the Wookieepedia-sourced fields are
written back into the corresponding Excel cells (`AUTHOR`, `PUBLISHER`,
`RELEASE`, `COVER`), and any blank `ID` cell is stamped. Trusted columns are
never modified. Rows are matched on
`(era, title, series, medium, series #, #)` — the per-work `#` is part of that
key, or issues of a mini-series would collapse onto one entry and each would be
written the last one's data.

> The pipeline has no notion of collections or ownership. (An earlier version
> derived collections from a `COLLECTIONS` sheet + a `COLLECTED` column and
> emitted a top-level `collections` array plus per-work `collection_ids` and a
> `color` tint; all of that was removed when collections became per-user.)

**Mediums:** `MEDIUMS` is an alphabetical canonical list (`Comic`,
`Junior Novel`, `Movie`, `Novel`, `Short Story`, `TV Show`, `Videogame`, …).
Order is permanent — `MEDIUMS.indexOf` drives frontend facet ordering, and URL
slug aliases derive from these spellings via `slugify`.

**Caching:** fetched HTML is stored under `data/.cache/wookieepedia/`
(gitignored). `--refresh` bypasses it; `just clean-cache` deletes it.

**Logs** (all gitignored):

| File | Meaning |
|---|---|
| `data/unmatched.log` | Rows whose Wookieepedia page could not be resolved |
| `data/duplicates.log` | Rows that resolve to the same canonical key |
| `data/ignored_no_year.log` | Non-`NON-CANON` rows with no Excel `YEAR` cell (excluded from JSON) |
| `data/missing_medium.log` | Rows whose medium is not in `MEDIUMS` (excluded from JSON) |
| `data/dead_links.log` | Wiki URLs that returned 404 / no longer exist |

## Per-user layer (Supabase)

The static site talks to Supabase from the browser via `@supabase/supabase-js`
(URL + publishable key in `frontend/.env.local`, gitignored — the publishable
key is browser-safe; Row-Level Security protects data). Anonymous visitors
browse the full catalog; ownership and collections require sign-in.

- **Auth:** email + password (`userStore`). A small auth menu in the top bar.
- **Ownership:** an `owned` table keyed by `(user_id, work_id)`, RLS-guarded.
  Owned works render on a green background; unowned / logged-out render on the
  default background. An "owned" checkbox on each work toggles it (optimistic
  write-through). A 3-way **All / Owned / Unowned** sidebar filter applies in
  Issues mode.
- **Collections:** per-user `collections` (`id, user_id, title, number?,
  type?, info_url?, cover_url?`) and `collection_members` (`collection_id,
  work_id, position`) tables, both RLS-guarded. `type` is an optional user-set
  format (`Hardcover`, `Softcover`, `Single Issue`, `TPB`, `Omnibus`, `DVD`,
  `Blu-ray`) stored as plain `text` — the frontend enum is the source of truth,
  so there's no DB constraint. Adding a work to a collection also marks it
  owned. Covers can be pasted as a URL or uploaded to a public `covers`
  Storage bucket (`{user_id}/…`). An in-app editor handles create/edit
  (title, #, type, info link, cover, member add/remove + ↑/↓ reorder); the work
  modal has an "Add to collection" control.
- **Client-side derivation:** a user collection stores only its raw fields +
  member ids. Display/sort fields — `eras`, `mediums`, `series`, `authors`,
  `publishers`, `year`/`year_end`, `anchor_era` (earliest member's era), and
  `release_date` (latest member's release) — are derived from the member works
  in `deriveCollection`. Orphan member ids (works no longer in the catalog)
  are skipped.

Reads that can exceed PostgREST's 1000-row default (`owned`,
`collection_members`) are paginated.

**Provisioning:** `supabase/setup.sql` is a single idempotent script that
creates the three tables, their RLS policies, and the `covers` bucket (public
read, owner-only writes, 1 MB image limit). Paste it into the Supabase SQL
Editor or run `supabase db execute --file supabase/setup.sql`.

## Frontend (React)

Stack: Vite · React · TypeScript · Tailwind CSS 4 · shadcn/ui · zustand ·
`@tanstack/react-virtual` · `@supabase/supabase-js`.

**Items toggle** in the top bar switches the catalog between:

- **Issues** (default) — list every individual work.
- **Collections** — the signed-in user's collections, each shown once, with
  their member works folded in; owned works not in any collection appear as
  loose items; unowned works are hidden. (Signed-out users see a prompt to sign
  in.) The ownership filter is hidden here (everything shown is owned).

The toggle reshapes the rendered list via `buildItemsList`, producing a single
`Item[]` discriminated union (`{ kind: "work" } | { kind: "collection" }`)
consumed identically by all three views. Collections are placed in the sort by
their derived `anchor_era` / `year` (chronology) or `release_date` (release).

**Three view modes:** Cards (cover grid), Table (columns), Timeline (vertical
scroll; Chronology groups by era then in-universe year, Release groups by
real-world release year). All virtualized.

**Filters:** top-bar tabs for Era / Medium / Decade (with an "Unknown" toggle
for works lacking `release_date`); sidebar facets for Series / Author /
Publisher, plus the user's **Collections** and the **Ownership** 3-way toggle
(both shown only when signed in / when collections exist). Within a field: OR;
between fields: AND. Selecting a collection in Issues mode shows that
collection's member works (membership resolved from the user's collections).

**URL state:** filter selection, view mode, sort order, items toggle, ownership,
and the open work / collection id are reflected as query params. Era and medium
values are kebab-case slug aliases; the collections filter param uses collection
title slugs; `work=<id>` / `collection=<id>` open the respective modal (mutually
exclusive). Unknown slugs / legacy integer values are dropped on read.
`history.replaceState` keeps the URL current without adding history entries.

**Stable sort:** `Array.prototype.sort` is stable; JSON-array order (Excel row
order) is the implicit tiebreaker for equal sort keys.

**Work detail modal:** cover, title, series + #, medium, era, year, release
date, clickable authors/publishers (filter), a Wookieepedia link, an owned
checkbox (disabled when the work is in a collection — membership implies
owned), and an "Add to collection" control. If the work is in any of the user's
collections, a "Collected in" block links to each. A work with no `cover_url`
borrows the cover of a user collection it belongs to (rendered dimmed).

**Collection detail modal:** cover, title, # , derived series / eras / mediums /
year range / release date / authors / publishers, an optional info link, the
member list, and Edit / Delete actions.

**Prev / next modal navigation:** ← / → keys, on-screen chevrons (desktop), and
swipe (mobile) walk the currently visible filtered/sorted list, crossing item
types. An open item not in the current list disables both arrows.

## `works.json` schema

```json
{
  "generated_at": "2026-06-05T00:00:00Z",
  "works": [
    {
      "id":           "<frozen uuid>",
      "era":          "REBELLION",
      "medium":       "Novel",
      "title":        "A New Hope",
      "year":         0,
      "series":         ["Star Wars Episode"],
      "series_number":  ["IV"],
      "number":         "2",
      "release_date": "1976-11-12",
      "release_precision": "day",
      "authors":      ["Alan Dean Foster"],
      "publisher":    "Del Rey",
      "cover_url":    "https://static.wikia.nocookie.net/...",
      "wiki_url":     "https://starwars.fandom.com/wiki/..."
    }
  ]
}
```

### `works[]` shape

**Required:** `id`, `era`, `medium`, `title`, and `year` for every era except
`NON-CANON`.  
**Optional** (omitted when unknown, no nulls): `year`, `series`, `series_number`,
`number`, `year_end`, `release_date`, `release_precision`, `authors`,
`publisher`, `cover_url`, `wiki_url`. `series` and `series_number` are parallel
arrays — a single work can belong to multiple series; positional pairing
preserves which issue number applies to which series. `number` is a separate
scalar: the work's position within its own story arc.
`release_precision` is `"day" | "month" | "year"`, always emitted
alongside `release_date`, so the UI can render `"November 1996"` faithfully.
`year_end` is set only when an item spans a year range (e.g. multi-year TV runs).

- `era` — string from the 10-entry `ERAS` list (UPPERCASE, e.g. `"REBELLION"`).
- `medium` — string from the `MEDIUMS` list (Title Case, e.g. `"Novel"`).
- `year` — signed int; negative = BBY, non-negative = ABY. Absent on
  `NON-CANON` works, which sit outside the in-universe chronology; the UI
  omits the year entirely for those (no placeholder label).
- `id` — a frozen uuid stored in the Excel `ID` column (see *Stable IDs* above).
  Not recomputed from content, so edits to title/era/etc. never change it.

There is no `collections` array, no `color`, and no `collection_ids` — those
were removed when collections/ownership became per-user (see *Per-user layer*).

## Build & deploy

```bash
just scrape      # Excel + Wookieepedia → works.json (uses cache)
just dev         # frontend dev server
just build       # production build
just deploy      # publish to GitHub Pages
just --list      # all recipes
```

Live site: <https://adriwankenobi.github.io/swdb/>

## Stack summary

| Layer | Technology |
|---|---|
| Data source | `Star Wars EU.xlsx` (openpyxl) |
| Metadata enrichment | Wookieepedia MediaWiki API |
| Pipeline runtime | Python 3.12 · uv |
| Frontend bundler | Vite 6 |
| UI framework | React + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State management | zustand |
| Auth / per-user data | Supabase (auth, Postgres + RLS, Storage) |
| Virtualization | @tanstack/react-virtual |
| Hosting | GitHub Pages (`gh-pages` npm package) |
| Task runner | just |
