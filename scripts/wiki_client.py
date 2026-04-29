"""HTTP client for Wookieepedia with an on-disk cache."""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

import requests

USER_AGENT = "swdb-pipeline/0.1 (https://github.com/adriwankenobi/swdb)"
REQUEST_TIMEOUT = 30
POLITE_DELAY_SECONDS = 0.2


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
        try:
            time.sleep(POLITE_DELAY_SECONDS)
            response = self._session.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
        except requests.RequestException:
            return None
        html = response.text
        cache_path.write_text(html, encoding="utf-8")
        return html
