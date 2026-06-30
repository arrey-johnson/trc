"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteForumPost, updateForumPost } from "@/app/forum/actions";
import { MoreIcon } from "@/components/forum/ForumIcons";
import { Button } from "@/components/ui";
import {
  FORUM_CATEGORIES,
  FORUM_MAX_CHARS,
  forumCategoryLabel,
} from "@/lib/forum";

interface PostAuthorActionsOptions {
  postId: string;
  body: string;
  category: string;
  isReply?: boolean;
  deleteRedirect?: string;
}

export function usePostAuthorActions({
  postId,
  body: initialBody,
  category: initialCategory,
  isReply = false,
  deleteRedirect,
}: PostAuthorActionsOptions) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [category, setCategory] = useState(initialCategory);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!editing) {
      setBody(initialBody);
      setCategory(initialCategory);
    }
  }, [initialBody, initialCategory, editing]);

  function startEdit() {
    setError(null);
    setBody(initialBody);
    setCategory(initialCategory);
    setEditing(true);
  }

  function cancelEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(false);
    setBody(initialBody);
    setCategory(initialCategory);
    setError(null);
  }

  function saveEdit(e: React.FormEvent) {
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
      setBody(body.trim());
      router.refresh();
    });
  }

  function deletePost() {
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

  return {
    editing,
    body,
    category,
    error,
    pending,
    remaining: FORUM_MAX_CHARS - body.length,
    setBody,
    setCategory,
    startEdit,
    cancelEdit,
    saveEdit,
    deletePost,
  };
}

export function PostOwnerMenu({
  onEdit,
  onDelete,
  pending,
  onClick,
}: {
  onEdit: () => void;
  onDelete: () => void;
  pending?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
  }

  function handleToggle(e: React.MouseEvent) {
    stop(e);
    setOpen((value) => !value);
  }

  function handleEdit(e: React.MouseEvent) {
    stop(e);
    setOpen(false);
    onEdit();
  }

  function handleDelete(e: React.MouseEvent) {
    stop(e);
    setOpen(false);
    onDelete();
  }

  return (
    <div ref={rootRef} className="relative shrink-0" onClick={stop}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-label="Post options"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--elevated)] hover:text-[var(--foreground)]"
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[148px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleEdit}
            className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--elevated)]"
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className="flex w-full items-center px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function PostEditForm({
  body,
  category,
  isReply,
  remaining,
  error,
  pending,
  onBodyChange,
  onCategoryChange,
  onSubmit,
  onCancel,
}: {
  body: string;
  category: string;
  isReply?: boolean;
  remaining: number;
  error: string | null;
  pending?: boolean;
  onBodyChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: (e: React.MouseEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2">
      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value.slice(0, FORUM_MAX_CHARS))}
        rows={isReply ? 2 : 3}
        autoFocus
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
      />
      {!isReply && (
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
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
          onClick={onCancel}
          className="w-auto px-4 text-sm"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
