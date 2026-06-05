import { Button } from "@/components/ui/button";
import { useFilterStore, type Ownership } from "@/store/filterStore";
import { useUserStore } from "@/store/userStore";

const OPTIONS: { value: Ownership; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "unowned", label: "Unowned" },
];

export function OwnershipFilter() {
  const session = useUserStore((s) => s.session);
  const ownership = useFilterStore((s) => s.ownership);
  const items = useFilterStore((s) => s.items);
  const set = useFilterStore((s) => s.set);
  if (!session) return null;
  // In collections mode everything shown is owned, so the filter is meaningless.
  if (items === "collections") return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Ownership</h3>
      <div className="flex gap-1">
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            size="sm"
            variant={ownership === o.value ? "default" : "ghost"}
            onClick={() => set({ ownership: o.value })}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
