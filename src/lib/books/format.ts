import JSZip from "jszip";

export type BookFileFormat = "pdf" | "epub";

export function detectBookFormat(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): BookFileFormat | null {
  const lower = fileName.toLowerCase();
  if (
    mimeType === "application/pdf" ||
    lower.endsWith(".pdf") ||
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    return "pdf";
  }

  if (
    mimeType === "application/epub+zip" ||
    mimeType === "application/epub" ||
    mimeType === "application/x-epub+zip" ||
    lower.endsWith(".epub") ||
    buffer[0] === 0x50 // PK zip header
  ) {
    const head = buffer.subarray(0, 4).toString("ascii");
    if (head === "PK\x03\x04") return "epub";
  }

  return null;
}

/** EPUB progress uses page_count = 100 (percent scale). */
export const EPUB_PERCENT_SCALE = 100;

async function readZipText(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  return file.async("text");
}

function spineCountFromOpf(opfXml: string): number | null {
  const matches = opfXml.match(/<itemref\b/gi);
  return matches?.length ? matches.length : null;
}

export async function getEpubSpineCount(buffer: Buffer): Promise<number> {
  const zip = await JSZip.loadAsync(buffer);
  const containerXml = await readZipText(zip, "META-INF/container.xml");
  if (!containerXml) {
    throw new Error("Invalid EPUB: missing container.xml");
  }

  const rootfileMatch = containerXml.match(
    /full-path="([^"]+\.opf)"/i
  );
  const opfPath = rootfileMatch?.[1];
  if (!opfPath) {
    throw new Error("Invalid EPUB: could not find package document");
  }

  const opfXml = await readZipText(zip, opfPath);
  if (!opfXml) {
    throw new Error("Invalid EPUB: missing package document");
  }

  const count = spineCountFromOpf(opfXml);
  if (!count || count < 1) {
    throw new Error("Invalid EPUB: no spine items found");
  }

  return count;
}

export function normalizeFeaturedMonth(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  const [, month] = trimmed.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  return trimmed;
}

export function isBookVisibleToMember(params: {
  featuredMonth: string | null;
  hiddenFromMembers: boolean;
  timezone: string;
  today?: string;
}): boolean {
  if (params.hiddenFromMembers) return false;
  if (!params.featuredMonth) return true;

  const today = params.today ?? currentMonthInTimezone(params.timezone);
  return params.featuredMonth === today;
}

export function currentMonthInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export function formatFeaturedMonthLabel(featuredMonth: string): string {
  const [year, month] = featuredMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function memberVisibilityLabel(params: {
  featuredMonth: string | null;
  hiddenFromMembers: boolean;
  timezone: string;
}): string {
  if (params.hiddenFromMembers) return "Hidden from members";
  if (!params.featuredMonth) return "Always visible to members";

  const current = currentMonthInTimezone(params.timezone);
  const monthLabel = formatFeaturedMonthLabel(params.featuredMonth);

  if (params.featuredMonth === current) {
    return `Visible this month (${monthLabel})`;
  }

  if (params.featuredMonth < current) {
    return `Month passed (${monthLabel}) — hidden from members`;
  }

  return `Scheduled for ${monthLabel}`;
}
