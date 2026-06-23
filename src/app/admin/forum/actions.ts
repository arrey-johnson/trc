"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { processForumNotifications } from "@/lib/notifications/send";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = [
  "personal_development",
  "mindset",
  "habits",
  "faith",
] as const;

function parsePostForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "personal_development");
  const isPublished = formData.get("is_published") === "on";

  if (!title || !body) {
    return { error: "Title and body are required." as const, data: null };
  }

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Invalid category." as const, data: null };
  }

  return {
    error: null,
    data: { title, body, category, isPublished },
  };
}

export async function createForumPost(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = parsePostForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      author_id: admin.id,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
      is_published: parsed.data.isPublished,
      updated_at: now,
      notified_at: parsed.data.isPublished ? null : now,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (parsed.data.isPublished) {
    await processForumNotifications();
  }

  revalidatePath("/admin/forum");
  revalidatePath("/forum");
  redirect(`/admin/forum/${data.id}/edit`);
}

export async function updateForumPost(postId: string, formData: FormData) {
  await requireAdmin();
  const parsed = parsePostForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("forum_posts")
    .select("is_published, notified_at")
    .eq("id", postId)
    .single();

  const wasPublished = existing?.is_published ?? false;
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category,
    is_published: parsed.data.isPublished,
    updated_at: now,
  };

  if (parsed.data.isPublished && !wasPublished) {
    update.notified_at = null;
  }

  const { error } = await supabase
    .from("forum_posts")
    .update(update)
    .eq("id", postId);

  if (error) return { error: error.message };

  if (parsed.data.isPublished && !wasPublished) {
    await processForumNotifications();
  }

  revalidatePath("/admin/forum");
  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);
  return { error: null };
}

export async function unpublishForumPost(postId: string) {
  await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("forum_posts")
    .update({
      is_published: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidatePath("/admin/forum");
  revalidatePath("/forum");
  return { error: null };
}
