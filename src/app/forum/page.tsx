import { redirect } from "next/navigation";
import { ComposePost } from "@/components/forum/ComposePost";
import { FeedPostCard } from "@/components/forum/FeedPostCard";
import { Card, PageShell } from "@/components/ui";
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
    .select(
      "id, author_id, body, category, parent_id, like_count, reply_count, created_at"
    )
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const authorIds = Array.from(new Set((posts ?? []).map((p) => p.author_id)));
  const postIds = (posts ?? []).map((p) => p.id);

  const [{ data: authors }, { data: myLikes }] = await Promise.all([
    authorIds.length
      ? supabase.from("users").select("id, display_name").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase
          .from("forum_post_likes")
          .select("post_id")
          .eq("user_id", profile.id)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const authorMap = new Map(
    (authors ?? []).map((a) => [a.id, { display_name: a.display_name }])
  );
  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id));

  const feed = (posts ?? []).map((p) => ({
    ...p,
    title: null,
    is_published: true,
    updated_at: p.created_at,
    author: authorMap.get(p.author_id) ?? null,
    liked_by_me: likedSet.has(p.id),
  }));

  return (
    <PageShell title="Forum" subtitle="Share lessons & tips with the circle">
      <div className="space-y-4">
        <ComposePost />

        {!feed.length ? (
          <Card className="p-6 text-center">
            <p className="text-[var(--muted)]">No posts yet. Be the first to share!</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {feed.map((post) => (
              <li key={post.id}>
                <FeedPostCard
                  post={post}
                  timezone={profile.timezone}
                  currentUserId={profile.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
