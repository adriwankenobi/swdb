from scripts.year_utils import parse_year


def test_parse_year_aby_positive():
    assert parse_year("0 ABY") == 0
    assert parse_year("4 ABY") == 4
    assert parse_year("140 ABY") == 140


def test_parse_year_bby_negative():
    assert parse_year("19 BBY") == -19
    assert parse_year("5000 BBY") == -5000
    assert parse_year("25793 BBY") == -25793


def test_parse_year_handles_extra_whitespace():
    assert parse_year("  4   ABY  ") == 4


def test_parse_year_case_insensitive():
    assert parse_year("4 aby") == 4
    assert parse_year("19 bby") == -19


def test_parse_year_returns_none_on_invalid():
    assert parse_year("") is None
    assert parse_year(None) is None
    assert parse_year("Unknown") is None
    assert parse_year("4") is None  # missing era suffix


def test_parse_year_circa_prefix_ignored():
    # Wookieepedia sometimes writes "c. 25,793 BBY"; we accept the comma and the c.
    assert parse_year("c. 25,793 BBY") == -25793
    assert parse_year("c. 4 ABY") == 4
