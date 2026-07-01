import "server-only";

import { revalidatePath } from "next/cache";
import type { User } from "@/lib/types";
import {
  detectBookFormat,
  EPUB_PERCENT_SCALE,
  getEpubSpineCount,
  normalizeFeaturedMonth,
} from "@/lib/books/format";
import { getPdfPageCount } from "@/lib/pdf-page-count";
import { assignBookToAllMembers } from "@/lib/admin/book-assignments";
import { isAdminClientConfigured, createAdminClient } from "@/lib/supabase/admin";

export type UploadBookResult =
  | { error: string }
  | { bookId: string };

async function resolvePdfPageCount(
  buffer: Buffer,
  manualPageCount: number
): Promise<number> {
  if (Number.isFinite(manualPageCount) && manualPageCount > 0) {
    return manualPageCount;
  }

  return getPdfPageCount(buffer);
}

export async function processBookUpload(
  formData: FormData,
  admin: User
): Promise<UploadBookResult> {
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const file = formData.get("book_file") as File | null;
  const assignAll = formData.get("assign_all") === "on";
  const featuredMonth = normalizeFeaturedMonth(
    String(formData.get("featured_month") ?? "")
  );

  if (!title) return { error: "Title is required." };
  if (!file || file.size === 0) return { error: "Book file is required." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = detectBookFormat(file.name, file.type, buffer);

  if (!format) {
    return { error: "File must be a PDF or EPUB." };
  }

  const maxBytes = 50 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return { error: "File must be 50 MB or smaller." };
  }

  if (!isAdminClientConfigured()) {
    return {
      error:
        "Book upload is not configured on this server. Add SUPABASE_SERVICE_ROLE_KEY to your environment.",
    };
  }

  const manualPageCount = Number.parseInt(
    String(formData.get("page_count") ?? ""),
    10
  );

  const bookId = crypto.randomUUID();
  const storagePath = `${bookId}.${format}`;
  const adminClient = createAdminClient();
  const contentType =
    format === "pdf" ? "application/pdf" : "application/epub+zip";

  let pageCount: number;
  let uploadError: { message: string } | null = null;

  try {
    if (format === "pdf") {
      const [resolvedPageCount, uploadResult] = await Promise.all([
        resolvePdfPageCount(buffer, manualPageCount),
        adminClient.storage.from("books").upload(storagePath, buffer, {
          contentType,
          upsert: false,
        }),
      ]);
      pageCount = resolvedPageCount;
      uploadError = uploadResult.error;
    } else {
      const spineCount = await getEpubSpineCount(buffer);
      const uploadResult = await adminClient.storage
        .from("books")
        .upload(storagePath, buffer, { contentType, upsert: false });

      pageCount = EPUB_PERCENT_SCALE;
      uploadError = uploadResult.error;

      if (!description && spineCount > 0) {
        // spine count is informational only; progress uses percent scale
      }
    }
  } catch (err) {
    await adminClient.storage.from("books").remove([storagePath]);

    if (format === "pdf" && Number.isFinite(manualPageCount) && manualPageCount > 0) {
      const { error } = await adminClient.storage.from("books").upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });
      if (error) return { error: error.message };
      pageCount = manualPageCount;
    } else {
      return {
        error:
          err instanceof Error
            ? err.message
            : format === "pdf"
              ? "Could not read this PDF. Enter the page count manually and try again."
              : "Could not read this EPUB. Check the file and try again.",
      };
    }
  }

  if (!pageCount || pageCount < 1) {
    await adminClient.storage.from("books").remove([storagePath]);
    return {
      error:
        format === "pdf"
          ? "Could not determine page count. Enter it manually and try again."
          : "Could not prepare EPUB for reading.",
    };
  }

  if (uploadError) return { error: uploadError.message };

  const { data: book, error: bookError } = await adminClient
    .from("books")
    .insert({
      id: bookId,
      title,
      author,
      description,
      storage_path: storagePath,
      format,
      page_count: pageCount,
      featured_month: featuredMonth,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (bookError || !book) {
    await adminClient.storage.from("books").remove([storagePath]);
    return { error: bookError?.message ?? "Failed to save book." };
  }

  if (assignAll) {
    const { assigned, error: assignError } = await assignBookToAllMembers(
      adminClient,
      book.id,
      admin.id
    );

    if (assignError) {
      console.error("Book uploaded but assignment failed:", assignError);
    } else if (assigned === 0) {
      console.warn(
        "Book uploaded with assign-all enabled but no onboarded members exist yet."
      );
    }
  }

  revalidatePath("/admin/library");
  revalidatePath("/library");
  return { bookId: book.id };
}
