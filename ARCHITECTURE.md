# SWDB — Architecture

SWDB is a personal browsable web catalog of every work in the Star Wars
Expanded Universe. A Python pipeline reads `Star Wars EU.xlsx`, enriches each
row with Wookieepedia metadata, and emits a single static JSON file consumed
by a React SPA deployed to GitHub Pages. The pipeline and frontend communicate
only through that JSON file; neither half is aware of the other's internals.

The catalog browses two parallel item types: individual **works** (issues,
novels, episodes, etc.) and **collections** (omnibus volumes, series boxes,
anthologies that group several works under one cover). Collections are derived
from a dedicated Excel sheet and cross-linked to their member works.

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

**Collections:** a separate `COLLECTIONS` sheet in the Excel workbook lists each
collection's title and member rows (cross-referenced from the works sheet via a
`COLLECTED` column). The pipeline derives each collection's aggregate `eras`,
`mediums`, and anchor (the dominant-medium member used for timeline
placement), then enriches the collection itself from Wookieepedia (cover URL,
release date). The result is written back to the COLLECTIONS sheet and emitted
in `works.json` as a top-level `collections` array. Each member work gains a
`collection_ids` field so the frontend can reverse-lookup.

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
| `data/duplicates.log` | Rows that resolve to the same canonical key |
| `data/ignored_no_year.log` | Rows with no Excel `YEAR` cell (excluded from JSON) |
| `data/missing_medium.log` | Rows whose medium is not in `MEDIUMS` (excluded from JSON) |
| `data/dead_links.log` | Wiki URLs that returned 404 / no longer exist |
| `data/unmatched_collections.log` | Collection member titles that did not resolve to any work row |
| `data/invalid_collections.log` | COLLECTIONS-sheet rows rejected (missing title, empty members, etc.) |

## Frontend (React)

Stack: Vite · React · TypeScript · Tailwind CSS 4 · shadcn/ui · zustand ·
`@tanstack/react-virtual`.

**Items toggle** in the top bar switches the catalog between two parallel
universes:

- **Issues** (default) — list every individual work.
- **Collections** — list each collection once (replacing its anchor member),
  while non-anchor members are folded into their parent collection. Standalone
  works (not part of any collection) still appear.

The toggle reshapes the rendered list via `buildItemsList`, which produces a
single `Item[]` discriminated union (`{ kind: "work" } | { kind: "collection" }`)
consumed identically by all three views.

**Three view modes** selectable from the top bar:

- **Cards** — responsive cover-art grid, virtualized rows.
- **Table** — sortable columns, virtualized rows.
- **Timeline** — vertical scroll; Chronology mode groups by era then in-universe
  year; Release mode groups by real-world release year. Collections are placed
  by their anchor member's era and year.

**Top-bar tabs** filter by Era (multi-select), Medium (multi-select), and
Decade (multi-select, in release-sort mode). The decade strip also includes
an "Unknown" toggle for works with no `release_date`. **Sidebar facets:**
Series / Author / Publisher / **Collections** (all searchable multi-select).
Within a field: OR semantics. Between fields: AND semantics.

**URL state:** filter selection, view mode, sort order, items toggle, and the
open work / collection id are all reflected as query params (e.g.
`?era=rebellion,new-republic&medium=novel&items=collections&view=cards&collection=<id>`).
Era and medium values are kebab-case slug aliases of their canonical names.
The `collections=<slugs>` filter param uses collection title slugs (not ids);
`work=<id>` and `collection=<id>` open the respective modal (mutually
exclusive). Unknown slugs and legacy integer values are silently dropped on
read. `history.replaceState` keeps the URL current without adding history
entries.

**Stable sort:** `Array.prototype.sort` is stable; JSON-array order (which is
Excel row order) is the implicit tiebreaker for equal sort keys. There is no
explicit `excel_order` field in the JSON.

**Work detail modal:** triggered by any work click; URL param `work=<id>` enables
deep links. Shows cover, title, series, medium, era, in-universe year, release
date, authors, publisher, and a Wookieepedia link. If the work belongs to one
or more collections, a "Collected in" block at the bottom links to each parent
`CollectionDetailModal`. Works without their own `cover_url` borrow the cover
of the first cover-having collection they belong to (rendered dimmed so the
borrow is visible).

**Collection detail modal:** triggered by any collection click; URL param
`collection=<id>` enables deep links. Shows cover, title, aggregate eras and
mediums, year range, release date, and an "Includes" list of every member
work (each linkable, opens the work modal).

**Prev / next modal navigation:** while either modal is open, ← / → keys,
on-screen chevrons (desktop only), and horizontal swipe (mobile) walk the
currently visible filtered/sorted list — which mixes works and collections
naturally, so navigation crosses item types at boundaries. If the open item is
not in the current list (e.g. a collection reached via "Collected in" while
filters hide it), both arrows render disabled with a "Not in current view"
tooltip.

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
      "series":       ["Star Wars Episode"],
      "number":       ["IV"],
      "release_date": "1976-11-12",
      "release_precision": "day",
      "authors":      ["Alan Dean Foster"],
      "publisher":    "Del Rey",
      "cover_url":    "https://static.wikia.nocookie.net/...",
      "wiki_url":     "https://starwars.fandom.com/wiki/...",
      "collection_ids": ["<collection-uuid5>"]
    }
  ],
  "collections": [
    {
      "id":               "<uuid5>",
      "title":            "Dawn of the Jedi - Into the void",
      "eras":             ["PRE-REPUBLIC"],
      "mediums":          ["Novel", "Short Story"],
      "year":             -25793,
      "anchor_year":      -25793,
      "anchor_era":       "PRE-REPUBLIC",
      "anchor_member_id": "<work-uuid5>",
      "member_ids":       ["<work-uuid5>", "<work-uuid5>", "<work-uuid5>"],
      "release_date":     "2013-05-07",
      "release_precision": "day",
      "color":            "#FBD9D7",
      "cover_url":        "https://static.wikia.nocookie.net/...",
      "wiki_url":         "https://starwars.fandom.com/wiki/..."
    }
  ]
}
```

### `works[]` shape

**Required:** `id`, `era`, `medium`, `title`, `year`.  
**Optional** (omitted when unknown, no nulls): `series`, `number`, `year_end`,
`release_date`, `release_precision`, `authors`, `publisher`, `cover_url`,
`wiki_url`, `color`, `collection_ids`. `series` and `number` are parallel
arrays — a single work can belong to multiple series (e.g. a tie-in comic that
is both part of a story arc and an omnibus reading order); positional pairing
between the two arrays preserves which number applies to which series.
`release_precision` is `"day" | "month" | "year"` and is always emitted
alongside `release_date`; it lets the UI render `"November 1996"`
(month-only Wookieepedia source) faithfully rather than fabricating a `01`
day component. `year_end` is set only when an item spans a year range (e.g.
multi-year TV runs). `color` is a `#RRGGBB` hex string copied from the Excel
row's fill color (used as the work's background tint in card / row / modal
views). `collection_ids` lists the collections this work is a member of.

- `era` — string from the 10-entry `ERAS` list (UPPERCASE, e.g. `"REBELLION"`).
- `medium` — string from the `MEDIUMS` list (Title Case, e.g. `"Novel"`).
- `year` — signed int; negative = BBY, non-negative = ABY.
- `id` — uuid5 keyed on `era|series|title|medium|#`. The era component is the
  canonical *index* (kept as `int` internally) and the medium component is the
  canonical string, so flipping the JSON encoding leaves IDs stable.

### `collections[]` shape

**Required:** `id`, `title`, `eras`, `mediums`, `year`, `anchor_year`,
`anchor_era`, `anchor_member_id`, `member_ids`.  
**Optional:** `year_end`, `release_date`, `release_precision`, `color`,
`cover_url`, `wiki_url`.

- `eras` / `mediums` — deduplicated unions over all member works.
- `year` / `year_end` — full range across all members; `year_end` is omitted
  when equal to `year`.
- `anchor_year` / `anchor_era` — drawn from the dominant-medium member, used
  to place the collection on the timeline.
- `anchor_member_id` — the member work used as the anchor; in Collections view
  this work is replaced by the collection in the rendered list.
- `member_ids` — every work that belongs to the collection, in reading order.

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
