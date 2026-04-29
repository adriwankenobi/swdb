from pathlib import Path

import pytest

from scripts.wiki_client import WikiClient


@pytest.fixture
def cache_dir(tmp_path: Path) -> Path:
    return tmp_path / "cache"


def test_fetch_html_caches_response(cache_dir, monkeypatch):
    calls = {"n": 0}

    def fake_get(url, timeout):
        calls["n"] += 1

        class R:
            status_code = 200
            text = "<html>ok</html>"

            def raise_for_status(self):
                pass

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)

    html_a = client.fetch_html("https://example.com/page")
    html_b = client.fetch_html("https://example.com/page")
    assert html_a == "<html>ok</html>"
    assert html_b == "<html>ok</html>"
    assert calls["n"] == 1  # cache hit


def test_fetch_html_refresh_bypasses_cache(cache_dir, monkeypatch):
    calls = {"n": 0}

    def fake_get(url, timeout):
        calls["n"] += 1

        class R:
            status_code = 200
            text = f"<html>{calls['n']}</html>"

            def raise_for_status(self):
                pass

        return R()

    client = WikiClient(cache_dir=cache_dir, refresh=True)
    monkeypatch.setattr(client._session, "get", fake_get)
    client.fetch_html("https://example.com/page")
    client.fetch_html("https://example.com/page")
    assert calls["n"] == 2


def test_fetch_html_404_returns_none(cache_dir, monkeypatch):
    def fake_get(url, timeout):
        class R:
            status_code = 404
            text = "Not Found"

            def raise_for_status(self):
                from requests import HTTPError

                raise HTTPError("404")

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    assert client.fetch_html("https://example.com/missing") is None


def test_fetch_html_returns_none_on_connection_error(cache_dir, monkeypatch):
    def fake_get(url, timeout):
        from requests import ConnectionError

        raise ConnectionError("DNS lookup failed")

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    assert client.fetch_html("https://example.com/missing") is None


def test_resolve_url_returns_info_url_when_present(cache_dir):
    client = WikiClient(cache_dir=cache_dir)
    assert client.resolve_url(
        info_url="https://starwars.fandom.com/wiki/Eruption",
        title="Eruption",
        series="Dawn of the Jedi",
    ) == ("https://starwars.fandom.com/wiki/Eruption", "from_excel")


def test_resolve_url_uses_opensearch_when_info_missing(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    def fake_opensearch(query):
        # Mimic MediaWiki opensearch tuple response: [query, [titles], [descs], [urls]]
        return [
            query,
            ["A New Hope", "A New Hope (novel)"],
            ["", ""],
            [
                "https://starwars.fandom.com/wiki/A_New_Hope",
                "https://starwars.fandom.com/wiki/A_New_Hope_(novel)",
            ],
        ]

    monkeypatch.setattr(client, "_opensearch", fake_opensearch)
    url, source = client.resolve_url(info_url=None, title="A New Hope", series="Star Wars Episode")
    assert url == "https://starwars.fandom.com/wiki/A_New_Hope"
    assert source == "opensearch"


def test_resolve_url_rejects_unrelated_top_match(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    def fake_opensearch(query):
        return [query, ["Tatooine"], [""], ["https://starwars.fandom.com/wiki/Tatooine"]]

    monkeypatch.setattr(client, "_opensearch", fake_opensearch)
    url, source = client.resolve_url(info_url=None, title="Eruption", series="Dawn of the Jedi")
    assert url is None
    assert source == "unmatched"


def test_resolve_url_returns_none_when_opensearch_empty(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    def fake_opensearch(query):
        return [query, [], [], []]

    monkeypatch.setattr(client, "_opensearch", fake_opensearch)
    url, source = client.resolve_url(info_url=None, title="Nonexistent Work", series=None)
    assert url is None
    assert source == "unmatched"
