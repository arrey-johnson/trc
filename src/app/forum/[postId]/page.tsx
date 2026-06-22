import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ButtonLink, Card, PageShell } from "@/components/ui";
import { formatPostDate, forumCategoryLabel } from "@/lib/forum";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
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
    .select("id, title, body, category, created_at, author_id")
    .eq("id", params.postId)
    .eq("is_published", true)
    .maybeSingle();

  if (!post) notFound();

  const { data: author } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", post.author_id)
    .maybeSingle();

  return (
    <PageShell>
      <Link
        href="/forum"
        className="mb-4 inline-flex text-sm font-medium text-emerald-700"
      >
        ← Back to Forum
      </Link>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            {forumCategoryLabel(post.category)}
          </span>
          <span className="text-xs text-stone-500">
            {formatPostDate(post.created_at, profile.timezone)}
          </span>
        </div>

        <h1 className="text-2xl font-bold leading-tight text-stone-900">
          {post.title}
        </h1>

        <p className="text-sm text-stone-500">
          By {author?.display_name ?? "Admin"}
        </p>

        <div className="whitespace-pre-wrap text-base leading-relaxed text-stone-800">
          {post.body}
        </div>
      </Card>

      <div className="mt-4">
        <ButtonLink href="/forum" variant="secondary" className="w-full">
          More posts
        </ButtonLink>
      </div>
    </PageShell>
  );
}
