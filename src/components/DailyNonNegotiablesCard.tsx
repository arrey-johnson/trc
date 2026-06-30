"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import {
  compareTimeStrings,
  formatTimeForDisplay,
  getCurrentTimeInTimezone,
} from "@/lib/dates";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/client";
import type { DailyNonNegotiable } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function sortItems(items: DailyNonNegotiable[]) {
  return [...items].sort((a, b) => {
    const byTime = compareTimeStrings(a.target_time, b.target_time);
    if (byTime !== 0) return byTime;
    return a.sort_order - b.sort_order;
  });
}

function NonNegotiableRow({
  item,
  currentTime,
  userId,
  today,
  supabase,
  onItemChange,
  onItemRemove,
}: {
  item: DailyNonNegotiable;
  currentTime: string;
  userId: string;
  today: string;
  supabase: SupabaseClient;
  onItemChange: (id: string, patch: Partial<DailyNonNegotiable>) => void;
  onItemRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [targetTime, setTargetTime] = useState(item.target_time.slice(0, 5));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setLabel(item.label);
      setTargetTime(item.target_time.slice(0, 5));
    }
  }, [item.label, item.target_time, editing]);

  const isOverdue =
    !item.is_completed &&
    compareTimeStrings(currentTime, item.target_time) > 0;

  function handleToggle(isCompleted: boolean) {
    const previous = { ...item };
    onItemChange(item.id, {
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    });

    startTransition(async () => {
      const { error: updateError } = await supabase
        .from("daily_non_negotiables")
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", item.id)
        .eq("user_id", userId)
        .eq("date", today);

      if (updateError) {
        onItemChange(item.id, previous);
        setError(friendlyDbError(updateError.message, updateError.code));
      }
    });
  }

  function handleSave() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Task label is required.");
      return;
    }

    const previous = { ...item };
    onItemChange(item.id, { label: trimmed, target_time: targetTime });
    setEditing(false);
    setError(null);

    startTransition(async () => {
      const { data, error: updateError } = await supabase
        .from("daily_non_negotiables")
        .update({ label: trimmed, target_time: targetTime })
        .eq("id", item.id)
        .eq("user_id", userId)
        .eq("date", today)
        .select("id")
        .maybeSingle();

      if (updateError || !data) {
        onItemChange(item.id, previous);
        setEditing(true);
        setLabel(previous.label);
        setTargetTime(previous.target_time.slice(0, 5));
        setError(
          updateError
            ? friendlyDbError(updateError.message, updateError.code)
            : "Could not update this item. Refresh and try again."
        );
      }
    });
  }

  function handleDelete() {
    const previous = item;
    onItemRemove(item.id);

    startTransition(async () => {
      const { error: deleteError } = await supabase
        .from("daily_non_negotiables")
        .delete()
        .eq("id", item.id)
        .eq("user_id", userId)
        .eq("date", today);

      if (deleteError) {
        onItemChange(item.id, previous);
        setError(friendlyDbError(deleteError.message, deleteError.code));
      }
    });
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-3">
        <div className="space-y-3">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            aria-label="Edit task"
          />
          <Input
            type="time"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            aria-label="Edit target time"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              disabled={!label.trim()}
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setEditing(false);
                setLabel(item.label);
                setTargetTime(item.target_time.slice(0, 5));
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors duration-150 ${
        item.is_completed
          ? "border-brand-border bg-brand-subtle/50 dark:border-brand-border dark:bg-brand-subtle/50"
          : isOverdue
            ? "border-[var(--accent-priority)]/40 bg-[var(--accent-priority-subtle)]"
            : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={(e) => handleToggle(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-[var(--border)] text-brand focus:ring-brand"
        aria-label={`Mark ${item.label} complete`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium ${
            item.is_completed
              ? "text-[var(--muted)] line-through"
              : "text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </p>
        <p
          className={`text-xs ${
            isOverdue
              ? "font-medium text-[var(--accent-priority-fg)]"
              : "text-[var(--muted)]"
          }`}
        >
          {formatTimeForDisplay(item.target_time)}
          {isOverdue ? " · overdue" : ""}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--elevated)] hover:text-[var(--foreground)] active:scale-95"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 active:scale-95 dark:hover:bg-red-950/30"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function DailyNonNegotiablesCard({
  items: serverItems,
  timezone,
  today,
  userId,
  onProgressChange,
}: {
  items: DailyNonNegotiable[];
  timezone: string;
  today: string;
  userId: string;
  onProgressChange?: (completed: number, total: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(serverItems);
  const [label, setLabel] = useState("");
  const [targetTime, setTargetTime] = useState("12:00");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(serverItems.length === 0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(serverItems);
  }, [serverItems]);

  useEffect(() => {
    onProgressChange?.(
      items.filter((i) => i.is_completed).length,
      items.length
    );
  }, [items, onProgressChange]);

  const currentTime = useMemo(
    () => getCurrentTimeInTimezone(timezone),
    [timezone]
  );
  const sorted = sortItems(items);
  const completedCount = items.filter((i) => i.is_completed).length;

  function patchItem(id: string, patch: Partial<DailyNonNegotiable>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Task label is required.");
      return;
    }

    setError(null);
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: DailyNonNegotiable = {
      id: tempId,
      user_id: userId,
      date: today,
      label: trimmed,
      target_time: targetTime,
      is_completed: false,
      completed_at: null,
      sort_order: items.length,
      created_at: new Date().toISOString(),
    };

    const snapshot = items;
    setItems((prev) => [...prev, optimisticItem]);
    setLabel("");
    setShowForm(false);

    startTransition(async () => {
      const { data: existing } = await supabase
        .from("daily_non_negotiables")
        .select("sort_order")
        .eq("user_id", userId)
        .eq("date", today)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data: inserted, error: insertError } = await supabase
        .from("daily_non_negotiables")
        .insert({
          user_id: userId,
          date: today,
          label: trimmed,
          target_time: targetTime,
          sort_order: nextOrder,
        })
        .select("*")
        .single();

      if (insertError || !inserted) {
        setItems(snapshot);
        setShowForm(true);
        setLabel(trimmed);
        setError(
          insertError
            ? friendlyDbError(insertError.message, insertError.code)
            : "Could not add item."
        );
        return;
      }

      setItems((prev) =>
        prev.filter((item) => item.id !== tempId).concat(inserted)
      );
    });
  }

  return (
    <Card className="space-y-4 border-2 border-[var(--accent-priority)]/40 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-priority-fg)]">
            Today&apos;s priority
          </p>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Daily Non-Negotiables
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            If I complete my non-negotiables today, I&apos;ve won.
          </p>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 rounded-full bg-[var(--accent-priority-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-priority-fg)]">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-xl bg-[var(--elevated)] px-3 py-4 text-center text-sm text-[var(--muted)]">
          What must you get done today?
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((item) => (
            <NonNegotiableRow
              key={item.id}
              item={item}
              currentTime={currentTime}
              userId={userId}
              today={today}
              supabase={supabase}
              onItemChange={patchItem}
              onItemRemove={removeItem}
            />
          ))}
        </ul>
      )}

      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--elevated)] p-3"
        >
          <div>
            <Label htmlFor="nn-label">Task</Label>
            <Input
              id="nn-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ship client proposal"
              required
            />
          </div>
          <div>
            <Label htmlFor="nn-time">Done by</Label>
            <Input
              id="nn-time"
              type="time"
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={!label.trim()} className="flex-1">
              Add
            </Button>
            {items.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <Button
          type="button"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          Add non-negotiable
        </Button>
      )}
    </Card>
  );
}
