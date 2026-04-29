import shutil
from pathlib import Path

import pytest
from openpyxl import Workbook, load_workbook

from scripts.excel_writer import update_excel


@pytest.fixture
def tiny_xlsx(tmp_path: Path) -> Path:
    """Create a minimal xlsx with one sheet matching an ERA_INDEX name."""
    wb = Workbook()
    ws = wb.active
    ws.title = "REBELLION"
    ws.append([
        "YEAR", "MEDIUM", "SERIES", "TITLE", "#",
        "AUTHOR", "PUBLISHER", "RELEASE", "COLLECTED", "INFO", "COVER",
    ])
    ws.append([
        "0 ABY", "Novel", "Star Wars Episode", "A New Hope", "IV",
        "OLD AUTHOR", "OLD PUBLISHER", "1976.01.01", None, None, "OLD COVER",
    ])
    ws.append([
        "0 ABY", "Comic", None, "Some Comic", "1",
        "ANOTHER AUTHOR", None, None, None, None, None,
    ])
    path = tmp_path / "test.xlsx"
    wb.save(path)
    wb.close()
    return path


def test_update_excel_writes_authors_publisher_release_cover(tiny_xlsx: Path):
    enriched = {
        (5, "A New Hope", "Star Wars Episode", "Novel", "IV"): {
            "authors": ["Alan Dean Foster"],
            "publisher": "Ballantine Books",
            "release_date": "1976-11-12",
            "cover_url": "https://example.com/cover.jpg",
        },
    }
    result = update_excel(tiny_xlsx, enriched)
    assert result["updated"] == 1

    wb = load_workbook(tiny_xlsx, data_only=True)
    ws = wb["REBELLION"]
    row2 = list(ws.iter_rows(min_row=2, max_row=2, values_only=True))[0]
    # AUTHOR (index 5), PUBLISHER (6), RELEASE (7), COVER (10)
    assert row2[5] == "Alan Dean Foster"
    assert row2[6] == "Ballantine Books"
    assert row2[7] == "1976.11.12"
    assert row2[10] == "https://example.com/cover.jpg"
    # Trusted columns are unchanged
    assert row2[0] == "0 ABY"
    assert row2[3] == "A New Hope"
    wb.close()


def test_update_excel_does_not_touch_unrelated_rows(tiny_xlsx: Path):
    enriched = {
        (5, "A New Hope", "Star Wars Episode", "Novel", "IV"): {
            "authors": ["Alan Dean Foster"],
        },
    }
    update_excel(tiny_xlsx, enriched)
    wb = load_workbook(tiny_xlsx, data_only=True)
    ws = wb["REBELLION"]
    row3 = list(ws.iter_rows(min_row=3, max_row=3, values_only=True))[0]
    # Some Comic row was not in lookup — author cell stays as-is
    assert row3[5] == "ANOTHER AUTHOR"
    wb.close()


def test_update_excel_skips_missing_fields(tiny_xlsx: Path):
    # Only authors provided; publisher/release/cover should NOT be cleared
    enriched = {
        (5, "A New Hope", "Star Wars Episode", "Novel", "IV"): {
            "authors": ["Alan Dean Foster"],
        },
    }
    update_excel(tiny_xlsx, enriched)
    wb = load_workbook(tiny_xlsx, data_only=True)
    ws = wb["REBELLION"]
    row2 = list(ws.iter_rows(min_row=2, max_row=2, values_only=True))[0]
    assert row2[5] == "Alan Dean Foster"
    assert row2[6] == "OLD PUBLISHER"
    assert row2[7] == "1976.01.01"
    assert row2[10] == "OLD COVER"
    wb.close()
