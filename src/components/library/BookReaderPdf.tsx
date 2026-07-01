"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { saveReadingProgress } from "@/app/library/actions";
import { PdfReader } from "@/components/library/PdfReader";

interface BookReaderPdfProps {
  bookId: string;
  pageCount: number;
  initialPage: number;
  onPageChange: (page: number) => void;
}

export function BookReaderPdf({
  bookId,
  pageCount,
  initialPage,
  onPageChange,
}: BookReaderPdfProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [, startSave] = useTransition();

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/books/${bookId}/file?meta=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.url) setFileUrl(data.url);
        else setError(data.error ?? "Could not load book");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load book");
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      onPageChange(page);
      startSave(async () => {
        await saveReadingProgress(bookId, page);
      });
    },
    [bookId, onPageChange]
  );

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex h-[70vh] min-h-[28rem] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]">
        Loading book…
      </div>
    );
  }

  return (
    <>
      <PdfReader
        url={fileUrl}
        pageCount={pageCount}
        initialPage={initialPage}
        onPageChange={handlePageChange}
      />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--elevated)] px-4 text-base font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--elevated)] px-4 text-base font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handlePageChange(Math.min(pageCount, currentPage + 1))}
          disabled={currentPage >= pageCount}
        >
          Next page
        </button>
      </div>
    </>
  );
}
