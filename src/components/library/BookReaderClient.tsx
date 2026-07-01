"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { saveReadingProgress } from "@/app/library/actions";
import { Button, PageShell } from "@/components/ui";
import { formatReadingProgress } from "@/lib/books";
import type { BookFormat } from "@/lib/types";

const PdfReader = dynamic(
  () => import("@/components/library/PdfReader").then((m) => m.PdfReader),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
        Loading reader…
      </div>
    ),
  }
);

const EpubReader = dynamic(
  () => import("@/components/library/EpubReader").then((m) => m.EpubReader),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-2xl bg-[var(--elevated)] text-[var(--muted)]">
        Loading reader…
      </div>
    ),
  }
);

interface BookReaderProps {
  bookId: string;
  title: string;
  format: BookFormat;
  pageCount: number;
  initialPage: number;
  initialEpubLocation: string | null;
}

export function BookReaderClient({
  bookId,
  title,
  format,
  pageCount,
  initialPage,
  initialEpubLocation,
}: BookReaderProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [, startSave] = useTransition();

  useEffect(() => {
    if (format === "epub") {
      setFileUrl(`/api/books/${bookId}/file`);
      setError(null);
      return;
    }

    fetch(`/api/books/${bookId}/file?meta=1`)
      .then((r) => r.json())
      .then((data) => {
        if (data.url) setFileUrl(data.url);
        else setError(data.error ?? "Could not load book");
      })
      .catch(() => setError("Could not load book"));
  }, [bookId, format]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      startSave(async () => {
        await saveReadingProgress(bookId, page);
      });
    },
    [bookId]
  );

  const handleEpubProgress = useCallback(
    (progress: { percent: number; epubLocation: string }) => {
      setCurrentPage(progress.percent);
      startSave(async () => {
        await saveReadingProgress(
          bookId,
          progress.percent,
          progress.epubLocation
        );
      });
    },
    [bookId]
  );

  return (
    <PageShell
      title={title}
      subtitle={formatReadingProgress(format, currentPage, pageCount)}
      action={
        <Link
          href="/library"
          className="text-sm font-medium text-brand-subtle-fg dark:text-brand-muted"
        >
          ← Library
        </Link>
      }
    >
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {fileUrl && !error && format === "pdf" && (
        <PdfReader
          url={fileUrl}
          pageCount={pageCount}
          initialPage={initialPage}
          onPageChange={handlePageChange}
        />
      )}

      {fileUrl && !error && format === "epub" && (
        <EpubReader
          url={fileUrl}
          initialLocation={initialEpubLocation}
          onProgressChange={handleEpubProgress}
        />
      )}

      {format === "pdf" && (
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() =>
              handlePageChange(Math.min(pageCount, currentPage + 1))
            }
            disabled={currentPage >= pageCount}
          >
            Next page
          </Button>
        </div>
      )}
    </PageShell>
  );
}
