"""HTTP client for Wookieepedia with an on-disk cache."""

from __future__ import annotations

import hashlib
import time
from pathlib import Path
from urllib.parse import urlencode

import requests

from scripts.id_utils import slugify

USER_AGENT = "swdb-pipeline/0.1 (https://github.com/adriwankenobi/swdb)"
REQUEST_TIMEOUT = 30
POLITE_DELAY_SECONDS = 0.2
OPENSEARCH_URL = "https://starwars.fandom.com/api.php"


class WikiClient:
    def __init__(self, *, cache_dir: Path, refresh: bool = False):
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})

    def _cache_path(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:32]
        return self.cache_dir / f"{digest}.html"

    def fetch_html(self, url: str) -> str | None:
        cache_path = self._cache_path(url)
        if not self.refresh and cache_path.exists():
            return cache_path.read_text(encoding="utf-8")
        # Extract article title from the wiki URL (everything after /wiki/)
        wiki_prefix = "/wiki/"
        wiki_idx = url.find(wiki_prefix)
        if wiki_idx == -1:
            return None
        title = url[wiki_idx + len(wiki_prefix):]
        api_url = (
            f"https://starwars.fandom.com/api.php?"
            + urlencode({
                "action": "parse",
                "page": title,
                "prop": "text",
                "format": "json",
                "redirects": "true",
            })
        )
        try:
            time.sleep(POLITE_DELAY_SECONDS)
            response = self._session.get(api_url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            data = response.json()
            html = data["parse"]["text"]["*"]
        except requests.RequestException:
            return None
        except (KeyError, TypeError, ValueError):
            return None
        cache_path.write_text(html, encoding="utf-8")
        return html

    def _opensearch(self, query: str) -> list:
        params = {
            "action": "opensearch",
            "search": query,
            "limit": "5",
            "namespace": "0",
            "format": "json",
        }
        time.sleep(POLITE_DELAY_SECONDS)
        response = self._session.get(
            f"{OPENSEARCH_URL}?{urlencode(params)}", timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        return response.json()

    def resolve_url(
        self, *, info_url: str | None, title: str, series: str | None
    ) -> tuple[str | None, str]:
        """Return (url, source) where source is one of: 'from_excel', 'opensearch', 'unmatched'."""
        if info_url:
            return info_url, "from_excel"
        query = f"{title} {series}" if series else title
        try:
            payload = self._opensearch(query)
        except requests.RequestException:
            return None, "unmatched"
        if not payload or len(payload) < 4:
            return None, "unmatched"
        titles = payload[1]
        urls = payload[3]
        if not titles or not urls:
            return None, "unmatched"
        title_slug = slugify(title)
        for matched_title, matched_url in zip(titles, urls, strict=False):
            if title_slug and title_slug in slugify(matched_title):
                return matched_url, "opensearch"
        return None, "unmatched"
