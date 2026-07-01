"use client";

import ePub, { type Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";

interface EpubReaderProps {
  url: string;
  initialLocation: string | null;
  onProgressChange: (progress: {
    percent: number;
    epubLocation: string;
  }) => void;
}

export function EpubReader({
  url,
  initialLocation,
  onProgressChange,
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const onProgressRef = useRef(onProgressChange);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onProgressRef.current = onProgressChange;
  }, [onProgressChange]);

  useEffect(() => {
    let cancelled = false;
    const viewer = viewerRef.current;
    if (!viewer) return;

    setLoading(true);
    setLoadError(false);
    viewer.innerHTML = "";

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch EPUB");
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;

        const book = ePub(buffer, { openAs: "binary" });

        return book.ready.then(() => {
          if (cancelled) return;

          const rendition = book.renderTo(viewer, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default",
          });

          renditionRef.current = rendition;
          rendition.flow("paginated");

          rendition.on(
            "relocated",
            (location: { start?: { percentage?: number; cfi?: string } }) => {
              const epubLocation = location.start?.cfi;
              if (!epubLocation) return;

              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveTimerRef.current = setTimeout(() => {
                const percent = Math.round((location.start?.percentage ?? 0) * 100);
                onProgressRef.current({
                  percent: Math.max(0, Math.min(100, percent)),
                  epubLocation,
                });
              }, 350);
            }
          );

          if (initialLocation) {
            return rendition.display(initialLocation);
          }
          return rendition.display();
        });
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      renditionRef.current?.destroy();
      renditionRef.current = null;
      viewer.innerHTML = "";
    };
  }, [url, initialLocation]);

  function handleTouchStart(clientX: number) {
    touchStartX.current = clientX;
  }

  function handleTouchEnd(clientX: number) {
    const rendition = renditionRef.current;
    if (!rendition || touchStartX.current === null) return;

    const delta = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;

    if (delta < 0) rendition.next();
    else rendition.prev();
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
      onTouchStart={(e) => handleTouchStart(e.changedTouches[0].clientX)}
      onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientX)}
    >
      {loading && (
        <div className="flex h-[70vh] min-h-[28rem] items-center justify-center text-[var(--muted)]">
          Loading book…
        </div>
      )}

      {loadError && (
        <div className="flex h-[70vh] min-h-[28rem] items-center justify-center p-4 text-center text-sm text-red-600">
          Could not load EPUB. Try refreshing the page.
        </div>
      )}

      <div
        ref={viewerRef}
        className={
          loading || loadError
            ? "hidden"
            : "h-[70vh] min-h-[28rem] w-full [&_iframe]:!h-full [&_iframe]:!w-full"
        }
      />

      {!loading && !loadError && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
          <span>Swipe left or right to turn pages</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => renditionRef.current?.prev()}
              className="rounded-lg px-3 py-1 hover:bg-[var(--elevated)] active:scale-95"
              aria-label="Previous page"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => renditionRef.current?.next()}
              className="rounded-lg px-3 py-1 hover:bg-[var(--elevated)] active:scale-95"
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
