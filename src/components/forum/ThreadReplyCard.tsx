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
import type { ForumThreadNode } from "@/lib/forum-thread";
import { FORUM_MAX_CHARS, formatPostDate } from "@/lib/forum";

function InlineReplyForm({
  parentId,
  parentName,
  onCancel,
  onSuccess,
}: {
  parentId: string;
  parentName: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = FORUM_MAX_CHARS - body.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("body", body);

    startTransition(async () => {
      const result = await replyToPost(parentId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <p className="text-xs text-[var(--muted)]">
        Replying to <span className="font-medium">{parentName}</span>
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, FORUM_MAX_CHARS))}
        placeholder="Write a reply…"
        rows={2}
        autoFocus
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--muted)]">{remaining}</span>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending || !body.trim()}
          className="w-auto px-3 text-sm"
        >
          {pending ? "Replying…" : "Reply"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="w-auto px-3 text-sm"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ThreadReplyCard({
  node,
  depth,
  timezone,
  currentUserId,
  replyingToId,
  onReplyTo,
  onCancelReply,
  onReplySuccess,
}: {
  node: ForumThreadNode;
  depth: number;
  timezone: string;
  currentUserId: string;
  replyingToId: string | null;
  onReplyTo: (postId: string) => void;
  onCancelReply: () => void;
  onReplySuccess: () => void;
}) {
  const router = useRouter();
  const [likePending, startLike] = useTransition();
  const post = node.post;
  const isAuthor = post.author_id === currentUserId;
  const authorName = post.author?.display_name ?? "Member";
  const isReplyingHere = replyingToId === post.id;

  const authorActions = usePostAuthorActions({
    postId: post.id,
    body: post.body,
    category: post.category,
    isReply: true,
  });

  function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startLike(async () => {
      await togglePostLike(post.id);
      router.refresh();
    });
  }

  return (
    <div
      className={depth > 0 ? "mt-2 border-l-2 border-[var(--border)] pl-3" : ""}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-3">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={authorName}
            avatarUrl={post.author?.avatar_url}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-semibold text-[var(--foreground)]">
                    {authorName}
                    {isAuthor && (
                      <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                        (you)
                      </span>
                    )}
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

            <PostActionsBar
              postId={post.id}
              likedByMe={post.liked_by_me ?? false}
              likeCount={post.like_count ?? 0}
              replyCount={post.reply_count ?? 0}
              likePending={likePending}
              onLike={handleLike}
              onReply={() =>
                isReplyingHere ? onCancelReply() : onReplyTo(post.id)
              }
              showShare={false}
              variant="compact"
            />

            {isReplyingHere && (
              <InlineReplyForm
                parentId={post.id}
                parentName={authorName}
                onCancel={onCancelReply}
                onSuccess={onReplySuccess}
              />
            )}
          </div>
        </div>
      </div>

      {node.children.map((child) => (
        <ThreadReplyCard
          key={child.post.id}
          node={child}
          depth={depth + 1}
          timezone={timezone}
          currentUserId={currentUserId}
          replyingToId={replyingToId}
          onReplyTo={onReplyTo}
          onCancelReply={onCancelReply}
          onReplySuccess={onReplySuccess}
        />
      ))}
    </div>
  );
}

export function ThreadReplyList({
  nodes,
  timezone,
  currentUserId,
}: {
  nodes: ForumThreadNode[];
  timezone: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  function handleReplySuccess() {
    setReplyingToId(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {nodes.map((node) => (
        <ThreadReplyCard
          key={node.post.id}
          node={node}
          depth={0}
          timezone={timezone}
          currentUserId={currentUserId}
          replyingToId={replyingToId}
          onReplyTo={setReplyingToId}
          onCancelReply={() => setReplyingToId(null)}
          onReplySuccess={handleReplySuccess}
        />
      ))}
    </div>
  );
}
