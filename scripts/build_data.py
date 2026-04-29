"""Build pipeline orchestrator: Excel -> works.json."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from scripts.excel_reader import read_works
from scripts.id_utils import make_id

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "Star Wars EU.xlsx"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "works.json"


def _row_to_work(row) -> dict:
    work: dict = {
        "id": make_id(
            era=row.era,
            series=row.series,
            title=row.title,
            medium=row.medium,
            number=row.number,
        ),
        "era": row.era,
        "excel_order": row.excel_order,
        "title": row.title,
        "medium": row.medium,
    }
    if row.series:
        work["series"] = row.series
    if row.number is not None:
        work["number"] = row.number
    if row.year_in_universe is not None:
        work["year_in_universe"] = row.year_in_universe
    return work


def build(*, refresh: bool, dry_run: bool) -> dict:
    works = []
    for row in read_works(EXCEL_PATH):
        works.append(_row_to_work(row))
    payload = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "works": works,
    }
    if dry_run:
        print(f"[dry-run] would write {len(works)} works to {OUTPUT_PATH}")
        return payload
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"wrote {len(works)} works to {OUTPUT_PATH}")
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh", action="store_true", help="Bypass HTTP cache (no-op until Phase 3)."
    )
    parser.add_argument("--dry-run", action="store_true", help="Do not write the JSON.")
    args = parser.parse_args()
    build(refresh=args.refresh, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
