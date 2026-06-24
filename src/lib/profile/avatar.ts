import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Please choose a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export function avatarExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export function avatarStoragePath(userId: string, mime: string): string {
  return `${userId}/avatar.${avatarExtension(mime)}`;
}

export function getAvatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/avatars/${path}`;
}

export function resolveAvatarUrl(
  supabase: SupabaseClient,
  path: string | null | undefined
): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  const validation = validateAvatarFile(file);
  if (validation) {
    return { path: null, error: validation };
  }

  const path = avatarStoragePath(userId, file.type);
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    return { path: null, error: error.message };
  }

  return { path, error: null };
}

export async function removeUserAvatar(
  supabase: SupabaseClient,
  path: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from("avatars").remove([path]);
  return { error: error?.message ?? null };
}
