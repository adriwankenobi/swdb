import { Button } from "@/components/ui/button";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore, type Ownership } from "@/store/filterStore";
import { useUserStore } from "@/store/userStore";

const OPTIONS: { value: Ownership; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "unowned", label: "Unowned" },
];

export function OwnershipFilter() {
  const session = useUserStore((s) => s.session);
  const ownedIds = useUserStore((s) => s.ownedIds);
  const worksById = useCatalogStore((s) => s.worksById);
  const ownership = useFilterStore((s) => s.ownership);
  const items = useFilterStore((s) => s.items);
  const set = useFilterStore((s) => s.set);
  if (!session) return null;
  // In collections mode everything shown is owned, so the filter is meaningless.
  if (items === "collections") return null;

  // Percentages over the whole catalog, using the same notion of "owned" as the
  // filter itself (membership in ownedIds), intersected with the loaded catalog.
  const total = worksById.size;
  let ownedCount = 0;
  for (const id of ownedIds) if (worksById.has(id)) ownedCount += 1;
  const ownedPct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;
  const pctFor = (value: Ownership): string | null => {
    if (value === "owned") return `${ownedPct}%`;
    if (value === "unowned") return `${100 - ownedPct}%`;
    return null;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Ownership</h3>
      <div className="flex gap-1">
        {OPTIONS.map((o) => {
          const pct = pctFor(o.value);
          return (
            <Button
              key={o.value}
              size="sm"
              variant={ownership === o.value ? "default" : "ghost"}
              onClick={() => set({ ownership: o.value })}
              className="px-2.5 text-xs"
            >
              {o.label}
              {pct && <span className="ml-1 opacity-70">{pct}</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
