import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";

export { getDefaultAppPath } from "@/lib/auth-routes";

export async function getAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  return data;
}

export async function requireAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  return user;
}

export async function requireAdmin(): Promise<User> {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");
  if (profile.whatsapp_group_role !== "admin") redirect("/");

  return profile;
}
