"use client";

import { useEffect, useRef, useState } from "react";
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
  const touchStartX = useRef<number | null>(null);

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

  function handleTouchStart(clientX: number) {
    touchStartX.current = clientX;
  }

  function handleTouchEnd(clientX: number) {
    if (touchStartX.current === null) return;
    const delta = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) goToPage(page + 1);
    else goToPage(page - 1);
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
      onTouchStart={(e) => handleTouchStart(e.changedTouches[0].clientX)}
      onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientX)}
    >
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
            className="rounded-lg px-3 py-1 hover:bg-[var(--elevated)] active:scale-95 disabled:opacity-40"
          >
            ←
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => goToPage(page + 1)}
            className="rounded-lg px-3 py-1 hover:bg-[var(--elevated)] active:scale-95 disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
      <p className="border-t border-[var(--border)] px-4 py-2 text-center text-xs text-[var(--muted)]">
        Swipe left or right to turn pages
      </p>
    </div>
  );
}
