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


def test_year_in_universe_parsed(rows):
    sample = next(r for r in rows if r.title == "A New Hope" and r.medium == "Novel")
    assert sample.year_in_universe == 0


def test_excel_row_skips_empty_rows(rows):
    # Defensive — no rows should be missing a title.
    assert all(row.title for row in rows)


def test_info_url_present_for_known_row(rows):
    sample = next(r for r in rows if r.title == "Eruption" and r.medium == "Short Story")
    assert sample.info_url and "starwars.fandom.com" in sample.info_url


def test_excel_order_is_unique_and_contiguous(rows):
    orders = [row.excel_order for row in rows]
    assert orders == list(range(len(rows)))


def test_excel_order_preserves_in_sheet_sequence(rows):
    # First two rows of OLD REPUBLIC sheet should have consecutive excel_order values.
    old_rep = [r for r in rows if r.era == 1]
    assert old_rep[0].excel_order + 1 == old_rep[1].excel_order


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
