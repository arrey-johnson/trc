"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui";
import { formatReadingProgress } from "@/lib/books";
import type { BookFormat } from "@/lib/types";

const BookReaderPdf = dynamic(
  () =>
    import("@/components/library/BookReaderPdf").then((mod) => mod.BookReaderPdf),
  {
    ssr: false,
    loading: () => <ReaderLoading />,
  }
);

const BookReaderEpub = dynamic(
  () =>
    import("@/components/library/BookReaderEpub").then(
      (mod) => mod.BookReaderEpub
    ),
  {
    ssr: false,
    loading: () => <ReaderLoading />,
  }
);

function ReaderLoading() {
  return (
    <div className="flex h-[70vh] min-h-[28rem] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]">
      Loading reader…
    </div>
  );
}

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
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {!mounted && <ReaderLoading />}

      {mounted && format === "pdf" && (
        <BookReaderPdf
          bookId={bookId}
          pageCount={pageCount}
          initialPage={initialPage}
          onPageChange={setCurrentPage}
        />
      )}

      {mounted && format === "epub" && (
        <BookReaderEpub
          bookId={bookId}
          initialEpubLocation={initialEpubLocation}
          onProgressChange={setCurrentPage}
        />
      )}
    </PageShell>
  );
}
