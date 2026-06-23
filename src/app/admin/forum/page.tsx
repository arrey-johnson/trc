import Link from "next/link";
import { DeletePostButton } from "@/components/admin/DeletePostButton";
import { CommentIcon, HeartIcon } from "@/components/forum/ForumIcons";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatPostDate, forumCategoryLabel } from "@/lib/forum";
import { createClient } from "@/lib/supabase/server";

export default async function AdminForumPage() {
  const admin = await requireAdmin();
  const supabase = createClient();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, body, category, author_id, parent_id, like_count, reply_count, created_at")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const authorIds = Array.from(new Set((posts ?? []).map((p) => p.author_id)));
  const { data: authors } = authorIds.length
    ? await supabase.from("users").select("id, display_name").in("id", authorIds)
    : { data: [] };

  const authorMap = new Map((authors ?? []).map((a) => [a.id, a.display_name]));

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Forum moderation</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Members post their own updates. Remove anything inappropriate.
        </p>
      </header>

      {!posts?.length ? (
        <Card className="p-5 text-center text-[var(--muted)]">No posts yet.</Card>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Card className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {forumCategoryLabel(post.category)}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {authorMap.get(post.author_id) ?? "Member"} ·{" "}
                    {formatPostDate(post.created_at, admin.timezone)}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground)]">{post.body}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-3 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <HeartIcon filled={post.like_count > 0} />
                      {post.like_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <CommentIcon />
                      {post.reply_count}
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/forum/${post.id}`}
                      className="text-xs font-medium text-indigo-600"
                    >
                      View
                    </Link>
                    <DeletePostButton postId={post.id} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
