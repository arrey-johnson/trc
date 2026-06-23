import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

/** Onboarded platform members (excludes admin accounts). */
export async function getAssignableMemberIds(
  adminClient: AdminClient
): Promise<string[]> {
  const { data, error } = await adminClient
    .from("users")
    .select("id")
    .eq("onboarding_complete", true)
    .eq("whatsapp_group_role", "member");

  if (error) {
    console.error("Failed to load assignable members:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

export async function assignBookToMemberIds(
  adminClient: AdminClient,
  bookId: string,
  memberIds: string[],
  assignedBy: string
): Promise<{ assigned: number; error: string | null }> {
  if (!memberIds.length) {
    return { assigned: 0, error: null };
  }

  const { error } = await adminClient.from("book_assignments").upsert(
    memberIds.map((userId) => ({
      book_id: bookId,
      user_id: userId,
      assigned_by: assignedBy,
    })),
    { onConflict: "book_id,user_id" }
  );

  if (error) {
    console.error("Failed to assign book:", error.message);
    return { assigned: 0, error: error.message };
  }

  return { assigned: memberIds.length, error: null };
}

export async function assignBookToAllMembers(
  adminClient: AdminClient,
  bookId: string,
  assignedBy: string
): Promise<{ assigned: number; error: string | null }> {
  const memberIds = await getAssignableMemberIds(adminClient);
  return assignBookToMemberIds(adminClient, bookId, memberIds, assignedBy);
}

/** Give a newly onboarded member access to every active book. */
export async function assignAllActiveBooksToMember(
  adminClient: AdminClient,
  userId: string,
  assignedBy: string
): Promise<{ assigned: number; error: string | null }> {
  const { data: books, error: booksError } = await adminClient
    .from("books")
    .select("id")
    .eq("is_active", true);

  if (booksError) {
    console.error("Failed to load active books:", booksError.message);
    return { assigned: 0, error: booksError.message };
  }

  if (!books?.length) {
    return { assigned: 0, error: null };
  }

  const { error } = await adminClient.from("book_assignments").upsert(
    books.map((book) => ({
      book_id: book.id,
      user_id: userId,
      assigned_by: assignedBy,
    })),
    { onConflict: "book_id,user_id" }
  );

  if (error) {
    console.error("Failed to sync books for member:", error.message);
    return { assigned: 0, error: error.message };
  }

  return { assigned: books.length, error: null };
}
