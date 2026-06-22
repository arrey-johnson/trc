import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageShell } from "@/components/ui";
import {
  formatPostDate,
  forumCategoryLabel,
  postExcerpt,
} from "@/lib/forum";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ForumPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const supabase = createClient();
  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, title, body, category, created_at, author_id")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const authorIds = Array.from(
    new Set((posts ?? []).map((p) => p.author_id))
  );
  const { data: authors } = authorIds.length
    ? await supabase
        .from("users")
        .select("id, display_name")
        .in("id", authorIds)
    : { data: [] };

  const authorMap = new Map(
    (authors ?? []).map((a) => [a.id, a.display_name])
  );

  return (
    <PageShell
      title="Forum"
      subtitle="Notes and guidance from your group admin"
    >
      {!posts?.length ? (
        <Card className="space-y-2 p-5 text-center">
          <p className="text-4xl" aria-hidden>
            📖
          </p>
          <p className="font-medium text-stone-900">No posts yet</p>
          <p className="text-sm text-stone-600">
            Your admin will share personal development tips here soon.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/forum/${post.id}`} prefetch>
                <Card className="block space-y-3 p-5 transition active:scale-[0.99]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {forumCategoryLabel(post.category)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {formatPostDate(post.created_at, profile.timezone)}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug text-stone-900">
                    {post.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-stone-600">
                    {postExcerpt(post.body)}
                  </p>
                  <p className="text-xs font-medium text-emerald-700">
                    By {authorMap.get(post.author_id) ?? "Admin"} · Read more →
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
