import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ERA_COLORS } from "@/constants/eras";
import { MEDIUM_COLORS } from "@/constants/mediums";
import { formatYear } from "@/lib/formatYear";
import { formatReleaseDate } from "@/lib/formatReleaseDate";
import { resolveWorkCover } from "@/lib/resolveWorkCover";
import { useWorkCoverFallback } from "@/lib/useWorkCoverFallback";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { useUserStore } from "@/store/userStore";
import { useModalNeighbors } from "@/lib/useModalNeighbors";
import { useSwipe } from "@/lib/useSwipe";
import { ModalNavArrows } from "@/components/work/ModalNavArrows";
import { OwnedCheckbox } from "@/components/work/OwnedCheckbox";
import { AddToCollectionMenu } from "@/components/work/AddToCollectionMenu";
import { useDerivedCollections } from "@/lib/useDerivedCollections";
import type { Item } from "@/lib/buildItemsList";

function safeHttpUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

interface WorkDetailModalProps {
  visibleItems: Item[];
}

export function WorkDetailModal({ visibleItems }: WorkDetailModalProps) {
  const { openWorkId, set, toggleArrayValue } = useFilterStore();
  const works = useCatalogStore((s) => s.works);
  const coverByWorkId = useWorkCoverFallback();
  const work = openWorkId ? works.find((w) => w.id === openWorkId) : null;
  const isOwned = useUserStore((s) => (work ? s.ownedIds.has(work.id) : false));
  const openCollectionId = useFilterStore((s) => s.openCollectionId);
  const { hasPrev, hasNext, isOrphan, goPrev, goNext } = useModalNeighbors(
    visibleItems,
    openWorkId,
    openCollectionId,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  useSwipe(contentRef, {
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    enabled: !!work,
  });
  useEffect(() => {
    if (!work) return;
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
  }, [work, hasPrev, hasNext, goPrev, goNext]);
  // The user's collections that contain this work (not the baked
  // works.json collection_ids — those are removed in Phase 3c).
  const derivedCollections = useDerivedCollections();
  const collections = work
    ? derivedCollections.filter((c) => c.member_ids.includes(work.id))
    : [];

  function closeModal() {
    set({ openWorkId: null });
  }

  return (
    <Dialog
      open={!!work}
      onOpenChange={(open) => {
        if (!open) set({ openWorkId: null });
      }}
    >
      <DialogContent
        className="!max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden px-14"
        style={isOwned ? { backgroundColor: "var(--owned-bg)" } : undefined}
      >
        <ModalNavArrows
          hasPrev={hasPrev}
          hasNext={hasNext}
          isOrphan={isOrphan}
          onPrev={goPrev}
          onNext={goNext}
        />
        <div ref={contentRef} className="flex flex-col gap-4">
        {work && (
          <>
            <DialogHeader>
              <DialogTitle className="leading-tight break-words">{work.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-row gap-4 md:gap-6">
              <div className="w-28 md:w-[200px] shrink-0 aspect-[2/3] overflow-hidden rounded-md bg-muted/40">
                {(() => {
                  const cover = resolveWorkCover(work, coverByWorkId);
                  if (!cover.src) {
                    return (
                      <div
                        className="flex h-full items-center justify-center px-3 text-center text-base font-semibold leading-snug text-white text-balance line-clamp-6 break-words"
                        style={{ backgroundColor: ERA_COLORS[work.era] }}
                      >
                        {work.title}
                      </div>
                    );
                  }
                  const safeCover = safeHttpUrl(cover.src);
                  const imgClass = `h-full w-full object-contain bg-muted/40 ${cover.borrowed ? "opacity-70 saturate-50" : ""}`;
                  return <img src={safeCover ?? cover.src} alt="" className={imgClass} />;
                })()}
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                {work.series && work.series.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 font-medium break-words">
                    {work.series.map((s, i) => {
                      const n = work.number?.[i];
                      const label = !n
                        ? s
                        : work.medium === "TV Show"
                          ? `${s} ${n}`
                          : `${s} #${n}`;
                      return <span key={s}>{label}</span>;
                    })}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge style={{ backgroundColor: MEDIUM_COLORS[work.medium], color: "white" }}>{work.medium}</Badge>
                  <Badge style={{ backgroundColor: ERA_COLORS[work.era], color: "white" }}>
                    {work.era}
                  </Badge>
                </div>
                <p className="whitespace-nowrap">
                  <span className="text-muted-foreground">Year:</span>{" "}
                  {formatYear(work.year, work.year_end)}
                </p>
                {work.release_date && (
                  <p>
                    <span className="text-muted-foreground">Released:</span>{" "}
                    {formatReleaseDate(work.release_date, work.release_precision)}
                  </p>
                )}
                {work.authors && work.authors.length > 0 && (
                  <p className="break-words">
                    <span className="text-muted-foreground">Authors:</span>{" "}
                    {work.authors.map((author, i) => (
                      <span key={author}>
                        {i > 0 && ", "}
                        <button
                          type="button"
                          className="cursor-pointer hover:underline"
                          onClick={() => { toggleArrayValue("authors", author); closeModal(); }}
                        >
                          {author}
                        </button>
                      </span>
                    ))}
                  </p>
                )}
                {work.publisher && (
                  <p className="break-words">
                    <span className="text-muted-foreground">Publisher:</span>{" "}
                    <button
                      type="button"
                      className="cursor-pointer hover:underline"
                      onClick={() => { toggleArrayValue("publishers", work.publisher!); closeModal(); }}
                    >
                      {work.publisher}
                    </button>
                  </p>
                )}
                {safeHttpUrl(work.wiki_url) && (
                  <p className="break-words">
                    <a
                      href={safeHttpUrl(work.wiki_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-block"
                    >
                      Open on Wookieepedia →
                    </a>
                  </p>
                )}
                <OwnedCheckbox workId={work.id} />
                <AddToCollectionMenu workId={work.id} />
              </div>
            </div>
            {collections.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  {collections.length === 1
                    ? "Collected in:"
                    : `Collected in (${collections.length}):`}
                </p>
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => set({ openWorkId: null, openCollectionId: collection.id })}
                      className="flex w-full items-center gap-3 text-left hover:underline"
                    >
                      <div className="w-12 shrink-0 aspect-[2/3] overflow-hidden rounded-sm bg-muted/40">
                        {collection.cover_url ? (
                          <img src={collection.cover_url} alt="" className="h-full w-full object-contain" />
                        ) : null}
                      </div>
                      <span className="text-sm font-medium">{collection.title}</span>
                      <span className="text-muted-foreground">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
