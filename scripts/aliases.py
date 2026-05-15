"""Alias maps for normalizing author/publisher names to canonical form."""

from __future__ import annotations

import json
from pathlib import Path


class AliasError(ValueError):
    """Raised when an alias file is malformed or violates invariants."""


class AliasMap:
    def __init__(self, mapping: dict[str, str]) -> None:
        self._map = mapping

    @classmethod
    def load(cls, path: Path) -> AliasMap:
        if not path.exists():
            return cls({})
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise AliasError(f"{path}: malformed JSON: {e}") from e
        return cls._build(raw, path)

    @classmethod
    def _build(cls, raw: object, path: Path) -> AliasMap:
        if not isinstance(raw, dict):
            raise AliasError(f"{path}: top-level must be a JSON object")
        canonical_keys = set(raw.keys())
        flat: dict[str, str] = {}
        for canonical, variants in raw.items():
            if not isinstance(canonical, str) or not canonical.strip():
                raise AliasError(
                    f"{path}: empty or non-string canonical key"
                )
            if not isinstance(variants, list):
                raise AliasError(
                    f"{path}: value for '{canonical}' must be a list"
                )
            if not variants:
                raise AliasError(
                    f"{path}: empty variants list for '{canonical}'"
                )
            for variant in variants:
                if not isinstance(variant, str) or not variant.strip():
                    raise AliasError(
                        f"{path}: empty or non-string variant in '{canonical}'"
                    )
                if variant == canonical:
                    # Canonical-in-own-list is a harmless no-op.
                    continue
                if variant in canonical_keys:
                    raise AliasError(
                        f"{path}: '{variant}' is both a canonical key and a "
                        f"variant of '{canonical}' (alias chain)"
                    )
                if variant in flat and flat[variant] != canonical:
                    raise AliasError(
                        f"{path}: variant '{variant}' appears under both "
                        f"'{flat[variant]}' and '{canonical}'"
                    )
                flat[variant] = canonical
        return cls(flat)

    def apply(self, name: str) -> str:
        return self._map.get(name, name)
