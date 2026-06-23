"use client";

import { useState, useTransition } from "react";
import { sendTestNotificationToAllMembers } from "@/app/notifications/actions";
import { Button } from "@/components/ui";

export function AdminTestNotificationsButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSendAll() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestNotificationToAllMembers();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `Test sent to ${result.devicesNotified} device${result.devicesNotified === 1 ? "" : "s"} across ${result.members} member${result.members === 1 ? "" : "s"}.${result.skipped ? ` ${result.skipped} member${result.skipped === 1 ? "" : "s"} had notifications off.` : ""}`
      );
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="sm:w-auto"
        disabled={pending}
        onClick={handleSendAll}
      >
        {pending ? "Sending…" : "Send test to all members"}
      </Button>
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
