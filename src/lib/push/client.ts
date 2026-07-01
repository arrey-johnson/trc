import type { PushSubscriptionJSON } from "@/lib/notifications/types";

let cachedPublicKey: string | null | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/** Resolve VAPID public key from build env or live server config. */
export async function getVapidPublicKey(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }

  if (cachedPublicKey !== undefined) {
    return cachedPublicKey;
  }

  try {
    const response = await fetch("/api/push/config", { cache: "no-store" });
    if (!response.ok) {
      cachedPublicKey = null;
      return null;
    }
    const data = (await response.json()) as {
      configured?: boolean;
      publicKey?: string | null;
    };
    cachedPublicKey = data.configured && data.publicKey ? data.publicKey : null;
    return cachedPublicKey;
  } catch {
    cachedPublicKey = null;
    return null;
  }
}

export async function isPushConfiguredOnServer(): Promise<boolean> {
  const key = await getVapidPublicKey();
  return Boolean(key);
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS only supports Web Push from a home-screen installed PWA. */
export function needsIosInstallForPush(): boolean {
  return isIosDevice() && !isStandalonePwa();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function subscribeToPush(
  userId: string,
  saveSubscription: (sub: {
    user_id: string;
    subscription_json: PushSubscriptionJSON;
    endpoint: string;
  }) => Promise<{ error: Error | null }>
): Promise<{ ok: boolean; error?: string }> {
  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) {
    return { ok: false, error: "Push is not configured on this server." };
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was denied." };
  }

  const reg = await registerServiceWorker();
  if (!reg) {
    return { ok: false, error: "Could not register the service worker." };
  }

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
  }

  const json = subscription.toJSON() as PushSubscriptionJSON;
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Invalid push subscription." };
  }

  const { error } = await saveSubscription({
    user_id: userId,
    subscription_json: json,
    endpoint: json.endpoint,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** Re-save an existing browser subscription after app updates or VAPID rotation. */
export async function syncPushSubscription(
  userId: string,
  saveSubscription: (sub: {
    user_id: string;
    subscription_json: PushSubscriptionJSON;
    endpoint: string;
  }) => Promise<{ error: Error | null }>
): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return;

  const reg = await registerServiceWorker();
  if (!reg) return;

  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;

  const json = subscription.toJSON() as PushSubscriptionJSON;
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await saveSubscription({
    user_id: userId,
    subscription_json: json,
    endpoint: json.endpoint,
  });
}

export async function unsubscribeFromPush(
  removeSubscription: (endpoint: string) => Promise<{ error: Error | null }>
): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push not supported." };

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return { ok: true };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error } = await removeSubscription(endpoint);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** True when permission is granted and the user has a saved subscription row. */
export async function hasPushNotificationsEnabled(
  hasDbSubscription: (userId: string) => Promise<boolean>,
  userId: string
): Promise<boolean> {
  if (!isPushSupported()) return false;
  const permission = await getNotificationPermission();
  if (permission !== "granted") return false;
  return hasDbSubscription(userId);
}
