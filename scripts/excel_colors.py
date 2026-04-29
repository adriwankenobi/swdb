"""Resolve Excel theme+tint cell fills to '#RRGGBB' hex strings."""

from __future__ import annotations

import colorsys
import xml.etree.ElementTree as ET

_NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}

# XML order of <a:clrScheme> children. openpyxl's `theme` index swaps the
# first two pairs (lt1<->dk1, lt2<->dk2).
_CLR_SCHEME_ORDER = (
    "dk1", "lt1", "dk2", "lt2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink",
)


def _extract_color(child: ET.Element) -> str:
    srgb = child.find("a:srgbClr", _NS)
    if srgb is not None:
        return srgb.attrib["val"].upper()
    sys_clr = child.find("a:sysClr", _NS)
    if sys_clr is not None:
        return sys_clr.attrib["lastClr"].upper()
    raise ValueError(f"unsupported color element under {child.tag!r}")


def parse_theme_colors(theme_xml: bytes) -> list[str]:
    """Return the 12 theme colors in openpyxl `theme`-index order.

    openpyxl swaps lt1<->dk1 and lt2<->dk2 vs the raw XML order.
    """
    root = ET.fromstring(theme_xml)
    scheme = root.find(".//a:clrScheme", _NS)
    if scheme is None:
        raise ValueError("theme XML missing <a:clrScheme>")
    by_name: dict[str, str] = {}
    for child in scheme:
        local = child.tag.split("}", 1)[1] if "}" in child.tag else child.tag
        if local in _CLR_SCHEME_ORDER:
            by_name[local] = _extract_color(child)
    ordered = [by_name[name] for name in _CLR_SCHEME_ORDER]
    ordered[0], ordered[1] = ordered[1], ordered[0]
    ordered[2], ordered[3] = ordered[3], ordered[2]
    return ordered


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
