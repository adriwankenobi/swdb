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

            def raise_for_status(self):
                pass

            def json(self):
                return {"parse": {"text": {"*": "<html>ok</html>"}}}

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)

    html_a = client.fetch_html("https://starwars.fandom.com/wiki/page")
    html_b = client.fetch_html("https://starwars.fandom.com/wiki/page")
    assert html_a == "<html>ok</html>"
    assert html_b == "<html>ok</html>"
    assert calls["n"] == 1  # cache hit


def test_fetch_html_refresh_bypasses_cache(cache_dir, monkeypatch):
    calls = {"n": 0}

    def fake_get(url, timeout):
        calls["n"] += 1

        class R:
            status_code = 200

            def raise_for_status(self):
                pass

            def json(self):
                return {"parse": {"text": {"*": f"<html>{calls['n']}</html>"}}}

        return R()

    client = WikiClient(cache_dir=cache_dir, refresh=True)
    monkeypatch.setattr(client._session, "get", fake_get)
    client.fetch_html("https://starwars.fandom.com/wiki/page")
    client.fetch_html("https://starwars.fandom.com/wiki/page")
    assert calls["n"] == 2


def test_fetch_html_404_returns_none(cache_dir, monkeypatch):
    def fake_get(url, timeout):
        class R:
            status_code = 404

            def raise_for_status(self):
                from requests import HTTPError

                raise HTTPError("404")

            def json(self):
                return {}

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    assert client.fetch_html("https://starwars.fandom.com/wiki/missing") is None


def test_fetch_html_returns_none_on_connection_error(cache_dir, monkeypatch):
    def fake_get(url, timeout):
        from requests import ConnectionError

        raise ConnectionError("DNS lookup failed")

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    assert client.fetch_html("https://starwars.fandom.com/wiki/missing") is None


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


def test_fetch_html_uses_mediawiki_api(cache_dir, monkeypatch):
    captured: dict = {}

    def fake_get(url, timeout):
        captured["url"] = url

        class R:
            status_code = 200

            def raise_for_status(self):
                pass

            def json(self):
                return {"parse": {"text": {"*": "<aside>body</aside>"}}}

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    html = client.fetch_html("https://starwars.fandom.com/wiki/A_New_Hope")
    assert html == "<aside>body</aside>"
    assert "api.php?action=parse" in captured["url"]
    assert "page=A_New_Hope" in captured["url"]


def test_fetch_html_returns_none_on_malformed_json(cache_dir, monkeypatch):
    def fake_get(url, timeout):
        class R:
            def raise_for_status(self):
                pass

            def json(self):
                return {"unexpected": "shape"}

        return R()

    client = WikiClient(cache_dir=cache_dir)
    monkeypatch.setattr(client._session, "get", fake_get)
    assert client.fetch_html("https://starwars.fandom.com/wiki/X") is None


def test_verify_url_alive_cached_skips_network(cache_dir, monkeypatch):
    cache_dir.mkdir(parents=True, exist_ok=True)
    (cache_dir / "url_verified.txt").write_text(
        "https://starwars.fandom.com/wiki/A\nhttps://example.com/cover.jpg\n"
    )
    client = WikiClient(cache_dir=cache_dir)
    calls = {"n": 0}

    def fake_head(url, **kw):
        calls["n"] += 1
        raise AssertionError("should not be called")

    monkeypatch.setattr(client._session, "head", fake_head)
    assert client.verify_url_alive("https://starwars.fandom.com/wiki/A") is True
    assert client.verify_url_alive("https://example.com/cover.jpg") is True
    assert calls["n"] == 0


def test_verify_url_alive_uncached_2xx_caches(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    class R:
        status_code = 200

        def raise_for_status(self):
            pass

    monkeypatch.setattr(client._session, "head", lambda url, **kw: R())
    assert client.verify_url_alive("https://example.com/x") is True
    cached = (cache_dir / "url_verified.txt").read_text().splitlines()
    assert "https://example.com/x" in cached


def test_verify_url_alive_uncached_4xx_returns_false_no_cache(cache_dir, monkeypatch):
    client = WikiClient(cache_dir=cache_dir)

    class R:
        status_code = 404

        def raise_for_status(self):
            pass

    monkeypatch.setattr(client._session, "head", lambda url, **kw: R())
    assert client.verify_url_alive("https://example.com/dead") is False
    cache = cache_dir / "url_verified.txt"
    if cache.exists():
        assert "https://example.com/dead" not in cache.read_text()


def test_verify_url_alive_network_error_returns_false(cache_dir, monkeypatch):
    import requests
    client = WikiClient(cache_dir=cache_dir)

    def boom(url, **kw):
        raise requests.RequestException("network down")

    monkeypatch.setattr(client._session, "head", boom)
    assert client.verify_url_alive("https://example.com/timeout") is False


def test_verify_url_alive_refresh_clears_cache(cache_dir, monkeypatch):
    cache_dir.mkdir(parents=True, exist_ok=True)
    (cache_dir / "url_verified.txt").write_text("https://example.com/x\n")
    client = WikiClient(cache_dir=cache_dir, refresh=True)
    # With refresh=True, the cache file should have been deleted on init
    # so the URL is no longer considered verified without a HEAD.
    calls = {"n": 0}

    class R:
        status_code = 200

        def raise_for_status(self):
            pass

    def fake_head(url, **kw):
        calls["n"] += 1
        return R()

    monkeypatch.setattr(client._session, "head", fake_head)
    assert client.verify_url_alive("https://example.com/x") is True
    assert calls["n"] == 1
