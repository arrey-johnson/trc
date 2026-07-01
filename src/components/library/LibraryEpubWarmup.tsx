"use client";

import { useEffect } from "react";
import { prefetchEpub } from "@/lib/books/epub-buffer-cache";

/** Prefetch EPUB files the member has already started reading. */
export function LibraryEpubWarmup({ bookIds }: { bookIds: string[] }) {
  useEffect(() => {
    for (const bookId of bookIds) prefetchEpub(bookId);
  }, [bookIds]);

  return null;
}
