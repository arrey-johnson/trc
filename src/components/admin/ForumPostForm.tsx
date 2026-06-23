"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { forumCategoryLabel } from "@/lib/forum";
import {
  createForumPost,
  updateForumPost,
} from "@/app/admin/forum/actions";

const CATEGORIES = [
  "personal_development",
  "mindset",
  "habits",
  "faith",
] as const;

interface ForumPostFormProps {
  mode: "create" | "edit";
  postId?: string;
  initial?: {
    title: string;
    body: string;
    category: string;
    isPublished: boolean;
  };
}

export function ForumPostForm({ mode, postId, initial }: ForumPostFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result =
      mode === "create"
        ? await createForumPost(formData)
        : await updateForumPost(postId!, formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    if (mode === "edit") {
      router.refresh();
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="Post title"
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={initial?.category ?? "personal_development"}
          className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-base text-[var(--foreground)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {forumCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="body">Body</Label>
        <textarea
          id="body"
          name="body"
          required
          rows={10}
          defaultValue={initial?.body ?? ""}
          placeholder="Write your guidance…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={initial?.isPublished ?? true}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
        Published (members can read; notifies on first publish)
      </label>

      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create post"
            : "Save changes"}
      </Button>
    </form>
  );
}
