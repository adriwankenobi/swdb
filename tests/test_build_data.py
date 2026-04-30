"""Tests for the build orchestrator's row-to-work conversion."""

from scripts.build_data import _row_to_work
from scripts.excel_reader import ExcelRow


def _row(**over) -> ExcelRow:
    base = dict(
        era=1,                # OLD REPUBLIC
        title="Knight Errant",
        series=None,
        medium="Novel",
        number=None,
        year=-1032,
        year_end=None,
        info_url=None,
        cover_url=None,
        color=None,
    )
    base.update(over)
    return ExcelRow(**base)


def test_row_to_work_emits_string_era():
    work = _row_to_work(_row(era=1))
    assert work["era"] == "OLD REPUBLIC"


def test_row_to_work_emits_string_medium():
    work = _row_to_work(_row(medium="Novel"))
    assert work["medium"] == "Novel"


def test_row_to_work_id_is_stable_across_schema_change():
    # ID must not change when we switch the JSON shape; make_id consumes
    # `int` era and the canonical medium STRING, so the canonical key string
    # is identical to the pre-refactor era=int / medium=str pipeline.
    work = _row_to_work(_row(
        era=5, title="A New Hope", series="Star Wars Episode",
        medium="Novel", number="IV", year=0,
    ))
    # Frozen value captured from main before any code changes via:
    #   make_id(era=5, series='Star Wars Episode', title='A New Hope',
    #           medium='Novel', number='IV')
    assert work["id"] == "34a13f75-b121-5c91-b435-f765f951e4a5"
