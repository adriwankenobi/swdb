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
    series_number: str | int | None,
    number: str | int | None = None,
) -> str:
    """Deterministic UUIDv5 from the canonical key.

    `number` (the per-work "#" column) is appended only when it has a value.
    Issues of a mini-series are told apart by it alone, so leaving it out
    collapses them onto one id; appending it unconditionally would instead
    change the id of every work that has no "#".
    """
    parts = [
        str(era),
        slugify(series or ""),
        slugify(title),
        slugify(medium),
        slugify(str(series_number) if series_number is not None else ""),
    ]
    if number is not None and str(number).strip():
        parts.append(slugify(str(number)))
    canonical = "|".join(parts)
    return str(uuid.uuid5(_NAMESPACE, canonical))
