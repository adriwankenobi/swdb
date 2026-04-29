"""Parsing for BBY/ABY year strings."""

from __future__ import annotations

import re

_YEAR_RE = re.compile(r"^\s*(?:c\.\s*)?([\d,]+)\s+(BBY|ABY)\s*$", re.IGNORECASE)


def parse_year(value: str | None) -> int | None:
    """Convert '4 ABY' -> 4, '5000 BBY' -> -5000. Returns None if unparseable."""
    if value is None:
        return None
    match = _YEAR_RE.match(str(value))
    if not match:
        return None
    digits = match.group(1).replace(",", "")
    era = match.group(2).upper()
    n = int(digits)
    return -n if era == "BBY" else n
