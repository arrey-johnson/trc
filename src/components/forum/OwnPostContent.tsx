"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteForumPost, updateForumPost } from "@/app/forum/actions";
import { Button } from "@/components/ui";
import {
  FORUM_CATEGORIES,
  FORUM_MAX_CHARS,
  forumCategoryLabel,
} from "@/lib/forum";

interface OwnPostContentProps {
  postId: string;
  body: string;
  category: string;
  isReply?: boolean;
  /** Redirect after deleting a top-level post (e.g. "/forum") */
  deleteRedirect?: string;
  bodyClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function OwnPostContent({
  postId,
  body: initialBody,
  category: initialCategory,
  isReply = false,
  deleteRedirect,
  bodyClassName = "",
  onClick,
}: OwnPostContentProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [category, setCategory] = useState(initialCategory);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const remaining = FORUM_MAX_CHARS - body.length;

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
  }

  function handleDelete(e: React.MouseEvent) {
    stop(e);
    if (!confirm("Delete this post? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteForumPost(postId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (deleteRedirect) {
        router.push(deleteRedirect);
      } else {
        router.refresh();
      }
    });
  }

  function handleEdit(e: React.MouseEvent) {
    stop(e);
    setError(null);
    setBody(initialBody);
    setCategory(initialCategory);
    setEditing(true);
  }

  function handleCancel(e: React.MouseEvent) {
    stop(e);
    setEditing(false);
    setBody(initialBody);
    setCategory(initialCategory);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const formData = new FormData();
    formData.set("body", body);
    if (!isReply) formData.set("category", category);

    startTransition(async () => {
      const result = await updateForumPost(postId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        onClick={stop}
        className="mt-2 space-y-2"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, FORUM_MAX_CHARS))}
          rows={isReply ? 2 : 3}
          autoFocus
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        {!isReply && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--foreground)]"
          >
            {FORUM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {forumCategoryLabel(c)}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs ${remaining < 20 ? "text-amber-600" : "text-[var(--muted)]"}`}
          >
            {remaining}
          </span>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={pending || !body.trim()}
            className="w-auto px-4 text-sm"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={handleCancel}
            className="w-auto px-4 text-sm"
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={`min-w-0 flex-1 whitespace-pre-wrap ${bodyClassName}`}>
          {initialBody}
        </p>
        <div className="flex shrink-0 gap-1" onClick={stop}>
          <button
            type="button"
            onClick={handleEdit}
            disabled={pending}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600" onClick={stop}>
          {error}
        </p>
      )}
    </>
  );
}
