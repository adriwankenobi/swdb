"""Tests for the AliasMap class."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.aliases import AliasError, AliasMap


def _write(path: Path, data: dict | str) -> Path:
    if isinstance(data, dict):
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    else:
        path.write_text(data, encoding="utf-8")
    return path


def test_apply_returns_canonical_for_known_variant(tmp_path: Path):
    p = _write(tmp_path / "a.json", {"Haden Blackman": ["W. Haden Blackman"]})
    m = AliasMap.load(p)
    assert m.apply("W. Haden Blackman") == "Haden Blackman"


def test_apply_returns_input_for_unknown_name(tmp_path: Path):
    p = _write(tmp_path / "a.json", {"Haden Blackman": ["W. Haden Blackman"]})
    m = AliasMap.load(p)
    assert m.apply("Aaron Allston") == "Aaron Allston"


def test_load_missing_file_returns_empty_map(tmp_path: Path):
    m = AliasMap.load(tmp_path / "nope.json")
    assert m.apply("anything") == "anything"


def test_load_empty_object_returns_empty_map(tmp_path: Path):
    p = _write(tmp_path / "a.json", {})
    m = AliasMap.load(p)
    assert m.apply("anything") == "anything"


@pytest.mark.parametrize("raw,fragment", [
    ("not json at all", "malformed JSON"),
    ('["A", "B"]', "top-level must be a JSON object"),
    ('{"A": "B"}', "must be a list"),
    ('{"A": []}', "empty variants list"),
    ('{"": ["B"]}', "empty or non-string canonical"),
    ('{"A": [""]}', "empty or non-string variant"),
    ('{"A": ["  "]}', "empty or non-string variant"),
])
def test_load_rejects_malformed_input(tmp_path: Path, raw: str, fragment: str):
    p = _write(tmp_path / "bad.json", raw)
    with pytest.raises(AliasError, match=fragment):
        AliasMap.load(p)


def test_load_rejects_variant_in_two_canonicals(tmp_path: Path):
    p = _write(tmp_path / "a.json", {
        "Canonical A": ["Shared Variant"],
        "Canonical B": ["Shared Variant"],
    })
    with pytest.raises(AliasError, match="Shared Variant"):
        AliasMap.load(p)


def test_load_rejects_alias_chain(tmp_path: Path):
    # B is both a canonical key (mapping to C) AND a variant of A.
    p = _write(tmp_path / "a.json", {"A": ["B"], "B": ["C"]})
    with pytest.raises(AliasError, match="alias chain"):
        AliasMap.load(p)


def test_load_accepts_canonical_in_own_variant_list(tmp_path: Path):
    p = _write(tmp_path / "a.json", {
        "Haden Blackman": ["Haden Blackman", "W. Haden Blackman"],
    })
    m = AliasMap.load(p)
    assert m.apply("Haden Blackman") == "Haden Blackman"
    assert m.apply("W. Haden Blackman") == "Haden Blackman"
