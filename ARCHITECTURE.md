# SWDB — Architecture

SWDB is a personal browsable web catalog of every work in the Star Wars
Expanded Universe. A Python pipeline reads `Star Wars EU.xlsx`, enriches each
row with Wookieepedia metadata, and emits a single static JSON file consumed
by a React SPA deployed to GitHub Pages. The pipeline and frontend communicate
only through that JSON file; neither half is aware of the other's internals.

## Repo layout

| Path | Contents |
|---|---|
| `Star Wars EU.xlsx` | Source of truth for title / series / medium / # / year |
| `scripts/` | Python pipeline (`build_data.py` orchestrates) |
| `tests/` | pytest suite for the pipeline |
| `frontend/` | React SPA (Vite + TS) |
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
   frontend/public/data/works.json
```

**Trusted vs. fetched fields:**

- Excel is the sole authority for `title`, `series`, `medium`, `number`, and
  `year`. These are never overwritten by Wookieepedia data.
- Wookieepedia (via the MediaWiki `action=parse` API, bypassing Cloudflare) is
  the sole source for `authors`, `publisher`, `release_date`, `cover_url`, and
  `wiki_url`.

**Excel writeback:** after enrichment, the four Wookieepedia-sourced fields are
written back into the corresponding Excel cells (`AUTHOR`, `PUBLISHER`,
`RELEASE`, `COVER`) so the spreadsheet stays in sync. Trusted columns are never
modified.

**Mediums:** `MEDIUMS` is a 7-entry alphabetical canonical list:
`Comic`, `Junior Novel`, `Movie`, `Novel`, `Short Story`, `TV Show`, `Videogame`.
Order is permanent — `MEDIUMS.indexOf` drives the frontend facet ordering, and
URL slug aliases derive from these spellings via `slugify`.

**Caching:** fetched HTML is stored under `data/.cache/wookieepedia/` (gitignored).
`--refresh` bypasses it; `just clean-cache` deletes it.

**Logs** (all gitignored):

| File | Meaning |
|---|---|
| `data/unmatched.log` | Rows whose Wookieepedia page could not be resolved |
| `data/ignored_no_year.log` | Rows with no Excel `YEAR` cell (excluded from JSON) |
| `data/missing_medium.log` | Rows whose medium is not in `MEDIUMS` (excluded from JSON) |

## Frontend (React)

Stack: Vite · React · TypeScript · Tailwind CSS 4 · shadcn/ui · zustand ·
`@tanstack/react-virtual`.

**Three view modes** selectable from the top bar:

- **Cards** — responsive cover-art grid, virtualized rows.
- **Table** — sortable columns, virtualized rows.
- **Timeline** — vertical scroll; Chronology mode groups by era then in-universe
  year; Release mode groups by real-world release year.

**Sidebar facets:** Era (10 checkboxes) · Medium (7 checkboxes) · Series /
Author / Publisher (searchable multi-select) · Year range slider. Within a
field: OR semantics. Between fields: AND semantics.

**Top-bar tabs** filter by era, medium, and decade simultaneously.

**URL state:** filter selection, view mode, sort order, and the open work id are
all reflected as query params (`?era=rebellion,new-republic&medium=novel&view=cards&work=<id>`).
Era and medium values are kebab-case slug aliases of their canonical names.
Unknown slugs (including legacy integer values from old bookmarks) are silently
dropped on read. `history.replaceState` keeps the URL current without adding
history entries.

**Stable sort:** `Array.prototype.sort` is stable; JSON-array order (which is
Excel row order) is the implicit tiebreaker for equal sort keys. There is no
explicit `excel_order` field in the JSON.

**Detail modal:** triggered by any work click; URL param `work=<id>` enables
deep links. Shows cover, title, series, medium, era, in-universe year, release
date, authors, publisher, and a Wookieepedia link. Only fields present in the
JSON are rendered.

## `works.json` schema

```json
{
  "generated_at": "2026-04-29T00:00:00Z",
  "works": [
    {
      "id":           "<uuid5>",
      "era":          "REBELLION",
      "medium":       "Novel",
      "title":        "A New Hope",
      "year":         0,
      "series":       "Star Wars Episode",
      "number":       "IV",
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

**Required:** `id`, `era`, `medium`, `title`, `year`.  
**Optional** (omitted when unknown, no nulls): `series`, `number`,
`release_date`, `release_precision`, `authors`, `publisher`, `cover_url`,
`wiki_url`. `release_precision` is `"day" | "month" | "year"` and is always
emitted alongside `release_date`; it lets the UI render `"November 1996"`
(month-only Wookieepedia source) faithfully rather than fabricating a `01`
day component.

- `era` — string from the 10-entry `ERAS` list (UPPERCASE, e.g. `"REBELLION"`).
- `medium` — string from the `MEDIUMS` list (Title Case, e.g. `"Novel"`).
- `year` — signed int; negative = BBY, non-negative = ABY.
- `id` — uuid5 keyed on `era|series|title|medium|#`. The era component is the
  canonical *index* (kept as `int` internally) and the medium component is the
  canonical string, so flipping the JSON encoding leaves IDs stable.

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
| Virtualization | @tanstack/react-virtual |
| Hosting | GitHub Pages (`gh-pages` npm package) |
| Task runner | just |
