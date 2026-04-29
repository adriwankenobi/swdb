"""Extract structured fields from a Wookieepedia article's infobox."""

from __future__ import annotations

import re
from datetime import datetime

from bs4 import BeautifulSoup, Tag

# Maps the human-readable infobox label (lowercased) to our output key.
# The in-universe year is intentionally NOT extracted here — it comes from
# the Excel YEAR column only (see spec §4.4).
_LABEL_MAP: dict[str, str] = {
    "author": "authors",
    "author(s)": "authors",
    "publisher": "publisher",
    "publication date": "release_date",
    "release date": "release_date",
    "released": "release_date",
}

_DATE_FORMATS = (
    "%B %d , %Y",  # November 12 , 1976  (Fandom API adds spaces around comma)
    "%B %d, %Y",  # November 12, 1976
    "%b %d, %Y",  # Nov 12, 1976
    "%d %B %Y",  # 12 November 1976
    "%Y-%m-%d",
    "%Y",
)


def _normalize_text(node: Tag) -> str:
    return " ".join(node.get_text(" ", strip=True).split())


def _split_authors(text: str) -> list[str]:
    # Strip ghost-writer parentheticals: "Alan Dean Foster (as George Lucas)"
    text = re.sub(r"\s*\([^)]*\)", "", text)
    # Wookieepedia separates multiple authors with commas, semicolons, "and", or "/".
    parts = re.split(r"\s*(?:,|;|\band\b|/)\s*", text)
    return [p.strip() for p in parts if p.strip()]


def _parse_date(text: str) -> str | None:
    # Take only the first parenthesis-free segment (e.g. "November 12 , 1976 (Paperback)")
    cleaned = text.strip().split("(")[0].strip()
    # Normalise spaces around comma: "November 12 , 1976" -> "November 12, 1976"
    # (but keep the spaced variant in _DATE_FORMATS too, for safety)
    cleaned_tight = re.sub(r"\s*,\s*", ", ", cleaned)
    for candidate in (cleaned, cleaned_tight):
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(candidate, fmt).date().isoformat()
            except ValueError:
                continue
    # Fallback: pull a 4-digit year.
    match = re.search(r"\b(19|20)\d{2}\b", cleaned)
    if match:
        return f"{match.group(0)}-01-01"
    return None


def _parse_cover_url(soup: BeautifulSoup) -> str | None:
    aside = soup.select_one("aside.portable-infobox")
    if not aside:
        return None
    # Fandom API renders the cover as <img class="pi-image-thumbnail"> directly.
    # The full-page HTML may nest it under <figure class="pi-image">.
    img = aside.select_one("figure.pi-image img") or aside.select_one(".pi-image-thumbnail")
    if not img:
        return None
    src = img.get("src") or img.get("data-src")
    if not src:
        return None
    src = str(src)
    # Strip scaling query strings; keep the path up to (not including) /scale-to-width-down/
    src = re.sub(r"/revision/latest/scale-to-width-down/[^?]+", "/revision/latest", src)
    src = src.split("?")[0]
    return src


def parse_infobox(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    aside = soup.select_one("aside.portable-infobox")
    if not aside:
        return {}
    out: dict = {}
    for item in aside.select(".pi-item.pi-data"):
        label_node = item.select_one(".pi-data-label")
        value_node = item.select_one(".pi-data-value")
        if not label_node or not value_node:
            continue
        label = _normalize_text(label_node).lower().rstrip(":")
        key = _LABEL_MAP.get(label)
        if not key:
            continue
        text = _normalize_text(value_node)
        if not text:
            continue
        if key == "authors":
            out["authors"] = _split_authors(text)
        elif key == "release_date":
            iso = _parse_date(text)
            if iso:
                out["release_date"] = iso
        else:
            out[key] = text
    cover = _parse_cover_url(soup)
    if cover:
        out["cover_url"] = cover
    return out
