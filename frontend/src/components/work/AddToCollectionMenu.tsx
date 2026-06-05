import { useState } from "react";
import { PlusIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserStore } from "@/store/userStore";
import { useEditorStore } from "@/store/editorStore";
import { useFilterStore } from "@/store/filterStore";

/** Inline (non-popover) "add to collection" control for the work modal.
 *  Rendered inline rather than in a Popover because this lives inside the
 *  work-detail Dialog, and a nested portaled popover doesn't render reliably
 *  under the dialog's focus trap. */
export function AddToCollectionMenu({ workId }: { workId: string }) {
  const session = useUserStore((s) => s.session);
  const collections = useUserStore((s) => s.collections);
  const setCollectionMembers = useUserStore((s) => s.setCollectionMembers);
  const [open, setOpen] = useState(false);

  if (!session) return null;

  function toggle(collectionId: string, member_ids: string[]) {
    const next = member_ids.includes(workId)
      ? member_ids.filter((id) => id !== workId)
      : [...member_ids, workId];
    void setCollectionMembers(collectionId, next);
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="px-0" onClick={() => setOpen((o) => !o)}>
        <PlusIcon className="size-4" />
        <span className="ml-1">Add to collection</span>
        <ChevronDownIcon className={`ml-1 size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div className="mt-1 space-y-1 rounded-md border p-2">
          {collections.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">No collections yet.</p>
          )}
          {collections.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={c.member_ids.includes(workId)}
                onCheckedChange={() => toggle(c.id, c.member_ids)}
              />
              <span className="truncate">
                {c.title}
                {c.number != null && (
                  <span className="ml-1 text-muted-foreground">#{c.number}</span>
                )}
              </span>
            </label>
          ))}
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-1 border-t pt-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              // Close the work modal first, then open the editor seeded with this work.
              useFilterStore.getState().set({ openWorkId: null });
              useEditorStore.getState().openNew(workId);
            }}
          >
            <PlusIcon className="size-4" /> New collection…
          </button>
        </div>
      )}
    </div>
  );
}
