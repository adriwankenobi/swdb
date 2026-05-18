import { ChevronLeft, ChevronRight } from "lucide-react";

interface ModalNavArrowsProps {
  hasPrev: boolean;
  hasNext: boolean;
  isOrphan: boolean;
  onPrev: () => void;
  onNext: () => void;
}

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
        disabled={!hasPrev}
        onClick={onPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-background/70 ring-1 ring-foreground/10 hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next item"
        title={hasNext ? "Next item" : disabledTitle ?? "No next item"}
        disabled={!hasNext}
        onClick={onNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-background/70 ring-1 ring-foreground/10 hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}
