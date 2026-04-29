from pathlib import Path

import pytest

from scripts.infobox_parser import parse_infobox

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


def test_parse_infobox_returns_cover_url(html_novel):
    result = parse_infobox(html_novel)
    assert result["cover_url"].startswith("https://")
    assert "wikia" in result["cover_url"] or "fandom" in result["cover_url"]


def test_parse_infobox_returns_empty_dict_on_garbage():
    assert parse_infobox("<html></html>") == {}
