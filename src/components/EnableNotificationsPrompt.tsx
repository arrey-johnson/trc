"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { isStandalonePwa } from "@/lib/pwa";
import {
  getNotificationPermission,
  hasPushNotificationsEnabled,
  isPushConfiguredOnServer,
  isPushSupported,
  registerServiceWorker,
  subscribeToPush,
} from "@/lib/push/client";
import { savePushSubscription } from "@/lib/push/save-subscription";
import { createClient } from "@/lib/supabase/client";

const HIDDEN_PREFIXES = ["/auth", "/onboarding", "/admin"];
const SESSION_DISMISS_KEY = "trc-notifications-prompt-dismissed";

export function EnableNotificationsPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const evaluate = useCallback(async () => {
    if (!isStandalonePwa() || !isPushSupported()) {
      setVisible(false);
      return;
    }

    if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      setVisible(false);
      return;
    }

    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) {
      setVisible(false);
      return;
    }

    const configured = await isPushConfiguredOnServer();
    if (!configured) {
      setVisible(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setVisible(false);
      return;
    }

    const permission = await getNotificationPermission();
    if (permission === "denied") {
      setDenied(true);
      setVisible(true);
      return;
    }

    await registerServiceWorker();

    const enabled = await hasPushNotificationsEnabled(async (userId) => {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      return (subs?.length ?? 0) > 0;
    }, user.id);

    setDenied(false);
    setVisible(!enabled);
  }, [pathname, supabase]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void evaluate();
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [evaluate]);

  function dismissForSession() {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setVisible(false);
  }

  async function handleEnable() {
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sign in to enable notifications.");
      setBusy(false);
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
      setVisible(false);
      sessionStorage.removeItem(SESSION_DISMISS_KEY);
    } else {
      setError(result.error ?? "Could not enable notifications.");
      if (result.error?.includes("denied")) {
        setDenied(true);
      }
    }

    setBusy(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enable-notifications-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-brand-border bg-[var(--card)] shadow-xl">
        <div className="bg-brand-gradient px-4 py-3 text-white">
          <p id="enable-notifications-title" className="text-sm font-semibold">
            Turn on notifications
          </p>
          <p className="mt-0.5 text-xs text-white/85">
            Get morning and evening reminders on this device
          </p>
        </div>

        <div className="space-y-3 px-4 py-4 text-sm text-[var(--foreground)]">
          {denied ? (
            <p className="text-[var(--muted)]">
              Notifications are blocked for this app. Open your phone&apos;s
              settings, find Reset Circle / Safari or Chrome site settings, and
              allow notifications. Then reopen the app.
            </p>
          ) : (
            <p className="text-[var(--muted)]">
              You installed Reset Circle on your phone — enable notifications so
              you never miss your routine reminders or forum updates.
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          {!denied && (
            <Button
              type="button"
              className="w-full"
              disabled={busy}
              onClick={handleEnable}
            >
              {busy ? "Enabling…" : "Enable notifications"}
            </Button>
          )}

          <button
            type="button"
            onClick={dismissForSession}
            className="w-full text-center text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
