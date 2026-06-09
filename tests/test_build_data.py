"""Tests for the build orchestrator's row-to-work conversion."""

from unittest.mock import MagicMock

from scripts import build_data
from scripts.build_data import _enrich, _row_to_work, _split_series_and_number
from scripts.excel_reader import ExcelRow
from scripts.id_utils import make_id


def _row(**over) -> ExcelRow:
    base = dict(
        era=1,
        title="Knight Errant",
        series=None,
        series_number=None,
        medium="Novel",
        number=None,
        year=-1032,
        year_end=None,
        info_url=None,
        cover_url=None,
        author=None,
        publisher=None,
        release_date_str=None,
        work_id=None,
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
    work = _row_to_work(
        _row(
            era=5,
            title="A New Hope",
            series="Star Wars Episode",
            series_number="IV",
            medium="Novel",
            year=0,
        )
    )
    # Frozen value captured from main before any code changes via:
    #   make_id(era=5, series='Star Wars Episode', title='A New Hope',
    #           medium='Novel', number='IV')
    assert work["id"] == "34a13f75-b121-5c91-b435-f765f951e4a5"


# ---------------------------------------------------------------------------
# _enrich tests
# ---------------------------------------------------------------------------


def _full_excel_row(**over):
    return _row(
        info_url="https://example.com/wiki/page",
        cover_url="https://example.com/cover.jpg",
        author="Alan Dean Foster",
        publisher="Ballantine Books",
        release_date_str="1976.11.12",
        **over,
    )


def test_enrich_full_excel_skips_fetch_html():
    row = _full_excel_row()
    work = _row_to_work(row)
    client = MagicMock()
    client.resolve_url.return_value = (row.info_url, "from_excel")
    client.verify_url_alive.return_value = True
    unmatched, dead = [], []

    _enrich(work, row, client, unmatched, dead)

    client.fetch_html.assert_not_called()
    assert work["wiki_url"] == row.info_url
    assert work["authors"] == ["Alan Dean Foster"]
    assert work["publisher"] == "Ballantine Books"
    assert work["release_date"] == "1976-11-12"
    assert work["release_precision"] == "day"
    assert work["cover_url"] == row.cover_url
    assert dead == []


def test_enrich_full_excel_logs_dead_wiki_url():
    row = _full_excel_row()
    work = _row_to_work(row)
    client = MagicMock()
    client.resolve_url.return_value = (row.info_url, "from_excel")
    client.verify_url_alive.side_effect = lambda u: u != row.info_url
    unmatched, dead = [], []

    _enrich(work, row, client, unmatched, dead)

    assert any("wiki" in entry and row.info_url in entry for entry in dead)


def test_enrich_full_excel_logs_dead_cover_url():
    row = _full_excel_row()
    work = _row_to_work(row)
    client = MagicMock()
    client.resolve_url.return_value = (row.info_url, "from_excel")
    client.verify_url_alive.side_effect = lambda u: u != row.cover_url
    unmatched, dead = [], []

    _enrich(work, row, client, unmatched, dead)

    assert any("cover" in entry and row.cover_url in entry for entry in dead)


def test_enrich_partial_excel_fetches_and_excel_wins_wholesale(monkeypatch):
    # Excel has author + cover; missing publisher + release_date.
    row = _row(
        info_url="https://example.com/wiki/page",
        cover_url="https://example.com/cover.jpg",
        author="Excel Author",
        publisher=None,
        release_date_str=None,
    )
    work = _row_to_work(row)
    client = MagicMock()
    client.resolve_url.return_value = (row.info_url, "from_excel")
    client.fetch_html.return_value = "<html>infobox</html>"

    def fake_parse(html):
        return {
            "authors": ["Parser Author A", "Parser Author B"],  # discarded
            "publisher": "Parser Publisher",  # used
            "release_date": "1980-05-20",  # used
            "release_precision": "day",
            "cover_url": "https://example.com/parser-cover.jpg",  # discarded
        }

    monkeypatch.setattr("scripts.build_data.parse_infobox", fake_parse)
    unmatched, dead = [], []

    _enrich(work, row, client, unmatched, dead)

    assert work["authors"] == ["Excel Author"]
    assert work["publisher"] == "Parser Publisher"
    assert work["release_date"] == "1980-05-20"
    assert work["release_precision"] == "day"
    assert work["cover_url"] == "https://example.com/cover.jpg"


def test_enrich_partial_excel_no_url_uses_opensearch():
    # No info_url in Excel — opensearch returns a URL.
    row = _row(
        info_url=None,
        cover_url=None,
        author=None,
        publisher=None,
        release_date_str=None,
    )
    work = _row_to_work(row)
    client = MagicMock()
    client.resolve_url.return_value = ("https://example.com/wiki/found", "opensearch")
    client.fetch_html.return_value = None  # dead URL after resolve

    unmatched, dead = [], []
    _enrich(work, row, client, unmatched, dead)
    assert any("dead_url" in entry for entry in unmatched)


def test_enrich_excel_uncredited_alone_falls_back_to_parser(monkeypatch):
    # Excel author cell contains only "Uncredited" — treat as missing and let
    # the parser fill it instead.
    row = _row(
        info_url="https://example.com/wiki/page",
        cover_url="https://example.com/cover.jpg",
        author="Uncredited",
        publisher="Some Pub",
        release_date_str="2020.05.01",
    )
    work = _row_to_work(row)
    client = MagicMock()
    client.resolve_url.return_value = (row.info_url, "from_excel")
    client.fetch_html.return_value = "<html>infobox</html>"

    monkeypatch.setattr(
        "scripts.build_data.parse_infobox",
        lambda html: {"authors": ["Real Author"]},
    )
    unmatched, dead = [], []
    _enrich(work, row, client, unmatched, dead)
    assert work["authors"] == ["Real Author"]


def test_enrich_excel_uncredited_mixed_keeps_real_names():
    row = _row(
        info_url="https://example.com/wiki/page",
        cover_url="https://example.com/cover.jpg",
        author="Real Author, Uncredited, Another",
        publisher="Some Pub",
        release_date_str="2020.05.01",
    )
    work = _row_to_work(row)
    client = MagicMock()
    client.resolve_url.return_value = (row.info_url, "from_excel")
    client.verify_url_alive.return_value = True

    unmatched, dead = [], []
    _enrich(work, row, client, unmatched, dead)
    assert work["authors"] == ["Real Author", "Another"]


def test_normalize_publisher_selects_us_edition():
    """Comma-separated publisher values get reduced to the US edition."""
    work = {"publisher": "Sphere Books (UK), Del Rey (US)"}
    build_data._normalize_publisher(work)
    assert work["publisher"] == "Del Rey"


def test_normalize_publisher_selects_worldwide_edition():
    work = {"publisher": "Dark Horse Comics (worldwide), Titan Magazines (UK)"}
    build_data._normalize_publisher(work)
    assert work["publisher"] == "Dark Horse Comics"


def test_normalize_publisher_selects_first_when_no_region_markers():
    work = {"publisher": "National Public Radio, HighBridge Audio"}
    build_data._normalize_publisher(work)
    assert work["publisher"] == "National Public Radio"


def test_ids_writeback_only_for_blank_rows():
    """build_data records a generated id for rows whose work_id was blank,
    keyed by the writer's lookup tuple, and skips rows that already have an id."""
    from scripts.build_data import _build_ids_writeback

    rows = [
        _row(era=5, work_id=None, title="A New Hope", series="Star Wars Episode",
             series_number="IV", medium="Novel"),
        _row(era=5, work_id="frozen-007", title="Some Comic", series=None,
             series_number="1", medium="Comic"),
    ]
    works = [_row_to_work(r) for r in rows]
    ids = _build_ids_writeback(works, rows)

    assert ids[(5, "A New Hope", "Star Wars Episode", "Novel", "IV")] == works[0]["id"]
    assert (5, "Some Comic", None, "Comic", "1") not in ids


# ---------------------------------------------------------------------------
# _split_series_and_number tests
# ---------------------------------------------------------------------------


def test_split_series_and_number_single_value():
    assert _split_series_and_number("X-Wing", "5") == (["X-Wing"], ["5"])


def test_split_series_and_number_multi_value():
    assert _split_series_and_number("X-Wing, Rebel Alliance", "5, 12") == (
        ["X-Wing", "Rebel Alliance"],
        ["5", "12"],
    )


def test_split_series_and_number_strips_whitespace():
    assert _split_series_and_number("  X-Wing  ,Rebel Alliance ", "  5 , 12") == (
        ["X-Wing", "Rebel Alliance"],
        ["5", "12"],
    )


def test_split_series_and_number_drops_empties_from_double_commas():
    assert _split_series_and_number("X-Wing,,Rebel", "5,,12") == (
        ["X-Wing", "Rebel"],
        ["5", "12"],
    )


def test_split_series_and_number_truncates_extra_numbers():
    assert _split_series_and_number("X-Wing", "5, 12, 99") == (["X-Wing"], ["5"])


def test_split_series_and_number_short_number_list_allowed():
    assert _split_series_and_number("X-Wing, Rebel Alliance", "5") == (
        ["X-Wing", "Rebel Alliance"],
        ["5"],
    )


def test_split_series_and_number_empty_number():
    assert _split_series_and_number("X-Wing", None) == (["X-Wing"], [])


def test_split_series_and_number_empty_series_keeps_number():
    """Numbers are kept when series is empty; title acts as the series."""
    assert _split_series_and_number(None, "5") == ([], ["5"])
    assert _split_series_and_number("", "5") == ([], ["5"])
    assert _split_series_and_number(None, "1, 2") == ([], ["1", "2"])


def test_split_series_and_number_both_empty():
    assert _split_series_and_number(None, None) == ([], [])


# ---------------------------------------------------------------------------
# _row_to_work array-shape tests
# ---------------------------------------------------------------------------


def test_row_to_work_emits_series_number_as_array():
    row = _row(series="Star Wars Adventures (comics)", series_number="1")
    work = _row_to_work(row)
    assert work["series"] == ["Star Wars Adventures (comics)"]
    assert work["series_number"] == ["1"]


def test_row_to_work_emits_multi_series_number_arrays():
    row = _row(series="X-Wing, Rebel Alliance", series_number="5, 12")
    work = _row_to_work(row)
    assert work["series"] == ["X-Wing", "Rebel Alliance"]
    assert work["series_number"] == ["5", "12"]


def test_row_to_work_omits_series_when_empty():
    row = _row(series=None, series_number=None, number=None)
    work = _row_to_work(row)
    assert "series" not in work
    assert "series_number" not in work
    assert "number" not in work


def test_row_to_work_omits_series_number_when_empty_but_series_present():
    row = _row(series="The Clone Wars", series_number=None)
    work = _row_to_work(row)
    assert work["series"] == ["The Clone Wars"]
    assert "series_number" not in work


def test_row_to_work_emits_scalar_number():
    row = _row(series="Republic", series_number="56", number="2")
    work = _row_to_work(row)
    assert work["series_number"] == ["56"]
    assert work["number"] == "2"  # scalar string, not an array


def test_row_to_work_omits_number_when_empty():
    row = _row(series="Republic", series_number="56", number=None)
    work = _row_to_work(row)
    assert "number" not in work


# ---------------------------------------------------------------------------
# work_id / make_id fallback tests
# ---------------------------------------------------------------------------


def _work_id_row(**kw):
    defaults = dict(era=5, title="A New Hope", series="Star Wars Episode",
                    medium="Novel", series_number="IV", year=0)
    defaults.update(kw)
    return _row(**defaults)


def test_row_to_work_uses_explicit_work_id():
    work = _row_to_work(_work_id_row(work_id="frozen-007"))
    assert work["id"] == "frozen-007"


def test_row_to_work_id_is_stable_across_title_edit():
    a = _row_to_work(_work_id_row(work_id="frozen-007", title="A New Hope"))
    b = _row_to_work(_work_id_row(work_id="frozen-007", title="A New Hope (typo fixed)"))
    assert a["id"] == b["id"] == "frozen-007"


def test_row_to_work_falls_back_to_make_id_when_blank():
    work = _row_to_work(_work_id_row(work_id=None))
    assert work["id"] == make_id(era=5, series="Star Wars Episode",
                                 title="A New Hope", medium="Novel", series_number="IV")
