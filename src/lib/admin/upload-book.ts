import "server-only";

import { revalidatePath } from "next/cache";
import type { User } from "@/lib/types";
import { getPdfPageCount } from "@/lib/pdf-page-count";
import {
  assignBookToAllMembers,
} from "@/lib/admin/book-assignments";
import { isAdminClientConfigured, createAdminClient } from "@/lib/supabase/admin";

export type UploadBookResult =
  | { error: string }
  | { bookId: string };

async function resolvePageCount(
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
  const file = formData.get("pdf") as File | null;
  const assignAll = formData.get("assign_all") === "on";

  if (!title) return { error: "Title is required." };
  if (!file || file.size === 0) return { error: "PDF file is required." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const looksLikePdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf") ||
    buffer.subarray(0, 5).toString("ascii") === "%PDF-";

  if (!looksLikePdf) return { error: "File must be a PDF." };

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
  const storagePath = `${bookId}.pdf`;
  const adminClient = createAdminClient();

  let pageCount: number;
  let uploadError: { message: string } | null = null;

  try {
    const [resolvedPageCount, uploadResult] = await Promise.all([
      resolvePageCount(buffer, manualPageCount),
      adminClient.storage.from("books").upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      }),
    ]);

    pageCount = resolvedPageCount;
    uploadError = uploadResult.error;
  } catch {
    await adminClient.storage.from("books").remove([storagePath]);

    if (Number.isFinite(manualPageCount) && manualPageCount > 0) {
      const { error } = await adminClient.storage.from("books").upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) return { error: error.message };
      pageCount = manualPageCount;
    } else {
      return {
        error:
          "Could not read this PDF automatically. Enter the page count below and try again.",
      };
    }
  }

  if (!pageCount || pageCount < 1) {
    await adminClient.storage.from("books").remove([storagePath]);
    return {
      error:
        "Could not determine page count. Enter the page count below and try again.",
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
      page_count: pageCount,
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
