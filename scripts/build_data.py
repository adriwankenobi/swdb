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
from scripts.infobox_parser import parse_infobox, select_publisher
from scripts.release_utils import parse_excel_release
from scripts.wiki_client import WikiClient

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "Star Wars EU.xlsx"
OUTPUT_PATH = REPO_ROOT / "frontend" / "public" / "data" / "works.json"
DUPLICATES_LOG = REPO_ROOT / "data" / "duplicates.log"
MISSING_MEDIUM_LOG = REPO_ROOT / "data" / "missing_medium.log"
IGNORED_NO_YEAR_LOG = REPO_ROOT / "data" / "ignored_no_year.log"
CACHE_DIR = REPO_ROOT / "data" / ".cache" / "wookieepedia"
UNMATCHED_LOG = REPO_ROOT / "data" / "unmatched.log"
DEAD_LINKS_LOG = REPO_ROOT / "data" / "dead_links.log"
# Canonical era list, indexed by ExcelRow.era. Order matches
# excel_reader.ERA_INDEX. New entries must be APPENDED so existing indices
# (used internally by make_id) retain their meaning.
ERAS = [
    "PRE-REPUBLIC",  # 0
    "OLD REPUBLIC",  # 1
    "RISE OF THE EMPIRE",  # 2
    "THE CLONE WARS",  # 3
    "THE DARK TIMES",  # 4
    "REBELLION",  # 5
    "NEW REPUBLIC",  # 6
    "NEW JEDI ORDER",  # 7
    "LEGACY",  # 8
    "NON-CANON",  # 9
]

# NON-CANON works (infinities, what-if stories) have no place in the in-universe
# chronology, so their YEAR cell is legitimately blank — unlike a blank YEAR on a
# canon sheet, which marks a reference-only entry to exclude.
NON_CANON_ERA = ERAS.index("NON-CANON")

# Canonical medium list, alphabetical. Order is permanent.
MEDIUMS = [
    "Comic",
    "Junior Novel",
    "Movie",
    "Novel",
    "Short Story",
    "TV Show",
    "Videogame",
]

# Anchor medium priority — highest priority first.
_MEDIUM_PRIORITY = [
    "Movie",
    "TV Show",
    "Novel",
    "Junior Novel",
    "Comic",
    "Short Story",
    "Videogame",
]


def _dominant_medium(mediums: set[str]) -> str:
    """Return the highest-priority medium present in `mediums`."""
    for m in _MEDIUM_PRIORITY:
        if m in mediums:
            return m
    # Defensive: caller has validated mediums ⊆ MEDIUMS, so this is unreachable.
    raise ValueError(f"No priority defined for mediums: {mediums}")


def _row_to_work(row: ExcelRow) -> dict:
    """Build a work dict.

    Precondition: caller has already verified row.medium is in MEDIUMS, and
    that row.year is not None unless the row is NON-CANON.
    """
    # make_id consumes the int era + canonical medium STRING so the canonical
    # key string is unchanged across the JSON schema flip. Do NOT pass
    # ERAS[row.era] here — it would invalidate every existing UUID.
    work: dict = {
        "id": row.work_id
        or make_id(
            era=row.era,
            series=row.series,
            title=row.title,
            medium=row.medium,
            series_number=row.series_number,
        ),
        "era": ERAS[row.era],
        "title": row.title,
        "medium": row.medium,
    }
    if row.year is not None:
        work["year"] = row.year
    if row.year_end is not None:
        work["year_end"] = row.year_end
    series, series_number = _split_series_and_number(row.series, row.series_number)
    if series:
        work["series"] = series
    if series_number:
        work["series_number"] = series_number
    if row.number:
        work["number"] = row.number
    return work


def _build_ids_writeback(works: list[dict], rows: list[ExcelRow]) -> dict[tuple, str]:
    """Map the writer's lookup key -> generated id for rows whose ID cell was
    blank (so existing ids are never rewritten).
    """
    out: dict[tuple, str] = {}
    for work, row in zip(works, rows, strict=True):
        if row.work_id:
            continue
        key = _work_lookup_key(row, work)
        out[key] = work["id"]
    return out


def _work_lookup_key(row: ExcelRow, work: dict) -> tuple:
    """Lookup key matching excel_writer's _make_lookup_key: (era, title,
    series, canonical-medium, series_number)."""
    return (row.era, row.title, row.series, work["medium"], row.series_number)


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
        )
        + "\n",
        encoding="utf-8",
    )
    return groups


def _enrich(
    work: dict,
    row: ExcelRow,
    client: WikiClient,
    unmatched: list[str],
    dead_links: list[str],
) -> None:
    """Resolve wiki URL and populate enriched fields on `work` in-place.

    Excel is the source of truth: any populated Excel cell wins wholesale
    over the parser. When all four enriched fields are populated AND a
    wiki URL is set, skip fetch+parse entirely and just verify the URLs.
    """
    url, source = client.resolve_url(
        info_url=row.info_url,
        title=row.title,
        series=row.series,
    )
    if not url:
        unmatched.append(f"{row.era}|{row.title}|{row.series}|{row.medium}|source={source}")
        return
    work["wiki_url"] = url

    # Author cell is "meaningful" if it has at least one real name after
    # filtering out the "Uncredited" placeholder. A cell containing only
    # "Uncredited" should NOT count as populated — we want the parser to fill
    # it from the wiki page.
    has_real_author = bool(row.author) and bool(_split_excel_authors(row.author))
    excel_full = bool(has_real_author and row.publisher and row.release_date_str and row.cover_url)

    if excel_full:
        if not client.verify_url_alive(url):
            dead_links.append(
                f"{row.era}|{row.title}|{row.series}|{row.medium}|{row.series_number}|wiki|{url}"
            )
        if not client.verify_url_alive(row.cover_url):
            dead_links.append(
                f"{row.era}|{row.title}|{row.series}|{row.medium}|"
                f"{row.series_number}|cover|{row.cover_url}"
            )
        _populate_from_excel(work, row)
        return

    html = client.fetch_html(url)
    if not html and source == "from_excel":
        alt_url, alt_source = client.resolve_url(
            info_url=None,
            title=row.title,
            series=row.series,
        )
        if alt_url and alt_url != url:
            alt_html = client.fetch_html(alt_url)
            if alt_html:
                work["wiki_url"] = alt_url
                html = alt_html
    if not html:
        unmatched.append(f"{row.era}|{row.title}|{row.series}|{row.medium}|source=dead_url")
        return
    fields = parse_infobox(html)
    _merge_excel_priority(work, row, fields)


def _split_series_and_number(
    series_text: str | None,
    series_number_text: str | None,
) -> tuple[list[str], list[str]]:
    """Split parallel comma-separated SERIES and SERIES # cells into aligned
    lists.

    Numbers beyond the series count are dropped. When the series cell is
    empty the numbers are still kept — the work's title is acting as the
    series identifier (e.g. a self-titled mini-series like
    "Jedi: The Dark Side #1-5").
    """

    def _split(text: str | None) -> list[str]:
        if not text:
            return []
        return [p.strip() for p in text.split(",") if p.strip()]

    series = _split(series_text)
    numbers = _split(series_number_text)
    if not series:
        return [], numbers
    return series, numbers[: len(series)]


def _split_excel_authors(text: str) -> list[str]:
    """Split Excel author cell on commas; drop the "Uncredited" placeholder.

    Excel author cells use comma-separated names. "Uncredited" is a
    Wookieepedia placeholder we never want to surface as a real name.
    """
    return [a.strip() for a in text.split(",") if a.strip() and a.strip().lower() != "uncredited"]


def _normalize_publisher(work: dict) -> None:
    """Pick a single publisher when an Excel cell lists several."""
    if "publisher" in work:
        work["publisher"] = select_publisher(work["publisher"])


def _populate_from_excel(work: dict, row: ExcelRow) -> None:
    """Populate enriched fields entirely from Excel."""
    if row.author:
        authors = _split_excel_authors(row.author)
        if authors:
            work["authors"] = authors
    if row.publisher:
        work["publisher"] = row.publisher
    if row.release_date_str:
        parsed = parse_excel_release(row.release_date_str)
        if parsed:
            iso, precision = parsed
            work["release_date"] = iso
            work["release_precision"] = precision
    if row.cover_url:
        work["cover_url"] = row.cover_url


def _merge_excel_priority(work: dict, row: ExcelRow, fields: dict) -> None:
    """Merge parser results with Excel taking wholesale priority per field."""
    if row.author:
        authors = _split_excel_authors(row.author)
        if authors:
            work["authors"] = authors
        elif fields.get("authors"):
            # Excel cell only contained "Uncredited" placeholder noise — fall
            # back to the parser instead of surfacing an empty author list.
            work["authors"] = fields["authors"]
    elif fields.get("authors"):
        work["authors"] = fields["authors"]

    if row.publisher:
        work["publisher"] = row.publisher
    elif fields.get("publisher"):
        work["publisher"] = fields["publisher"]

    if row.release_date_str:
        parsed = parse_excel_release(row.release_date_str)
        if parsed:
            iso, precision = parsed
            work["release_date"] = iso
            work["release_precision"] = precision
    elif fields.get("release_date"):
        work["release_date"] = fields["release_date"]
        work["release_precision"] = fields["release_precision"]

    if row.cover_url:
        work["cover_url"] = row.cover_url
    elif fields.get("cover_url"):
        work["cover_url"] = fields["cover_url"]


def build(*, refresh: bool, dry_run: bool) -> dict:
    works: list[dict] = []
    valid_rows: list[ExcelRow] = []
    ignored_no_year: list[str] = []
    missing_medium: list[str] = []
    unmatched: list[str] = []
    dead_links: list[str] = []

    client = WikiClient(cache_dir=CACHE_DIR, refresh=refresh)
    rows = list(read_works(EXCEL_PATH))
    total_rows = len(rows)

    for i, row in enumerate(rows):
        if row.year is None and row.era != NON_CANON_ERA:
            ignored_no_year.append(f"{row.era}|{row.title}|{row.series}|{row.medium}")
            continue
        if row.medium not in MEDIUMS:
            missing_medium.append(f"{row.era}|{row.title}|{row.series}|{row.medium}")
            continue
        work = _row_to_work(row)
        if not dry_run:
            _enrich(work, row, client, unmatched, dead_links)
        _normalize_publisher(work)
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
            fields["release_precision"] = work["release_precision"]
        if "cover_url" in work:
            fields["cover_url"] = work["cover_url"]
        if fields:
            key = _work_lookup_key(row, work)
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
    DEAD_LINKS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DEAD_LINKS_LOG.write_text(
        "\n".join(dead_links) + ("\n" if dead_links else ""),
        encoding="utf-8",
    )

    ids_writeback = _build_ids_writeback(works, valid_rows)
    writeback = update_excel(
        EXCEL_PATH,
        enriched_lookup,
        ids=ids_writeback,
    )
    print(
        f"wrote {summary} to {OUTPUT_PATH}; "
        f"excel writeback: {writeback['updated']} updated, "
        f"{writeback['not_found_in_excel']} not-found-in-excel; "
        f"{len(dead_links)} dead links"
    )
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Bypass HTTP cache and re-fetch all Wookieepedia pages.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Do not write the JSON.")
    args = parser.parse_args()
    build(refresh=args.refresh, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
