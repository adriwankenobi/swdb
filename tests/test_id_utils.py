import uuid

from scripts.id_utils import make_id, slugify


def test_slugify_lowercases_and_replaces_spaces():
    assert slugify("A New Hope") == "a-new-hope"


def test_slugify_strips_punctuation():
    assert slugify("Tales of the Jedi: The Sith War") == "tales-of-the-jedi-the-sith-war"


def test_slugify_collapses_multiple_separators():
    assert slugify("  Star   Wars--Episode  ") == "star-wars-episode"


def test_slugify_preserves_digits_and_roman_numerals():
    assert slugify("Star Wars Episode IV") == "star-wars-episode-iv"


def test_slugify_handles_empty_string():
    assert slugify("") == ""


def test_make_id_is_deterministic_for_same_inputs():
    a = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Novel", number="IV")
    b = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Novel", number="IV")
    assert a == b


def test_make_id_differs_when_medium_differs():
    a = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Novel", number="IV")
    b = make_id(era=5, series="Star Wars Episode", title="A New Hope", medium="Movie", number="IV")
    assert a != b


def test_make_id_handles_missing_optional_inputs():
    a = make_id(era=4, series=None, title="Hammer", medium="Short Story", number=None)
    # Stable across calls
    b = make_id(era=4, series=None, title="Hammer", medium="Short Story", number=None)
    assert a == b


def test_make_id_returns_uuid_string():
    result = make_id(
        era=0, series="Dawn of the Jedi", title="Eruption", medium="Short Story", number=None
    )
    parsed = uuid.UUID(result)
    assert parsed.version == 5


def test_slugify_transliterates_diacritics_to_ascii():
    assert slugify("Le côté obscur") == "le-cote-obscur"


def test_slugify_is_stable_across_unicode_normalization_forms():
    import unicodedata
    nfc = unicodedata.normalize("NFC", "côté")
    nfd = unicodedata.normalize("NFD", "côté")
    assert nfc != nfd  # sanity: the two forms are byte-different
    assert slugify(nfc) == slugify(nfd) == "cote"


def test_make_id_pinned_canonical_value():
    # Locks the canonical-key format. If you change the namespace UUID, the
    # field order, or the slug-of-each-field separator, this test will fail
    # and you must consciously update the expected value.
    result = make_id(
        era=5,
        series="Star Wars Episode",
        title="A New Hope",
        medium="Novel",
        number="IV",
    )
    assert result == "34a13f75-b121-5c91-b435-f765f951e4a5"
