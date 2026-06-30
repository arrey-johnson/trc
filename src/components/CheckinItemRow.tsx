"use client";

import type { CheckinItemAnswer } from "@/lib/types";
import { Input } from "./ui";

interface CheckinItemRowProps {
  item: CheckinItemAnswer;
  onAnswer: (wasDone: boolean) => void;
  onReasonChange: (reason: string) => void;
}

export function CheckinItemRow({
  item,
  onAnswer,
  onReasonChange,
}: CheckinItemRowProps) {
  const showReason = item.wasDone === false;

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex-1 text-base font-medium text-[var(--foreground)]">{item.label}</p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={`Mark ${item.label} as done`}
            onClick={() => onAnswer(true)}
            className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl transition active:scale-95 ${
              item.wasDone === true
                ? "bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900/40"
                : "bg-[var(--elevated)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            }`}
          >
            ✅
          </button>
          <button
            type="button"
            aria-label={`Mark ${item.label} as not done`}
            onClick={() => onAnswer(false)}
            className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl transition active:scale-95 ${
              item.wasDone === false
                ? "bg-red-100 ring-2 ring-red-500 dark:bg-red-900/40"
                : "bg-[var(--elevated)] hover:bg-red-50 dark:hover:bg-red-950/30"
            }`}
          >
            ❌
          </button>
        </div>
      </div>
      {showReason && (
        <div className="mt-3">
          <label className="mb-1 block text-sm text-[var(--muted)]">
            Why wasn&apos;t this done?
          </label>
          <Input
            value={item.reasonIfNotDone}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Short reason..."
            autoFocus
          />
        </div>
      )}
      {item.wasDone === null && (
        <p className="mt-2 text-xs text-[var(--accent-morning-fg)]">Tap ✅ or ❌ to answer</p>
      )}
    </li>
  );
}

export function allItemsAnswered(items: CheckinItemAnswer[]): boolean {
  return items.every((item) => item.wasDone !== null);
}

export function allReasonsValid(items: CheckinItemAnswer[]): boolean {
  return items.every(
    (item) =>
      item.wasDone === true ||
      (item.wasDone === false && item.reasonIfNotDone.trim().length > 0)
  );
}
