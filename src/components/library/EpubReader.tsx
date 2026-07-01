"use client";

import type { Book, Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";
import { rememberEpubBuffer } from "@/lib/books/epub-buffer-cache";

const MAX_OPEN_BOOKS = 4;
const memoryBooks = new Map<string, Book>();
const bookAccessOrder: string[] = [];

function touchBookAccess(bookId: string) {
  const index = bookAccessOrder.indexOf(bookId);
  if (index >= 0) bookAccessOrder.splice(index, 1);
  bookAccessOrder.push(bookId);

  while (bookAccessOrder.length > MAX_OPEN_BOOKS) {
    const evictId = bookAccessOrder.shift();
    if (!evictId) break;
    memoryBooks.get(evictId)?.destroy();
    memoryBooks.delete(evictId);
  }
}

function isEpubBookReady(bookId: string): boolean {
  return memoryBooks.has(bookId);
}

async function acquireEpubBook(
  bookId: string,
  buffer: ArrayBuffer
): Promise<Book> {
  rememberEpubBuffer(bookId, buffer);

  const existing = memoryBooks.get(bookId);
  if (existing) {
    touchBookAccess(bookId);
    return existing;
  }

  const { default: ePub } = await import("epubjs");
  const book = ePub(buffer, { openAs: "binary" });
  await book.opened;
  memoryBooks.set(bookId, book);
  touchBookAccess(bookId);
  return book;
}

interface EpubReaderProps {
  bookId: string;
  bookData: ArrayBuffer | null;
  initialLocation: string | null;
  onProgressChange: (progress: {
    percent: number;
    epubLocation: string;
  }) => void;
}

function waitForFirstRender(rendition: Rendition, fast = false): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      rendition.off("rendered", onRendered);
      resolve();
    };
    const onRendered = () => finish();
    rendition.on("rendered", onRendered);
    window.setTimeout(finish, fast ? 50 : 150);
  });
}

async function displayInitialPage(
  book: Book,
  rendition: Rendition,
  initialLocation: string | null
) {
  if (initialLocation) {
    await rendition.display(initialLocation);
    return;
  }

  const first = book.spine.first();
  if (first?.href) {
    await rendition.display(first.href);
    return;
  }

  await rendition.display();
}

async function reportLocation(
  rendition: Rendition,
  onProgress: EpubReaderProps["onProgressChange"]
) {
  const location = (await rendition.currentLocation()) as {
    start?: { percentage?: number; cfi?: string };
  } | null;
  const epubLocation = location?.start?.cfi;
  if (!epubLocation) return;

  const percent = Math.round((location.start?.percentage ?? 0) * 100);
  onProgress({
    percent: Math.max(0, Math.min(100, percent)),
    epubLocation,
  });
}

export function EpubReader({
  bookId,
  bookData,
  initialLocation,
  onProgressChange,
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const onProgressRef = useRef(onProgressChange);
  const initialLocationRef = useRef(initialLocation);
  const [loading, setLoading] = useState(
    () => !bookData || !isEpubBookReady(bookId)
  );
  const [loadError, setLoadError] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onProgressRef.current = onProgressChange;
  }, [onProgressChange]);

  useEffect(() => {
    initialLocationRef.current = initialLocation;
  }, [initialLocation]);

  useEffect(() => {
    if (!bookData) {
      setLoading(true);
      setLoadError(false);
      return;
    }

    let cancelled = false;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const cachedBook = isEpubBookReady(bookId);
    setLoading(!cachedBook);
    setLoadError(false);
    viewer.innerHTML = "";

    acquireEpubBook(bookId, bookData)
      .then((book) => {
        if (cancelled || !viewerRef.current) return;

        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          manager: "default",
          spread: "none",
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

        return displayInitialPage(
          book,
          rendition,
          initialLocationRef.current
        )
          .then(() => waitForFirstRender(rendition, cachedBook))
          .then(() => reportLocation(rendition, onProgressRef.current));
      })
      .then(() => {
        if (cancelled || !renditionRef.current || !viewerRef.current) return;

        const { clientWidth, clientHeight } = viewerRef.current;
        renditionRef.current.resize(clientWidth, clientHeight);
        requestAnimationFrame(() => {
          if (!renditionRef.current || !viewerRef.current) return;
          const { clientWidth: w, clientHeight: h } = viewerRef.current;
          renditionRef.current.resize(w, h);
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
  }, [bookId, bookData]);

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
      <div
        ref={viewerRef}
        className="h-[70vh] min-h-[28rem] w-full bg-[var(--card)] [&_iframe]:!h-full [&_iframe]:!w-full"
        aria-busy={loading}
      />

      {loading && !loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--card)] text-[var(--muted)]">
          Loading book…
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--card)] p-4 text-center text-sm text-red-600">
          Could not load EPUB. Try refreshing the page.
        </div>
      )}

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
