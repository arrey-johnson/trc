import type { BookFileFormat } from "@/lib/books/format";
import { EPUB_PERCENT_SCALE } from "@/lib/books/format";

export function readingPercent(currentPage: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  return Math.min(100, Math.round((currentPage / pageCount) * 100));
}

/** Map stored progress to a 0–100 percent for display and bars. */
export function resolveReadingPercent(
  format: BookFileFormat,
  currentPage: number,
  pageCount: number
): number {
  if (format === "epub") {
    if (pageCount === EPUB_PERCENT_SCALE) {
      return Math.max(0, Math.min(100, Math.round(currentPage)));
    }
    return readingPercent(currentPage, pageCount);
  }
  return readingPercent(currentPage, pageCount);
}

export function formatReadingProgress(
  format: BookFileFormat,
  currentPage: number,
  pageCount: number
): string {
  const percent = resolveReadingPercent(format, currentPage, pageCount);
  if (format === "epub") {
    return `${percent}% read`;
  }
  return `Page ${currentPage} of ${pageCount} (${percent}%)`;
}

export function formatBookProgressLabel(
  format: BookFileFormat,
  currentPage: number,
  pageCount: number
): string {
  if (format === "epub") {
    return `${resolveReadingPercent(format, currentPage, pageCount)}% read`;
  }
  return `Page ${currentPage} of ${pageCount}`;
}

export function isActiveReader(lastReadAt: string, hours = 48): boolean {
  const diff = Date.now() - new Date(lastReadAt).getTime();
  return diff < hours * 60 * 60 * 1000;
}

export { todayForUser } from "@/lib/books/dates";
