"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ForumPostForm } from "@/components/admin/ForumPostForm";
import { Button } from "@/components/ui";
import { unpublishForumPost } from "@/app/admin/forum/actions";
import { formatPostDate, forumCategoryLabel } from "@/lib/forum";

interface AdminForumEditPageClientProps {
  post: {
    id: string;
    title: string;
    body: string;
    category: string;
    is_published: boolean;
    notified_at: string | null;
    created_at: string;
  };
  timezone: string;
}

export function AdminForumEditPageClient({
  post,
  timezone,
}: AdminForumEditPageClientProps) {
  const router = useRouter();

  async function handleUnpublish() {
    if (!confirm("Unpublish this post? Members will no longer see it.")) return;
    const result = await unpublishForumPost(post.id);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/forum"
          className="text-sm font-medium text-brand dark:text-brand-muted"
        >
          ← Forum
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Edit post</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {forumCategoryLabel(post.category)} ·{" "}
          {formatPostDate(post.created_at, timezone)}
          {post.notified_at && " · Notified"}
        </p>
      </header>

      <ForumPostForm
        mode="edit"
        postId={post.id}
        initial={{
          title: post.title,
          body: post.body,
          category: post.category,
          isPublished: post.is_published,
        }}
      />

      {post.is_published && (
        <div className="mt-4">
          <Link
            href={`/forum/${post.id}`}
            className="text-sm font-medium text-brand"
          >
            Preview as member →
          </Link>
        </div>
      )}

      {post.is_published && (
        <div className="mt-6">
          <Button type="button" variant="danger" onClick={handleUnpublish}>
            Unpublish
          </Button>
        </div>
      )}
    </>
  );
}
