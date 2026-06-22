"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationPermission,
  isPushSupported,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import { Button } from "@/components/ui";

type Status = "idle" | "loading" | "enabled" | "denied" | "unsupported";

interface PushControlsProps {
  /** Compact inline UI vs full card */
  variant?: "inline" | "card";
  onStatusChange?: (enabled: boolean) => void;
}

export function PushControls({
  variant = "card",
  onStatusChange,
}: PushControlsProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  const refreshStatus = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      onStatusChange?.(false);
      return;
    }

    await registerServiceWorker();
    const permission = await getNotificationPermission();

    if (permission === "denied") {
      setStatus("denied");
      onStatusChange?.(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("idle");
      onStatusChange?.(false);
      return;
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const enabled = permission === "granted" && (subs?.length ?? 0) > 0;
    setStatus(enabled ? "enabled" : "idle");
    onStatusChange?.(enabled);
  }, [onStatusChange, supabase]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  async function handleEnable() {
    setBusy(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Sign in to enable notifications.");
      setStatus("idle");
      return;
    }

    const result = await subscribeToPush(user.id, async (sub) => {
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: sub.user_id,
          subscription_json: sub.subscription_json,
          endpoint: sub.endpoint,
        },
        { onConflict: "user_id,endpoint" }
      );
      return { error: error ? new Error(error.message) : null };
    });

    if (result.ok) {
      setStatus("enabled");
      onStatusChange?.(true);
      setMessage("Notifications enabled. You'll get reminders on this device.");
    } else {
      setStatus(result.error?.includes("denied") ? "denied" : "idle");
      setMessage(result.error ?? "Could not enable notifications.");
      onStatusChange?.(false);
    }
    setBusy(false);
  }

  async function handleDisable() {
    setBusy(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await unsubscribeFromPush(async (endpoint) => {
      if (!user) return { error: null };
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);
      return { error: error ? new Error(error.message) : null };
    });

    if (result.ok) {
      setStatus("idle");
      onStatusChange?.(false);
      setMessage("Notifications turned off for this device.");
    } else {
      setMessage(result.error ?? "Could not disable notifications.");
      await refreshStatus();
    }
    setBusy(false);
  }

  if (status === "unsupported") {
    return (
      <Notice variant={variant}>
        Install this app on your phone (Add to Home Screen) to receive push
        notifications. Your browser doesn&apos;t support them here.
      </Notice>
    );
  }

  const content = (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Get morning and evening reminders with your actual routine items, plus
        forum updates — even when the app is closed.
      </p>

      {status === "denied" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Notifications are blocked. On iPhone: Settings → Safari →
          Notifications. On Android: site settings → Notifications → Allow.
        </p>
      )}

      {status === "enabled" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Notifications on
          </span>
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto"
            onClick={handleDisable}
            disabled={busy}
          >
            Turn off
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={handleEnable}
          disabled={busy || status === "denied"}
          className="sm:w-auto"
        >
          {busy ? "Enabling..." : "Enable notifications"}
        </Button>
      )}

      {message && <p className="text-sm text-stone-500">{message}</p>}
    </div>
  );

  if (variant === "inline") return content;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="font-semibold text-stone-900">Push notifications</h3>
      <div className="mt-2">{content}</div>
    </div>
  );
}

function Notice({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "inline" | "card";
}) {
  const inner = (
    <p className="text-sm text-stone-600">{children}</p>
  );
  if (variant === "inline") return inner;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      {inner}
    </div>
  );
}
