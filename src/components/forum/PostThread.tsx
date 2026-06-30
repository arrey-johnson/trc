"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { replyToPost, togglePostLike } from "@/app/forum/actions";
import {
  PostEditForm,
  PostOwnerMenu,
  usePostAuthorActions,
} from "@/components/forum/PostAuthorActions";
import { PostActionsBar } from "@/components/forum/PostActionsBar";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { Button } from "@/components/ui";
import {
  FORUM_MAX_CHARS,
  formatPostDate,
  forumCategoryLabel,
} from "@/lib/forum";
import type { ForumPostWithAuthor } from "@/lib/types";

function ReplyCard({
  post,
  timezone,
  currentUserId,
}: {
  post: ForumPostWithAuthor;
  timezone: string;
  currentUserId: string;
}) {
  const isAuthor = post.author_id === currentUserId;
  const authorActions = usePostAuthorActions({
    postId: post.id,
    body: post.body,
    category: post.category,
    isReply: true,
  });

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--foreground)]">
              {post.author?.display_name ?? "Member"}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {formatPostDate(post.created_at, timezone)}
            </span>
          </div>
        </div>
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
          isReply
          remaining={authorActions.remaining}
          error={authorActions.error}
          pending={authorActions.pending}
          onBodyChange={authorActions.setBody}
          onCategoryChange={authorActions.setCategory}
          onSubmit={authorActions.saveEdit}
          onCancel={authorActions.cancelEdit}
        />
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">
          {post.body}
        </p>
      )}

      {isAuthor && authorActions.error && !authorActions.editing && (
        <p className="mt-1 text-xs text-red-600">{authorActions.error}</p>
      )}
    </div>
  );
}

export function PostThread({
  post,
  replies,
  timezone,
  currentUserId,
}: {
  post: ForumPostWithAuthor;
  replies: ForumPostWithAuthor[];
  timezone: string;
  currentUserId: string;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [likePending, startLike] = useTransition();
  const router = useRouter();

  const remaining = FORUM_MAX_CHARS - body.length;
  const isAuthor = post.author_id === currentUserId;
  const authorActions = usePostAuthorActions({
    postId: post.id,
    body: post.body,
    category: post.category,
    deleteRedirect: "/forum",
  });

  const shareData = {
    authorName: post.author?.display_name ?? "Member",
    authorAvatarUrl: post.author?.avatar_url,
    body: post.body,
    category: post.category,
    createdAt: post.created_at,
    timezone,
  };

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("body", body);

    startTransition(async () => {
      const result = await replyToPost(post.id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    startLike(async () => {
      await togglePostLike(post.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={post.author?.display_name ?? "Member"}
            avatarUrl={post.author?.avatar_url}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{post.author?.display_name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {formatPostDate(post.created_at, timezone)}
                  </span>
                </div>
                <span className="text-xs text-brand-subtle-fg dark:text-brand-muted">
                  {forumCategoryLabel(post.category)}
                </span>
              </div>
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
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">
                {post.body}
              </p>
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
          replyCount={replies.length}
          likePending={likePending}
          onLike={handleLike}
          shareData={shareData}
          replyHref={`/forum/${post.id}#reply`}
        />
      </article>

      {replies.length > 0 && (
        <div className="space-y-2 pl-2">
          <p className="text-sm font-medium text-[var(--muted)]">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
          {replies.map((r) => (
            <ReplyCard
              key={r.id}
              post={r}
              timezone={timezone}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      <form
        id="reply"
        onSubmit={handleReply}
        className="scroll-mt-24 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, FORUM_MAX_CHARS))}
          placeholder="Write a reply…"
          rows={2}
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">{remaining}</span>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <Button type="submit" disabled={pending || !body.trim()} className="w-auto px-4 text-sm">
          {pending ? "Replying…" : "Reply"}
        </Button>
      </form>
    </div>
  );
}
