"""ID and slug helpers for the pipeline."""

from __future__ import annotations

import re
import unicodedata
import uuid

# Fixed namespace UUID. Do not change this value; IDs depend on it.
_NAMESPACE = uuid.UUID("a3f8c4e2-7d1b-4f9a-8e6c-2b5d9e0f1a3c")

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    """Lowercase, transliterate to ASCII, strip punctuation, collapse separators."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return _SLUG_RE.sub("-", ascii_text.lower()).strip("-")


def make_id(
    *,
    era: int,
    series: str | None,
    title: str,
    medium: str,
    number: str | int | None,
) -> str:
    """Deterministic UUIDv5 from the canonical key."""
    parts = [
        str(era),
        slugify(series or ""),
        slugify(title),
        slugify(medium),
        slugify(str(number) if number is not None else ""),
    ]
    canonical = "|".join(parts)
    return str(uuid.uuid5(_NAMESPACE, canonical))
