# Star Wars EU Catalog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static, browsable web catalog of every work in the Star Wars Expanded Universe at `https://adriwankenobi.github.io/swdb/`, sourced from `Star Wars EU.xlsx` and enriched with Wookieepedia metadata.

**Architecture:** Python build pipeline reads the Excel, scrapes Wookieepedia (cached), emits a single `works.json`. A static React SPA loads that JSON and renders three views (Cards / Table / Timeline) with sidebar facet filters, free-text search, URL-synced state, and a detail modal. The pipeline and frontend communicate only through the JSON file.

**Tech Stack:** Python 3.12+ (uv, openpyxl, requests, beautifulsoup4, pytest, ruff). React 18 + TypeScript (Vite, Tailwind 4, shadcn/ui, zustand, @tanstack/react-virtual, vitest). `just` for command runner. `gh-pages` for deploy.

**Spec:** [docs/specs/2026-04-29-star-wars-eu-catalog-design.md](../specs/2026-04-29-star-wars-eu-catalog-design.md)

---

## File Structure (locked in by this plan)

```
SWDB/
├── Star Wars EU.xlsx                   (already committed)
├── justfile                            (Phase 1)
├── pyproject.toml                      (Phase 1)
├── README.md                           (Phase 1)
├── .gitignore                          (already committed; appended in later phases)
├── scripts/
│   ├── __init__.py
│   ├── build_data.py                   (CLI entry — orchestrator)
│   ├── excel_reader.py                 (Excel → list[ExcelRow])
│   ├── id_utils.py                     (uuid5 IDs + slugify)
│   ├── year_utils.py                   (BBY/ABY parsing + formatting)
│   ├── wiki_client.py                  (HTTP + on-disk cache + opensearch resolver)
│   └── infobox_parser.py               (BeautifulSoup → infobox dict)
├── tests/
│   ├── __init__.py
│   ├── test_id_utils.py
│   ├── test_year_utils.py
│   ├── test_excel_reader.py
│   ├── test_wiki_client.py
│   ├── test_infobox_parser.py
│   └── fixtures/
│       └── infobox_a_new_hope.html     (saved Wookieepedia HTML — covers all infobox fields)
├── data/
│   ├── .cache/                         (gitignored — HTTP cache)
│   ├── unmatched.log                   (auto-search misses, gitignored)
│   ├── duplicates.log                  (rows with colliding canonical keys, gitignored)
│   ├── missing_medium.log              (rows whose medium isn't in canonical MEDIUMS, gitignored)
│   └── ignored_no_year.log             (rows in Excel with no YEAR cell — reference-only, gitignored)
├── docs/
│   ├── specs/2026-04-29-star-wars-eu-catalog-design.md
│   └── plans/2026-04-29-star-wars-eu-catalog-plan.md
└── frontend/
    ├── public/
    │   └── data/works.json             (committed — built by pipeline)
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── components.json                 (shadcn config)
    ├── .eslintrc.cjs
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── styles/globals.css
    │   ├── constants/{eras,mediums}.ts
    │   ├── types/work.ts
    │   ├── store/
    │   │   ├── catalogStore.ts         (read-only data + derived facets)
    │   │   └── filterStore.ts          (filters, search, view, sort, openWorkId)
    │   ├── lib/
    │   │   ├── filterWorks.ts          (pure: works + filters → works[])
    │   │   ├── formatYear.ts           (int → "0 ABY"/"5000 BBY")
    │   │   ├── slug.ts                 (slugify for URL params and facet keys)
    │   │   ├── urlState.ts             (filterStore <-> URLSearchParams sync)
    │   │   └── __tests__/
    │   │       ├── filterWorks.test.ts
    │   │       ├── formatYear.test.ts
    │   │       └── slug.test.ts
    │   ├── components/
    │   │   ├── layout/{AppShell,Sidebar,TopBar}.tsx
    │   │   ├── filters/{Era,Medium,Series,Author,Publisher,YearRange}Filter.tsx
    │   │   ├── filters/ActiveFilterChips.tsx
    │   │   ├── views/{CardGrid,TableView,TimelineView}.tsx
    │   │   ├── work/{WorkCard,WorkRow,WorkDetailModal}.tsx
    │   │   └── ui/                     (shadcn-generated)
    │   └── vite-env.d.ts
    └── (gh-pages publishes from frontend/dist/)
```

**Single-responsibility rules used:**
- `id_utils` only generates IDs and slugs. `year_utils` only parses years.
- `wiki_client` only does HTTP + cache + URL resolution. `infobox_parser` only does HTML → dict.
- `excel_reader` only reads and normalizes; it does not call Wookieepedia.
- `build_data` orchestrates: it composes the others.
- Frontend `lib/` holds pure functions (testable). `store/` holds zustand state. `components/` consumes both.

---

## Phase 1 — Repo bootstrap

### Task 1.1: Add `pyproject.toml`

**Files:**
- Create: `pyproject.toml`

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[project]
name = "swdb-pipeline"
version = "0.1.0"
description = "Star Wars EU catalog build pipeline"
requires-python = ">=3.12"
dependencies = [
    "openpyxl>=3.1.5",
    "requests>=2.32.3",
    "beautifulsoup4>=4.12.3",
]

[dependency-groups]
dev = [
    "pytest>=8.3.3",
    "ruff>=0.7.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]
```

- [ ] **Step 2: Verify uv resolves the lockfile**

Run: `uv sync`
Expected: lockfile written, venv created, dependencies installed without error.

- [ ] **Step 3: Commit**

```bash
git add pyproject.toml uv.lock
git commit -m "Add pyproject.toml with pipeline dependencies"
```

### Task 1.2: Add `justfile`

**Files:**
- Create: `justfile`

- [ ] **Step 1: Write `justfile`**

```just
# Run the build pipeline (Excel -> works.json). Uses on-disk cache.
scrape:
    uv run python -m scripts.build_data

# Force a fresh fetch (ignore cache).
scrape-refresh:
    uv run python -m scripts.build_data --refresh

# Print what would change without writing the JSON.
scrape-dry-run:
    uv run python -m scripts.build_data --dry-run

# Clear the Wookieepedia HTML cache.
clean-cache:
    rm -rf data/.cache

# Run pipeline tests.
test-pipeline:
    uv run pytest -v

# Lint Python.
lint:
    uv run ruff check scripts tests
    uv run ruff format --check scripts tests

# Format Python.
fmt:
    uv run ruff format scripts tests

# Start the React dev server.
dev:
    cd frontend && npm run dev

# Build the static site for production.
build:
    cd frontend && npm run build

# Preview the production build locally.
preview:
    cd frontend && npm run preview

# Type-check + lint frontend.
check-frontend:
    cd frontend && npm run typecheck && npm run lint

# Run frontend tests.
test-frontend:
    cd frontend && npm test

# Deploy to GitHub Pages (after `just build`).
deploy:
    cd frontend && npm run deploy

# Full rebuild: scrape + build.
all: scrape build
```

- [ ] **Step 2: Verify just is installed**

Run: `just --list`
Expected: lists every recipe above.

- [ ] **Step 3: Commit**

```bash
git add justfile
git commit -m "Add justfile with pipeline and frontend commands"
```

### Task 1.3: Update `.gitignore` for Python and write `README.md`

**Files:**
- Modify: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Append Python lock + venv to .gitignore**

Replace contents of `.gitignore` with:

```gitignore
# macOS
.DS_Store

# Pipeline artifacts
data/.cache/
data/unmatched.log

# Python
__pycache__/
*.py[cod]
.venv/
.uv/

# Frontend (will exist after bootstrap)
frontend/node_modules/
frontend/dist/

# Editors
.vscode/
.idea/
```

(`uv.lock` is intentionally NOT ignored — committing it pins versions.)

- [ ] **Step 2: Write `README.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore README.md
git commit -m "Bootstrap README and update gitignore for Python + frontend"
```

---

## Phase 2 — Pipeline core (Excel + IDs + years, no Wookieepedia yet)

### Task 2.1: `id_utils.slugify` and `id_utils.make_id`

**Files:**
- Create: `scripts/__init__.py` (empty)
- Create: `scripts/id_utils.py`
- Create: `tests/__init__.py` (empty)
- Create: `tests/test_id_utils.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_id_utils.py`:

```python
import uuid

import pytest

from scripts.id_utils import make_id, slugify


def test_slugify_lowercases_and_replaces_spaces():
    assert slugify("A New Hope") == "a-new-hope"


def test_slugify_strips_punctuation():
    assert slugify("Tales of the Jedi: The Sith War") == "tales-of-the-jedi-the-sith-war"


def test_slugify_collapses_multiple_separators():
    assert slugify("  Star   Wars--Episode  ") == "star-wars-episode"


def test_slugify_preserves_digits_and_roman_numerals():
    assert slugify("Star Wars Episode IV") == "star-wars-episode-iv"


def test_slugify_handles_empty_string():
    assert slugify("") == ""


def test_make_id_is_deterministic_for_same_inputs():
    a = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Novel", number="IV")
    b = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Novel", number="IV")
    assert a == b


def test_make_id_differs_when_medium_differs():
    a = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Novel", number="IV")
    b = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Movie", number="IV")
    assert a != b


def test_make_id_handles_missing_optional_inputs():
    a = make_id(era=4, series=None, title="Hammer", medium="Short Story", number=None)
    # Stable across calls
    b = make_id(era=4, series=None, title="Hammer", medium="Short Story", number=None)
    assert a == b


def test_make_id_returns_uuid_string():
    result = make_id(era=0, series="Dawn of the Jedi", title="Eruption", medium="Short Story", number=None)
    parsed = uuid.UUID(result)
    assert parsed.version == 5
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_id_utils.py -v`
Expected: ImportError / ModuleNotFoundError on `scripts.id_utils`.

- [ ] **Step 3: Write `scripts/id_utils.py`**

```python
"""ID and slug helpers for the pipeline."""

from __future__ import annotations

import re
import uuid

# Fixed namespace UUID. Do not change this value; IDs depend on it.
_NAMESPACE = uuid.UUID("a3f8c4e2-7d1b-4f9a-8e6c-2b5d9e0f1a3c")

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    """Lowercase, strip punctuation, collapse separators."""
    if not text:
        return ""
    lowered = text.lower()
    replaced = _SLUG_RE.sub("-", lowered)
    return replaced.strip("-")


def make_id(
    *,
    era: int,
    series: str | None,
    title: str,
    medium: str,
    number: str | int | None,
) -> str:
    """Deterministic UUIDv5 from the canonical key."""
    parts = [
        str(era),
        slugify(series or ""),
        slugify(title),
        slugify(medium),
        slugify(str(number) if number is not None else ""),
    ]
    canonical = "|".join(parts)
    return str(uuid.uuid5(_NAMESPACE, canonical))
```

Also create empty package files:

```bash
touch scripts/__init__.py tests/__init__.py
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_id_utils.py -v`
Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/__init__.py scripts/id_utils.py tests/__init__.py tests/test_id_utils.py
git commit -m "Add id_utils with slugify and deterministic uuid5 make_id"
```

### Task 2.2: `year_utils.parse_year` (BBY/ABY → signed int)

**Files:**
- Create: `scripts/year_utils.py`
- Create: `tests/test_year_utils.py`

- [ ] **Step 1: Write the failing tests**

```python
import pytest

from scripts.year_utils import parse_year


def test_parse_year_aby_positive():
    assert parse_year("0 ABY") == 0
    assert parse_year("4 ABY") == 4
    assert parse_year("140 ABY") == 140


def test_parse_year_bby_negative():
    assert parse_year("19 BBY") == -19
    assert parse_year("5000 BBY") == -5000
    assert parse_year("25793 BBY") == -25793


def test_parse_year_handles_extra_whitespace():
    assert parse_year("  4   ABY  ") == 4


def test_parse_year_case_insensitive():
    assert parse_year("4 aby") == 4
    assert parse_year("19 bby") == -19


def test_parse_year_returns_none_on_invalid():
    assert parse_year("") is None
    assert parse_year(None) is None
    assert parse_year("Unknown") is None
    assert parse_year("4") is None  # missing era suffix


def test_parse_year_circa_prefix_ignored():
    # Wookieepedia sometimes writes "c. 25,793 BBY"; we accept the comma and the c.
    assert parse_year("c. 25,793 BBY") == -25793
    assert parse_year("c. 4 ABY") == 4
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_year_utils.py -v`
Expected: ImportError on `scripts.year_utils`.

- [ ] **Step 3: Write `scripts/year_utils.py`**

```python
"""Parsing for BBY/ABY year strings."""

from __future__ import annotations

import re

_YEAR_RE = re.compile(r"^\s*(?:c\.\s*)?([\d,]+)\s+(BBY|ABY)\s*$", re.IGNORECASE)


def parse_year(value: str | None) -> int | None:
    """Convert '4 ABY' -> 4, '5000 BBY' -> -5000. Returns None if unparseable."""
    if value is None:
        return None
    match = _YEAR_RE.match(str(value))
    if not match:
        return None
    digits = match.group(1).replace(",", "")
    era = match.group(2).upper()
    n = int(digits)
    return -n if era == "BBY" else n
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_year_utils.py -v`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/year_utils.py tests/test_year_utils.py
git commit -m "Add year_utils.parse_year for BBY/ABY normalization"
```

### Task 2.3: `excel_reader.read_works`

**Files:**
- Create: `scripts/excel_reader.py`
- Create: `tests/test_excel_reader.py`

- [ ] **Step 1: Write the failing tests**

```python
from pathlib import Path

import pytest

from scripts.excel_reader import ExcelRow, read_works


REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "Star Wars EU.xlsx"


@pytest.fixture(scope="module")
def rows():
    return list(read_works(EXCEL_PATH))


def test_reads_all_eras(rows):
    eras = {row.era for row in rows}
    # 10 sheets: 0..9
    assert eras == set(range(10))


def test_total_row_count_is_at_least_1900(rows):
    assert len(rows) >= 1900


def test_excel_row_required_fields_present(rows):
    sample = next(r for r in rows if r.title == "A New Hope" and r.medium == "Novel")
    assert sample.era == 5  # REBELLION
    assert sample.series == "Star Wars Episode"
    assert sample.number == "IV"


def test_medium_casing_is_normalized(rows):
    # Excel has both 'Comic' and 'COMIC'. Reader should normalize.
    mediums = {row.medium for row in rows}
    assert "COMIC" not in mediums
    assert "Comic" in mediums
    assert "MOVIE" not in mediums
    assert "Movie" in mediums
    assert "NOVEL" not in mediums
    assert "Novel" in mediums


def test_year_parsed(rows):
    sample = next(r for r in rows if r.title == "A New Hope" and r.medium == "Novel")
    assert sample.year == 0


def test_excel_row_skips_empty_rows(rows):
    # Defensive — no rows should be missing a title.
    assert all(row.title for row in rows)


def test_info_url_present_for_known_row(rows):
    sample = next(r for r in rows if r.title == "Eruption" and r.medium == "Short Story")
    assert sample.info_url and "starwars.fandom.com" in sample.info_url


def test_read_works_yields_rows_in_canonical_excel_order(rows):
    # The order in which rows are yielded IS the canonical order. This test
    # encodes that contract: the first row of REBELLION (era 5) appears in the
    # output before the first row of NEW REPUBLIC (era 6), regardless of any
    # later sorting in the frontend.
    eras_in_yield_order = [r.era for r in rows]
    # Rows are grouped by era in sheet-iteration order; eras must appear in
    # non-decreasing chunks.
    seen_eras: list[int] = []
    for e in eras_in_yield_order:
        if not seen_eras or seen_eras[-1] != e:
            seen_eras.append(e)
    assert seen_eras == sorted(seen_eras)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_excel_reader.py -v`
Expected: ImportError on `scripts.excel_reader`.

- [ ] **Step 3: Write `scripts/excel_reader.py`**

```python
"""Read Star Wars EU.xlsx into normalized rows."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from openpyxl import load_workbook

from scripts.year_utils import parse_year

# Sheet name -> era index. Order matches the spec's ERAS constant.
ERA_INDEX: dict[str, int] = {
    "PRE-REPUBLIC": 0,
    "OLD REPUBLIC": 1,
    "RISE OF THE EMPIRE": 2,
    "THE CLONE WARS": 3,
    "THE DARK TIMES": 4,
    "REBELLION": 5,
    "NEW REPUBLIC": 6,
    "NEW JEDI ORDER": 7,
    "LEGACY": 8,
    "NON-CANON": 9,
}

# Canonical medium spellings. Excel sometimes uses uppercase; normalize.
_MEDIUM_NORMALIZE: dict[str, str] = {
    "novel": "Novel",
    "junior novel": "Junior Novel",
    "young reader book": "Young Reader Book",
    "comic": "Comic",
    "short story": "Short Story",
    "movie": "Movie",
    "tv show": "TV Show",
    "videogame": "Videogame",
    "audio drama": "Audio Drama",
    "audio drama and comic": "Audio Drama",
    "audio drama and young reader book": "Audio Drama",
}


@dataclass(frozen=True)
class ExcelRow:
    era: int
    title: str
    series: str | None
    medium: str               # canonical Title Case (e.g. "Novel"); converted to int in build_data
    number: str | None
    year: int | None          # may be None when Excel YEAR is empty; Wookieepedia fallback in build_data
    info_url: str | None
    cover_url: str | None     # raw — may be ignored later in favor of wiki-fetched cover


def _normalize_medium(raw: str | None) -> str:
    if not raw:
        return ""
    cleaned = " ".join(str(raw).strip().split())
    return _MEDIUM_NORMALIZE.get(cleaned.lower(), cleaned)


def _stringify(cell: object) -> str | None:
    if cell is None:
        return None
    s = str(cell).strip()
    return s or None


def read_works(path: Path) -> Iterator[ExcelRow]:
    """Yield ExcelRow per non-empty data row in every sheet, in workbook order."""
    wb = load_workbook(path, data_only=True, read_only=True)
    try:
        for sheet_name in wb.sheetnames:
            if sheet_name not in ERA_INDEX:
                continue
            era = ERA_INDEX[sheet_name]
            ws = wb[sheet_name]
            rows_iter = ws.iter_rows(values_only=True)
            try:
                next(rows_iter)
            except StopIteration:
                continue
            # Header layout: YEAR, MEDIUM, SERIES, TITLE, #, AUTHOR, PUBLISHER, RELEASE, COLLECTED, INFO, COVER
            # We trust positions 0..10 by index.
            for raw in rows_iter:
                year_raw = _stringify(raw[0])
                medium_raw = _stringify(raw[1])
                series = _stringify(raw[2])
                title = _stringify(raw[3])
                number = _stringify(raw[4])
                info_url = _stringify(raw[9]) if len(raw) > 9 else None
                cover_url = _stringify(raw[10]) if len(raw) > 10 else None
                if not title or not medium_raw:
                    continue
                yield ExcelRow(
                    era=era,
                    title=title,
                    series=series,
                    medium=_normalize_medium(medium_raw),
                    number=number,
                    year=parse_year(year_raw),
                    info_url=info_url,
                    cover_url=cover_url,
                )
    finally:
        wb.close()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_excel_reader.py -v`
Expected: all 8 tests pass against the real Excel file.

- [ ] **Step 5: Commit**

```bash
git add scripts/excel_reader.py tests/test_excel_reader.py
git commit -m "Add excel_reader.read_works with medium normalization"
```

### Task 2.4: `build_data` orchestrator emits Wookieepedia-empty JSON

**Files:**
- Create: `scripts/build_data.py`
- Modify: `.gitignore` (no change needed; works.json is intentionally tracked)

- [ ] **Step 1: Write `scripts/build_data.py`**

```python
"""Build pipeline orchestrator: Excel -> works.json."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from scripts.excel_reader import ExcelRow, read_works
from scripts.id_utils import make_id

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "Star Wars EU.xlsx"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "works.json"
DUPLICATES_LOG = REPO_ROOT / "data" / "duplicates.log"
MISSING_MEDIUM_LOG = REPO_ROOT / "data" / "missing_medium.log"
IGNORED_NO_YEAR_LOG = REPO_ROOT / "data" / "ignored_no_year.log"

# Canonical medium list, alphabetical. Order is permanent: new entries must be
# APPENDED at the end so existing indices retain their meaning.
MEDIUMS = [
    "Comic",           # 0
    "Junior Novel",    # 1
    "Movie",           # 2
    "Novel",           # 3
    "Short Story",     # 4
    "TV Show",         # 5
    "Videogame",       # 6
]
_MEDIUM_TO_INDEX = {name: i for i, name in enumerate(MEDIUMS)}


def _row_to_work(row: ExcelRow) -> dict | None:
    """Build a work dict; return None if the row should be excluded.

    Two exclusion paths (both return None):
      - row.year is None  -> Excel YEAR cell is empty; reference-only entry.
      - row.medium not in canonical MEDIUMS  -> developer must extend MEDIUMS.
    The caller distinguishes them and logs to separate files.
    """
    if row.year is None:
        return None
    if row.medium not in _MEDIUM_TO_INDEX:
        return None
    work: dict = {
        "id": make_id(
            era=row.era,
            series=row.series,
            title=row.title,
            medium=row.medium,    # ID uses the canonical medium STRING for stability
            number=row.number,
        ),
        "era": row.era,
        "title": row.title,
        "medium": _MEDIUM_TO_INDEX[row.medium],   # JSON gets the integer index
        "year": row.year,
    }
    if row.series:
        work["series"] = row.series
    if row.number is not None:
        work["number"] = row.number
    return work


def _detect_duplicates(works: list[dict]) -> list[list[dict]]:
    by_id: dict[str, list[dict]] = defaultdict(list)
    for w in works:
        by_id[w["id"]].append(w)
    groups = [g for g in by_id.values() if len(g) > 1]
    if not groups:
        return groups
    for g in groups:
        print(f"[WARN] duplicate id {g[0]['id']}:", file=sys.stderr)
        for w in g:
            print(
                f"  era={w['era']} title={w['title']!r} medium={w['medium']} "
                f"series={w.get('series')} number={w.get('number')}",
                file=sys.stderr,
            )
    rows_total = sum(len(g) for g in groups)
    print(
        f"{len(groups)} duplicate id group{'s' if len(groups) != 1 else ''} "
        f"({rows_total} rows). See {DUPLICATES_LOG.relative_to(REPO_ROOT)}.",
        file=sys.stderr,
    )
    DUPLICATES_LOG.parent.mkdir(parents=True, exist_ok=True)
    DUPLICATES_LOG.write_text(
        "\n\n".join(
            "\n".join(
                [f"id {g[0]['id']}"]
                + [
                    f"  era={w['era']} title={w['title']!r} medium={w['medium']} "
                    f"series={w.get('series')} number={w.get('number')}"
                    for w in g
                ]
            )
            for g in groups
        ) + "\n",
        encoding="utf-8",
    )
    return groups


def build(*, refresh: bool, dry_run: bool) -> dict:
    if refresh:
        print("[info] --refresh is a no-op until Phase 3 enrichment lands.", file=sys.stderr)
    works: list[dict] = []
    ignored_no_year: list[str] = []
    missing_medium: list[str] = []
    for row in read_works(EXCEL_PATH):
        if row.year is None:
            ignored_no_year.append(
                f"{row.era}|{row.title}|{row.series}|{row.medium}"
            )
            continue
        if row.medium not in _MEDIUM_TO_INDEX:
            missing_medium.append(
                f"{row.era}|{row.title}|{row.series}|{row.medium}"
            )
            continue
        work = _row_to_work(row)
        # Both year and medium were checked above; _row_to_work won't return None.
        assert work is not None
        works.append(work)
    _detect_duplicates(works)
    payload = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "works": works,
    }
    summary = (
        f"{len(works)} works; {len(ignored_no_year)} ignored-no-year; "
        f"{len(missing_medium)} missing-medium skipped"
    )
    if dry_run:
        print(f"[dry-run] would write {summary} to {OUTPUT_PATH}")
        return payload
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    IGNORED_NO_YEAR_LOG.parent.mkdir(parents=True, exist_ok=True)
    IGNORED_NO_YEAR_LOG.write_text(
        "\n".join(ignored_no_year) + ("\n" if ignored_no_year else ""),
        encoding="utf-8",
    )
    MISSING_MEDIUM_LOG.write_text(
        "\n".join(missing_medium) + ("\n" if missing_medium else ""),
        encoding="utf-8",
    )
    MISSING_MEDIUM_LOG.parent.mkdir(parents=True, exist_ok=True)
    MISSING_MEDIUM_LOG.write_text(
        "\n".join(missing_medium) + ("\n" if missing_medium else ""),
        encoding="utf-8",
    )
    print(f"wrote {summary} to {OUTPUT_PATH}")
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh", action="store_true",
        help="Bypass HTTP cache (no-op until Phase 3).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Do not write the JSON.")
    args = parser.parse_args()
    build(refresh=args.refresh, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
```

Add `data/missing_medium.log` AND `data/ignored_no_year.log` to `.gitignore` (regenerated build artifacts, like `unmatched.log` and `duplicates.log`).

**Phase 2 produces the final-shape JSON for year-having rows.** No Wookieepedia enrichment yet — Phase 3 adds `wiki_url`, `authors`, `publisher`, `release_date`, `cover_url` to each work. Rows with an empty Excel `YEAR` are excluded outright as reference-only entries (per the spec).

- [ ] **Step 2: Run the pipeline**

```bash
just scrape
```

Expected output:
```
wrote <N> works to .../frontend/public/data/works.json
```

Where `<N>` is ~1938 (year-having rows; ~172 reference-only rows from the Excel are intentionally excluded). Inspect the first object:

```bash
python3 -c "import json; d=json.load(open('frontend/public/data/works.json')); print(json.dumps(d['works'][0], indent=2))"
```

Expected: an object with `id`, `era`, `title`, `medium` (an integer 0..6 — index into the 7-entry `MEDIUMS` array), `year`, and likely `series`, `number`. No nulls.

- [ ] **Step 3: Commit**

```bash
git add scripts/build_data.py frontend/public/data/works.json
git commit -m "Add build_data orchestrator emitting Excel-only works.json"
```

---

## Phase 3 — Wookieepedia integration

### Task 3.1: `wiki_client.fetch_html` with on-disk cache

**Files:**
- Create: `scripts/wiki_client.py`
- Create: `tests/test_wiki_client.py`

- [ ] **Step 1: Write the failing tests**

```python
from pathlib import Path

import pytest

from scripts.wiki_client import WikiClient


@pytest.fixture
def cache_dir(tmp_path: Path) -> Path:
    return tmp_path / "cache"


def test_fetch_html_caches_response(cache_dir, monkeypatch):
    calls = {"n": 0}

    def fake_get(url, headers, timeout):
        calls["n"] += 1

        class R:
            status_code = 200
            text = "<html>ok</html>"

            def raise_for_status(self):
                pass

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)

    html_a = client.fetch_html("https://example.com/page")
    html_b = client.fetch_html("https://example.com/page")
    assert html_a == "<html>ok</html>"
    assert html_b == "<html>ok</html>"
    assert calls["n"] == 1  # cache hit


def test_fetch_html_refresh_bypasses_cache(cache_dir, monkeypatch):
    calls = {"n": 0}

    def fake_get(url, headers, timeout):
        calls["n"] += 1

        class R:
            status_code = 200
            text = f"<html>{calls['n']}</html>"

            def raise_for_status(self):
                pass

        return R()

    client = WikiClient(cache_dir=cache_dir, refresh=True)
    monkeypatch.setattr(client._session, "get", fake_get)
    client.fetch_html("https://example.com/page")
    client.fetch_html("https://example.com/page")
    assert calls["n"] == 2


def test_fetch_html_404_returns_none(cache_dir, monkeypatch):
    def fake_get(url, headers, timeout):
        class R:
            status_code = 404
            text = "Not Found"

            def raise_for_status(self):
                from requests import HTTPError
                raise HTTPError("404")

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    assert client.fetch_html("https://example.com/missing") is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_wiki_client.py -v`
Expected: ImportError on `scripts.wiki_client`.

- [ ] **Step 3: Write `scripts/wiki_client.py` (fetch only — opensearch in next task)**

```python
"""HTTP client for Wookieepedia with an on-disk cache."""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

import requests

USER_AGENT = "swdb-pipeline/0.1 (https://github.com/adriwankenobi/swdb)"
REQUEST_TIMEOUT = 30
POLITE_DELAY_SECONDS = 0.2


class WikiClient:
    def __init__(self, *, cache_dir: Path, refresh: bool = False):
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})

    def _cache_path(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:32]
        return self.cache_dir / f"{digest}.html"

    def fetch_html(self, url: str) -> str | None:
        cache_path = self._cache_path(url)
        if not self.refresh and cache_path.exists():
            return cache_path.read_text(encoding="utf-8")
        try:
            time.sleep(POLITE_DELAY_SECONDS)
            response = self._session.get(url, headers={}, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
        except requests.HTTPError:
            return None
        html = response.text
        cache_path.write_text(html, encoding="utf-8")
        return html
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_wiki_client.py -v`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/wiki_client.py tests/test_wiki_client.py
git commit -m "Add WikiClient with cached HTTP fetch"
```

### Task 3.2: `wiki_client.resolve_url` (opensearch fallback)

**Files:**
- Modify: `scripts/wiki_client.py`
- Modify: `tests/test_wiki_client.py`

- [ ] **Step 1: Add the failing test**

Append to `tests/test_wiki_client.py`:

```python
def test_resolve_url_returns_info_url_when_present(cache_dir):
    client = WikiClient(cache_dir=cache_dir)
    assert client.resolve_url(
        info_url="https://starwars.fandom.com/wiki/Eruption",
        title="Eruption",
        series="Dawn of the Jedi",
    ) == ("https://starwars.fandom.com/wiki/Eruption", "from_excel")


def test_resolve_url_uses_opensearch_when_info_missing(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    def fake_opensearch(query):
        # Mimic MediaWiki opensearch tuple response: [query, [titles], [descs], [urls]]
        return [
            query,
            ["A New Hope", "A New Hope (novel)"],
            ["", ""],
            [
                "https://starwars.fandom.com/wiki/A_New_Hope",
                "https://starwars.fandom.com/wiki/A_New_Hope_(novel)",
            ],
        ]

    monkeypatch.setattr(client, "_opensearch", fake_opensearch)
    url, source = client.resolve_url(info_url=None, title="A New Hope", series="Star Wars Episode")
    assert url == "https://starwars.fandom.com/wiki/A_New_Hope"
    assert source == "opensearch"


def test_resolve_url_rejects_unrelated_top_match(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    def fake_opensearch(query):
        return [query, ["Tatooine"], [""], ["https://starwars.fandom.com/wiki/Tatooine"]]

    monkeypatch.setattr(client, "_opensearch", fake_opensearch)
    url, source = client.resolve_url(info_url=None, title="Eruption", series="Dawn of the Jedi")
    assert url is None
    assert source == "unmatched"


def test_resolve_url_returns_none_when_opensearch_empty(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    def fake_opensearch(query):
        return [query, [], [], []]

    monkeypatch.setattr(client, "_opensearch", fake_opensearch)
    url, source = client.resolve_url(info_url=None, title="Nonexistent Work", series=None)
    assert url is None
    assert source == "unmatched"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_wiki_client.py -v`
Expected: AttributeError — no `resolve_url`, no `_opensearch`.

- [ ] **Step 3: Add the methods**

Append to `scripts/wiki_client.py`:

```python
import json
from urllib.parse import urlencode

from scripts.id_utils import slugify

OPENSEARCH_URL = "https://starwars.fandom.com/api.php"


class WikiClient(WikiClient):  # extends — replace the class definition with merged version
    pass
```

Actually do not subclass — modify the original class. Replace the original `WikiClient` class body with the merged version below (whole file rewrite):

```python
"""HTTP client for Wookieepedia with an on-disk cache."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from urllib.parse import urlencode

import requests

from scripts.id_utils import slugify

USER_AGENT = "swdb-pipeline/0.1 (https://github.com/adriwankenobi/swdb)"
REQUEST_TIMEOUT = 30
POLITE_DELAY_SECONDS = 0.2
OPENSEARCH_URL = "https://starwars.fandom.com/api.php"


class WikiClient:
    def __init__(self, *, cache_dir: Path, refresh: bool = False):
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})

    def _cache_path(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:32]
        return self.cache_dir / f"{digest}.html"

    def fetch_html(self, url: str) -> str | None:
        cache_path = self._cache_path(url)
        if not self.refresh and cache_path.exists():
            return cache_path.read_text(encoding="utf-8")
        try:
            time.sleep(POLITE_DELAY_SECONDS)
            response = self._session.get(url, headers={}, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
        except requests.HTTPError:
            return None
        html = response.text
        cache_path.write_text(html, encoding="utf-8")
        return html

    def _opensearch(self, query: str) -> list:
        params = {
            "action": "opensearch",
            "search": query,
            "limit": "5",
            "namespace": "0",
            "format": "json",
        }
        time.sleep(POLITE_DELAY_SECONDS)
        response = self._session.get(
            f"{OPENSEARCH_URL}?{urlencode(params)}", timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        return response.json()

    def resolve_url(
        self, *, info_url: str | None, title: str, series: str | None
    ) -> tuple[str | None, str]:
        """Return (url, source) where source is one of: 'from_excel', 'opensearch', 'unmatched'."""
        if info_url:
            return info_url, "from_excel"
        query = f"{title} {series}" if series else title
        try:
            payload = self._opensearch(query)
        except requests.RequestException:
            return None, "unmatched"
        if not payload or len(payload) < 4:
            return None, "unmatched"
        titles = payload[1]
        urls = payload[3]
        if not titles or not urls:
            return None, "unmatched"
        title_slug = slugify(title)
        for matched_title, matched_url in zip(titles, urls):
            if title_slug and title_slug in slugify(matched_title):
                return matched_url, "opensearch"
        return None, "unmatched"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_wiki_client.py -v`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/wiki_client.py tests/test_wiki_client.py
git commit -m "Add WikiClient.resolve_url with opensearch fallback"
```

### Task 3.3: `infobox_parser.parse_infobox`

**Files:**
- Create: `scripts/infobox_parser.py`
- Create: `tests/test_infobox_parser.py`
- Create: `tests/fixtures/infobox_a_new_hope.html` (from real Wookieepedia page)

- [ ] **Step 1: Capture one real fixture**

```bash
mkdir -p tests/fixtures
curl -A "swdb-pipeline/0.1" -sSL \
  "https://starwars.fandom.com/wiki/Star_Wars_Episode_IV:_A_New_Hope_(novel)" \
  -o tests/fixtures/infobox_a_new_hope.html
```

Verify the file is non-empty (`ls -lh tests/fixtures/`). This fixture covers the standard novel infobox (release_date, authors, publisher, cover) — the four fields the parser extracts. The pipeline does NOT extract the in-universe year from Wookieepedia (that field is sourced exclusively from the Excel `YEAR` column per spec).

- [ ] **Step 2: Write the failing tests**

```python
from pathlib import Path

import pytest

from scripts.infobox_parser import parse_infobox

FIXTURE_NOVEL = Path(__file__).parent / "fixtures" / "infobox_a_new_hope.html"


@pytest.fixture
def html_novel() -> str:
    return FIXTURE_NOVEL.read_text(encoding="utf-8")


def test_parse_infobox_returns_authors(html_novel):
    result = parse_infobox(html_novel)
    assert "Alan Dean Foster" in result["authors"]


def test_parse_infobox_returns_publisher(html_novel):
    result = parse_infobox(html_novel)
    assert result["publisher"] == "Del Rey"


def test_parse_infobox_returns_release_date_iso(html_novel):
    result = parse_infobox(html_novel)
    # "November 12, 1976" -> "1976-11-12"
    assert result["release_date"] == "1976-11-12"


def test_parse_infobox_returns_cover_url(html_novel):
    result = parse_infobox(html_novel)
    assert result["cover_url"].startswith("https://")
    assert "wikia" in result["cover_url"] or "fandom" in result["cover_url"]


def test_parse_infobox_returns_empty_dict_on_garbage():
    assert parse_infobox("<html></html>") == {}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `uv run pytest tests/test_infobox_parser.py -v`
Expected: ImportError on `scripts.infobox_parser`.

- [ ] **Step 4: Write `scripts/infobox_parser.py`**

```python
"""Extract structured fields from a Wookieepedia article's infobox."""

from __future__ import annotations

import re
from datetime import datetime

from bs4 import BeautifulSoup, Tag

# Maps the human-readable infobox label (lowercased) to our output key.
# The in-universe year is intentionally NOT extracted here — it comes from
# the Excel YEAR column only (see spec §4.4).
_LABEL_MAP: dict[str, str] = {
    "author": "authors",
    "author(s)": "authors",
    "publisher": "publisher",
    "publication date": "release_date",
    "release date": "release_date",
    "released": "release_date",
}

_DATE_FORMATS = (
    "%B %d, %Y",     # November 12, 1976
    "%b %d, %Y",     # Nov 12, 1976
    "%d %B %Y",      # 12 November 1976
    "%Y-%m-%d",
    "%Y",
)


def _normalize_text(node: Tag) -> str:
    return " ".join(node.get_text(" ", strip=True).split())


def _split_authors(text: str) -> list[str]:
    # Wookieepedia separates multiple authors with commas or "and".
    parts = re.split(r"\s*(?:,|;|\band\b|/)\s*", text)
    return [p.strip() for p in parts if p.strip()]


def _parse_date(text: str) -> str | None:
    cleaned = text.strip().split("(")[0].strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue
    # Try to pull a 4-digit year if nothing else matched.
    match = re.search(r"\b(19|20)\d{2}\b", cleaned)
    if match:
        return f"{match.group(0)}-01-01"
    return None


def _parse_cover_url(soup: BeautifulSoup) -> str | None:
    figure = soup.select_one("aside figure.pi-image img, aside .pi-image-thumbnail")
    if not figure:
        return None
    src = figure.get("src") or figure.get("data-src")
    if not src:
        return None
    # Strip query strings that scale the image; we want the largest available.
    return str(src).split("/revision/")[0] if "/revision/" in str(src) else str(src)


def parse_infobox(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    aside = soup.select_one("aside.portable-infobox")
    if not aside:
        return {}
    out: dict = {}
    for item in aside.select(".pi-item.pi-data"):
        label_node = item.select_one(".pi-data-label")
        value_node = item.select_one(".pi-data-value")
        if not label_node or not value_node:
            continue
        label = _normalize_text(label_node).lower().rstrip(":")
        key = _LABEL_MAP.get(label)
        if not key:
            continue
        text = _normalize_text(value_node)
        if not text:
            continue
        if key == "authors":
            out["authors"] = _split_authors(text)
        elif key == "release_date":
            iso = _parse_date(text)
            if iso:
                out["release_date"] = iso
        else:
            out[key] = text
    cover = _parse_cover_url(soup)
    if cover:
        out["cover_url"] = cover
    return out
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/test_infobox_parser.py -v`
Expected: all 5 tests pass.

If a fixture-based test fails because Wookieepedia's HTML structure differs (e.g. the live page has changed since this plan was written), update the selectors in `_parse_cover_url` or `_LABEL_MAP` to match what the fixture actually contains. The test failure will name the missing field; inspect the fixture HTML directly.

- [ ] **Step 6: Commit**

```bash
git add scripts/infobox_parser.py tests/test_infobox_parser.py tests/fixtures/infobox_a_new_hope.html
git commit -m "Add infobox_parser extracting authors, publisher, date, cover"
```

### Task 3.4: Wire enrichment into `build_data`

**Files:**
- Modify: `scripts/build_data.py`

- [ ] **Step 1: Replace `scripts/build_data.py` with the enriched orchestrator**

```python
"""Build pipeline orchestrator: Excel -> works.json (with Wookieepedia enrichment)."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from scripts.excel_reader import ExcelRow, read_works
from scripts.id_utils import make_id
from scripts.infobox_parser import parse_infobox
from scripts.wiki_client import WikiClient

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "Star Wars EU.xlsx"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "works.json"
CACHE_DIR = REPO_ROOT / "data" / ".cache" / "wookieepedia"
UNMATCHED_LOG = REPO_ROOT / "data" / "unmatched.log"
IGNORED_NO_YEAR_LOG = REPO_ROOT / "data" / "ignored_no_year.log"
MISSING_MEDIUM_LOG = REPO_ROOT / "data" / "missing_medium.log"
DUPLICATES_LOG = REPO_ROOT / "data" / "duplicates.log"

# Canonical medium list, alphabetical. Order is permanent: new entries must be
# APPENDED at the end so existing indices retain their meaning.
MEDIUMS = [
    "Comic",           # 0
    "Junior Novel",    # 1
    "Movie",           # 2
    "Novel",           # 3
    "Short Story",     # 4
    "TV Show",         # 5
    "Videogame",       # 6
]
_MEDIUM_TO_INDEX = {name: i for i, name in enumerate(MEDIUMS)}


def _row_to_work(row: ExcelRow) -> dict:
    """Build the base work dict from Excel data only. Caller must ensure
    row.year is not None and row.medium is in _MEDIUM_TO_INDEX."""
    work: dict = {
        "id": make_id(
            era=row.era,
            series=row.series,
            title=row.title,
            medium=row.medium,    # ID uses the canonical medium STRING for stability
            number=row.number,
        ),
        "era": row.era,
        "title": row.title,
        "medium": _MEDIUM_TO_INDEX[row.medium],   # JSON gets the integer index
        "year": row.year,
    }
    if row.series:
        work["series"] = row.series
    if row.number is not None:
        work["number"] = row.number
    return work


def _enrich(work: dict, row: ExcelRow, client: WikiClient, unmatched: list) -> None:
    """Add wiki_url + infobox-derived fields to work in-place. Year is NOT
    sourced from Wookieepedia (per spec §4.4) — only authors, publisher,
    release_date, cover_url, wiki_url."""
    url, source = client.resolve_url(
        info_url=row.info_url, title=row.title, series=row.series
    )
    if url is None:
        unmatched.append(f"{row.era}|{row.title}|{row.series}|{row.medium}")
        return
    work["wiki_url"] = url
    html = client.fetch_html(url)
    if html is None:
        unmatched.append(f"{row.era}|{row.title}|{row.series}|fetch_failed")
        return
    info = parse_infobox(html)
    for key in ("authors", "publisher", "release_date", "cover_url"):
        value = info.get(key)
        if value:
            work[key] = value


def _detect_duplicates(works: list[dict]) -> None:
    by_id: dict[str, list[dict]] = defaultdict(list)
    for w in works:
        by_id[w["id"]].append(w)
    groups = [g for g in by_id.values() if len(g) > 1]
    if not groups:
        return
    for g in groups:
        print(f"[WARN] duplicate id {g[0]['id']}:", file=sys.stderr)
        for w in g:
            print(
                f"  era={w['era']} title={w['title']!r} medium={w['medium']} "
                f"series={w.get('series')} number={w.get('number')}",
                file=sys.stderr,
            )
    rows_total = sum(len(g) for g in groups)
    print(
        f"{len(groups)} duplicate id group{'s' if len(groups) != 1 else ''} "
        f"({rows_total} rows). See {DUPLICATES_LOG.relative_to(REPO_ROOT)}.",
        file=sys.stderr,
    )
    DUPLICATES_LOG.parent.mkdir(parents=True, exist_ok=True)
    DUPLICATES_LOG.write_text(
        "\n\n".join(
            "\n".join(
                [f"id {g[0]['id']}"]
                + [
                    f"  era={w['era']} title={w['title']!r} medium={w['medium']} "
                    f"series={w.get('series')} number={w.get('number')}"
                    for w in g
                ]
            )
            for g in groups
        ) + "\n",
        encoding="utf-8",
    )


def build(*, refresh: bool, dry_run: bool) -> dict:
    client = WikiClient(cache_dir=CACHE_DIR, refresh=refresh)
    unmatched: list[str] = []
    ignored_no_year: list[str] = []
    missing_medium: list[str] = []
    works: list[dict] = []
    rows = list(read_works(EXCEL_PATH))
    for i, row in enumerate(rows, start=1):
        if row.year is None:
            ignored_no_year.append(f"{row.era}|{row.title}|{row.series}|{row.medium}")
            continue
        if row.medium not in _MEDIUM_TO_INDEX:
            missing_medium.append(f"{row.era}|{row.title}|{row.series}|{row.medium}")
            continue
        work = _row_to_work(row)
        _enrich(work, row, client, unmatched)
        works.append(work)
        if i % 50 == 0:
            print(f"  processed {i}/{len(rows)}")
    _detect_duplicates(works)
    payload = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "works": works,
    }
    summary = (
        f"{len(works)} works; {len(unmatched)} unmatched; "
        f"{len(ignored_no_year)} ignored-no-year; "
        f"{len(missing_medium)} missing-medium skipped"
    )
    if dry_run:
        print(f"[dry-run] would write {summary}")
        return payload
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    UNMATCHED_LOG.parent.mkdir(parents=True, exist_ok=True)
    UNMATCHED_LOG.write_text(
        "\n".join(unmatched) + ("\n" if unmatched else ""), encoding="utf-8"
    )
    IGNORED_NO_YEAR_LOG.write_text(
        "\n".join(ignored_no_year) + ("\n" if ignored_no_year else ""), encoding="utf-8"
    )
    MISSING_MEDIUM_LOG.write_text(
        "\n".join(missing_medium) + ("\n" if missing_medium else ""), encoding="utf-8"
    )
    print(f"wrote {summary} to {OUTPUT_PATH}")
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    build(refresh=args.refresh, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Switch `wiki_client.fetch_html` to the MediaWiki API (preemptive Cloudflare avoidance)**

Cloudflare blocks plain `requests` access to `https://starwars.fandom.com/wiki/<title>` HTML pages. The MediaWiki API (`/api.php?action=parse`) is unguarded and returns the same article body. Update `WikiClient.fetch_html` to:

1. Extract the article title from the input wiki URL (everything after `/wiki/`).
2. Call `https://starwars.fandom.com/api.php?action=parse&page=<title>&prop=text&format=json&redirects=true`.
3. Parse the JSON response and read `parse.text["*"]` (the article body HTML).
4. Cache the body HTML on disk keyed by the original wiki URL (so the cache key is stable regardless of how we fetch).

Existing `wiki_client.py` tests still pass because they monkey-patch `client._session.get` — the underlying HTTP shape doesn't matter to them. Add one new test that asserts the API URL is what gets called:

```python
def test_fetch_html_uses_mediawiki_api(cache_dir, monkeypatch):
    captured: dict = {}

    def fake_get(url, timeout):
        captured["url"] = url

        class R:
            status_code = 200

            def raise_for_status(self):
                pass

            def json(self):
                return {"parse": {"text": {"*": "<aside>body</aside>"}}}

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    html = client.fetch_html("https://starwars.fandom.com/wiki/A_New_Hope")
    assert html == "<aside>body</aside>"
    assert "api.php?action=parse" in captured["url"]
    assert "page=A_New_Hope" in captured["url"]
```

- [ ] **Step 3: Add `scripts/excel_writer.py` and integrate the writeback**

Create a new module `scripts/excel_writer.py` exporting `update_excel(path, lookup)`:

- `lookup` is `dict[tuple, dict]` keyed by `(era: int, title: str, series: str | None, medium_canonical: str, number: str | None)` → `{"authors": [...], "publisher": "...", "release_date": "1976-11-12", "cover_url": "..."}`.
- Open the workbook in **normal mode** (NOT `read_only=True`).
- Iterate sheets matching `ERA_INDEX`. For each data row (skip header), build the same lookup key from the cells (apply `_normalize_medium` + `_stringify` from `excel_reader`).
- If the key is in the lookup AND we have a value, write to:
  - Column F (`AUTHOR`): authors list joined with `" and "`.
  - Column G (`PUBLISHER`): publisher string.
  - Column H (`RELEASE`): convert ISO `YYYY-MM-DD` → dotted `YYYY.MM.DD`.
  - Column K (`COVER`): cover_url string.
- Skip writing for any field where the value is missing/empty (preserve existing Excel content).
- Save the workbook in place.

Then in `build_data.build()`: after collecting `works[]` and writing JSON, build the `lookup` dict from each enriched work (re-using the canonical key) and call `excel_writer.update_excel(EXCEL_PATH, lookup)`.

Tests for `excel_writer`: copy a small fixture xlsx to `tmp_path`, build a fake lookup, run `update_excel`, re-open with read_only=True and assert the cells changed; assert untouched cells unchanged. Use a tiny 2-3-row test sheet, not the real Excel file.

- [ ] **Step 4: First full run (this fetches ~1938 pages; allow 10–20 minutes)**

```bash
just scrape
```

Expected: progress lines every 50 rows, finishing with `wrote N works; M unmatched; K ignored-no-year; J missing-medium skipped to .../works.json` where N ≈ 1938 (year-having rows only), M is small (typically < 50), K is ~172 (intentional reference-only Excel rows), and J should be 0. Cache populates `data/.cache/wookieepedia/`. The Excel file is updated in place with enriched authors / publisher / release / cover values.

- [ ] **Step 3: Spot-check the output**

```bash
python3 -c "
import json
d = json.load(open('frontend/public/data/works.json'))
sample = next(w for w in d['works'] if w['title'] == 'A New Hope' and w['medium'] == 'Novel')
print(json.dumps(sample, indent=2, ensure_ascii=False))
"
```

Expected: includes `id`, `era`, `title`, `medium` (int 0..6), `year`, plus `wiki_url`, `authors`, `publisher`, `release_date`, `cover_url`. No null values. No `excel_order` — JSON array order is canonical.

- [ ] **Step 4: Re-run to verify cache hits**

```bash
just scrape
```

Expected: completes in seconds; no network requests for cached URLs.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_data.py frontend/public/data/works.json
git commit -m "Enrich works.json from Wookieepedia (incl. year fallback) and skip year-less rows"
```

---

## Phase 4 — Frontend bootstrap

### Task 4.1: Scaffold Vite + React + TS

**Files:**
- Create entire `frontend/` directory tree.

- [ ] **Step 1: Scaffold via Vite**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
```

When prompted to remove the existing files (the directory already has `public/data/works.json`), answer "Ignore files and continue". This preserves the JSON.

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install
npm install zustand @tanstack/react-virtual
npm install --save-dev tailwindcss @tailwindcss/vite postcss autoprefixer
npm install --save-dev vitest @vitest/ui jsdom
npm install --save-dev gh-pages
```

- [ ] **Step 3: Configure Vite for Tailwind 4 and `/swdb/` base**

Replace `frontend/vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/swdb/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 4: Add Tailwind entry CSS**

Replace `frontend/src/index.css` (or whatever Vite scaffolded) with `frontend/src/styles/globals.css`:

```css
@import "tailwindcss";

:root {
  color-scheme: light dark;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

html, body, #root {
  height: 100%;
  margin: 0;
}
```

Update `frontend/src/main.tsx` to import `./styles/globals.css` and remove any other CSS imports.

- [ ] **Step 5: Add npm scripts**

Edit `frontend/package.json` `scripts`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run",
    "test:watch": "vitest",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
just dev
```

Expected: `VITE vX.Y.Z ready in ... ms` and a localhost URL. Open it; you should see the default Vite + React placeholder. Stop the server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add frontend/ -- ':!frontend/node_modules' ':!frontend/dist'
git commit -m "Scaffold Vite + React + TS + Tailwind 4"
```

### Task 4.2: Define `Work` type, `ERAS`/`MEDIUMS` constants, `formatYear`

**Files:**
- Create: `frontend/src/types/work.ts`
- Create: `frontend/src/constants/eras.ts`
- Create: `frontend/src/constants/mediums.ts`
- Create: `frontend/src/lib/formatYear.ts`
- Create: `frontend/src/lib/__tests__/formatYear.test.ts`

- [ ] **Step 1: Write the failing test for `formatYear`**

```ts
import { describe, expect, it } from "vitest";
import { formatYear } from "../formatYear";

describe("formatYear", () => {
  it("formats positive years as ABY", () => {
    expect(formatYear(0)).toBe("0 ABY");
    expect(formatYear(4)).toBe("4 ABY");
  });

  it("formats negative years as BBY", () => {
    expect(formatYear(-19)).toBe("19 BBY");
    expect(formatYear(-25793)).toBe("25,793 BBY");
  });

  it("formats large positive years with thousands separators", () => {
    expect(formatYear(140)).toBe("140 ABY");
    expect(formatYear(25793)).toBe("25,793 ABY");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- formatYear`
Expected: cannot find module `../formatYear`.

- [ ] **Step 3: Write `formatYear.ts`**

```ts
export function formatYear(year: number): string {
  const abs = Math.abs(year);
  const formatted = abs.toLocaleString("en-US");
  return year >= 0 ? `${formatted} ABY` : `${formatted} BBY`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- formatYear`
Expected: all 3 tests pass.

- [ ] **Step 5: Write `ERAS`, `MEDIUMS`, and `Work` type**

`frontend/src/constants/eras.ts`:

```ts
export const ERAS = [
  "PRE-REPUBLIC",
  "OLD REPUBLIC",
  "RISE OF THE EMPIRE",
  "THE CLONE WARS",
  "THE DARK TIMES",
  "REBELLION",
  "NEW REPUBLIC",
  "NEW JEDI ORDER",
  "LEGACY",
  "NON-CANON",
] as const;

export type EraIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const ERA_COLORS: Record<EraIndex, string> = {
  0: "#5b6770",
  1: "#7a4ea3",
  2: "#2f5d8c",
  3: "#c44a3a",
  4: "#3a3a3a",
  5: "#b8862f",
  6: "#2f8a5e",
  7: "#0d4a6e",
  8: "#7a2238",
  9: "#888888",
};
```

`frontend/src/constants/mediums.ts`:

```ts
export const MEDIUMS = [
  "Comic",           // 0
  "Junior Novel",    // 1
  "Movie",           // 2
  "Novel",           // 3
  "Short Story",     // 4
  "TV Show",         // 5
  "Videogame",       // 6
] as const;

export type MediumIndex = number;
```

`frontend/src/types/work.ts`:

```ts
import type { EraIndex } from "../constants/eras";

export interface Work {
  id: string;
  era: EraIndex;
  title: string;
  medium: number;          // index into MEDIUMS
  year: number;            // signed in-universe year (negative = BBY)
  series?: string;
  number?: string;
  release_date?: string;
  authors?: string[];
  publisher?: string;
  cover_url?: string;
  wiki_url?: string;
}

export interface WorksFile {
  generated_at: string;
  works: Work[];
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types frontend/src/constants frontend/src/lib/formatYear.ts frontend/src/lib/__tests__/formatYear.test.ts
git commit -m "Add Work type, ERAS + MEDIUMS constants, formatYear util"
```

### Task 4.3: `slug.ts` for URL params and facet keys

**Files:**
- Create: `frontend/src/lib/slug.ts`
- Create: `frontend/src/lib/__tests__/slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { slugify } from "../slug";

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("A New Hope")).toBe("a-new-hope");
  });
  it("strips punctuation", () => {
    expect(slugify("Tales of the Jedi: The Sith War")).toBe("tales-of-the-jedi-the-sith-war");
  });
  it("collapses separators", () => {
    expect(slugify("  Star   Wars--Episode  ")).toBe("star-wars-episode");
  });
  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd frontend && npm test -- slug`
Expected: cannot find module `../slug`.

- [ ] **Step 3: Write `slug.ts`**

```ts
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd frontend && npm test -- slug`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/slug.ts frontend/src/lib/__tests__/slug.test.ts
git commit -m "Add frontend slugify util"
```

### Task 4.4: `catalogStore` loads `works.json`

**Files:**
- Create: `frontend/src/store/catalogStore.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write `catalogStore.ts`**

```ts
import { create } from "zustand";
import { MEDIUMS } from "../constants/mediums";
import type { Work, WorksFile } from "../types/work";

export interface Facet<V = string> {
  value: V;       // canonical (used by filterStore)
  label: string;  // display
  count: number;  // works that have this value
}

interface CatalogState {
  status: "idle" | "loading" | "ready" | "error";
  works: Work[];
  generatedAt: string | null;
  error: string | null;
  facets: {
    series: Facet[];
    authors: Facet[];
    publishers: Facet[];
    mediums: Facet<number>[];
    yearMin: number;
    yearMax: number;
  };
  load: (url: string) => Promise<void>;
}

const empty: CatalogState["facets"] = {
  series: [],
  authors: [],
  publishers: [],
  mediums: [],
  yearMin: 0,
  yearMax: 0,
};

function buildFacets(works: Work[]): CatalogState["facets"] {
  const counts = (key: (w: Work) => string[] | string | undefined): Facet[] => {
    const map = new Map<string, number>();
    for (const w of works) {
      const raw = key(w);
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const v of values) {
        map.set(v, (map.get(v) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ value: label, label, count }));
  };
  const mediumCounts = new Map<number, number>();
  for (const w of works) {
    mediumCounts.set(w.medium, (mediumCounts.get(w.medium) ?? 0) + 1);
  }
  const mediums: Facet<number>[] = [...mediumCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, count]) => ({ value: idx, label: MEDIUMS[idx], count }));
  const years = works.map((w) => w.year);
  return {
    series: counts((w) => w.series),
    authors: counts((w) => w.authors),
    publishers: counts((w) => w.publisher),
    mediums,
    yearMin: years.length ? Math.min(...years) : 0,
    yearMax: years.length ? Math.max(...years) : 0,
  };
}

export const useCatalogStore = create<CatalogState>((set) => ({
  status: "idle",
  works: [],
  generatedAt: null,
  error: null,
  facets: empty,
  load: async (url: string) => {
    set({ status: "loading" });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as WorksFile;
      set({
        status: "ready",
        works: data.works,
        generatedAt: data.generated_at,
        facets: buildFacets(data.works),
      });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },
}));
```

- [ ] **Step 2: Update `App.tsx` to load and render a count**

```tsx
import { useEffect } from "react";
import { useCatalogStore } from "./store/catalogStore";

export default function App() {
  const { status, works, error, load } = useCatalogStore();

  useEffect(() => {
    load(`${import.meta.env.BASE_URL}data/works.json`);
  }, [load]);

  if (status === "loading" || status === "idle") return <p style={{ padding: 16 }}>Loading…</p>;
  if (status === "error") return <p style={{ padding: 16, color: "crimson" }}>Failed to load: {error}</p>;
  return (
    <main style={{ padding: 16 }}>
      <h1>SWDB</h1>
      <p>{works.length} works loaded.</p>
    </main>
  );
}
```

- [ ] **Step 3: Run dev server and verify**

```bash
just dev
```

Open the local URL. Expected: "N works loaded." where N matches the pipeline output. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/catalogStore.ts frontend/src/App.tsx
git commit -m "Add catalogStore loading works.json with derived facets"
```

---

## Phase 5 — Filter store + URL sync + sidebar (Cards-only)

### Task 5.1: `filterStore` shape

**Files:**
- Create: `frontend/src/store/filterStore.ts`

- [ ] **Step 1: Write `filterStore.ts`**

```ts
import { create } from "zustand";

export type ViewMode = "cards" | "table" | "timeline";
export type SortMode = "chronology" | "release";

export interface FilterState {
  eras: number[];          // era indices
  mediums: number[];       // indices into MEDIUMS (e.g. 4 = Novel)
  series: string[];        // canonical series strings
  authors: string[];
  publishers: string[];
  q: string;
  yearMin: number | null;  // null = unset
  yearMax: number | null;
  view: ViewMode;
  sort: SortMode;
  openWorkId: string | null;
}

const defaultState: FilterState = {
  eras: [],
  mediums: [],
  series: [],
  authors: [],
  publishers: [],
  q: "",
  yearMin: null,
  yearMax: null,
  view: "cards",
  sort: "chronology",
  openWorkId: null,
};

interface FilterActions {
  set: (patch: Partial<FilterState>) => void;
  toggleArrayValue: <K extends "eras" | "mediums" | "series" | "authors" | "publishers">(
    key: K,
    value: FilterState[K][number],
  ) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  ...defaultState,
  set: (patch) => set(patch),
  toggleArrayValue: (key, value) => {
    const current = get()[key] as readonly (string | number)[];
    const next = current.includes(value as never)
      ? current.filter((v) => v !== value)
      : [...current, value];
    set({ [key]: next } as Partial<FilterState>);
  },
  clearAll: () => set({ ...defaultState, view: get().view, sort: get().sort }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/filterStore.ts
git commit -m "Add filterStore"
```

### Task 5.2: `filterWorks` pure function

**Files:**
- Create: `frontend/src/lib/filterWorks.ts`
- Create: `frontend/src/lib/__tests__/filterWorks.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { Work } from "../../types/work";
import type { FilterState } from "../../store/filterStore";
import { filterWorks } from "../filterWorks";

// Medium indices (alphabetical canonical order):
// 0 Comic, 1 Junior Novel, 2 Movie, 3 Novel, 4 Short Story, 5 TV Show, 6 Videogame
const NOVEL = 3;
const COMIC = 0;

const w = (over: Partial<Work> & { id: string; year: number }): Work => ({
  era: 5, title: "T", medium: NOVEL,
  ...over,
});

const empty: FilterState = {
  eras: [], mediums: [], series: [], authors: [], publishers: [],
  q: "", yearMin: null, yearMax: null,
  view: "cards", sort: "chronology", openWorkId: null,
};

describe("filterWorks", () => {
  // Catalog order matters: this is the JSON order, which the frontend treats
  // as the canonical tiebreaker via stable sorting.
  const all: Work[] = [
    w({ id: "a", title: "A New Hope", medium: NOVEL, era: 5, year: 0, authors: ["Foster"] }),
    w({ id: "b", title: "Vector Prime", medium: NOVEL, era: 7, year: 25, authors: ["Salvatore"] }),
    w({ id: "c", title: "Chewbacca", medium: COMIC, era: 7, year: 25, authors: ["Macan"] }),
  ];

  it("returns all when no filters", () => {
    expect(filterWorks(all, empty)).toHaveLength(3);
  });

  it("filters by medium (OR within field)", () => {
    const r = filterWorks(all, { ...empty, mediums: [NOVEL, COMIC] });
    expect(r).toHaveLength(3);
    const r2 = filterWorks(all, { ...empty, mediums: [NOVEL] });
    expect(r2.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("filters by era and medium (AND between fields)", () => {
    const r = filterWorks(all, { ...empty, mediums: [NOVEL], eras: [7] });
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });

  it("filters by year range inclusive", () => {
    const r = filterWorks(all, { ...empty, yearMin: 0, yearMax: 10 });
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });

  it("free-text search matches title", () => {
    const r = filterWorks(all, { ...empty, q: "hope" });
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });

  it("free-text search matches author", () => {
    const r = filterWorks(all, { ...empty, q: "macan" });
    expect(r.map((x) => x.id)).toEqual(["c"]);
  });

  it("chronology sort: era, then year, then JSON order (stable)", () => {
    const r = filterWorks(all, empty);
    expect(r.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("chronology stable-sort tiebreak preserves input order", () => {
    // 'z' precedes 'a' in the input; both have era=5 and year=0; output keeps that.
    const data: Work[] = [
      w({ id: "z", era: 5, year: 0, title: "Zeta" }),
      w({ id: "a", era: 5, year: 0, title: "Alpha" }),
    ];
    const r = filterWorks(data, empty);
    expect(r.map((x) => x.id)).toEqual(["z", "a"]);
  });

  it("release sort: release_date asc, missing dates last, ties keep input order", () => {
    const data: Work[] = [
      w({ id: "x", year: 0, release_date: "2010-01-01" }),
      w({ id: "y", year: 0, release_date: "1999-01-01" }),
      w({ id: "z", year: 0 }),
    ];
    const r = filterWorks(data, { ...empty, sort: "release" });
    expect(r.map((x) => x.id)).toEqual(["y", "x", "z"]);
  });

  it("release sort: equal-date works keep input order", () => {
    const data: Work[] = [
      w({ id: "first", year: 0, release_date: "2010-01-01" }),
      w({ id: "second", year: 0, release_date: "2010-01-01" }),
    ];
    const r = filterWorks(data, { ...empty, sort: "release" });
    expect(r.map((x) => x.id)).toEqual(["first", "second"]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd frontend && npm test -- filterWorks`
Expected: cannot find module `../filterWorks`.

- [ ] **Step 3: Write `filterWorks.ts`**

```ts
import type { Work } from "../types/work";
import type { FilterState } from "../store/filterStore";

function matchesArray<T>(selected: T[], value: T | undefined): boolean {
  if (selected.length === 0) return true;
  if (value === undefined) return false;
  return selected.includes(value);
}

function matchesAnyOf<T>(selected: T[], values: T[] | undefined): boolean {
  if (selected.length === 0) return true;
  if (!values || values.length === 0) return false;
  return values.some((v) => selected.includes(v));
}

function matchesQuery(w: Work, q: string): boolean {
  if (!q) return true;
  const haystack = [
    w.title,
    w.series ?? "",
    ...(w.authors ?? []),
  ].join(" ").toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function matchesYear(w: Work, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  const y = w.year;
  if (min !== null && y < min) return false;
  if (max !== null && y > max) return false;
  return true;
}

// Sorts return 0 for equal keys so JS's stable Array.prototype.sort
// preserves the input order — which is the JSON / Excel order.
function compareChronology(a: Work, b: Work): number {
  if (a.era !== b.era) return a.era - b.era;
  return a.year - b.year;
}

function compareRelease(a: Work, b: Work): number {
  const ar = a.release_date ?? "";
  const br = b.release_date ?? "";
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  if (ar < br) return -1;
  if (ar > br) return 1;
  return 0;
}

export function filterWorks(works: Work[], filters: FilterState): Work[] {
  const filtered = works.filter((w) =>
    matchesArray(filters.eras, w.era) &&
    matchesArray(filters.mediums, w.medium) &&
    matchesArray(filters.series, w.series) &&
    matchesArray(filters.publishers, w.publisher) &&
    matchesAnyOf(filters.authors, w.authors) &&
    matchesYear(w, filters.yearMin, filters.yearMax) &&
    matchesQuery(w, filters.q),
  );
  const cmp = filters.sort === "release" ? compareRelease : compareChronology;
  return [...filtered].sort(cmp);
}
```

- [ ] **Step 4: Verify tests pass**

Run: `cd frontend && npm test -- filterWorks`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/filterWorks.ts frontend/src/lib/__tests__/filterWorks.test.ts
git commit -m "Add filterWorks pure function with OR/AND semantics"
```

### Task 5.3: `urlState` — sync filterStore with URLSearchParams

**Files:**
- Create: `frontend/src/lib/urlState.ts`

- [ ] **Step 1: Write `urlState.ts`**

```ts
import type { FilterState, ViewMode, SortMode } from "../store/filterStore";

const csv = (arr: (string | number)[]): string | undefined =>
  arr.length === 0 ? undefined : arr.join(",");

const parseCsv = (raw: string | null): string[] =>
  raw ? raw.split(",").filter(Boolean) : [];

const parseInts = (raw: string | null): number[] =>
  parseCsv(raw).map((s) => Number(s)).filter((n) => Number.isFinite(n));

const parseInt1 = (raw: string | null): number | null => {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const VIEWS: ViewMode[] = ["cards", "table", "timeline"];
const SORTS: SortMode[] = ["chronology", "release"];

export function readFromUrl(search: string): Partial<FilterState> {
  const p = new URLSearchParams(search);
  const view = p.get("view");
  const sort = p.get("sort");
  return {
    eras: parseInts(p.get("era")),
    mediums: parseInts(p.get("medium")),
    series: parseCsv(p.get("series")),
    authors: parseCsv(p.get("author")),
    publishers: parseCsv(p.get("publisher")),
    q: p.get("q") ?? "",
    yearMin: parseInt1(p.get("year_min")),
    yearMax: parseInt1(p.get("year_max")),
    view: VIEWS.includes(view as ViewMode) ? (view as ViewMode) : "cards",
    sort: SORTS.includes(sort as SortMode) ? (sort as SortMode) : "chronology",
    openWorkId: p.get("work"),
  };
}

export function writeToUrl(state: FilterState): string {
  const p = new URLSearchParams();
  const era = csv(state.eras);
  const medium = csv(state.mediums);
  const series = csv(state.series);
  const author = csv(state.authors);
  const publisher = csv(state.publishers);
  if (era) p.set("era", era);
  if (medium) p.set("medium", medium);
  if (series) p.set("series", series);
  if (author) p.set("author", author);
  if (publisher) p.set("publisher", publisher);
  if (state.q) p.set("q", state.q);
  if (state.yearMin !== null) p.set("year_min", String(state.yearMin));
  if (state.yearMax !== null) p.set("year_max", String(state.yearMax));
  if (state.view !== "cards") p.set("view", state.view);
  if (state.sort !== "chronology") p.set("sort", state.sort);
  if (state.openWorkId) p.set("work", state.openWorkId);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
```

- [ ] **Step 2: Wire up at app boot — modify `App.tsx`**

```tsx
import { useEffect } from "react";
import { useCatalogStore } from "./store/catalogStore";
import { useFilterStore } from "./store/filterStore";
import { readFromUrl, writeToUrl } from "./lib/urlState";

export default function App() {
  const { status, works, error, load } = useCatalogStore();
  const filterState = useFilterStore();

  // Hydrate filter state from URL on mount.
  useEffect(() => {
    filterState.set(readFromUrl(window.location.search));
    load(`${import.meta.env.BASE_URL}data/works.json`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect filter state back to the URL on every change (debounced).
  useEffect(() => {
    const id = setTimeout(() => {
      const next = writeToUrl(filterState);
      const target = `${window.location.pathname}${next}`;
      if (target !== window.location.pathname + window.location.search) {
        window.history.replaceState({}, "", target);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [filterState]);

  if (status === "loading" || status === "idle") return <p style={{ padding: 16 }}>Loading…</p>;
  if (status === "error") return <p style={{ padding: 16, color: "crimson" }}>Failed to load: {error}</p>;
  return (
    <main style={{ padding: 16 }}>
      <h1>SWDB</h1>
      <p>{works.length} works loaded.</p>
    </main>
  );
}
```

- [ ] **Step 3: Manual verify**

```bash
just dev
```

Open `http://localhost:5173/swdb/?era=5&medium=Novel`. Open devtools → application → check that the URL reflects the load. (No UI yet to interact with — we'll wire that up next.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/urlState.ts frontend/src/App.tsx
git commit -m "Sync filterStore with URLSearchParams (read on mount, write on change)"
```

### Task 5.4: shadcn/ui init + base components

**Files:**
- Create: `frontend/components.json`, `frontend/src/lib/utils.ts`, files under `frontend/src/components/ui/`

- [ ] **Step 1: Initialize shadcn**

```bash
cd frontend
npx shadcn@latest init -d
```

Defaults: Style "Default", Base color "Slate", CSS variables yes, alias `@/*` to `./src/*`. The init updates `tsconfig.json`, `vite.config.ts`, `globals.css`, and creates `components.json` + `src/lib/utils.ts`.

- [ ] **Step 2: Add components used by Phase 5**

```bash
npx shadcn@latest add button checkbox input dialog sheet badge slider command popover scroll-area
```

- [ ] **Step 3: Verify the build**

```bash
just check-frontend
```

Expected: typecheck and lint pass.

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "Initialize shadcn/ui with components needed for filters and modal"
```

### Task 5.5: `AppShell`, `Sidebar`, `TopBar` skeleton

**Files:**
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/TopBar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write `TopBar.tsx`**

```tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFilterStore } from "@/store/filterStore";

export function TopBar() {
  const { q, set, view, sort } = useFilterStore();
  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <h1 className="text-lg font-semibold tracking-tight">SWDB</h1>
      <Input
        placeholder="Search title, series, author…"
        value={q}
        onChange={(e) => set({ q: e.target.value })}
        className="max-w-md"
      />
      <div className="ml-auto flex items-center gap-2">
        <div className="flex rounded-md border bg-background">
          {(["cards", "table", "timeline"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              onClick={() => set({ view: v })}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
            >
              {v}
            </Button>
          ))}
        </div>
        <div className="flex rounded-md border bg-background">
          {(["chronology", "release"] as const).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "default" : "ghost"}
              size="sm"
              onClick={() => set({ sort: s })}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write `Sidebar.tsx` (placeholder content; real filters in Task 5.6)**

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <ScrollArea className="h-full p-4">
        <div className="space-y-4 text-sm">
          <p className="font-medium">Filters</p>
          <p className="text-muted-foreground">(filters wired up in next task)</p>
        </div>
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 3: Write `AppShell.tsx`**

```tsx
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Modify `App.tsx`**

```tsx
import { useEffect } from "react";
import { useCatalogStore } from "./store/catalogStore";
import { useFilterStore } from "./store/filterStore";
import { readFromUrl, writeToUrl } from "./lib/urlState";
import { AppShell } from "./components/layout/AppShell";
import { filterWorks } from "./lib/filterWorks";

export default function App() {
  const { status, works, error, load } = useCatalogStore();
  const filterState = useFilterStore();

  useEffect(() => {
    filterState.set(readFromUrl(window.location.search));
    load(`${import.meta.env.BASE_URL}data/works.json`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = writeToUrl(filterState);
      const target = `${window.location.pathname}${next}`;
      if (target !== window.location.pathname + window.location.search) {
        window.history.replaceState({}, "", target);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [filterState]);

  if (status === "loading" || status === "idle") return <p className="p-4">Loading…</p>;
  if (status === "error") return <p className="p-4 text-red-600">Failed to load: {error}</p>;

  const visible = filterWorks(works, filterState);

  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">{visible.length} of {works.length} works</p>
    </AppShell>
  );
}
```

- [ ] **Step 5: Manual verify**

`just dev`. Expected: header with title, search box, view + sort toggles; left sidebar placeholder; main area shows the count.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout frontend/src/App.tsx
git commit -m "Add AppShell with TopBar (search, view, sort) and Sidebar skeleton"
```

### Task 5.6: Sidebar facet filter components

**Files:**
- Create: `frontend/src/components/filters/EraFilter.tsx`
- Create: `frontend/src/components/filters/MediumFilter.tsx`
- Create: `frontend/src/components/filters/SeriesFilter.tsx`
- Create: `frontend/src/components/filters/AuthorFilter.tsx`
- Create: `frontend/src/components/filters/PublisherFilter.tsx`
- Create: `frontend/src/components/filters/YearRangeFilter.tsx`
- Create: `frontend/src/components/filters/ActiveFilterChips.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Write `EraFilter.tsx`**

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { useFilterStore } from "@/store/filterStore";

export function EraFilter() {
  const { eras, toggleArrayValue } = useFilterStore();
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Era</h3>
      <ul className="space-y-1">
        {ERAS.map((label, i) => {
          const idx = i as EraIndex;
          return (
            <li key={label} className="flex items-center gap-2">
              <Checkbox
                id={`era-${idx}`}
                checked={eras.includes(idx)}
                onCheckedChange={() => toggleArrayValue("eras", idx)}
              />
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: ERA_COLORS[idx] }}
              />
              <label htmlFor={`era-${idx}`} className="cursor-pointer text-sm">
                {label}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Write `MediumFilter.tsx`**

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

export function MediumFilter() {
  const mediums = useCatalogStore((s) => s.facets.mediums);
  const { mediums: selected, toggleArrayValue } = useFilterStore();
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Medium</h3>
      <ul className="space-y-1">
        {mediums.map((f) => (
          <li key={f.value} className="flex items-center gap-2">
            <Checkbox
              id={`medium-${f.value}`}
              checked={selected.includes(f.value)}
              onCheckedChange={() => toggleArrayValue("mediums", f.value)}
            />
            <label htmlFor={`medium-${f.value}`} className="cursor-pointer text-sm">
              {f.label}
            </label>
            <span className="ml-auto text-xs text-muted-foreground">{f.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Write the searchable multi-select for `SeriesFilter`, `AuthorFilter`, `PublisherFilter` (shared component pattern)**

Create a shared component `frontend/src/components/filters/_FacetMultiSelect.tsx`:

```tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Facet {
  value: string;
  label: string;
  count: number;
}

interface Props {
  title: string;
  facets: Facet[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetMultiSelect({ title, facets, selected, onToggle }: Props) {
  const [q, setQ] = useState("");
  const filtered = q
    ? facets.filter((f) => f.label.toLowerCase().includes(q.toLowerCase()))
    : facets;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${title.toLowerCase()}…`}
        className="h-8"
      />
      <ScrollArea className="h-48 rounded-md border">
        <ul className="space-y-1 p-2">
          {filtered.map((f) => (
            <li key={f.value} className="flex items-center gap-2">
              <Checkbox
                id={`${title}-${f.value}`}
                checked={selected.includes(f.value)}
                onCheckedChange={() => onToggle(f.value)}
              />
              <label
                htmlFor={`${title}-${f.value}`}
                className="cursor-pointer truncate text-sm"
              >
                {f.label}
              </label>
              <span className="ml-auto text-xs text-muted-foreground">{f.count}</span>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  );
}
```

`frontend/src/components/filters/SeriesFilter.tsx`:

```tsx
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function SeriesFilter() {
  const facets = useCatalogStore((s) => s.facets.series);
  const { series, toggleArrayValue } = useFilterStore();
  return (
    <FacetMultiSelect
      title="Series"
      facets={facets}
      selected={series}
      onToggle={(v) => toggleArrayValue("series", v)}
    />
  );
}
```

`frontend/src/components/filters/AuthorFilter.tsx`:

```tsx
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function AuthorFilter() {
  const facets = useCatalogStore((s) => s.facets.authors);
  const { authors, toggleArrayValue } = useFilterStore();
  return (
    <FacetMultiSelect
      title="Author"
      facets={facets}
      selected={authors}
      onToggle={(v) => toggleArrayValue("authors", v)}
    />
  );
}
```

`frontend/src/components/filters/PublisherFilter.tsx`:

```tsx
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function PublisherFilter() {
  const facets = useCatalogStore((s) => s.facets.publishers);
  const { publishers, toggleArrayValue } = useFilterStore();
  return (
    <FacetMultiSelect
      title="Publisher"
      facets={facets}
      selected={publishers}
      onToggle={(v) => toggleArrayValue("publishers", v)}
    />
  );
}
```

- [ ] **Step 4: Write `YearRangeFilter.tsx`**

```tsx
import { Slider } from "@/components/ui/slider";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { formatYear } from "@/lib/formatYear";

export function YearRangeFilter() {
  const { yearMin: dataMin, yearMax: dataMax } = useCatalogStore((s) => s.facets);
  const { yearMin, yearMax, set } = useFilterStore();
  const lo = yearMin ?? dataMin;
  const hi = yearMax ?? dataMax;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Year (in-universe)</h3>
      <Slider
        min={dataMin}
        max={dataMax}
        step={1}
        value={[lo, hi]}
        onValueChange={(v) => set({ yearMin: v[0], yearMax: v[1] })}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatYear(lo)}</span>
        <span>{formatYear(hi)}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write `ActiveFilterChips.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ERAS } from "@/constants/eras";
import { MEDIUMS } from "@/constants/mediums";
import { useFilterStore } from "@/store/filterStore";

export function ActiveFilterChips() {
  const s = useFilterStore();
  const chips: { label: string; clear: () => void }[] = [];
  s.eras.forEach((e) =>
    chips.push({ label: ERAS[e], clear: () => s.toggleArrayValue("eras", e) }),
  );
  s.mediums.forEach((m) =>
    chips.push({ label: MEDIUMS[m], clear: () => s.toggleArrayValue("mediums", m) }),
  );
  s.series.forEach((m) =>
    chips.push({ label: m, clear: () => s.toggleArrayValue("series", m) }),
  );
  s.authors.forEach((m) =>
    chips.push({ label: m, clear: () => s.toggleArrayValue("authors", m) }),
  );
  s.publishers.forEach((m) =>
    chips.push({ label: m, clear: () => s.toggleArrayValue("publishers", m) }),
  );
  if (s.q) chips.push({ label: `“${s.q}”`, clear: () => s.set({ q: "" }) });
  if (s.yearMin !== null || s.yearMax !== null) {
    chips.push({
      label: "year",
      clear: () => s.set({ yearMin: null, yearMax: null }),
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      {chips.map((c, i) => (
        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={c.clear}>
          {c.label} ×
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={() => s.clearAll()}>
        Clear all
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Compose them in `Sidebar.tsx`**

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { EraFilter } from "@/components/filters/EraFilter";
import { MediumFilter } from "@/components/filters/MediumFilter";
import { SeriesFilter } from "@/components/filters/SeriesFilter";
import { AuthorFilter } from "@/components/filters/AuthorFilter";
import { PublisherFilter } from "@/components/filters/PublisherFilter";
import { YearRangeFilter } from "@/components/filters/YearRangeFilter";

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <ScrollArea className="h-full p-4">
        <div className="space-y-6 text-sm">
          <EraFilter />
          <MediumFilter />
          <SeriesFilter />
          <AuthorFilter />
          <PublisherFilter />
          <YearRangeFilter />
        </div>
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 7: Mount `ActiveFilterChips` in `App.tsx` above the count**

In `App.tsx`, replace the `<p className="text-sm text-muted-foreground">…</p>` line with:

```tsx
<ActiveFilterChips />
<p className="text-sm text-muted-foreground">{visible.length} of {works.length} works</p>
```

…and add the import at the top:

```tsx
import { ActiveFilterChips } from "./components/filters/ActiveFilterChips";
```

- [ ] **Step 8: Manual verify**

`just dev`. Toggle some filters; URL updates; count updates; chips appear and dismiss.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/filters frontend/src/components/layout/Sidebar.tsx frontend/src/App.tsx
git commit -m "Add sidebar facet filters, year range, active chips"
```

---

## Phase 6 — Cards view (virtualized) + Detail modal

### Task 6.1: `WorkCard` component

**Files:**
- Create: `frontend/src/components/work/WorkCard.tsx`

- [ ] **Step 1: Write `WorkCard.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import type { Work } from "@/types/work";

export function WorkCard({ work, onClick }: { work: Work; onClick: () => void }) {
  const mediumLabel = MEDIUMS[work.medium];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {work.cover_url ? (
          <img
            src={work.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-3xl text-white/70"
            style={{ backgroundColor: ERA_COLORS[work.era as EraIndex] }}
          >
            {mediumLabel[0]}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 font-medium leading-tight">{work.title}</p>
        {work.series && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {work.series}
            {work.number ? ` #${work.number}` : ""}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <Badge variant="outline">{mediumLabel}</Badge>
          <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
            {ERAS[work.era]}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatYear(work.year)}</span>
        </div>
        {work.authors && work.authors.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{work.authors.join(", ")}</p>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/work/WorkCard.tsx
git commit -m "Add WorkCard component"
```

### Task 6.2: `CardGrid` (virtualized)

**Files:**
- Create: `frontend/src/components/views/CardGrid.tsx`

- [ ] **Step 1: Write `CardGrid.tsx`**

```tsx
import { useRef, useMemo, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkCard } from "@/components/work/WorkCard";
import { useFilterStore } from "@/store/filterStore";
import type { Work } from "@/types/work";

const ROW_HEIGHT = 360;     // approximate card height + gap
const COL_GAP = 16;
const MIN_CARD_WIDTH = 180;

function useResponsiveColumns(parentRef: React.RefObject<HTMLDivElement>) {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    if (!parentRef.current) return;
    const el = parentRef.current;
    const update = () => {
      const w = el.clientWidth;
      const next = Math.max(1, Math.floor((w + COL_GAP) / (MIN_CARD_WIDTH + COL_GAP)));
      setCols(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [parentRef]);
  return cols;
}

export function CardGrid({ works }: { works: Work[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const cols = useResponsiveColumns(parentRef);
  const set = useFilterStore((s) => s.set);

  const rows = useMemo(() => {
    const arr: Work[][] = [];
    for (let i = 0; i < works.length; i += cols) {
      arr.push(works.slice(i, i + cols));
    }
    return arr;
  }, [works, cols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  if (works.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No works match these filters.
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((vr) => (
          <div
            key={vr.key}
            data-index={vr.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vr.start}px)`,
            }}
          >
            <div
              className="grid gap-4 pb-4"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {rows[vr.index].map((w) => (
                <WorkCard key={w.id} work={w} onClick={() => set({ openWorkId: w.id })} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `CardGrid` into `App.tsx`**

Replace the `visible.length` paragraph with a flex column containing chips, count, and the grid:

```tsx
import { CardGrid } from "./components/views/CardGrid";
// ...
return (
  <AppShell>
    <div className="flex h-full flex-col">
      <ActiveFilterChips />
      <p className="pb-3 text-sm text-muted-foreground">{visible.length} of {works.length} works</p>
      {filterState.view === "cards" && <CardGrid works={visible} />}
      {filterState.view === "table" && <p className="text-muted-foreground">Table view (Phase 7)</p>}
      {filterState.view === "timeline" && <p className="text-muted-foreground">Timeline view (Phase 8)</p>}
    </div>
  </AppShell>
);
```

- [ ] **Step 3: Manual verify**

`just dev`. Confirm grid renders, scrolls smoothly across all ~1900 works, resizes columns correctly. Apply some filters and verify count + grid both update.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/views/CardGrid.tsx frontend/src/App.tsx
git commit -m "Add virtualized CardGrid view"
```

### Task 6.3: `WorkDetailModal`

**Files:**
- Create: `frontend/src/components/work/WorkDetailModal.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write `WorkDetailModal.tsx`**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

export function WorkDetailModal() {
  const { openWorkId, set } = useFilterStore();
  const works = useCatalogStore((s) => s.works);
  const work = openWorkId ? works.find((w) => w.id === openWorkId) : null;
  const mediumLabel = work ? MEDIUMS[work.medium] : "";

  return (
    <Dialog
      open={!!work}
      onOpenChange={(open) => {
        if (!open) set({ openWorkId: null });
      }}
    >
      <DialogContent className="max-w-3xl">
        {work && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-tight">{work.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                {work.cover_url ? (
                  <a href={work.cover_url} target="_blank" rel="noopener noreferrer">
                    <img src={work.cover_url} alt="" className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div
                    className="flex h-full items-center justify-center text-5xl text-white/70"
                    style={{ backgroundColor: ERA_COLORS[work.era as EraIndex] }}
                  >
                    {mediumLabel[0]}
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {work.series && (
                    <span className="font-medium">
                      {work.series}{work.number ? ` #${work.number}` : ""}
                    </span>
                  )}
                  <Badge variant="outline">{mediumLabel}</Badge>
                  <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
                    {ERAS[work.era]}
                  </Badge>
                </div>
                <p>
                  <span className="text-muted-foreground">In-universe year:</span>{" "}
                  {formatYear(work.year)}
                </p>
                {work.release_date && (
                  <p>
                    <span className="text-muted-foreground">Released:</span> {work.release_date}
                  </p>
                )}
                {work.authors && work.authors.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Authors:</span>{" "}
                    {work.authors.join(", ")}
                  </p>
                )}
                {work.publisher && (
                  <p>
                    <span className="text-muted-foreground">Publisher:</span> {work.publisher}
                  </p>
                )}
                {work.wiki_url && (
                  <p>
                    <a
                      href={work.wiki_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Open on Wookieepedia →
                    </a>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Mount it in `App.tsx`**

Add after `</AppShell>` (or just inside it before children — Dialog portals out anyway). Place at top level inside the `<AppShell>` for cleanliness:

```tsx
import { WorkDetailModal } from "./components/work/WorkDetailModal";
// ...
return (
  <>
    <AppShell>
      {/* ... */}
    </AppShell>
    <WorkDetailModal />
  </>
);
```

- [ ] **Step 3: Manual verify**

`just dev`. Click a card → modal opens with full details, URL gains `&work=...`. Esc closes; URL drops the param. Reload directly with `?work=<id>` — modal opens.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/work/WorkDetailModal.tsx frontend/src/App.tsx
git commit -m "Add WorkDetailModal with deep-link via ?work=<id>"
```

---

## Phase 7 — Table view

### Task 7.1: `WorkRow` and `TableView` (virtualized, sortable headers)

**Files:**
- Create: `frontend/src/components/work/WorkRow.tsx`
- Create: `frontend/src/components/views/TableView.tsx`

- [ ] **Step 1: Write `WorkRow.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import type { Work } from "@/types/work";

export function WorkRow({ work, onClick }: { work: Work; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b text-sm hover:bg-muted/40"
    >
      <td className="w-12 p-2">
        {work.cover_url ? (
          <img src={work.cover_url} alt="" className="h-12 w-8 rounded object-cover" loading="lazy" />
        ) : (
          <div
            className="h-12 w-8 rounded"
            style={{ backgroundColor: ERA_COLORS[work.era as EraIndex] }}
          />
        )}
      </td>
      <td className="p-2 font-medium">{work.title}</td>
      <td className="p-2 text-muted-foreground">{work.series ?? ""}</td>
      <td className="p-2 text-muted-foreground">{work.number ?? ""}</td>
      <td className="p-2"><Badge variant="outline">{MEDIUMS[work.medium]}</Badge></td>
      <td className="p-2">
        <Badge style={{ backgroundColor: ERA_COLORS[work.era as EraIndex], color: "white" }}>
          {ERAS[work.era]}
        </Badge>
      </td>
      <td className="p-2 text-muted-foreground">{formatYear(work.year)}</td>
      <td className="p-2 text-muted-foreground">{work.release_date ?? ""}</td>
      <td className="p-2 text-muted-foreground">{work.authors?.join(", ") ?? ""}</td>
      <td className="p-2 text-muted-foreground">{work.publisher ?? ""}</td>
    </tr>
  );
}
```

- [ ] **Step 2: Write `TableView.tsx`**

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WorkRow } from "@/components/work/WorkRow";
import { useFilterStore } from "@/store/filterStore";
import type { Work } from "@/types/work";

const ROW_HEIGHT = 56;

export function TableView({ works }: { works: Work[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const set = useFilterStore((s) => s.set);
  const virtualizer = useVirtualizer({
    count: works.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (works.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No works match these filters.
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <table className="w-full table-auto">
        <thead className="sticky top-0 z-10 bg-background text-left text-xs uppercase text-muted-foreground">
          <tr className="border-b">
            <th className="p-2"></th>
            <th className="p-2">Title</th>
            <th className="p-2">Series</th>
            <th className="p-2">#</th>
            <th className="p-2">Medium</th>
            <th className="p-2">Era</th>
            <th className="p-2">Year</th>
            <th className="p-2">Release</th>
            <th className="p-2">Authors</th>
            <th className="p-2">Publisher</th>
          </tr>
        </thead>
        <tbody style={{ position: "relative", height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((vr) => {
            const work = works[vr.index];
            return (
              <tr
                key={work.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vr.start}px)`,
                  display: "table",
                  tableLayout: "auto",
                }}
              >
                <td colSpan={10} className="p-0">
                  <table className="w-full">
                    <tbody>
                      <WorkRow work={work} onClick={() => set({ openWorkId: work.id })} />
                    </tbody>
                  </table>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

(The nested-table trick is needed because virtualizer requires absolutely-positioned rows but `<tr>` defaults to display:table-row; wrapping each virtual row in its own tiny table preserves alignment.)

- [ ] **Step 3: Wire into `App.tsx`**

Replace the `Table view (Phase 7)` placeholder with `<TableView works={visible} />` and import it.

- [ ] **Step 4: Manual verify**

`just dev`. Switch to Table view, scroll, click rows → modal opens. Header sticky.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/work frontend/src/components/views/TableView.tsx frontend/src/App.tsx
git commit -m "Add virtualized TableView"
```

---

## Phase 8 — Timeline view

### Task 8.1: Timeline grouping helper

**Files:**
- Create: `frontend/src/lib/timelineGroups.ts`
- Create: `frontend/src/lib/__tests__/timelineGroups.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { Work } from "../../types/work";
import { groupForChronology, groupForRelease } from "../timelineGroups";

// Medium index 3 = "Novel" (alphabetical canonical order, 7-entry MEDIUMS).
const w = (over: Partial<Work> & { id: string; year: number }): Work => ({
  era: 5, title: "T", medium: 3, ...over,
});

describe("groupForChronology", () => {
  it("groups by era then year, sorted by era index, works keep input order within a year", () => {
    // 'b' precedes 'e' in input; both are era=5, year=0, so they keep that order.
    const data = [
      w({ id: "a", era: 0, year: -25793 }),
      w({ id: "b", era: 5, year: 0 }),
      w({ id: "c", era: 5, year: 4 }),
      w({ id: "d", era: 7, year: 25 }),
      w({ id: "e", era: 5, year: 0 }),
    ];
    const groups = groupForChronology(data);
    expect(groups.map((g) => g.eraIndex)).toEqual([0, 5, 7]);
    const era5 = groups.find((g) => g.eraIndex === 5)!;
    expect(era5.years.map((y) => y.year)).toEqual([0, 4]);
    expect(era5.years[0].works.map((x) => x.id)).toEqual(["b", "e"]);
  });
});

describe("groupForRelease", () => {
  it("groups by release year, ascending; works without a date go to a final 'undated' bucket; preserves input order within each year", () => {
    // 'b' precedes 'd' in input; both released in 2010; output keeps that.
    const data = [
      w({ id: "a", year: 0, release_date: "1976-11-12" }),
      w({ id: "b", year: 0, release_date: "2010-04-01" }),
      w({ id: "c", year: 0 }),
      w({ id: "d", year: 0, release_date: "2010-08-08" }),
    ];
    const groups = groupForRelease(data);
    expect(groups.map((g) => g.year)).toEqual([1976, 2010, null]);
    expect(groups[1].works.map((x) => x.id)).toEqual(["b", "d"]);
    expect(groups[2].works.map((x) => x.id)).toEqual(["c"]);
  });
});
```

- [ ] **Step 2: Run test → failure**

Run: `cd frontend && npm test -- timelineGroups`
Expected: cannot find module.

- [ ] **Step 3: Write `timelineGroups.ts`**

```ts
import type { Work } from "../types/work";

export interface ChronologyGroup {
  eraIndex: number;
  years: { year: number; works: Work[] }[];
}

export interface ReleaseGroup {
  year: number | null;
  works: Work[];
}

// Push-order into each bucket preserves the input array order, which is the
// JSON / Excel order — the canonical tiebreaker. No explicit sort needed.
export function groupForChronology(works: Work[]): ChronologyGroup[] {
  const eraMap = new Map<number, Map<number, Work[]>>();
  for (const w of works) {
    if (!eraMap.has(w.era)) eraMap.set(w.era, new Map());
    const yearMap = eraMap.get(w.era)!;
    if (!yearMap.has(w.year)) yearMap.set(w.year, []);
    yearMap.get(w.year)!.push(w);
  }
  return [...eraMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([eraIndex, yearMap]) => ({
      eraIndex,
      years: [...yearMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([year, works]) => ({ year, works })),
    }));
}

export function groupForRelease(works: Work[]): ReleaseGroup[] {
  const dated = new Map<number, Work[]>();
  const undated: Work[] = [];
  for (const w of works) {
    if (!w.release_date) {
      undated.push(w);
      continue;
    }
    const y = Number(w.release_date.slice(0, 4));
    if (!Number.isFinite(y)) {
      undated.push(w);
      continue;
    }
    if (!dated.has(y)) dated.set(y, []);
    dated.get(y)!.push(w);
  }
  const groups: ReleaseGroup[] = [...dated.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, works]) => ({ year, works }));
  if (undated.length > 0) groups.push({ year: null, works: undated });
  return groups;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd frontend && npm test -- timelineGroups`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/timelineGroups.ts frontend/src/lib/__tests__/timelineGroups.test.ts
git commit -m "Add timelineGroups helpers (chronology + release)"
```

### Task 8.2: `TimelineView` component

**Files:**
- Create: `frontend/src/components/views/TimelineView.tsx`

- [ ] **Step 1: Write `TimelineView.tsx`**

```tsx
import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { MEDIUMS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { groupForChronology, groupForRelease } from "@/lib/timelineGroups";
import { useFilterStore } from "@/store/filterStore";
import type { Work } from "@/types/work";

function Marker({ work, onClick }: { work: Work; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${work.title}${work.series ? ` — ${work.series}` : ""}`}
      className="size-12 shrink-0 overflow-hidden rounded ring-2 transition hover:scale-110"
      style={{ borderColor: ERA_COLORS[work.era as EraIndex] }}
    >
      {work.cover_url ? (
        <img src={work.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-xs text-white"
          style={{ backgroundColor: ERA_COLORS[work.era as EraIndex] }}
        >
          {MEDIUMS[work.medium][0]}
        </div>
      )}
    </button>
  );
}

export function TimelineView({ works }: { works: Work[] }) {
  const sort = useFilterStore((s) => s.sort);
  const set = useFilterStore((s) => s.set);
  const open = (id: string) => set({ openWorkId: id });

  if (works.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No works match these filters.
      </div>
    );
  }

  if (sort === "release") {
    const groups = groupForRelease(works);
    return (
      <div className="space-y-6 p-2">
        {groups.map((g) => (
          <section key={String(g.year)}>
            <h3 className="mb-2 text-sm font-medium">{g.year ?? "Undated"}</h3>
            <div className="flex flex-wrap gap-2">
              {g.works.map((w) => (
                <Marker key={w.id} work={w} onClick={() => open(w.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const groups = groupForChronology(works);
  return (
    <div className="space-y-8 p-2">
      {groups.map((g) => (
        <section key={g.eraIndex}>
          <header
            className="mb-2 inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: ERA_COLORS[g.eraIndex as EraIndex] }}
          >
            {ERAS[g.eraIndex]}
          </header>
          <div className="space-y-3">
            {g.years.map((y) => (
              <div key={y.year} className="flex items-start gap-3">
                <span className="w-24 shrink-0 pt-3 text-xs text-muted-foreground">
                  {formatYear(y.year)}
                </span>
                <div className="flex flex-wrap gap-2">
                  {y.works.map((w) => (
                    <Marker key={w.id} work={w} onClick={() => open(w.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `App.tsx`**

Replace the `Timeline view (Phase 8)` placeholder with `<TimelineView works={visible} />` and import.

- [ ] **Step 3: Manual verify**

`just dev`. Switch to Timeline view; toggle sort between Chronology and Release date; markers and section headers behave per spec.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/views/TimelineView.tsx frontend/src/App.tsx
git commit -m "Add TimelineView with chronology and release-date modes"
```

---

## Phase 9 — Polish & deploy

### Task 9.1: Mobile filter drawer

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/TopBar.tsx`

- [ ] **Step 1: Refactor Sidebar to a stateless `<SidebarContents />` and conditionally wrap**

Replace `Sidebar.tsx`:

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EraFilter } from "@/components/filters/EraFilter";
import { MediumFilter } from "@/components/filters/MediumFilter";
import { SeriesFilter } from "@/components/filters/SeriesFilter";
import { AuthorFilter } from "@/components/filters/AuthorFilter";
import { PublisherFilter } from "@/components/filters/PublisherFilter";
import { YearRangeFilter } from "@/components/filters/YearRangeFilter";

function Filters() {
  return (
    <div className="space-y-6 p-4 text-sm">
      <EraFilter />
      <MediumFilter />
      <SeriesFilter />
      <AuthorFilter />
      <PublisherFilter />
      <YearRangeFilter />
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r md:block">
      <ScrollArea className="h-full">
        <Filters />
      </ScrollArea>
    </aside>
  );
}

export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetTitle className="px-4 pt-4">Filters</SheetTitle>
        <ScrollArea className="h-[calc(100vh-3rem)]">
          <Filters />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Add a hamburger to `TopBar` (mobile only)**

```tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFilterStore } from "@/store/filterStore";
import { MobileSidebar } from "./Sidebar";

export function TopBar() {
  const { q, set, view, sort } = useFilterStore();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setOpen(true)}>
        ☰
      </Button>
      <h1 className="text-lg font-semibold tracking-tight">SWDB</h1>
      <Input
        placeholder="Search title, series, author…"
        value={q}
        onChange={(e) => set({ q: e.target.value })}
        className="max-w-md"
      />
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden rounded-md border bg-background sm:flex">
          {(["cards", "table", "timeline"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              onClick={() => set({ view: v })}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
            >
              {v}
            </Button>
          ))}
        </div>
        <div className="hidden rounded-md border bg-background sm:flex">
          {(["chronology", "release"] as const).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "default" : "ghost"}
              size="sm"
              onClick={() => set({ sort: s })}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
      <MobileSidebar open={open} onOpenChange={setOpen} />
    </header>
  );
}
```

- [ ] **Step 3: Manual verify on a narrow window**

`just dev`. Resize browser to <768px. Hamburger appears; filters slide in.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout
git commit -m "Add mobile sidebar drawer"
```

### Task 9.2: GitHub Pages 404 fallback (SPA + base path)

**Files:**
- Create: `frontend/public/404.html`
- Create: `frontend/index.html` redirect-handling snippet (or augment existing `index.html`)

GitHub Pages serves `404.html` for any unknown path under the project page; for an SPA on a project page, this is the standard trick to make deep-linked URLs work.

- [ ] **Step 1: Create `frontend/public/404.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SWDB</title>
  <script>
    // GitHub Pages SPA fallback: rewrite path -> hash so index.html can recover.
    var l = window.location;
    var path = l.pathname.replace(/^\/swdb\//, "");
    var qs = l.search ? l.search : "";
    l.replace("/swdb/?p=" + encodeURIComponent(path) + "&" + qs.replace(/^\?/, ""));
  </script>
</head>
<body></body>
</html>
```

- [ ] **Step 2: Augment `frontend/index.html` to consume the redirect**

In `frontend/index.html`, before the closing `</head>` add:

```html
<script>
  // SPA fallback decoder: turn ?p=...&<rest> back into the canonical URL on load.
  (function () {
    var p = new URLSearchParams(window.location.search);
    var encoded = p.get("p");
    if (encoded !== null) {
      p.delete("p");
      var rest = p.toString();
      var newPath = "/swdb/" + encoded + (rest ? "?" + rest : "");
      window.history.replaceState(null, "", newPath);
    }
  })();
</script>
```

- [ ] **Step 3: Verify locally**

`just build && just preview`. Open the preview URL with `?era=5&medium=Novel`; it should still load the catalog and show those filters applied.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/404.html frontend/index.html
git commit -m "Add GitHub Pages SPA fallback (404.html + redirect decoder)"
```

### Task 9.3: Deploy

**Files:**
- Modify: `frontend/package.json` (already has `predeploy` and `deploy` from Task 4.1).

- [ ] **Step 1: Build and publish to `gh-pages` branch**

```bash
just deploy
```

Expected: `Published` log line. Wait ~1 minute, then visit <https://adriwankenobi.github.io/swdb/>.

- [ ] **Step 2: Confirm GitHub Pages settings**

If the site doesn't appear, run:

```bash
gh repo view adriwankenobi/swdb --web
```

Settings → Pages → Source = `Deploy from a branch`, Branch = `gh-pages` / `(root)`. Save.

- [ ] **Step 3: Smoke-test the live URL**

Open <https://adriwankenobi.github.io/swdb/?era=5&medium=Novel>. Confirm: catalog loads, filters reflect URL, modal deep-link works (`?work=<id>`), all three views render.

- [ ] **Step 4: Commit any tweaks needed**

If you needed to nudge the base path or add a `CNAME`, commit those changes. Otherwise no commit needed.

### Task 9.4: README touch-up with the live URL and screenshots placeholder

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Status" section to `README.md`**

Above "Stack", insert:

```markdown
## Status

Live at <https://adriwankenobi.github.io/swdb/>.
Currently 1900+ works indexed across 10 eras of the Star Wars Expanded Universe, sourced from `Star Wars EU.xlsx` and enriched with Wookieepedia metadata.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Mention live URL in README"
```

---

## Self-Review

I checked the plan against the spec. Findings I fixed inline before publishing:

1. **`series` is optional in the schema** — some Short Stories have no series; `_row_to_work` emits `series` only when present. Spec already reflects this.
2. **`year` is required in the schema** — Excel year wins; Wookieepedia infobox (Timeline / Set in / Date / Era labels) is the fallback. If both sources are empty the row is logged to `data/ignored_no_year.log` and excluded from the JSON. The infobox parser has a dedicated test (Eruption fixture) for the year fallback.
3. **`medium` is an integer** — the JSON stores `medium` as an index 0..6 into the 7-entry `MEDIUMS` constant (alphabetical, derived from year-having Excel rows). The Excel reader keeps the canonical Title Case string; conversion to int happens in `build_data._row_to_work`. Rows with a medium not in the canonical list are logged to `data/missing_medium.log` and excluded from the JSON. The `make_id` canonical key still uses the medium STRING (not the index), so re-ordering `MEDIUMS` later would not invalidate any IDs.

Mediums excluded from `MEDIUMS` because they only exist in to-be-ignored (no-year) Excel rows: `Audio Drama`, `Young Reader Book`. If the user later adds a year to such a row, the build will skip it as missing-medium and prompt the developer to extend `MEDIUMS` (append-only).
4. **No `excel_order` field** — the JSON's `works` array order is the canonical order. The frontend relies on JS's stable `Array.prototype.sort` to preserve this order as the implicit tiebreaker after `(era, year)` for chronology and after `release_date` for release sort.
5. **`Sidebar` component used twice** — the original spec listed only `Sidebar.tsx`; the plan now also exports a `MobileSidebar` from the same file (Task 9.1) for the mobile drawer. No new file required, just an additional export.
6. **`<repo-name>` placeholder** — the spec previously had this in §6.1 and §12; the spec was updated already. The plan uses `/swdb/` everywhere consistently.
7. **`uuid5 namespace UUID`** — plan now declares the exact namespace UUID once (in `id_utils.py`) and never changes it; the spec's "fixed namespace UUID constant" requirement is satisfied.
8. **Forward-compat slots** — the spec explicitly bans placeholder files for the future user account / Read button features. The plan has none.

No remaining "TBD"/"TODO"/"implement later" markers.

Tech stack notes consistent across the plan: `zustand`, `@tanstack/react-virtual`, `tailwindcss@4`, `shadcn` components limited to those listed in Task 5.4.

---

## Execution

Plan saved to `docs/plans/2026-04-29-star-wars-eu-catalog-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task; review between tasks; fastest iteration.
2. **Inline Execution** — execute in this session via `superpowers:executing-plans` with checkpoints for review.

Which approach?
