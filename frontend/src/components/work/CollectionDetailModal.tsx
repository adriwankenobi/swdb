import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatReleaseDate } from "@/lib/formatReleaseDate";
import { formatSeriesAndNumber } from "@/lib/formatSeriesAndNumber";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { useModalNeighbors } from "@/lib/useModalNeighbors";
import { useSwipe } from "@/lib/useSwipe";
import { ModalNavArrows } from "@/components/work/ModalNavArrows";
import type { Item } from "@/lib/buildItemsList";

function safeHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

interface CollectionDetailModalProps {
  visibleItems: Item[];
}

export function CollectionDetailModal({ visibleItems }: CollectionDetailModalProps) {
  const { openCollectionId, set } = useFilterStore();
  const collectionsById = useCatalogStore((s) => s.collectionsById);
  const worksById = useCatalogStore((s) => s.worksById);
  const collection = openCollectionId ? collectionsById.get(openCollectionId) ?? null : null;

  const openWorkId = useFilterStore((s) => s.openWorkId);
  const { hasPrev, hasNext, isOrphan, goPrev, goNext } = useModalNeighbors(
    visibleItems,
    openWorkId,
    openCollectionId,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  useSwipe(contentRef, {
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    enabled: !!collection,
  });
  useEffect(() => {
    if (!collection) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && hasPrev) { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight" && hasNext) { e.preventDefault(); goNext(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collection, hasPrev, hasNext, goPrev, goNext]);

  return (
    <Dialog
      open={!!collection}
      onOpenChange={(open) => {
        if (!open) set({ openCollectionId: null });
      }}
    >
      <DialogContent
        className="!max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden px-14"
        style={collection?.color ? { backgroundColor: collection.color } : undefined}
      >
        <ModalNavArrows
          hasPrev={hasPrev}
          hasNext={hasNext}
          isOrphan={isOrphan}
          onPrev={goPrev}
          onNext={goNext}
        />
        <div ref={contentRef} className="flex flex-col gap-4">
        {collection && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-tight break-words">{collection.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-row gap-4 md:gap-6">
              <div className="w-28 md:w-[200px] shrink-0 aspect-[2/3] overflow-hidden rounded-md bg-muted/40">
                {collection.cover_url ? (
                  <img
                    src={safeHttpUrl(collection.cover_url) ?? collection.cover_url}
                    alt=""
                    className="h-full w-full object-contain bg-muted/40"
                  />
                ) : (
                  <div
                    className="flex h-full items-center justify-center px-3 text-center text-base font-semibold leading-snug text-white text-balance line-clamp-6 break-words"
                    style={{ backgroundColor: ERA_COLORS[collection.anchor_era] }}
                  >
                    {collection.title}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                {collection.mediums.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {collection.mediums.map((m) => (
                      <Badge key={m} style={{ backgroundColor: MEDIUM_COLORS[m], color: "white" }}>{m}</Badge>
                    ))}
                  </div>
                )}
                {collection.eras.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {collection.eras.map((e) => (
                      <Badge key={e} style={{ backgroundColor: ERA_COLORS[e], color: "white" }}>{e}</Badge>
                    ))}
                  </div>
                )}
                <p className="whitespace-nowrap">
                  <span className="text-muted-foreground">Year:</span>{" "}
                  {formatYear(collection.year, collection.year_end)}
                </p>
                {collection.release_date && (
                  <p>
                    <span className="text-muted-foreground">Released:</span>{" "}
                    {formatReleaseDate(collection.release_date, collection.release_precision)}
                  </p>
                )}
                {safeHttpUrl(collection.wiki_url) && (
                  <p className="break-words">
                    <a
                      href={safeHttpUrl(collection.wiki_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-block"
                    >
                      Open on Wookieepedia →
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Includes ({collection.member_ids.length}):
              </p>
              <div className="space-y-1">
                {collection.member_ids.map((memberId) => {
                  const member = worksById.get(memberId);
                  if (!member) return null;
                  return (
                    <button
                      key={memberId}
                      type="button"
                      onClick={() => set({ openCollectionId: null, openWorkId: member.id })}
                      className="block w-full text-left text-sm hover:underline px-1 py-0.5 rounded"
                    >
                      {(() => {
                        const prefix = formatSeriesAndNumber(member);
                        if (!prefix) return member.title;
                        const hasSeries = (member.series?.length ?? 0) > 0;
                        return hasSeries
                          ? `${prefix} — ${member.title}`
                          : `${member.title} ${prefix}`;
                      })()}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
