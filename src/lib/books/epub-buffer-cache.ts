"use client";

const CACHE_NAME = "trc-book-files-v1";

const memoryBuffers = new Map<string, ArrayBuffer>();
const inflightBuffers = new Map<string, Promise<ArrayBuffer>>();

function bookFilePath(bookId: string): string {
  return `/api/books/${bookId}/file`;
}

export function peekEpubBuffer(bookId: string): ArrayBuffer | null {
  return memoryBuffers.get(bookId) ?? null;
}

export async function loadEpubBuffer(bookId: string): Promise<ArrayBuffer> {
  const cached = memoryBuffers.get(bookId);
  if (cached) return cached;

  const inflight = inflightBuffers.get(bookId);
  if (inflight) return inflight;

  const promise = (async () => {
    const url = bookFilePath(bookId);

    if (typeof caches !== "undefined") {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        const buffer = await cachedResponse.arrayBuffer();
        memoryBuffers.set(bookId, buffer);
        return buffer;
      }
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch EPUB");
    }

    if (typeof caches !== "undefined") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response.clone());
    }

    const buffer = await response.arrayBuffer();
    memoryBuffers.set(bookId, buffer);
    return buffer;
  })();

  inflightBuffers.set(bookId, promise);

  try {
    return await promise;
  } finally {
    inflightBuffers.delete(bookId);
  }
}

export function prefetchEpub(bookId: string): void {
  if (memoryBuffers.has(bookId)) return;
  void loadEpubBuffer(bookId).catch(() => {
    // Prefetch is best-effort.
  });
}

export function rememberEpubBuffer(bookId: string, buffer: ArrayBuffer): void {
  memoryBuffers.set(bookId, buffer);
}
