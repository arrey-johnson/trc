"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import {
  isForumCategory,
  validatePostBody,
} from "@/lib/forum";
import { createClient } from "@/lib/supabase/server";

export async function createFeedPost(formData: FormData) {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) {
    return { error: "Complete onboarding first." };
  }

  const body = String(formData.get("body") ?? "");
  const category = String(formData.get("category") ?? "personal_development");
  const validation = validatePostBody(body);
  if (validation) return { error: validation };
  if (!isForumCategory(category)) return { error: "Invalid category." };

  const supabase = createClient();
  const { error } = await supabase.from("forum_posts").insert({
    author_id: profile.id,
    body: body.trim(),
    category,
    is_published: true,
    title: null,
    parent_id: null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  try {
    const { processForumNotifications } = await import(
      "@/lib/notifications/send"
    );
    await processForumNotifications();
  } catch {
    // Post saved — push/in-app notify is optional without service role key
  }

  revalidatePath("/forum");
  return { error: null };
}

export async function replyToPost(parentId: string, formData: FormData) {
  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) {
    return { error: "Complete onboarding first." };
  }

  const body = String(formData.get("body") ?? "");
  const validation = validatePostBody(body);
  if (validation) return { error: validation };

  const supabase = createClient();

  const { data: parent } = await supabase
    .from("forum_posts")
    .select("id, category")
    .eq("id", parentId)
    .is("parent_id", null)
    .maybeSingle();

  if (!parent) return { error: "Post not found." };

  const { error } = await supabase.from("forum_posts").insert({
    author_id: profile.id,
    body: body.trim(),
    category: parent.category,
    parent_id: parentId,
    is_published: true,
    title: null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/forum");
  revalidatePath(`/forum/${parentId}`);
  return { error: null };
}

export async function togglePostLike(postId: string) {
  const profile = await getCurrentUser();
  if (!profile) return { error: "Not signed in." };

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("forum_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("forum_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", profile.id);
    if (error) return { error: error.message, liked: false };
  } else {
    const { error } = await supabase.from("forum_post_likes").insert({
      post_id: postId,
      user_id: profile.id,
    });
    if (error) return { error: error.message, liked: true };
  }

  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);
  return { error: null, liked: !existing };
}

export async function deleteForumPost(postId: string) {
  const profile = await getCurrentUser();
  if (!profile) return { error: "Not signed in." };

  const supabase = createClient();

  const { data: post } = await supabase
    .from("forum_posts")
    .select("author_id, parent_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return { error: "Post not found." };

  const isOwner = post.author_id === profile.id;
  const isAdmin = profile.whatsapp_group_role === "admin";
  if (!isOwner && !isAdmin) return { error: "Not allowed." };

  const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath("/forum");
  revalidatePath("/admin/forum");
  if (post.parent_id) revalidatePath(`/forum/${post.parent_id}`);
  return { error: null, parentId: post.parent_id };
}

export async function updateForumPost(postId: string, formData: FormData) {
  const profile = await getCurrentUser();
  if (!profile) return { error: "Not signed in." };

  const body = String(formData.get("body") ?? "");
  const validation = validatePostBody(body);
  if (validation) return { error: validation };

  const supabase = createClient();

  const { data: post } = await supabase
    .from("forum_posts")
    .select("author_id, parent_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return { error: "Post not found." };

  const isOwner = post.author_id === profile.id;
  const isAdmin = profile.whatsapp_group_role === "admin";
  if (!isOwner && !isAdmin) return { error: "Not allowed." };

  const updates: {
    body: string;
    updated_at: string;
    category?: string;
  } = {
    body: body.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!post.parent_id) {
    const category = String(formData.get("category") ?? "");
    if (!isForumCategory(category)) return { error: "Invalid category." };
    updates.category = category;
  }

  const { error } = await supabase
    .from("forum_posts")
    .update(updates)
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidatePath("/forum");
  revalidatePath("/admin/forum");
  revalidatePath(`/forum/${post.parent_id ?? postId}`);
  return { error: null };
}

export async function adminDeleteForumPost(postId: string) {
  await requireAdmin();
  return deleteForumPost(postId);
}
