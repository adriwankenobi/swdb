from pathlib import Path

import pytest

from scripts.infobox_parser import _parse_date, parse_infobox

FIXTURE_NOVEL = Path(__file__).parent / "fixtures" / "infobox_a_new_hope.html"


@pytest.fixture
def html_novel() -> str:
    return FIXTURE_NOVEL.read_text(encoding="utf-8")


def test_parse_infobox_returns_authors(html_novel):
    result = parse_infobox(html_novel)
    assert "Alan Dean Foster" in result["authors"]


def test_parse_infobox_returns_publisher(html_novel):
    result = parse_infobox(html_novel)
    # Real Wookieepedia fixture has "Ballantine Books" as original publisher
    assert result["publisher"] == "Ballantine Books"


def test_parse_infobox_returns_release_date_iso(html_novel):
    result = parse_infobox(html_novel)
    # "November 12 , 1976 (Paperback)" -> "1976-11-12"
    assert result["release_date"] == "1976-11-12"
    assert result["release_precision"] == "day"


def test_parse_infobox_returns_cover_url(html_novel):
    result = parse_infobox(html_novel)
    assert result["cover_url"].startswith("https://")
    assert "wikia" in result["cover_url"] or "fandom" in result["cover_url"]


def test_parse_infobox_returns_empty_dict_on_garbage():
    assert parse_infobox("<html></html>") == {}


def test_parse_infobox_reads_air_date_label_for_tv_episodes():
    # Wookieepedia TV episode infoboxes (e.g. Clone Wars "Chapter 1") label
    # the field "Air date" rather than "Release date" or "Publication date".
    html = """
    <aside class="portable-infobox">
      <div class="pi-item pi-data">
        <h3 class="pi-data-label">Air date</h3>
        <div class="pi-data-value">November 7, 2003</div>
      </div>
    </aside>
    """
    result = parse_infobox(html)
    assert result["release_date"] == "2003-11-07"
    assert result["release_precision"] == "day"


@pytest.mark.parametrize(
    "text,expected",
    [
        # Full day precision.
        ("November 12, 1976", ("1976-11-12", "day")),
        ("Nov 12, 1976", ("1976-11-12", "day")),
        ("12 November 1976", ("1976-11-12", "day")),
        ("1976-11-12", ("1976-11-12", "day")),
        # Wookieepedia "Month YYYY" pages (e.g. A Tale from the Dark Side).
        ("November 1996", ("1996-11-01", "month")),
        ("September 1999", ("1999-09-01", "month")),
        # "Month, YYYY" (occasional comma variant).
        ("October, 1997", ("1997-10-01", "month")),
        ("April, 1978", ("1978-04-01", "month")),
        # Ranges: take the first month, share the year if needed.
        ("October 1998 – February 1999", ("1998-10-01", "month")),
        ("February – May 1997", ("1997-02-01", "month")),
        # Short month names.
        ("Nov 1996", ("1996-11-01", "month")),
        ("Sept 2008", ("2008-09-01", "month")),
        # Year-only sources (bare year or fuzzy adjective).
        ("1989", ("1989-01-01", "year")),
        ("Late 1989", ("1989-01-01", "year")),
    ],
)
def test_parse_date_handles_partial_precision(text, expected):
    assert _parse_date(text) == expected


def test_parse_date_returns_none_for_undated():
    assert _parse_date("Canceled") is None
    assert _parse_date("22 BBY") is None  # in-universe years are not real-world dates


def test_parse_infobox_drops_uncredited_author_alone():
    # Some Wookieepedia infoboxes literally list the author as "Uncredited".
    # Treat as no author rather than as a real name.
    html = """
    <aside class="portable-infobox">
      <div class="pi-item pi-data">
        <h3 class="pi-data-label">Author</h3>
        <div class="pi-data-value">Uncredited</div>
      </div>
    </aside>
    """
    result = parse_infobox(html)
    assert "authors" not in result


def test_parse_infobox_drops_uncredited_among_other_authors():
    html = """
    <aside class="portable-infobox">
      <div class="pi-item pi-data">
        <h3 class="pi-data-label">Author</h3>
        <div class="pi-data-value">Alan Dean Foster, Uncredited, John Doe</div>
      </div>
    </aside>
    """
    result = parse_infobox(html)
    assert result["authors"] == ["Alan Dean Foster", "John Doe"]
