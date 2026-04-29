from pathlib import Path

import pytest

from scripts.wiki_client import WikiClient


@pytest.fixture
def cache_dir(tmp_path: Path) -> Path:
    return tmp_path / "cache"


def test_fetch_html_caches_response(cache_dir, monkeypatch):
    calls = {"n": 0}

    def fake_get(url, headers, timeout):
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

    def fake_get(url, headers, timeout):
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
    def fake_get(url, headers, timeout):
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
