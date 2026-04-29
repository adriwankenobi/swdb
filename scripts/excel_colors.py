"""Resolve Excel theme+tint cell fills to '#RRGGBB' hex strings."""

from __future__ import annotations

import colorsys


def apply_tint(rgb_hex: str, tint: float) -> str:
    """Apply Microsoft's HLS-tint formula to an RGB hex string.

    `rgb_hex` is six hex characters with no leading '#'. `tint` is in [-1, 1].
    Returns six uppercase hex characters with no leading '#'.
    """
    r = int(rgb_hex[0:2], 16) / 255.0
    g = int(rgb_hex[2:4], 16) / 255.0
    b = int(rgb_hex[4:6], 16) / 255.0
    h, lum, s = colorsys.rgb_to_hls(r, g, b)
    if tint < 0:
        lum = lum * (1 + tint)
    elif tint > 0:
        lum = lum * (1 - tint) + tint
    lum = max(0.0, min(1.0, lum))
    r2, g2, b2 = colorsys.hls_to_rgb(h, lum, s)
    return f"{round(r2 * 255):02X}{round(g2 * 255):02X}{round(b2 * 255):02X}"
