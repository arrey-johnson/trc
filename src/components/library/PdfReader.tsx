"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReaderProps {
  url: string;
  pageCount: number;
  initialPage: number;
  onPageChange: (page: number) => void;
}

export function PdfReader({
  url,
  pageCount,
  initialPage,
  onPageChange,
}: PdfReaderProps) {
  const [page, setPage] = useState(initialPage);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    function updateWidth() {
      setWidth(Math.min(window.innerWidth - 48, 480));
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  function goToPage(next: number) {
    const clamped = Math.max(1, Math.min(pageCount, next));
    setPage(clamped);
    onPageChange(clamped);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <Document
        file={url}
        loading={
          <div className="flex h-96 items-center justify-center text-[var(--muted)]">
            Loading PDF…
          </div>
        }
        error={
          <div className="flex h-48 items-center justify-center p-4 text-center text-sm text-red-600">
            Could not render PDF. Try refreshing.
          </div>
        }
      >
        <Page
          pageNumber={page}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
        <span>
          Page {page} / {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="rounded-lg px-3 py-1 hover:bg-[var(--elevated)] disabled:opacity-40"
          >
            ←
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 1)}
            className="rounded-lg px-3 py-1 hover:bg-[var(--elevated)] disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
