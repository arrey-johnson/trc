"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationPermission,
  isPushConfiguredOnServer,
  isPushSupported,
  needsIosInstallForPush,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";
import { Button } from "@/components/ui";
import { savePushSubscription } from "@/lib/push/save-subscription";
import { sendTestNotification } from "@/app/notifications/actions";

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
  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    void isPushConfiguredOnServer().then(setPushConfigured);
  }, []);

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

    const result = await subscribeToPush(user.id, async (sub) =>
      savePushSubscription(supabase, {
        user_id: sub.user_id,
        subscription_json: sub.subscription_json,
        endpoint: sub.endpoint,
      })
    );

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

  async function handleTestNotification() {
    setTesting(true);
    setMessage(null);

    const result = await sendTestNotification();

    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage(
        "Test sent. Check your phone — you should see a notification in a few seconds."
      );
    }

    setTesting(false);
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

  const iosInstallRequired = needsIosInstallForPush();
  const pushReady = pushConfigured === true;

  const content = (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Get morning and evening reminders with your actual routine items, plus
        forum updates — even when the app is closed.
      </p>

      {pushConfigured === false && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Push is not configured on the server yet. Ask your admin to add VAPID
          keys to the deployment environment.
        </p>
      )}

      {iosInstallRequired && (
        <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          On iPhone: tap Share → <strong>Add to Home Screen</strong>, open the
          app from your home screen, then enable notifications here.
        </p>
      )}

      {status === "denied" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Notifications are blocked. On iPhone: Settings → Safari →
          Notifications. On Android: site settings → Notifications → Allow.
        </p>
      )}

      {status === "enabled" ? (
        <div className="flex flex-col gap-2">
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
              disabled={busy || testing}
            >
              Turn off
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto"
            onClick={handleTestNotification}
            disabled={busy || testing}
          >
            {testing ? "Sending test…" : "Send test notification"}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={handleEnable}
          disabled={busy || status === "denied" || !pushReady || iosInstallRequired}
          className="sm:w-auto"
        >
          {busy ? "Enabling..." : "Enable notifications"}
        </Button>
      )}

      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );

  if (variant === "inline") return content;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <h3 className="font-semibold text-[var(--foreground)]">Push notifications</h3>
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
    <p className="text-sm text-[var(--muted)]">{children}</p>
  );
  if (variant === "inline") return inner;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-4">
      {inner}
    </div>
  );
}
