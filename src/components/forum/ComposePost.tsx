"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFeedPost } from "@/app/forum/actions";
import { Button } from "@/components/ui";
import { FORUM_CATEGORIES, FORUM_MAX_CHARS, forumCategoryLabel } from "@/lib/forum";

export function ComposePost() {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("personal_development");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const remaining = FORUM_MAX_CHARS - body.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("body", body);
    formData.set("category", category);

    startTransition(async () => {
      const result = await createFeedPost(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, FORUM_MAX_CHARS))}
        placeholder="Share a lesson, tip, or insight…"
        rows={3}
        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
      />
      <div className="flex items-center justify-between gap-2">
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
        <span
          className={`text-xs ${remaining < 20 ? "text-amber-600" : "text-[var(--muted)]"}`}
        >
          {remaining}
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending || !body.trim()} className="w-auto px-6">
        {pending ? "Posting…" : "Post"}
      </Button>
    </form>
  );
}
