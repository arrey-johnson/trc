"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateBookVisibility } from "@/app/library/actions";
import { Button, Input, Label } from "@/components/ui";
import {
  formatFeaturedMonthLabel,
  memberVisibilityLabel,
} from "@/lib/books/format";
import type { BookFormat } from "@/lib/types";

export function BookVisibilitySettings({
  bookId,
  format,
  pageCount,
  featuredMonth,
  hiddenFromMembers,
  timezone,
}: {
  bookId: string;
  format: BookFormat;
  pageCount: number;
  featuredMonth: string | null;
  hiddenFromMembers: boolean;
  timezone: string;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(featuredMonth ?? "");
  const [hidden, setHidden] = useState(hiddenFromMembers);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusLabel = memberVisibilityLabel({
    featuredMonth: month || null,
    hiddenFromMembers: hidden,
    timezone,
  });

  function handleSave() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updateBookVisibility(bookId, {
        featuredMonth: month,
        hiddenFromMembers: hidden,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage("Visibility settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        {format.toUpperCase()} ·{" "}
        {format === "epub" ? "EPUB (swipe to turn pages)" : `${pageCount} pages`}
      </p>

      <div>
        <Label htmlFor="featured_month">Featured month</Label>
        <Input
          id="featured_month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Leave empty to keep the book visible every month. When set, members
          only see it during that month; it hides automatically after.
        </p>
        {month && (
          <p className="mt-1 text-xs text-[var(--foreground)]">
            Book of the month: {formatFeaturedMonthLabel(month)}
          </p>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
          className="mt-1 rounded"
        />
        <span>
          Hide from members now
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            Overrides the monthly schedule — use this to pull a book early.
          </span>
        </span>
      </label>

      <p className="rounded-xl bg-[var(--elevated)] px-3 py-2 text-sm text-[var(--foreground)]">
        {statusLabel}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && (
        <p className="text-sm text-brand-subtle-fg dark:text-brand-muted">
          {message}
        </p>
      )}

      <Button type="button" onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save visibility"}
      </Button>
    </div>
  );
}
