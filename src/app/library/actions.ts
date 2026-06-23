"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { todayForUser } from "@/lib/books";
import { getCurrentUser } from "@/lib/auth";
import {
  assignAllActiveBooksToMember,
  assignBookToAllMembers,
} from "@/lib/admin/book-assignments";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function assignBookToUser(bookId: string, userId: string) {
  const admin = await requireAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("book_assignments").upsert(
    {
      book_id: bookId,
      user_id: userId,
      assigned_by: admin.id,
    },
    { onConflict: "book_id,user_id" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/admin/library/${bookId}`);
  revalidatePath("/library");
  return { error: null };
}

export async function unassignBookFromUser(bookId: string, userId: string) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("book_assignments")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/library/${bookId}`);
  revalidatePath("/library");
  return { error: null };
}

export async function assignBookToAllOnboardedMembers(bookId: string) {
  const admin = await requireAdmin();
  const adminClient = createAdminClient();

  const { assigned, error } = await assignBookToAllMembers(
    adminClient,
    bookId,
    admin.id
  );

  if (error) return { error, assigned: 0 };

  revalidatePath(`/admin/library/${bookId}`);
  revalidatePath("/library");
  return { error: null, assigned };
}

/** Called after onboarding so members see books uploaded before they joined. */
export async function syncLibraryForCurrentMember() {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete || profile.whatsapp_group_role !== "member") {
    return { error: null };
  }

  if (!isAdminClientConfigured()) {
    return { error: null };
  }

  const adminClient = createAdminClient();
  const { data: adminRow } = await adminClient
    .from("users")
    .select("id")
    .eq("whatsapp_group_role", "admin")
    .limit(1)
    .maybeSingle();

  const assignedBy = adminRow?.id ?? profile.id;
  const { error } = await assignAllActiveBooksToMember(
    adminClient,
    profile.id,
    assignedBy
  );

  if (error) return { error };

  revalidatePath("/library");
  return { error: null };
}

export async function saveReadingProgress(bookId: string, currentPage: number) {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) {
    return { error: "Not allowed." };
  }

  const supabase = createClient();

  const { data: book } = await supabase
    .from("books")
    .select("page_count")
    .eq("id", bookId)
    .eq("is_active", true)
    .maybeSingle();

  if (!book) return { error: "Book not found." };

  const page = Math.max(1, Math.min(currentPage, book.page_count));
  const today = todayForUser(profile.timezone);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("book_reading_progress")
    .select("current_page")
    .eq("book_id", bookId)
    .eq("user_id", profile.id)
    .maybeSingle();

  const prevPage = existing?.current_page ?? 1;
  const pagesDelta = Math.max(0, page - prevPage);

  await supabase.from("book_reading_progress").upsert(
    {
      book_id: bookId,
      user_id: profile.id,
      current_page: page,
      last_read_at: now,
    },
    { onConflict: "book_id,user_id" }
  );

  if (pagesDelta > 0) {
    const { data: daily } = await supabase
      .from("book_reading_daily_log")
      .select("pages_read")
      .eq("book_id", bookId)
      .eq("user_id", profile.id)
      .eq("date", today)
      .maybeSingle();

    await supabase.from("book_reading_daily_log").upsert(
      {
        book_id: bookId,
        user_id: profile.id,
        date: today,
        pages_read: (daily?.pages_read ?? 0) + pagesDelta,
      },
      { onConflict: "book_id,user_id,date" }
    );
  }

  return { error: null, currentPage: page };
}
