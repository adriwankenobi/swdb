import { useMemo } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/userStore";
import { useFilterStore } from "@/store/filterStore";

/** A checkbox-looking "owned" toggle for a work. Rendered only when signed in.
 *  It is an accessible `role="checkbox"` span (NOT the <Checkbox> button
 *  component) so it can live inside the WorkCard's outer <button> without
 *  nesting a button. Stops propagation so toggling never opens the modal.
 *
 *  - Hidden entirely in collections mode (everything shown there is owned).
 *  - Disabled (greyed, checked, non-interactive) when the work belongs to one
 *    of the user's collections — collection membership implies ownership. */
export function OwnedCheckbox({
  workId,
  showLabel = true,
}: {
  workId: string;
  showLabel?: boolean;
}) {
  const session = useUserStore((s) => s.session);
  const isOwned = useUserStore((s) => s.ownedIds.has(workId));
  const toggleOwned = useUserStore((s) => s.toggleOwned);
  const collections = useUserStore((s) => s.collections);
  const items = useFilterStore((s) => s.items);

  const inCollection = useMemo(
    () => collections.some((c) => c.member_ids.includes(workId)),
    [collections, workId],
  );

  if (!session) return null;
  // In collections mode every shown work is owned — the toggle is noise.
  if (items === "collections") return null;

  // A collection member is always owned and cannot be un-owned here.
  if (inCollection) {
    return (
      <span
        role="checkbox"
        aria-checked
        aria-disabled
        aria-label="Owned (in a collection)"
        title="In a collection — always owned"
        className="inline-flex cursor-not-allowed items-center gap-1.5 text-xs text-muted-foreground opacity-50"
      >
        <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-primary bg-primary text-primary-foreground">
          <CheckIcon className="size-3" />
        </span>
        {showLabel && "Owned"}
      </span>
    );
  }

  return (
    <span
      role="checkbox"
      aria-checked={isOwned}
      aria-label={isOwned ? "Owned — click to unmark" : "Mark as owned"}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        void toggleOwned(workId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          void toggleOwned(workId);
        }
      }}
      className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          isOwned
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input",
        )}
      >
        {isOwned && <CheckIcon className="size-3" />}
      </span>
      {showLabel && "Owned"}
    </span>
  );
}
