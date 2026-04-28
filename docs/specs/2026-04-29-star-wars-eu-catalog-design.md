# Star Wars EU Catalog — Design

**Date:** 2026-04-29
**Status:** Approved (pending written-spec review)
**Owner:** adriwankenobi

## 1. Purpose

A personal, browsable web catalog of every work in the Star Wars Expanded Universe, sourced from `Star Wars EU.xlsx` and enriched with Wookieepedia metadata. Goals:

- View all ~1,966 works across the 10 EU eras.
- Filter by era, medium, series, author, publisher, in-universe year.
- Free-text search.
- Three view modes: Card grid (default), Table, Timeline.
- Detail modal with cover, full metadata, and a Wookieepedia link.
- Deploy as a static site to GitHub Pages under `adriwankenobi`.

**Non-goals (v1):** user accounts, read/unread tracking, "Read" button that opens a local file or cloud link. The design must accommodate adding these later without rework, but no placeholder files, fields, or UI ship now.

## 2. Architecture overview

Two independent halves communicating through a single static JSON file.

```
Star Wars EU.xlsx        Wookieepedia (MediaWiki API + HTML)
        │                              │
        └──────────┬───────────────────┘
                   ▼
          Build pipeline (Python, on demand)
                   │
                   ▼
       frontend/public/data/works.json
                   │
                   ▼
          React app (Vite + TS, static)
                   │
                   ▼
              GitHub Pages
```

The pipeline runs only when the user invokes it (`just scrape`). The React app loads the emitted JSON at runtime; nothing in the app talks to Wookieepedia or the Excel directly.

## 3. Data sources

- **Excel** — source of truth for `title`, `series`, `medium`, `number`. These four are the only fields trusted from the spreadsheet.
- **Wookieepedia** (`starwars.fandom.com`) — sole source for `authors`, `publisher`, `release_date`, `cover_url`, and `wiki_url`. Used via:
  - The `INFO` column when present (direct page URL).
  - MediaWiki `action=opensearch` API as a fallback when `INFO` is missing — pick the top match by title + series. Unmatched rows are logged to `data/unmatched.log` for manual review and still appear in the catalog with Excel-only data (no silent drops).

No multi-source fallback for v1. If specific fields turn out to be sparse, we can add OpenLibrary / TMDB later without changing the schema.

## 4. Build pipeline

### 4.1 Inputs and outputs

- **Input:** `Star Wars EU.xlsx` at the repo root.
- **Outputs:**
  - `frontend/public/data/works.json` — consumed by the app.
  - `data/.cache/wookieepedia/<slug>.html` — on-disk HTTP cache (gitignored).
  - `data/unmatched.log` — append-only list of rows whose Wookieepedia page could not be confidently resolved.

### 4.2 Steps

1. **Read Excel** with `openpyxl`. Iterate every sheet; sheet name = era. Skip header row. Capture `era` (sheet name), `title`, `series`, `medium`, `number`, plus the original `INFO` and `COVER` URLs if present.
2. **Resolve Wookieepedia URL** per row:
   - `INFO` filled → use it.
   - `INFO` empty → call `action=opensearch` with `<title> <series>`. Accept the top match only if the matched page title contains the work's `title` (case-insensitive substring after slug-normalizing both). Otherwise log to `unmatched.log` and proceed Excel-only.
3. **Fetch HTML** via the cache. Re-runs are near-free; `--refresh` flag bypasses the cache; `just clean-cache` deletes it.
4. **Parse infobox** with BeautifulSoup. Extract `authors[]`, `publisher`, `release_date` (ISO 8601), `cover_url`, `wiki_url`. Whitespace and date normalization happen here.
5. **Normalize era + year** — sheet name → integer index 0–9 via the `ERAS` constant; `25793 BBY` → `-25793`, `4 ABY` → `4` as a single signed integer (`year_in_universe`).
6. **Generate IDs** — `uuid5` of a fixed namespace UUID applied to the canonical key `era|series|title|medium|#`. Stable across rebuilds, deterministic, collision-free across mediums.
7. **Emit JSON** with the schema in §5. Omit any null/empty fields.

### 4.3 Flags

- `--refresh` — bypass HTTP cache.
- `--dry-run` — print summary of changes without writing the JSON or the unmatched log.

### 4.4 Override semantics

- Excel **overrides** Wookieepedia for the four reliable fields (`title`, `series`, `medium`, `number`).
- Wookieepedia **overrides** Excel for everything else (`authors`, `publisher`, `release_date`, `cover_url`).
- `wiki_url` is whichever URL was used to fetch (the resolved one).

## 5. Data model

`works.json`:

```json
{
  "generated_at": "2026-04-29T00:00:00Z",
  "works": [
    {
      "id": "<uuid5>",
      "era": 5,
      "title": "A New Hope",
      "series": "Star Wars Episode",
      "number": "IV",
      "medium": "Novel",
      "year_in_universe": 0,
      "release_date": "1976-11-12",
      "authors": ["Alan Dean Foster"],
      "publisher": "Del Rey",
      "cover_url": "https://static.wikia.nocookie.net/...",
      "wiki_url": "https://starwars.fandom.com/wiki/..."
    }
  ]
}
```

**Required fields:** `id`, `era`, `title`, `series`, `medium`, `year_in_universe`.
**Optional fields** are present only when known. No nulls or empty arrays in the JSON.

`era` is an integer index. The frontend keeps a constant:

```ts
export const ERAS = [
  'PRE-REPUBLIC',     // 0
  'OLD REPUBLIC',     // 1
  'RISE OF THE EMPIRE', // 2
  'THE CLONE WARS',   // 3
  'THE DARK TIMES',   // 4
  'REBELLION',        // 5
  'NEW REPUBLIC',     // 6
  'NEW JEDI ORDER',   // 7
  'LEGACY',           // 8
  'NON-CANON',        // 9
] as const;
```

`medium` is a normalized string from the canonical set: `Novel`, `Junior Novel`, `Young Reader Book`, `Comic`, `Short Story`, `Movie`, `TV Show`, `Videogame`, `Audio Drama`. Casing in the Excel (e.g. `COMIC`) is normalized at ingest.

`year_in_universe` formatting in the UI:
```ts
const fmt = (y: number) => y >= 0 ? `${y} ABY` : `${-y} BBY`;
```

## 6. Frontend

### 6.1 Stack

- Vite + React + TypeScript.
- Tailwind CSS + shadcn/ui (copy-paste accessible primitives: dialog, sheet, slider, command, checkbox, badge).
- Zustand for state.
- `@tanstack/react-virtual` for virtualization in Cards and Table views.
- Static deploy via `gh-pages` npm package.
- `vite.config.ts` `base: '/swdb/'` for GitHub Pages project pages.

### 6.2 Folder structure

```
frontend/
├── public/
│   └── data/works.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── constants/
│   │   └── eras.ts
│   ├── types/
│   │   └── work.ts
│   ├── store/
│   │   ├── catalogStore.ts
│   │   └── filterStore.ts
│   ├── lib/
│   │   ├── filterWorks.ts
│   │   └── formatYear.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── filters/
│   │   │   ├── EraFilter.tsx
│   │   │   ├── MediumFilter.tsx
│   │   │   ├── SeriesFilter.tsx
│   │   │   ├── AuthorFilter.tsx
│   │   │   ├── PublisherFilter.tsx
│   │   │   ├── YearRangeFilter.tsx
│   │   │   └── ActiveFilterChips.tsx
│   │   ├── views/
│   │   │   ├── CardGrid.tsx
│   │   │   ├── TableView.tsx
│   │   │   └── TimelineView.tsx
│   │   ├── work/
│   │   │   ├── WorkCard.tsx
│   │   │   ├── WorkRow.tsx
│   │   │   └── WorkDetailModal.tsx
│   │   └── ui/                 (shadcn/ui generated bits)
│   └── styles/globals.css
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### 6.3 State

- **`catalogStore`** — read-only: `works[]` loaded from `works.json`, plus derived facet lists (unique series, authors, publishers, year-bounds) computed once on load.
- **`filterStore`** — UI state: active filters (`eras: number[]`, `mediums: string[]`, `series: string[]`, `authors: string[]`, `publishers: string[]`, `yearMin: number`, `yearMax: number`, `q: string`), `view: 'cards' | 'table' | 'timeline'`, `sort: 'chronology' | 'release'`, and the currently open `workId | null`.
- **`filterWorks(works, filters)`** is a pure, memoized function returning the filtered, sorted result. All views consume it.

Splitting these stores keeps catalog data and UI state independent. A future per-user store (read/unread, ratings) can be added as a third store without touching the others.

### 6.4 URL as source of truth

Filter state, view mode, sort, and the open work id are reflected in the URL via query params:

```
?era=5,6
 &medium=novel,comic
 &series=star-wars-episode
 &author=alan-dean-foster
 &publisher=del-rey
 &year_min=-25793
 &year_max=140
 &q=hope
 &view=cards
 &sort=chronology
 &work=<id>
```

- Multi-values are slugified (lowercase, dashes) and comma-separated.
- On load: parse params → hydrate `filterStore`. On change: debounced `history.replaceState` (no extra history entries; browser back leaves the app — chosen for simplicity).
- `localStorage` provides defaults for `view` and `sort` only when the URL contains none.

### 6.5 View modes

A segmented control in the TopBar switches between Cards, Table, and Timeline. Sort selector (Chronology / Release date) sits next to it.

**Cards (default).** Responsive grid (4–6 columns desktop, 2 tablet, 1 mobile). Each card shows cover, title, series + #, medium badge, year, authors. Lazy-loaded covers with fixed aspect ratio (no layout shift). Era-colored placeholder for missing covers. Virtualized rows. Click → modal.

**Table.** Columns: Cover thumb · Title · Series · # · Medium · Era · Year · Release date · Authors · Publisher. Sticky header, click-to-sort columns, virtualized rows. Row click → modal.

**Timeline.** Vertical scroll. Behavior depends on the active sort:
- *Chronology*: section headers are the 10 eras, color-coded; works grouped by `year_in_universe`; long empty year stretches collapsed into a `…` gap so dense regions aren't dwarfed by the 25,000-year span.
- *Release date*: section headers are real-world years (1976 …). No era bands; era is shown as a colored dot/ring on each marker so era distribution is still visible.
Markers are small cover thumbnails with hover tooltips. Click → modal.

### 6.6 Filtering & search

Sidebar (desktop) / drawer (mobile) facets:

- **Era** — checkboxes for the 10 eras, color-coded.
- **Medium** — checkboxes (canonical set from §5).
- **Series**, **Author**, **Publisher** — searchable multi-selects.
- **Year (in-universe)** — dual-handle range slider, formatted via `formatYear`.
- **Active filter chips** at the top of the main area, each removable; "Clear all" alongside.

Free-text search in the TopBar matches `title`, `series`, and `authors` (case-insensitive substring, debounced).

**Semantics:**
- Within a field: **OR** (checking Novel + Comic shows works of either medium; works with multiple matching `authors` match if any author is selected).
- Between fields: **AND** (all field constraints must hold).
- Search AND-combines with the facet filters.

Empty state: "No works match these filters" + "Clear filters" button.

### 6.7 Detail modal

Triggered by any work click. The current work id appears in the URL as `?...&work=<id>`, so deep links open directly into the modal. Esc / backdrop click closes and removes the param.

Layout, ~720px max-width:

- **Left column:** full-resolution cover (click → opens image in new tab). Era-colored placeholder if absent.
- **Right column:** title (large), series + # · medium badge · era badge, in-universe year · release date, authors, publisher, "Open on Wookieepedia →" link.

Only fields present in the JSON are rendered — no "Unknown" rows. Keyboard accessible (focus trap, Esc).

## 7. `justfile`

```just
# Run the build pipeline (Excel → works.json). Uses on-disk cache.
scrape:
    uv run python scripts/build_data.py

# Force a fresh fetch (ignore cache).
scrape-refresh:
    uv run python scripts/build_data.py --refresh

# Clear the Wookieepedia HTML cache.
clean-cache:
    rm -rf data/.cache

# Start the React dev server.
dev:
    cd frontend && npm run dev

# Build the static site for production.
build:
    cd frontend && npm run build

# Preview the production build locally.
preview:
    cd frontend && npm run preview

# Deploy to GitHub Pages (after `just build`).
deploy:
    cd frontend && npm run deploy

# Full rebuild: scrape + build.
all: scrape build

# Type-check + lint.
check:
    cd frontend && npm run typecheck && npm run lint
```

Python deps in `pyproject.toml` (managed by `uv`). Node deps in `frontend/package.json`. Deploy uses `gh-pages` npm package targeting `adriwankenobi`'s GitHub Pages.

## 8. Repo layout

```
SWDB/
├── Star Wars EU.xlsx
├── justfile
├── pyproject.toml
├── README.md
├── .gitignore                  (data/.cache, frontend/node_modules, frontend/dist; works.json IS committed so deploys don't need the pipeline)
├── scripts/
│   ├── build_data.py
│   ├── excel_reader.py
│   ├── wiki_client.py
│   ├── infobox_parser.py
│   └── id_utils.py
├── tests/
│   ├── test_id_utils.py
│   ├── test_excel_reader.py
│   ├── test_wiki_client.py
│   └── test_infobox_parser.py
├── data/
│   ├── .cache/                 (gitignored)
│   └── unmatched.log
├── docs/specs/
│   └── 2026-04-29-star-wars-eu-catalog-design.md
└── frontend/                   (see §6.2)
```

## 9. Testing

- **Pipeline (pytest):** `parse_year` (BBY/ABY normalization), `resolve_wiki_url` (fallback path), `parse_infobox` (against a couple of saved HTML fixtures from `data/.cache/`), `make_id` (uuid5 stability).
- **Frontend (vitest):** pure functions only — `filterWorks` and `formatYear`. No component tests in v1; visual feedback in the browser is faster.
- **CI (later):** GitHub Actions running `just check` and pipeline tests on PRs.

## 10. Forward compatibility (no placeholders shipped)

These features are explicitly out of scope for v1 but the design accommodates them:

- **User accounts / read-tracking.** Adding a `userStore` slice keyed by work `id` is a self-contained change. Stable `uuid5` IDs ensure read-state survives rebuilds. No fields or UI shipped today.
- **"Read" button (local file or cloud link).** Will read from a future field on each work (or a sibling `read-links.json`). The detail modal is a single component — adding a button is a localized edit.
- **JSON additivity.** New optional fields can be added without breaking the app, since the frontend only reads what it knows about.

## 11. Implementation phases

Rough sequencing for the implementation plan (each phase ends in a runnable checkpoint):

1. Repo bootstrap — `pyproject.toml`, `justfile`, `.gitignore`, README skeleton.
2. Pipeline core — Excel reader, ID generator, emit minimal JSON (no Wookieepedia yet).
3. Wookieepedia client + parser — fetch, cache, parse infobox, auto-search fallback, `unmatched.log`.
4. Frontend bootstrap — Vite + TS + Tailwind + shadcn/ui scaffold; load JSON; render dumb list.
5. Filter store + URL sync + sidebar — facets working with one view (Cards).
6. Cards view (virtualized) + Detail modal + URL `work=` param.
7. Table view (sortable columns, virtualized).
8. Timeline view — Chronology mode, then Release-date mode.
9. Polish — empty states, mobile drawer, GitHub Pages deploy (`vite base`, `gh-pages`), README.

## 12. Deployment

- Repo: <https://github.com/adriwankenobi/swdb> (public).
- Hosting: GitHub Pages, project page at <https://adriwankenobi.github.io/swdb/>.
- Vite `base` is `/swdb/`.
- `npm run deploy` (uses `gh-pages` package) publishes the `frontend/dist` build to the `gh-pages` branch.
