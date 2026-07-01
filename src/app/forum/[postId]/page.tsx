import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostThread } from "@/components/forum/PostThread";
import { PageShell } from "@/components/ui";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { buildForumReplyTree } from "@/lib/forum-thread";
import { getAvatarPublicUrl } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";

interface ForumPostPageProps {
  params: { postId: string };
}

export default async function ForumPostPage({ params }: ForumPostPageProps) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const profile = await getCurrentUser();
  if (!profile?.onboarding_complete) redirect("/onboarding");

  const supabase = createClient();

  const { data: post } = await supabase
    .from("forum_posts")
    .select(
      "id, author_id, body, category, parent_id, thread_root_id, like_count, reply_count, created_at"
    )
    .eq("id", params.postId)
    .is("parent_id", null)
    .maybeSingle();

  if (!post) notFound();

  const { data: threadReplies } = await supabase
    .from("forum_posts")
    .select(
      "id, author_id, body, category, parent_id, like_count, reply_count, created_at"
    )
    .eq("thread_root_id", params.postId)
    .neq("id", params.postId)
    .order("created_at", { ascending: true });

  const allIds = [post.id, ...(threadReplies ?? []).map((r) => r.id)];
  const authorIds = Array.from(
    new Set([post.author_id, ...(threadReplies ?? []).map((r) => r.author_id)])
  );

  const [{ data: authors }, { data: myLikes }] = await Promise.all([
    supabase.from("users").select("id, display_name, avatar_url").in("id", authorIds),
    supabase
      .from("forum_post_likes")
      .select("post_id")
      .eq("user_id", profile.id)
      .in("post_id", allIds),
  ]);

  const authorMap = new Map(
    (authors ?? []).map((a) => [
      a.id,
      {
        display_name: a.display_name,
        avatar_url: getAvatarPublicUrl(a.avatar_url),
      },
    ])
  );
  const likedSet = new Set((myLikes ?? []).map((l) => l.post_id));

  const postWithAuthor = {
    ...post,
    title: null,
    is_published: true,
    updated_at: post.created_at,
    author: authorMap.get(post.author_id) ?? null,
    liked_by_me: likedSet.has(post.id),
  };

  const repliesWithAuthors = (threadReplies ?? []).map((r) => ({
    ...r,
    title: null,
    parent_id: r.parent_id,
    is_published: true,
    updated_at: r.created_at,
    author: authorMap.get(r.author_id) ?? null,
    liked_by_me: likedSet.has(r.id),
  }));

  const replyTree = buildForumReplyTree(params.postId, repliesWithAuthors);

  return (
    <PageShell>
      <Link
        href="/forum"
        className="mb-4 inline-flex text-sm font-medium text-brand-subtle-fg dark:text-brand-muted"
      >
        ← Back to feed
      </Link>
      <PostThread
        post={postWithAuthor}
        replyTree={replyTree}
        timezone={profile.timezone}
        currentUserId={profile.id}
      />
    </PageShell>
  );
}
