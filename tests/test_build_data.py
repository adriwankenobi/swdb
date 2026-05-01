"""Tests for the build orchestrator's row-to-work conversion."""

from unittest.mock import MagicMock

from scripts.build_data import _enrich, _row_to_work
from scripts.excel_reader import ExcelRow


def _row(**over) -> ExcelRow:
    base = dict(
        era=1,
        title="Knight Errant",
        series=None,
        medium="Novel",
        number=None,
        year=-1032,
        year_end=None,
        info_url=None,
        cover_url=None,
        color=None,
        author=None,
        publisher=None,
        release_date_str=None,
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
            "publisher": "Parser Publisher",                    # used
            "release_date": "1980-05-20",                       # used
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
