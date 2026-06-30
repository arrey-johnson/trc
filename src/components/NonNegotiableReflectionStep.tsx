"use client";

import { Input } from "@/components/ui";
import type { CheckinItemAnswer } from "@/lib/types";

interface NonNegotiableReflectionStepProps {
  completedAll: boolean | null;
  reflection: string;
  onAnswer: (completedAll: boolean) => void;
  onReflectionChange: (reflection: string) => void;
}

export function NonNegotiableReflectionStep({
  completedAll,
  reflection,
  onAnswer,
  onReflectionChange,
}: NonNegotiableReflectionStepProps) {
  const showReflection = completedAll === false;

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-base font-medium text-[var(--foreground)]">
        Did you complete your non-negotiables today?
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-label="Yes, completed all non-negotiables"
          onClick={() => onAnswer(true)}
          className={`flex h-14 flex-1 items-center justify-center rounded-xl text-2xl transition ${
            completedAll === true
              ? "bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900/40"
              : "bg-[var(--elevated)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          }`}
        >
          ✅
        </button>
        <button
          type="button"
          aria-label="No, did not complete all non-negotiables"
          onClick={() => onAnswer(false)}
          className={`flex h-14 flex-1 items-center justify-center rounded-xl text-2xl transition ${
            completedAll === false
              ? "bg-red-100 ring-2 ring-red-500 dark:bg-red-900/40"
              : "bg-[var(--elevated)] hover:bg-red-50 dark:hover:bg-red-950/30"
          }`}
        >
          ❌
        </button>
      </div>
      {showReflection && (
        <div className="mt-3">
          <label className="mb-1 block text-sm text-[var(--muted)]">
            What got in the way, and how can you improve?
          </label>
          <Input
            value={reflection}
            onChange={(e) => onReflectionChange(e.target.value)}
            placeholder="Be honest — this helps your circle hold you accountable"
            autoFocus
          />
        </div>
      )}
      {completedAll === null && (
        <p className="mt-2 text-xs text-[var(--accent-morning-fg)]">
          Tap ✅ or ❌ to continue
        </p>
      )}
    </li>
  );
}

export function isReflectionComplete(
  completedAll: boolean | null,
  reflection: string
): boolean {
  if (completedAll === null) return false;
  if (completedAll === true) return true;
  return reflection.trim().length > 0;
}

// Re-export for consistency with CheckinItemRow helpers
export type { CheckinItemAnswer };
