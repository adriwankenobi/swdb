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


def _row_to_work(row: ExcelRow) -> dict:
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


def _detect_duplicates(works: list[dict]) -> None:
    """Warn about duplicate IDs and write duplicates.log. Does not raise."""
    by_id: dict[str, list[dict]] = defaultdict(list)
    for w in works:
        by_id[w["id"]].append(w)

    groups = {id_: rows for id_, rows in by_id.items() if len(rows) > 1}
    if not groups:
        return

    log_lines: list[str] = []
    for dup_id, rows in groups.items():
        warn_lines = [f"[WARN] duplicate id {dup_id}:"]
        for r in rows:
            detail = (
                f"  era={r['era']} title={r['title']!r} medium={r['medium']}"
                f" series={r.get('series')} number={r.get('number')}"
                f" excel_order={r['excel_order']}"
            )
            warn_lines.append(detail)
        block = "\n".join(warn_lines)
        print(block, file=sys.stderr)
        log_lines.append(block)

    total_rows = sum(len(rows) for rows in groups.values())
    n = len(groups)
    plural = "s" if n != 1 else ""
    summary = f"{n} duplicate id group{plural} ({total_rows} rows). See data/duplicates.log."
    print(summary, file=sys.stderr)

    DUPLICATES_LOG.parent.mkdir(parents=True, exist_ok=True)
    DUPLICATES_LOG.write_text("\n\n".join(log_lines) + "\n", encoding="utf-8")


def build(*, refresh: bool, dry_run: bool) -> dict:
    if refresh:
        print("[info] --refresh is a no-op until Phase 3 enrichment lands.", file=sys.stderr)

    works = []
    for row in read_works(EXCEL_PATH):
        works.append(_row_to_work(row))

    _detect_duplicates(works)

    payload = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "works": works,
    }
    if dry_run:
        print(f"[dry-run] would write {len(works)} works to {OUTPUT_PATH}")
        return payload
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
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
