from scripts.year_utils import parse_year_range


def test_single_aby_positive():
    assert parse_year_range("0 ABY") == (0, 0)
    assert parse_year_range("4 ABY") == (4, 4)
    assert parse_year_range("140 ABY") == (140, 140)


def test_single_bby_negative():
    assert parse_year_range("19 BBY") == (-19, -19)
    assert parse_year_range("5000 BBY") == (-5000, -5000)
    assert parse_year_range("25793 BBY") == (-25793, -25793)


def test_handles_extra_whitespace():
    assert parse_year_range("  4   ABY  ") == (4, 4)


def test_case_insensitive():
    assert parse_year_range("4 aby") == (4, 4)
    assert parse_year_range("19 bby") == (-19, -19)


def test_returns_none_on_invalid():
    assert parse_year_range("") is None
    assert parse_year_range(None) is None
    assert parse_year_range("Unknown") is None
    assert parse_year_range("4") is None  # missing era suffix


def test_circa_prefix_and_commas():
    assert parse_year_range("c. 25,793 BBY") == (-25793, -25793)
    assert parse_year_range("c. 4 ABY") == (4, 4)


def test_range_shared_suffix():
    assert parse_year_range("5000 - 3000 BBY") == (-5000, -3000)
    assert parse_year_range("3 - 0 BBY") == (-3, 0)
    assert parse_year_range("67 - 32 BBY") == (-67, -32)


def test_range_shared_suffix_aby():
    assert parse_year_range("4 - 25 ABY") == (4, 25)


def test_range_per_endpoint_suffix():
    assert parse_year_range("5000 BBY - 4 ABY") == (-5000, 4)
    assert parse_year_range("19 BBY - 0 ABY") == (-19, 0)


def test_range_with_circa_and_commas():
    assert parse_year_range("c. 25,200 - 671 BBY") == (-25200, -671)


def test_malformed_range_returns_none():
    assert parse_year_range("5000 -") is None
    assert parse_year_range("- 3000 BBY") is None
    assert parse_year_range("5000 - 3000") is None  # no era anywhere
