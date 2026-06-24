"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { togglePostLike } from "@/app/forum/actions";
import {
  PostEditForm,
  PostOwnerMenu,
  usePostAuthorActions,
} from "@/components/forum/PostAuthorActions";
import { PostActionsBar } from "@/components/forum/PostActionsBar";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { formatPostDate, forumCategoryLabel } from "@/lib/forum";
import type { ForumPostWithAuthor } from "@/lib/types";

export function FeedPostCard({
  post,
  timezone,
  currentUserId,
}: {
  post: ForumPostWithAuthor;
  timezone: string;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isAuthor = post.author_id === currentUserId;
  const authorActions = usePostAuthorActions({
    postId: post.id,
    body: post.body,
    category: post.category,
    deleteRedirect: "/forum",
  });

  function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await togglePostLike(post.id);
      router.refresh();
    });
  }

  const shareData = {
    authorName: post.author?.display_name ?? "Member",
    body: post.body,
    category: post.category,
    createdAt: post.created_at,
    timezone,
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <Link href={`/forum/${post.id}`} className="shrink-0">
          <UserAvatar
            name={post.author?.display_name ?? "Member"}
            avatarUrl={post.author?.avatar_url}
            size="md"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/forum/${post.id}`} className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold text-[var(--foreground)]">
                  {post.author?.display_name ?? "Member"}
                  {isAuthor && (
                    <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                      (you)
                    </span>
                  )}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  · {formatPostDate(post.created_at, timezone)}
                </span>
              </div>
              <span className="mt-0.5 inline-block text-xs text-emerald-700 dark:text-emerald-400">
                {forumCategoryLabel(post.category)}
              </span>
            </Link>
            {isAuthor && !authorActions.editing && (
              <PostOwnerMenu
                onEdit={authorActions.startEdit}
                onDelete={authorActions.deletePost}
                pending={authorActions.pending}
              />
            )}
          </div>

          {isAuthor && authorActions.editing ? (
            <PostEditForm
              body={authorActions.body}
              category={authorActions.category}
              remaining={authorActions.remaining}
              error={authorActions.error}
              pending={authorActions.pending}
              onBodyChange={authorActions.setBody}
              onCategoryChange={authorActions.setCategory}
              onSubmit={authorActions.saveEdit}
              onCancel={authorActions.cancelEdit}
            />
          ) : isAuthor ? (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--foreground)]">
              {post.body}
            </p>
          ) : (
            <Link href={`/forum/${post.id}`} className="block">
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--foreground)]">
                {post.body}
              </p>
            </Link>
          )}

          {isAuthor && authorActions.error && !authorActions.editing && (
            <p className="mt-1 text-xs text-red-600">{authorActions.error}</p>
          )}
        </div>
      </div>

      <PostActionsBar
        postId={post.id}
        likedByMe={post.liked_by_me ?? false}
        likeCount={post.like_count ?? 0}
        replyCount={post.reply_count ?? 0}
        likePending={pending}
        onLike={handleLike}
        shareData={shareData}
        stopPropagation
      />
    </article>
  );
}
