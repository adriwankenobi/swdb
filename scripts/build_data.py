"""Build pipeline orchestrator: Excel -> works.json."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from scripts.collections_reader import ExcelCollectionRow, read_collections
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
INVALID_COLLECTIONS_LOG = REPO_ROOT / "data" / "invalid_collections.log"
UNMATCHED_COLLECTIONS_LOG = REPO_ROOT / "data" / "unmatched_collections.log"

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


def derive_collection(
    row: ExcelCollectionRow,
    members: list[dict],  # ordered in workbook order
) -> dict:
    """Build a Collection dict from the Excel row + ordered member work dicts.

    Precondition: len(members) >= 2 (caller has filtered).
    """
    from scripts.id_utils import make_collection_id

    eras = sorted({m["era"] for m in members})
    mediums = sorted({m["medium"] for m in members})

    # Full display range across all members.
    year_min = min(m["year"] for m in members)
    year_max = max(m.get("year_end", m["year"]) for m in members)

    # Anchor: dominant-medium members only.
    dominant = _dominant_medium(set(mediums))
    dom_members = [m for m in members if m["medium"] == dominant]
    anchor_year = min(m["year"] for m in dom_members)
    # First dominant member (workbook order) whose year equals the anchor.
    anchor = next(m for m in dom_members if m["year"] == anchor_year)

    collection: dict = {
        "id": make_collection_id(row.title),
        "title": row.title,
        "eras": eras,
        "mediums": mediums,
        "year": year_min,
        "anchor_year": anchor_year,
        "anchor_era": anchor["era"],
        "anchor_member_id": anchor["id"],
        "member_ids": [m["id"] for m in members],
    }
    if year_max != year_min:
        collection["year_end"] = year_max
    if row.release_date_str:
        parsed = parse_excel_release(row.release_date_str)
        if parsed:
            iso, precision = parsed
            collection["release_date"] = iso
            collection["release_precision"] = precision
    if row.color is not None:
        collection["color"] = row.color
    return collection


def _split_collected_titles(raw: str | None) -> list[str]:
    """Split COLLECTED cell on commas; trim and drop empties."""
    if not raw:
        return []
    return [p.strip() for p in raw.split(",") if p.strip()]


def _row_to_work(row: ExcelRow) -> dict:
    """Build a work dict.

    Precondition: caller has already verified row.year is not None and
    row.medium is in MEDIUMS.
    """
    # make_id consumes the int era + canonical medium STRING so the canonical
    # key string is unchanged across the JSON schema flip. Do NOT pass
    # ERAS[row.era] here — it would invalidate every existing UUID.
    work: dict = {
        "id": make_id(
            era=row.era,
            series=row.series,
            title=row.title,
            medium=row.medium,
            number=row.number,
        ),
        "era": ERAS[row.era],
        "title": row.title,
        "medium": row.medium,
        "year": row.year,
    }
    if row.year_end is not None:
        work["year_end"] = row.year_end
    series, number = _split_series_and_number(row.series, row.number)
    if series:
        work["series"] = series
    if number:
        work["number"] = number
    if row.color is not None:
        work["color"] = row.color
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
                f"{row.era}|{row.title}|{row.series}|{row.medium}|{row.number}|wiki|{url}"
            )
        if not client.verify_url_alive(row.cover_url):
            dead_links.append(
                f"{row.era}|{row.title}|{row.series}|{row.medium}|"
                f"{row.number}|cover|{row.cover_url}"
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


def _enrich_collection(
    collection: dict,
    row: ExcelCollectionRow,
    client: WikiClient,
    unmatched: list[str],
    parse_infobox=parse_infobox,
) -> None:
    """Resolve wiki URL and populate cover + release on `collection`.

    Excel-supplied release_date_str / cover_url (already on the dict via
    derive_collection) win wholesale. Author/publisher are not fetched for
    v1.
    """
    url, source = client.resolve_url(
        info_url=row.info_url,
        title=row.title,
        series=None,
    )
    if not url:
        unmatched.append(f"collection|{row.title}|source={source}")
        return
    collection["wiki_url"] = url

    if row.release_date_str and row.cover_url:
        collection["cover_url"] = row.cover_url
        return

    html = client.fetch_html(url)
    if not html:
        unmatched.append(f"collection|{row.title}|source=dead_url")
        return
    fields = parse_infobox(html)
    if "cover_url" not in collection and fields.get("cover_url"):
        collection["cover_url"] = fields["cover_url"]
    if "release_date" not in collection and fields.get("release_date"):
        collection["release_date"] = fields["release_date"]
        collection["release_precision"] = fields["release_precision"]


def _split_series_and_number(
    series_text: str | None,
    number_text: str | None,
) -> tuple[list[str], list[str]]:
    """Split parallel comma-separated SERIES and # cells into aligned lists.

    Numbers beyond the series count are dropped. An empty series cell
    drops the numbers too — a number with no series to attach to is
    meaningless.
    """

    def _split(text: str | None) -> list[str]:
        if not text:
            return []
        return [p.strip() for p in text.split(",") if p.strip()]

    series = _split(series_text)
    if not series:
        return [], []
    numbers = _split(number_text)[: len(series)]
    return series, numbers


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
        if row.year is None:
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

    # --- Collections ---
    collection_rows = list(read_collections(EXCEL_PATH))
    members_by_title: dict[str, list[dict]] = defaultdict(list)
    titles_per_work: dict[str, list[str]] = {}
    for work, row in zip(works, valid_rows, strict=True):
        titles = _split_collected_titles(row.collected)
        if not titles:
            continue
        titles_per_work[work["id"]] = titles
        for t in titles:
            members_by_title[t].append(work)

    collections_out: list[dict] = []
    invalid_collections: list[str] = []
    known_titles: set[str] = set()
    title_to_id: dict[str, str] = {}
    for crow in collection_rows:
        known_titles.add(crow.title)
        members = members_by_title.get(crow.title, [])
        if len(members) < 2:
            invalid_collections.append(f"{crow.title}|members={len(members)}")
            continue
        c = derive_collection(crow, members)
        if not dry_run:
            _enrich_collection(c, crow, client, unmatched)
        collections_out.append(c)
        title_to_id[crow.title] = c["id"]

    # Attach collection_ids to each work, preserving Excel comma order.
    # Skip titles that didn't produce a valid collection (single-member or
    # absent from the COLLECTIONS sheet — both surface via the logs).
    for work in works:
        titles = titles_per_work.get(work["id"], [])
        ids = [title_to_id[t] for t in titles if t in title_to_id]
        if ids:
            work["collection_ids"] = ids

    unmatched_collections: list[str] = []
    for work, row in zip(works, valid_rows, strict=True):
        titles = titles_per_work.get(work["id"], [])
        for t in titles:
            if t not in known_titles:
                unmatched_collections.append(f"{row.era}|{row.title}|{row.medium}|missing={t}")

    _detect_duplicates(works)
    payload = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "works": works,
        "collections": collections_out,
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
            key = (
                row.era,
                row.title,
                row.series,
                work["medium"],  # already a canonical string
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
    INVALID_COLLECTIONS_LOG.parent.mkdir(parents=True, exist_ok=True)
    INVALID_COLLECTIONS_LOG.write_text(
        "\n".join(invalid_collections) + ("\n" if invalid_collections else ""),
        encoding="utf-8",
    )
    UNMATCHED_COLLECTIONS_LOG.parent.mkdir(parents=True, exist_ok=True)
    UNMATCHED_COLLECTIONS_LOG.write_text(
        "\n".join(unmatched_collections) + ("\n" if unmatched_collections else ""),
        encoding="utf-8",
    )
    DEAD_LINKS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DEAD_LINKS_LOG.write_text(
        "\n".join(dead_links) + ("\n" if dead_links else ""),
        encoding="utf-8",
    )

    writeback = update_excel(EXCEL_PATH, enriched_lookup)
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
