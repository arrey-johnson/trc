import webpush from "web-push";
import type { PushPayload, PushSubscriptionJSON } from "@/lib/notifications/types";

let configured = false;

function ensureVapid() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID keys are not configured");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendWebPush(
  subscription: PushSubscriptionJSON,
  payload: PushPayload
): Promise<{ ok: true } | { ok: false; statusCode?: number; gone: boolean }> {
  ensureVapid();

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/",
        tag: payload.tag,
      })
    );
    return { ok: true };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    return { ok: false, statusCode, gone };
  }
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}
