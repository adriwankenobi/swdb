import pytest

from scripts.excel_colors import apply_tint


def test_apply_tint_zero_returns_input():
    assert apply_tint("FF8800", 0.0) == "FF8800"


def test_apply_tint_positive_lightens():
    out = apply_tint("FF0000", 0.5)
    r, g, b = int(out[0:2], 16), int(out[2:4], 16), int(out[4:6], 16)
    assert r == 255
    assert g > 0
    assert b > 0


def test_apply_tint_negative_darkens():
    out = apply_tint("808080", -0.5)
    r = int(out[0:2], 16)
    assert 60 <= r <= 70


def test_apply_tint_pinned_workbook_combos():
    # Regression pins for the three theme+tint pairs the workbook actually uses.
    # Computed once via Microsoft's HLS-tint formula; lock them down so future
    # refactors of the formula are caught.
    assert apply_tint("FBBC04", 0.8) == "FEF2CD"  # accent3 yellow, light tint
    assert apply_tint("EA4335", 0.6) == "F7B4AE"  # accent2 red, mid tint
    assert apply_tint("46BDC6", 0.8) == "DAF2F4"  # accent6 teal, light tint
