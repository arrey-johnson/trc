"use client";

import { ButtonLink } from "@/components/ui";
import { prefetchEpub } from "@/lib/books/epub-buffer-cache";
import type { BookFormat } from "@/lib/types";

export function LibraryReadLink({
  bookId,
  format,
  children,
}: {
  bookId: string;
  format: BookFormat;
  children: React.ReactNode;
}) {
  function warmCache() {
    if (format === "epub") prefetchEpub(bookId);
  }

  return (
    <ButtonLink
      href={`/library/${bookId}`}
      className="w-full"
      prefetch
      onMouseEnter={warmCache}
      onFocus={warmCache}
    >
      {children}
    </ButtonLink>
  );
}
