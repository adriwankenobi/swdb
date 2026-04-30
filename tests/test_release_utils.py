from scripts.release_utils import parse_excel_release


def test_parses_full_date():
    assert parse_excel_release("2009.12.08") == ("2009-12-08", "day")


def test_parses_year_month():
    assert parse_excel_release("1996.11") == ("1996-11-01", "month")


def test_parses_year_only():
    assert parse_excel_release("1996") == ("1996-01-01", "year")


def test_handles_whitespace():
    assert parse_excel_release("  2009.12.08  ") == ("2009-12-08", "day")


def test_returns_none_on_empty():
    assert parse_excel_release(None) is None
    assert parse_excel_release("") is None
    assert parse_excel_release("   ") is None


def test_returns_none_on_malformed():
    assert parse_excel_release("not a date") is None
    assert parse_excel_release("2009-12-08") is None  # wrong separator
    assert parse_excel_release("2009.13.01") is None  # invalid month
    assert parse_excel_release("2009.12.32") is None  # invalid day
    assert parse_excel_release("2009.12.08.05") is None  # too many parts
