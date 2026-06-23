"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignBookToAllOnboardedMembers } from "@/app/library/actions";
import { Button } from "@/components/ui";

export function AssignAllMembersButton({
  bookId,
  memberCount,
}: {
  bookId: string;
  memberCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleAssignAll() {
    setMessage(null);
    startTransition(async () => {
      const result = await assignBookToAllOnboardedMembers(bookId);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        result.assigned > 0
          ? `Assigned to ${result.assigned} member${result.assigned === 1 ? "" : "s"}.`
          : "No onboarded members to assign yet."
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        type="button"
        variant="secondary"
        className="sm:w-auto"
        disabled={pending || memberCount === 0}
        onClick={handleAssignAll}
      >
        {pending ? "Assigning…" : "Assign all members"}
      </Button>
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
