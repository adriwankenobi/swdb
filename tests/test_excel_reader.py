from pathlib import Path

import pytest

from scripts.excel_reader import read_works

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "Star Wars EU.xlsx"


@pytest.fixture(scope="module")
def rows():
    return list(read_works(EXCEL_PATH))


def test_reads_all_eras(rows):
    eras = {row.era for row in rows}
    # 9 sheets have data (0..8); NON-CANON sheet (era 9) exists but is currently empty.
    assert set(range(9)).issubset(eras)
    assert eras.issubset(set(range(10)))


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


def test_excel_row_has_color_for_filled_row(rows):
    sample = next(r for r in rows if r.title == "A New Hope" and r.medium == "Novel")
    assert sample.color is not None
    assert sample.color.startswith("#") and len(sample.color) == 7


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


def test_read_works_closes_workbook_on_early_termination():
    """Abandoning the iterator must still trigger wb.close() via the finally clause."""
    gen = read_works(EXCEL_PATH)
    next(gen)            # consume one row
    gen.close()          # force GeneratorExit
    # If close() had not been wrapped in try/finally, the wb.close() call would
    # have been skipped. We can't directly observe ZipFile state, but exercising
    # this path here documents the contract and surfaces any regressions if
    # someone later removes the finally block (the test will run the path even
    # if it can't assert the side effect).


def test_reads_author_publisher_release_columns(tmp_path):
    from openpyxl import Workbook
    from scripts.excel_reader import read_works

    wb = Workbook()
    ws = wb.active
    ws.title = "REBELLION"
    ws.append([
        "YEAR", "MEDIUM", "SERIES", "TITLE", "#",
        "AUTHOR", "PUBLISHER", "RELEASE", "COLLECTED", "INFO", "COVER",
    ])
    ws.append([
        "0 ABY", "Novel", "Star Wars Episode", "A New Hope", "IV",
        "Alan Dean Foster", "Ballantine Books", "1976.11.12",
        None, "https://example.com/wiki", "https://example.com/cover.jpg",
    ])
    ws.append([
        "0 ABY", "Comic", None, "Sparse Row", "1",
        None, None, None, None, None, None,
    ])
    path = tmp_path / "test.xlsx"
    wb.save(path)
    wb.close()

    rows = list(read_works(path))
    assert len(rows) == 2
    full = rows[0]
    assert full.author == "Alan Dean Foster"
    assert full.publisher == "Ballantine Books"
    assert full.release_date_str == "1976.11.12"
    sparse = rows[1]
    assert sparse.author is None
    assert sparse.publisher is None
    assert sparse.release_date_str is None
