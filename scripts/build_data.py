"""Build pipeline orchestrator: Excel -> works.json."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from scripts.excel_reader import ExcelRow, read_works
from scripts.excel_writer import update_excel
from scripts.id_utils import make_id
from scripts.infobox_parser import parse_infobox
from scripts.wiki_client import WikiClient

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "Star Wars EU.xlsx"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "works.json"
DUPLICATES_LOG = REPO_ROOT / "data" / "duplicates.log"
MISSING_MEDIUM_LOG = REPO_ROOT / "data" / "missing_medium.log"
IGNORED_NO_YEAR_LOG = REPO_ROOT / "data" / "ignored_no_year.log"
CACHE_DIR = REPO_ROOT / "data" / ".cache" / "wookieepedia"
UNMATCHED_LOG = REPO_ROOT / "data" / "unmatched.log"

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


def _enrich(work: dict, row: ExcelRow, client: WikiClient, unmatched: list[str]) -> None:
    """Resolve wiki URL, fetch HTML, parse infobox, add enriched fields to work in-place."""
    url, source = client.resolve_url(
        info_url=row.info_url,
        title=row.title,
        series=row.series,
    )
    if not url:
        unmatched.append(
            f"{row.era}|{row.title}|{row.series}|{row.medium}|source={source}"
        )
        return
    work["wiki_url"] = url
    html = client.fetch_html(url)
    if not html:
        return
    fields = parse_infobox(html)
    if fields.get("authors"):
        work["authors"] = fields["authors"]
    if fields.get("publisher"):
        work["publisher"] = fields["publisher"]
    if fields.get("release_date"):
        work["release_date"] = fields["release_date"]
    if fields.get("cover_url"):
        work["cover_url"] = fields["cover_url"]


def build(*, refresh: bool, dry_run: bool) -> dict:
    works: list[dict] = []
    valid_rows: list[ExcelRow] = []
    ignored_no_year: list[str] = []
    missing_medium: list[str] = []
    unmatched: list[str] = []

    client = WikiClient(cache_dir=CACHE_DIR, refresh=refresh)
    rows = list(read_works(EXCEL_PATH))
    total_rows = len(rows)

    for i, row in enumerate(rows):
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
        if not dry_run:
            _enrich(work, row, client, unmatched)
        works.append(work)
        valid_rows.append(row)
        if (i + 1) % 50 == 0:
            print(
                f"[info] processed {i + 1}/{total_rows} rows; "
                f"{len(works)} works so far; {len(unmatched)} unmatched",
                file=sys.stderr,
            )

    _detect_duplicates(works)
    payload = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "works": works,
    }

    # Build enriched lookup for Excel writeback
    enriched_lookup: dict[tuple, dict] = {}
    for work, row in zip(works, valid_rows, strict=True):
        fields: dict = {}
        if "authors" in work:
            fields["authors"] = work["authors"]
        if "publisher" in work:
            fields["publisher"] = work["publisher"]
        if "release_date" in work:
            fields["release_date"] = work["release_date"]
        if "cover_url" in work:
            fields["cover_url"] = work["cover_url"]
        if fields:
            key = (
                row.era,
                row.title,
                row.series,
                MEDIUMS[work["medium"]],
                row.number,
            )
            enriched_lookup[key] = fields

    summary = (
        f"{len(works)} works; {len(unmatched)} unmatched; "
        f"{len(ignored_no_year)} ignored-no-year; "
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
    UNMATCHED_LOG.parent.mkdir(parents=True, exist_ok=True)
    UNMATCHED_LOG.write_text(
        "\n".join(unmatched) + ("\n" if unmatched else ""),
        encoding="utf-8",
    )

    writeback = update_excel(EXCEL_PATH, enriched_lookup)
    print(
        f"wrote {summary} to {OUTPUT_PATH}; "
        f"excel writeback: {writeback['updated']} updated, "
        f"{writeback['not_found_in_excel']} not-found-in-excel"
    )
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh", action="store_true",
        help="Bypass HTTP cache and re-fetch all Wookieepedia pages.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Do not write the JSON.")
    args = parser.parse_args()
    build(refresh=args.refresh, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
