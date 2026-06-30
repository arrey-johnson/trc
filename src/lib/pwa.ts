export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    isIosDevice() ||
    isAndroidDevice() ||
    /Mobile/i.test(navigator.userAgent)
  );
}

export function shouldShowInstallPrompt(): boolean {
  return isMobileBrowser() && !isStandalonePwa();
}

const DISMISS_KEY = "trc-install-prompt-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function isInstallPromptDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_MS;
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}
