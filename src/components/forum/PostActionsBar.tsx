"use client";

import Link from "next/link";
import { CommentIcon, HeartIcon } from "@/components/forum/ForumIcons";
import { SharePostButton } from "@/components/forum/SharePostButton";
import type { PostShareData } from "@/components/forum/PostSharePreview";

const actionBase =
  "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--elevated)] px-3 text-sm font-semibold transition active:scale-[0.98]";

interface PostActionsBarProps {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
  replyCount: number;
  likePending?: boolean;
  onLike: (e: React.MouseEvent) => void;
  shareData: PostShareData;
  replyHref?: string;
  stopPropagation?: boolean;
}

export function PostActionsBar({
  postId,
  likedByMe,
  likeCount,
  replyCount,
  likePending,
  onLike,
  shareData,
  replyHref,
  stopPropagation = false,
}: PostActionsBarProps) {
  function stop(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <div
      className="mt-4 flex items-stretch gap-2"
      onClick={stopPropagation ? stop : undefined}
    >
      <button
        type="button"
        onClick={onLike}
        disabled={likePending}
        aria-label={likedByMe ? "Unlike" : "Like"}
        className={`${actionBase} ${
          likedByMe
            ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
            : "text-[var(--foreground)] hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/30"
        }`}
      >
        <HeartIcon filled={likedByMe} />
        <span>{likeCount || "Like"}</span>
      </button>

      <Link
        href={replyHref ?? `/forum/${postId}`}
        onClick={stop}
        aria-label={`${replyCount} replies`}
        className={`${actionBase} text-[var(--foreground)] hover:border-brand-border hover:bg-brand-subtle hover:text-brand-subtle-fg dark:hover:border-brand-border dark:hover:bg-brand-subtle dark:hover:text-brand-muted`}
      >
        <CommentIcon />
        <span>{replyCount || "Reply"}</span>
      </Link>

      <SharePostButton
        data={shareData}
        onClick={stop}
        className={`${actionBase} text-[var(--foreground)] hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:hover:border-sky-800 dark:hover:bg-sky-950/30 dark:hover:text-sky-400`}
      />
    </div>
  );
}
