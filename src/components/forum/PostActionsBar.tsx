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
  shareData?: PostShareData;
  replyHref?: string;
  onReply?: () => void;
  showShare?: boolean;
  variant?: "full" | "compact";
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
  onReply,
  showShare = true,
  variant = "full",
  stopPropagation = false,
}: PostActionsBarProps) {
  const isCompact = variant === "compact";
  const actionClass = isCompact
    ? "flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--elevated)] px-2.5 text-xs font-semibold transition active:scale-[0.98]"
    : actionBase;

  function stop(e: React.MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <div
      className={`flex items-stretch gap-2 ${isCompact ? "mt-2" : "mt-4"}`}
      onClick={stopPropagation ? stop : undefined}
    >
      <button
        type="button"
        onClick={onLike}
        disabled={likePending}
        aria-label={likedByMe ? "Unlike" : "Like"}
        className={`${actionClass} ${
          likedByMe
            ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
            : "text-[var(--foreground)] hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/30"
        }`}
      >
        <HeartIcon filled={likedByMe} />
        <span className="tabular-nums">{likeCount > 0 ? likeCount : "Like"}</span>
      </button>

      {onReply ? (
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            onReply();
          }}
          aria-label={`${replyCount} replies`}
          className={`${actionClass} text-[var(--foreground)] hover:border-brand-border hover:bg-brand-subtle hover:text-brand-subtle-fg dark:hover:border-brand-border dark:hover:bg-brand-subtle dark:hover:text-brand-muted`}
        >
          <CommentIcon />
          <span className="tabular-nums">
            {replyCount > 0 ? replyCount : "Reply"}
          </span>
        </button>
      ) : (
        <Link
          href={replyHref ?? `/forum/${postId}`}
          onClick={stop}
          aria-label={`${replyCount} replies`}
          className={`${actionClass} text-[var(--foreground)] hover:border-brand-border hover:bg-brand-subtle hover:text-brand-subtle-fg dark:hover:border-brand-border dark:hover:bg-brand-subtle dark:hover:text-brand-muted`}
        >
          <CommentIcon />
          <span className="tabular-nums">
            {replyCount > 0 ? replyCount : "Reply"}
          </span>
        </Link>
      )}

      {showShare && shareData && (
        <SharePostButton
          data={shareData}
          onClick={stop}
          className={`${actionClass} text-[var(--foreground)] hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:hover:border-sky-800 dark:hover:bg-sky-950/30 dark:hover:text-sky-400`}
        />
      )}
    </div>
  );
}
