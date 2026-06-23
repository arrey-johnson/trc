import "server-only";

import { PDFDocument } from "pdf-lib";

const HEAD_SCAN_BYTES = 512 * 1024;
const TAIL_SCAN_BYTES = 256 * 1024;

/** Fast scan of PDF header/tail for page count markers (no full parse). */
function getPageCountFromPdfBytes(buffer: Buffer): number | null {
  const regions: Buffer[] = [
    buffer.subarray(0, Math.min(buffer.length, HEAD_SCAN_BYTES)),
  ];
  if (buffer.length > HEAD_SCAN_BYTES) {
    regions.push(buffer.subarray(buffer.length - TAIL_SCAN_BYTES));
  }

  for (const region of regions) {
    const text = region.toString("latin1");

    const linearized = text.match(/\/Linearized[\s\S]{0,2000}?\/N\s+(\d+)/);
    if (linearized) {
      const count = Number(linearized[1]);
      if (count > 0) return count;
    }

    const pagesCount = text.match(/\/Type\s*\/Pages[\s\S]{0,400}?\/Count\s+(\d+)/);
    if (pagesCount) {
      const count = Number(pagesCount[1]);
      if (count > 0) return count;
    }
  }

  if (buffer.length <= 5 * 1024 * 1024) {
    const pageObjects = buffer
      .toString("latin1")
      .match(/\/Type\s*\/Page(?!s)/g);
    if (pageObjects?.length) return pageObjects.length;
  }

  return null;
}

async function getPageCountFromPdfLib(buffer: Buffer): Promise<number | null> {
  try {
    const pdf = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
    const count = pdf.getPageCount();
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}

/** Resolve page count: fast byte scan first, pdf-lib only if needed. */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const scanned = getPageCountFromPdfBytes(buffer);
  if (scanned && scanned > 0) return scanned;

  const parsed = await getPageCountFromPdfLib(buffer);
  if (parsed && parsed > 0) return parsed;

  throw new Error("Unable to determine PDF page count");
}
