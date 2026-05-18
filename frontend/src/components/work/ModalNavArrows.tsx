import { ChevronLeft, ChevronRight } from "lucide-react";

interface ModalNavArrowsProps {
  hasPrev: boolean;
  hasNext: boolean;
  isOrphan: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const baseClass =
  "absolute top-1/2 -translate-y-1/2 z-10 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-background/70 ring-1 ring-foreground/10 hover:bg-background aria-disabled:opacity-30 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-background/70";

export function ModalNavArrows({
  hasPrev,
  hasNext,
  isOrphan,
  onPrev,
  onNext,
}: ModalNavArrowsProps) {
  const disabledTitle = isOrphan ? "Not in current view" : undefined;
  return (
    <>
      <button
        type="button"
        aria-label="Previous item"
        title={hasPrev ? "Previous item" : disabledTitle ?? "No previous item"}
        aria-disabled={!hasPrev}
        onClick={() => { if (hasPrev) onPrev(); }}
        className={`${baseClass} left-2`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next item"
        title={hasNext ? "Next item" : disabledTitle ?? "No next item"}
        aria-disabled={!hasNext}
        onClick={() => { if (hasNext) onNext(); }}
        className={`${baseClass} right-2`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}
