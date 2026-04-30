"""Parse the Excel RELEASE column string format used by Star Wars EU.xlsx."""

from __future__ import annotations

from datetime import date


def parse_excel_release(text: str | None) -> tuple[str, str] | None:
    """Parse `"YYYY"`, `"YYYY.MM"`, or `"YYYY.MM.DD"` -> (iso_date, precision).

    The ISO date always has shape YYYY-MM-DD; for month precision DD=01,
    for year precision MM=01 and DD=01. Returns None for empty/malformed
    input. Mirrors `excel_writer._format_release` so values round-trip.
    """
    if text is None:
        return None
    cleaned = text.strip()
    if not cleaned:
        return None
    parts = cleaned.split(".")
    if not all(p.isdigit() for p in parts):
        return None
    try:
        if len(parts) == 1:
            y = int(parts[0])
            date(y, 1, 1)  # validate
            return f"{y:04d}-01-01", "year"
        if len(parts) == 2:
            y, m = int(parts[0]), int(parts[1])
            date(y, m, 1)  # validate
            return f"{y:04d}-{m:02d}-01", "month"
        if len(parts) == 3:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            date(y, m, d)  # validate
            return f"{y:04d}-{m:02d}-{d:02d}", "day"
    except ValueError:
        return None
    return None
