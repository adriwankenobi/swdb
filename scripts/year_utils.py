"""Parsing for BBY/ABY year strings, including ranges."""

from __future__ import annotations

import re

# An endpoint that always carries its own era suffix.
_WITH_ERA = re.compile(r"^\s*(?:c\.\s*)?([\d,]+)\s+(BBY|ABY)\s*$", re.IGNORECASE)
# A bare endpoint (digits with optional `c.` and commas, no era).
_BARE = re.compile(r"^\s*(?:c\.\s*)?([\d,]+)\s*$")
# A bare endpoint followed by a trailing era (used to peel off a shared suffix).
_BARE_WITH_TRAILING_ERA = re.compile(
    r"^\s*(?:c\.\s*)?([\d,]+)\s+(BBY|ABY)\s*$", re.IGNORECASE
)


def _signed(digits: str, era: str) -> int:
    n = int(digits.replace(",", ""))
    return -n if era.upper() == "BBY" else n


def _parse_endpoint(token: str, fallback_era: str | None) -> int | None:
    """Parse one endpoint. If it lacks an era, fall back to fallback_era."""
    m = _WITH_ERA.match(token)
    if m:
        return _signed(m.group(1), m.group(2))
    if fallback_era is None:
        return None
    m = _BARE.match(token)
    if not m:
        return None
    return _signed(m.group(1), fallback_era)


def parse_year_range(value: str | None) -> tuple[int, int] | None:
    """Convert a year cell to (start, end).

    - "5000 BBY" -> (-5000, -5000)
    - "5000 - 3000 BBY" -> (-5000, -3000)  (single shared suffix)
    - "5000 BBY - 4 ABY" -> (-5000, 4)     (per-endpoint suffix)
    - "c. 25,200 - 671 BBY" -> (-25200, -671)
    Returns None if unparseable.
    """
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    # Single endpoint, no dash.
    if "-" not in s:
        m = _WITH_ERA.match(s)
        if not m:
            return None
        v = _signed(m.group(1), m.group(2))
        return (v, v)
    # Range. Split on the first dash; each side is independently a "left token"
    # (bare or with era) and a "right token" (bare or with era). When the right
    # side carries the only era, treat it as a shared trailing suffix.
    left, _, right = s.partition("-")
    left, right = left.strip(), right.strip()
    if not left or not right:
        return None
    right_with_era = _BARE_WITH_TRAILING_ERA.match(right)
    left_with_era = _WITH_ERA.match(left)
    if left_with_era and right_with_era:
        # Both labeled: "5000 BBY - 4 ABY"
        start = _signed(left_with_era.group(1), left_with_era.group(2))
        end = _signed(right_with_era.group(1), right_with_era.group(2))
        return (start, end)
    if right_with_era and not left_with_era:
        # Shared trailing suffix: "5000 - 3000 BBY" -> left bare, right has era
        shared = right_with_era.group(2)
        start = _parse_endpoint(left, fallback_era=shared)
        end = _signed(right_with_era.group(1), shared)
        if start is None:
            return None
        return (start, end)
    if left_with_era and not right_with_era:
        # Mirror: "5000 BBY - 3000" — apply left's era to bare right.
        shared = left_with_era.group(2)
        start = _signed(left_with_era.group(1), shared)
        end = _parse_endpoint(right, fallback_era=shared)
        if end is None:
            return None
        return (start, end)
    return None
