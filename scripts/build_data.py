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


def _row_to_work(row: ExcelRow) -> dict:
    """Build a work dict.

    Precondition: caller has already verified row.year is not None and
    row.medium is in _MEDIUM_TO_INDEX.
    """
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
