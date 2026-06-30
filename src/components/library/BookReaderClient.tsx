"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { saveReadingProgress } from "@/app/library/actions";
import { Button, PageShell } from "@/components/ui";
import { formatReadingProgress } from "@/lib/books";

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

interface BookReaderProps {
  bookId: string;
  title: string;
  pageCount: number;
  initialPage: number;
}

export function BookReaderClient({
  bookId,
  title,
  pageCount,
  initialPage,
}: BookReaderProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [, startSave] = useTransition();

  useEffect(() => {
    fetch(`/api/books/${bookId}/pdf`)
      .then((r) => r.json())
      .then((data) => {
        if (data.url) setPdfUrl(data.url);
        else setError(data.error ?? "Could not load PDF");
      })
      .catch(() => setError("Could not load PDF"));
  }, [bookId]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      startSave(async () => {
        await saveReadingProgress(bookId, page);
      });
    },
    [bookId]
  );

  return (
    <PageShell
      title={title}
      subtitle={formatReadingProgress(currentPage, pageCount)}
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

      {pdfUrl && !error && (
        <PdfReader
          url={pdfUrl}
          pageCount={pageCount}
          initialPage={initialPage}
          onPageChange={handlePageChange}
        />
      )}

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
    </PageShell>
  );
}
