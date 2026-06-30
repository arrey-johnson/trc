"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  dismissInstallPrompt,
  isAndroidDevice,
  isInstallPromptDismissed,
  isIosDevice,
  shouldShowInstallPrompt,
} from "@/lib/pwa";

const HIDDEN_PREFIXES = ["/auth", "/onboarding", "/admin"];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!shouldShowInstallPrompt() || isInstallPromptDismissed()) return;

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const hiddenRoute = HIDDEN_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );
    setVisible(
      !hiddenRoute &&
        shouldShowInstallPrompt() &&
        !isInstallPromptDismissed()
    );
  }, [pathname]);

  function handleDismiss() {
    dismissInstallPrompt();
    setVisible(false);
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  if (!visible) return null;

  const ios = isIosDevice();
  const android = isAndroidDevice();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 px-4"
      role="region"
      aria-label="Install app"
    >
      <div className="pointer-events-auto mx-auto max-w-md overflow-hidden rounded-2xl border border-brand-border bg-[var(--card)] shadow-lg">
        <div className="bg-brand-gradient px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/icon-192.png"
                alt=""
                className="h-11 w-11 rounded-xl bg-white/15 ring-2 ring-white/25"
              />
              <div>
                <p className="text-sm font-semibold">Install Reset Circle</p>
                <p className="text-xs text-white/85">
                  Open like a native app from your home screen
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg px-2 py-1 text-sm text-white/80 hover:bg-white/15"
              aria-label="Dismiss install prompt"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3 text-sm text-[var(--foreground)]">
          {ios && (
            <ol className="space-y-2 text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--elevated)] text-xs font-semibold text-[var(--foreground)]">
                  1
                </span>
                <span>
                  Tap{" "}
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--foreground)]">
                    Share
                    <IosShareIcon />
                  </span>{" "}
                  in Safari&apos;s toolbar
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--elevated)] text-xs font-semibold text-[var(--foreground)]">
                  2
                </span>
                <span>
                  Choose{" "}
                  <strong className="text-[var(--foreground)]">
                    Add to Home Screen
                  </strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--elevated)] text-xs font-semibold text-[var(--foreground)]">
                  3
                </span>
                <span>Open the app from your home screen</span>
              </li>
            </ol>
          )}

          {android && !ios && deferredPrompt && (
            <>
              <p className="text-[var(--muted)]">
                Install for faster access, full-screen view, and push
                notifications.
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={installing}
                onClick={handleAndroidInstall}
              >
                {installing ? "Installing…" : "Install app"}
              </Button>
            </>
          )}

          {android && !ios && !deferredPrompt && (
            <ol className="space-y-2 text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--elevated)] text-xs font-semibold text-[var(--foreground)]">
                  1
                </span>
                <span>
                  Tap the browser menu{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    ⋮
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--elevated)] text-xs font-semibold text-[var(--foreground)]">
                  2
                </span>
                <span>
                  Choose{" "}
                  <strong className="text-[var(--foreground)]">
                    Install app
                  </strong>{" "}
                  or{" "}
                  <strong className="text-[var(--foreground)]">
                    Add to Home screen
                  </strong>
                </span>
              </li>
            </ol>
          )}

          {!ios && !android && (
            <p className="text-[var(--muted)]">
              Add this app to your home screen from your browser menu for the
              best experience.
            </p>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full text-center text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function IosShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="inline-block"
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </svg>
  );
}
