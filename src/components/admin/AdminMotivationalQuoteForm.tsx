"use client";

import { useState, useTransition } from "react";
import { sendMotivationalQuote } from "@/app/notifications/actions";
import { Button, Input, Label } from "@/components/ui";

const MAX_QUOTE_LENGTH = 280;
const MAX_TITLE_LENGTH = 60;

export function AdminMotivationalQuoteForm() {
  const [title, setTitle] = useState("The Reset Circle");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await sendMotivationalQuote(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setQuote("");
      setMessage(
        `Sent to ${result.inboxDelivered} member${result.inboxDelivered === 1 ? "" : "s"} (${result.devicesNotified} push${result.devicesNotified === 1 ? "" : "es"} delivered${result.skippedNoPush ? `, ${result.skippedNoPush} without push enabled` : ""}).`
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="motivation-title">Notification title</Label>
        <Input
          id="motivation-title"
          name="title"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Reset Circle"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label htmlFor="motivation-quote">Your quote</Label>
          <span className="text-xs text-[var(--muted)]">
            {quote.length}/{MAX_QUOTE_LENGTH}
          </span>
        </div>
        <textarea
          id="motivation-quote"
          name="quote"
          value={quote}
          required
          maxLength={MAX_QUOTE_LENGTH}
          rows={4}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Small daily disciplines compound into extraordinary results."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-xl bg-brand-subtle px-3 py-2 text-sm text-brand-subtle-fg dark:bg-brand-subtle dark:text-brand-muted">
          {message}
        </p>
      )}

      <Button type="submit" disabled={pending || !quote.trim()} className="sm:w-auto">
        {pending ? "Sending…" : "Send to all members"}
      </Button>
    </form>
  );
}
