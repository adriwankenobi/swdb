import { useMemo } from "react";
import { useFilterStore } from "@/store/filterStore";
import { useDerivedCollections } from "@/lib/useDerivedCollections";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function CollectionsFilter() {
  const derivedCollections = useDerivedCollections();
  const { collections, toggleArrayValue } = useFilterStore();

  const facets = useMemo(() => {
    return derivedCollections
      .map((c) => ({ value: c.id, label: c.title, count: c.member_ids.length }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [derivedCollections]);

  // Nothing to filter by when signed out (no user collections) or none yet.
  if (facets.length === 0) return null;

  return (
    <FacetMultiSelect
      title="Collections"
      facets={facets}
      selected={collections}
      onToggle={(v) => toggleArrayValue("collections", v)}
    />
  );
}
