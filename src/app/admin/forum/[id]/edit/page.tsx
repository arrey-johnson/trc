import { notFound } from "next/navigation";
import { AdminForumEditPageClient } from "@/components/admin/AdminForumEditPageClient";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminForumEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const supabase = createClient();

  const { data: post } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  return (
    <AdminForumEditPageClient post={post} timezone={admin.timezone} />
  );
}
