"""HTTP client for Wookieepedia with an on-disk cache."""

from __future__ import annotations

import difflib
import hashlib
import time
from pathlib import Path
from urllib.parse import unquote, urlencode

import requests

from scripts.id_utils import slugify

USER_AGENT = "swdb-pipeline/0.1 (https://github.com/adriwankenobi/swdb)"
REQUEST_TIMEOUT = 30
POLITE_DELAY_SECONDS = 0.2
OPENSEARCH_URL = "https://starwars.fandom.com/api.php"
URL_VERIFIED_FILENAME = "url_verified.txt"
# Minimum SequenceMatcher ratio to accept a non-exact opensearch match.
# Typos and small word variations (Apocalype vs Apocalypse, "Counter Attack"
# vs "Counterattack") clear this; substantially different titles ("Sphere of
# Influence" vs "Sphere of Galactic Influence" at 0.81) do not.
_FUZZY_MATCH_THRESHOLD = 0.85


class WikiClient:
    def __init__(self, *, cache_dir: Path, refresh: bool = False):
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})
        self._verified_path = self.cache_dir / URL_VERIFIED_FILENAME
        if refresh and self._verified_path.exists():
            self._verified_path.unlink()
        self._verified: set[str] = set()
        if self._verified_path.exists():
            self._verified = {
                line.strip()
                for line in self._verified_path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            }

    def _cache_path(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:32]
        return self.cache_dir / f"{digest}.html"

    def fetch_html(self, url: str) -> str | None:
        cache_path = self._cache_path(url)
        if not self.refresh and cache_path.exists():
            return cache_path.read_text(encoding="utf-8")
        # Extract article title from the wiki URL (everything after /wiki/).
        # The URL is typically already percent-encoded (em-dashes, apostrophes,
        # etc.); we must DECODE before re-encoding via urlencode below, otherwise
        # the percent signs get encoded a second time and the API rejects the
        # page name as nonexistent.
        wiki_prefix = "/wiki/"
        wiki_idx = url.find(wiki_prefix)
        if wiki_idx == -1:
            return None
        title = unquote(url[wiki_idx + len(wiki_prefix):])
        api_url = (
            "https://starwars.fandom.com/api.php?"
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
        """Return (url, source) where source is one of: 'from_excel', 'opensearch', 'unmatched'.

        Strategy when no info_url is given:
        - Run two opensearch queries: `title + series` (more specific) and
          `title` alone (broader). Pool the candidates, deduped by URL,
          preserving the order of discovery (specific query first).
        - Prefer an exact slug match of any candidate title against the work
          title — this short-circuits typo/superset hazards.
        - Otherwise take the candidate with the highest SequenceMatcher slug
          ratio above _FUZZY_MATCH_THRESHOLD. Catches typos ("Apocalype" -
          "Apocalypse"), word variants ("Counter Attack" - "Counterattack"),
          minor connectives ("Battle of" - "Battle for"), etc.
        """
        if info_url:
            return info_url, "from_excel"
        title_slug = slugify(title)
        if not title_slug:
            return None, "unmatched"
        queries: list[str] = []
        if series:
            queries.append(f"{title} {series}")
        queries.append(title)
        candidates: list[tuple[str, str]] = []
        seen_urls: set[str] = set()
        for q in queries:
            try:
                payload = self._opensearch(q)
            except requests.RequestException:
                continue
            if not payload or len(payload) < 4:
                continue
            for t, u in zip(payload[1], payload[3], strict=False):
                if u and u not in seen_urls:
                    candidates.append((t, u))
                    seen_urls.add(u)
        if not candidates:
            return None, "unmatched"
        # Exact slug match short-circuits everything (e.g. when the broader
        # title-only query surfaces the canonical page that the specific
        # query buried under more-specific results).
        for t, u in candidates:
            if slugify(t) == title_slug:
                return u, "opensearch"
        # Title is substring of matched: handles superset titles like
        # "The Sith Lords" -> "KOTOR II: The Sith Lords".
        for t, u in candidates:
            if title_slug in slugify(t):
                return u, "opensearch"
        # Best fuzzy match above threshold (typos, word variants, connectives);
        # ties broken by discovery order.
        best_url: str | None = None
        best_ratio = 0.0
        for t, u in candidates:
            ratio = difflib.SequenceMatcher(None, title_slug, slugify(t)).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_url = u
        if best_ratio >= _FUZZY_MATCH_THRESHOLD:
            return best_url, "opensearch"
        return None, "unmatched"

    def verify_url_alive(self, url: str) -> bool:
        """Verify `url` resolves; cache successful URLs to skip future checks.

        Fandom wiki pages (`*.fandom.com/wiki/...`) bot-block direct GET/HEAD
        even with a polite User-Agent — Cloudflare returns 403 intermittently.
        For those, we use the MediaWiki query API (the same endpoint
        `fetch_html` uses successfully) to check page existence. Other URLs
        (e.g. `static.wikia.nocookie.net` covers) use plain HEAD.

        Returns True on 2xx / page-exists, False on 4xx/5xx / missing /
        network error. Failures are NOT cached so the next scrape retries.
        """
        if not url:
            return False
        if url in self._verified:
            return True
        if _is_fandom_wiki_url(url):
            alive = self._verify_fandom_via_api(url)
        else:
            alive = self._verify_via_head(url)
        if alive:
            self._verified.add(url)
            with self._verified_path.open("a", encoding="utf-8") as f:
                f.write(url + "\n")
        return alive

    def _verify_via_head(self, url: str) -> bool:
        try:
            time.sleep(POLITE_DELAY_SECONDS)
            response = self._session.head(
                url, allow_redirects=True, timeout=10
            )
        except requests.RequestException:
            return False
        return 200 <= response.status_code < 300

    def _verify_fandom_via_api(self, url: str) -> bool:
        """Check page existence via MediaWiki query API.

        For URL `https://starwars.fandom.com/wiki/Eruption`, calls
        `https://starwars.fandom.com/api.php?action=query&titles=Eruption&...`
        and inspects the response. Missing pages have a "-1" key in
        `query.pages`; existing pages have a positive pageid.
        """
        wiki_idx = url.find("/wiki/")
        if wiki_idx == -1:
            return False
        title = unquote(url[wiki_idx + len("/wiki/"):])
        api_url = (
            url[:wiki_idx]
            + "/api.php?"
            + urlencode({
                "action": "query",
                "titles": title,
                "format": "json",
                "redirects": "true",
            })
        )
        try:
            time.sleep(POLITE_DELAY_SECONDS)
            response = self._session.get(api_url, timeout=10)
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError):
            return False
        pages = data.get("query", {}).get("pages", {})
        # "-1" indicates a missing page; any other key has a real pageid.
        return any(key != "-1" for key in pages.keys())


def _is_fandom_wiki_url(url: str) -> bool:
    return ".fandom.com/wiki/" in url
