"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { saveReadingProgress } from "@/app/library/actions";
import { EpubReader } from "@/components/library/EpubReader";
import {
  loadEpubBuffer,
  peekEpubBuffer,
} from "@/lib/books/epub-buffer-cache";

interface BookReaderEpubProps {
  bookId: string;
  initialEpubLocation: string | null;
  onProgressChange: (page: number) => void;
}

export function BookReaderEpub({
  bookId,
  initialEpubLocation,
  onProgressChange,
}: BookReaderEpubProps) {
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(() =>
    peekEpubBuffer(bookId)
  );
  const [error, setError] = useState<string | null>(null);
  const [, startSave] = useTransition();

  useEffect(() => {
    const cached = peekEpubBuffer(bookId);
    if (cached) {
      setEpubData(cached);
      return;
    }

    let cancelled = false;
    setEpubData(null);

    loadEpubBuffer(bookId)
      .then((buffer) => {
        if (!cancelled) setEpubData(buffer);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load book");
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const handleEpubProgress = useCallback(
    (progress: { percent: number; epubLocation: string }) => {
      onProgressChange(progress.percent);
      startSave(async () => {
        await saveReadingProgress(
          bookId,
          progress.percent,
          progress.epubLocation
        );
      });
    },
    [bookId, onProgressChange]
  );

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <EpubReader
      bookId={bookId}
      bookData={epubData}
      initialLocation={initialEpubLocation}
      onProgressChange={handleEpubProgress}
    />
  );
}
