import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { FacetMultiSelect } from "./_FacetMultiSelect";

export function AuthorFilter() {
  const facets = useCatalogStore((s) => s.facets.authors);
  const { authors, toggleArrayValue } = useFilterStore();
  return (
    <FacetMultiSelect
      title="Author"
      facets={facets}
      selected={authors}
      onToggle={(v) => toggleArrayValue("authors", v)}
    />
  );
}
