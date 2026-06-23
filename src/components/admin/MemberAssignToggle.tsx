"use client";

import { useTransition } from "react";
import { assignBookToUser, unassignBookFromUser } from "@/app/library/actions";
import { Button } from "@/components/ui";

export function MemberAssignToggle({
  bookId,
  userId,
  displayName,
  assigned,
}: {
  bookId: string;
  userId: string;
  displayName: string;
  assigned: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (assigned) {
        await unassignBookFromUser(bookId, userId);
      } else {
        await assignBookToUser(bookId, userId);
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
      <span className="text-sm font-medium text-[var(--foreground)]">
        {displayName}
      </span>
      <Button
        type="button"
        variant={assigned ? "secondary" : "primary"}
        className="w-auto px-3 py-2 text-xs"
        disabled={pending}
        onClick={toggle}
      >
        {assigned ? "Remove" : "Assign"}
      </Button>
    </div>
  );
}
